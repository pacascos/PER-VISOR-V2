-- Migration: 003_add_study_mode.sql
-- Description: Añade tablas para el modo de estudio personalizado
-- Date: 2025-10-02
-- Author: Sistema

-- ============================================
-- TABLAS
-- ============================================

-- Tabla principal de tests de estudio
CREATE TABLE IF NOT EXISTS study_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    selected_uts jsonb NOT NULL,
    selection_mode character varying(20) NOT NULL,
    total_questions integer NOT NULL,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    correct_answers integer DEFAULT 0,
    score_percentage numeric(5,2),
    duration_minutes integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT study_tests_pkey PRIMARY KEY (id),
    CONSTRAINT study_tests_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT study_tests_selection_mode_check CHECK (
        (selection_mode)::text = ANY (ARRAY[
            'random'::character varying,
            'failed'::character varying,
            'new'::character varying
        ]::text[])
    ),
    CONSTRAINT study_tests_status_check CHECK (
        (status)::text = ANY (ARRAY[
            'in_progress'::character varying,
            'completed'::character varying,
            'abandoned'::character varying
        ]::text[])
    )
);

COMMENT ON TABLE study_tests IS 'Study tests with custom UT selection and different question selection strategies';
COMMENT ON COLUMN study_tests.selected_uts IS 'JSON array of selected UT numbers, e.g., [1,2,5,6]';
COMMENT ON COLUMN study_tests.selection_mode IS 'Question selection strategy: random, failed (prioritize wrong answers), new (prioritize unanswered)';
COMMENT ON COLUMN study_tests.status IS 'Current status: in_progress, completed, abandoned';

-- Tabla de preguntas de tests de estudio
CREATE TABLE IF NOT EXISTS study_test_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    study_test_id uuid NOT NULL,
    question_id uuid NOT NULL,
    question_order integer NOT NULL,
    ut_number integer NOT NULL,
    ut_category character varying(100) NOT NULL,
    user_answer character varying(1),
    is_correct boolean,
    answered_at timestamp without time zone,
    time_spent_seconds integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT study_test_questions_pkey PRIMARY KEY (id),
    CONSTRAINT study_test_questions_study_test_id_question_order_key
        UNIQUE (study_test_id, question_order),
    CONSTRAINT study_test_questions_question_id_fkey FOREIGN KEY (question_id)
        REFERENCES questions(id) ON DELETE CASCADE,
    CONSTRAINT study_test_questions_study_test_id_fkey FOREIGN KEY (study_test_id)
        REFERENCES study_tests(id) ON DELETE CASCADE
);

COMMENT ON TABLE study_test_questions IS 'Individual questions for study tests with user answers and timing data';

-- ============================================
-- ÍNDICES
-- ============================================

-- Índices para study_tests
CREATE INDEX IF NOT EXISTS idx_study_tests_created_at
    ON study_tests USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_tests_status
    ON study_tests USING btree (status);

CREATE INDEX IF NOT EXISTS idx_study_tests_user_id
    ON study_tests USING btree (user_id);

-- Índices para study_test_questions
CREATE INDEX IF NOT EXISTS idx_study_test_questions_question_id
    ON study_test_questions USING btree (question_id);

CREATE INDEX IF NOT EXISTS idx_study_test_questions_study_test_id
    ON study_test_questions USING btree (study_test_id);

CREATE INDEX IF NOT EXISTS idx_study_test_questions_ut_number
    ON study_test_questions USING btree (ut_number);

-- ============================================
-- FUNCIONES
-- ============================================

CREATE OR REPLACE FUNCTION update_study_tests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_study_tests_updated_at ON study_tests;
CREATE TRIGGER trigger_update_study_tests_updated_at
    BEFORE UPDATE ON study_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_study_tests_updated_at();

-- ============================================
-- REGISTRO DE MIGRACIÓN
-- ============================================

INSERT INTO schema_migrations (migration_name, applied_at)
VALUES ('003_add_study_mode', CURRENT_TIMESTAMP)
ON CONFLICT (migration_name) DO NOTHING;

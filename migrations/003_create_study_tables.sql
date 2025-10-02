-- Migration 003: Create tables for study mode functionality
-- Description: Tables for tracking study tests with custom UT selection
-- Date: 2025-10-01
-- Related: Feature "Modo Estudio" - docs/FEATURE_ESTUDIO_PROPOSAL.md

-- Table: study_tests
-- Stores study test configurations and results
CREATE TABLE IF NOT EXISTS study_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    selected_uts JSONB NOT NULL, -- Array of selected UT numbers [1,2,3,...]
    selection_mode VARCHAR(20) NOT NULL CHECK (selection_mode IN ('random', 'failed', 'new')),
    total_questions INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    correct_answers INTEGER DEFAULT 0,
    score_percentage NUMERIC(5,2),
    duration_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: study_test_questions
-- Stores individual questions for each study test with answers and timing
CREATE TABLE IF NOT EXISTS study_test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_test_id UUID NOT NULL REFERENCES study_tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    ut_number INTEGER NOT NULL,
    ut_category VARCHAR(100) NOT NULL,
    user_answer VARCHAR(1), -- A, B, C, D
    is_correct BOOLEAN,
    answered_at TIMESTAMP,
    time_spent_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(study_test_id, question_order)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_tests_user_id ON study_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_study_tests_status ON study_tests(status);
CREATE INDEX IF NOT EXISTS idx_study_tests_created_at ON study_tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_test_questions_study_test_id ON study_test_questions(study_test_id);
CREATE INDEX IF NOT EXISTS idx_study_test_questions_question_id ON study_test_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_study_test_questions_ut_number ON study_test_questions(ut_number);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_study_tests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_study_tests_updated_at
    BEFORE UPDATE ON study_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_study_tests_updated_at();

-- Comments for documentation
COMMENT ON TABLE study_tests IS 'Study tests with custom UT selection and different question selection strategies';
COMMENT ON TABLE study_test_questions IS 'Individual questions for study tests with user answers and timing data';
COMMENT ON COLUMN study_tests.selected_uts IS 'JSON array of selected UT numbers, e.g., [1,2,5,6]';
COMMENT ON COLUMN study_tests.selection_mode IS 'Question selection strategy: random, failed (prioritize wrong answers), new (prioritize unanswered)';
COMMENT ON COLUMN study_tests.status IS 'Current status: in_progress, completed, abandoned';

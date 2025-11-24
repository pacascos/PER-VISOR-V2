--
-- PostgreSQL database dump
--

\restrict 7YNx6yWudTqtkpULrH6IjUhj5gHl4RDTrxj0pGhopvu6hRVsM0VXys2BUrYXKI7

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: calculate_level_from_xp(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_level_from_xp(xp integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    level INTEGER := 1;
    xp_needed INTEGER := 500;
    remaining_xp INTEGER := xp;
BEGIN
    WHILE remaining_xp >= xp_needed LOOP
        remaining_xp := remaining_xp - xp_needed;
        level := level + 1;
        xp_needed := 500 + (level - 1) * 100;
    END LOOP;

    RETURN level;
END;
$$;


--
-- Name: refresh_questions_search_view(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_questions_search_view() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_questions_search;
END;
$$;


--
-- Name: update_failure_rankings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_failure_rankings() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Limpiar rankings existentes
    DELETE FROM question_failure_rankings;
    
    -- Insertar nuevos rankings por categoría
    INSERT INTO question_failure_rankings (
        question_id, category, failure_count, failure_rate, 
        total_attempts, difficulty_score, ranking_position
    )
    SELECT 
        qgs.question_id,
        q.categoria,
        qgs.total_incorrect_answers,
        qgs.success_rate,
        qgs.total_appearances,
        qgs.difficulty_score,
        ROW_NUMBER() OVER (
            PARTITION BY q.categoria 
            ORDER BY qgs.total_incorrect_answers DESC, qgs.difficulty_score DESC
        ) as ranking_position
    FROM question_global_stats qgs
    JOIN questions q ON qgs.question_id = q.id
    WHERE qgs.total_appearances > 0
    ORDER BY q.categoria, ranking_position;
END;
$$;


--
-- Name: update_question_global_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_question_global_stats(p_question_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_attempts INTEGER;
    v_correct_attempts INTEGER;
    v_incorrect_attempts INTEGER;
    v_unanswered_attempts INTEGER;
    v_success_rate DECIMAL(5,2);
    v_difficulty_score DECIMAL(5,2);
    v_avg_time DECIMAL(8,2);
    v_first_appeared TIMESTAMP;
    v_last_appeared TIMESTAMP;
BEGIN
    -- Calcular estadísticas desde question_attempt_details
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN is_correct = true THEN 1 END),
        COUNT(CASE WHEN is_correct = false THEN 1 END),
        COUNT(CASE WHEN user_answer IS NULL THEN 1 END),
        ROUND(
            (COUNT(CASE WHEN is_correct = true THEN 1 END) * 100.0 / 
             NULLIF(COUNT(*), 0)), 2
        ),
        ROUND(
            (COUNT(CASE WHEN is_correct = false THEN 1 END) * 100.0 / 
             NULLIF(COUNT(*), 0)), 2
        ),
        ROUND(AVG(time_spent_seconds), 2),
        MIN(created_at),
        MAX(created_at)
    INTO 
        v_total_attempts,
        v_correct_attempts,
        v_incorrect_attempts,
        v_unanswered_attempts,
        v_success_rate,
        v_difficulty_score,
        v_avg_time,
        v_first_appeared,
        v_last_appeared
    FROM question_attempt_details
    WHERE question_id = p_question_id;

    -- Insertar o actualizar estadísticas globales
    INSERT INTO question_global_stats (
        question_id, total_appearances, total_correct_answers, 
        total_incorrect_answers, total_unanswered, success_rate,
        difficulty_score, avg_time_spent_seconds, first_appeared_at, last_appeared_at
    ) VALUES (
        p_question_id, v_total_attempts, v_correct_attempts,
        v_incorrect_attempts, v_unanswered_attempts, v_success_rate,
        v_difficulty_score, v_avg_time, v_first_appeared, v_last_appeared
    )
    ON CONFLICT (question_id) DO UPDATE SET
        total_appearances = EXCLUDED.total_appearances,
        total_correct_answers = EXCLUDED.total_correct_answers,
        total_incorrect_answers = EXCLUDED.total_incorrect_answers,
        total_unanswered = EXCLUDED.total_unanswered,
        success_rate = EXCLUDED.success_rate,
        difficulty_score = EXCLUDED.difficulty_score,
        avg_time_spent_seconds = EXCLUDED.avg_time_spent_seconds,
        last_appeared_at = EXCLUDED.last_appeared_at,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;


--
-- Name: update_question_stats_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_question_stats_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_question_user_stats(integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_question_user_stats(p_user_id integer, p_question_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_attempts INTEGER;
    v_correct_attempts INTEGER;
    v_incorrect_attempts INTEGER;
    v_unanswered_attempts INTEGER;
    v_success_rate DECIMAL(5,2);
    v_avg_time DECIMAL(8,2);
    v_first_attempt TIMESTAMP;
    v_last_attempt TIMESTAMP;
BEGIN
    -- Calcular estadísticas del usuario para esta pregunta
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN is_correct = true THEN 1 END),
        COUNT(CASE WHEN is_correct = false THEN 1 END),
        COUNT(CASE WHEN user_answer IS NULL THEN 1 END),
        ROUND(
            (COUNT(CASE WHEN is_correct = true THEN 1 END) * 100.0 / 
             NULLIF(COUNT(*), 0)), 2
        ),
        ROUND(AVG(time_spent_seconds), 2),
        MIN(created_at),
        MAX(created_at)
    INTO 
        v_total_attempts,
        v_correct_attempts,
        v_incorrect_attempts,
        v_unanswered_attempts,
        v_success_rate,
        v_avg_time,
        v_first_attempt,
        v_last_attempt
    FROM question_attempt_details
    WHERE user_id = p_user_id AND question_id = p_question_id;

    -- Insertar o actualizar estadísticas del usuario
    INSERT INTO question_user_stats (
        user_id, question_id, total_attempts, correct_attempts,
        incorrect_attempts, unanswered_attempts, user_success_rate,
        avg_time_spent_seconds, first_attempt_at, last_attempt_at
    ) VALUES (
        p_user_id, p_question_id, v_total_attempts, v_correct_attempts,
        v_incorrect_attempts, v_unanswered_attempts, v_success_rate,
        v_avg_time, v_first_attempt, v_last_attempt
    )
    ON CONFLICT (user_id, question_id) DO UPDATE SET
        total_attempts = EXCLUDED.total_attempts,
        correct_attempts = EXCLUDED.correct_attempts,
        incorrect_attempts = EXCLUDED.incorrect_attempts,
        unanswered_attempts = EXCLUDED.unanswered_attempts,
        user_success_rate = EXCLUDED.user_success_rate,
        avg_time_spent_seconds = EXCLUDED.avg_time_spent_seconds,
        last_attempt_at = EXCLUDED.last_attempt_at,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;


--
-- Name: update_question_user_stats(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_question_user_stats(p_user_id uuid, p_question_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_attempts INTEGER;
    v_correct_attempts INTEGER;
    v_incorrect_attempts INTEGER;
    v_unanswered_attempts INTEGER;
    v_success_rate DECIMAL(5,2);
    v_avg_time DECIMAL(8,2);
    v_first_attempt TIMESTAMP;
    v_last_attempt TIMESTAMP;
BEGIN
    -- Calcular estadísticas del usuario para esta pregunta
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN is_correct = true THEN 1 END),
        COUNT(CASE WHEN is_correct = false THEN 1 END),
        COUNT(CASE WHEN user_answer IS NULL THEN 1 END),
        ROUND(
            (COUNT(CASE WHEN is_correct = true THEN 1 END) * 100.0 / 
             NULLIF(COUNT(*), 0)), 2
        ),
        ROUND(AVG(time_spent_seconds), 2),
        MIN(created_at),
        MAX(created_at)
    INTO 
        v_total_attempts,
        v_correct_attempts,
        v_incorrect_attempts,
        v_unanswered_attempts,
        v_success_rate,
        v_avg_time,
        v_first_attempt,
        v_last_attempt
    FROM question_attempt_details
    WHERE user_id = p_user_id AND question_id = p_question_id;

    -- Insertar o actualizar estadísticas del usuario
    INSERT INTO question_user_stats (
        user_id, question_id, total_attempts, correct_attempts,
        incorrect_attempts, unanswered_attempts, user_success_rate,
        avg_time_spent_seconds, first_attempt_at, last_attempt_at
    ) VALUES (
        p_user_id, p_question_id, v_total_attempts, v_correct_attempts,
        v_incorrect_attempts, v_unanswered_attempts, v_success_rate,
        v_avg_time, v_first_attempt, v_last_attempt
    )
    ON CONFLICT (user_id, question_id) DO UPDATE SET
        total_attempts = EXCLUDED.total_attempts,
        correct_attempts = EXCLUDED.correct_attempts,
        incorrect_attempts = EXCLUDED.incorrect_attempts,
        unanswered_attempts = EXCLUDED.unanswered_attempts,
        user_success_rate = EXCLUDED.user_success_rate,
        avg_time_spent_seconds = EXCLUDED.avg_time_spent_seconds,
        last_attempt_at = EXCLUDED.last_attempt_at,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;


--
-- Name: update_study_tests_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_study_tests_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_user_exams_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_exams_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: xp_needed_for_next_level(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.xp_needed_for_next_level(current_level integer, current_xp integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    xp_for_next_level INTEGER;
    total_xp_for_current_level INTEGER := 0;
    i INTEGER;
BEGIN
    -- Calculate total XP needed for current level
    FOR i IN 1..current_level LOOP
        IF i = 1 THEN
            total_xp_for_current_level := total_xp_for_current_level + 500;
        ELSE
            total_xp_for_current_level := total_xp_for_current_level + 500 + (i - 1) * 100;
        END IF;
    END LOOP;

    -- Calculate XP needed for next level
    xp_for_next_level := 500 + (current_level) * 100;

    RETURN (total_xp_for_current_level + xp_for_next_level) - current_xp;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievement_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievement_progress (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    achievement_id character varying(100) NOT NULL,
    progress_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: achievement_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.achievement_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: achievement_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.achievement_progress_id_seq OWNED BY public.achievement_progress.id;


--
-- Name: answer_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answer_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    opcion character(1) NOT NULL,
    texto text NOT NULL,
    es_correcta boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT answer_options_opcion_check CHECK ((opcion = ANY (ARRAY['a'::bpchar, 'b'::bpchar, 'c'::bpchar, 'd'::bpchar])))
);


--
-- Name: bookmarked_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookmarked_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE bookmarked_questions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bookmarked_questions IS 'Preguntas marcadas por usuarios para revisión posterior';


--
-- Name: COLUMN bookmarked_questions.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookmarked_questions.user_id IS 'ID del usuario que marcó la pregunta';


--
-- Name: COLUMN bookmarked_questions.question_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookmarked_questions.question_id IS 'ID de la pregunta marcada';


--
-- Name: COLUMN bookmarked_questions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookmarked_questions.created_at IS 'Fecha y hora en que se marcó la pregunta';


--
-- Name: question_category_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_category_stats (
    id integer NOT NULL,
    question_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    total_appearances integer DEFAULT 0,
    total_correct_answers integer DEFAULT 0,
    total_incorrect_answers integer DEFAULT 0,
    category_success_rate numeric(5,2) DEFAULT 0.00,
    difficulty_rank integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE question_category_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.question_category_stats IS 'Estadísticas de preguntas por categoría UT';


--
-- Name: category_performance_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.category_performance_summary AS
 SELECT qcs.category,
    count(DISTINCT qcs.question_id) AS total_questions,
    sum(qcs.total_appearances) AS total_appearances,
    sum(qcs.total_correct_answers) AS total_correct,
    sum(qcs.total_incorrect_answers) AS total_incorrect,
    round(avg(qcs.category_success_rate), 2) AS avg_success_rate,
    round((((sum(qcs.total_correct_answers))::numeric * 100.0) / (NULLIF(sum(qcs.total_appearances), 0))::numeric), 2) AS overall_success_rate
   FROM public.question_category_stats qcs
  GROUP BY qcs.category
  ORDER BY (round((((sum(qcs.total_correct_answers))::numeric * 100.0) / (NULLIF(sum(qcs.total_appearances), 0))::numeric), 2));


--
-- Name: exam_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_exam_id uuid,
    question_id uuid,
    question_order integer NOT NULL,
    ut_category character varying(50) NOT NULL,
    ut_number integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT exam_questions_question_order_check CHECK (((question_order >= 1) AND (question_order <= 45))),
    CONSTRAINT exam_questions_ut_number_check CHECK (((ut_number >= 1) AND (ut_number <= 11)))
);


--
-- Name: TABLE exam_questions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.exam_questions IS 'Preguntas asignadas a cada examen con su orden';


--
-- Name: exam_topic_performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_topic_performance (
    id integer NOT NULL,
    exam_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    correct_answers integer DEFAULT 0 NOT NULL,
    total_questions integer DEFAULT 0 NOT NULL,
    percentage numeric(5,2) DEFAULT 0.00 NOT NULL,
    time_spent_seconds integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: exam_topic_performance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_topic_performance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_topic_performance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_topic_performance_id_seq OWNED BY public.exam_topic_performance.id;


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo character varying(500) NOT NULL,
    fecha date,
    convocatoria character varying(100),
    tipo_examen character varying(100),
    tipo_convocatoria character varying(100),
    archivo_fuente character varying(500),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE exams; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.exams IS 'Individual exam records with scores and timing information';


--
-- Name: question_failure_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_failure_rankings (
    id integer NOT NULL,
    question_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    failure_count integer DEFAULT 0,
    failure_rate numeric(5,2) DEFAULT 0.00,
    total_attempts integer DEFAULT 0,
    difficulty_score numeric(5,2) DEFAULT 0.00,
    ranking_position integer,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE question_failure_rankings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.question_failure_rankings IS 'Rankings de preguntas más falladas por categoría';


--
-- Name: question_global_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_global_stats (
    id integer NOT NULL,
    question_id uuid NOT NULL,
    total_appearances integer DEFAULT 0,
    total_correct_answers integer DEFAULT 0,
    total_incorrect_answers integer DEFAULT 0,
    total_unanswered integer DEFAULT 0,
    success_rate numeric(5,2) DEFAULT 0.00,
    difficulty_score numeric(5,2) DEFAULT 0.00,
    avg_time_spent_seconds numeric(8,2) DEFAULT 0.00,
    first_appeared_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_appeared_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE question_global_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.question_global_stats IS 'Estadísticas globales de rendimiento de cada pregunta';


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid,
    numero_pregunta integer NOT NULL,
    texto_pregunta text NOT NULL,
    respuesta_correcta character(1),
    imagen_pregunta text,
    imagen_respuesta text,
    categoria character varying(100),
    subcategoria character varying(100),
    dificultad character varying(50),
    hash_pregunta character varying(64) NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    anulada boolean DEFAULT false,
    CONSTRAINT questions_respuesta_correcta_check CHECK (((respuesta_correcta IS NULL) OR (respuesta_correcta = ANY (ARRAY['a'::bpchar, 'b'::bpchar, 'c'::bpchar, 'd'::bpchar]))))
);


--
-- Name: most_failed_questions_by_category; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.most_failed_questions_by_category AS
 SELECT q.id AS question_id,
    q.texto_pregunta,
    q.categoria,
    q.respuesta_correcta,
    qgs.total_appearances,
    qgs.total_incorrect_answers,
    qgs.success_rate,
    qgs.difficulty_score,
    qfr.ranking_position,
    qfr.failure_rate,
    qgs.last_appeared_at
   FROM ((public.questions q
     JOIN public.question_global_stats qgs ON ((q.id = qgs.question_id)))
     JOIN public.question_failure_rankings qfr ON ((q.id = qfr.question_id)))
  WHERE (qgs.total_appearances > 0)
  ORDER BY q.categoria, qfr.ranking_position;


--
-- Name: question_attempt_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_attempt_details (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    exam_id uuid,
    user_answer character(1),
    correct_answer character(1) NOT NULL,
    is_correct boolean NOT NULL,
    time_spent_seconds integer DEFAULT 0,
    category character varying(50),
    attempt_order integer,
    session_type character varying(20) DEFAULT 'exam'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT question_attempt_details_correct_answer_check CHECK ((correct_answer = ANY (ARRAY['a'::bpchar, 'b'::bpchar, 'c'::bpchar, 'd'::bpchar]))),
    CONSTRAINT question_attempt_details_session_type_check CHECK (((session_type)::text = ANY (ARRAY[('exam'::character varying)::text, ('practice'::character varying)::text, ('review'::character varying)::text]))),
    CONSTRAINT question_attempt_details_user_answer_check CHECK (((user_answer = ANY (ARRAY['a'::bpchar, 'b'::bpchar, 'c'::bpchar, 'd'::bpchar])) OR (user_answer IS NULL)))
);


--
-- Name: TABLE question_attempt_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.question_attempt_details IS 'Registro detallado de cada intento de pregunta';


--
-- Name: question_attempt_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_attempt_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_attempt_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_attempt_details_id_seq OWNED BY public.question_attempt_details.id;


--
-- Name: question_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_attempts (
    id integer NOT NULL,
    exam_id uuid NOT NULL,
    question_id character varying(100) NOT NULL,
    user_answer character varying(10),
    correct_answer character varying(10) NOT NULL,
    is_correct boolean NOT NULL,
    time_spent_seconds integer DEFAULT 0,
    category character varying(50),
    attempt_order integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: question_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_attempts_id_seq OWNED BY public.question_attempts.id;


--
-- Name: question_category_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_category_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_category_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_category_stats_id_seq OWNED BY public.question_category_stats.id;


--
-- Name: question_explanations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_explanations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    explicacion_texto text,
    explicacion_html text,
    recursos_visuales jsonb,
    modelo_usado character varying(100),
    tokens_usados integer,
    tiempo_generacion_ms integer,
    cache_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    image_prompt text,
    image_png_url character varying(500),
    image_png_generated_at timestamp with time zone,
    image_uploaded_url character varying(500),
    image_uploaded_filename character varying(255),
    image_uploaded_at timestamp with time zone
);


--
-- Name: question_failure_rankings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_failure_rankings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_failure_rankings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_failure_rankings_id_seq OWNED BY public.question_failure_rankings.id;


--
-- Name: question_global_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_global_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_global_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_global_stats_id_seq OWNED BY public.question_global_stats.id;


--
-- Name: question_user_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_user_stats (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    total_attempts integer DEFAULT 0,
    correct_attempts integer DEFAULT 0,
    incorrect_attempts integer DEFAULT 0,
    unanswered_attempts integer DEFAULT 0,
    user_success_rate numeric(5,2) DEFAULT 0.00,
    avg_time_spent_seconds numeric(8,2) DEFAULT 0.00,
    first_attempt_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE question_user_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.question_user_stats IS 'Estadísticas de rendimiento de cada usuario en cada pregunta';


--
-- Name: question_user_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_user_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_user_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_user_stats_id_seq OWNED BY public.question_user_stats.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    checksum character varying(64),
    environment character varying(50) NOT NULL
);


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: study_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_sessions (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    session_type character varying(50) NOT NULL,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ended_at timestamp without time zone,
    duration_minutes integer,
    questions_reviewed integer DEFAULT 0,
    questions_practiced integer DEFAULT 0,
    topics_studied text[],
    performance_summary jsonb
);


--
-- Name: study_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.study_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: study_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.study_sessions_id_seq OWNED BY public.study_sessions.id;


--
-- Name: study_test_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_test_questions (
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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE study_test_questions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.study_test_questions IS 'Individual questions for study tests with user answers and timing data';


--
-- Name: study_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_tests (
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
    CONSTRAINT study_tests_selection_mode_check CHECK (((selection_mode)::text = ANY (ARRAY[('random'::character varying)::text, ('failed'::character varying)::text, ('new'::character varying)::text]))),
    CONSTRAINT study_tests_status_check CHECK (((status)::text = ANY (ARRAY[('in_progress'::character varying)::text, ('completed'::character varying)::text, ('abandoned'::character varying)::text])))
);


--
-- Name: TABLE study_tests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.study_tests IS 'Study tests with custom UT selection and different question selection strategies';


--
-- Name: COLUMN study_tests.selected_uts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.study_tests.selected_uts IS 'JSON array of selected UT numbers, e.g., [1,2,5,6]';


--
-- Name: COLUMN study_tests.selection_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.study_tests.selection_mode IS 'Question selection strategy: random, failed (prioritize wrong answers), new (prioritize unanswered)';


--
-- Name: COLUMN study_tests.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.study_tests.status IS 'Current status: in_progress, completed, abandoned';


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    achievement_id character varying(100) NOT NULL,
    unlocked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    xp_earned integer DEFAULT 0,
    notification_seen boolean DEFAULT false
);


--
-- Name: user_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_achievements_id_seq OWNED BY public.user_achievements.id;


--
-- Name: user_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_exam_id uuid,
    question_id uuid,
    selected_answer character(1),
    is_correct boolean,
    time_spent_seconds integer DEFAULT 0,
    answered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_answers_selected_answer_check CHECK ((selected_answer = ANY (ARRAY['a'::bpchar, 'b'::bpchar, 'c'::bpchar, 'd'::bpchar])))
);


--
-- Name: TABLE user_answers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_answers IS 'Respuestas individuales de usuarios a preguntas específicas';


--
-- Name: user_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    exam_type character varying(10) DEFAULT 'PER'::character varying,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    duration_minutes integer,
    total_questions integer DEFAULT 45,
    correct_answers integer DEFAULT 0,
    status character varying(20) DEFAULT 'in_progress'::character varying,
    passed boolean,
    score_percentage numeric(5,2),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    score integer DEFAULT 0,
    time_taken_minutes integer DEFAULT 0,
    exam_config jsonb,
    CONSTRAINT user_exams_status_check CHECK (((status)::text = ANY (ARRAY[('in_progress'::character varying)::text, ('completed'::character varying)::text, ('abandoned'::character varying)::text])))
);


--
-- Name: TABLE user_exams; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_exams IS 'Exámenes generados para usuarios específicos';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'viewer'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp with time zone,
    registration_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_role CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('editor'::character varying)::text, ('viewer'::character varying)::text])))
);


--
-- Name: COLUMN users.registration_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.registration_date IS 'Fecha y hora de registro del usuario';


--
-- Name: user_category_performance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_category_performance AS
 SELECT u.id AS user_id,
    u.username,
    eq.ut_category,
    eq.ut_number,
    count(ua.id) AS total_questions_answered,
    count(
        CASE
            WHEN (ua.is_correct = true) THEN 1
            ELSE NULL::integer
        END) AS correct_answers,
    count(
        CASE
            WHEN (ua.is_correct = false) THEN 1
            ELSE NULL::integer
        END) AS incorrect_answers,
    round(
        CASE
            WHEN (count(ua.id) > 0) THEN (((count(
            CASE
                WHEN (ua.is_correct = true) THEN 1
                ELSE NULL::integer
            END))::numeric * 100.0) / (count(ua.id))::numeric)
            ELSE (0)::numeric
        END, 2) AS success_percentage,
    avg(ua.time_spent_seconds) AS avg_time_per_question
   FROM (((public.users u
     LEFT JOIN public.user_exams ue ON ((u.id = ue.user_id)))
     LEFT JOIN public.exam_questions eq ON ((ue.id = eq.user_exam_id)))
     LEFT JOIN public.user_answers ua ON (((ue.id = ua.user_exam_id) AND (eq.question_id = ua.question_id))))
  WHERE (((ue.status)::text = 'completed'::text) OR (ue.status IS NULL))
  GROUP BY u.id, u.username, eq.ut_category, eq.ut_number;


--
-- Name: user_exam_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_exam_statistics AS
 SELECT u.id AS user_id,
    u.username,
    u.email,
    count(ue.id) AS total_exams_attempted,
    count(
        CASE
            WHEN ((ue.status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS total_exams_completed,
    count(
        CASE
            WHEN (ue.passed = true) THEN 1
            ELSE NULL::integer
        END) AS total_exams_passed,
    count(
        CASE
            WHEN (ue.passed = false) THEN 1
            ELSE NULL::integer
        END) AS total_exams_failed,
    COALESCE(avg(
        CASE
            WHEN ((ue.status)::text = 'completed'::text) THEN ue.score_percentage
            ELSE NULL::numeric
        END), (0)::numeric) AS average_score,
    COALESCE(max(ue.score_percentage), (0)::numeric) AS best_score,
    COALESCE(min(
        CASE
            WHEN ((ue.status)::text = 'completed'::text) THEN ue.score_percentage
            ELSE NULL::numeric
        END), (0)::numeric) AS worst_score,
    count(
        CASE
            WHEN ((ue.status)::text = 'in_progress'::text) THEN 1
            ELSE NULL::integer
        END) AS exams_in_progress
   FROM (public.users u
     LEFT JOIN public.user_exams ue ON ((u.id = ue.user_id)))
  GROUP BY u.id, u.username, u.email;


--
-- Name: user_failed_questions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_failed_questions AS
 SELECT u.id AS user_id,
    u.username,
    q.id AS question_id,
    q.texto_pregunta,
    q.categoria,
    q.respuesta_correcta,
    count(ua.id) AS times_answered,
    count(
        CASE
            WHEN (ua.is_correct = false) THEN 1
            ELSE NULL::integer
        END) AS times_failed,
    round((((count(
        CASE
            WHEN (ua.is_correct = false) THEN 1
            ELSE NULL::integer
        END))::numeric * 100.0) / (count(ua.id))::numeric), 2) AS failure_rate
   FROM (((public.users u
     JOIN public.user_exams ue ON ((u.id = ue.user_id)))
     JOIN public.user_answers ua ON ((ue.id = ua.user_exam_id)))
     JOIN public.questions q ON ((ua.question_id = q.id)))
  WHERE ((ue.status)::text = 'completed'::text)
  GROUP BY u.id, u.username, q.id, q.texto_pregunta, q.categoria, q.respuesta_correcta
 HAVING (count(
        CASE
            WHEN (ua.is_correct = false) THEN 1
            ELSE NULL::integer
        END) > 0)
  ORDER BY (round((((count(
        CASE
            WHEN (ua.is_correct = false) THEN 1
            ELSE NULL::integer
        END))::numeric * 100.0) / (count(ua.id))::numeric), 2)) DESC;


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    preferred_exam_length integer DEFAULT 45,
    preferred_difficulty character varying(20) DEFAULT 'mixed'::character varying,
    notification_settings jsonb DEFAULT '{}'::jsonb,
    study_reminders jsonb DEFAULT '{}'::jsonb,
    dashboard_layout jsonb DEFAULT '{}'::jsonb,
    privacy_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;


--
-- Name: user_question_performance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_question_performance AS
 SELECT u.id AS user_id,
    u.username,
    q.id AS question_id,
    q.texto_pregunta,
    q.categoria,
    qus.total_attempts,
    qus.correct_attempts,
    qus.incorrect_attempts,
    qus.user_success_rate,
    qus.avg_time_spent_seconds,
    qus.last_attempt_at
   FROM ((public.users u
     JOIN public.question_user_stats qus ON ((u.id = qus.user_id)))
     JOIN public.questions q ON ((qus.question_id = q.id)))
  WHERE (qus.total_attempts > 0)
  ORDER BY u.username, qus.user_success_rate;


--
-- Name: user_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_statistics (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    level integer DEFAULT 1,
    total_xp integer DEFAULT 0,
    exams_completed integer DEFAULT 0,
    total_questions_answered integer DEFAULT 0,
    correct_answers integer DEFAULT 0,
    study_time_minutes integer DEFAULT 0,
    daily_streak_count integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    last_study_date date,
    last_exam_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_statistics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_statistics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_statistics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_statistics_id_seq OWNED BY public.user_statistics.id;


--
-- Name: user_weak_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_weak_topics (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    weakness_score numeric(5,2) NOT NULL,
    recent_performance numeric(5,2) NOT NULL,
    questions_attempted integer DEFAULT 0,
    questions_correct integer DEFAULT 0,
    last_attempt_date timestamp without time zone,
    recommendation_priority integer DEFAULT 1,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_weak_topics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_weak_topics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_weak_topics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_weak_topics_id_seq OWNED BY public.user_weak_topics.id;


--
-- Name: ut_configuration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ut_configuration (
    id integer NOT NULL,
    ut_number integer NOT NULL,
    ut_name character varying(100) NOT NULL,
    category_name character varying(100) NOT NULL,
    questions_per_exam integer NOT NULL,
    max_errors_allowed integer,
    is_critical boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ut_configuration_questions_per_exam_check CHECK ((questions_per_exam > 0)),
    CONSTRAINT ut_configuration_ut_number_check CHECK (((ut_number >= 1) AND (ut_number <= 11)))
);


--
-- Name: TABLE ut_configuration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ut_configuration IS 'Configuración de las Unidades Temáticas del PER';


--
-- Name: ut_configuration_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ut_configuration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ut_configuration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ut_configuration_id_seq OWNED BY public.ut_configuration.id;


--
-- Name: achievement_progress id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress ALTER COLUMN id SET DEFAULT nextval('public.achievement_progress_id_seq'::regclass);


--
-- Name: exam_topic_performance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_topic_performance ALTER COLUMN id SET DEFAULT nextval('public.exam_topic_performance_id_seq'::regclass);


--
-- Name: question_attempt_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_attempt_details ALTER COLUMN id SET DEFAULT nextval('public.question_attempt_details_id_seq'::regclass);


--
-- Name: question_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_attempts ALTER COLUMN id SET DEFAULT nextval('public.question_attempts_id_seq'::regclass);


--
-- Name: question_category_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_category_stats ALTER COLUMN id SET DEFAULT nextval('public.question_category_stats_id_seq'::regclass);


--
-- Name: question_failure_rankings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_failure_rankings ALTER COLUMN id SET DEFAULT nextval('public.question_failure_rankings_id_seq'::regclass);


--
-- Name: question_global_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_global_stats ALTER COLUMN id SET DEFAULT nextval('public.question_global_stats_id_seq'::regclass);


--
-- Name: question_user_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_user_stats ALTER COLUMN id SET DEFAULT nextval('public.question_user_stats_id_seq'::regclass);


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: study_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions ALTER COLUMN id SET DEFAULT nextval('public.study_sessions_id_seq'::regclass);


--
-- Name: user_achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements ALTER COLUMN id SET DEFAULT nextval('public.user_achievements_id_seq'::regclass);


--
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- Name: user_statistics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_statistics ALTER COLUMN id SET DEFAULT nextval('public.user_statistics_id_seq'::regclass);


--
-- Name: user_weak_topics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_weak_topics ALTER COLUMN id SET DEFAULT nextval('public.user_weak_topics_id_seq'::regclass);


--
-- Name: ut_configuration id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut_configuration ALTER COLUMN id SET DEFAULT nextval('public.ut_configuration_id_seq'::regclass);


--
-- Data for Name: achievement_progress; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: answer_options; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: bookmarked_questions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: exam_questions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: exam_topic_performance; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: question_attempt_details; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: question_attempts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: question_category_stats; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: question_explanations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: question_failure_rankings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: question_global_stats; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: question_user_stats; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: study_sessions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: study_test_questions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: study_tests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_answers; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_exams; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_statistics; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_weak_topics; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ut_configuration; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: achievement_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: exam_topic_performance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: question_attempt_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: question_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: question_category_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: question_failure_rankings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: question_global_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: question_user_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: schema_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: study_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: user_achievements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: user_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: user_statistics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: user_weak_topics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: ut_configuration_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--



--
-- Name: achievement_progress achievement_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_pkey PRIMARY KEY (id);


--
-- Name: achievement_progress achievement_progress_user_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_user_id_achievement_id_key UNIQUE (user_id, achievement_id);


--
-- Name: answer_options answer_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_options
    ADD CONSTRAINT answer_options_pkey PRIMARY KEY (id);


--
-- Name: answer_options answer_options_question_id_opcion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_options
    ADD CONSTRAINT answer_options_question_id_opcion_key UNIQUE (question_id, opcion);


--
-- Name: bookmarked_questions bookmarked_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarked_questions
    ADD CONSTRAINT bookmarked_questions_pkey PRIMARY KEY (id);


--
-- Name: bookmarked_questions bookmarked_questions_user_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarked_questions
    ADD CONSTRAINT bookmarked_questions_user_id_question_id_key UNIQUE (user_id, question_id);


--
-- Name: exam_questions exam_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_pkey PRIMARY KEY (id);


--
-- Name: exam_questions exam_questions_user_exam_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_user_exam_id_question_id_key UNIQUE (user_exam_id, question_id);


--
-- Name: exam_questions exam_questions_user_exam_id_question_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_user_exam_id_question_order_key UNIQUE (user_exam_id, question_order);


--
-- Name: exam_topic_performance exam_topic_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_topic_performance
    ADD CONSTRAINT exam_topic_performance_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: question_attempt_details question_attempt_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_attempt_details
    ADD CONSTRAINT question_attempt_details_pkey PRIMARY KEY (id);


--
-- Name: question_attempts question_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_attempts
    ADD CONSTRAINT question_attempts_pkey PRIMARY KEY (id);


--
-- Name: question_category_stats question_category_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_category_stats
    ADD CONSTRAINT question_category_stats_pkey PRIMARY KEY (id);


--
-- Name: question_category_stats question_category_stats_question_id_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_category_stats
    ADD CONSTRAINT question_category_stats_question_id_category_key UNIQUE (question_id, category);


--
-- Name: question_explanations question_explanations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_explanations
    ADD CONSTRAINT question_explanations_pkey PRIMARY KEY (id);


--
-- Name: question_explanations question_explanations_question_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_explanations
    ADD CONSTRAINT question_explanations_question_id_unique UNIQUE (question_id);


--
-- Name: question_failure_rankings question_failure_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_failure_rankings
    ADD CONSTRAINT question_failure_rankings_pkey PRIMARY KEY (id);


--
-- Name: question_failure_rankings question_failure_rankings_question_id_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_failure_rankings
    ADD CONSTRAINT question_failure_rankings_question_id_category_key UNIQUE (question_id, category);


--
-- Name: question_global_stats question_global_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_global_stats
    ADD CONSTRAINT question_global_stats_pkey PRIMARY KEY (id);


--
-- Name: question_global_stats question_global_stats_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_global_stats
    ADD CONSTRAINT question_global_stats_question_id_key UNIQUE (question_id);


--
-- Name: question_user_stats question_user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_user_stats
    ADD CONSTRAINT question_user_stats_pkey PRIMARY KEY (id);


--
-- Name: question_user_stats question_user_stats_user_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_user_stats
    ADD CONSTRAINT question_user_stats_user_id_question_id_key UNIQUE (user_id, question_id);


--
-- Name: questions questions_exam_id_numero_pregunta_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_numero_pregunta_key UNIQUE (exam_id, numero_pregunta);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: study_sessions study_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_pkey PRIMARY KEY (id);


--
-- Name: study_test_questions study_test_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_test_questions
    ADD CONSTRAINT study_test_questions_pkey PRIMARY KEY (id);


--
-- Name: study_test_questions study_test_questions_study_test_id_question_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_test_questions
    ADD CONSTRAINT study_test_questions_study_test_id_question_order_key UNIQUE (study_test_id, question_order);


--
-- Name: study_tests study_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_tests
    ADD CONSTRAINT study_tests_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_user_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id);


--
-- Name: user_answers user_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_answers
    ADD CONSTRAINT user_answers_pkey PRIMARY KEY (id);


--
-- Name: user_answers user_answers_user_exam_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_answers
    ADD CONSTRAINT user_answers_user_exam_id_question_id_key UNIQUE (user_exam_id, question_id);


--
-- Name: user_exams user_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_exams
    ADD CONSTRAINT user_exams_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_statistics user_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_statistics
    ADD CONSTRAINT user_statistics_pkey PRIMARY KEY (id);


--
-- Name: user_statistics user_statistics_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_statistics
    ADD CONSTRAINT user_statistics_user_id_key UNIQUE (user_id);


--
-- Name: user_weak_topics user_weak_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_weak_topics
    ADD CONSTRAINT user_weak_topics_pkey PRIMARY KEY (id);


--
-- Name: user_weak_topics user_weak_topics_user_id_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_weak_topics
    ADD CONSTRAINT user_weak_topics_user_id_category_key UNIQUE (user_id, category);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: ut_configuration ut_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut_configuration
    ADD CONSTRAINT ut_configuration_pkey PRIMARY KEY (id);


--
-- Name: ut_configuration ut_configuration_ut_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut_configuration
    ADD CONSTRAINT ut_configuration_ut_number_key UNIQUE (ut_number);


--
-- Name: idx_achievement_progress_achievement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievement_progress_achievement_id ON public.achievement_progress USING btree (achievement_id);


--
-- Name: idx_achievement_progress_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievement_progress_user_id ON public.achievement_progress USING btree (user_id);


--
-- Name: idx_bookmarked_questions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookmarked_questions_created_at ON public.bookmarked_questions USING btree (created_at DESC);


--
-- Name: idx_bookmarked_questions_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookmarked_questions_question_id ON public.bookmarked_questions USING btree (question_id);


--
-- Name: idx_bookmarked_questions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookmarked_questions_user_id ON public.bookmarked_questions USING btree (user_id);


--
-- Name: idx_exam_questions_user_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_questions_user_exam_id ON public.exam_questions USING btree (user_exam_id);


--
-- Name: idx_exam_questions_ut_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_questions_ut_category ON public.exam_questions USING btree (ut_category);


--
-- Name: idx_question_attempt_details_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_attempt_details_category ON public.question_attempt_details USING btree (category);


--
-- Name: idx_question_attempt_details_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_attempt_details_created_at ON public.question_attempt_details USING btree (created_at);


--
-- Name: idx_question_attempt_details_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_attempt_details_exam_id ON public.question_attempt_details USING btree (exam_id);


--
-- Name: idx_question_attempt_details_is_correct; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_attempt_details_is_correct ON public.question_attempt_details USING btree (is_correct);


--
-- Name: idx_question_attempt_details_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_attempt_details_question_id ON public.question_attempt_details USING btree (question_id);


--
-- Name: idx_question_attempt_details_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_attempt_details_user_id ON public.question_attempt_details USING btree (user_id);


--
-- Name: idx_question_attempts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_attempts_category ON public.question_attempts USING btree (category);


--
-- Name: idx_question_attempts_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_attempts_exam_id ON public.question_attempts USING btree (exam_id);


--
-- Name: idx_question_attempts_is_correct; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_attempts_is_correct ON public.question_attempts USING btree (is_correct);


--
-- Name: idx_question_attempts_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_attempts_question_id ON public.question_attempts USING btree (question_id);


--
-- Name: idx_question_category_stats_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_category_stats_category ON public.question_category_stats USING btree (category);


--
-- Name: idx_question_category_stats_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_category_stats_question_id ON public.question_category_stats USING btree (question_id);


--
-- Name: idx_question_category_stats_success_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_category_stats_success_rate ON public.question_category_stats USING btree (category_success_rate);


--
-- Name: idx_question_failure_rankings_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_failure_rankings_category ON public.question_failure_rankings USING btree (category);


--
-- Name: idx_question_failure_rankings_failure_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_failure_rankings_failure_rate ON public.question_failure_rankings USING btree (failure_rate);


--
-- Name: idx_question_failure_rankings_ranking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_failure_rankings_ranking ON public.question_failure_rankings USING btree (category, ranking_position);


--
-- Name: idx_question_global_stats_difficulty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_global_stats_difficulty ON public.question_global_stats USING btree (difficulty_score);


--
-- Name: idx_question_global_stats_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_global_stats_question_id ON public.question_global_stats USING btree (question_id);


--
-- Name: idx_question_global_stats_success_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_global_stats_success_rate ON public.question_global_stats USING btree (success_rate);


--
-- Name: idx_question_user_stats_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_user_stats_question_id ON public.question_user_stats USING btree (question_id);


--
-- Name: idx_question_user_stats_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_user_stats_user_id ON public.question_user_stats USING btree (user_id);


--
-- Name: idx_question_user_stats_user_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_user_stats_user_question ON public.question_user_stats USING btree (user_id, question_id);


--
-- Name: idx_question_user_stats_user_success_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_question_user_stats_user_success_rate ON public.question_user_stats USING btree (user_success_rate);


--
-- Name: idx_study_sessions_session_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_sessions_session_type ON public.study_sessions USING btree (session_type);


--
-- Name: idx_study_sessions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_sessions_started_at ON public.study_sessions USING btree (started_at);


--
-- Name: idx_study_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_sessions_user_id ON public.study_sessions USING btree (user_id);


--
-- Name: idx_study_test_questions_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_test_questions_question_id ON public.study_test_questions USING btree (question_id);


--
-- Name: idx_study_test_questions_study_test_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_test_questions_study_test_id ON public.study_test_questions USING btree (study_test_id);


--
-- Name: idx_study_test_questions_ut_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_test_questions_ut_number ON public.study_test_questions USING btree (ut_number);


--
-- Name: idx_study_tests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_tests_created_at ON public.study_tests USING btree (created_at DESC);


--
-- Name: idx_study_tests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_tests_status ON public.study_tests USING btree (status);


--
-- Name: idx_study_tests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_tests_user_id ON public.study_tests USING btree (user_id);


--
-- Name: idx_topic_performance_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_performance_category ON public.exam_topic_performance USING btree (category);


--
-- Name: idx_topic_performance_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_performance_exam_id ON public.exam_topic_performance USING btree (exam_id);


--
-- Name: idx_user_achievements_achievement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_achievement_id ON public.user_achievements USING btree (achievement_id);


--
-- Name: idx_user_achievements_unlocked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_unlocked_at ON public.user_achievements USING btree (unlocked_at);


--
-- Name: idx_user_achievements_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_user_id ON public.user_achievements USING btree (user_id);


--
-- Name: idx_user_answers_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_answers_question_id ON public.user_answers USING btree (question_id);


--
-- Name: idx_user_answers_user_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_answers_user_exam_id ON public.user_answers USING btree (user_exam_id);


--
-- Name: idx_user_exams_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_exams_created_at ON public.user_exams USING btree (created_at);


--
-- Name: idx_user_exams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_exams_status ON public.user_exams USING btree (status);


--
-- Name: idx_user_exams_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_exams_user_id ON public.user_exams USING btree (user_id);


--
-- Name: idx_user_statistics_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_statistics_level ON public.user_statistics USING btree (level);


--
-- Name: idx_user_statistics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_statistics_user_id ON public.user_statistics USING btree (user_id);


--
-- Name: idx_weak_topics_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weak_topics_priority ON public.user_weak_topics USING btree (recommendation_priority);


--
-- Name: idx_weak_topics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weak_topics_user_id ON public.user_weak_topics USING btree (user_id);


--
-- Name: idx_weak_topics_weakness_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weak_topics_weakness_score ON public.user_weak_topics USING btree (weakness_score);


--
-- Name: study_tests trigger_update_study_tests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_study_tests_updated_at BEFORE UPDATE ON public.study_tests FOR EACH ROW EXECUTE FUNCTION public.update_study_tests_updated_at();


--
-- Name: user_exams trigger_update_user_exams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_user_exams_updated_at BEFORE UPDATE ON public.user_exams FOR EACH ROW EXECUTE FUNCTION public.update_user_exams_updated_at();


--
-- Name: achievement_progress update_achievement_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_achievement_progress_updated_at BEFORE UPDATE ON public.achievement_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: question_category_stats update_question_category_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_question_category_stats_updated_at BEFORE UPDATE ON public.question_category_stats FOR EACH ROW EXECUTE FUNCTION public.update_question_stats_updated_at();


--
-- Name: question_global_stats update_question_global_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_question_global_stats_updated_at BEFORE UPDATE ON public.question_global_stats FOR EACH ROW EXECUTE FUNCTION public.update_question_stats_updated_at();


--
-- Name: question_user_stats update_question_user_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_question_user_stats_updated_at BEFORE UPDATE ON public.question_user_stats FOR EACH ROW EXECUTE FUNCTION public.update_question_stats_updated_at();


--
-- Name: user_preferences update_user_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_statistics update_user_statistics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON public.user_statistics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_weak_topics update_weak_topics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_weak_topics_updated_at BEFORE UPDATE ON public.user_weak_topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: achievement_progress achievement_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievement_progress
    ADD CONSTRAINT achievement_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: answer_options answer_options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_options
    ADD CONSTRAINT answer_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: bookmarked_questions bookmarked_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarked_questions
    ADD CONSTRAINT bookmarked_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: bookmarked_questions bookmarked_questions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarked_questions
    ADD CONSTRAINT bookmarked_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: exam_questions exam_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: exam_questions exam_questions_user_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_user_exam_id_fkey FOREIGN KEY (user_exam_id) REFERENCES public.user_exams(id) ON DELETE CASCADE;


--
-- Name: exam_topic_performance exam_topic_performance_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_topic_performance
    ADD CONSTRAINT exam_topic_performance_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.user_exams(id) ON DELETE CASCADE;


--
-- Name: question_attempt_details question_attempt_details_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_attempt_details
    ADD CONSTRAINT question_attempt_details_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: question_attempt_details question_attempt_details_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_attempt_details
    ADD CONSTRAINT question_attempt_details_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_attempt_details question_attempt_details_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_attempt_details
    ADD CONSTRAINT question_attempt_details_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: question_category_stats question_category_stats_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_category_stats
    ADD CONSTRAINT question_category_stats_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_explanations question_explanations_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_explanations
    ADD CONSTRAINT question_explanations_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_failure_rankings question_failure_rankings_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_failure_rankings
    ADD CONSTRAINT question_failure_rankings_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_global_stats question_global_stats_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_global_stats
    ADD CONSTRAINT question_global_stats_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_user_stats question_user_stats_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_user_stats
    ADD CONSTRAINT question_user_stats_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_user_stats question_user_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_user_stats
    ADD CONSTRAINT question_user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: questions questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: study_sessions study_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: study_test_questions study_test_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_test_questions
    ADD CONSTRAINT study_test_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: study_test_questions study_test_questions_study_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_test_questions
    ADD CONSTRAINT study_test_questions_study_test_id_fkey FOREIGN KEY (study_test_id) REFERENCES public.study_tests(id) ON DELETE CASCADE;


--
-- Name: study_tests study_tests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_tests
    ADD CONSTRAINT study_tests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_answers user_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_answers
    ADD CONSTRAINT user_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: user_answers user_answers_user_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_answers
    ADD CONSTRAINT user_answers_user_exam_id_fkey FOREIGN KEY (user_exam_id) REFERENCES public.user_exams(id) ON DELETE CASCADE;


--
-- Name: user_exams user_exams_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_exams
    ADD CONSTRAINT user_exams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_statistics user_statistics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_statistics
    ADD CONSTRAINT user_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_weak_topics user_weak_topics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_weak_topics
    ADD CONSTRAINT user_weak_topics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT ALL ON SCHEMA public TO cloudsqlsuperuser;


--
-- PostgreSQL database dump complete
--

\unrestrict 7YNx6yWudTqtkpULrH6IjUhj5gHl4RDTrxj0pGhopvu6hRVsM0VXys2BUrYXKI7


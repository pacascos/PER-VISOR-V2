--
-- PostgreSQL database dump
--


-- Dumped from database version 14.19
-- Dumped by pg_dump version 14.19

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

SET default_tablespace = '';

SET default_table_access_method = heap;

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
    CONSTRAINT study_tests_selection_mode_check CHECK (((selection_mode)::text = ANY ((ARRAY['random'::character varying, 'failed'::character varying, 'new'::character varying])::text[]))),
    CONSTRAINT study_tests_status_check CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'completed'::character varying, 'abandoned'::character varying])::text[])))
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
-- Name: study_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions ALTER COLUMN id SET DEFAULT nextval('public.study_sessions_id_seq'::regclass);


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
-- Name: study_tests trigger_update_study_tests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_study_tests_updated_at BEFORE UPDATE ON public.study_tests FOR EACH ROW EXECUTE FUNCTION public.update_study_tests_updated_at();


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
-- PostgreSQL database dump complete
--



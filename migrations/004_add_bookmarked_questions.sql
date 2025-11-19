-- Migration 004: Add bookmarked questions functionality
-- Description: Allows users to bookmark questions for later review
-- Date: 2025-01-03

-- Table: bookmarked_questions
-- Stores questions that users have bookmarked for later review
CREATE TABLE IF NOT EXISTS bookmarked_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookmarked_questions_user_id 
    ON bookmarked_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_questions_question_id 
    ON bookmarked_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_questions_created_at 
    ON bookmarked_questions(created_at DESC);

-- Comments
COMMENT ON TABLE bookmarked_questions IS 'Preguntas marcadas por usuarios para revisión posterior';
COMMENT ON COLUMN bookmarked_questions.user_id IS 'ID del usuario que marcó la pregunta';
COMMENT ON COLUMN bookmarked_questions.question_id IS 'ID de la pregunta marcada';
COMMENT ON COLUMN bookmarked_questions.created_at IS 'Fecha y hora en que se marcó la pregunta';


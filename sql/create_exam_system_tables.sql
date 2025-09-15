-- ====================================
-- Sistema de Exámenes PER - Tablas nuevas
-- ====================================

-- Tabla para exámenes generados por usuario
CREATE TABLE user_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exam_type VARCHAR(10) DEFAULT 'PER',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    total_questions INTEGER DEFAULT 45,
    correct_answers INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    passed BOOLEAN,
    score_percentage DECIMAL(5,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para preguntas asignadas a cada examen
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_exam_id UUID REFERENCES user_exams(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL CHECK (question_order >= 1 AND question_order <= 45),
    ut_category VARCHAR(50) NOT NULL,
    ut_number INTEGER CHECK (ut_number >= 1 AND ut_number <= 11),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_exam_id, question_order),
    UNIQUE(user_exam_id, question_id)
);

-- Tabla para respuestas individuales del usuario
CREATE TABLE user_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_exam_id UUID REFERENCES user_exams(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    selected_answer CHAR(1) CHECK (selected_answer IN ('a', 'b', 'c', 'd')),
    is_correct BOOLEAN,
    time_spent_seconds INTEGER DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_exam_id, question_id)
);

-- Índices para optimizar consultas
CREATE INDEX idx_user_exams_user_id ON user_exams(user_id);
CREATE INDEX idx_user_exams_status ON user_exams(status);
CREATE INDEX idx_user_exams_created_at ON user_exams(created_at);
CREATE INDEX idx_exam_questions_user_exam_id ON exam_questions(user_exam_id);
CREATE INDEX idx_exam_questions_ut_category ON exam_questions(ut_category);
CREATE INDEX idx_user_answers_user_exam_id ON user_answers(user_exam_id);
CREATE INDEX idx_user_answers_question_id ON user_answers(question_id);

-- Trigger para actualizar updated_at en user_exams
CREATE OR REPLACE FUNCTION update_user_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_exams_updated_at
    BEFORE UPDATE ON user_exams
    FOR EACH ROW
    EXECUTE FUNCTION update_user_exams_updated_at();

-- ====================================
-- Vistas para estadísticas
-- ====================================

-- Vista para estadísticas generales por usuario
CREATE VIEW user_exam_statistics AS
SELECT
    u.id as user_id,
    u.username,
    u.email,
    COUNT(ue.id) as total_exams_attempted,
    COUNT(CASE WHEN ue.status = 'completed' THEN 1 END) as total_exams_completed,
    COUNT(CASE WHEN ue.passed = true THEN 1 END) as total_exams_passed,
    COUNT(CASE WHEN ue.passed = false THEN 1 END) as total_exams_failed,
    COALESCE(AVG(CASE WHEN ue.status = 'completed' THEN ue.score_percentage END), 0) as average_score,
    COALESCE(MAX(ue.score_percentage), 0) as best_score,
    COALESCE(MIN(CASE WHEN ue.status = 'completed' THEN ue.score_percentage END), 0) as worst_score,
    COUNT(CASE WHEN ue.status = 'in_progress' THEN 1 END) as exams_in_progress
FROM users u
LEFT JOIN user_exams ue ON u.id = ue.user_id
GROUP BY u.id, u.username, u.email;

-- Vista para rendimiento por categoría UT
CREATE VIEW user_category_performance AS
SELECT
    u.id as user_id,
    u.username,
    eq.ut_category,
    eq.ut_number,
    COUNT(ua.id) as total_questions_answered,
    COUNT(CASE WHEN ua.is_correct = true THEN 1 END) as correct_answers,
    COUNT(CASE WHEN ua.is_correct = false THEN 1 END) as incorrect_answers,
    ROUND(
        CASE
            WHEN COUNT(ua.id) > 0 THEN
                (COUNT(CASE WHEN ua.is_correct = true THEN 1 END) * 100.0 / COUNT(ua.id))
            ELSE 0
        END, 2
    ) as success_percentage,
    AVG(ua.time_spent_seconds) as avg_time_per_question
FROM users u
LEFT JOIN user_exams ue ON u.id = ue.user_id
LEFT JOIN exam_questions eq ON ue.id = eq.user_exam_id
LEFT JOIN user_answers ua ON ue.id = ua.user_exam_id AND eq.question_id = ua.question_id
WHERE ue.status = 'completed' OR ue.status IS NULL
GROUP BY u.id, u.username, eq.ut_category, eq.ut_number;

-- Vista para preguntas más falladas por usuario
CREATE VIEW user_failed_questions AS
SELECT
    u.id as user_id,
    u.username,
    q.id as question_id,
    q.texto_pregunta,
    q.categoria,
    q.respuesta_correcta,
    COUNT(ua.id) as times_answered,
    COUNT(CASE WHEN ua.is_correct = false THEN 1 END) as times_failed,
    ROUND(
        (COUNT(CASE WHEN ua.is_correct = false THEN 1 END) * 100.0 / COUNT(ua.id)), 2
    ) as failure_rate
FROM users u
JOIN user_exams ue ON u.id = ue.user_id
JOIN user_answers ua ON ue.id = ua.user_exam_id
JOIN questions q ON ua.question_id = q.id
WHERE ue.status = 'completed'
GROUP BY u.id, u.username, q.id, q.texto_pregunta, q.categoria, q.respuesta_correcta
HAVING COUNT(CASE WHEN ua.is_correct = false THEN 1 END) > 0
ORDER BY failure_rate DESC;

-- ====================================
-- Configuración UT del PER
-- ====================================

-- Tabla de configuración de las Unidades Temáticas
CREATE TABLE ut_configuration (
    id SERIAL PRIMARY KEY,
    ut_number INTEGER NOT NULL UNIQUE CHECK (ut_number >= 1 AND ut_number <= 11),
    ut_name VARCHAR(100) NOT NULL,
    category_name VARCHAR(100) NOT NULL, -- Nombre en la tabla questions.categoria
    questions_per_exam INTEGER NOT NULL CHECK (questions_per_exam > 0),
    max_errors_allowed INTEGER, -- NULL significa sin límite específico
    is_critical BOOLEAN DEFAULT false, -- true para UT con límite de errores
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración de las UT del PER
INSERT INTO ut_configuration (ut_number, ut_name, category_name, questions_per_exam, max_errors_allowed, is_critical) VALUES
(1, 'Nomenclatura náutica', 'Nomenclatura náutica', 4, NULL, false),
(2, 'Elementos de amarre y fondeo', 'Elementos de amarre y fondeo', 2, NULL, false),
(3, 'Seguridad', 'Seguridad', 4, NULL, false),
(4, 'Legislación', 'Legislación', 2, NULL, false),
(5, 'Balizamiento', 'Balizamiento', 5, 2, true),
(6, 'Reglamento RIPA', 'Reglamento (RIPA)', 10, 5, true),
(7, 'Maniobra', 'Maniobra y navegación', 2, NULL, false),
(8, 'Emergencias en la mar', 'Emergencias en la mar', 3, NULL, false),
(9, 'Meteorología', 'Meteorología', 4, NULL, false),
(10, 'Teoría de la navegación', 'Teoría de la navegación', 5, NULL, false),
(11, 'Carta de navegación', 'Carta de navegación', 4, 2, true);

COMMENT ON TABLE user_exams IS 'Exámenes generados para usuarios específicos';
COMMENT ON TABLE exam_questions IS 'Preguntas asignadas a cada examen con su orden';
COMMENT ON TABLE user_answers IS 'Respuestas individuales de usuarios a preguntas específicas';
COMMENT ON TABLE ut_configuration IS 'Configuración de las Unidades Temáticas del PER';
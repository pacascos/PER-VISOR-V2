-- ====================================
-- Sistema de Estadísticas Detalladas de Preguntas
-- ====================================
-- Este esquema extiende el sistema existente con estadísticas detalladas
-- de cada pregunta individual: cuántas veces ha salido, aciertos, fallos,
-- tanto por usuario como en general.

-- Tabla de estadísticas globales por pregunta
-- Rastrea el rendimiento general de cada pregunta en todos los exámenes
CREATE TABLE IF NOT EXISTS question_global_stats (
    id SERIAL PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    total_appearances INTEGER DEFAULT 0, -- Total de veces que ha aparecido en exámenes
    total_correct_answers INTEGER DEFAULT 0, -- Total de respuestas correctas
    total_incorrect_answers INTEGER DEFAULT 0, -- Total de respuestas incorrectas
    total_unanswered INTEGER DEFAULT 0, -- Total de preguntas sin responder
    success_rate DECIMAL(5,2) DEFAULT 0.00, -- Porcentaje de éxito global
    difficulty_score DECIMAL(5,2) DEFAULT 0.00, -- Puntuación de dificultad (0-100, mayor = más difícil)
    avg_time_spent_seconds DECIMAL(8,2) DEFAULT 0.00, -- Tiempo promedio en responder
    first_appeared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Primera vez que apareció
    last_appeared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Última vez que apareció
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id)
);

-- Tabla de estadísticas por usuario y pregunta
-- Rastrea el rendimiento individual de cada usuario en cada pregunta
CREATE TABLE IF NOT EXISTS question_user_stats (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    total_attempts INTEGER DEFAULT 0, -- Total de intentos del usuario
    correct_attempts INTEGER DEFAULT 0, -- Intentos correctos del usuario
    incorrect_attempts INTEGER DEFAULT 0, -- Intentos incorrectos del usuario
    unanswered_attempts INTEGER DEFAULT 0, -- Intentos sin responder
    user_success_rate DECIMAL(5,2) DEFAULT 0.00, -- Porcentaje de éxito del usuario
    avg_time_spent_seconds DECIMAL(8,2) DEFAULT 0.00, -- Tiempo promedio del usuario
    first_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Primera vez que la intentó
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Última vez que la intentó
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- Tabla de estadísticas por categoría y pregunta
-- Rastrea el rendimiento de cada pregunta por categoría UT
CREATE TABLE IF NOT EXISTS question_category_stats (
    id SERIAL PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- Categoría UT (ej: "Nomenclatura náutica")
    total_appearances INTEGER DEFAULT 0, -- Apariciones en esta categoría
    total_correct_answers INTEGER DEFAULT 0, -- Respuestas correctas en esta categoría
    total_incorrect_answers INTEGER DEFAULT 0, -- Respuestas incorrectas en esta categoría
    category_success_rate DECIMAL(5,2) DEFAULT 0.00, -- Porcentaje de éxito en la categoría
    difficulty_rank INTEGER, -- Ranking de dificultad dentro de la categoría (1 = más difícil)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, category)
);

-- Tabla de intentos detallados de preguntas
-- Registro detallado de cada intento individual de pregunta
CREATE TABLE IF NOT EXISTS question_attempt_details (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE, -- Referencia al examen si aplica
    user_answer CHAR(1) CHECK (user_answer IN ('a', 'b', 'c', 'd') OR user_answer IS NULL),
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    category VARCHAR(50), -- Categoría UT
    attempt_order INTEGER, -- Orden en el examen
    session_type VARCHAR(20) DEFAULT 'exam' CHECK (session_type IN ('exam', 'practice', 'review')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de rankings de preguntas más falladas
-- Cache de rankings para optimizar consultas frecuentes
CREATE TABLE IF NOT EXISTS question_failure_rankings (
    id SERIAL PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    failure_count INTEGER DEFAULT 0, -- Número total de fallos
    failure_rate DECIMAL(5,2) DEFAULT 0.00, -- Porcentaje de fallos
    total_attempts INTEGER DEFAULT 0, -- Total de intentos
    difficulty_score DECIMAL(5,2) DEFAULT 0.00, -- Puntuación de dificultad
    ranking_position INTEGER, -- Posición en el ranking (1 = más fallada)
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, category)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_question_global_stats_question_id ON question_global_stats(question_id);
CREATE INDEX IF NOT EXISTS idx_question_global_stats_success_rate ON question_global_stats(success_rate);
CREATE INDEX IF NOT EXISTS idx_question_global_stats_difficulty ON question_global_stats(difficulty_score);

CREATE INDEX IF NOT EXISTS idx_question_user_stats_user_id ON question_user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_question_user_stats_question_id ON question_user_stats(question_id);
CREATE INDEX IF NOT EXISTS idx_question_user_stats_user_success_rate ON question_user_stats(user_success_rate);
CREATE INDEX IF NOT EXISTS idx_question_user_stats_user_question ON question_user_stats(user_id, question_id);

CREATE INDEX IF NOT EXISTS idx_question_category_stats_question_id ON question_category_stats(question_id);
CREATE INDEX IF NOT EXISTS idx_question_category_stats_category ON question_category_stats(category);
CREATE INDEX IF NOT EXISTS idx_question_category_stats_success_rate ON question_category_stats(category_success_rate);

CREATE INDEX IF NOT EXISTS idx_question_attempt_details_user_id ON question_attempt_details(user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempt_details_question_id ON question_attempt_details(question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempt_details_exam_id ON question_attempt_details(exam_id);
CREATE INDEX IF NOT EXISTS idx_question_attempt_details_category ON question_attempt_details(category);
CREATE INDEX IF NOT EXISTS idx_question_attempt_details_is_correct ON question_attempt_details(is_correct);
CREATE INDEX IF NOT EXISTS idx_question_attempt_details_created_at ON question_attempt_details(created_at);

CREATE INDEX IF NOT EXISTS idx_question_failure_rankings_category ON question_failure_rankings(category);
CREATE INDEX IF NOT EXISTS idx_question_failure_rankings_failure_rate ON question_failure_rankings(failure_rate);
CREATE INDEX IF NOT EXISTS idx_question_failure_rankings_ranking ON question_failure_rankings(category, ranking_position);

-- Triggers para actualizar timestamps
CREATE OR REPLACE FUNCTION update_question_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_global_stats_updated_at
    BEFORE UPDATE ON question_global_stats
    FOR EACH ROW EXECUTE FUNCTION update_question_stats_updated_at();

CREATE TRIGGER update_question_user_stats_updated_at
    BEFORE UPDATE ON question_user_stats
    FOR EACH ROW EXECUTE FUNCTION update_question_stats_updated_at();

CREATE TRIGGER update_question_category_stats_updated_at
    BEFORE UPDATE ON question_category_stats
    FOR EACH ROW EXECUTE FUNCTION update_question_stats_updated_at();

-- Vistas para consultas comunes

-- Vista de preguntas más falladas por categoría
CREATE OR REPLACE VIEW most_failed_questions_by_category AS
SELECT 
    q.id as question_id,
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
FROM questions q
JOIN question_global_stats qgs ON q.id = qgs.question_id
JOIN question_failure_rankings qfr ON q.id = qfr.question_id
WHERE qgs.total_appearances > 0
ORDER BY q.categoria, qfr.ranking_position;

-- Vista de rendimiento de preguntas por usuario
CREATE OR REPLACE VIEW user_question_performance AS
SELECT 
    u.id as user_id,
    u.username,
    q.id as question_id,
    q.texto_pregunta,
    q.categoria,
    qus.total_attempts,
    qus.correct_attempts,
    qus.incorrect_attempts,
    qus.user_success_rate,
    qus.avg_time_spent_seconds,
    qus.last_attempt_at
FROM users u
JOIN question_user_stats qus ON u.id = qus.user_id
JOIN questions q ON qus.question_id = q.id
WHERE qus.total_attempts > 0
ORDER BY u.username, qus.user_success_rate ASC;

-- Vista de estadísticas de categorías
CREATE OR REPLACE VIEW category_performance_summary AS
SELECT 
    qcs.category,
    COUNT(DISTINCT qcs.question_id) as total_questions,
    SUM(qcs.total_appearances) as total_appearances,
    SUM(qcs.total_correct_answers) as total_correct,
    SUM(qcs.total_incorrect_answers) as total_incorrect,
    ROUND(AVG(qcs.category_success_rate), 2) as avg_success_rate,
    ROUND(
        (SUM(qcs.total_correct_answers) * 100.0 / 
         NULLIF(SUM(qcs.total_appearances), 0)), 2
    ) as overall_success_rate
FROM question_category_stats qcs
GROUP BY qcs.category
ORDER BY overall_success_rate ASC;

-- Función para actualizar estadísticas globales de una pregunta
CREATE OR REPLACE FUNCTION update_question_global_stats(p_question_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Función para actualizar estadísticas de usuario para una pregunta
CREATE OR REPLACE FUNCTION update_question_user_stats(p_user_id UUID, p_question_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Función para actualizar rankings de preguntas más falladas
CREATE OR REPLACE FUNCTION update_failure_rankings()
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE question_global_stats IS 'Estadísticas globales de rendimiento de cada pregunta';
COMMENT ON TABLE question_user_stats IS 'Estadísticas de rendimiento de cada usuario en cada pregunta';
COMMENT ON TABLE question_category_stats IS 'Estadísticas de preguntas por categoría UT';
COMMENT ON TABLE question_attempt_details IS 'Registro detallado de cada intento de pregunta';
COMMENT ON TABLE question_failure_rankings IS 'Rankings de preguntas más falladas por categoría';

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE '✅ Esquema de Estadísticas de Preguntas Creado Exitosamente';
    RAISE NOTICE '📊 Tablas creadas: 5 tablas principales + 3 vistas';
    RAISE NOTICE '🎯 Funcionalidades: Estadísticas globales, por usuario, por categoría';
    RAISE NOTICE '📈 Rankings: Preguntas más falladas por categoría';
    RAISE NOTICE '⚡ Optimizado con índices y funciones de actualización automática';
END $$;

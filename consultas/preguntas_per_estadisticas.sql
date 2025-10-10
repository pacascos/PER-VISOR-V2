-- ====================================
-- Consulta: Todas las preguntas PER con estadísticas
-- ====================================
-- Columnas: ID, UT, Veces que ha salido, Veces fallada
-- Filtrado: Solo preguntas de PER (excluye Patrón de Yate)

SELECT 
    q.id AS pregunta_id,
    q.numero_pregunta,
    q.categoria AS ut_nombre,
    COALESCE(qgs.total_appearances, 0) AS veces_salido,
    COALESCE(qgs.total_incorrect_answers, 0) AS veces_fallada,
    COALESCE(qgs.total_correct_answers, 0) AS veces_acertada,
    COALESCE(qgs.success_rate, 0) AS porcentaje_acierto,
    COALESCE(qgs.difficulty_score, 0) AS dificultad,
    e.tipo_examen AS tipo,
    e.convocatoria
FROM questions q
INNER JOIN exams e ON q.exam_id = e.id
LEFT JOIN question_global_stats qgs ON q.id = qgs.question_id
WHERE e.tipo_examen IN ('PER_NORMAL', 'PER_LIBERADO')
ORDER BY 
    q.categoria,
    q.numero_pregunta;

-- ====================================
-- Variante: Solo preguntas que han aparecido en exámenes
-- ====================================

SELECT 
    q.id AS pregunta_id,
    q.numero_pregunta,
    q.categoria AS ut_nombre,
    qgs.total_appearances AS veces_salido,
    qgs.total_incorrect_answers AS veces_fallada,
    qgs.total_correct_answers AS veces_acertada,
    qgs.success_rate AS porcentaje_acierto,
    qgs.difficulty_score AS dificultad,
    e.tipo_examen AS tipo,
    e.convocatoria
FROM questions q
INNER JOIN exams e ON q.exam_id = e.id
INNER JOIN question_global_stats qgs ON q.id = qgs.question_id
WHERE e.tipo_examen IN ('PER_NORMAL', 'PER_LIBERADO')
  AND qgs.total_appearances > 0
ORDER BY 
    qgs.total_incorrect_answers DESC,
    qgs.total_appearances DESC;

-- ====================================
-- Variante: Con UT número (de exam_questions)
-- ====================================

SELECT DISTINCT
    q.id AS pregunta_id,
    q.numero_pregunta,
    eq.ut_number AS ut_numero,
    q.categoria AS ut_nombre,
    COALESCE(qgs.total_appearances, 0) AS veces_salido,
    COALESCE(qgs.total_incorrect_answers, 0) AS veces_fallada,
    COALESCE(qgs.total_correct_answers, 0) AS veces_acertada,
    ROUND(COALESCE(qgs.success_rate, 0), 2) AS porcentaje_acierto,
    ROUND(COALESCE(qgs.difficulty_score, 0), 2) AS dificultad
FROM questions q
INNER JOIN exams e ON q.exam_id = e.id
LEFT JOIN exam_questions eq ON q.id = eq.question_id
LEFT JOIN question_global_stats qgs ON q.id = qgs.question_id
WHERE e.tipo_examen IN ('PER_NORMAL', 'PER_LIBERADO')
ORDER BY 
    eq.ut_number,
    q.numero_pregunta;

-- ====================================
-- Variante: Resumen por UT
-- ====================================

SELECT 
    eq.ut_number AS ut_numero,
    q.categoria AS ut_nombre,
    COUNT(DISTINCT q.id) AS total_preguntas,
    SUM(COALESCE(qgs.total_appearances, 0)) AS total_apariciones,
    SUM(COALESCE(qgs.total_incorrect_answers, 0)) AS total_fallos,
    SUM(COALESCE(qgs.total_correct_answers, 0)) AS total_aciertos,
    ROUND(AVG(COALESCE(qgs.success_rate, 0)), 2) AS porcentaje_acierto_promedio
FROM questions q
INNER JOIN exams e ON q.exam_id = e.id
LEFT JOIN exam_questions eq ON q.id = eq.question_id
LEFT JOIN question_global_stats qgs ON q.id = qgs.question_id
WHERE e.tipo_examen IN ('PER_NORMAL', 'PER_LIBERADO')
GROUP BY eq.ut_number, q.categoria
ORDER BY eq.ut_number;

-- ====================================
-- Variante: Top 50 preguntas más falladas
-- ====================================

SELECT 
    q.id AS pregunta_id,
    q.numero_pregunta,
    q.texto_pregunta,
    q.categoria AS ut_nombre,
    qgs.total_appearances AS veces_salido,
    qgs.total_incorrect_answers AS veces_fallada,
    qgs.total_correct_answers AS veces_acertada,
    ROUND(qgs.success_rate, 2) AS porcentaje_acierto,
    ROUND(qgs.difficulty_score, 2) AS dificultad,
    ROUND((qgs.total_incorrect_answers::DECIMAL / NULLIF(qgs.total_appearances, 0) * 100), 2) AS tasa_fallo
FROM questions q
INNER JOIN exams e ON q.exam_id = e.id
INNER JOIN question_global_stats qgs ON q.id = qgs.question_id
WHERE e.tipo_examen IN ('PER_NORMAL', 'PER_LIBERADO')
  AND qgs.total_appearances > 0
ORDER BY 
    qgs.total_incorrect_answers DESC,
    tasa_fallo DESC
LIMIT 50;

-- ====================================
-- Variante: Exportar a CSV (copiar resultado)
-- ====================================

COPY (
    SELECT 
        q.id AS pregunta_id,
        q.numero_pregunta,
        q.categoria AS ut_nombre,
        COALESCE(qgs.total_appearances, 0) AS veces_salido,
        COALESCE(qgs.total_incorrect_answers, 0) AS veces_fallada,
        COALESCE(qgs.total_correct_answers, 0) AS veces_acertada,
        COALESCE(qgs.success_rate, 0) AS porcentaje_acierto
    FROM questions q
    INNER JOIN exams e ON q.exam_id = e.id
    LEFT JOIN question_global_stats qgs ON q.id = qgs.question_id
    WHERE e.tipo_examen IN ('PER_NORMAL', 'PER_LIBERADO')
    ORDER BY q.categoria, q.numero_pregunta
) TO '/tmp/preguntas_per_estadisticas.csv' WITH CSV HEADER;


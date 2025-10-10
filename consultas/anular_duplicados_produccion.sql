-- ====================================
-- Anular Preguntas Duplicadas - PRODUCCIÓN
-- ====================================
-- Sin confirmaciones interactivas
-- Ejecuta directamente la anulación

-- Crear tabla temporal con preguntas a anular
CREATE TEMP TABLE questions_to_nullify AS
WITH duplicates AS (
    SELECT 
        q.id,
        q.hash_pregunta,
        ROW_NUMBER() OVER (
            PARTITION BY q.hash_pregunta 
            ORDER BY 
                e.convocatoria DESC,  -- Más reciente primero
                CASE WHEN e.tipo_examen = 'PER_NORMAL' THEN 1 ELSE 2 END,
                q.id ASC
        ) as row_num
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
)
SELECT id, hash_pregunta
FROM duplicates
WHERE row_num > 1;

-- Anular las preguntas duplicadas
UPDATE questions 
SET anulada = true
WHERE id IN (SELECT id FROM questions_to_nullify);

-- Recuperar preguntas únicas perdidas
WITH lost_hashes AS (
    SELECT q.hash_pregunta
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    GROUP BY q.hash_pregunta
    HAVING COUNT(*) FILTER (WHERE q.anulada = false) = 0
),
first_instance AS (
    SELECT DISTINCT ON (q.hash_pregunta)
        q.id
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    JOIN lost_hashes lh ON q.hash_pregunta = lh.hash_pregunta
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    ORDER BY q.hash_pregunta, e.convocatoria DESC, q.id ASC
)
UPDATE questions
SET anulada = false
WHERE id IN (SELECT id FROM first_instance);

-- Mostrar resumen
SELECT 
    COUNT(*) FILTER (WHERE anulada = false) AS preguntas_activas,
    COUNT(*) FILTER (WHERE anulada = true) AS preguntas_anuladas,
    COUNT(DISTINCT CASE WHEN anulada = false THEN hash_pregunta END) AS preguntas_unicas_activas
FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO');

-- Limpiar
DROP TABLE questions_to_nullify;


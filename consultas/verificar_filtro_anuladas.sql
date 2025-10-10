-- ====================================
-- VERIFICACIÓN: Filtro de Preguntas Anuladas
-- ====================================
-- Este script verifica que las preguntas anuladas NO se están seleccionando

\echo '================================================'
\echo 'VERIFICACIÓN: Filtro de Preguntas Anuladas'
\echo '================================================'
\echo ''

\echo '1. Estado actual de preguntas'
\echo '------------------------------'

SELECT 
    COUNT(*) FILTER (WHERE anulada = false) AS "Preguntas activas (usables)",
    COUNT(*) FILTER (WHERE anulada = true) AS "Preguntas anuladas (no usables)",
    COUNT(*) AS "Total preguntas",
    ROUND(COUNT(*) FILTER (WHERE anulada = false)::DECIMAL / COUNT(*) * 100, 2) AS "% Activas"
FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO');

\echo ''
\echo '2. Simulando generación de examen (como el API)'
\echo '------------------------------------------------'

-- Simular la consulta exacta que usa el API para generar exámenes
DO $$
DECLARE
    ut_rec RECORD;
    total_selected INT := 0;
    anuladas_selected INT := 0;
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS verification_exam (
        question_id UUID,
        categoria VARCHAR(50),
        anulada BOOLEAN
    );
    
    -- Para cada UT
    FOR ut_rec IN 
        SELECT ut_number, category_name, questions_per_exam 
        FROM ut_configuration 
        ORDER BY ut_number
    LOOP
        -- CONSULTA EXACTA DEL API (línea 1979-1987 de api_postgresql.py)
        INSERT INTO verification_exam (question_id, categoria, anulada)
        SELECT q.id, q.categoria, q.anulada
        FROM questions q
        JOIN exams e ON q.exam_id = e.id
        WHERE q.categoria = ut_rec.category_name
        AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
        AND q.anulada = false  -- ✅ FILTRO CRÍTICO
        ORDER BY RANDOM()
        LIMIT ut_rec.questions_per_exam;
    END LOOP;
END $$;

\echo ''
\echo 'Resultado de la simulación:'

SELECT 
    COUNT(*) AS "Total preguntas seleccionadas",
    COUNT(*) FILTER (WHERE anulada = false) AS "Preguntas activas",
    COUNT(*) FILTER (WHERE anulada = true) AS "⚠️ Preguntas anuladas",
    CASE 
        WHEN COUNT(*) FILTER (WHERE anulada = true) = 0 
        THEN '✅ PERFECTO: Ninguna anulada seleccionada'
        ELSE '❌ ERROR: Se seleccionaron anuladas'
    END AS "Estado"
FROM verification_exam;

\echo ''
\echo '3. Verificación por UT'
\echo '---------------------'

SELECT 
    categoria AS "UT",
    COUNT(*) AS "Seleccionadas",
    COUNT(*) FILTER (WHERE anulada = false) AS "Activas",
    COUNT(*) FILTER (WHERE anulada = true) AS "❌ Anuladas"
FROM verification_exam
GROUP BY categoria
ORDER BY categoria;

\echo ''
\echo '4. Simulando Test de Estudio (consulta RANDOM)'
\echo '-----------------------------------------------'

-- Simular consulta de study_mode_logic.py (líneas 88-103)
CREATE TEMP TABLE IF NOT EXISTS verification_study AS
WITH unique_questions AS (
    SELECT DISTINCT ON (q.hash_pregunta)
        q.id, q.hash_pregunta, q.anulada
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE q.categoria = 'Nomenclatura náutica'
    AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false  -- ✅ FILTRO CRÍTICO
    ORDER BY q.hash_pregunta, q.id
)
SELECT id, hash_pregunta, anulada
FROM unique_questions
ORDER BY RANDOM()
LIMIT 4;

SELECT 
    COUNT(*) AS "Preguntas seleccionadas",
    COUNT(*) FILTER (WHERE anulada = false) AS "Activas",
    COUNT(*) FILTER (WHERE anulada = true) AS "⚠️ Anuladas",
    CASE 
        WHEN COUNT(*) FILTER (WHERE anulada = true) = 0 
        THEN '✅ OK: Ninguna anulada'
        ELSE '❌ ERROR: Se seleccionaron anuladas'
    END AS "Estado"
FROM verification_study;

\echo ''
\echo '5. Verificar que preguntas anuladas tienen hash duplicado'
\echo '---------------------------------------------------------'

WITH anuladas_info AS (
    SELECT 
        q.id,
        q.hash_pregunta,
        q.categoria,
        LEFT(q.texto_pregunta, 60) as texto,
        e.convocatoria,
        -- Contar cuántas instancias activas hay del mismo hash
        (
            SELECT COUNT(*)
            FROM questions q2
            JOIN exams e2 ON q2.exam_id = e2.id
            WHERE q2.hash_pregunta = q.hash_pregunta
            AND q2.anulada = false
            AND (e2.tipo_examen = 'PER_NORMAL' OR e2.tipo_examen = 'PER_LIBERADO')
        ) as activas_mismo_hash
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE q.anulada = true
    AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    LIMIT 10
)
SELECT 
    CASE 
        WHEN activas_mismo_hash > 0 THEN '✅'
        ELSE '⚠️'
    END AS "OK",
    convocatoria AS "Convocatoria",
    categoria AS "UT",
    activas_mismo_hash AS "Activas del mismo hash",
    texto || '...' AS "Pregunta (anulada)"
FROM anuladas_info;

\echo ''
\echo '6. Test final: ¿Hay alguna pregunta con hash único anulada?'
\echo '-----------------------------------------------------------'

WITH hash_counts AS (
    SELECT 
        q.hash_pregunta,
        COUNT(*) FILTER (WHERE q.anulada = false) as activas,
        COUNT(*) FILTER (WHERE q.anulada = true) as anuladas
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    GROUP BY q.hash_pregunta
    HAVING COUNT(*) FILTER (WHERE q.anulada = false) = 0
)
SELECT 
    COUNT(*) AS "Preguntas únicas completamente anuladas",
    CASE 
        WHEN COUNT(*) = 0 
        THEN '✅ PERFECTO: Todas las preguntas únicas tienen al menos 1 instancia activa'
        ELSE '⚠️ ADVERTENCIA: Hay preguntas únicas totalmente anuladas (se perdieron)'
    END AS "Estado"
FROM hash_counts;

\echo ''
\echo '================================================'
\echo 'RESUMEN FINAL'
\echo '================================================'

WITH summary AS (
    SELECT 
        -- Verificación 1: Examen simulado
        (SELECT COUNT(*) FILTER (WHERE anulada = true) FROM verification_exam) as exam_anuladas,
        -- Verificación 2: Test simulado
        (SELECT COUNT(*) FILTER (WHERE anulada = true) FROM verification_study) as study_anuladas,
        -- Verificación 3: Preguntas únicas perdidas
        (
            SELECT COUNT(*)
            FROM (
                SELECT q.hash_pregunta
                FROM questions q
                JOIN exams e ON q.exam_id = e.id
                WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
                GROUP BY q.hash_pregunta
                HAVING COUNT(*) FILTER (WHERE q.anulada = false) = 0
            ) sub
        ) as preguntas_perdidas
)
SELECT 
    CASE 
        WHEN exam_anuladas = 0 AND study_anuladas = 0 AND preguntas_perdidas = 0
        THEN '✅ PERFECTO'
        ELSE '⚠️ HAY PROBLEMAS'
    END AS "Estado General",
    exam_anuladas AS "Anuladas en examen simulado",
    study_anuladas AS "Anuladas en test simulado",
    preguntas_perdidas AS "Preguntas únicas perdidas"
FROM summary;

\echo ''
\echo '✅ Verificación completada'
\echo ''

-- Limpiar tablas temporales
DROP TABLE IF EXISTS verification_exam;
DROP TABLE IF EXISTS verification_study;


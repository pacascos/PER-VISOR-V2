-- ====================================
-- TEST DE ALEATORIEDAD EN GENERACIÓN DE EXÁMENES
-- ====================================
-- Este script simula la generación de múltiples exámenes
-- para verificar si realmente se están usando todas las preguntas disponibles

\echo '================================================'
\echo 'TEST DE ALEATORIEDAD EN GENERACIÓN DE EXÁMENES'
\echo '================================================'
\echo ''

-- Tabla temporal para almacenar las preguntas seleccionadas
CREATE TEMP TABLE test_exam_questions (
    simulation_number INT,
    question_id UUID,
    ut_category VARCHAR(50),
    question_number INT,
    exam_convocatoria VARCHAR(50)
);

\echo '1. Simulando generación de 20 exámenes...'
\echo ''

-- Simular 20 exámenes
DO $$
DECLARE
    sim_num INT;
    ut_rec RECORD;
BEGIN
    FOR sim_num IN 1..20 LOOP
        -- Para cada UT
        FOR ut_rec IN 
            SELECT ut_number, category_name, questions_per_exam 
            FROM ut_configuration 
            ORDER BY ut_number
        LOOP
            -- Seleccionar preguntas aleatorias (MISMA CONSULTA QUE EL API)
            INSERT INTO test_exam_questions (simulation_number, question_id, ut_category, question_number, exam_convocatoria)
            SELECT 
                sim_num,
                q.id,
                ut_rec.category_name,
                q.numero_pregunta,
                e.convocatoria
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE q.categoria = ut_rec.category_name
            AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
            AND q.anulada = false
            ORDER BY RANDOM()
            LIMIT ut_rec.questions_per_exam;
        END LOOP;
    END LOOP;
END $$;

\echo '✅ 20 exámenes simulados generados'
\echo ''
\echo '================================================'
\echo '2. ANÁLISIS DE DIVERSIDAD POR UT'
\echo '================================================'
\echo ''

SELECT 
    ut_category AS "UT",
    COUNT(*) AS "Total Selecciones",
    COUNT(DISTINCT question_id) AS "Preguntas Únicas",
    ROUND(COUNT(DISTINCT question_id)::DECIMAL / COUNT(*) * 100, 2) AS "% Diversidad"
FROM test_exam_questions
GROUP BY ut_category
ORDER BY ut_category;

\echo ''
\echo '================================================'
\echo '3. ¿SE ESTÁN USANDO TODAS LAS PREGUNTAS DISPONIBLES?'
\echo '================================================'
\echo ''

WITH preguntas_disponibles AS (
    SELECT DISTINCT 
        q.id,
        q.categoria,
        q.numero_pregunta,
        e.convocatoria
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
),
preguntas_usadas AS (
    SELECT DISTINCT question_id
    FROM test_exam_questions
),
stats_por_ut AS (
    SELECT 
        pd.categoria AS ut_nombre,
        COUNT(*) AS total_disponibles,
        COUNT(pu.question_id) AS usadas_en_simulacion,
        COUNT(*) - COUNT(pu.question_id) AS nunca_usadas,
        ROUND(COUNT(pu.question_id)::DECIMAL / COUNT(*) * 100, 2) AS porcentaje_uso
    FROM preguntas_disponibles pd
    LEFT JOIN preguntas_usadas pu ON pd.id = pu.question_id
    GROUP BY pd.categoria
)
SELECT 
    ut_nombre AS "UT",
    total_disponibles AS "Disponibles",
    usadas_en_simulacion AS "Usadas",
    nunca_usadas AS "Nunca Usadas",
    porcentaje_uso AS "% Uso"
FROM stats_por_ut
ORDER BY nunca_usadas DESC;

\echo ''
\echo '================================================'
\echo '4. DISTRIBUCIÓN POR CONVOCATORIA'
\echo '================================================'
\echo ''

SELECT 
    e.convocatoria AS "Convocatoria",
    e.tipo_examen AS "Tipo",
    COUNT(DISTINCT teq.question_id) AS "Usadas",
    COUNT(DISTINCT q.id) AS "Disponibles",
    ROUND(COUNT(DISTINCT teq.question_id)::DECIMAL / COUNT(DISTINCT q.id) * 100, 2) AS "% Uso"
FROM questions q
JOIN exams e ON q.exam_id = e.id
LEFT JOIN test_exam_questions teq ON q.id = teq.question_id
WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
AND q.anulada = false
GROUP BY e.convocatoria, e.tipo_examen
ORDER BY "Usadas" DESC;

\echo ''
\echo '================================================'
\echo '5. ¿HAY SESGO POR NÚMERO DE PREGUNTA?'
\echo '================================================'
\echo ''

SELECT 
    CASE 
        WHEN q.numero_pregunta <= 10 THEN '01-10'
        WHEN q.numero_pregunta <= 20 THEN '11-20'
        WHEN q.numero_pregunta <= 30 THEN '21-30'
        WHEN q.numero_pregunta <= 40 THEN '31-40'
        ELSE '41-45'
    END AS "Rango",
    COUNT(DISTINCT teq.question_id) AS "Usadas",
    COUNT(DISTINCT q.id) AS "Disponibles",
    ROUND(COUNT(DISTINCT teq.question_id)::DECIMAL / COUNT(DISTINCT q.id) * 100, 2) AS "% Uso"
FROM questions q
JOIN exams e ON q.exam_id = e.id
LEFT JOIN test_exam_questions teq ON q.id = teq.question_id
WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
AND q.anulada = false
GROUP BY "Rango"
ORDER BY "Rango";

\echo ''
\echo '================================================'
\echo '6. PREGUNTAS MÁS Y MENOS SELECCIONADAS'
\echo '================================================'
\echo ''

\echo 'Top 10 preguntas MÁS seleccionadas:'
\echo '------------------------------------'

SELECT 
    ut_category AS "UT",
    COUNT(*) AS "Veces",
    LEFT(q.texto_pregunta, 70) || '...' AS "Pregunta"
FROM test_exam_questions teq
JOIN questions q ON teq.question_id = q.id
GROUP BY question_id, ut_category, q.texto_pregunta
ORDER BY "Veces" DESC, ut_category
LIMIT 10;

\echo ''
\echo 'Muestra de preguntas NUNCA seleccionadas:'
\echo '-------------------------------------------'

WITH preguntas_nunca_usadas AS (
    SELECT 
        q.id,
        q.categoria,
        q.numero_pregunta,
        e.convocatoria,
        LEFT(q.texto_pregunta, 70) AS pregunta_preview
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    LEFT JOIN test_exam_questions teq ON q.id = teq.question_id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
    AND teq.question_id IS NULL
)
SELECT 
    categoria AS "UT",
    numero_pregunta AS "Nº",
    convocatoria AS "Convocatoria",
    pregunta_preview || '...' AS "Pregunta"
FROM preguntas_nunca_usadas
ORDER BY RANDOM()
LIMIT 15;

\echo ''
\echo '================================================'
\echo '7. RESUMEN FINAL'
\echo '================================================'
\echo ''

SELECT 
    COUNT(DISTINCT teq.question_id) AS "Total preguntas únicas usadas",
    COUNT(DISTINCT q.id) AS "Total preguntas disponibles",
    ROUND(COUNT(DISTINCT teq.question_id)::DECIMAL / COUNT(DISTINCT q.id) * 100, 2) AS "% Cobertura global",
    20 * 45 AS "Total selecciones (20 exámenes x 45 preguntas)"
FROM questions q
JOIN exams e ON q.exam_id = e.id
LEFT JOIN test_exam_questions teq ON q.id = teq.question_id
WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
AND q.anulada = false;

\echo ''
\echo '================================================'
\echo 'CONCLUSIÓN'
\echo '================================================'
\echo ''
\echo 'Si el % de cobertura es bajo (<30%), significa que:'
\echo '  🔴 Solo se está usando un subconjunto pequeño de preguntas'
\echo '  🔴 Hay sesgo en la selección aleatoria'
\echo ''
\echo 'Si el % de cobertura es alto (>60%), significa que:'
\echo '  ✅ La aleatoriedad funciona correctamente'
\echo '  ✅ Se están usando muchas preguntas diferentes'
\echo ''

-- Limpiar tabla temporal
DROP TABLE IF EXISTS test_exam_questions;


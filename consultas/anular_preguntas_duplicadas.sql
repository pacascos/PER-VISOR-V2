-- ====================================
-- SCRIPT: Anular Preguntas Duplicadas
-- ====================================
-- Este script marca como anuladas las preguntas duplicadas,
-- dejando solo UNA instancia activa de cada pregunta única (por hash)
--
-- CRITERIO DE SELECCIÓN:
-- - Se mantiene activa la pregunta de la convocatoria MÁS RECIENTE
-- - Si hay empate, se mantiene la de tipo PER_NORMAL sobre PER_LIBERADO
-- - Si sigue habiendo empate, se mantiene la que tenga ID menor

\echo '================================================'
\echo 'SCRIPT: ANULAR PREGUNTAS DUPLICADAS'
\echo '================================================'
\echo ''
\echo '⚠️  Este script modificará la base de datos'
\echo '⚠️  Se recomienda hacer un backup antes de ejecutar'
\echo ''

-- Paso 1: Análisis previo (cuántas se van a anular)
\echo '1. ANÁLISIS PREVIO'
\echo '------------------'

WITH duplicates AS (
    SELECT 
        q.hash_pregunta,
        COUNT(*) as num_duplicados
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
    GROUP BY q.hash_pregunta
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(DISTINCT hash_pregunta) AS "Preguntas con duplicados",
    SUM(num_duplicados) AS "Total instancias",
    SUM(num_duplicados) - COUNT(DISTINCT hash_pregunta) AS "Se anularán",
    COUNT(DISTINCT hash_pregunta) AS "Se mantendrán activas"
FROM duplicates;

\echo ''
\echo '2. DESGLOSE POR UT'
\echo '------------------'

WITH duplicates AS (
    SELECT 
        q.id,
        q.hash_pregunta,
        q.categoria,
        q.anulada,
        e.convocatoria,
        e.tipo_examen,
        ROW_NUMBER() OVER (
            PARTITION BY q.hash_pregunta 
            ORDER BY 
                e.convocatoria DESC,  -- Más reciente primero
                CASE WHEN e.tipo_examen = 'PER_NORMAL' THEN 1 ELSE 2 END,  -- PER_NORMAL > PER_LIBERADO
                q.id ASC  -- ID menor en caso de empate
        ) as row_num
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
),
to_nullify AS (
    SELECT 
        categoria,
        COUNT(*) as total_a_anular
    FROM duplicates
    WHERE row_num > 1
    GROUP BY categoria
)
SELECT 
    categoria AS "UT",
    total_a_anular AS "Preguntas a anular"
FROM to_nullify
ORDER BY total_a_anular DESC;

\echo ''
\echo '3. EJEMPLOS DE PREGUNTAS QUE SE ANULARÁN'
\echo '----------------------------------------'

WITH duplicates AS (
    SELECT 
        q.id,
        q.hash_pregunta,
        q.categoria,
        q.numero_pregunta,
        LEFT(q.texto_pregunta, 70) as texto,
        e.convocatoria,
        e.tipo_examen,
        q.anulada,
        ROW_NUMBER() OVER (
            PARTITION BY q.hash_pregunta 
            ORDER BY 
                e.convocatoria DESC,
                CASE WHEN e.tipo_examen = 'PER_NORMAL' THEN 1 ELSE 2 END,
                q.id ASC
        ) as row_num
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
)
SELECT 
    hash_pregunta AS "Hash",
    row_num AS "Orden",
    CASE WHEN row_num = 1 THEN '✅ Mantener' ELSE '❌ Anular' END AS "Acción",
    categoria AS "UT",
    convocatoria AS "Convocatoria",
    tipo_examen AS "Tipo",
    texto || '...' AS "Pregunta"
FROM duplicates
WHERE hash_pregunta IN (
    SELECT hash_pregunta 
    FROM duplicates 
    GROUP BY hash_pregunta 
    HAVING COUNT(*) > 1 
    LIMIT 5
)
ORDER BY hash_pregunta, row_num;

\echo ''
\echo '================================================'
\echo '¿Continuar con la anulación? (Ctrl+C para cancelar)'
\echo '================================================'
\echo ''
\echo 'Presiona Enter para continuar...'
\prompt 'Confirmación' confirm

-- Paso 4: Ejecutar la anulación
\echo ''
\echo '4. EJECUTANDO ANULACIÓN...'
\echo '--------------------------'

-- Crear tabla temporal con las preguntas a anular
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
WHERE row_num > 1;  -- Solo los duplicados (no el primero)

\echo 'Tabla temporal creada con preguntas a anular'

-- Actualizar el campo anulada
UPDATE questions 
SET anulada = true
WHERE id IN (SELECT id FROM questions_to_nullify);

\echo ''
\echo '✅ Anulación completada!'
\echo ''

-- Paso 5: Verificación post-anulación
\echo '5. VERIFICACIÓN POST-ANULACIÓN'
\echo '------------------------------'

\echo 'Estado actual de preguntas:'

SELECT 
    COUNT(*) FILTER (WHERE anulada = false) AS "Preguntas activas",
    COUNT(*) FILTER (WHERE anulada = true) AS "Preguntas anuladas",
    COUNT(*) AS "Total preguntas"
FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO');

\echo ''
\echo 'Verificación de duplicados restantes:'

WITH remaining_duplicates AS (
    SELECT 
        q.hash_pregunta,
        COUNT(*) as num_activas
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
    GROUP BY q.hash_pregunta
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) AS "Preguntas con duplicados activos restantes"
FROM remaining_duplicates;

\echo ''
\echo '================================================'
\echo 'RESUMEN FINAL'
\echo '================================================'

WITH stats AS (
    SELECT 
        COUNT(DISTINCT CASE WHEN anulada = false THEN hash_pregunta END) as preguntas_unicas_activas,
        COUNT(*) FILTER (WHERE anulada = false) as total_activas,
        COUNT(*) FILTER (WHERE anulada = true) as total_anuladas
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
)
SELECT 
    preguntas_unicas_activas AS "✅ Preguntas únicas activas",
    total_activas AS "Total preguntas activas",
    total_anuladas AS "Total preguntas anuladas",
    CASE 
        WHEN preguntas_unicas_activas = total_activas 
        THEN '✅ PERFECTO: Sin duplicados activos'
        ELSE '⚠️ Revisar: Aún hay duplicados'
    END AS "Estado"
FROM stats;

\echo ''
\echo '✅ Proceso completado exitosamente'
\echo ''
\echo 'IMPORTANTE:'
\echo '- Las preguntas anuladas NO aparecerán en nuevos exámenes'
\echo '- Los exámenes ya realizados NO se verán afectados'
\echo '- Se mantiene una instancia activa por cada pregunta única'
\echo ''

-- Limpiar tabla temporal
DROP TABLE IF EXISTS questions_to_nullify;


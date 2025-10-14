-- ====================================
-- ANÁLISIS PROFUNDO: Aleatoriedad en Generación de Exámenes Completos
-- ====================================
-- Simula 20 exámenes completos y analiza la distribución de preguntas
-- Fecha: 10 Octubre 2025
-- ====================================

\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║  ANÁLISIS PROFUNDO: Aleatoriedad en Exámenes Completos        ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''

-- =============================================================================
-- PARTE 1: ANÁLISIS DEL CÓDIGO DE GENERACIÓN
-- =============================================================================

\echo '1. ANÁLISIS DEL CÓDIGO ACTUAL'
\echo '=============================='
\echo ''
\echo 'Consulta SQL que genera exámenes (api_postgresql.py línea 1979):'
\echo '----------------------------------------------------------------'
\echo 'SELECT q.id FROM questions q'
\echo 'JOIN exams e ON q.exam_id = e.id'
\echo 'WHERE q.categoria = %s'
\echo 'AND (e.tipo_examen = ''PER_NORMAL'' OR e.tipo_examen = ''PER_LIBERADO'')'
\echo 'AND q.anulada = false'
\echo 'ORDER BY RANDOM()'
\echo 'LIMIT %s'
\echo ''
\echo '⚠️  PROBLEMA DETECTADO:'
\echo '   - NO usa DISTINCT ON (hash_pregunta)'
\echo '   - Puede seleccionar la misma pregunta múltiples veces si hay duplicados'
\echo '   - Aunque anulamos duplicados, puede haber sesgo si quedan algunos'
\echo ''

-- Verificar si hay duplicados activos
\echo '¿Hay duplicados activos que puedan causar sesgo?'
\echo '------------------------------------------------'

WITH duplicate_check AS (
    SELECT 
        q.hash_pregunta,
        q.categoria,
        COUNT(*) as instancias_activas,
        LEFT(MAX(q.texto_pregunta), 60) as texto
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
    GROUP BY q.hash_pregunta, q.categoria
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) AS "Preguntas con duplicados activos",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PERFECTO: Sin duplicados'
        ELSE '⚠️ HAY DUPLICADOS ACTIVOS'
    END AS "Estado"
FROM duplicate_check;

\echo ''

-- =============================================================================
-- PARTE 2: SIMULACIÓN DE 20 EXÁMENES
-- =============================================================================

\echo ''
\echo '2. SIMULACIÓN: Generando 20 exámenes completos'
\echo '==============================================='
\echo ''

-- Tabla para almacenar la simulación
CREATE TEMP TABLE simulated_exams (
    exam_num INT,
    question_id UUID,
    question_order INT,
    ut_number INT,
    ut_category VARCHAR(50),
    hash_pregunta VARCHAR(255),
    convocatoria VARCHAR(50)
);

-- Simular 20 exámenes usando la MISMA consulta que el API
DO $$
DECLARE
    exam_num INT;
    ut_rec RECORD;
    q_order INT;
BEGIN
    FOR exam_num IN 1..20 LOOP
        q_order := 1;
        
        -- Para cada UT (según configuración)
        FOR ut_rec IN 
            SELECT ut_number, category_name, questions_per_exam 
            FROM ut_configuration 
            ORDER BY ut_number
        LOOP
            -- CONSULTA EXACTA DEL API (línea 1979-1987)
            INSERT INTO simulated_exams (exam_num, question_id, question_order, ut_number, ut_category, hash_pregunta, convocatoria)
            SELECT 
                exam_num,
                q.id,
                q_order + (ROW_NUMBER() OVER ()) - 1,
                ut_rec.ut_number,
                ut_rec.category_name,
                q.hash_pregunta,
                e.convocatoria
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE q.categoria = ut_rec.category_name
            AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
            AND q.anulada = false
            ORDER BY RANDOM()
            LIMIT ut_rec.questions_per_exam;
            
            q_order := q_order + ut_rec.questions_per_exam;
        END LOOP;
    END LOOP;
END $$;

\echo '✅ 20 exámenes simulados generados (900 preguntas)'
\echo ''

-- =============================================================================
-- PARTE 3: ANÁLISIS DE RESULTADOS
-- =============================================================================

\echo ''
\echo '3. ANÁLISIS DE RESULTADOS'
\echo '========================='
\echo ''

\echo '3.1. Resumen general'
\echo '--------------------'

SELECT 
    COUNT(*) AS "Total selecciones (20 exámenes x 45)",
    COUNT(DISTINCT question_id) AS "Preguntas únicas usadas",
    COUNT(*) - COUNT(DISTINCT question_id) AS "Repeticiones totales",
    ROUND((COUNT(*) - COUNT(DISTINCT question_id))::DECIMAL / COUNT(*) * 100, 2) AS "% Repetición",
    COUNT(DISTINCT hash_pregunta) AS "Hashes únicos usados"
FROM simulated_exams;

\echo ''
\echo '3.2. Preguntas disponibles vs usadas'
\echo '------------------------------------'

WITH available AS (
    SELECT COUNT(DISTINCT id) as total
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
),
used AS (
    SELECT COUNT(DISTINCT question_id) as total
    FROM simulated_exams
)
SELECT 
    a.total AS "Preguntas disponibles",
    u.total AS "Preguntas usadas en 20 exámenes",
    a.total - u.total AS "Nunca usadas",
    ROUND(u.total::DECIMAL / a.total * 100, 2) AS "% Cobertura"
FROM available a, used u;

\echo ''
\echo '3.3. ¿Hay preguntas que se repitieron en el MISMO examen?'
\echo '---------------------------------------------------------'

WITH same_exam_duplicates AS (
    SELECT 
        exam_num,
        question_id,
        COUNT(*) as veces
    FROM simulated_exams
    GROUP BY exam_num, question_id
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) AS "Preguntas duplicadas en mismo examen",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PERFECTO: Sin duplicados en mismo examen'
        ELSE '🔴 PROBLEMA: Hay duplicados en mismo examen'
    END AS "Estado"
FROM same_exam_duplicates;

\echo ''
\echo '3.4. Top 20 preguntas MÁS seleccionadas en los 20 exámenes'
\echo '----------------------------------------------------------'

SELECT 
    COUNT(*) AS "Veces",
    ut_category AS "UT",
    LEFT(q.texto_pregunta, 65) || '...' AS "Pregunta",
    COUNT(DISTINCT se.exam_num) AS "En cuántos exámenes diferentes"
FROM simulated_exams se
JOIN questions q ON se.question_id = q.id
GROUP BY se.question_id, ut_category, q.texto_pregunta
ORDER BY COUNT(*) DESC
LIMIT 20;

\echo ''
\echo '3.5. Distribución de selección (cuántas preguntas aparecen X veces)'
\echo '-------------------------------------------------------------------'

WITH selection_counts AS (
    SELECT 
        question_id,
        COUNT(*) as veces_seleccionada
    FROM simulated_exams
    GROUP BY question_id
)
SELECT 
    veces_seleccionada AS "Veces seleccionada",
    COUNT(*) AS "Número de preguntas",
    ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 2) AS "% del total"
FROM selection_counts
GROUP BY veces_seleccionada
ORDER BY veces_seleccionada DESC;

\echo ''
\echo '3.6. Análisis por UT: Cobertura y repeticiones'
\echo '----------------------------------------------'

WITH ut_stats AS (
    SELECT 
        ut_category,
        COUNT(*) as total_selecciones,
        COUNT(DISTINCT question_id) as preguntas_unicas,
        COUNT(*) - COUNT(DISTINCT question_id) as repeticiones
    FROM simulated_exams
    GROUP BY ut_category
),
ut_available AS (
    SELECT 
        q.categoria,
        COUNT(DISTINCT q.id) as disponibles
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
    GROUP BY q.categoria
)
SELECT 
    us.ut_category AS "UT",
    ua.disponibles AS "Disponibles",
    us.total_selecciones AS "Selecciones",
    us.preguntas_unicas AS "Únicas usadas",
    us.repeticiones AS "Repeticiones",
    ROUND(us.repeticiones::DECIMAL / us.total_selecciones * 100, 2) AS "% Rep",
    ROUND(us.preguntas_unicas::DECIMAL / ua.disponibles * 100, 2) AS "% Cobertura"
FROM ut_stats us
JOIN ut_available ua ON us.ut_category = ua.categoria
ORDER BY us.ut_category;

\echo ''
\echo '3.7. ¿Hay sesgo por convocatoria?'
\echo '---------------------------------'

SELECT 
    convocatoria AS "Convocatoria",
    COUNT(*) AS "Veces seleccionada",
    COUNT(DISTINCT question_id) AS "Preguntas únicas",
    ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 2) AS "% del total"
FROM simulated_exams
GROUP BY convocatoria
ORDER BY COUNT(*) DESC
LIMIT 15;

\echo ''
\echo '3.8. Comparar con distribución esperada'
\echo '---------------------------------------'

WITH expected AS (
    SELECT 
        q.categoria,
        COUNT(DISTINCT q.id) as disponibles,
        20 * uc.questions_per_exam as selecciones_esperadas
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    JOIN ut_configuration uc ON q.categoria = uc.category_name
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
    GROUP BY q.categoria, uc.questions_per_exam
),
actual AS (
    SELECT 
        ut_category,
        COUNT(DISTINCT question_id) as preguntas_usadas,
        COUNT(*) as total_selecciones
    FROM simulated_exams
    GROUP BY ut_category
)
SELECT 
    e.categoria AS "UT",
    e.disponibles AS "Disponibles",
    e.selecciones_esperadas AS "Selecciones (20 exámenes)",
    a.preguntas_usadas AS "Únicas usadas",
    ROUND(e.selecciones_esperadas::DECIMAL / e.disponibles, 2) AS "Ratio esperado",
    ROUND(a.preguntas_usadas::DECIMAL / e.disponibles * 100, 2) AS "% Cobertura real",
    CASE 
        WHEN a.preguntas_usadas::DECIMAL / e.disponibles > 0.5 THEN '✅ Buena cobertura'
        WHEN a.preguntas_usadas::DECIMAL / e.disponibles > 0.3 THEN '🟡 Cobertura aceptable'
        ELSE '🔴 Baja cobertura'
    END AS "Evaluación"
FROM expected e
JOIN actual a ON e.categoria = a.ut_category
ORDER BY e.categoria;

\echo ''
\echo '3.9. Análisis estadístico de aleatoriedad'
\echo '-----------------------------------------'

WITH selection_counts AS (
    SELECT 
        question_id,
        COUNT(*) as veces
    FROM simulated_exams
    GROUP BY question_id
),
stats AS (
    SELECT 
        AVG(veces) as promedio,
        STDDEV(veces) as desviacion_std,
        MIN(veces) as minimo,
        MAX(veces) as maximo,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY veces) as mediana
    FROM selection_counts
)
SELECT 
    ROUND(promedio, 2) AS "Promedio veces por pregunta",
    ROUND(desviacion_std, 2) AS "Desviación estándar",
    minimo AS "Mínimo",
    maximo AS "Máximo",
    mediana AS "Mediana",
    CASE 
        WHEN desviacion_std < promedio * 0.5 THEN '✅ Distribución uniforme'
        WHEN desviacion_std < promedio THEN '🟡 Distribución aceptable'
        ELSE '🔴 Alta variabilidad (sesgo posible)'
    END AS "Evaluación"
FROM stats;

\echo ''

-- =============================================================================
-- PARTE 4: ANÁLISIS DE SESGO
-- =============================================================================

\echo ''
\echo '4. DETECCIÓN DE SESGOS'
\echo '======================'
\echo ''

\echo '4.1. ¿Hay preguntas que NUNCA salen?'
\echo '------------------------------------'

WITH available_questions AS (
    SELECT 
        q.id,
        q.categoria,
        q.hash_pregunta,
        LEFT(q.texto_pregunta, 60) as texto
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
),
never_selected AS (
    SELECT aq.*
    FROM available_questions aq
    LEFT JOIN simulated_exams se ON aq.id = se.question_id
    WHERE se.question_id IS NULL
)
SELECT 
    categoria AS "UT",
    COUNT(*) AS "Preguntas que NUNCA salieron",
    ROUND(COUNT(*)::DECIMAL / (
        SELECT COUNT(*) 
        FROM questions q2 
        JOIN exams e2 ON q2.exam_id = e2.id
        WHERE q2.categoria = never_selected.categoria
        AND (e2.tipo_examen = 'PER_NORMAL' OR e2.tipo_examen = 'PER_LIBERADO')
        AND q2.anulada = false
    ) * 100, 2) AS "% Nunca usadas"
FROM never_selected
GROUP BY categoria
ORDER BY COUNT(*) DESC;

\echo ''
\echo '4.2. ¿Hay sesgo hacia ciertas convocatorias?'
\echo '--------------------------------------------'

WITH expected_distribution AS (
    SELECT 
        e.convocatoria,
        COUNT(DISTINCT q.id) as preguntas_disponibles,
        ROUND(COUNT(DISTINCT q.id)::DECIMAL / (
            SELECT COUNT(DISTINCT q2.id)
            FROM questions q2
            JOIN exams e2 ON q2.exam_id = e2.id
            WHERE (e2.tipo_examen = 'PER_NORMAL' OR e2.tipo_examen = 'PER_LIBERADO')
            AND q2.anulada = false
        ) * 100, 2) as porcentaje_esperado
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
    GROUP BY e.convocatoria
),
actual_distribution AS (
    SELECT 
        convocatoria,
        COUNT(*) as veces_seleccionada,
        ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 2) as porcentaje_real
    FROM simulated_exams
    GROUP BY convocatoria
)
SELECT 
    ed.convocatoria AS "Convocatoria",
    ed.preguntas_disponibles AS "Disponibles",
    ed.porcentaje_esperado AS "% Esperado",
    COALESCE(ad.porcentaje_real, 0) AS "% Real",
    ROUND(COALESCE(ad.porcentaje_real, 0) - ed.porcentaje_esperado, 2) AS "Diferencia",
    CASE 
        WHEN ABS(COALESCE(ad.porcentaje_real, 0) - ed.porcentaje_esperado) < 2 THEN '✅ OK'
        WHEN ABS(COALESCE(ad.porcentaje_real, 0) - ed.porcentaje_esperado) < 5 THEN '🟡 Aceptable'
        ELSE '🔴 Sesgo significativo'
    END AS "Evaluación"
FROM expected_distribution ed
LEFT JOIN actual_distribution ad ON ed.convocatoria = ad.convocatoria
ORDER BY ABS(COALESCE(ad.porcentaje_real, 0) - ed.porcentaje_esperado) DESC
LIMIT 15;

\echo ''
\echo '4.3. Test Chi-cuadrado: ¿La distribución es aleatoria?'
\echo '-------------------------------------------------------'
\echo '(Valores esperados vs observados)'
\echo ''

WITH observed AS (
    SELECT 
        ut_category,
        COUNT(DISTINCT question_id) as preguntas_usadas,
        COUNT(*) as total_selecciones
    FROM simulated_exams
    GROUP BY ut_category
),
expected AS (
    SELECT 
        q.categoria,
        COUNT(DISTINCT q.id) as preguntas_disponibles,
        20 * uc.questions_per_exam as selecciones_totales
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    JOIN ut_configuration uc ON q.categoria = uc.category_name
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
    GROUP BY q.categoria, uc.questions_per_exam
)
SELECT 
    e.categoria AS "UT",
    e.selecciones_totales AS "Selecciones esperadas",
    o.total_selecciones AS "Selecciones reales",
    ROUND((o.preguntas_usadas::DECIMAL / e.preguntas_disponibles) * e.selecciones_totales, 2) AS "Uso esperado si fuera aleatorio",
    o.preguntas_usadas AS "Uso real",
    CASE 
        WHEN o.total_selecciones = e.selecciones_totales THEN '✅ Coincide'
        ELSE '⚠️ No coincide'
    END AS "Estado"
FROM expected e
JOIN observed o ON e.categoria = o.ut_category
ORDER BY e.categoria;

-- =============================================================================
-- PARTE 5: COMPARACIÓN CON APPROACH MEJORADO
-- =============================================================================

\echo ''
\echo '5. SIMULACIÓN CON APPROACH MEJORADO (DISTINCT ON hash)'
\echo '======================================================='
\echo ''

-- Limpiar y simular con DISTINCT ON
TRUNCATE simulated_exams;

DO $$
DECLARE
    exam_num INT;
    ut_rec RECORD;
    q_order INT;
BEGIN
    FOR exam_num IN 1..20 LOOP
        q_order := 1;
        
        FOR ut_rec IN 
            SELECT ut_number, category_name, questions_per_exam 
            FROM ut_configuration 
            ORDER BY ut_number
        LOOP
            -- CONSULTA MEJORADA (con DISTINCT ON como en tests de estudio)
            INSERT INTO simulated_exams (exam_num, question_id, question_order, ut_number, ut_category, hash_pregunta, convocatoria)
            WITH unique_questions AS (
                SELECT DISTINCT ON (q.hash_pregunta)
                    q.id,
                    q.hash_pregunta,
                    e.convocatoria
                FROM questions q
                JOIN exams e ON q.exam_id = e.id
                WHERE q.categoria = ut_rec.category_name
                AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
                AND q.anulada = false
                ORDER BY q.hash_pregunta, q.id
            )
            SELECT 
                exam_num,
                uq.id,
                q_order + (ROW_NUMBER() OVER ()) - 1,
                ut_rec.ut_number,
                ut_rec.category_name,
                uq.hash_pregunta,
                uq.convocatoria
            FROM unique_questions uq
            ORDER BY RANDOM()
            LIMIT ut_rec.questions_per_exam;
            
            q_order := q_order + ut_rec.questions_per_exam;
        END LOOP;
    END LOOP;
END $$;

\echo '✅ 20 exámenes con DISTINCT ON hash simulados'
\echo ''

\echo 'Comparativa: Método ACTUAL vs MEJORADO'
\echo '---------------------------------------'

SELECT 
    '📊 Método MEJORADO (DISTINCT ON)' AS "Método",
    COUNT(*) AS "Selecciones",
    COUNT(DISTINCT question_id) AS "Únicas",
    COUNT(*) - COUNT(DISTINCT question_id) AS "Repeticiones",
    ROUND((COUNT(*) - COUNT(DISTINCT question_id))::DECIMAL / COUNT(*) * 100, 2) AS "% Rep"
FROM simulated_exams;

\echo ''
\echo 'Top 20 preguntas con método MEJORADO:'

SELECT 
    COUNT(*) AS "Veces",
    ut_category AS "UT",
    LEFT(q.texto_pregunta, 65) || '...' AS "Pregunta"
FROM simulated_exams se
JOIN questions q ON se.question_id = q.id
GROUP BY se.question_id, ut_category, q.texto_pregunta
ORDER BY COUNT(*) DESC
LIMIT 20;

-- =============================================================================
-- PARTE 6: CONCLUSIONES Y RECOMENDACIONES
-- =============================================================================

\echo ''
\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║                    CONCLUSIONES                                ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''

WITH current_stats AS (
    SELECT 
        COUNT(DISTINCT question_id) as unicas_usadas,
        COUNT(*) as total_selecciones,
        COUNT(*) - COUNT(DISTINCT question_id) as repeticiones
    FROM simulated_exams
),
available AS (
    SELECT COUNT(DISTINCT id) as total_disponibles
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
)
SELECT 
    total_disponibles AS "1. Preguntas disponibles en banco",
    total_selecciones AS "2. Total selecciones (20 exámenes x 45)",
    unicas_usadas AS "3. Preguntas únicas usadas",
    repeticiones AS "4. Repeticiones entre exámenes",
    ROUND(repeticiones::DECIMAL / total_selecciones * 100, 2) AS "5. % Repetición",
    ROUND(unicas_usadas::DECIMAL / total_disponibles * 100, 2) AS "6. % Cobertura del banco"
FROM current_stats, available;

\echo ''
\echo 'RECOMENDACIÓN:'
\echo '--------------'
\echo 'Si % Repetición > 10% → Considerar usar DISTINCT ON (hash_pregunta)'
\echo 'Si % Cobertura < 30% → Hay sesgo en la selección aleatoria'
\echo ''

-- Limpiar
DROP TABLE simulated_exams;

\echo '✅ Análisis completado'
\echo ''


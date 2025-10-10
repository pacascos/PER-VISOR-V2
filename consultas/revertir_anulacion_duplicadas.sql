-- ====================================
-- SCRIPT: Revertir Anulación de Duplicadas
-- ====================================
-- Este script REVIERTE la anulación de preguntas duplicadas
-- restaurando todas las preguntas PER que fueron anuladas

\echo '================================================'
\echo 'SCRIPT: REVERTIR ANULACIÓN DE DUPLICADAS'
\echo '================================================'
\echo ''

\echo '1. Estado actual'
\echo '----------------'

SELECT 
    COUNT(*) FILTER (WHERE anulada = false) AS "Activas",
    COUNT(*) FILTER (WHERE anulada = true) AS "Anuladas",
    COUNT(*) AS "Total"
FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO');

\echo ''
\echo '2. Reactivando preguntas anuladas...'
\echo '-------------------------------------'

-- Reactivar TODAS las preguntas PER que estén anuladas
UPDATE questions 
SET anulada = false
WHERE id IN (
    SELECT q.id
    FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = true
);

\echo '✅ Reactivación completada'
\echo ''

\echo '3. Estado después de revertir'
\echo '-----------------------------'

SELECT 
    COUNT(*) FILTER (WHERE anulada = false) AS "Activas",
    COUNT(*) FILTER (WHERE anulada = true) AS "Anuladas",
    COUNT(*) AS "Total"
FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO');

\echo ''
\echo '✅ Todas las preguntas PER han sido reactivadas'
\echo ''


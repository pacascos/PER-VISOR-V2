-- =====================================================
-- Script de importación: Cambios para Modo Estudio
-- Fecha: 2025-10-01
-- =====================================================

BEGIN;

-- 1. ELIMINAR CONSTRAINT DE FK en question_attempts
-- Esto permite que exam_id referencie tanto user_exams como study_tests
ALTER TABLE IF EXISTS question_attempts DROP CONSTRAINT IF EXISTS question_attempts_exam_id_fkey;

COMMIT;

-- Verificación
SELECT 
    'CONSTRAINT ELIMINADO' as resultado,
    'question_attempts.exam_id ahora puede referenciar user_exams Y study_tests' as descripcion;

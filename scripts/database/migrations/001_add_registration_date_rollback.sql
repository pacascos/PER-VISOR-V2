-- =============================================================================
-- ROLLBACK: Eliminar campo registration_date de tabla users
-- =============================================================================
-- Fecha: 2025-01-29
-- Descripción: Elimina el campo registration_date de la tabla users
-- ADVERTENCIA: Esta operación eliminará permanentemente los datos de registration_date
-- =============================================================================

-- Verificar que la columna existe antes de eliminarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'registration_date'
    ) THEN
        RAISE NOTICE 'La columna registration_date no existe, no hay nada que hacer';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Iniciando rollback: eliminando columna registration_date';
END $$;

-- Eliminar la columna registration_date
ALTER TABLE users DROP COLUMN IF EXISTS registration_date;

-- Verificar que la columna se eliminó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'registration_date'
    ) THEN
        RAISE EXCEPTION 'Error: Columna registration_date no se eliminó correctamente';
    END IF;
    
    RAISE NOTICE 'Rollback completado exitosamente: Campo registration_date eliminado de tabla users';
END $$;

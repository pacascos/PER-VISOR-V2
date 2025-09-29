-- =============================================================================
-- MIGRACIÓN: Añadir campo registration_date a tabla users
-- =============================================================================
-- Fecha: 2025-01-29
-- Descripción: Añade campo registration_date (TIMESTAMP) a la tabla users
-- Para registros existentes: establece fecha actual
-- Para registros futuros: se establece automáticamente
-- =============================================================================

-- Añadir columna registration_date a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Actualizar registros existentes que tengan registration_date NULL
-- (esto solo afectará a registros que ya existían antes de la migración)
UPDATE users 
SET registration_date = CURRENT_TIMESTAMP 
WHERE registration_date IS NULL;

-- Crear comentario en la columna para documentación
COMMENT ON COLUMN users.registration_date IS 'Fecha y hora de registro del usuario';

-- Verificar que la migración se aplicó correctamente
DO $$
BEGIN
    -- Verificar que la columna existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'registration_date'
    ) THEN
        RAISE EXCEPTION 'Error: Columna registration_date no se creó correctamente';
    END IF;
    
    -- Verificar que todos los registros tienen registration_date
    IF EXISTS (
        SELECT 1 
        FROM users 
        WHERE registration_date IS NULL
    ) THEN
        RAISE EXCEPTION 'Error: Existen registros sin registration_date';
    END IF;
    
    RAISE NOTICE 'Migración 001 completada exitosamente: Campo registration_date añadido a tabla users';
END $$;

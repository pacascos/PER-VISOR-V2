-- Migration: XXX_descriptive_name.sql
-- Description: Brief description of what this migration does
-- Date: YYYY-MM-DD
-- Author: [Your name or "Sistema"]

-- ============================================
-- TABLAS
-- ============================================

CREATE TABLE IF NOT EXISTS nueva_tabla (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campo1 varchar(100),
    campo2 integer,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT pk_nueva_tabla PRIMARY KEY (id),
    CONSTRAINT fk_nueva_tabla_ref FOREIGN KEY (campo1_ref) 
        REFERENCES otra_tabla(id) ON DELETE CASCADE
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_nueva_tabla_campo1
    ON nueva_tabla (campo1);

CREATE INDEX IF NOT EXISTS idx_nueva_tabla_created
    ON nueva_tabla (created_at DESC);

-- ============================================
-- FUNCIONES
-- ============================================

CREATE OR REPLACE FUNCTION update_nueva_tabla_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_nueva_tabla ON nueva_tabla;
CREATE TRIGGER trigger_update_nueva_tabla
    BEFORE UPDATE ON nueva_tabla
    FOR EACH ROW
    EXECUTE FUNCTION update_nueva_tabla_timestamp();

-- ============================================
-- DATOS INICIALES (opcional)
-- ============================================

-- INSERT INTO nueva_tabla (campo1, campo2) VALUES
--     ('valor1', 1),
--     ('valor2', 2)
-- ON CONFLICT DO NOTHING;

-- ============================================
-- REGISTRO DE MIGRACIÓN
-- ============================================

INSERT INTO schema_migrations (migration_name, applied_at)
VALUES ('XXX_descriptive_name', CURRENT_TIMESTAMP)
ON CONFLICT (migration_name) DO NOTHING;

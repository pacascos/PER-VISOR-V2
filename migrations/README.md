# Database Migrations

Este directorio contiene las migraciones de base de datos versionadas para el proyecto PER.

## 📁 Estructura

```
migrations/
├── README.md                  # Este archivo
├── TEMPLATE.sql              # Template para nuevas migraciones
├── 001_initial_schema.sql    # Migración inicial (histórica)
├── 002_add_user_stats.sql    # Añadir estadísticas de usuario
├── 003_add_study_mode.sql    # ✅ Modo de estudio (aplicada 2025-10-02)
└── ...
```

## 🚀 Cómo crear una nueva migración

### 1. Copiar el template
```bash
cp migrations/TEMPLATE.sql migrations/00X_nombre_descriptivo.sql
```

### 2. Editar el archivo
- Cambiar el número de versión (001, 002, 003...)
- Actualizar descripción, fecha, autor
- Añadir los cambios de schema necesarios
- Asegurarse de incluir el registro en `schema_migrations`

### 3. Aplicar la migración

**Desarrollo (local):**
```bash
docker exec -i per_postgres psql -U per_user -d per_exams < migrations/00X_nombre.sql
```

**Producción (Cloud SQL):**
```bash
./scripts/deploy_migration.sh migrations/00X_nombre.sql
```

El script automáticamente:
1. ✅ Crea un backup de seguridad
2. ✅ Sube el archivo a Cloud Storage
3. ✅ Aplica la migración
4. ✅ Verifica la conexión

## ✅ Buenas Prácticas

### DO ✅
- Usar `CREATE TABLE IF NOT EXISTS`
- Usar `CREATE INDEX IF NOT EXISTS`
- Usar `CREATE OR REPLACE FUNCTION`
- Usar `DROP TRIGGER IF EXISTS` antes de `CREATE TRIGGER`
- Incluir comentarios explicativos
- Testear en local antes de producción
- Registrar migración en `schema_migrations`

### DON'T ❌
- NO usar `CREATE TRIGGER IF NOT EXISTS` (no soportado)
- NO incluir `DROP DATABASE` o `CREATE DATABASE`
- NO usar comandos `\` de psql
- NO olvidar el backup antes de aplicar
- NO hacer cambios destructivos sin confirmación

## 📋 Checklist de Migración

Antes de aplicar una migración a producción:

- [ ] Migración testeada en local
- [ ] Código de la aplicación compatible con el cambio
- [ ] Backup manual creado (el script lo hace automáticamente)
- [ ] Migración revisada por otro desarrollador (opcional)
- [ ] Plan de rollback preparado
- [ ] Ventana de mantenimiento comunicada (si aplica)

## 🔄 Rollback

Si una migración falla o causa problemas:

### Opción 1: Restaurar backup
```bash
# Listar backups disponibles
gcloud sql backups list --instance=per-db-instance

# Restaurar backup específico
gcloud sql backups restore BACKUP_ID \
  --backup-instance=per-db-instance \
  --backup-project=webpersonal-189221
```

### Opción 2: Migración de reversión
Crear una migración que deshaga los cambios:
```bash
# Ejemplo: 003_add_study_mode.sql → 004_rollback_study_mode.sql
cp migrations/TEMPLATE.sql migrations/00X_rollback_nombre.sql
# Editar con DROP TABLE, DROP INDEX, etc.
```

## 📊 Estado de Migraciones

Verificar qué migraciones están aplicadas:

```sql
SELECT * FROM schema_migrations ORDER BY applied_at DESC;
```

## 🔧 Troubleshooting

### Error: "relation already exists"
**Causa:** Migración ya aplicada o parcialmente aplicada.
**Solución:** Usar `IF NOT EXISTS` en todos los CREATE statements.

### Error: "syntax error near IF NOT EXISTS"
**Causa:** Comando no soporta `IF NOT EXISTS`.
**Solución:** Para triggers, usar `DROP IF EXISTS` primero.

### Error: "cannot run inside transaction block"
**Causa:** Cloud SQL ejecuta imports en transacción.
**Solución:** Evitar comandos como `DROP DATABASE`.

## 📚 Referencias

- [Documentación de Migraciones](../docs/MIGRACION_BD_A_PRODUCCION.md)
- [Cloud SQL Import Docs](https://cloud.google.com/sql/docs/postgres/import-export/import-export-sql)
- [PostgreSQL Migration Guide](https://www.postgresql.org/docs/current/backup-dump.html)

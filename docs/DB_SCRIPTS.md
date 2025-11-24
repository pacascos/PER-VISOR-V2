# 🗃️ Scripts públicos de base de datos

Este directorio contiene los artefactos necesarios para recrear la base de datos de PER (estructura completa + datos no sensibles) directamente desde GitHub.

## 📁 Archivos

- `sql/01_schema.sql`  
  Dump del esquema completo (funciones, extensiones, tablas, índices, constraints, materialized views, etc.).  
  Se puede ejecutar sobre una base de datos vacía:
  ```bash
  psql -U per_user -d per_exams -f sql/01_schema.sql
  ```

- `sql/02_seed_public_data.sql`  
  Seed con los datos actuales de todas las tablas públicas **excepto** `public.users`. Incluye preguntas, respuestas, estadísticas, configuraciones UT, migraciones, etc.  
  ```bash
  psql -U per_user -d per_exams -f sql/02_seed_public_data.sql
  ```

- `sql/.gitignore`  
  Reservado para scripts privados, por ejemplo `sql/03_seed_sensitive.sql` con datos reales de login. No se versiona para evitar exponer credenciales.

## 🔁 Cómo regenerar los scripts

Siempre que se cree un nuevo backup completo (`make backup` o `scripts/backup.sh`), se pueden actualizar los scripts públicos ejecutando:

```bash
python3 scripts/generate_public_sql.py
```

Este script:
1. Lee `backups/per_db_backup_YYYYMMDD_HHMMSS.sql.gz`
2. Sobrescribe `sql/01_schema.sql` eliminando los bloques `COPY`
3. Genera `sql/02_seed_public_data.sql` copiando sólo las tablas permitidas

> Actualmente solo se excluye `public.users`, pero puedes añadir más tablas sensibles editando la lista `EXCLUDED_TABLES` dentro del script.

## ⚠️ Datos sensibles

- **Login**: los registros reales viven en `public.users`. Solo su *schema* se publica.
- **Seeds internos**: si necesitas poblar usuarios reales u otra info privada, crea `sql/03_seed_sensitive.sql` (no versionado) y ejecútalo después del seed público.

## ✅ Flujo recomendado

1. `psql -f sql/01_schema.sql`
2. `psql -f sql/02_seed_public_data.sql`
3. (Opcional, fuera de GitHub) `psql -f sql/03_seed_sensitive.sql`
4. Ejecutar migraciones adicionales si fuese necesario (`migrations/*.sql`)

Con esto podrás reconstruir casi todo el dataset productivo sin exponer credenciales ni información personal en GitHub.


# 📚 Guía de Deployment - Sistema PER

**Versión:** 3.0  
**Fecha:** 10 de Octubre 2025  
**Autor:** Sistema PER_Cloude

---

## 🎯 Descripción General

Esta guía documenta el proceso completo de deployment a producción, incluyendo:
- Deployment de código a Google Cloud Run
- Ejecución de scripts SQL en Cloud SQL
- Backups automáticos
- Verificaciones post-deployment
- Procedimientos de rollback

---

## 📁 Scripts Disponibles

### 1. `deploy-production.sh` - Deployment Estándar

**Uso básico:**
```bash
./scripts/deploy-production.sh
```

**Descripción:**
- Construye imágenes Docker (API y Frontend)
- Sube imágenes a Artifact Registry
- Despliega servicios en Cloud Run
- **NO ejecuta scripts SQL**

**Cuándo usar:**
- Cambios solo en código (backend/frontend)
- Sin cambios en base de datos
- Deployments rutinarios

---

### 2. `deploy-with-sql-scripts.sh` - Deployment con SQL ⭐ NUEVO

**Uso básico:**
```bash
# Con script SQL
./scripts/deploy-with-sql-scripts.sh \
    --sql-script consultas/anular_duplicados_produccion.sql

# Sin script SQL (igual que deploy-production.sh)
./scripts/deploy-with-sql-scripts.sh --skip-sql

# Con SQL pero sin migraciones
./scripts/deploy-with-sql-scripts.sh \
    --sql-script consultas/mi_script.sql \
    --skip-migrations
```

**Descripción:**
- Todo lo que hace `deploy-production.sh` +
- **Ejecuta scripts SQL en Cloud SQL de producción**
- Crea backups automáticos antes de SQL
- Verifica resultados de SQL
- Maneja errores gracefully

**Cuándo usar:**
- Cambios en código + base de datos
- Necesitas ejecutar scripts SQL (actualizaciones, migraciones, etc.)
- Deployments que requieren modificar datos

**Opciones:**
- `--sql-script PATH` - Script SQL a ejecutar
- `--skip-sql` - No ejecutar SQL (solo código)
- `--skip-migrations` - No ejecutar migraciones automáticas
- `--help` - Mostrar ayuda

---

### 3. `deploy-with-db-changes.sh` - Deployment Específico

**Uso:**
```bash
./scripts/deploy-with-db-changes.sh
```

**Descripción:**
- Script específico para el deployment del 10 Oct 2025
- Hardcodeado con script de anulación de duplicados
- **Deprecated**: Usar `deploy-with-sql-scripts.sh` en su lugar

---

## 🔧 Componentes del Sistema de Deployment

### Arquitectura:

```
┌─────────────────────────────────────────────────────────────┐
│                  DEPLOYMENT PROCESS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Backup de BD (Cloud SQL)                                │
│      ├─ Backup automático                                   │
│      └─ Backup a Cloud Storage (opcional)                   │
│                                                              │
│  2. Ejecutar Scripts SQL (si aplica)                        │
│      ├─ Conexión vía gcloud sql connect                     │
│      ├─ Obtener password de Secret Manager                  │
│      ├─ Ejecutar script                                     │
│      └─ Verificar resultado                                 │
│                                                              │
│  3. Deployment de Código                                    │
│      ├─ Construir imágenes Docker                           │
│      ├─ Subir a Artifact Registry                           │
│      ├─ Desplegar en Cloud Run                              │
│      └─ Aplicar migraciones (opcional)                      │
│                                                              │
│  4. Verificación Post-Deployment                            │
│      ├─ Health checks                                       │
│      ├─ Verificar BD (si hubo SQL)                          │
│      └─ Logs y métricas                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Casos de Uso Comunes

### Caso 1: Deployment Simple (Solo Código)

**Situación:** Cambios en JavaScript, CSS, o lógica Python sin tocar BD

```bash
./scripts/deploy-production.sh
```

**O:**
```bash
./scripts/deploy-with-sql-scripts.sh --skip-sql
```

---

### Caso 2: Deployment con Scripts SQL

**Situación:** Necesitas ejecutar SQL + desplegar código

```bash
./scripts/deploy-with-sql-scripts.sh \
    --sql-script consultas/mi_actualizacion.sql
```

**Ejemplos de scripts SQL:**
- Anular preguntas duplicadas
- Actualizar estadísticas
- Migrar datos
- Corregir inconsistencias
- Crear índices

---

### Caso 3: Solo Ejecutar SQL (Sin Deployment)

**Situación:** Solo necesitas ejecutar SQL en producción

```bash
# Método manual (recomendado para SQL crítico)
gcloud sql connect per-db-instance \
    --user=per_user \
    --database=per_exams \
    --project=webpersonal-189221

# En psql:
\i /path/to/script.sql
```

---

### Caso 4: Rollback Completo

**Situación:** El deployment falló o necesitas revertir

```bash
# 1. Revertir código
git revert <commit-hash> --no-edit
git push origin <branch>

# 2. Re-desplegar versión anterior
./scripts/deploy-production.sh

# 3. Revertir BD (si es necesario)
gcloud sql connect per-db-instance --user=per_user --database=per_exams
\i /path/to/rollback_script.sql
```

---

## 🗄️ Scripts SQL Disponibles

### Scripts de Optimización:

| Script | Descripción | Uso |
|--------|-------------|-----|
| `anular_duplicados_produccion.sql` | Anula preguntas duplicadas | Una vez (completado) |
| `revertir_anulacion_duplicadas.sql` | Rollback de anulación | Si necesitas revertir |
| `verificar_filtro_anuladas.sql` | Verifica filtros | Post-deployment |
| `test_aleatoriedad_examenes.sql` | Prueba aleatoriedad | Diagnóstico |

### Scripts de Análisis:

| Script | Descripción | Output |
|--------|-------------|--------|
| `preguntas_per_estadisticas.sql` | Estadísticas completas | CSV con 3,057 preguntas |
| `test_aleatoriedad_examenes.sql` | Simula 20 exámenes | Análisis de variedad |

---

## 🔐 Credenciales y Secrets

### Secret Manager (Google Cloud):

```bash
# Ver secrets disponibles
gcloud secrets list --project=webpersonal-189221

# Obtener contraseña de BD
gcloud secrets versions access latest \
    --secret="database-password" \
    --project=webpersonal-189221
```

### Usuarios de Base de Datos:

| Usuario | Uso | Contraseña |
|---------|-----|------------|
| `per_user` | Usuario principal | En Secret Manager |
| `postgres` | Usuario admin | En Secret Manager |

---

## 📊 Verificaciones Post-Deployment

### Health Checks:

```bash
# API
curl -s https://per-api-sdmkab2wra-ew.a.run.app/api/health | jq

# Respuesta esperada:
# {
#   "status": "healthy",
#   "database": "connected"
# }
```

### Verificar Base de Datos:

```bash
# Conectar
gcloud sql connect per-db-instance --user=per_user --database=per_exams

# Verificar preguntas activas
SELECT 
    COUNT(*) FILTER (WHERE anulada = false) AS activas,
    COUNT(*) FILTER (WHERE anulada = true) AS anuladas
FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE e.tipo_examen IN ('PER_NORMAL', 'PER_LIBERADO');

# Resultado esperado (después de anular duplicados):
# activas: 1,870
# anuladas: 1,182
```

### Verificar Sin Duplicados:

```bash
# Ejecutar script de verificación
gcloud sql connect per-db-instance --user=per_user --database=per_exams
\i /path/to/consultas/verificar_filtro_anuladas.sql

# Resultado esperado:
# Duplicados activos: 0
# Preguntas únicas perdidas: 0
# Estado: ✅ PERFECTO
```

---

## 📋 Checklist de Deployment Completo

### Pre-Deployment:
- [ ] Todos los cambios commiteados
- [ ] Tests pasando en desarrollo
- [ ] Código pusheado a GitHub
- [ ] Documentación actualizada

### Durante Deployment:
- [ ] Backup de BD creado (automático)
- [ ] Script SQL ejecutado (si aplica)
- [ ] Imágenes construidas sin cache
- [ ] Imágenes subidas a Artifact Registry
- [ ] Servicios desplegados en Cloud Run
- [ ] Verificación inmediata (health checks)

### Post-Deployment:
- [ ] API health check OK
- [ ] Frontend health check OK
- [ ] BD verificada (si hubo SQL)
- [ ] Pruebas funcionales realizadas
- [ ] Logs monitoreados (primeras 2 horas)
- [ ] Sin errores críticos
- [ ] Feedback de usuarios (24-48 horas)

---

## 🔄 Procedimientos de Rollback

### Rollback de Código:

```bash
# Opción 1: Revertir commits
git revert <commit-hash>
git push origin <branch>
./scripts/deploy-production.sh

# Opción 2: Re-desplegar versión anterior
git checkout <previous-commit>
./scripts/deploy-production.sh
git checkout <current-branch>
```

### Rollback de Base de Datos:

```bash
# Opción 1: Restaurar desde backup de Cloud SQL
gcloud sql backups list --instance=per-db-instance

gcloud sql backups restore <BACKUP_ID> \
    --backup-instance=per-db-instance \
    --instance=per-db-instance

# Opción 2: Ejecutar script de reversión
gcloud sql connect per-db-instance --user=per_user --database=per_exams
\i consultas/revertir_anulacion_duplicadas.sql
```

---

## 🚨 Troubleshooting

### Problema 1: Error de autenticación en Cloud SQL

**Síntoma:** `password authentication failed for user "per_user"`

**Solución:**
```bash
# Verificar contraseña en Secret Manager
gcloud secrets versions access latest --secret="database-password"

# Resetear contraseña si necesario
gcloud sql users set-password per_user \
    --instance=per-db-instance \
    --password="nueva_contraseña"
```

---

### Problema 2: Error al subir a Cloud Storage

**Síntoma:** `HTTPError 412: The service account does not have the required permissions`

**Solución:**
```bash
# Dar permisos al service account
gsutil iam ch \
    serviceAccount:per-db-instance@webpersonal-189221.iam.gserviceaccount.com:objectViewer \
    gs://per-exam-backups

# O crear bucket con permisos correctos
gsutil mb -p webpersonal-189221 -l europe-west1 gs://per-exam-backups/
```

---

### Problema 3: Script SQL falla

**Síntoma:** Error al ejecutar script SQL

**Solución:**
```bash
# Ejecutar manualmente con más control
gcloud sql connect per-db-instance --user=per_user --database=per_exams

# Ver errores detallados
\i /path/to/script.sql

# Verificar estado de BD
SELECT version();
\dt
```

---

### Problema 4: Servicio no responde después de deployment

**Síntoma:** Health check falla

**Solución:**
```bash
# Ver logs recientes
gcloud run services logs read per-api --region=europe-west1 --limit=100

# Ver revisiones
gcloud run revisions list --service=per-api --region=europe-west1

# Rollback a revisión anterior
gcloud run services update-traffic per-api \
    --region=europe-west1 \
    --to-revisions=per-api-00069=100
```

---

## 📊 Métricas y Monitoreo

### Comandos Útiles:

```bash
# Ver logs del API
gcloud run services logs read per-api --region=europe-west1 --limit=50

# Ver logs con filtro de errores
gcloud run services logs read per-api --region=europe-west1 | grep -i error

# Ver métricas de uso
gcloud run services describe per-api --region=europe-west1

# Listar todas las revisiones
gcloud run revisions list --service=per-api --region=europe-west1

# Ver imágenes en Artifact Registry
gcloud artifacts docker images list \
    europe-west1-docker.pkg.dev/webpersonal-189221/per-images
```

---

## 🗂️ Historial de Deployments

### 10 de Octubre 2025 - Optimización del Banco de Preguntas

**Build ID:** 20251010183119-4febd46

**Cambios desplegados:**
1. ✅ Anulación de 1,164 preguntas duplicadas
2. ✅ Filtro temporal 24h en modo NEW
3. ✅ Atajos de teclado A/B/C/D
4. ✅ Análisis por UT en resultados

**Scripts SQL ejecutados:**
- `consultas/anular_duplicados_produccion.sql`

**Resultado:**
- Preguntas activas: 1,870
- Duplicados: 0
- Repeticiones: -65%
- Cobertura: +148%

**Comando usado:**
```bash
echo "change_me_secure_password_123" | \
    gcloud sql connect per-db-instance \
    --user=per_user --database=per_exams \
    < consultas/anular_duplicados_produccion.sql
```

---

## 📝 Plantilla de Nuevo Script SQL

Para crear scripts SQL que se puedan ejecutar en deployment:

```sql
-- ====================================
-- Título del Script
-- ====================================
-- Fecha: YYYY-MM-DD
-- Descripción: Qué hace este script
-- Reversión: nombre_del_script_rollback.sql
-- ====================================

-- Paso 1: Análisis previo (opcional)
SELECT COUNT(*) AS "Total a modificar"
FROM tabla
WHERE condicion;

-- Paso 2: Crear tabla temporal
CREATE TEMP TABLE cambios_a_aplicar AS
SELECT id, campo1, campo2
FROM tabla
WHERE condicion;

-- Paso 3: Aplicar cambios
UPDATE tabla
SET campo = nuevo_valor
WHERE id IN (SELECT id FROM cambios_a_aplicar);

-- Paso 4: Verificación
SELECT 
    COUNT(*) AS "Total modificados",
    COUNT(DISTINCT id) AS "Registros únicos"
FROM cambios_a_aplicar;

-- Paso 5: Limpiar
DROP TABLE cambios_a_aplicar;

-- Resultado esperado:
-- Total modificados: X
-- Registros únicos: Y
```

---

## 🔐 Seguridad y Permisos

### Permisos Necesarios:

1. **Google Cloud:**
   - Cloud Run Admin
   - Cloud SQL Client
   - Artifact Registry Writer
   - Secret Manager Secret Accessor

2. **Cloud Storage:**
   - Storage Object Viewer (para service account de Cloud SQL)
   - Storage Object Creator (para exports)

3. **Cloud SQL:**
   - Usuario con permisos de escritura en tablas

### Configurar Permisos:

```bash
# Service account del proyecto
SERVICE_ACCOUNT="per-db-instance@webpersonal-189221.iam.gserviceaccount.com"

# Dar acceso a Cloud Storage
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:objectViewer \
    gs://per-exam-backups
```

---

## 📚 Recursos Adicionales

### Documentación:
- `DEPLOYMENT_COMPLETADO_2025_10_10.md` - Último deployment
- `DEPLOYMENT_FINAL_INSTRUCCIONES.md` - Instrucciones paso a paso
- `PASOS_DEPLOYMENT_MANUAL.md` - Deployment manual
- `consultas/README_*.md` - Guías de scripts SQL

### Scripts de Verificación:
- `consultas/verificar_filtro_anuladas.sql`
- `consultas/test_aleatoriedad_examenes.sql`

### Scripts de Rollback:
- `consultas/revertir_anulacion_duplicadas.sql`

---

## 🎯 Mejores Prácticas

### DO ✅

1. ✅ **Siempre crear backup** antes de cambios de BD
2. ✅ **Probar scripts SQL** en desarrollo primero
3. ✅ **Verificar resultado** después de ejecutar SQL
4. ✅ **Monitorear logs** primeras 2 horas post-deployment
5. ✅ **Documentar cambios** en BD
6. ✅ **Crear script de rollback** para cada cambio de BD
7. ✅ **Usar --skip-migrations** si no hay cambios de schema

### DON'T ❌

1. ❌ **No desplegar sin backup** (especialmente con SQL)
2. ❌ **No ejecutar SQL** sin probarlo en desarrollo
3. ❌ **No ignorar warnings** del script de deployment
4. ❌ **No desplegar** si hay cambios sin commitear
5. ❌ **No desplegar** sin verificar health checks
6. ❌ **No modificar BD** sin script de reversión

---

## 🔍 Debugging

### Ver qué imagen está corriendo:

```bash
gcloud run services describe per-api \
    --region=europe-west1 \
    --format='value(spec.template.spec.containers[0].image)'
```

### Ver todas las revisiones:

```bash
gcloud run revisions list \
    --service=per-api \
    --region=europe-west1 \
    --limit=10
```

### Conectar a Cloud SQL para debugging:

```bash
# Con gcloud
gcloud sql connect per-db-instance --user=per_user --database=per_exams

# Ver tablas
\dt

# Ver esquema
\d+ questions

# Contar registros
SELECT COUNT(*) FROM questions;
```

---

## 📞 Soporte

### En caso de problemas:

1. **Ver logs del deployment:** `/tmp/deployment_log.txt`
2. **Ver logs de SQL:** `/tmp/sql_execution.log`
3. **Ver logs de Cloud Run:** `gcloud run services logs read per-api`
4. **Documentación:** `docs/DEPLOYMENT_GUIDE.md` (este archivo)

### Contactos:
- Repositorio: https://github.com/pacascos/PER-VISOR-V2
- Documentación: `docs/` en el repositorio

---

## 📅 Actualizaciones

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 10 Oct 2025 | 3.0 | Añadido soporte para scripts SQL automáticos |
| 10 Oct 2025 | 2.0 | Deployment con anulación de duplicados |
| Oct 2025 | 1.0 | Deployment básico a Cloud Run |

---

**Mantenido por:** Sistema PER_Cloude  
**Última actualización:** 10 de Octubre 2025  
**Versión de la guía:** 3.0


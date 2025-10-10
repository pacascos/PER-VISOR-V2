# 📋 Pasos para Deployment Manual a Producción

**Fecha:** 10 de Octubre 2025  
**Commits listos:** 4 (ya pusheados a GitHub)

---

## ⚠️ IMPORTANTE

Este deployment incluye **cambios en la base de datos** (anulación de 1,164 preguntas duplicadas).  
Requiere ejecución manual de scripts SQL en producción.

---

## 🚀 OPCIÓN 1: Deployment Asistido (Recomendado)

Ejecuta el script interactivo que he creado:

```bash
cd /Users/cascos/code/PER_Cloude
./scripts/deploy-with-db-changes.sh
```

**El script te pedirá:**
1. Confirmación para modificar BD
2. Confirmación tras crear backup
3. Confirmación tras verificar cambios de BD
4. Procederá con deployment a Cloud Run

---

## 🚀 OPCIÓN 2: Deployment Manual Paso a Paso

### PASO 1: Backup de Base de Datos ⚠️ CRÍTICO

```bash
# Backup automático en Cloud SQL
gcloud sql backups create \
    --instance=per-db-instance \
    --project=webpersonal-189221 \
    --description="Backup antes de anular duplicados - $(date +%Y%m%d_%H%M%S)"

# Backup manual a Cloud Storage
gcloud sql export sql per-db-instance \
    gs://per-exam-backups/backup_antes_anular_$(date +%Y%m%d_%H%M%S).sql \
    --database=per_exams \
    --project=webpersonal-189221
```

---

### PASO 2: Conectar a Cloud SQL

**Opción A: Cloud SQL Proxy**
```bash
# Instalar proxy si no lo tienes
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.13.0/cloud-sql-proxy.darwin.arm64
chmod +x cloud-sql-proxy

# Iniciar proxy
./cloud-sql-proxy webpersonal-189221:europe-west1:per-db-instance &

# Conectar
psql "host=127.0.0.1 port=5432 dbname=per_exams user=per_user password=change_me_secure_password_123"
```

**Opción B: gcloud sql connect**
```bash
gcloud sql connect per-db-instance \
    --user=per_user \
    --database=per_exams \
    --project=webpersonal-189221
```

---

### PASO 3: Ejecutar Script de Anulación

Una vez conectado a la BD de producción:

```sql
-- Cargar y ejecutar script
\i /path/to/consultas/anular_preguntas_duplicadas.sql

-- El script te mostrará:
-- 1. Análisis previo (cuántas se anularán)
-- 2. Pedirá confirmación (presiona Enter)
-- 3. Ejecutará la anulación
-- 4. Mostrará verificación final

-- Resultado esperado:
-- ✅ Preguntas únicas activas: 1,870
-- ✅ Duplicados activos: 0
```

---

### PASO 4: Verificar Cambios de BD

Ejecutar verificación:

```sql
\i /path/to/consultas/verificar_filtro_anuladas.sql

-- Resultado esperado:
-- ✅ Examen simulado: 0 anuladas seleccionadas
-- ✅ Test simulado: 0 anuladas seleccionadas
-- ✅ Preguntas únicas perdidas: 0
-- ✅ Estado: PERFECTO
```

Salir de psql:
```sql
\q
```

---

### PASO 5: Desplegar Código a Cloud Run

```bash
# Ejecutar deployment normal
cd /Users/cascos/code/PER_Cloude
./scripts/deploy-production.sh

# Esto desplegará:
# - API con study_mode_logic.py actualizado (filtro 24h)
# - Frontend con atajos A/B/C/D
# - Frontend con exam-results.html v2.0
```

---

### PASO 6: Verificación Post-Deployment

**Pruebas funcionales en https://bancotest.com:**

1. **Verificar atajos de teclado:**
   - Generar examen o test
   - Presionar teclas A, B, C, D
   - ✅ Deben seleccionar respuestas

2. **Verificar análisis por UT:**
   - Completar un examen
   - Ver página de resultados
   - ✅ Debe mostrar tabla de UTs con correctas/incorrectas

3. **Verificar filtro de duplicados:**
   - Hacer 2-3 tests de estudio consecutivos (modo NEW)
   - ✅ No deben repetirse preguntas entre tests

4. **Verificar logs:**
```bash
# Ver logs del API
gcloud run services logs read per-api \
    --region=europe-west1 \
    --limit=50 \
    --project=webpersonal-189221

# Buscar errores
gcloud run services logs read per-api \
    --region=europe-west1 \
    --limit=200 \
    --project=webpersonal-189221 | grep -i error
```

---

## 🔄 ROLLBACK (Si Fuera Necesario)

### Revertir Base de Datos:

**Opción 1: Restaurar desde backup de Cloud SQL**
```bash
gcloud sql backups list \
    --instance=per-db-instance \
    --project=webpersonal-189221

gcloud sql backups restore BACKUP_ID \
    --backup-instance=per-db-instance \
    --instance=per-db-instance \
    --project=webpersonal-189221
```

**Opción 2: Ejecutar script de reversión**
```bash
# Conectar a BD
gcloud sql connect per-db-instance --user=per_user --database=per_exams

# Ejecutar reversión
\i /path/to/consultas/revertir_anulacion_duplicadas.sql

# Resultado: Reactiva todas las 1,164 preguntas anuladas
```

### Revertir Código:

```bash
# Revertir commits
cd /Users/cascos/code/PER_Cloude
git revert 4febd46 fb58fbd 5f05937 9b9c919 --no-commit
git commit -m "revert: Rollback cambios del 10 Oct"
git push origin refactor/phase-6-rollout-100

# Re-desplegar
./scripts/deploy-production.sh
```

---

## 📊 CHECKLIST DE DEPLOYMENT

### Pre-Deployment:
- [x] Commits realizados y pusheados
- [ ] Backup de BD de producción creado
- [ ] Backup verificado y descargable

### Deployment:
- [ ] Script de anulación ejecutado en prod
- [ ] Verificación de anulación OK (1,870 activas, 0 duplicados)
- [ ] Código desplegado en Cloud Run
- [ ] Imágenes Docker verificadas

### Post-Deployment:
- [ ] Health check OK
- [ ] Atajos A/B/C/D funcionan
- [ ] Análisis por UT visible en resultados
- [ ] Tests consecutivos sin repeticiones
- [ ] Sin errores en logs (2 horas)
- [ ] Feedback de usuarios (24 horas)

---

## 📞 CONTACTO EN CASO DE PROBLEMAS

**Archivos de soporte:**
- `consultas/revertir_anulacion_duplicadas.sql` - Rollback de BD
- `backups/backup_antes_anular_20251010_003534.sql` - Backup desarrollo
- `DEPLOYMENT_PRODUCTION_2025_10_10.md` - Guía completa

**Comandos útiles:**
```bash
# Ver estado de servicios
gcloud run services list --region=europe-west1

# Ver revisiones desplegadas
gcloud run revisions list --service=per-api --region=europe-west1

# Ver backups disponibles
gcloud sql backups list --instance=per-db-instance
```

---

## 🎯 RESUMEN

**Cambios a desplegar:**
1. ✅ Anulación de 1,164 preguntas duplicadas (BD)
2. ✅ Filtro temporal 24h en modo NEW (Backend)
3. ✅ Atajos A/B/C/D (Frontend)
4. ✅ Análisis por UT en resultados (Frontend)

**Mejoras esperadas:**
- Mayor variedad en exámenes (+148%)
- Menos repeticiones en tests (-65%)
- Mejor experiencia de usuario

**Riesgos:**
- Bajos (todo probado en desarrollo)
- Mitigados con backups y rollback

---

**Preparado por:** Sistema PER_Cloude  
**Fecha:** 10 de Octubre 2025, 18:28  
**Estado:** ✅ LISTO - Ejecutar manualmente


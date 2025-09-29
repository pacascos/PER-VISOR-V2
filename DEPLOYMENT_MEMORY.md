# 🧠 MEMORIA DE DESPLIEGUE - PER SISTEMA

**Fecha de creación**: 2025-01-29  
**Versión**: 1.0  
**Última actualización**: 2025-01-29

## 🚨 PROBLEMA IDENTIFICADO Y SOLUCIONADO

### ❌ Problema Original
- El despliegue a producción se atascaba constantemente
- Cada vez había que verificar todo desde cero
- Errores repetitivos con Container Registry (deprecado)
- Falta de automatización en el proceso de despliegue
- No había scripts reutilizables ni documentación clara

### ✅ Solución Implementada
**Scripts de despliegue automatizado creados el 2025-01-29:**

1. **`scripts/deploy-git-workflow.sh`** - Despliegue automático por rama
2. **`scripts/deploy-production.sh`** - Despliegue manual a producción  
3. **`scripts/deploy-staging.sh`** - Despliegue manual a staging
4. **`.github/workflows/deploy-google-cloud.yml`** - CI/CD automatizado

## 🔧 CONFIGURACIÓN ACTUAL

### Variables del Proyecto
```bash
PROJECT_ID="webpersonal-189221"
REGION="europe-west1"
API_SERVICE_NAME="per-api"
FRONTEND_SERVICE_NAME="per-frontend"
```

### URLs de Imágenes (Artifact Registry)
```bash
API_IMAGE="europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-api:latest"
FRONTEND_IMAGE="europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-frontend:latest"
```

### Servicios Desplegados
- **API**: `https://per-api-435987927843.europe-west1.run.app`
- **Frontend**: `https://per-frontend-435987927843.europe-west1.run.app`

## 🚀 FLUJO DE DESPLIEGUE AUTOMATIZADO

### Opción 1: Automático por Git (RECOMENDADO)
```bash
# 1. Desarrollo normal
git checkout develop
git add .
git commit -m "feat: nueva funcionalidad"
git push origin develop
# → Despliegue automático a STAGING

# 2. Cuando esté listo para producción
git checkout main
git merge develop
git push origin main
# → Despliegue automático a PRODUCCIÓN
```

### Opción 2: Script Manual
```bash
# Despliegue automático basado en la rama actual
./scripts/deploy-git-workflow.sh

# O despliegue directo
./scripts/deploy-production.sh    # Producción
./scripts/deploy-staging.sh       # Staging
```

## 🔍 VERIFICACIONES AUTOMÁTICAS

Los scripts incluyen verificaciones automáticas:
- ✅ gcloud CLI instalado y autenticado
- ✅ Docker instalado y funcionando
- ✅ Proyecto configurado correctamente
- ✅ APIs habilitadas (Cloud Run, Artifact Registry)
- ✅ Repositorio de imágenes creado
- ✅ Estado de Git verificado
- ✅ Health checks post-despliegue

## 📋 COMANDOS ÚTILES

### Ver estado de servicios
```bash
gcloud run services list --region=europe-west1
```

### Ver logs
```bash
gcloud run services logs read per-api --region=europe-west1
gcloud run services logs read per-frontend --region=europe-west1
```

### Ver logs en tiempo real
```bash
gcloud run services logs tail per-api --region=europe-west1
```

### Listar imágenes
```bash
gcloud artifacts docker images list europe-west1-docker.pkg.dev/webpersonal-189221/per-images
```

## 🛠️ CONFIGURACIÓN REQUERIDA

### 1. Google Cloud CLI
```bash
gcloud auth login
gcloud config set project webpersonal-189221
```

### 2. Docker
```bash
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### 3. GitHub Actions (para CI/CD)
- Service Account con permisos de Cloud Run y Artifact Registry
- Secreto `GCP_SA_KEY` en GitHub

## 🚨 ERRORES COMUNES Y SOLUCIONES

### Error: "Container Registry is deprecated"
**Solución**: Usar Artifact Registry (ya configurado en los scripts)

### Error: "Permission denied"
**Solución**: Verificar autenticación gcloud y permisos del proyecto

### Error: "Image not found"
**Solución**: Verificar que las imágenes se construyeron y subieron correctamente

### Error: "Service deployment failed"
**Solución**: Revisar logs del servicio y configuración de recursos

## 📚 ARCHIVOS IMPORTANTES

### Scripts de Despliegue
- `scripts/deploy-git-workflow.sh` - Script principal (usar este)
- `scripts/deploy-production.sh` - Producción manual
- `scripts/deploy-staging.sh` - Staging manual

### Configuración
- `Dockerfile` - Imagen del API
- `frontend.Dockerfile` - Imagen del Frontend
- `nginx.conf` - Configuración de proxy

### CI/CD
- `.github/workflows/deploy-google-cloud.yml` - Workflow automatizado

### Documentación
- `DEPLOYMENT_GOOGLE_CLOUD.md` - Documentación completa
- `DEPLOYMENT_MEMORY.md` - Este archivo de memoria

## 🎯 PRÓXIMOS PASOS

1. **Configurar Service Account** para GitHub Actions
2. **Probar despliegue** con los scripts creados
3. **Verificar funcionamiento** en producción
4. **Documentar cualquier problema** encontrado

## 💡 LECCIONES APRENDIDAS

1. **SIEMPRE** crear scripts automatizados para tareas repetitivas
2. **SIEMPRE** documentar procesos complejos
3. **SIEMPRE** verificar que las herramientas estén actualizadas (GCR → AR)
4. **SIEMPRE** incluir verificaciones automáticas en los scripts
5. **SIEMPRE** usar fechas de creación en scripts para versionado

---

**⚠️ IMPORTANTE**: Este archivo debe actualizarse cada vez que se modifiquen los scripts o la configuración de despliegue.

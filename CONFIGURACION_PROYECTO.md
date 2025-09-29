# 📋 Configuración Completa del Proyecto PER Sistema

## 🎯 **Información General**
- **Nombre:** PER Sistema - Patrón de Embarcaciones de Recreo
- **Repositorio:** https://github.com/pacascos/PER-VISOR-V2
- **Propietario:** cascos@gmail.com

## 🏗️ **Arquitectura Técnica**

### **Backend:**
- **API:** Flask (Python) en `scripts/servidores/api_postgresql.py`
- **Base de datos:** PostgreSQL
- **ORM:** psycopg2 (conexión directa)
- **Autenticación:** JWT tokens
- **CORS:** Configurado para múltiples orígenes

### **Frontend:**
- **Tecnología:** HTML5 + JavaScript vanilla + Bootstrap 5
- **Archivos principales:**
  - `exam-system.html` - Sistema principal de exámenes
  - `visor-nueva-arquitectura.html` - Banco de preguntas
  - `statistics-dashboard.html` - Dashboard gamificado
  - `question-statistics-dashboard.html` - Estadísticas detalladas

### **Infraestructura:**
- **Contenedores:** Docker + Docker Compose
- **Producción:** Google Cloud Platform
- **Base de datos:** Cloud SQL (PostgreSQL)
- **Hosting:** Cloud Run
- **Registro:** Artifact Registry
- **SSL:** Automático con Google Cloud

## 🌐 **Entornos**

### **Desarrollo:**
- **URL:** http://localhost:8095
- **Servicios:** Docker Compose local
- **Favicon:** Normal (favicon.svg)
- **Indicador:** "DESARROLLO" (verde)
- **API:** http://localhost:5001

### **Producción:**
- **URL:** https://bancotest.com
- **Servicios:** Google Cloud Run
- **Favicon:** Rojo/azul (favicon-prod.svg)
- **Indicador:** "PRODUCCIÓN" (rojo)
- **API:** https://per-api-435987927843.europe-west1.run.app

## 🔄 **Git Flow Configurado**

### **Ramas:**
- **`main`** → Producción (https://bancotest.com)
- **`develop`** → Desarrollo (localhost:8095)

### **Flujo de trabajo:**
```bash
# 1. Desarrollo
git checkout develop
git checkout -b feature/nombre-funcionalidad
# ... desarrollar ...
git commit -m "feat: descripción"

# 2. Merge a develop
git checkout develop
git merge feature/nombre-funcionalidad
git push origin develop

# 3. Testing en develop
# Si todo OK, merge a main
git checkout main
git merge develop
git push origin main

# 4. Deploy a producción
./scripts/deploy-production.sh
```

## 🚀 **Scripts de Deploy**

### **Desarrollo:**
```bash
make start
# o
docker compose up -d
```

### **Producción:**
```bash
./scripts/deploy-production.sh
```

## 🔐 **Credenciales y URLs**

### **Base de datos:**
- **Local:** PostgreSQL en Docker (puerto 5432)
- **Producción:** Cloud SQL `webpersonal-189221:europe-west1:per-db-instance`
- **Usuario:** per_user
- **Base de datos:** per_exams

### **Google Cloud:**
- **Proyecto:** webpersonal-189221
- **Región:** europe-west1
- **Servicios:**
  - per-api (API)
  - per-frontend (Frontend)
  - per-db-instance (Base de datos)

### **Dominio:**
- **Producción:** bancotest.com (DonDominio)
- **DNS:** Configurado con registros A de Google Cloud

## 📁 **Estructura del Proyecto**

```
PER_Cloude/
├── src/web/                    # Frontend
│   ├── exam-system.html        # Sistema principal
│   ├── visor-nueva-arquitectura.html
│   ├── statistics-dashboard.html
│   └── *.js                    # Scripts JavaScript
├── scripts/
│   ├── servidores/
│   │   └── api_postgresql.py   # API Flask
│   ├── backup.sh               # Backup de BD
│   ├── restore.sh              # Restore de BD
│   └── deploy-production.sh    # Deploy a producción
├── docker-compose.yml          # Servicios locales
├── Dockerfile                  # Imagen API
├── frontend.Dockerfile         # Imagen Frontend
├── nginx.conf                  # Configuración Nginx
└── backups/                    # Backups de BD
```

## 🛠️ **Comandos Útiles**

### **Desarrollo:**
```bash
# Iniciar servicios
make start

# Ver logs
make logs

# Backup BD
make backup

# Restore BD
make restore FILE=backup.sql
```

### **Producción:**
```bash
# Deploy completo
./scripts/deploy-production.sh

# Ver logs Cloud Run
gcloud run logs read per-api --region=europe-west1
gcloud run logs read per-frontend --region=europe-west1

# Estado del dominio
gcloud beta run domain-mappings describe --domain=bancotest.com --region=europe-west1
```

## 🎨 **Características Especiales**

### **Favicon Dinámico:**
- **Desarrollo:** favicon.svg (normal)
- **Producción:** favicon-prod.svg (rojo/azul)

### **Indicador de Entorno:**
- **Posición:** Esquina superior derecha
- **Desarrollo:** "DESARROLLO" (verde)
- **Producción:** "PRODUCCIÓN" (rojo)

### **Estadísticas:**
- Sistema gamificado con niveles, XP, logros
- Estadísticas globales y personales
- Tracking detallado de intentos de preguntas

## 🔧 **Configuración de CORS**

La API permite conexiones desde:
- http://localhost:8095
- http://127.0.0.1:8095
- https://per-frontend-435987927843.europe-west1.run.app
- https://bancotest.com

## 📝 **Notas Importantes**

1. **NUNCA** desarrollar directamente en `main`
2. **SIEMPRE** hacer testing en `develop` antes de producción
3. **SIEMPRE** usar el script de deploy para producción
4. **Favicon** cambia automáticamente según el entorno
5. **SSL** es automático en producción (Google Cloud)
6. **Backup** regular de la base de datos

## 🆘 **Resolución de Problemas**

### **Error de CORS:**
- Verificar que el dominio esté en la lista de CORS en `api_postgresql.py`
- Reconstruir y redesplegar la API

### **Error de SSL:**
- Verificar dominio mapping en Google Cloud
- Esperar propagación DNS (hasta 24h)

### **Error de BD:**
- Verificar conexión con `make backup`
- Restaurar desde backup si es necesario

### **Error de Deploy:**
- Verificar que gcloud esté autenticado
- Verificar que el proyecto esté configurado correctamente

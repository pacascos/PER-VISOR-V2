# 🚀 Despliegue de PER Sistema en Google Cloud

## 📋 Prerrequisitos

### 1. Herramientas Necesarias
```bash
# Instalar Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Instalar Docker
# macOS: brew install docker
# Ubuntu: sudo apt install docker.io
# Windows: Descargar Docker Desktop

# Verificar instalaciones
gcloud --version
docker --version
```

### 2. Configuración Inicial de Google Cloud
```bash
# Login en Google Cloud
gcloud auth login

# Crear proyecto (opcional)
gcloud projects create per-sistema-2025 --name="PER Sistema Náutico"

# Configurar proyecto
gcloud config set project per-sistema-2025

# Habilitar APIs necesarias
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

## 🐳 Preparación de Contenedores

### 1. Dockerfile para API Flask

Crear `Dockerfile` en la raíz del proyecto:

```dockerfile
FROM python:3.11-slim

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY scripts/servidores/ ./
COPY data/ ./data/

# Crear usuario no-root para seguridad
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Exponer puerto
EXPOSE 8080

# Variables de entorno
ENV PYTHONPATH=/app
ENV FLASK_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Comando de inicio
CMD ["python", "api_postgresql.py"]
```

### 2. Dockerfile para Frontend (Nginx)

Crear `frontend.Dockerfile`:

```dockerfile
FROM nginx:alpine

# Copiar archivos del frontend
COPY src/web/ /usr/share/nginx/html/

# Configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto
EXPOSE 80

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Configuración Nginx

Crear `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Configuración para SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Seguridad headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Comprimir respuestas
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

### 4. Archivo requirements.txt

Crear/verificar `requirements.txt`:

```txt
Flask==3.0.0
Flask-CORS==4.0.0
psycopg2-binary==2.9.9
requests==2.31.0
PyJWT==2.8.0
python-dotenv==1.0.0
gunicorn==21.2.0
```

## 🗄️ Base de Datos en Cloud SQL

### 1. Crear Instancia PostgreSQL
```bash
# Crear instancia Cloud SQL
gcloud sql instances create per-db-instance \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --storage-type=SSD \
    --storage-size=10GB \
    --backup \
    --enable-bin-log

# Crear base de datos
gcloud sql databases create per_exams \
    --instance=per-db-instance

# Crear usuario
gcloud sql users create per_user \
    --instance=per-db-instance \
    --password=STRONG_PASSWORD_HERE
```

### 2. Configurar Conexión Privada
```bash
# Configurar IP privada (recomendado)
gcloud sql instances patch per-db-instance \
    --network=default \
    --no-assign-ip
```

### 3. Aplicar Schema
```bash
# Conectar a la instancia
gcloud sql connect per-db-instance --user=per_user --database=per_exams

# En el shell SQL, aplicar el schema
\i /ruta/al/statistics_schema.sql
```

## 🔐 Gestión de Secretos

### 1. Crear Secretos en Secret Manager
```bash
# Database URL
echo "postgresql://per_user:STRONG_PASSWORD@/per_exams?host=/cloudsql/per-sistema-2025:us-central1:per-db-instance" | \
    gcloud secrets create database-url --data-file=-

# OpenAI API Key
echo "tu-openai-api-key" | \
    gcloud secrets create openai-api-key --data-file=-

# JWT Secret
python3 -c "import secrets; print(secrets.token_hex(32))" | \
    gcloud secrets create jwt-secret --data-file=-

# Flask Secret Key
python3 -c "import secrets; print(secrets.token_hex(32))" | \
    gcloud secrets create flask-secret-key --data-file=-
```

### 2. Otorgar Permisos
```bash
# Permitir acceso a secretos desde Cloud Run
gcloud projects add-iam-policy-binding per-sistema-2025 \
    --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## 🚀 Desplegar en Cloud Run

### 1. Construir y Subir Imágenes
```bash
# Configurar Docker para Google Container Registry
gcloud auth configure-docker

# Backend - API Flask
docker build -t gcr.io/per-sistema-2025/per-api:latest .
docker push gcr.io/per-sistema-2025/per-api:latest

# Frontend - Nginx
docker build -f frontend.Dockerfile -t gcr.io/per-sistema-2025/per-frontend:latest .
docker push gcr.io/per-sistema-2025/per-frontend:latest
```

### 2. Desplegar Backend (API)
```bash
gcloud run deploy per-api \
    --image=gcr.io/per-sistema-2025/per-api:latest \
    --platform=managed \
    --region=us-central1 \
    --allow-unauthenticated \
    --set-env-vars="FLASK_ENV=production" \
    --set-secrets="DATABASE_URL=database-url:latest" \
    --set-secrets="OPENAI_API_KEY=openai-api-key:latest" \
    --set-secrets="JWT_SECRET=jwt-secret:latest" \
    --set-secrets="SECRET_KEY=flask-secret-key:latest" \
    --add-cloudsql-instances=per-sistema-2025:us-central1:per-db-instance \
    --memory=512Mi \
    --cpu=1000m \
    --concurrency=100 \
    --max-instances=10
```

### 3. Desplegar Frontend
```bash
gcloud run deploy per-frontend \
    --image=gcr.io/per-sistema-2025/per-frontend:latest \
    --platform=managed \
    --region=us-central1 \
    --allow-unauthenticated \
    --memory=256Mi \
    --cpu=1000m \
    --concurrency=1000 \
    --max-instances=5
```

## 🌐 Configurar Dominio Personalizado (Opcional)

### 1. Mapear Dominio
```bash
# Si tienes un dominio (ejemplo: per-sistema.com)
gcloud run domain-mappings create \
    --service=per-frontend \
    --domain=per-sistema.com \
    --region=us-central1

# Para subdominios
gcloud run domain-mappings create \
    --service=per-api \
    --domain=api.per-sistema.com \
    --region=us-central1
```

### 2. Configurar DNS
```bash
# Obtener registros CNAME
gcloud run domain-mappings describe \
    --domain=per-sistema.com \
    --region=us-central1
```

## 🔧 Configuración de Variables de Entorno

### 1. Actualizar Frontend para Producción

En `src/web/exam-system.js` y `statistics-manager.js`, actualizar:

```javascript
// Cambiar de localhost a la URL de producción
constructor() {
    // this.API_BASE = 'http://localhost:5001';  // Desarrollo
    this.API_BASE = 'https://per-api-[hash]-uc.a.run.app';  // Producción
}
```

### 2. Variables de Entorno del Backend

El backend debe leer estas variables:
- `DATABASE_URL` - Conexión a Cloud SQL
- `OPENAI_API_KEY` - Clave de OpenAI
- `JWT_SECRET` - Secreto para JWT
- `SECRET_KEY` - Clave secreta de Flask

## 📊 Monitoreo y Logs

### 1. Ver Logs
```bash
# Logs del API
gcloud run services logs read per-api --region=us-central1

# Logs del Frontend
gcloud run services logs read per-frontend --region=us-central1

# Logs en tiempo real
gcloud run services logs tail per-api --region=us-central1
```

### 2. Métricas y Alertas
```bash
# Ver métricas en Cloud Console
echo "https://console.cloud.google.com/run/detail/us-central1/per-api/metrics"
```

## 💰 Estimación de Costos

### Configuración Básica (Tráfico Bajo)
- **Cloud Run API**: ~$0-5/mes (primera capa gratuita)
- **Cloud Run Frontend**: ~$0-2/mes
- **Cloud SQL (db-f1-micro)**: ~$7/mes
- **Storage**: ~$1/mes
- **Total**: ~$8-15/mes

### Configuración Media (Tráfico Moderado)
- **Cloud Run**: ~$10-20/mes
- **Cloud SQL (db-n1-standard-1)**: ~$25/mes
- **Storage y transferencia**: ~$5/mes
- **Total**: ~$40-50/mes

## ⚡ Script de Despliegue Automático

Crear `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Desplegando PER Sistema a Google Cloud"

# Variables
PROJECT_ID="per-sistema-2025"
REGION="us-central1"

# Configurar proyecto
gcloud config set project $PROJECT_ID

# Construir imágenes
echo "📦 Construyendo imágenes Docker..."
docker build -t gcr.io/$PROJECT_ID/per-api:latest .
docker build -f frontend.Dockerfile -t gcr.io/$PROJECT_ID/per-frontend:latest .

# Subir imágenes
echo "⬆️ Subiendo imágenes..."
docker push gcr.io/$PROJECT_ID/per-api:latest
docker push gcr.io/$PROJECT_ID/per-frontend:latest

# Desplegar servicios
echo "🚀 Desplegando API..."
gcloud run deploy per-api \
    --image=gcr.io/$PROJECT_ID/per-api:latest \
    --platform=managed \
    --region=$REGION \
    --allow-unauthenticated \
    --set-secrets="DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,JWT_SECRET=jwt-secret:latest,SECRET_KEY=flask-secret-key:latest" \
    --add-cloudsql-instances=$PROJECT_ID:$REGION:per-db-instance \
    --memory=512Mi

echo "🌐 Desplegando Frontend..."
gcloud run deploy per-frontend \
    --image=gcr.io/$PROJECT_ID/per-frontend:latest \
    --platform=managed \
    --region=$REGION \
    --allow-unauthenticated \
    --memory=256Mi

# Obtener URLs
API_URL=$(gcloud run services describe per-api --region=$REGION --format='value(status.url)')
FRONTEND_URL=$(gcloud run services describe per-frontend --region=$REGION --format='value(status.url)')

echo "✅ Despliegue completado!"
echo "🔗 API URL: $API_URL"
echo "🌐 Frontend URL: $FRONTEND_URL"
echo ""
echo "📋 Próximos pasos:"
echo "1. Actualizar API_BASE en el frontend con: $API_URL"
echo "2. Aplicar schema de database"
echo "3. Probar la aplicación"
```

## 🔄 Actualización Continua

### 1. GitHub Actions (CI/CD)

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Google Cloud

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Google Cloud
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: per-sistema-2025

    - name: Configure Docker
      run: gcloud auth configure-docker

    - name: Build and Deploy
      run: |
        docker build -t gcr.io/per-sistema-2025/per-api:latest .
        docker push gcr.io/per-sistema-2025/per-api:latest
        gcloud run deploy per-api --image=gcr.io/per-sistema-2025/per-api:latest --region=us-central1
```

## 🛡️ Seguridad

### 1. Configuraciones de Seguridad
```bash
# Configurar IAM
gcloud projects add-iam-policy-binding per-sistema-2025 \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --condition='expression=request.auth.claims.email != "",title=Authenticated users only'

# Configurar HTTPS (automático en Cloud Run)
# Configurar CORS en el backend
```

### 2. Firewall y VPC
```bash
# Crear reglas de firewall si es necesario
gcloud compute firewall-rules create allow-cloud-run \
    --allow tcp:8080 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow Cloud Run traffic"
```

## 📚 Recursos y Enlaces

- **Cloud Run Documentation**: https://cloud.google.com/run/docs
- **Cloud SQL Documentation**: https://cloud.google.com/sql/docs
- **Secret Manager**: https://cloud.google.com/secret-manager/docs
- **Pricing Calculator**: https://cloud.google.com/products/calculator

---

## 🎯 Resumen del Despliegue

1. **Preparar**: Dockerfiles, requirements, configuraciones
2. **Database**: Cloud SQL PostgreSQL con schema aplicado
3. **Secretos**: Variables seguras en Secret Manager
4. **Construcción**: Imágenes Docker para API y Frontend
5. **Despliegue**: Cloud Run para ambos servicios
6. **Configuración**: URLs, dominios, monitoreo
7. **Testing**: Verificar funcionalidad completa

**¡Tu aplicación PER estará corriendo en Google Cloud con alta disponibilidad y escalabilidad automática! 🚀⚓**
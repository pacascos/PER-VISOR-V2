# 🚢 PER_Visor_Final - Sistema de Exámenes Náuticos

Sistema completo para visualización y gestión de exámenes náuticos con explicaciones inteligentes generadas por GPT-5.

## 🎯 Características Principales

- **Visor Web Interactivo**: Navegación por preguntas con filtros avanzados
- **Explicaciones Inteligentes**: Generación automática con GPT-5 y diagramas SVG
- **Edición de Preguntas**: Modificación de enunciados, opciones y respuestas
- **Base de Datos Completa**: 8 convocatorias (2023-2025) con 2782 preguntas
- **API Backend**: Servidor Flask para generación de explicaciones

## 🚀 Instalación desde cero

### 1. Requisitos
- Docker + Docker Compose v2 (opcional pero recomendado)
- Python 3.11+
- PostgreSQL 15 (local o Cloud SQL)
- Cuenta de OpenAI + clave API
- Google Cloud CLI (solo si vas a desplegar en GCP)

### 2. Clonar y preparar entorno
```bash
git clone https://github.com/pacascos/PER-VISOR-V2.git
cd PER-VISOR-V2
cp env.example .env   # Ajusta las claves en este archivo
```
Variables mínimas:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (por defecto `gpt-5-2025-08-07`)
- `JWT_SECRET`, `SECRET_KEY` y `DATABASE_URL` cuando despliegues el backend

📖 Más detalles: [OPENAI_CONFIG.md](OPENAI_CONFIG.md) y [CONFIGURACION_PROYECTO.md](CONFIGURACION_PROYECTO.md).

### 3. Base de datos (estructura + datos públicos)
```bash
# Crear BD local (opcional si usas Docker)
createdb per_exams

# Aplicar esquema completo
psql -U per_user -d per_exams -f sql/01_schema.sql

# Cargar datos públicos (preguntas, respuestas, estadísticas, etc.)
psql -U per_user -d per_exams -f sql/02_seed_public_data.sql
```
- Los datos sensibles (tabla `public.users`) no se incluyen; crea un `sql/03_seed_sensitive.sql` privado si lo necesitas.
- Para regenerar los scripts desde un backup: `python3 scripts/generate_public_sql.py`

### 4. Ejecución local

#### 4.1 Docker Compose (todo en contenedores)
```bash
docker compose up --build -d
docker compose ps
```
Servicios:
- `per_postgres` (BD PostgreSQL 15)
- `per_api` (Flask + Gunicorn)
- `per_web` (Nginx sirviendo `src/web`)

Gestión rápida:
```bash
docker compose logs -f api
docker compose restart api
docker compose down        # detiene todo
docker compose down -v     # elimina volúmenes
```

#### 4.2 Ejecución manual (sin Docker)
```bash
# Backend Flask
pip install -r requirements.txt
cd scripts/servidores
python3 api_postgresql.py

# Frontend estático
cd src/web
python3 -m http.server 8095
```

### 5. Endpoints locales
- Frontend: http://localhost:8095
- API health: http://localhost:5001/health
- API docs: http://localhost:5001/docs

### 6. Despliegue en Google Cloud Run + Cloud SQL

1. **Preparar proyecto GCP**  
   `gcloud init && gcloud config set project webpersonal-189221`  
   Habilita APIs: `cloudbuild`, `run`, `sqladmin`, `secretmanager`.

2. **Base de datos Cloud SQL**  
   - `gcloud sql instances create per-db-instance --database-version=POSTGRES_15 ...`
   - `gcloud sql users create per_user ...`
   - Importa el backup completo (`per_db_backup_YYYYMMDD.sql.gz`) o aplica `sql/01_schema.sql` + `sql/02_seed_public_data.sql`.

3. **Secret Manager**  
   Crea secretos `database-url`, `openai-api-key`, `jwt-secret`, `flask-secret-key`.

4. **Construir y subir imágenes**  
   ```bash
   gcloud auth configure-docker europe-west1-docker.pkg.dev
   docker build -t europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-api:latest .
   docker push europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-api:latest
   docker build -f frontend.Dockerfile -t europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-frontend:latest .
   docker push europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-frontend:latest
   ```

5. **Deploy Cloud Run**
   ```bash
   gcloud run deploy per-api \
     --image=europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-api:latest \
     --region=europe-west1 --allow-unauthenticated \
     --set-secrets="DATABASE_URL=database-url:latest" \
     --set-secrets="OPENAI_API_KEY=openai-api-key:latest" \
     --set-secrets="JWT_SECRET=jwt-secret:latest" \
     --set-secrets="SECRET_KEY=flask-secret-key:latest" \
     --add-cloudsql-instances=webpersonal-189221:europe-west1:per-db-instance

   gcloud run deploy per-frontend \
     --image=europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-frontend:latest \
     --region=europe-west1 --allow-unauthenticated
   ```

6. **Dominio y DNS**  
   Usa `gcloud beta run domain-mappings create --service=per-frontend --domain=bancotest.com`.

📚 Documentación detallada:  
- [DEPLOYMENT_GOOGLE_CLOUD.md](DEPLOYMENT_GOOGLE_CLOUD.md)  
- [docs/BACKUP_PLAN_2025-11-24.md](docs/BACKUP_PLAN_2025-11-24.md) (plan de apagado/restauración)  
- [docs/DB_SCRIPTS.md](docs/DB_SCRIPTS.md) (cómo mantener los dumps públicos)

## 📊 Datos Incluidos

- **8 Convocatorias**: 2023-2025 (Abril, Junio, Noviembre)
- **80 Exámenes**: PER, PNB, CY, PY
- **2782 Preguntas**: Con opciones y respuestas correctas
- **8 Explicaciones**: Migradas + generación automática

## 🛠️ Estructura del Proyecto

```
PER_Visor_Final/
├── src/web/                 # Frontend (HTML, CSS, JS)
├── scripts/servidores/      # Backend Flask API
├── data/json/              # Datos JSON unificados
├── data/pdfs/              # PDFs originales
└── docs/                   # Documentación técnica
```

## 🔧 Funcionalidades

### Visor Web
- Filtros por titulación, convocatoria y tema
- Búsqueda de texto en preguntas
- Navegación página por página
- Edición inline de preguntas
- Generación de explicaciones

### API Flask
- Generación de explicaciones con GPT-5
- Guardado persistente de cambios
- Sistema de backups automáticos
- Endpoints REST para todas las operaciones

## 🔒 Seguridad

- API keys en variables de entorno
- Archivos sensibles excluidos del repositorio
- Backups automáticos antes de modificaciones
- Validación de datos en frontend y backend

## 📝 Uso

1. **Visualizar Preguntas**: Usa los filtros para encontrar preguntas específicas
2. **Generar Explicaciones**: Haz clic en "Generar explicación" en cualquier pregunta
3. **Editar Preguntas**: Usa el botón "Editar" para modificar contenido
4. **Buscar**: Utiliza la barra de búsqueda para encontrar términos específicos

## 🐛 Solución de Problemas

### El servidor Flask no inicia
- Verifica que el puerto 5001 esté libre
- Asegúrate de tener configurada la API key de OpenAI

### Las explicaciones no se generan
- Verifica la conexión a internet
- Comprueba que la API key sea válida
- Revisa los logs del servidor Flask

### Los cambios no se guardan
- Verifica que el servidor Flask esté corriendo
- Comprueba los permisos de escritura en data/json/

## 📄 Licencia

Este proyecto es de uso educativo y personal.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request.

---

**Desarrollado con ❤️ para la comunidad náutica**
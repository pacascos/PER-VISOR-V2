# Mapa del Proyecto PER_Cloude

## Visión General

Sistema de gestión de exámenes PER (Patrón de Embarcaciones de Recreo) con frontend interactivo, backend API con PostgreSQL, y generación de explicaciones inteligentes mediante GPT.

## Arquitectura del Sistema

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Flask APIs     │────▶│   PostgreSQL    │
│  (Port 8095)    │     │  (Port 5001+)    │     │   Database      │
│                 │     │                  │     │                 │
│ - exam-system   │     │ - api_postgresql │     │ - Preguntas     │
│ - statistics    │     │ - api_explicaciones│   │ - Estadísticas  │
│ - admin panel   │     │ - statistics_api │     │ - Usuarios      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Estructura de Directorios

### 📁 src/ - Código Principal

#### src/web/ - Frontend del Sistema
```
src/web/
├── index.html                              # Landing page principal
├── exam-system.html / exam-system.js       # Sistema de exámenes (CORE)
├── admin-panel.html / admin-panel.js       # Panel de administración
├── statistics-dashboard.html               # Dashboard de estadísticas
├── statistics-manager.js                   # Gestor de estadísticas
├── question-statistics-dashboard.html      # Estadísticas por pregunta
├── question-statistics-tracker.js          # Tracking de preguntas
├── config.js                              # Configuración frontend
└── visor-nueva-arquitectura.html          # Nuevo visor (en desarrollo)
```

**Puntos clave:**
- `exam-system.html/js` es el corazón de la aplicación de exámenes
- `admin-panel.html/js` para gestión de contenido
- Todas las páginas se comunican con APIs en puerto 5001+

#### src/database/ - Esquemas de Base de Datos
```
src/database/
└── schema.sql                             # Esquema principal de BD
```

### 📁 scripts/ - Scripts y Servicios

#### scripts/servidores/ - Backend APIs
```
scripts/servidores/
├── api_postgresql.py                      # API principal CRUD de preguntas
├── api_explicaciones.py                   # Generación de explicaciones GPT
└── statistics_api.py                      # API de estadísticas de usuario
```

**APIs Disponibles:**
- **api_postgresql.py** (Puerto 5001): CRUD preguntas, temas, exámenes
- **api_explicaciones.py** (Puerto 5002): Generación de explicaciones IA
- **statistics_api.py** (Puerto 5003): Estadísticas de respuestas

#### scripts/database/ - Gestión de Base de Datos
```
scripts/database/
├── apply_statistics_schema.sh             # Aplicar schema de estadísticas
├── apply_question_statistics_schema.sh    # Schema de stats por pregunta
├── statistics_schema.sql                  # Schema SQL de estadísticas
├── question_statistics_schema.sql         # Schema SQL de stats preguntas
├── cloud-sql-proxy-setup.sh              # Setup Cloud SQL Proxy
├── setup-database-secrets.sh             # Configuración de secrets
└── migrations/                           # Migraciones de BD
```

#### scripts/ - Scripts de Utilidad (raíz)
```
scripts/
├── update_question_rankings.py            # Actualizar rankings de preguntas
├── backup.sh                             # Backup completo de BD
├── restore.sh                            # Restaurar desde backup
├── backup_before_test.sh                 # Backup antes de testing
├── security_check.sh                     # Validación de seguridad
└── control_servicios_gcloud.sh           # Control de servicios Cloud
```

### 📁 data/ - Datos del Sistema

```
data/
├── json/
│   ├── data_unificado_con_duplicados.json  # Dataset principal (9MB)
│   └── explicaciones.json                  # Explicaciones generadas (218KB)
├── pdf/                                    # PDFs originales (NO INDEXAR)
└── temporal/                              # Archivos temporales (NO INDEXAR)
```

### 📁 tests/ - Tests Automatizados

```
tests/
├── conftest.py                            # Configuración pytest
├── test_api/
│   └── test_endpoints.py                  # Tests de endpoints API
├── test_cache/
│   └── test_redis_cache.py               # Tests de caché Redis
└── test_database/
    └── test_repository.py                # Tests de repositorio BD
```

### 📁 backups/ - Backups de Base de Datos

```
backups/
└── backup_completo_YYYYMMDD_HHMMSS.sql   # Backups automáticos (NO INDEXAR)
```

## Puntos de Entrada del Sistema

### 1. Frontend Web
```bash
cd src/web && python3 -m http.server 8095
```
**Acceso:** http://localhost:8095

### 2. API PostgreSQL (Principal)
```bash
cd scripts/servidores && python3 api_postgresql.py
```
**Puerto:** 5001
**Endpoints:** `/preguntas`, `/temas`, `/examenes`

### 3. API Explicaciones (GPT)
```bash
cd scripts/servidores && python3 api_explicaciones.py
```
**Puerto:** 5002
**Endpoints:** `/generar-explicacion`, `/explicaciones`

### 4. API Estadísticas
```bash
cd scripts/servidores && python3 statistics_api.py
```
**Puerto:** 5003
**Endpoints:** `/statistics`, `/user-stats`

## Archivos de Configuración

```
PER_Cloude/
├── .claudeignore                          # Exclusiones para Claude Code
├── CLAUDE.md                             # Instrucciones para Claude Code
├── PROJECT_MAP.md                        # Este archivo - Mapa del proyecto
├── Makefile                              # Comandos de desarrollo
├── requirements.txt                      # Dependencias Python
├── config_example.py                     # Template de configuración
├── config.py                             # Configuración real (git-ignored)
├── .gitignore                            # Exclusiones de Git
└── README.md                             # Documentación principal
```

## Base de Datos PostgreSQL

### Tablas Principales

```sql
-- Estructura de datos
preguntas              # Preguntas de examen
├── id, numero_pregunta, enunciado
├── respuesta_a, respuesta_b, respuesta_c
├── respuesta_correcta, tema_id
└── explicacion, dificultad

temas                  # Temas de examen
├── id, numero, nombre
└── descripcion

examenes               # Exámenes generados
├── id, nombre, fecha_creacion
└── preguntas (JSON array)

-- Estadísticas de usuario
user_statistics        # Stats por usuario
├── user_id, question_id
├── correct_count, incorrect_count
├── last_answered, streak
└── difficulty_rating

question_statistics    # Stats globales por pregunta
├── question_id, total_attempts
├── correct_attempts, incorrect_attempts
├── success_rate, avg_response_time
└── difficulty_score
```

### Conexión a Base de Datos

```python
# Configuración en config.py
DB_CONFIG = {
    'host': 'localhost',  # o Cloud SQL Proxy
    'port': 5432,
    'database': 'per_exams',
    'user': 'per_user',
    'password': os.getenv('DB_PASSWORD')
}
```

## Buscar por Funcionalidad

| Necesitas... | Busca en... |
|--------------|-------------|
| **CRUD de preguntas** | `scripts/servidores/api_postgresql.py` |
| **Generar explicaciones GPT** | `scripts/servidores/api_explicaciones.py` |
| **Estadísticas de usuario** | `scripts/servidores/statistics_api.py` |
| **UI sistema de exámenes** | `src/web/exam-system.html` + `exam-system.js` |
| **Panel de administración** | `src/web/admin-panel.html` + `admin-panel.js` |
| **Dashboard estadísticas** | `src/web/statistics-dashboard.html` + `statistics-manager.js` |
| **Esquemas de BD** | `src/database/schema.sql` |
| **Migraciones de BD** | `scripts/database/migrations/` |
| **Backups/Restore** | `scripts/backup.sh`, `scripts/restore.sh` |
| **Tests automatizados** | `tests/` |
| **Configuración APIs** | `config.py` (crear desde `config_example.py`) |
| **Datos JSON legacy** | `data/json/data_unificado_con_duplicados.json` |

## Flujos de Trabajo Comunes

### Desarrollo Local

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Configurar base de datos
cd scripts/database
./apply_statistics_schema.sh
./apply_question_statistics_schema.sh

# 3. Iniciar servicios
# Terminal 1: Frontend
make web

# Terminal 2: API Principal
cd scripts/servidores && python3 api_postgresql.py

# Terminal 3: API Explicaciones
cd scripts/servidores && python3 api_explicaciones.py

# Terminal 4: API Estadísticas
cd scripts/servidores && python3 statistics_api.py
```

### Modificar Base de Datos

```bash
# ⚠️ SIEMPRE backup primero
./scripts/backup_before_test.sh

# Hacer cambios...
curl -X PUT http://localhost:5001/preguntas/123 -d '{"campo": "valor"}'

# Si algo sale mal:
make restore FILE=backup_test_20250930_120000.sql
```

### Deploy y Validación

```bash
# Validar seguridad
make security

# Crear backup completo
make backup

# Deploy (incluye validaciones)
make deploy
```

## Tecnologías Principales

### Backend
- **Python 3.8+**: Lenguaje principal
- **Flask**: Framework web para APIs
- **psycopg2**: Driver PostgreSQL
- **OpenAI API**: Generación de explicaciones (GPT-4)
- **Redis**: Caché de respuestas (opcional)

### Frontend
- **HTML5/CSS3**: Interfaz de usuario
- **JavaScript vanilla**: Lógica frontend (sin frameworks)
- **Fetch API**: Comunicación con backend

### Base de Datos
- **PostgreSQL**: Base de datos principal
- **Google Cloud SQL**: Hosting en producción

### DevOps
- **Docker**: Containerización de PostgreSQL
- **Google Cloud Platform**: Infraestructura en la nube
- **GitHub**: Control de versiones

## Convenciones de Código

### Python
```python
# Nombres de funciones: snake_case
def get_question_by_id(question_id: int) -> dict:
    pass

# Nombres de clases: PascalCase
class QuestionRepository:
    pass

# Constantes: UPPER_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3
```

### JavaScript
```javascript
// Nombres de funciones: camelCase
function loadQuestionData(questionId) {
    // ...
}

// Nombres de clases: PascalCase
class ExamSystem {
    // ...
}

// Constantes: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:5001';
```

### SQL
```sql
-- Tablas: snake_case, plural
CREATE TABLE user_statistics (...);

-- Columnas: snake_case
question_id, created_at, success_rate
```

## Seguridad

### Secrets y Variables de Entorno

```bash
# NUNCA en código
OPENAI_API_KEY=sk-xxx
DB_PASSWORD=xxx

# Usar siempre en config.py
import os
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
```

### Archivos Sensibles (en .gitignore)

- `config.py` - Configuración con secrets
- `.env` - Variables de entorno
- `backups/*.sql` - Backups de BD
- `data/pdf/*` - PDFs originales

## Testing

### Ejecutar Tests

```bash
# Todos los tests
pytest

# Tests específicos
pytest tests/test_api/
pytest tests/test_database/

# Con coverage
pytest --cov=scripts --cov=src
```

### Crear Nuevos Tests

```python
# tests/test_xxx/test_yyy.py
def test_nueva_funcionalidad():
    # Arrange
    data = setup_test_data()

    # Act
    result = function_to_test(data)

    # Assert
    assert result == expected_value
```

## Comandos Make Disponibles

```bash
make help          # Mostrar ayuda
make web           # Iniciar servidor web (puerto 8095)
make install       # Instalar dependencias
make test          # Ejecutar tests
make backup        # Backup completo de BD
make restore       # Restaurar desde backup
make security      # Validación de seguridad
make deploy        # Deploy con validaciones
make status        # Estado del repositorio
make clean         # Limpiar archivos temporales
make list-backups  # Listar backups disponibles
```

## Troubleshooting Rápido

### API no responde
```bash
# Verificar puertos en uso
lsof -i :5001
lsof -i :5002
lsof -i :5003

# Revisar logs
tail -f logs/api.log
```

### Base de datos no conecta
```bash
# Verificar PostgreSQL está corriendo
docker ps | grep postgres

# Verificar configuración
psql -h localhost -U per_user -d per_exams
```

### Frontend no carga datos
```bash
# Verificar CORS en APIs
# Verificar config.js tiene URLs correctas
cat src/web/config.js
```

## Recursos Adicionales

- **README.md**: Documentación general del proyecto
- **CLAUDE.md**: Buenas prácticas para trabajar con Claude Code
- **config_example.py**: Template de configuración
- **Makefile**: Comandos disponibles y sus implementaciones

---

**Última actualización:** 2025-09-30
**Versión del mapa:** 1.0
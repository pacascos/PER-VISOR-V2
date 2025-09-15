# CONOCIMIENTO CONSOLIDADO - PER VISOR 2.0
# APLICACIÓN COMPLETA DE EXÁMENES NÁUTICOS CON GPT-5

> **Versión:** 2.0 - PostgreSQL + Docker + GPT-5
> **Estado:** Completamente funcional
> **Fecha:** Septiembre 2025

## ARQUITECTURA GENERAL

### Stack Tecnológico
```
Frontend: HTML5 + Bootstrap 5 + JavaScript ES6
Backend: Flask + Python 3.8+
Base de Datos: PostgreSQL 14
Cache: Redis 7
Contenedores: Docker + Docker Compose
IA: OpenAI GPT-5 (modelo gpt-5-2025-08-07)
Servidor Web: Nginx (para archivos estáticos)
```

### Estructura de Contenedores
```yaml
# 4 servicios principales:
- postgres: Base de datos PostgreSQL con datos de exámenes
- redis: Cache para rendimiento
- api: Flask API (Python) que sirve datos desde PostgreSQL
- web: Nginx sirviendo archivos estáticos HTML/CSS/JS
```

## ESTRUCTURA DE DATOS

### Base de Datos PostgreSQL

#### Tabla `questions`
```sql
CREATE TABLE questions (
    id UUID PRIMARY KEY,
    exam_id UUID NOT NULL,
    numero_pregunta INTEGER,
    texto_pregunta TEXT NOT NULL,
    opciones JSONB NOT NULL,
    respuesta_correcta VARCHAR(1),
    anulada BOOLEAN DEFAULT false,
    categoria VARCHAR(255),
    subcategoria VARCHAR(255),
    exam_titulo VARCHAR(255),
    convocatoria VARCHAR(50),
    tipo_examen VARCHAR(50),
    imagen_pregunta TEXT,
    imagen_respuesta TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabla `question_explanations`
```sql
CREATE TABLE question_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID UNIQUE NOT NULL,
    explicacion TEXT NOT NULL,
    svg_content TEXT,
    generated_image TEXT,
    uploaded_image TEXT,
    image_prompt TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Estructura JSON de Pregunta
```json
{
    "id": "uuid-4",
    "exam_id": "uuid-4",
    "numero_pregunta": 1,
    "texto_pregunta": "¿Qué es el arganeo?",
    "opciones": {
        "a": "Texto opción A",
        "b": "Texto opción B",
        "c": "Texto opción C",
        "d": "Texto opción D"
    },
    "respuesta_correcta": "a",
    "anulada": false,
    "categoria": "Nomenclatura náutica",
    "subcategoria": null,
    "exam_titulo": "PER 2025-06-RECREO - Test 01",
    "convocatoria": "2025-06-RECREO",
    "tipo_examen": "PER_NORMAL"
}
```

### Estructura de Explicación GPT-5
```json
{
    "question_id": "uuid-4",
    "explicacion": "Markdown con explicación detallada...",
    "svg_content": "<svg>...</svg>",
    "generated_image": "base64-encoded-png",
    "uploaded_image": "base64-encoded-image",
    "image_prompt": "Prompt para generar imagen externa"
}
```

## API ENDPOINTS

### Servidor Flask (Puerto 5001)

#### GET /health
```json
{ "status": "healthy", "database": "connected" }
```

#### GET /examenes
```json
{
    "count": 154,
    "examenes": [
        {
            "id": "uuid",
            "convocatoria": "2025-06-RECREO",
            "metadata": {"numero_test": "01", "tipo": "PER_NORMAL"}
        }
    ]
}
```

#### GET /preguntas-filtradas
```json
{
    "count": 5356,
    "filters": {"convocatoria": "", "tema": "", "search_text": ""},
    "preguntas": [/* array de preguntas */]
}
```

#### POST /generar-explicacion
```json
// Request:
{"question_id": "uuid"}

// Response:
{
    "success": true,
    "explanation": {
        "explicacion": "markdown",
        "svg_content": "svg",
        "image_prompt": "prompt"
    }
}
```

## CONFIGURACIÓN GPT-5

### Implementación Correcta
```python
def call_gpt5(prompt):
    """Llama a GPT-5 usando el endpoint correcto"""
    url = 'https://api.openai.com/v1/responses'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {OPENAI_API_KEY}'
    }
    request_body = {
        'model': 'gpt-5-2025-08-07',
        'input': prompt
    }

    response = requests.post(url, headers=headers, json=request_body)
    data = response.json()

    # Extraer respuesta del formato específico GPT-5
    explanation_text = data['output'][1]['content'][0]['text']
    return explanation_text
```

### Prompt Template
```python
PROMPT_TEMPLATE = """
Eres un experto instructor náutico español especializado en exámenes PER.

PREGUNTA: {question_text}
OPCIONES: {options_text}
RESPUESTA CORRECTA: {correct_answer}

Genera una explicación completa en formato Markdown que incluya:

1. **Explicación detallada** (200-300 palabras)
2. **Diagrama SVG** si es útil
3. **Recordatorios clave** para el examen
4. **Errores comunes** a evitar

FORMATO DE SALIDA:
```markdown
# Explicación: [Tema]

## 🎯 Respuesta Correcta
**{correct_answer}**

## 📚 Explicación Detallada
[Explicación clara y pedagógica...]

## 📊 Diagrama (si aplica)
```svg
[SVG diagram]
```

## 🔑 Puntos Clave
- Punto 1
- Punto 2

## ⚠️ Errores Comunes
- Error típico 1
- Error típico 2
```

**IMAGE_PROMPT:** [Descripción para generar imagen externa]
"""
```

## ARQUITECTURA FRONTEND

### Estructura HTML Principal
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>PER VISOR 2.0 - Nueva Arquitectura</title>
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>
<body>
    <!-- Header con título y badge de estado -->
    <!-- Filtros: Convocatoria, Titulación, Test, Tema -->
    <!-- Estadísticas: Preguntas, Filtradas, PostgreSQL -->
    <!-- Lista de preguntas con botones de explicación -->
    <!-- Modales: Explicación (vista) y Edición (modificación) -->
</body>
</html>
```

### Clase JavaScript Principal
```javascript
class PERViewer {
    constructor() {
        this.examenes = [];
        this.allQuestions = [];
        this.filteredQuestions = [];
        this.explicaciones = {};
        this.currentPage = 1;
        this.questionsPerPage = 10;
        this.init();
    }

    async init() {
        await this.loadStats();
        await this.loadExplicaciones();
        await this.loadExamenes();
        this.setupEventListeners();
    }

    async loadExamenes() {
        const response = await fetch(API_BASE + '/examenes');
        const data = await response.json();
        this.examenes = data.examenes || [];

        this.initializeFilters();
        await this.loadAllQuestionsFromAllExams();
    }

    async loadAllQuestionsFromAllExams() {
        const response = await fetch(API_BASE + '/preguntas-filtradas');
        const data = await response.json();

        if (data.preguntas && Array.isArray(data.preguntas)) {
            this.allQuestions = data.preguntas;
            this.applyFilters();
            this.renderQuestions();
        }
    }
}
```

## CONFIGURACIÓN DOCKER

### docker-compose.yml
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: per_exams
      POSTGRES_USER: per_user
      POSTGRES_PASSWORD: per_password_change_me
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U per_user"]

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://per_user:per_password_change_me@postgres:5432/per_exams
      REDIS_URL: redis://redis:6379/0
      OPENAI_API_KEY: sk-proj-[KEY]
      OPENAI_MODEL: gpt-5-2025-08-07
    ports:
      - "5001:5001"
    depends_on:
      postgres:
        condition: service_healthy

  web:
    image: nginx:1.25-alpine
    volumes:
      - ./src/web:/usr/share/nginx/html:ro
    ports:
      - "8095:80"
```

## ESTRUCTURA DE ARCHIVOS

```
PER_Cloude/
├── src/
│   ├── web/
│   │   ├── visor-nueva-arquitectura.html    # Frontend principal
│   │   ├── favicon.svg                      # Icono ancla náutica
│   │   └── styles.css                       # Estilos (si separado)
│   └── database/
│       └── schema.sql                       # Esquema de base de datos
├── scripts/
│   └── servidores/
│       └── api_postgresql.py                # API Flask principal
├── docker-compose.yml                      # Configuración contenedores
├── Dockerfile                              # Imagen de la aplicación
├── requirements.txt                        # Dependencias Python
└── CLAUDE.md                              # Instrucciones para Claude
```

## FUNCIONALIDADES CLAVE

### 1. Sistema de Filtros
- **Convocatoria**: 16 opciones (2021-04 a 2025-06)
- **Titulación**: PER_NORMAL, PER_LIBERADO, PNB_NORMAL, PY_NORMAL, CY_NORMAL
- **Test**: 154 tests diferentes
- **Tema**: 11 categorías náuticas
- **Búsqueda**: Por ID de pregunta
- **Duplicados**: Toggle para incluir/excluir

### 2. Sistema de Explicaciones GPT-5
```javascript
async generateExplanation(questionId) {
    const response = await fetch(API_BASE + '/generar-explicacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId })
    });

    const data = await response.json();
    // Mostrar explicación con markdown, SVG e imagen
}
```

### 3. UI Separada: Vista vs Edición
- **Modal Explicación**: Solo visualización, sin controles de edición
- **Modal Edición**: Todas las funcionalidades de modificación
- **Separación clara**: Vista (👁️) vs Edición (✏️)

### 4. Sistema de Imágenes
```javascript
// Prioridad: uploaded_image > generated_image > svg_content
if (explanation.uploaded_image) {
    // Mostrar imagen subida por usuario
} else if (explanation.generated_image) {
    // Mostrar imagen PNG generada
} else if (explanation.svg_content) {
    // Mostrar diagrama SVG de GPT-5
}
```

## PATRONES DE CÓDIGO CRÍTICOS

### 1. Manejo de Estado
```javascript
// Cargar datos en orden específico
async init() {
    await this.loadStats();           // 1. Estadísticas
    await this.loadExplicaciones();   // 2. Explicaciones existentes
    await this.loadExamenes();        // 3. Exámenes y preguntas
    this.setupEventListeners();       // 4. Event listeners
}
```

### 2. Renderizado de Preguntas
```javascript
renderQuestions() {
    const start = (this.currentPage - 1) * this.questionsPerPage;
    const end = start + this.questionsPerPage;
    const pageQuestions = this.filteredQuestions.slice(start, end);

    const container = document.getElementById('questionsContainer');
    container.innerHTML = pageQuestions.map(question => `
        <div class="question-card">
            <!-- Estructura de pregunta -->
            <button onclick="viewer.generateExplanation('${question.id}')">
                💡 Explicación GPT-5
            </button>
        </div>
    `).join('');
}
```

### 3. Filtros Dinámicos
```javascript
applyFilters() {
    this.filteredQuestions = this.allQuestions.filter(question => {
        // Filtros por convocatoria, titulación, tema, etc.
        return convMatch && titulacionMatch && temaMatch && searchMatch;
    });

    this.updateStats();
    this.renderQuestions();
    this.renderPagination();
}
```

## COMANDOS DE DESPLIEGUE

### Inicialización
```bash
# 1. Clonar/acceder al proyecto
cd PER_Cloude/

# 2. Iniciar servicios
docker compose up -d postgres redis

# 3. Esperar a que PostgreSQL esté listo
docker compose logs postgres

# 4. Iniciar API y Web
docker compose up -d api web

# 5. Verificar estado
curl http://localhost:5001/health
curl http://localhost:8095/
```

### URLs de Acceso
- **Aplicación Web**: http://localhost:8095/visor-nueva-arquitectura.html
- **API Health**: http://localhost:5001/health
- **API Docs**: http://localhost:5001/examenes

## RESOLUCIÓN DE PROBLEMAS COMUNES

### 1. "No cargan preguntas"
```bash
# Verificar estado de servicios
docker ps
docker logs per_postgres
docker logs per_api

# Verificar datos
curl http://localhost:5001/examenes
curl http://localhost:5001/preguntas-filtradas
```

### 2. "Error de JavaScript"
```javascript
// Verificar en consola del navegador
console.log('viewer exists:', typeof window.viewer)
console.log('questions loaded:', viewer?.allQuestions?.length)
```

### 3. "GPT-5 no funciona"
```python
# Verificar configuración
OPENAI_API_KEY = "sk-proj-..."
OPENAI_MODEL = "gpt-5-2025-08-07"
url = 'https://api.openai.com/v1/responses'  # Endpoint correcto
```

## DATOS DE EJEMPLO

### Estadísticas Típicas
- **Exámenes**: 154
- **Preguntas**: 5,356
- **Explicaciones**: 38+ (creciendo)
- **Convocatorias**: 16 (2021-2025)
- **Categorías**: 11 temáticas náuticas

### Convocatorias Disponibles
```json
[
    "2025-06-RECREO", "2025-04-RECREO",
    "2024-11-RECREO", "2024-06-RECREO", "2024-04-RECREO",
    "2023-11-RECREO", "2023-06-RECREO", "2023-04-RECREO",
    "2022-12-RECREO", "2022-10-RECREO", "2022-06-RECREO", "2022-04-RECREO",
    "2021-12-RECREO", "2021-10-RECREO", "2021-07-RECREO", "2021-04-RECREO"
]
```

### Categorías Temáticas
```json
[
    "Nomenclatura náutica",
    "Elementos de amarre y fondeo",
    "Seguridad",
    "Legislación",
    "Balizamiento",
    "Reglamento (RIPA)",
    "Maniobra y navegación",
    "Emergencias en la mar",
    "Meteorología",
    "Teoría de la navegación",
    "Carta de navegación"
]
```

## FUTURAS MEJORAS PLANIFICADAS

### Funcionalidades Pendientes
1. **Gestión de imágenes en modal de edición**: Reimplement setupEditImageManagement
2. **Exportación de datos**: PDF, Excel
3. **Estadísticas avanzadas**: Gráficos de rendimiento
4. **Modo offline**: Service Workers + Cache
5. **Configuración de usuario**: Preferencias guardadas

### Optimizaciones Técnicas
1. **Lazy loading**: Cargar preguntas bajo demanda
2. **Índices de búsqueda**: Elasticsearch o similar
3. **CDN**: Para archivos estáticos
4. **Monitoring**: Logs estructurados + métricas

---

## PROMPT DE REGENERACIÓN

Para regenerar esta aplicación desde cero, usar:

```
Crea una aplicación web completa para exámenes náuticos PER con:

ARQUITECTURA:
- Frontend: HTML + Bootstrap + JavaScript
- Backend: Flask API + PostgreSQL + Redis
- Despliegue: Docker Compose
- IA: GPT-5 para explicaciones inteligentes

FUNCIONALIDADES:
- Visualización de 5000+ preguntas de exámenes PER
- Filtros: convocatoria, titulación, tema, búsqueda
- Sistema de explicaciones generadas por GPT-5 con markdown + SVG
- Modales separados: vista (solo lectura) vs edición
- Sistema de imágenes: subidas + generadas + SVG
- Paginación y estadísticas en tiempo real

DATOS:
- PostgreSQL con tablas questions y question_explanations
- 154 exámenes, 16 convocatorias (2021-2025)
- 11 categorías náuticas temáticas
- GPT-5 endpoint: https://api.openai.com/v1/responses
- Modelo: gpt-5-2025-08-07

ESPECIFICACIONES TÉCNICAS:
[Usar toda la información de este documento como referencia]
```

---
**© 2025 - PER VISOR 2.0 - Aplicación completa y funcional**
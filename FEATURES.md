# Funcionalidades del Sistema PER

Documentación completa de todas las funcionalidades (features) del sistema de gestión de exámenes PER (Patrón de Embarcaciones de Recreo).

**Última actualización:** 2025-09-30

---

## 📑 Índice por Categoría

1. [🔐 Autenticación y Gestión de Usuarios](#-autenticación-y-gestión-de-usuarios)
2. [📝 Sistema de Exámenes](#-sistema-de-exámenes)
3. [📚 Banco de Preguntas](#-banco-de-preguntas)
4. [🤖 Explicaciones Inteligentes (GPT-5)](#-explicaciones-inteligentes-gpt-5)
5. [📊 Estadísticas y Gamificación](#-estadísticas-y-gamificación)
6. [👨‍💼 Panel de Administración](#-panel-de-administración)
7. [🔍 Búsqueda y Filtrado](#-búsqueda-y-filtrado)
8. [💾 Gestión de Datos](#-gestión-de-datos)
9. [☁️ Infraestructura y DevOps](#️-infraestructura-y-devops)
10. [🎨 Interfaz de Usuario](#-interfaz-de-usuario)

---

## 🔐 Autenticación y Gestión de Usuarios

### Feature 1.1: Registro de Usuarios
**Archivo:** `scripts/servidores/api_postgresql.py:1217`
**Frontend:** `src/web/exam-system.js:179`

**Descripción:** Sistema completo de registro de nuevos usuarios.

**Funcionalidades:**
- Registro con username, email y password
- Validación de campos obligatorios
- Hash seguro de contraseñas (SHA-256)
- Generación automática de JWT token
- Prevención de duplicados (username único)
- Asignación de rol por defecto: 'student'

**API Endpoint:**
```http
POST /auth/register
Content-Type: application/json

{
  "username": "usuario",
  "email": "usuario@example.com",
  "password": "contraseña_segura"
}

Response: {
  "token": "jwt_token...",
  "user": {
    "id": 1,
    "username": "usuario",
    "email": "usuario@example.com",
    "role": "student"
  }
}
```

---

### Feature 1.2: Login de Usuarios
**Archivo:** `scripts/servidores/api_postgresql.py:1290`
**Frontend:** `src/web/exam-system.js:135`

**Descripción:** Sistema de autenticación con JWT.

**Funcionalidades:**
- Login con username/password
- Verificación de contraseña hasheada
- Generación de JWT token con expiración (24h)
- Sesión persistente en localStorage
- Validación de usuarios activos

**API Endpoint:**
```http
POST /auth/login
Content-Type: application/json

{
  "username": "usuario",
  "password": "contraseña"
}

Response: {
  "token": "jwt_token...",
  "user": {...}
}
```

---

### Feature 1.3: Verificación de Token
**Archivo:** `scripts/servidores/api_postgresql.py:1351`
**Frontend:** `src/web/exam-system.js:94`

**Descripción:** Validación de sesión activa.

**Funcionalidades:**
- Verificación de JWT token en cada request
- Auto-logout si token expirado
- Restauración de sesión al recargar página
- Middleware de autenticación para rutas protegidas

**API Endpoint:**
```http
GET /auth/me
Authorization: Bearer {token}

Response: {
  "user": {
    "id": 1,
    "username": "usuario",
    "email": "...",
    "role": "student",
    "registration_date": "..."
  }
}
```

---

### Feature 1.4: Gestión de Roles
**Archivo:** `scripts/servidores/api_postgresql.py:124`

**Descripción:** Sistema de roles y permisos.

**Roles disponibles:**
- **student**: Usuario estándar (registro, exámenes, estadísticas)
- **admin**: Administrador (todas las funcionalidades + gestión de usuarios)

**Funcionalidades:**
- Decorador `@require_admin` para rutas protegidas
- Verificación de rol en cada operación administrativa
- Prevención de escalada de privilegios

---

## 📝 Sistema de Exámenes

### Feature 2.1: Generación de Exámenes
**Archivo:** `scripts/servidores/api_postgresql.py:1863`
**Frontend:** `src/web/exam-system.js:54`

**Descripción:** Generación inteligente de exámenes personalizados.

**Funcionalidades:**
- Generación con parámetros configurables:
  - Temas específicos o todos
  - Convocatorias específicas
  - Número de preguntas (por defecto 45)
  - Balance automático por Unidades Temáticas
- Selección aleatoria de preguntas
- Exclusión de preguntas anuladas
- Generación de ID único por examen
- Timestamp de inicio

**Configuración por UT (Unidad Temática):**
```javascript
UT1: 4 preguntas   (Nomenclatura)
UT2: 4 preguntas   (Elementos de amarre y fondeo)
UT3: 5 preguntas   (Seguridad en la mar)
UT4: 5 preguntas   (Legislación)
UT5: 4 preguntas   (Balizamiento)
UT6: 4 preguntas   (Reglamento de abordajes)
UT7: 3 preguntas   (Maniobras)
UT8: 5 preguntas   (Propulsión mecánica)
UT9: 4 preguntas   (Meteorología)
UT10: 4 preguntas  (Teoría de navegación)
UT11: 3 preguntas  (Carta de navegación)
```

**API Endpoint:**
```http
POST /exams/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "tema_id": null,        // null = todos los temas
  "convocatoria": null,   // null = todas las convocatorias
  "num_preguntas": 45
}

Response: {
  "exam_id": "uuid...",
  "total_questions": 45,
  "questions": [...],
  "started_at": "2025-09-30T12:00:00Z",
  "ut_distribution": {
    "UT1": 4,
    "UT2": 4,
    ...
  }
}
```

---

### Feature 2.2: Realización de Examen
**Archivo:** `src/web/exam-system.js:400`

**Descripción:** Interfaz interactiva para realizar exámenes.

**Funcionalidades:**
- Navegación entre preguntas (anterior/siguiente)
- Selección de respuestas (A, B, C)
- Indicador visual de preguntas respondidas
- Temporizador de 90 minutos
- Contador de tiempo por pregunta
- Posibilidad de revisar/cambiar respuestas
- Mapa de navegación rápida
- Botón de pausa de examen
- Confirmación antes de finalizar

**Controles:**
```
[← Anterior] [Siguiente →] [Pausar] [Finalizar Examen]
```

---

### Feature 2.3: Evaluación de Examen
**Archivo:** `scripts/servidores/api_postgresql.py:2112`
**Frontend:** `src/web/exam-system.js:500`

**Descripción:** Sistema de evaluación automática con análisis detallado.

**Funcionalidades:**
- Corrección automática de respuestas
- Cálculo de nota global (0-100)
- Análisis por Unidad Temática (UT):
  - Preguntas correctas/totales por UT
  - Porcentaje de acierto por UT
  - Identificación de UTs aprobadas/suspendidas
- Determinación de aprobado/suspenso:
  - Mínimo 24/45 preguntas correctas (53.33%)
  - Mínimo 1 pregunta correcta en cada UT
- Cálculo de tiempo empleado
- Registro en base de datos
- Actualización de estadísticas de usuario

**Criterios de Aprobado:**
1. Score global ≥ 53.33% (24/45 preguntas)
2. Al menos 1 pregunta correcta en CADA UT

**API Endpoint:**
```http
POST /exams/{exam_id}/submit
Authorization: Bearer {token}
Content-Type: application/json

{
  "answers": {
    "question_id_1": "A",
    "question_id_2": "B",
    ...
  },
  "time_per_question": {
    "question_id_1": 45,  // segundos
    "question_id_2": 67,
    ...
  }
}

Response: {
  "score": 82.22,
  "passed": true,
  "correct_answers": 37,
  "total_questions": 45,
  "time_taken_minutes": 78,
  "ut_results": {
    "UT1": {
      "correct": 4,
      "total": 4,
      "percentage": 100.0,
      "passed": true
    },
    ...
  },
  "failed_uts": [],
  "detailed_results": [...]
}
```

---

### Feature 2.4: Historial de Exámenes
**Archivo:** `scripts/servidores/api_postgresql.py:2332`
**Frontend:** `src/web/exam-system.js:800`

**Descripción:** Historial completo de exámenes realizados.

**Funcionalidades:**
- Lista de todos los exámenes del usuario
- Ordenación por fecha (más recientes primero)
- Información por examen:
  - Fecha y hora
  - Puntuación
  - Estado (aprobado/suspenso)
  - Tiempo empleado
  - Número de preguntas
- Filtrado por rango de fechas
- Visualización de detalles de examen pasado

**API Endpoint:**
```http
GET /user/exams
Authorization: Bearer {token}

Response: {
  "exams": [
    {
      "id": 1,
      "score": 82.22,
      "time_taken_minutes": 78,
      "question_count": 45,
      "status": "completed",
      "started_at": "...",
      "completed_at": "..."
    },
    ...
  ]
}
```

---

### Feature 2.5: Análisis de Preguntas Falladas
**Archivo:** `scripts/servidores/api_postgresql.py:2260`
**Frontend:** `src/web/exam-system.js:900`

**Descripción:** Sistema de revisión de errores por examen.

**Funcionalidades:**
- Lista de preguntas falladas en un examen
- Visualización de:
  - Pregunta completa
  - Respuesta del usuario
  - Respuesta correcta
  - Explicación (si disponible)
  - Tema y UT
- Generación de explicaciones bajo demanda
- Modo de estudio de errores

**API Endpoint:**
```http
GET /user/exam/{exam_id}/failed-questions
Authorization: Bearer {token}

Response: {
  "exam_id": "uuid...",
  "total_failed": 8,
  "failed_questions": [
    {
      "question_id": "123",
      "enunciado": "...",
      "opciones": [...],
      "user_answer": "A",
      "correct_answer": "B",
      "explicacion": "...",
      "tema": "UT3",
      "time_spent": 45
    },
    ...
  ]
}
```

---

## 📚 Banco de Preguntas

### Feature 3.1: Visualización de Preguntas
**Archivo:** `src/web/visor-nueva-arquitectura.html`

**Descripción:** Visor interactivo del banco completo de preguntas.

**Funcionalidades:**
- Listado paginado de todas las preguntas
- Vista detallada de cada pregunta:
  - Enunciado
  - 3 opciones de respuesta
  - Respuesta correcta marcada
  - Tema y convocatoria
  - Estado (anulada/activa)
- Imágenes asociadas (si existen)
- Explicaciones disponibles

---

### Feature 3.2: Búsqueda de Preguntas
**Archivo:** `scripts/servidores/api_postgresql.py:352`

**Descripción:** Sistema avanzado de búsqueda y filtrado.

**Funcionalidades:**
- Búsqueda por texto en enunciado/opciones
- Filtrado por tema (UT1-UT11)
- Filtrado por convocatoria
- Filtrado por estado (anulada/activa)
- Combinación de múltiples filtros
- Búsqueda case-insensitive
- Búsqueda en múltiples campos simultáneamente

**API Endpoint:**
```http
GET /preguntas-filtradas?tema=UT3&search=boya&convocatoria=2023

Response: {
  "preguntas": [...],
  "total": 42,
  "filters_applied": {
    "tema": "UT3",
    "search": "boya",
    "convocatoria": "2023"
  }
}
```

---

### Feature 3.3: Obtener Pregunta Individual
**Archivo:** `scripts/servidores/api_postgresql.py:770`

**Descripción:** Recuperación de pregunta específica con todos sus detalles.

**Funcionalidades:**
- Obtención por ID único
- Datos completos de la pregunta
- Opciones con orden preservado
- Explicación asociada (si existe)
- Metadatos (tema, convocatoria, dificultad)
- Imágenes asociadas

**API Endpoint:**
```http
GET /preguntas-individual/{question_id}

Response: {
  "id": 123,
  "numero_pregunta": 45,
  "enunciado": "...",
  "opciones": [
    {"letra": "A", "texto": "...", "es_correcta": false},
    {"letra": "B", "texto": "...", "es_correcta": true},
    {"letra": "C", "texto": "...", "es_correcta": false}
  ],
  "tema_numero": 3,
  "tema_nombre": "Seguridad en la mar",
  "convocatoria": "2024-06",
  "dificultad": "media",
  "anulada": false,
  "explicacion": "...",
  "imagen_url": "/images/pregunta_123.png"
}
```

---

### Feature 3.4: Edición de Preguntas
**Archivo:** `scripts/servidores/api_postgresql.py:880`
**Frontend:** `src/web/admin-panel.js:200`

**Descripción:** Edición completa de preguntas (solo administradores).

**Funcionalidades:**
- Modificación de enunciado
- Edición de opciones de respuesta
- Cambio de respuesta correcta
- Actualización de tema/convocatoria
- Marcar/desmarcar como anulada
- Actualización de dificultad
- Gestión de imágenes asociadas
- Historial de cambios

**API Endpoint:**
```http
PUT /preguntas/{question_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "enunciado": "Nuevo enunciado...",
  "opciones": [
    {"letra": "A", "texto": "...", "es_correcta": true},
    {"letra": "B", "texto": "...", "es_correcta": false},
    {"letra": "C", "texto": "...", "es_correcta": false}
  ],
  "tema_numero": 5,
  "anulada": false,
  "dificultad": "alta"
}

Response: {
  "success": true,
  "question_id": 123,
  "updated_fields": ["enunciado", "opciones"]
}
```

---

## 🤖 Explicaciones Inteligentes (GPT-5)

### Feature 4.1: Generación de Explicaciones
**Archivo:** `scripts/servidores/api_postgresql.py:477`
**API Alternativa:** `scripts/servidores/api_explicaciones.py`

**Descripción:** Generación automática de explicaciones didácticas usando GPT-5.

**Funcionalidades:**
- Generación bajo demanda por pregunta
- Contexto completo (pregunta + opciones)
- Explicaciones didácticas y detalladas
- Formato markdown estructurado
- Caché de explicaciones generadas
- Estimación de costes API
- Reintentos automáticos en caso de error

**Prompt GPT-5:**
```
Eres un instructor náutico experto en España. Explica por qué la
respuesta correcta es [X] para la siguiente pregunta del examen PER.

Proporciona:
1. Explicación de la respuesta correcta
2. Por qué las otras opciones son incorrectas
3. Conceptos clave relacionados
4. Referencias normativas si aplica

Pregunta: [enunciado]
Opciones: [A, B, C]
Respuesta correcta: [letra]
```

**API Endpoint:**
```http
POST /generar-explicacion
Content-Type: application/json

{
  "pregunta_id": "123",
  "pregunta": "...",
  "opciones": {...},
  "respuesta_correcta": "B"
}

Response: {
  "explicacion": "# Explicación\n\n...",
  "pregunta_id": "123",
  "cached": false,
  "generated_at": "2025-09-30T12:00:00Z"
}
```

---

### Feature 4.2: Gestión de Explicaciones
**Archivo:** `scripts/servidores/api_postgresql.py:397`

**Descripción:** Sistema de almacenamiento y recuperación de explicaciones.

**Funcionalidades:**
- Almacenamiento en PostgreSQL
- Recuperación por pregunta_id
- Actualización manual de explicaciones
- Eliminación de explicaciones
- Exportación a JSON
- Sincronización con archivo legacy

**API Endpoints:**
```http
# Obtener todas las explicaciones
GET /explicaciones
Response: {
  "explicaciones": [
    {
      "pregunta_id": "123",
      "explicacion": "...",
      "created_at": "...",
      "updated_at": "..."
    },
    ...
  ],
  "total": 342
}

# Guardar/actualizar explicación
PUT /guardar-explicacion
{
  "pregunta_id": "123",
  "explicacion": "Nueva explicación..."
}

# Borrar explicación
DELETE /borrar-explicacion?pregunta_id=123
```

---

### Feature 4.3: Generación de Imágenes Técnicas
**Archivo:** `scripts/servidores/api_postgresql.py:934`

**Descripción:** Generación de diagramas y esquemas náuticos con GPT-5.

**Funcionalidades:**
- Generación de imágenes PNG (1024x1024)
- Estilo técnico náutico profesional
- Paleta de colores náutica (azul marino, gris, blanco)
- Formato base64 o archivo PNG
- Almacenamiento en servidor
- Asociación automática con preguntas

**Tipos de imágenes:**
- Diagramas de balizamiento
- Esquemas de maniobras
- Ilustraciones de seguridad
- Mapas de navegación
- Elementos de nomenclatura

**API Endpoint:**
```http
POST /generar-imagen-png
Content-Type: application/json

{
  "image_prompt": "Diagrama de una boya cardinal norte...",
  "pregunta_id": "123"
}

Response: {
  "image_url": "/images/pregunta_123.png",
  "image_base64": "data:image/png;base64,...",
  "description": "Diagrama técnico de boya cardinal norte"
}
```

---

### Feature 4.4: Gestión de Imágenes
**Archivo:** `scripts/servidores/api_postgresql.py:989`

**Descripción:** Sistema de carga y gestión de imágenes.

**Funcionalidades:**
- Carga de imágenes (PNG, JPG, SVG)
- Validación de formato y tamaño
- Compresión automática
- Almacenamiento en `src/web/images/`
- Asociación con preguntas
- Servicio de imágenes estáticas
- Limpieza de imágenes antiguas

**API Endpoints:**
```http
# Subir imagen
POST /subir-imagen
Content-Type: multipart/form-data

file: [binary]
pregunta_id: "123"

Response: {
  "image_url": "/images/pregunta_123_timestamp.png",
  "filename": "pregunta_123_timestamp.png"
}

# Servir imagen
GET /images/{filename}
Response: [binary image]
```

---

## 📊 Estadísticas y Gamificación

### Feature 5.1: Sistema de Niveles y XP
**Archivo:** `scripts/servidores/statistics_api.py:85`
**Schema:** `scripts/database/statistics_schema.sql:7`

**Descripción:** Sistema de progresión gamificado.

**Funcionalidades:**
- Sistema de niveles (1-∞)
- Puntos de experiencia (XP)
- Cálculo automático de nivel según XP
- Progresión exponencial:
  - Nivel 1→2: 500 XP
  - Nivel 2→3: 600 XP
  - Nivel N→N+1: 500 + (N * 100) XP
- XP por actividad:
  - Completar examen: 50-200 XP (según nota)
  - Racha diaria: 10 XP/día
  - Logro desbloqueado: 50-500 XP (según logro)

**Tabla:** `user_statistics`
```sql
level: INTEGER
total_xp: INTEGER
exams_completed: INTEGER
```

---

### Feature 5.2: Sistema de Logros (Achievements)
**Archivo:** `scripts/servidores/statistics_api.py:200`
**Schema:** `scripts/database/statistics_schema.sql:88`

**Descripción:** Sistema de logros desbloqueables.

**Logros Disponibles:**

| Logro ID | Nombre | Requisito | XP |
|----------|--------|-----------|-----|
| `first_exam` | Primer Examen | Completar 1 examen | 50 |
| `exam_master` | Maestro de Exámenes | Completar 10 exámenes | 200 |
| `perfectionist` | Perfeccionista | Obtener 100% en un examen | 500 |
| `week_streak` | Racha Semanal | 7 días consecutivos estudiando | 150 |
| `month_streak` | Racha Mensual | 30 días consecutivos | 500 |
| `ut_master_1` | Maestro UT1 | 90%+ en UT1 en 5 exámenes | 100 |
| `speed_demon` | Demonio de Velocidad | Completar examen en <45 min | 150 |
| `comeback_king` | Rey del Regreso | Aprobar tras 3 suspensos | 200 |

**Funcionalidades:**
- Detección automática de logros
- Notificaciones en tiempo real
- Progreso hacia logros pendientes
- Historial de desbloqueos
- Recompensas en XP

**Tablas:**
- `user_achievements`: Logros desbloqueados
- `achievement_progress`: Progreso hacia logros

---

### Feature 5.3: Rachas Diarias (Streaks)
**Archivo:** `scripts/servidores/statistics_api.py:300`
**Frontend:** `src/web/statistics-dashboard.html`

**Descripción:** Sistema de motivación por actividad diaria.

**Funcionalidades:**
- Contador de días consecutivos
- Racha actual (daily_streak_count)
- Racha más larga (longest_streak)
- Reseteo automático si no hay actividad
- Bonificación de XP por racha
- Calendario visual de actividad
- Notificaciones de racha en riesgo

**Bonificaciones:**
```
Día 1-6: +10 XP/día
Día 7: +50 XP (logro "Racha Semanal")
Día 30: +200 XP (logro "Racha Mensual")
```

---

### Feature 5.4: Estadísticas Detalladas por Usuario
**Archivo:** `scripts/servidores/statistics_api.py:85`
**Frontend:** `src/web/statistics-dashboard.html`

**Descripción:** Dashboard completo de progreso personal.

**Métricas Disponibles:**

**Generales:**
- Nivel y XP actual/necesario
- Exámenes completados
- Preguntas respondidas totales
- Ratio de acierto global
- Tiempo de estudio total
- Racha actual y récord

**Por Examen:**
- Puntuaciones históricas
- Evolución temporal (gráfico)
- Mejor/peor puntuación
- Promedio de notas
- Tasa de aprobados
- Tiempo promedio por examen

**Por Tema (UT):**
- Rendimiento por UT (%)
- Temas dominados (>90%)
- Temas débiles (<60%)
- Preguntas por tema
- Evolución por tema

**Por Pregunta:**
- Preguntas más falladas
- Preguntas nunca acertadas
- Historial de respuestas

**API Endpoint:**
```http
GET /api/statistics/user/{user_id}
Authorization: Bearer {token}

Response: {
  "user_id": 1,
  "level": 5,
  "total_xp": 2340,
  "xp_for_next_level": 160,
  "exams_completed": 12,
  "total_questions_answered": 540,
  "correct_answers": 458,
  "accuracy_rate": 84.81,
  "study_time_minutes": 720,
  "daily_streak": 8,
  "longest_streak": 15,
  "achievements_unlocked": 6,
  "recent_exams": [...],
  "ut_performance": {
    "UT1": {"correct": 45, "total": 48, "percentage": 93.75},
    "UT2": {"correct": 38, "total": 48, "percentage": 79.17},
    ...
  },
  "weak_topics": ["UT7", "UT11"],
  "strong_topics": ["UT1", "UT3", "UT5"]
}
```

---

### Feature 5.5: Estadísticas por Pregunta
**Archivo:** `scripts/database/question_statistics_schema.sql`
**Frontend:** `src/web/question-statistics-dashboard.html`

**Descripción:** Análisis global de dificultad de cada pregunta.

**Métricas por Pregunta:**
- Veces intentada (total_attempts)
- Veces acertada (correct_attempts)
- Veces fallada (incorrect_attempts)
- Tasa de éxito (success_rate)
- Tiempo promedio de respuesta
- Puntuación de dificultad (0-100)
- Última actualización

**Funcionalidades:**
- Ranking de preguntas más difíciles
- Ranking de preguntas más fáciles
- Preguntas que necesitan revisión (<40% éxito)
- Actualización en tiempo real
- Filtrado por tema

**Tabla:** `question_statistics`
```sql
question_id: VARCHAR(100)
total_attempts: INTEGER
correct_attempts: INTEGER
incorrect_attempts: INTEGER
success_rate: DECIMAL(5,2)
avg_response_time: INTEGER
difficulty_score: DECIMAL(5,2)
last_updated: TIMESTAMP
```

**Frontend:** `src/web/question-statistics-dashboard.html`

---

### Feature 5.6: Análisis de Temas Débiles
**Archivo:** `scripts/database/statistics_schema.sql:140`
**API:** `scripts/servidores/statistics_api.py:400`

**Descripción:** Sistema de recomendaciones personalizadas.

**Funcionalidades:**
- Identificación automática de temas débiles
- Cálculo de "weakness_score" (0-100)
- Priorización de áreas de mejora:
  - Alta: <50% de acierto
  - Media: 50-70% de acierto
  - Baja: 70-90% de acierto
- Recomendaciones de estudio
- Tracking de progreso en temas débiles

**Tabla:** `user_weak_topics`
```sql
user_id: INTEGER
category: VARCHAR(50)  -- UT1, UT2, etc.
weakness_score: DECIMAL(5,2)
recent_performance: DECIMAL(5,2)
questions_attempted: INTEGER
questions_correct: INTEGER
recommendation_priority: INTEGER  -- 1=high, 2=medium, 3=low
```

---

## 👨‍💼 Panel de Administración

### Feature 6.1: Gestión de Usuarios
**Archivo:** `scripts/servidores/api_postgresql.py:1392`
**Frontend:** `src/web/admin-panel.html`

**Descripción:** Panel completo de administración de usuarios.

**Funcionalidades:**

**Listar Usuarios:**
- Vista de todos los usuarios registrados
- Información visible:
  - Username, email, rol
  - Fecha de registro
  - Estado (activo/inactivo)
  - Última actividad
  - Estadísticas básicas
- Paginación
- Búsqueda por nombre/email
- Filtrado por rol

**Crear Usuario:**
- Creación manual de usuarios
- Asignación de rol (student/admin)
- Generación de contraseña temporal
- Envío de credenciales (opcional)

**Editar Usuario:**
- Modificar email
- Cambiar rol
- Activar/desactivar cuenta
- Resetear contraseña
- Actualizar información

**Eliminar Usuario:**
- Eliminación de cuenta
- Confirmación obligatoria
- Preservación de datos estadísticos (opcional)
- Eliminación en cascada de datos relacionados

**API Endpoints:**
```http
GET /admin/users
POST /admin/users
PUT /admin/users/{user_id}
DELETE /admin/users/{user_id}
```

---

### Feature 6.2: Estadísticas Globales
**Archivo:** `scripts/servidores/api_postgresql.py:1613`
**Frontend:** `src/web/admin-panel.html`

**Descripción:** Dashboard de estadísticas del sistema completo.

**Métricas del Sistema:**
- Total de usuarios registrados
- Usuarios activos (últimos 30 días)
- Total de exámenes realizados
- Total de preguntas en banco
- Preguntas anuladas
- Explicaciones generadas
- Tasa de aprobados global
- Puntuación promedio
- Tiempo promedio por examen
- Temas más/menos dominados

**Gráficos:**
- Evolución de registros
- Actividad diaria/semanal/mensual
- Distribución de niveles
- Rendimiento por tema
- Ranking de usuarios top

**API Endpoint:**
```http
GET /admin/stats
Authorization: Bearer {admin_token}

Response: {
  "total_users": 342,
  "active_users_30d": 156,
  "total_exams": 3421,
  "total_questions": 1247,
  "avg_score": 76.5,
  "pass_rate": 68.3,
  "explanations_generated": 856,
  "top_performers": [...],
  "activity_by_day": [...]
}
```

---

### Feature 6.3: Gestión del Banco de Preguntas
**Archivo:** `src/web/admin-panel.html`

**Descripción:** Herramientas de administración del banco de preguntas.

**Funcionalidades:**
- Vista de todas las preguntas
- Edición inline de preguntas
- Creación de nuevas preguntas
- Anular/reactivar preguntas
- Asignación de temas
- Gestión de imágenes
- Generación masiva de explicaciones
- Importación/exportación de preguntas
- Análisis de duplicados
- Validación de formato

---

## 🔍 Búsqueda y Filtrado

### Feature 7.1: Filtrado Avanzado de Preguntas
**Archivo:** `scripts/servidores/api_postgresql.py:352`

**Descripción:** Sistema completo de filtros combinables.

**Filtros Disponibles:**

**Por Tema:**
- UT1: Nomenclatura náutica
- UT2: Elementos de amarre y fondeo
- UT3: Seguridad en la mar
- UT4: Legislación
- UT5: Balizamiento
- UT6: Reglamento de abordajes
- UT7: Maniobras
- UT8: Propulsión mecánica
- UT9: Meteorología
- UT10: Teoría de navegación
- UT11: Carta de navegación

**Por Convocatoria:**
- Año: 2020-2025
- Mes: Enero-Diciembre
- Formato: YYYY-MM

**Por Estado:**
- Activas
- Anuladas
- Todas

**Por Dificultad:**
- Fácil (<60% error)
- Media (60-80% error)
- Difícil (>80% error)

**Por Texto:**
- Búsqueda en enunciado
- Búsqueda en opciones
- Búsqueda case-insensitive
- Operadores lógicos (AND, OR)

**Combinación de Filtros:**
```http
GET /preguntas-filtradas?tema=UT5&convocatoria=2024&search=cardinal&estado=activa

Response: {
  "preguntas": [...],
  "total": 8,
  "filters": {
    "tema": "UT5",
    "convocatoria": "2024",
    "search": "cardinal",
    "estado": "activa"
  }
}
```

---

### Feature 7.2: Búsqueda de Texto Completo
**Archivo:** `scripts/servidores/api_postgresql.py:288`

**Descripción:** Búsqueda avanzada en múltiples campos.

**Funcionalidades:**
- Búsqueda simultánea en:
  - Enunciado de pregunta
  - Opciones A, B, C
  - Explicaciones
- Búsqueda case-insensitive
- Destacado de términos encontrados
- Ranking por relevancia
- Sugerencias de búsqueda
- Historial de búsquedas

---

## 💾 Gestión de Datos

### Feature 8.1: Sistema de Backups
**Archivo:** `scripts/backup.sh`

**Descripción:** Sistema automático de backups de PostgreSQL.

**Funcionalidades:**
- Backup completo de base de datos
- Formato: SQL comprimido
- Timestamp en nombre de archivo
- Almacenamiento en `backups/`
- Rotación automática (mantener últimos 10)
- Verificación de integridad
- Notificación de estado

**Comando:**
```bash
make backup
# o
./scripts/backup.sh

Output:
🔄 Creando backup completo de la base de datos...
✅ Backup creado: backups/backup_completo_20250930_153045.sql
📊 Tamaño: 14.2 MB
```

**Archivos generados:**
```
backups/backup_completo_YYYYMMDD_HHMMSS.sql
```

---

### Feature 8.2: Restauración de Backups
**Archivo:** `scripts/restore.sh`

**Descripción:** Sistema de restauración desde backups.

**Funcionalidades:**
- Restauración completa de BD
- Verificación de archivo de backup
- Confirmación antes de restaurar
- Backup automático antes de restaurar
- Validación de integridad post-restauración
- Rollback en caso de error

**Comando:**
```bash
make restore FILE=backup_completo_20250930_153045.sql
# o
./scripts/restore.sh backup_completo_20250930_153045.sql

Output:
⚠️  ADVERTENCIA: Esto sobrescribirá la base de datos actual
🔄 Creando backup de seguridad antes de restaurar...
✅ Backup de seguridad creado
🔄 Restaurando desde backup_completo_20250930_153045.sql...
✅ Base de datos restaurada exitosamente
```

---

### Feature 8.3: Backup Antes de Testing
**Archivo:** `scripts/backup_before_test.sh`

**Descripción:** Backup automático antes de operaciones peligrosas.

**Funcionalidades:**
- Backup rápido con timestamp
- Nombre descriptivo: `backup_test_YYYYMMDD_HHMMSS.sql`
- Validación inmediata
- Integrado en workflow de testing

**Comando:**
```bash
./scripts/backup_before_test.sh

Output:
🧪 Creando backup antes de testing...
✅ Backup de test creado: backups/backup_test_20250930_153500.sql
💡 Puedes restaurar con: make restore FILE=backup_test_20250930_153500.sql
```

---

### Feature 8.4: Migraciones de Base de Datos
**Archivo:** `scripts/apply-migrations.sh`
**Directorio:** `scripts/database/migrations/`

**Descripción:** Sistema de migraciones versionadas.

**Funcionalidades:**
- Migraciones numeradas secuencialmente
- Migraciones con rollback
- Tracking de migraciones aplicadas
- Validación antes de aplicar
- Backup automático antes de migración
- Logs detallados

**Estructura de Migración:**
```
migrations/
├── 001_add_registration_date.sql
├── 001_add_registration_date_rollback.sql
├── 002_add_statistics_tables.sql
└── 002_add_statistics_tables_rollback.sql
```

**Comando:**
```bash
./scripts/apply-migrations.sh

Output:
🔄 Aplicando migraciones pendientes...
✅ Migración 001_add_registration_date.sql aplicada
✅ Migración 002_add_statistics_tables.sql aplicada
📊 2 migraciones aplicadas exitosamente
```

---

### Feature 8.5: Exportación/Importación de Datos
**Archivo:** `scripts/servidores/api_postgresql.py`

**Descripción:** Sistema de intercambio de datos.

**Formatos Soportados:**
- JSON (preguntas, explicaciones)
- CSV (estadísticas, usuarios)
- SQL (backup completo)

**Funcionalidades de Exportación:**
- Exportar preguntas filtradas
- Exportar estadísticas de usuario
- Exportar resultados de exámenes
- Exportar explicaciones

**Funcionalidades de Importación:**
- Importar preguntas desde JSON
- Validación de formato
- Prevención de duplicados
- Actualización de existentes
- Logs de importación

---

## ☁️ Infraestructura y DevOps

### Feature 9.1: Despliegue en Google Cloud
**Archivo:** `scripts/deploy-production.sh`

**Descripción:** Sistema automatizado de despliegue en GCP.

**Componentes Desplegados:**

**Cloud Run Services:**
- Frontend: `per-frontend` (puerto 8095)
- API Backend: `per-backend` (puerto 5001)
- Auto-scaling: 0-10 instancias

**Cloud SQL:**
- PostgreSQL 14
- Conexión via Cloud SQL Proxy
- Backups automáticos diarios
- Alta disponibilidad

**Secret Manager:**
- API keys (OpenAI)
- Credenciales de BD
- JWT secrets
- Certificados SSL

**Cloud Storage:**
- Imágenes de preguntas
- Backups de BD
- Logs de aplicación

**Funcionalidades:**
- Build automático de Docker images
- Deploy sin downtime (blue-green)
- Rollback automático en caso de error
- Health checks
- Monitoreo con Cloud Monitoring

**Comando:**
```bash
./scripts/deploy-production.sh

Pasos:
1. Verificación de seguridad
2. Build de Docker images
3. Push a Container Registry
4. Deploy a Cloud Run
5. Actualización de Cloud SQL
6. Verificación post-deploy
7. Tests de smoke
```

---

### Feature 9.2: Control de Servicios Google Cloud
**Archivo:** `scripts/gcloud-services-control.sh`

**Descripción:** Gestión centralizada de servicios GCP para optimizar costes.

**Funcionalidades:**

**Start Services:**
```bash
./scripts/gcloud-services-control.sh start

Servicios iniciados:
✅ Cloud SQL instance: per-postgres
✅ Cloud Run: per-frontend
✅ Cloud Run: per-backend
✅ Cloud SQL Proxy configurado
💰 Coste estimado: €5-10/día
```

**Stop Services:**
```bash
./scripts/gcloud-services-control.sh stop

Servicios detenidos:
⏸️  Cloud SQL instance: per-postgres (STOPPED)
⏸️  Cloud Run: per-frontend (min-instances=0)
⏸️  Cloud Run: per-backend (min-instances=0)
💰 Ahorro: ~€8/día
```

**Status:**
```bash
./scripts/gcloud-services-control.sh status

Estado de servicios:
🟢 Cloud SQL: RUNNING
🟢 per-frontend: READY (3 instancias activas)
🟢 per-backend: READY (2 instancias activas)
📊 Métricas últimas 24h:
   - Requests: 12,453
   - Avg latency: 245ms
   - Errors: 0.02%
💰 Coste acumulado hoy: €7.32
```

**Costes Estimados:**
- Cloud Run: €0.024/hora activa
- Cloud SQL: €0.10/hora (parado €0.01/hora)
- Cloud Storage: €0.02/GB/mes
- Networking: €0.08/GB
- Total activo: ~€8-10/día
- Total parado: ~€0.50/día

---

### Feature 9.3: Verificación de Despliegue
**Archivo:** `scripts/verify-deployment.sh`

**Descripción:** Tests post-despliegue automatizados.

**Verificaciones:**
- Health check de APIs
- Conectividad de base de datos
- Verificación de secrets
- Tests de endpoints críticos
- Validación de CORS
- Verificación de certificados SSL
- Performance baselines

**Comando:**
```bash
./scripts/verify-deployment.sh

Tests ejecutados:
✅ Health check: /health (200 OK)
✅ Database connection (latency: 45ms)
✅ Auth endpoints working
✅ Exam generation working
✅ Statistics API working
✅ CORS properly configured
✅ SSL certificates valid
❌ API response time high (>500ms)
⚠️  1 warning, 0 critical errors
```

---

### Feature 9.4: Monitoreo y Logs
**Archivos:** Integrado en Cloud Logging

**Descripción:** Sistema de monitoreo y alertas.

**Métricas Monitoreadas:**
- Requests por segundo
- Latencia de respuesta
- Tasa de errores (4xx, 5xx)
- Uso de CPU/Memoria
- Conexiones a BD
- Caché hit rate
- Costes acumulados

**Logs Centralizados:**
- Logs de aplicación (INFO, WARNING, ERROR)
- Logs de acceso HTTP
- Logs de base de datos
- Logs de seguridad (auth failures)
- Logs de GPT API calls

**Alertas Configuradas:**
- Error rate >1%
- Latencia >1s en p99
- Downtime >1 minuto
- Costes diarios >€15
- Caída de servicios

---

### Feature 9.5: Limpieza Automática
**Archivo:** `scripts/cleanup-old-images.sh`

**Descripción:** Limpieza de recursos obsoletos.

**Funcionalidades:**
- Eliminar imágenes antiguas no usadas (>30 días)
- Eliminar logs antiguos (>90 días)
- Limpiar backups antiguos (mantener últimos 10)
- Limpiar caché de explicaciones
- Limpiar sesiones expiradas

**Comando:**
```bash
./scripts/cleanup-old-images.sh

Limpieza ejecutada:
🗑️  Imágenes eliminadas: 47 (234 MB liberados)
🗑️  Logs eliminados: 12 archivos (89 MB)
🗑️  Backups antiguos eliminados: 3 (45 MB)
✅ Total liberado: 368 MB
```

---

## 🎨 Interfaz de Usuario

### Feature 10.1: Detección de Entorno
**Archivo:** `src/web/exam-system.html:10`

**Descripción:** Sistema de identificación de entorno de ejecución.

**Funcionalidades:**
- Detección automática: Producción vs Desarrollo
- Indicador visual en esquina superior derecha:
  - 🔴 PRODUCCIÓN (rojo) - bancotest.com
  - 🟢 DESARROLLO (verde) - localhost
- Favicon dinámico según entorno
- Colores diferenciados
- Prevención de errores en producción

---

### Feature 10.2: Diseño Responsive
**Archivos:** Todos los HTML en `src/web/`

**Descripción:** Interfaz adaptativa para todos los dispositivos.

**Breakpoints:**
- Desktop: >1200px
- Tablet: 768px - 1199px
- Mobile: <768px

**Adaptaciones:**
- Navegación colapsable
- Tablas con scroll horizontal
- Botones de tamaño táctil
- Formularios optimizados para móvil
- Imágenes responsive
- Gráficos adaptables

---

### Feature 10.3: Tema Visual Náutico
**Archivos:** CSS en todos los HTML

**Descripción:** Identidad visual coherente.

**Paleta de Colores:**
```css
--primary: #667eea (azul-púrpura)
--secondary: #764ba2 (púrpura)
--success: #10b981 (verde)
--warning: #f59e0b (amarillo)
--danger: #ef4444 (rojo)
--info: #3b82f6 (azul)
```

**Elementos:**
- Gradientes náuticos
- Iconos Font Awesome
- Animaciones suaves
- Sombras sutiles
- Bordes redondeados
- Backdrop blur effects

---

### Feature 10.4: Notificaciones y Alertas
**Archivo:** `src/web/exam-system.js:1200`

**Descripción:** Sistema de feedback visual.

**Tipos de Alertas:**
- Success (verde): Operación exitosa
- Error (rojo): Error crítico
- Warning (amarillo): Advertencia
- Info (azul): Información

**Funcionalidades:**
- Auto-dismiss (5 segundos)
- Posición configurable
- Animaciones de entrada/salida
- Stack de notificaciones
- Botón de cerrar manual

---

### Feature 10.5: Gráficos y Visualizaciones
**Archivo:** `src/web/statistics-dashboard.html`
**Librería:** Chart.js

**Descripción:** Visualización interactiva de datos.

**Tipos de Gráficos:**

**Line Chart:**
- Evolución de puntuaciones
- Progreso de XP
- Actividad diaria

**Bar Chart:**
- Rendimiento por tema
- Comparación de exámenes
- Distribución de respuestas

**Pie/Doughnut Chart:**
- Distribución de notas
- Porcentaje de aciertos
- Balance de temas

**Radar Chart:**
- Perfil de habilidades por tema
- Comparación multi-dimensional

**Funcionalidades:**
- Interactividad (hover, click)
- Zoom y pan
- Exportación a imagen
- Leyendas dinámicas
- Colores personalizados
- Animaciones fluidas

---

## 📋 Resumen de Endpoints API

### Autenticación
```
POST   /auth/register       - Registro de usuario
POST   /auth/login         - Login
GET    /auth/me            - Info usuario actual
```

### Exámenes
```
POST   /exams/generate                    - Generar examen
GET    /exams/{exam_id}/questions        - Obtener preguntas de examen
POST   /exams/{exam_id}/submit           - Enviar respuestas
GET    /user/exams                       - Historial de exámenes
GET    /user/exam/{exam_id}/failed-questions - Preguntas falladas
```

### Preguntas
```
GET    /preguntas-filtradas              - Búsqueda avanzada
GET    /preguntas-individual/{id}        - Pregunta específica
PUT    /preguntas/{id}                   - Actualizar pregunta (admin)
```

### Explicaciones
```
GET    /explicaciones                    - Todas las explicaciones
POST   /generar-explicacion              - Generar con GPT-5
PUT    /guardar-explicacion              - Guardar/actualizar
DELETE /borrar-explicacion               - Eliminar
```

### Imágenes
```
POST   /generar-imagen-png               - Generar imagen con GPT-5
POST   /subir-imagen                     - Subir imagen manual
GET    /images/{filename}                - Servir imagen
```

### Estadísticas
```
GET    /api/statistics/user/{id}         - Estadísticas de usuario
GET    /api/user-stats                   - Estadísticas simples
GET    /api/failed-questions             - Preguntas más falladas
```

### Administración
```
GET    /admin/users                      - Lista de usuarios
POST   /admin/users                      - Crear usuario
PUT    /admin/users/{id}                 - Actualizar usuario
DELETE /admin/users/{id}                 - Eliminar usuario
GET    /admin/stats                      - Estadísticas globales
```

### Sistema
```
GET    /health                           - Health check
GET    /stats                            - Estadísticas del sistema
```

---

## 🗄️ Resumen de Tablas de Base de Datos

### Usuarios y Autenticación
```sql
users                    - Usuarios del sistema
user_preferences         - Preferencias de usuario
```

### Preguntas y Exámenes
```sql
preguntas                - Banco de preguntas
temas                    - Temas/categorías (UT1-UT11)
explicaciones            - Explicaciones de preguntas
examenes                 - Registro de exámenes generados
```

### Estadísticas
```sql
user_statistics          - Estadísticas generales de usuario
exams                    - Detalle de exámenes completados
exam_topic_performance   - Rendimiento por tema en cada examen
question_attempts        - Registro de cada respuesta
question_statistics      - Estadísticas globales por pregunta
user_weak_topics         - Análisis de áreas débiles
```

### Gamificación
```sql
user_achievements        - Logros desbloqueados
achievement_progress     - Progreso hacia logros
study_sessions          - Sesiones de estudio
```

---

## 🔄 Flujos de Trabajo Principales

### Flujo de Registro y Primer Examen
```
1. Usuario → Registro (POST /auth/register)
2. Sistema → Genera JWT token
3. Usuario → Accede a dashboard
4. Usuario → Click "Nuevo Examen"
5. Sistema → Genera examen (POST /exams/generate)
6. Usuario → Responde 45 preguntas
7. Usuario → Finaliza examen
8. Sistema → Evalúa (POST /exams/{id}/submit)
9. Sistema → Muestra resultados
10. Sistema → Actualiza estadísticas
11. Sistema → Desbloquea logro "Primer Examen"
12. Usuario → Ve análisis detallado
```

### Flujo de Estudio de Errores
```
1. Usuario → Ve examen anterior
2. Usuario → Click "Ver preguntas falladas"
3. Sistema → Obtiene falladas (GET /user/exam/{id}/failed-questions)
4. Usuario → Selecciona pregunta
5. Usuario → Click "Generar explicación"
6. Sistema → Llama GPT-5 (POST /generar-explicacion)
7. Sistema → Guarda explicación
8. Sistema → Muestra explicación
9. Usuario → Estudia concepto
10. Usuario → Marca como revisada
```

### Flujo de Administración
```
1. Admin → Login con rol admin
2. Admin → Accede a panel admin
3. Admin → Ve estadísticas globales
4. Admin → Selecciona pregunta problemática
5. Admin → Edita pregunta (PUT /preguntas/{id})
6. Sistema → Valida cambios
7. Sistema → Actualiza BD
8. Sistema → Invalida caché
9. Admin → Genera explicación masiva
10. Sistema → Procesa cola de GPT-5
```

---

## 📊 Métricas y KPIs del Sistema

### Métricas de Uso
- DAU (Daily Active Users)
- MAU (Monthly Active Users)
- Exámenes por usuario
- Tiempo de sesión promedio
- Tasa de retención (D1, D7, D30)

### Métricas de Calidad
- Tasa de aprobados global
- Puntuación promedio
- Progresión de nivel
- Temas más difíciles
- Preguntas que necesitan revisión

### Métricas Técnicas
- Latencia de API (p50, p95, p99)
- Tasa de error (4xx, 5xx)
- Uptime
- Tiempo de respuesta de BD
- Cache hit rate

### Métricas de Coste
- Coste por usuario/mes
- Coste de GPT-5 API
- Coste de infraestructura GCP
- ROI de caché de explicaciones

---

## 🎯 Roadmap de Funcionalidades Futuras

### En Desarrollo
- [ ] Sistema de badges visuales
- [ ] Ranking global de usuarios
- [ ] Modo competitivo (vs otros usuarios)
- [ ] Exportación de certificados PDF

### Planificado
- [ ] App móvil nativa (iOS/Android)
- [ ] Modo offline
- [ ] Chat con IA para dudas
- [ ] Generación de exámenes con IA
- [ ] Sistema de recomendaciones personalizadas
- [ ] Integración con calendarios
- [ ] Recordatorios push
- [ ] Modo oscuro

### En Investigación
- [ ] Realidad aumentada para prácticas
- [ ] Simulador 3D de maniobras
- [ ] Comunidad y foros
- [ ] Cursos en video
- [ ] Integración con escuelas náuticas

---

## 🎓 Modo de Estudio - Versión 2.0 (2025-09-30)

### ✅ Implementado y Mejorado

#### **Nuevas Características:**
- **Generación automática de tests**: Al seleccionar modo, se genera inmediatamente
- **Interfaz optimizada**: Diseño más compacto y eficiente
- **Cancelación de tests**: Botón para cancelar tests en curso
- **Integración con banco de preguntas**: Preguntas incorrectas clickeables
- **Consultas SQL optimizadas**: Mejor rendimiento en selección de preguntas

#### **Mejoras Técnicas:**
- **Optimización de consultas**: Reducción de JOINs de 4 a 2
- **Eliminación de DISTINCT**: Mejor rendimiento en consultas complejas
- **Navegación mejorada**: Flujo más intuitivo y predecible
- **Validación mejorada**: Mensajes de error más claros

#### **Archivos Modificados:**
- `scripts/servidores/study_mode_logic.py` - Lógica optimizada
- `src/web/study-config.html` - Interfaz mejorada
- `src/web/study-mode-adapter.js` - Funcionalidad de cancelación
- `src/web/study-results.html` - Integración con banco de preguntas
- `src/web/question-statistics-dashboard.html` - Navegación mejorada

#### **Documentación:**
- `docs/MODO_ESTUDIO_MEJORAS.md` - Documentación completa de mejoras

---

**Versión del documento:** 2.0
**Última actualización:** 2025-09-30
**Total de features documentadas:** 65+
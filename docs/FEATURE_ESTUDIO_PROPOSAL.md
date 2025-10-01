# 📚 Propuesta: Funcionalidad "Estudio"

## 🎯 Objetivo
Crear un modo de estudio que permita a los usuarios practicar preguntas organizadas por temas (UTs), con opciones de configuración para priorizar preguntas según diferentes criterios.

## 📋 Descripción General

La funcionalidad "Estudio" será la **primera opción en el menú principal** y permitirá:

1. **Seleccionar uno o varios temas (UTs)** para estudiar
2. **Configurar el criterio de selección** de preguntas:
   - Aleatorio
   - Priorizando las más falladas
   - Preguntas nuevas (menos practicadas)
3. **Generar un test** con el número de preguntas proporcional a cada UT según el examen oficial
4. **Realizar el test** con la misma interfaz que los exámenes
5. **Guardar estadísticas** igual que los exámenes oficiales

## 🔍 Análisis del Sistema Actual

### Estructura de Temas (UTs)
El sistema maneja 11 Unidades Temáticas:
- **UT1**: Nomenclatura náutica (15 preguntas en examen oficial)
- **UT2**: Elementos de amarre y fondeo (3 preguntas)
- **UT3**: Seguridad en la mar (9 preguntas)
- **UT4**: Legislación (3 preguntas)
- **UT5**: Balizamiento (5 preguntas)
- **UT6**: Reglamento de abordajes (9 preguntas)
- **UT7**: Maniobras (10 preguntas)
- **UT8**: Propulsión y gobierno (4 preguntas)
- **UT9**: Meteorología (4 preguntas)
- **UT10**: Teoría de navegación (15 preguntas)
- **UT11**: Carta de navegación (13 preguntas)

**Total**: 90 preguntas en examen oficial completo

### Sistema Actual de Exámenes
- Genera exámenes de 45 o 90 preguntas
- Usa proporciones fijas por UT
- Selección aleatoria simple
- Guarda en tabla `user_exams` y `exam_questions`
- Tracking de respuestas en `question_attempts`
- Estadísticas en `user_statistics`

## 📐 Arquitectura Propuesta

### 1. Base de Datos

#### Nueva tabla: `study_tests`
```sql
CREATE TABLE study_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Configuración del test
    selected_uts JSONB NOT NULL, -- Array de UTs seleccionados
    selection_mode VARCHAR(20) NOT NULL, -- 'random', 'failed', 'new'
    total_questions INTEGER NOT NULL,

    -- Estado del test
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    -- Resultados
    correct_answers INTEGER DEFAULT 0,
    score_percentage NUMERIC(5,2),
    duration_minutes INTEGER,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_study_tests_user ON study_tests(user_id);
CREATE INDEX idx_study_tests_status ON study_tests(status);
```

#### Nueva tabla: `study_test_questions`
```sql
CREATE TABLE study_test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_test_id UUID NOT NULL REFERENCES study_tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,

    -- Orden y contexto
    question_order INTEGER NOT NULL,
    ut_number INTEGER NOT NULL,
    ut_category VARCHAR(100) NOT NULL,

    -- Respuesta del usuario
    user_answer VARCHAR(1),
    is_correct BOOLEAN,
    answered_at TIMESTAMP,
    time_spent_seconds INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_study_test_questions_test ON study_test_questions(study_test_id);
CREATE INDEX idx_study_test_questions_question ON study_test_questions(question_id);
```

### 2. Backend (API)

#### Nuevos endpoints:

1. **POST `/api/study-tests/generate`**
   - Parámetros: `{ selectedUts: [1,2,3], selectionMode: 'random'|'failed'|'new' }`
   - Genera un test de estudio con preguntas seleccionadas según criterio
   - Retorna: `{ testId, questions: [...] }`

2. **GET `/api/study-tests/:testId/questions`**
   - Obtiene las preguntas del test de estudio
   - Retorna: Array de preguntas con opciones

3. **POST `/api/study-tests/:testId/answer`**
   - Registra una respuesta del usuario
   - Parámetros: `{ questionId, answer, timeSpent }`

4. **POST `/api/study-tests/:testId/submit`**
   - Finaliza el test y calcula resultados
   - Actualiza estadísticas globales

5. **GET `/api/study-tests/user-history`**
   - Obtiene historial de tests de estudio del usuario
   - Retorna: Lista de tests con estadísticas

6. **GET `/api/study-tests/available-uts`**
   - Obtiene lista de UTs disponibles con conteo de preguntas
   - Retorna: `[{ utNumber, name, totalQuestions, userStats }]`

### 3. Frontend

#### Nueva página: `study-mode.html`

**Secciones:**

1. **Selector de Temas**
   - Checkboxes para cada UT
   - Mostrar número de preguntas disponibles por UT
   - Indicador visual de rendimiento del usuario en cada UT

2. **Configuración de Selección**
   - Radio buttons para elegir modo:
     - 🎲 **Aleatorio**: Selección random
     - ❌ **Más Falladas**: Prioriza preguntas con más errores
     - 🆕 **Nuevas**: Prioriza preguntas menos vistas

3. **Preview de Test**
   - Mostrar número total de preguntas que se generarán
   - Desglose por UT seleccionado

4. **Interfaz de Test**
   - Reutilizar componentes de `exam-system.html`
   - Misma navegación entre preguntas
   - Mismo sistema de respuestas

5. **Resultados**
   - Mostrar puntuación por UT
   - Comparar con tests anteriores
   - Sugerir UTs para practicar más

## 📝 División en Tareas

### 🔵 Fase 1: Base de Datos y Backend Core (3-4 horas)

#### Tarea 1.1: Crear esquema de base de datos
- [ ] Crear tabla `study_tests`
- [ ] Crear tabla `study_test_questions`
- [ ] Crear índices necesarios
- [ ] Script de migración SQL
- **Archivos**: `migrations/003_create_study_tables.sql`

#### Tarea 1.2: Implementar lógica de selección de preguntas
- [ ] Función para selección **aleatoria**
- [ ] Función para selección **más falladas** (basada en `question_attempts`)
- [ ] Función para selección **nuevas** (menos intentos)
- [ ] Calcular proporciones por UT según examen oficial
- **Archivos**: `scripts/servidores/study_logic.py` (nuevo)

#### Tarea 1.3: API - Generación de test
- [ ] Endpoint `POST /api/study-tests/generate`
- [ ] Validar UTs seleccionados
- [ ] Generar test según criterio
- [ ] Guardar en base de datos
- **Archivos**: `scripts/servidores/api_postgresql.py`

#### Tarea 1.4: API - Gestión de test
- [ ] Endpoint `GET /api/study-tests/:testId/questions`
- [ ] Endpoint `POST /api/study-tests/:testId/answer`
- [ ] Endpoint `POST /api/study-tests/:testId/submit`
- [ ] Actualizar `user_statistics`
- [ ] Registrar en `question_attempts`
- **Archivos**: `scripts/servidores/api_postgresql.py`

#### Tarea 1.5: API - Consultas y estadísticas
- [ ] Endpoint `GET /api/study-tests/available-uts`
- [ ] Endpoint `GET /api/study-tests/user-history`
- [ ] Incluir estadísticas por UT
- **Archivos**: `scripts/servidores/api_postgresql.py`

### 🟢 Fase 2: Frontend - Configuración (2-3 horas)

#### Tarea 2.1: Crear página de modo estudio
- [ ] HTML base `study-mode.html`
- [ ] Estructura de layout responsive
- [ ] Estilos CSS coherentes con el sistema
- **Archivos**: `src/web/study-mode.html`, `src/web/css/study-mode.css`

#### Tarea 2.2: Selector de temas
- [ ] Componente de checkboxes para UTs
- [ ] Cargar lista de UTs desde API
- [ ] Mostrar estadísticas de usuario por UT
- [ ] Validación (mínimo 1 UT seleccionado)
- **Archivos**: `src/web/js/study-selector.js`

#### Tarea 2.3: Configuración de modo de selección
- [ ] Radio buttons para modos (random/failed/new)
- [ ] Descripciones claras de cada modo
- [ ] Preview de número de preguntas
- **Archivos**: `src/web/js/study-selector.js`

#### Tarea 2.4: Integrar con menú principal
- [ ] Añadir opción "Estudio" en dashboard (primera posición)
- [ ] Icono y descripción
- [ ] Navegación a `study-mode.html`
- **Archivos**: `src/web/exam-system.html`

### 🟡 Fase 3: Frontend - Ejecución de Test (2 horas)

#### Tarea 3.1: Reutilizar componentes de examen
- [ ] Adaptar `exam-system.js` para modo estudio
- [ ] Cargar preguntas desde endpoint de study tests
- [ ] Navegación entre preguntas
- **Archivos**: `src/web/js/study-exam.js`

#### Tarea 3.2: Interfaz de pregunta
- [ ] Mostrar pregunta y opciones
- [ ] Marcar respuesta
- [ ] Temporizador
- [ ] Botones navegación (anterior/siguiente)
- **Archivos**: `src/web/study-mode.html`, `src/web/js/study-exam.js`

#### Tarea 3.3: Submit y guardado
- [ ] Enviar respuestas a API
- [ ] Finalizar test
- [ ] Mostrar pantalla de carga mientras procesa
- **Archivos**: `src/web/js/study-exam.js`

### 🟠 Fase 4: Frontend - Resultados y Estadísticas (2 horas)

#### Tarea 4.1: Pantalla de resultados
- [ ] Mostrar puntuación global
- [ ] Desglose por UT
- [ ] Comparación con tests anteriores
- [ ] Botón para nuevo test
- **Archivos**: `src/web/js/study-results.js`

#### Tarea 4.2: Sugerencias inteligentes
- [ ] Analizar resultados
- [ ] Sugerir UTs para mejorar
- [ ] Mostrar progreso
- **Archivos**: `src/web/js/study-results.js`

#### Tarea 4.3: Historial de tests de estudio
- [ ] Página con lista de tests realizados
- [ ] Filtros por fecha, UT, modo
- [ ] Ver detalles de cada test
- **Archivos**: `src/web/study-history.html`

### 🔴 Fase 5: Testing y Ajustes (1-2 horas)

#### Tarea 5.1: Tests unitarios backend
- [ ] Tests para lógica de selección
- [ ] Tests para endpoints API
- [ ] Tests para cálculo de estadísticas
- **Archivos**: `tests/test_study_mode.py`

#### Tarea 5.2: Tests E2E frontend
- [ ] Test de flujo completo de estudio
- [ ] Test de cada modo de selección
- [ ] Verificar integración con estadísticas
- **Archivos**: `scripts/test_study_mode_e2e.js`

#### Tarea 5.3: Añadir a test de producción
- [ ] Incluir "Estudio" en `test_production.js`
- [ ] Verificar que carga sin errores
- [ ] Verificar navegación
- **Archivos**: `scripts/test_production.js`

#### Tarea 5.4: Documentación
- [ ] Actualizar README con nueva funcionalidad
- [ ] Documentar endpoints API
- [ ] Guía de usuario
- **Archivos**: `docs/STUDY_MODE.md`, `API_ENDPOINTS.md`

## 🎨 Wireframes (Conceptual)

### Pantalla 1: Selector de Temas
```
┌─────────────────────────────────────────┐
│  📚 Modo Estudio                        │
├─────────────────────────────────────────┤
│                                         │
│  Selecciona los temas a estudiar:      │
│                                         │
│  ☑ UT1: Nomenclatura (15 preguntas)   │
│     Tu rendimiento: 75% ✓              │
│                                         │
│  ☐ UT2: Amarre y fondeo (3 preguntas) │
│     Tu rendimiento: 60% ⚠              │
│                                         │
│  ... (resto de UTs)                    │
│                                         │
│  Modo de selección:                    │
│  ○ Aleatorio                           │
│  ○ Más falladas                        │
│  ● Preguntas nuevas                    │
│                                         │
│  Preview: 18 preguntas                 │
│  (UT1: 15, UT2: 3)                     │
│                                         │
│           [Iniciar Test]               │
└─────────────────────────────────────────┘
```

### Pantalla 2: Ejecutando Test
```
┌─────────────────────────────────────────┐
│  Test de Estudio - UT1, UT2    ⏱ 15:30│
├─────────────────────────────────────────┤
│  Pregunta 5 de 18          [🔙 Salir]  │
│                                         │
│  UT1 - Nomenclatura náutica            │
│                                         │
│  ¿Cuál es la parte delantera del       │
│  barco?                                 │
│                                         │
│  ○ A. Popa                             │
│  ○ B. Estribor                         │
│  ● C. Proa                             │
│  ○ D. Babor                            │
│                                         │
│  [← Anterior]      [Siguiente →]       │
│                                         │
│  Progreso: ████████░░░░░ 5/18          │
└─────────────────────────────────────────┘
```

### Pantalla 3: Resultados
```
┌─────────────────────────────────────────┐
│  📊 Resultados del Test                 │
├─────────────────────────────────────────┤
│                                         │
│        🎯 Puntuación: 83%               │
│        15 correctas de 18               │
│                                         │
│  Por tema:                              │
│  UT1: 13/15 (87%) ⬆ +5% vs anterior   │
│  UT2:  2/3  (67%) ⬇ -10% vs anterior  │
│                                         │
│  💡 Recomendaciones:                    │
│  • Practica más UT2 (Amarre)           │
│  • Buen progreso en UT1                │
│                                         │
│  [Nuevo Test] [Ver Historial] [Salir] │
└─────────────────────────────────────────┘
```

## 🚀 Estimación Total
- **Fase 1 (Backend)**: 3-4 horas
- **Fase 2 (Config Frontend)**: 2-3 horas
- **Fase 3 (Ejecución)**: 2 horas
- **Fase 4 (Resultados)**: 2 horas
- **Fase 5 (Testing)**: 1-2 horas

**Total estimado**: 10-13 horas de desarrollo

## ✅ Criterios de Aceptación

1. ✅ Usuario puede seleccionar uno o varios UTs
2. ✅ Usuario puede elegir modo de selección (random/failed/new)
3. ✅ Sistema genera test con proporción correcta de preguntas por UT
4. ✅ Interfaz de test funciona igual que exámenes oficiales
5. ✅ Respuestas se registran en `question_attempts`
6. ✅ Estadísticas se actualizan en `user_statistics`
7. ✅ Tests de estudio aparecen en historial separado
8. ✅ Sin errores en tests de producción
9. ✅ Documentación completa

## 📦 Dependencias y Riesgos

### Dependencias
- Sistema actual de exámenes funcionando
- Tabla `question_attempts` con datos históricos
- Autenticación de usuario funcionando

### Riesgos
1. **Bajo**: La lógica de selección "más falladas" puede ser compleja si hay poco historial
   - **Mitigación**: Fallback a aleatorio si no hay suficientes datos

2. **Medio**: Reutilizar componentes de examen puede requerir refactorización
   - **Mitigación**: Crear componentes compartidos desde el inicio

3. **Bajo**: Rendimiento al calcular estadísticas en tiempo real
   - **Mitigación**: Usar índices en BD y cachear resultados

## 🔄 Plan de Rollout

1. **Desarrollo local**: Implementar todas las fases
2. **Testing manual**: Verificar flujo completo
3. **Testing automatizado**: Ejecutar tests E2E
4. **Deployment a producción**: Con tests de producción pasando
5. **Monitoreo**: Ver uso de la funcionalidad primera semana
6. **Iteración**: Ajustar según feedback

---

**Fecha**: 2025-10-01
**Versión**: 1.0
**Estado**: Pendiente de revisión

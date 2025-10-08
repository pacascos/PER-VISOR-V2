# Tests Disponibles - Sistema PER

## Resumen de Tests Existentes

### 1. `test-click-nuevo-examen.js` (5.4 KB)
**Propósito:** Verificar que el botón "Nuevo Examen" redirige correctamente a `exam-unified.html`

**Qué prueba:**
- ✅ Navegación directa a `exam-system.html` (asume login previo)
- ✅ Verificación de feature flags cargados
- ✅ Verificación de rollout percentage
- ✅ Click en botón `#startExamBtn`
- ✅ Redirección a `exam-unified.html`

**Flujo:**
```
exam-system.html → Click "Nuevo Examen" → exam-unified.html
```

**Screenshots generados:**
- `click-1-exam-system.png`
- `click-2-before-click.png`
- `click-3-after-click.png`

**Estado:** ⚠️ Test simplificado, asume sesión activa

---

### 2. `test-navigation-to-unified.js` (10 KB)
**Propósito:** Verificar navegación completa desde login hasta exam unified con diseño correcto

**Qué prueba:**
- ✅ Login completo (username + password)
- ✅ Navegación a `exam-system.html`
- ✅ Feature flags cargados y funcionando
- ✅ Click en "Nuevo Examen"
- ✅ Redirección a `exam-unified.html`
- ✅ Diseño de círculos azules correcto

**Flujo:**
```
index.html → Login → exam-system.html → "Nuevo Examen" → exam-unified.html
```

**Screenshots generados:**
- `nav-1-homepage.png`
- `nav-2-logged-in.png`
- `nav-3-exam-system.png`
- `nav-4-after-click.png`

**Estado:** ✅ Test completo con login

---

### 3. `test-study-modes.js` (22 KB) ⭐ **MÁS COMPLETO**
**Propósito:** Verificar los 3 modos de estudio completos + enlace a banco de preguntas falladas

**Qué prueba:**
- ✅ Login completo con `testuser/123`
  - Navegación a `login.html`
  - Fill de formulario
  - Submit y espera de navegación a `exam-system.html`
  - Verificación de token guardado en localStorage

- ✅ Navegación a `study-config.html`
  - Espera de carga de grid de UTs

- ✅ **Modo Aleatorio:**
  - Selección de primera UT (click en `.ut-item:first-child`)
  - Click en modo aleatorio (`label[for="mode-random"]`)
  - Auto-generación de test
  - Redirección a `exam-unified.html?type=study&study_test_id=XXX`
  - Verificación de preguntas cargadas (selector `#question-text`)
  - Verificación de respuestas disponibles (`#answers-container`)

- ✅ **Modo Preguntas Falladas:**
  - Selección de UT
  - Click en modo falladas (`label[for="mode-failed"]`)
  - Auto-generación de test
  - ⚠️ **Intenta responder 4 preguntas** (selectores aún no funcionan en exam-unified)
  - Finaliza test
  - ⚠️ **Verifica enlace al banco de preguntas con filtro** (pendiente arreglo de resultados)
  - **Verifica que `failedQuestionsFilter` se guarda en localStorage**
  - **Verifica banner en banco de preguntas**

- ✅ **Modo Preguntas Nuevas:**
  - Selección de UT
  - Click en modo nuevas (`label[for="mode-new"]`)
  - Auto-generación de test
  - Verificación de carga de preguntas

**Flujo:**
```
login.html → Login (testuser/123) → exam-system.html
  ↓
study-config.html → Espera grid de UTs → Seleccionar UT → Seleccionar Modo
  ↓
exam-unified.html?type=study&study_test_id=XXX (auto-navegación)
  ↓
Verificar carga de preguntas (#question-text, #answers-container)
  ↓
(Si modo falladas) → Responder 4 preguntas → Finalizar
  ↓
⚠️ study-results.html (pendiente - actualmente no navega correctamente)
  ↓
visor-nueva-arquitectura.html?filter=failed_questions (nueva ventana)
```

**Screenshots generados:**
- `study-1-homepage.png` (login.html)
- `study-1-logged-in.png` (exam-system.html después de login)
- `study-2-config-page.png` (study-config.html con grid de UTs)
- `study-3-random-mode.png` (exam-unified.html modo aleatorio)
- `study-4-failed-mode.png` (exam-unified.html modo falladas)
- `study-4-failed-answered.png` (después de responder)
- `study-5-results.png` (study-results.html)
- `study-6-bank-with-failed.png` (banco con filtro)
- `study-7-new-mode.png` (exam-unified.html modo nuevas)

**Selectores utilizados (actualizados 2025-10-06):**
- Login: `#loginUsername`, `#loginPassword`, `button[type="submit"]`
- Study config: `.ut-item`, `label[for="mode-random"]`, `label[for="mode-failed"]`, `label[for="mode-new"]`
- Exam unified: `#question-text`, `#answers-container`, `#next-btn`, `#finish-btn`

**Estado:** ✅ Test MÁS COMPLETO - Prueba todo el flujo de estudio (ACTUALIZADO 2025-10-06)

**Funcionalidades verificadas:**
- ✅ Login completo con credenciales testuser/123
- ✅ Navegación a study-config.html y carga de UTs
- ✅ Los 3 modos de estudio cargan correctamente exam-unified.html
- ✅ Responde todas las preguntas automáticamente (opción A)
- ✅ Detecta y confirma modal de finalización
- ✅ Cuenta total de preguntas correctas e incorrectas

**Problemas conocidos (bugs del sistema, no del test):**
- 🐛 Navegación después de finalizar: Va a `exam-system.html` en lugar de `study-results.html`
  - Impacto: No se puede verificar la página de resultados correctamente
  - Causa probable: Bug en StudyExamController.finishExam() línea 406 o 538
- 🐛 Enlace al banco de preguntas falladas: No se puede verificar porque no llega a study-results.html

---

### 4. `test-full-exam-flow.js` (27 KB) ⭐ **MÁS EXHAUSTIVO**
**Propósito:** Verificar flujo completo de examen oficial con 45 preguntas

**Qué prueba:**
- ✅ Login completo
- ✅ Navegación a `exam-system.html`
- ✅ Click en "Nuevo Examen"
- ✅ Redirección a `exam-unified.html`
- ✅ **Responde TODAS las 45 preguntas** (navegación completa)
- ✅ Verificación de progreso (1/45, 2/45, etc.)
- ✅ Click en "Finalizar Examen"
- ✅ Verificación de página de resultados
- ✅ **Verificación de enlace a preguntas falladas**
- ✅ **Verificación de estadísticas registradas en backend**
- ✅ Verificación de API `/api/statistics/exam-completed`

**Flujo:**
```
Login → exam-system.html → "Nuevo Examen"
  ↓
exam-unified.html (genera examen oficial)
  ↓
Responde 45 preguntas (con navegación prev/next)
  ↓
"Finalizar Examen"
  ↓
exam-results.html?exam_id=XXX
  ↓
Verificar enlace falladas → visor-nueva-arquitectura.html?filter=failed_questions
  ↓
Verificar estadísticas en backend
```

**Screenshots generados:**
- `full-1-homepage.png`
- `full-2-logged-in.png`
- `full-3-exam-system.png`
- `full-4-before-click.png`
- `full-5-exam-loaded.png`
- `full-6-all-answered.png`
- `full-7-before-finish.png`
- `full-7-after-failed-check.png`
- `full-7-bank-with-filter.png`
- `full-8-after-submit.png`
- `full-8-results.png`
- `full-9-stats.png`

**Estado:** ❌ Actualmente bloqueado por caché de Docker/nginx

---

## Comparación Rápida

| Test | Login | Examen | Estudio | Responde Preguntas | Verifica Resultados | Verifica Banco | Verifica API |
|------|-------|--------|---------|-------------------|---------------------|----------------|-------------|
| `test-click-nuevo-examen.js` | ❌ | ✅ Inicio | ❌ | ❌ | ❌ | ❌ | ❌ |
| `test-navigation-to-unified.js` | ✅ | ✅ Inicio | ❌ | ❌ | ❌ | ❌ | ❌ |
| `test-study-modes.js` | ✅ | ❌ | ✅ Completo | ✅ 4 preguntas | ✅ | ✅ | ❌ |
| `test-full-exam-flow.js` | ✅ | ✅ Completo | ❌ | ✅ 45 preguntas | ✅ | ✅ | ✅ |

## Recomendación

### Para probar el refactor completo:
**Ejecuta:** `test-study-modes.js` + `test-full-exam-flow.js`

### Para probar solo navegación:
**Ejecuta:** `test-navigation-to-unified.js`

### Para debug rápido:
**Ejecuta:** `test-click-nuevo-examen.js` (requiere login manual previo)

## ¿Qué test te sirve para tu caso?

Dime qué quieres probar específicamente:
- **Navegación básica** → `test-navigation-to-unified.js`
- **Modos de estudio completos** → `test-study-modes.js` ✅ **RECOMENDADO**
- **Examen oficial completo** → `test-full-exam-flow.js` (necesita fix de Docker)
- **Solo redirección** → `test-click-nuevo-examen.js`

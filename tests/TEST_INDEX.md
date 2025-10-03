# Test Index - PER Exam System

**Última actualización:** 2025-10-03

## 📋 Índice de Tests Disponibles

### ✅ Tests de Integración (Playwright)

#### 1. **test-exam-complete-flow.js** ⭐ PRINCIPAL
**Ubicación:** `/test-exam-complete-flow.js`
**Propósito:** Test completo del flujo de examen de inicio a fin
**Características:**
- Login automático
- Generación de examen
- Responder 45 preguntas
- Finalizar examen
- Verificar resultados
- Capturas de pantalla en cada paso

**Uso:**
```bash
node test-exam-complete-flow.js
```

**Capturas generadas:**
- `test-exam-1-homepage.png`
- `test-exam-2-logged-in.png`
- `test-exam-3-exam-page.png`
- `test-exam-4-exam-loaded.png`
- `test-exam-5-questions-answered.png`
- `test-exam-6-exam-finished.png`
- `test-exam-7-results-shown.png`

**Última ejecución:** ✅ Exitosa (2025-10-03)

---

#### 2. **test_exam_unified.js**
**Ubicación:** `/test_exam_unified.js`
**Propósito:** Tests del sistema unificado de exámenes
**Características:**
- Verifica feature flags
- Prueba FullExamController
- Valida UI unificada
- 11 tests automatizados

**Uso:**
```bash
node test_exam_unified.js
```

---

#### 3. **test_study_unified.js**
**Ubicación:** `/test_study_unified.js`
**Propósito:** Tests del modo estudio unificado
**Características:**
- Verifica StudyExamController
- Prueba configuración de UTs
- Valida respuestas en modo estudio

**Uso:**
```bash
node test_study_unified.js
```

---

#### 4. **test_backward_compatibility.js**
**Ubicación:** `/test_backward_compatibility.js`
**Propósito:** Verifica compatibilidad con sistema antiguo
**Características:**
- Compara exam.html vs exam-unified.html
- Valida que ambos funcionen
- Asegura transición suave

**Uso:**
```bash
node test_backward_compatibility.js
```

---

### 🔐 Tests de Autenticación

#### 5. **test-login-production.js**
**Ubicación:** `/test-login-production.js`
**Propósito:** Test de login en producción
**Uso:**
```bash
node test-login-production.js
```

---

### 📊 Tests de Componentes Específicos

#### 6. **test-exam-generation-playwright.js**
**Ubicación:** `/test-exam-generation-playwright.js`
**Propósito:** Test de generación de exámenes
**Características:**
- Verifica POST /api/exams/generate
- Valida estructura del examen
- Comprueba 45 preguntas

---

#### 7. **test-admin-panel.js**
**Ubicación:** `/test-admin-panel.js`
**Propósito:** Tests del panel de administración

---

### 🎨 Tests de UI/Diseño (NUEVOS)

#### 8. **test-design-verification.js** ⚠️ TEMPORAL
**Ubicación:** `/test-design-verification.js`
**Propósito:** Verificar diseño de círculos azules
**NOTA:** Este test fue creado temporalmente. Integrar en test-exam-complete-flow.js

---

### 📱 Tests Responsive

#### 9. **test-responsive-mobile.js**
**Ubicación:** `/test-responsive-mobile.js`
**Propósito:** Tests de diseño responsive en móvil

---

## 🎯 Cómo Usar Este Índice

### Antes de crear un nuevo test:
1. **CONSULTAR ESTE ARCHIVO** para ver si ya existe un test similar
2. Si existe, **REUTILIZARLO** o **MEJORARLO**
3. Si no existe, crearlo y **ACTUALIZAR ESTE ÍNDICE**

### Recomendaciones:
- ✅ Usar `test-exam-complete-flow.js` como base para tests de flujo completo
- ✅ Añadir verificaciones al test existente en lugar de crear uno nuevo
- ✅ Mantener este índice actualizado
- ✅ Marcar tests obsoletos como DEPRECATED

---

## 🔄 Tests a Consolidar

### Tests duplicados/similares que deberían unificarse:
- `test-design-verification.js` → integrar en `test-exam-complete-flow.js`
- `test-direct-unified.js` → integrar en `test_exam_unified.js`
- `test_local_*` → consolidar en un solo test local

---

## 📝 Template para Nuevos Tests

```javascript
const { chromium } = require('playwright');

/**
 * Test: [NOMBRE DEL TEST]
 * Propósito: [DESCRIPCIÓN]
 * Fecha: [YYYY-MM-DD]
 */

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('🧪 [NOMBRE DEL TEST]');

        // TU CÓDIGO AQUÍ

        console.log('✅ Test completado');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: 'test-error.png' });
    } finally {
        await browser.close();
    }
})();
```

---

## 🚀 Mejoras Pendientes

### Para test-exam-complete-flow.js:
- [ ] Añadir verificación de diseño de círculos azules
- [ ] Añadir verificación de estilos CSS
- [ ] Añadir test de atajos de teclado
- [ ] Añadir verificación de feature flags

### General:
- [ ] Mover todos los tests a carpeta `/tests`
- [ ] Crear suite de tests con npm scripts
- [ ] Añadir CI/CD con GitHub Actions
- [ ] Documentar cada test con comentarios JSDoc

---

**Mantenido por:** Claude Code
**Proyecto:** PER-VISOR-V2

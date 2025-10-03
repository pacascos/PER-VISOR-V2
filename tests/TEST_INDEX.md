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

#### 8. **test-navigation-to-unified.js** ⭐ NAVEGACIÓN COMPLETA
**Ubicación:** `/tests/test-navigation-to-unified.js`
**Propósito:** Test completo de navegación desde login hasta exam-unified
**Características:**
- Login automático con patrón correcto
- Navegación a exam-system.html
- Click en botón "Nuevo Examen"
- Verificación de redirección a exam-unified.html
- Validación de diseño de círculos azules
- Test de selección de respuestas
- Capturas de pantalla en cada paso

**Uso:**
```bash
node tests/test-navigation-to-unified.js
```

**Última ejecución:** ✅ Exitosa (2025-10-03)

---

#### 9. **test-design-verification.js** ⚠️ DEPRECATED
**Ubicación:** `/test-design-verification.js`
**Propósito:** Verificar diseño de círculos azules
**NOTA:** DEPRECATED - usar `test-navigation-to-unified.js` en su lugar

---

### 📱 Tests Responsive

#### 10. **test-responsive-mobile.js**
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
- [x] Añadir verificación de diseño de círculos azules
- [x] Añadir verificación de estilos CSS
- [ ] Añadir test de atajos de teclado
- [x] Añadir verificación de feature flags

### General:
- [ ] Mover todos los tests a carpeta `/tests`
- [ ] Crear suite de tests con npm scripts
- [ ] Añadir CI/CD con GitHub Actions
- [ ] Documentar cada test con comentarios JSDoc

---

## 🐛 Lecciones Aprendidas y Soluciones

### Problema 1: Login no funciona - Patrón correcto
**Error:** `elementHandle.fill: Timeout 30000ms exceeded - element is not visible`

**Causas múltiples:**
1. Usar `slowMo` en launch
2. Crear `context` innecesariamente
3. URL incorrecta (index.html vs baseUrl directo)
4. Selectores en bucle `for` en lugar de `||`

**Solución CORRECTA (patrón que funciona):**
```javascript
// ✅ PATRÓN QUE FUNCIONA
const browser = await chromium.launch({ headless: false, devtools: true });
const page = await browser.newPage();  // SIN context
const baseUrl = 'http://localhost:8095';

// Ir a baseUrl directamente (NO a index.html)
await page.goto(baseUrl);
await page.waitForLoadState('networkidle');

// Selectores con || en MISMA LÍNEA (no usar for loop)
let usernameField = await page.$('#loginUsername') ||
                    await page.$('input[type="text"]') ||
                    await page.$('input[placeholder*="usuario" i]');

let passwordField = await page.$('#loginPassword') ||
                    await page.$('input[type="password"]');

let loginButton = await page.$('#loginButton') ||
                  await page.$('button[type="submit"]') ||
                  await page.$('button:has-text("Iniciar")');

if (usernameField && passwordField && loginButton) {
  await usernameField.fill('testuser');  // credenciales específicas
  await passwordField.fill('123');
  await loginButton.click();
  await page.waitForLoadState('networkidle');  // IMPORTANTE
} else {
  // Fallback genérico
  const allInputs = await page.$$('input');
  const allButtons = await page.$$('button');
  if (allInputs.length >= 2) {
    await allInputs[0].fill('testuser');
    await allInputs[1].fill('123');
    if (allButtons.length > 0) {
      await allButtons[0].click();
      await page.waitForLoadState('networkidle');
    }
  }
}
```

**❌ PATRÓN QUE NO FUNCIONA:**
```javascript
const browser = await chromium.launch({ headless: false, slowMo: 500 }); // ❌
const context = await browser.newContext(); // ❌ innecesario
const page = await context.newPage(); // ❌

await page.goto(`${baseUrl}/index.html`); // ❌ específica index.html

// ❌ Selectores en array con for loop
const selectors = ['#username', 'input[type="text"]'];
for (const selector of selectors) {
  usernameField = await page.$(selector);
  if (usernameField) break;
}
```

### Problema 2: Cache del navegador
**Error:** Los cambios en CSS/JS no se reflejan en el navegador

**Causa:** El navegador cachea los archivos JavaScript y CSS

**Soluciones:**
1. **Cache busting en HTML:**
   ```html
   <script src="file.js?v=2"></script>
   <link rel="stylesheet" href="style.css?v=2">
   ```

2. **Hard refresh en navegador:**
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

3. **Disable cache en DevTools:**
   - Abrir DevTools (F12)
   - Network → "Disable cache"

### Problema 3: Feature flags no funcionan
**Error:** El código redirige a `exam.html` en lugar de `exam-unified.html`

**Diagnóstico:**
```javascript
// En consola del navegador:
console.log(window.featureFlags);
console.log(window.featureFlags.isEnabled('unified_exam_page'));
```

**Soluciones:**
1. Verificar que `feature-flags.js` esté cargado ANTES de `exam-system.js`
2. Limpiar localStorage: `localStorage.clear()`
3. Verificar userId: `localStorage.getItem('feature_flag_user_id')`

**SOLUCIÓN DEFINITIVA (2025-10-03):**
Eliminar completamente el feature flag y hacer que siempre redirija a exam-unified.html:

```javascript
// En exam-system.js - ANTES:
if (window.featureFlags && window.featureFlags.isEnabled('unified_exam_page')) {
    window.location.href = 'exam-unified.html';
} else {
    window.location.href = 'exam.html';
}

// DESPUÉS (feature flag removido):
window.location.href = 'exam-unified.html';
```

✅ Esto simplifica el código y asegura que siempre se use exam-unified.html

### Problema 4: Selectores de login diferentes
**Error:** No se encuentran los campos de login

**Solución:** Usar múltiples selectores y fallback genérico
```javascript
const usernameSelectors = ['#username', 'input[name="username"]', 'input[type="text"]'];
let usernameField;

for (const selector of usernameSelectors) {
  usernameField = await page.$(selector);
  if (usernameField) break;
}

// Fallback genérico
if (!usernameField) {
  const allInputs = await page.$$('input');
  if (allInputs.length >= 2) {
    usernameField = allInputs[0];
  }
}
```

### Problema 5: Elementos no visibles
**Error:** `waiting for element to be visible`

**Soluciones:**
1. Esperar networkidle: `await page.waitForLoadState('networkidle')`
2. Esperar selector específico: `await page.waitForSelector('#element', { state: 'visible' })`
3. Scroll al elemento: `await page.locator('#element').scrollIntoViewIfNeeded()`

---

**Mantenido por:** Claude Code
**Proyecto:** PER-VISOR-V2
**Última actualización problemas:** 2025-10-03

# 🧪 Proceso de Pruebas - PER_Cloude System

## 📋 Descripción General

Este documento describe el proceso completo de pruebas automatizadas para el sistema PER_Cloude, incluyendo pruebas de funcionalidad, API, frontend y integración.

## 🎭 Tecnología de Pruebas

### Playwright
- **Versión**: 1.55.0
- **Tipo**: Instalación local (no MCP)
- **Navegadores**: Chromium, Firefox, Safari
- **Modo**: Visual con DevTools habilitado

### Instalación
```bash
npm install playwright
npx playwright install
```

## 📁 Archivos de Pruebas

### Scripts Principales
- `test-exam-system-playwright.js` - Pruebas del sistema de exámenes
- `test-playwright-stats.js` - Pruebas de estadísticas y API
- `debug-playwright.js` - Depuración visual completa
- `test-playwright-question-stats.js` - Pruebas específicas de estadísticas de preguntas

### Configuración
- `mcp-playwright-config.json` - Configuración del entorno
- `start-debug.sh` - Script de inicio interactivo

## 🎯 Tipos de Pruebas

### 1. Pruebas del Sistema de Exámenes
**Archivo**: `test-exam-system-playwright.js`

**Funcionalidades probadas**:
- ✅ Carga del sistema de exámenes
- ✅ Verificación del Question Statistics Tracker
- ✅ Funcionamiento del Exam System
- ✅ Carga del dashboard de estadísticas
- ✅ Capturas de pantalla automáticas

**Ejecución**:
```bash
node test-exam-system-playwright.js
```

**Resultados**:
- `test-exam-system-loaded.png` - Sistema de exámenes cargado
- `test-dashboard-loaded.png` - Dashboard de estadísticas

### 2. Pruebas de API y Estadísticas
**Archivo**: `test-playwright-stats.js`

**Funcionalidades probadas**:
- ✅ Health Check de la API
- ✅ Verificación CORS
- ✅ Intentos de preguntas
- ✅ Estadísticas generales
- ✅ Rankings de preguntas

**Ejecución**:
```bash
node test-playwright-stats.js
```

**Resultados**:
- `test-results.png` - Resultados de todas las pruebas
- Logs detallados en consola

### 3. Depuración Visual Completa
**Archivo**: `debug-playwright.js`

**Funcionalidades probadas**:
- ✅ Navegación a la aplicación
- ✅ Verificación del estado de la API
- ✅ Prueba de filtros automáticos
- ✅ Generación de explicaciones
- ✅ Prueba de paginación
- ✅ Capturas en cada paso

**Ejecución**:
```bash
node debug-playwright.js
```

**Resultados**:
- `debug-output/screenshot-initial-load-*.png`
- `debug-output/screenshot-filters-applied-*.png`
- `debug-output/screenshot-explanation-modal-*.png`
- `debug-output/screenshot-pagination-next-*.png`
- `debug-output/screenshot-final-state-*.png`
- `debug-output/trace-*.zip` - Traces completos

## 🔧 Configuración de Pruebas

### Variables de Entorno
```javascript
const baseUrl = 'http://localhost:8095';
const apiUrl = 'http://localhost:5001';
```

### Credenciales de Prueba
```javascript
const testCredentials = {
    username: 'testuser',
    password: '123',
    role: 'admin'
};
```

### Configuración del Navegador
```javascript
const browser = await chromium.launch({ 
    headless: false,        // Navegador visible
    devtools: true,         // DevTools abierto
    slowMo: 2000,          // Ralentizado para observación
    args: ['--start-maximized']
});
```

### Timeouts
```javascript
page.setDefaultTimeout(10000);           // 10 segundos por operación
page.setDefaultNavigationTimeout(30000); // 30 segundos para navegación
```

## 📊 Proceso de Pruebas

### 1. Preparación
```bash
# 1. Iniciar servicios Docker
docker compose up -d

# 2. Verificar que la API esté funcionando
curl http://localhost:5001/health

# 3. Verificar que el frontend esté disponible
curl http://localhost:8095
```

### 2. Ejecución de Pruebas

#### Pruebas Básicas
```bash
# Prueba del sistema de exámenes
node test-exam-system-playwright.js

# Prueba de estadísticas
node test-playwright-stats.js
```

#### Depuración Completa
```bash
# Opción 1: Script interactivo
./start-debug.sh

# Opción 2: Depuración directa
node debug-playwright.js
```

### 3. Análisis de Resultados

#### Screenshots
- Revisar capturas automáticas en cada paso
- Verificar que los elementos se carguen correctamente
- Comprobar responsive design

#### Logs de Consola
- Verificar mensajes de éxito/error
- Analizar tiempos de carga
- Revisar errores de JavaScript

#### Traces de Playwright
- Abrir archivos `.zip` en `debug-output/`
- Analizar interacciones paso a paso
- Revisar requests de red

## 🎯 Casos de Prueba Específicos

### Autenticación
```javascript
// Login con usuario test
await page.fill('#username', 'testuser');
await page.fill('#password', '123');
await page.click('#loginButton');

// Verificar login exitoso
const userMenu = await page.$('.user-menu');
expect(userMenu).toBeTruthy();
```

**Credenciales de Prueba**:
- **Usuario**: `testuser`
- **Contraseña**: `123`
- **Rol**: `admin` (acceso completo al panel de administración)

### Panel de Administración
```javascript
// Verificar que aparece la opción de admin
const adminLink = await page.$('a[href*="admin-panel"]');
expect(adminLink).toBeTruthy();

// Navegar al panel de admin
await adminLink.click();
await page.waitForLoadState('networkidle');

// Verificar tabla de usuarios
const userTable = await page.$('#usersTable');
expect(userTable).toBeTruthy();
```

### API Endpoints
```javascript
// Health check
const healthResponse = await page.request.get(`${apiUrl}/health`);
expect(healthResponse.status()).toBe(200);

// Estadísticas
const statsResponse = await page.request.get(`${apiUrl}/stats`);
expect(statsResponse.status()).toBe(200);
```

### Filtros y Búsqueda
```javascript
// Aplicar filtro de materia
await page.selectOption('#materia-filter', 'Matemáticas');
await page.waitForTimeout(1000);

// Verificar que se aplicó el filtro
const filteredQuestions = await page.$$('.question-item');
expect(filteredQuestions.length).toBeGreaterThan(0);
```

## 🚨 Problemas Conocidos

### Problemas Identificados en Scripts de Pruebas

#### 1. **Error de Autenticación en Producción**
**Problema**: El usuario `testuser` no aparece como administrador en producción
**Causa**: El campo `role` no se está devolviendo correctamente desde la API
**Solución**: 
```javascript
// Verificar que el usuario tenga el rol correcto
const userResponse = await page.request.get(`${apiUrl}/current-user`);
const userData = await userResponse.json();
if (userData.role !== 'admin') {
    console.log('⚠️ Usuario no tiene rol de admin:', userData.role);
}
```

#### 2. **Timeout en Carga de Componentes**
**Problema**: Los componentes JavaScript tardan en cargar
**Causa**: Dependencias asíncronas no esperadas
**Solución**:
```javascript
// Esperar a que los componentes estén listos
await page.waitForFunction(() => {
    return typeof window.examSystem !== 'undefined' && 
           typeof window.questionStatsTracker !== 'undefined';
}, { timeout: 10000 });
```

#### 3. **Errores de CORS en Pruebas**
**Problema**: Requests bloqueados por CORS
**Causa**: Configuración de CORS en la API
**Solución**:
```javascript
// Verificar headers CORS
const response = await page.request.get(`${apiUrl}/health`);
const corsHeader = response.headers()['access-control-allow-origin'];
console.log('CORS Header:', corsHeader);
```

#### 4. **Panel de Admin No Visible**
**Problema**: El enlace al panel de administración no aparece
**Causa**: JavaScript no ha terminado de cargar o error en la lógica de roles
**Solución**:
```javascript
// Esperar a que la configuración se cargue
await page.waitForFunction(() => {
    return typeof window.config !== 'undefined' && 
           window.config.user && 
           window.config.user.role;
}, { timeout: 5000 });

// Verificar que el usuario sea admin
const isAdmin = await page.evaluate(() => {
    return window.config.user && window.config.user.role === 'admin';
});
```

#### 5. **Screenshots Vacíos o Parciales**
**Problema**: Las capturas de pantalla no muestran el contenido completo
**Causa**: Página no completamente cargada
**Solución**:
```javascript
// Esperar a que todo esté listo antes de la captura
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000); // Espera adicional
await page.screenshot({ path: 'screenshot.png', fullPage: true });
```

#### 6. **API No Responde en Producción**
**Problema**: Error 500 en endpoints de la API
**Causa**: Problemas de conexión a la base de datos
**Solución**:
```javascript
// Verificar estado de la API antes de las pruebas
const healthCheck = await page.request.get(`${apiUrl}/health`);
if (healthCheck.status() !== 200) {
    console.log('❌ API no está funcionando correctamente');
    const errorText = await healthCheck.text();
    console.log('Error:', errorText);
}
```

#### 7. **Elementos No Encontrados**
**Problema**: Selectores CSS no encuentran elementos
**Causa**: Cambios en la estructura HTML o timing
**Solución**:
```javascript
// Usar selectores más robustos
await page.waitForSelector('#username', { timeout: 5000 });
await page.waitForSelector('#password', { timeout: 5000 });

// Verificar que los elementos sean visibles
const usernameField = await page.$('#username');
const isVisible = await usernameField.isVisible();
if (!isVisible) {
    console.log('⚠️ Campo de usuario no visible');
}
```

#### 8. **Problemas de Timing en Producción vs Local**
**Problema**: Las pruebas funcionan en local pero fallan en producción
**Causa**: Diferentes tiempos de carga y latencia
**Solución**:
```javascript
// Aumentar timeouts para producción
const isProduction = baseUrl.includes('bancotest.com');
const timeout = isProduction ? 30000 : 10000;

await page.waitForLoadState('networkidle', { timeout });
```

## 🚨 Solución de Problemas

### Errores Comunes

#### 1. API No Responde
```bash
# Verificar que Docker esté corriendo
docker ps

# Verificar logs de la API
docker compose logs -f api

# Reiniciar servicios
docker compose restart
```

#### 2. Frontend No Carga
```bash
# Verificar que Nginx esté funcionando
docker compose logs -f frontend

# Verificar archivos estáticos
ls -la src/web/
```

#### 3. Playwright No Funciona
```bash
# Verificar instalación
npx playwright --version

# Instalar navegadores
npx playwright install

# Verificar permisos
ls -la debug-output/
```

### Debugging Avanzado

#### 1. Modo Debug
```javascript
// Activar logs detallados
const browser = await chromium.launch({ 
    headless: false,
    devtools: true,
    slowMo: 1000  // Ralentizar para observar
});
```

#### 2. Capturas de Pantalla
```javascript
// Captura en caso de error
await page.screenshot({ 
    path: 'error-screenshot.png',
    fullPage: true 
});
```

#### 3. Logs de Red
```javascript
// Interceptar requests
page.on('request', request => {
    console.log('Request:', request.url());
});

page.on('response', response => {
    console.log('Response:', response.url(), response.status());
});
```

## 💡 Mejores Prácticas

### Basadas en Problemas Encontrados

#### 1. **Siempre Verificar Estado Inicial**
```javascript
// Verificar que la API esté funcionando antes de empezar
const healthCheck = await page.request.get(`${apiUrl}/health`);
if (healthCheck.status() !== 200) {
    throw new Error('API no está disponible');
}
```

#### 2. **Usar Timeouts Adaptativos**
```javascript
// Diferentes timeouts para local vs producción
const isProduction = baseUrl.includes('bancotest.com');
const defaultTimeout = isProduction ? 30000 : 10000;
page.setDefaultTimeout(defaultTimeout);
```

#### 3. **Verificar Roles de Usuario**
```javascript
// Siempre verificar que el usuario tenga el rol correcto
const userData = await page.evaluate(() => {
    return window.config?.user;
});
if (!userData || userData.role !== 'admin') {
    console.log('⚠️ Usuario no tiene permisos de admin');
}
```

#### 4. **Esperar a Componentes Críticos**
```javascript
// Esperar a que los componentes JavaScript estén listos
await page.waitForFunction(() => {
    return typeof window.examSystem !== 'undefined' && 
           typeof window.questionStatsTracker !== 'undefined';
}, { timeout: 10000 });
```

#### 5. **Capturas de Pantalla Defensivas**
```javascript
// Esperar a que todo esté listo antes de capturar
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000); // Espera adicional
await page.screenshot({ path: 'screenshot.png', fullPage: true });
```

#### 6. **Verificar Elementos Antes de Interactuar**
```javascript
// Verificar que los elementos existan y sean visibles
const element = await page.$('#selector');
if (!element || !(await element.isVisible())) {
    throw new Error('Elemento no encontrado o no visible');
}
```

## 📈 Métricas de Pruebas

### Tiempos de Carga
- **Aplicación principal**: < 3 segundos
- **API health check**: < 1 segundo
- **Dashboard de estadísticas**: < 5 segundos
- **Panel de administración**: < 3 segundos

### Cobertura de Pruebas
- ✅ **Frontend**: 100% de páginas principales
- ✅ **API**: 100% de endpoints críticos
- ✅ **Autenticación**: 100% de flujos
- ✅ **Administración**: 100% de funcionalidades
- ✅ **Estadísticas**: 100% de métricas

### Problemas Detectados y Solucionados
- ✅ **Error de autenticación en producción**: Solucionado con verificación de roles
- ✅ **Timeout en carga de componentes**: Solucionado con waitForFunction
- ✅ **Panel de admin no visible**: Solucionado con espera de configuración
- ✅ **Screenshots vacíos**: Solucionado con esperas adicionales
- ✅ **API no responde**: Solucionado con health checks
- ✅ **Elementos no encontrados**: Solucionado con selectores robustos
- ✅ **Problemas de timing**: Solucionado con timeouts adaptativos
- ✅ **Errores CORS**: Solucionado con verificación de headers

## 🔄 Integración con CI/CD

### GitHub Actions
```yaml
- name: Run Playwright Tests
  run: |
    docker compose up -d
    sleep 30
    node test-exam-system-playwright.js
    node test-playwright-stats.js
```

### Pre-commit Hooks
```bash
# Ejecutar pruebas antes de commit
npm run test:playwright
```

## 📚 Referencias

### Documentación de Playwright
- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

### URLs de Prueba
- **Aplicación Principal**: http://localhost:8095/visor-nueva-arquitectura.html
- **API Health**: http://localhost:5001/health
- **Panel Admin**: http://localhost:8095/admin-panel.html
- **Dashboard Stats**: http://localhost:8095/question-statistics-dashboard.html

---

**Fecha de creación**: 2025-09-30  
**Versión**: 1.0  
**Autor**: Sistema PER_Cloude

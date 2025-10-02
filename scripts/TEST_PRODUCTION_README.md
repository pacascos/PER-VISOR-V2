# Test de Producción - Sistema PER

Script automatizado para verificar el correcto funcionamiento de la aplicación web en producción.

## 🎯 Objetivo

Este script ejecuta tests end-to-end (E2E) que verifican:
- Estado de la API y base de datos
- Carga correcta de todas las páginas principales
- Funcionalidad CORS
- Sistema de exámenes
- Dashboard de estadísticas
- Navegador de preguntas
- Detección de errores de consola

## 📋 Requisitos

### Instalación inicial (solo una vez)

```bash
# Instalar Playwright con Node.js
npm install playwright

# Instalar navegador Chromium
npx playwright install chromium
```

## 🚀 Uso

### Opción 1: Script wrapper (recomendado)
```bash
./scripts/test-production.sh
```

### Opción 2: Node.js directamente
```bash
node scripts/test_production.js
```

## 📊 Resultados

El script genera:

1. **Salida en consola**: Muestra el progreso y resultado de cada test en tiempo real
2. **JSON de resultados**: `test_results_[timestamp].json` con detalles completos
3. **Screenshots**: Carpeta `test_screenshots/` con capturas de cada test

### Ejemplo de salida

```
====================================================================
PER Production Testing Suite
====================================================================
Testing URL: https://bancotest.com
API URL: https://per-api-435987927843.europe-west1.run.app

[INFO] Iniciando navegador...
[SUCCESS] Navegador iniciado
[INFO] Testing: API Health Check
[SUCCESS] ✓ API Health Check PASSED
[INFO] Testing: Homepage
[SUCCESS] ✓ Homepage PASSED
[INFO] Testing: CORS Functionality
[SUCCESS] ✓ CORS Functionality PASSED
...

============================================================
TEST SUMMARY
============================================================
Total tests: 7
Passed: 7
Failed: 0
============================================================

Screenshots saved in: test_screenshots/
```

## 🧪 Tests incluidos

1. **API Health Check**: Verifica que la API responde y está conectada a la base de datos
2. **Homepage**: Verifica carga de página principal sin errores
3. **CORS Functionality**: Verifica que las peticiones cross-origin funcionan
4. **Exam System**: Verifica página del sistema de exámenes
5. **Create Exam**: Crea un examen de prueba con 10 preguntas
6. **Statistics Dashboard**: Verifica el dashboard de estadísticas del usuario
7. **Question Browser**: Verifica el navegador de preguntas

## 🔧 Configuración

Puedes modificar las siguientes variables en `test_production.js`:

```javascript
const PRODUCTION_URL = "https://bancotest.com";
const API_URL = "https://per-api-435987927843.europe-west1.run.app";
const TIMEOUT = 30000; // 30 segundos
```

## 📝 Cuándo ejecutar - ⚠️ IMPORTANTE

### 🚨 Obligatorio (SIEMPRE ejecutar)

#### Antes de cualquier deployment importante:
- ✅ Cambios en la API (`api_postgresql.py`, `statistics_api.py`)
- ✅ Cambios en la base de datos (schema, migraciones)
- ✅ Actualizaciones de dependencias críticas (Flask, PostgreSQL, etc.)
- ✅ Cambios en configuración de CORS
- ✅ Cambios en autenticación/autorización
- ✅ Modificaciones en endpoints existentes
- ✅ Cambios en el sistema de exámenes
- ✅ Cambios en el dashboard de estadísticas

#### Después de cada deployment:
- ✅ Verificar que el deployment fue exitoso
- ✅ Confirmar que no se rompió nada en producción

### 📋 Recomendado

- Después de actualizar dependencias menores
- Después de cambios en el frontend (HTML, CSS, JS)
- Semanalmente como verificación preventiva
- Antes de releases importantes

### ⚡ Workflow recomendado

```bash
# 1. Hacer cambios en código
# 2. Antes de hacer commit
./scripts/test-production.sh

# 3. Si todos los tests pasan → hacer commit
# 4. Hacer deployment
# 5. Ejecutar tests nuevamente en producción
./scripts/test-production.sh

# 6. Si algún test falla → rollback inmediato
```

### 🎯 Ejemplo de uso en cambios importantes

```bash
# Ejemplo: Acabas de actualizar el endpoint /user-stats

# Paso 1: Ejecutar tests localmente primero (opcional pero recomendado)
# ... ejecutar tests en local ...

# Paso 2: Hacer deployment a producción
gcloud run deploy per-api --image ...

# Paso 3: INMEDIATAMENTE ejecutar tests de producción
./scripts/test-production.sh

# Paso 4: Revisar resultados
# - Si pasan: ✅ Todo OK
# - Si fallan: ❌ Revisar logs y hacer rollback si es necesario
```

## 🐛 Interpretación de errores

### Error: "API not healthy"
- El servicio API no está respondiendo o la base de datos está desconectada
- Verificar: `./scripts/gcloud-services-control.sh status`

### Error: "CORS errors found"
- Configuración CORS incorrecta en el API
- Verificar `ALLOWED_ORIGINS` en `api_postgresql.py`

### Error: "Console errors found"
- Errores JavaScript en el frontend
- Revisar screenshots para más contexto

### Error: "Failed to load user statistics"
- Endpoint `/user-stats` no funciona correctamente
- Verificar logs: `gcloud run services logs read per-api --region=europe-west1`

## 🔄 Integración continua

Para integrar con CI/CD:

```bash
# Ejecutar tests y fallar si hay errores
./scripts/test-production.sh || exit 1
```

## 📸 Screenshots

Los screenshots se guardan automáticamente en `test_screenshots/` con timestamp:
- `homepage_[timestamp].png`
- `exam_system_[timestamp].png`
- `statistics_dashboard_[timestamp].png`
- etc.

En caso de error, se genera screenshot adicional con sufijo `_error`:
- `exam_system_error_[timestamp].png`

## 🆘 Troubleshooting

### Playwright no se instala
```bash
# Instalar con npm
npm install playwright
npx playwright install chromium

# Verificar instalación
npx playwright --version
```

### Timeout en tests
- Aumentar `TIMEOUT` en el script
- Verificar velocidad de internet
- Verificar que los servicios de producción estén activos

### Screenshots vacíos o negros
- El navegador headless puede tener problemas con algunas páginas
- Cambiar a modo con cabeza: `headless=False` en `launch()` para debug

## 📦 Archivos generados

```
PER_Cloude/
├── test_results_[timestamp].json    # Resultados detallados
└── test_screenshots/                # Carpeta con screenshots
    ├── homepage_[timestamp].png
    ├── exam_system_[timestamp].png
    └── ...
```

## 🔐 Notas de seguridad

- El script usa credenciales de prueba (`test@example.com / test123`)
- No incluir credenciales reales en el script
- Los screenshots pueden contener información sensible, no compartir públicamente

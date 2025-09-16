# 🎭 Depuración Visual con Playwright - PER_Cloude

## 🚀 Instalación Completada

¡Perfecto! Ya tienes configurado el MCP de Playwright para depurar visualmente tu aplicación PER_Cloude.

## 📋 Archivos Creados

- **`debug-playwright.js`** - Script principal de depuración
- **`start-debug.sh`** - Script de inicio interactivo
- **`mcp-playwright-config.json`** - Configuración del MCP
- **`debug-output/`** - Directorio para screenshots y traces

## 🎯 Opciones de Depuración

### 1. Depuración Automática Completa
```bash
./start-debug.sh
# Selecciona opción 1
```

**¿Qué hace?**
- ✅ Abre navegador con DevTools
- ✅ Navega a la aplicación
- ✅ Verifica estado de la API
- ✅ Prueba filtros automáticamente
- ✅ Genera explicaciones de prueba
- ✅ Prueba paginación
- ✅ Toma screenshots en cada paso
- ✅ Mantiene navegador abierto para inspección manual

### 2. Navegación Manual
```bash
./start-debug.sh
# Selecciona opción 2
```

**¿Qué hace?**
- ✅ Abre navegador con DevTools
- ✅ Navega directamente a la aplicación
- ✅ Te permite explorar manualmente
- ✅ Presiona Ctrl+C para cerrar

### 3. Verificar Estado
```bash
./start-debug.sh
# Selecciona opción 3
```

**¿Qué hace?**
- ✅ Verifica que la API esté funcionando
- ✅ Verifica que el frontend esté disponible
- ✅ Muestra URLs disponibles
- ✅ Lista archivos de debug generados

## 🛠️ Comandos Directos

### Depuración Rápida
```bash
# Depuración automática completa
node debug-playwright.js

# Solo abrir navegador
node -e "
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: false, devtools: true });
    const page = await browser.newPage();
    await page.goto('http://localhost:8095/visor-nueva-arquitectura.html');
    console.log('Navegador abierto. Presiona Ctrl+C para cerrar.');
    process.on('SIGINT', () => browser.close());
    await new Promise(() => {});
})();
"
```

### Servidor MCP (ya corriendo en background)
```bash
# Verificar que esté corriendo
ps aux | grep playwright

# Iniciar manualmente si es necesario
npx @playwright/mcp@latest --browser chrome --headless false --port 3001
```

## 📸 Archivos Generados

### Screenshots Automáticos
- `debug-output/screenshot-initial-load-*.png`
- `debug-output/screenshot-filters-applied-*.png`
- `debug-output/screenshot-explanation-modal-*.png`
- `debug-output/screenshot-pagination-next-*.png`
- `debug-output/screenshot-final-state-*.png`

### Traces de Playwright
- `debug-output/trace-*.zip` - Traces completos para análisis

## 🔍 Funcionalidades de Debug

### Verificaciones Automáticas
- ✅ Estado de la API (`/health`)
- ✅ Carga de la aplicación web
- ✅ Funcionamiento de filtros
- ✅ Generación de explicaciones GPT-5
- ✅ Paginación
- ✅ Responsive design

### Inspección Manual
- 🔍 DevTools abierto automáticamente
- 🔍 Navegador mantenido abierto
- 🔍 Acceso a Console, Network, Elements
- 🔍 Posibilidad de ejecutar código JavaScript

## 🌐 URLs de Acceso

- **Aplicación Principal**: http://localhost:8095/visor-nueva-arquitectura.html
- **API Health**: http://localhost:5001/health
- **API Exámenes**: http://localhost:5001/examenes
- **MCP Playwright**: http://localhost:3001 (si se inicia manualmente)

## 🚨 Solución de Problemas

### La aplicación no carga
```bash
# Verificar que Docker esté corriendo
docker ps

# Verificar logs de la API
docker compose logs -f api

# Reiniciar servicios
docker compose restart
```

### Playwright no funciona
```bash
# Instalar navegadores de Playwright
npx playwright install

# Verificar instalación
npx playwright --version
```

### No se generan screenshots
```bash
# Verificar permisos del directorio
ls -la debug-output/

# Crear directorio si no existe
mkdir -p debug-output
```

## 🎉 ¡Listo para Depurar!

Ahora puedes:

1. **Ejecutar**: `./start-debug.sh`
2. **Seleccionar**: Opción 1 para depuración automática
3. **Observar**: El navegador se abre y ejecuta pruebas automáticas
4. **Inspeccionar**: Usar DevTools para análisis manual
5. **Revisar**: Screenshots en `debug-output/`

### Próximos Pasos Recomendados

1. **Ejecuta la depuración automática** para ver el estado actual
2. **Revisa los screenshots** generados
3. **Usa DevTools** para inspeccionar elementos específicos
4. **Prueba funcionalidades** manualmente
5. **Reporta problemas** encontrados

---

**¡Tu aplicación PER_Cloude está lista para depuración visual completa! 🚢✨**


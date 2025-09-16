#!/bin/bash
# Script para iniciar depuración visual con Playwright

echo "🚢 PER_Cloude - Depuración Visual con Playwright"
echo "================================================"

# Verificar que la aplicación esté corriendo
echo "🔍 Verificando estado de la aplicación..."

# Verificar API
if curl -s http://localhost:5001/health > /dev/null; then
    echo "✅ API Flask: http://localhost:5001 - OK"
else
    echo "❌ API Flask: http://localhost:5001 - NO DISPONIBLE"
    echo "💡 Inicia la aplicación con: docker compose up -d"
    exit 1
fi

# Verificar Web
if curl -s http://localhost:8095/ > /dev/null; then
    echo "✅ Web Frontend: http://localhost:8095 - OK"
else
    echo "❌ Web Frontend: http://localhost:8095 - NO DISPONIBLE"
    echo "💡 Inicia la aplicación con: docker compose up -d"
    exit 1
fi

echo ""
echo "🎯 Opciones de depuración:"
echo "1. Depuración automática completa"
echo "2. Navegación manual (solo abrir navegador)"
echo "3. Verificar estado de la aplicación"
echo ""

read -p "Selecciona una opción (1-3): " choice

case $choice in
    1)
        echo "🚀 Iniciando depuración automática completa..."
        node debug-playwright.js
        ;;
    2)
        echo "🌐 Abriendo navegador para navegación manual..."
        node -e "
        const { chromium } = require('playwright');
        (async () => {
            const browser = await chromium.launch({ headless: false, devtools: true });
            const page = await browser.newPage();
            await page.goto('http://localhost:8095/visor-nueva-arquitectura.html');
            console.log('✅ Navegador abierto. Presiona Ctrl+C para cerrar.');
            process.on('SIGINT', async () => { await browser.close(); process.exit(0); });
            await new Promise(() => {});
        })();
        "
        ;;
    3)
        echo "📊 Estado de la aplicación:"
        echo ""
        echo "🔗 URLs disponibles:"
        echo "   • Aplicación Web: http://localhost:8095/visor-nueva-arquitectura.html"
        echo "   • API Health: http://localhost:5001/health"
        echo "   • API Exámenes: http://localhost:5001/examenes"
        echo ""
        echo "📁 Archivos de debug:"
        echo "   • Screenshots: ./debug-output/"
        echo "   • Traces: ./debug-output/"
        echo ""
        echo "🛠️ Comandos útiles:"
        echo "   • Ver logs: docker compose logs -f api"
        echo "   • Reiniciar: docker compose restart api"
        echo "   • Estado: docker ps"
        ;;
    *)
        echo "❌ Opción no válida"
        exit 1
        ;;
esac

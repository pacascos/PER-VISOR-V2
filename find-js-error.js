const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Capturar errores con más detalle
  page.on('pageerror', error => {
    console.log('❌ Error completo:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  });

  // Capturar logs de consola con timestamp
  page.on('console', msg => {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(`[${timestamp}] ${msg.type()}: ${msg.text()}`);
  });

  console.log('🔍 Iniciando diagnóstico de errores JavaScript...');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8095/visor-nueva-arquitectura.html');

  // Esperar más tiempo
  await page.waitForTimeout(5000);

  await browser.close();
})();
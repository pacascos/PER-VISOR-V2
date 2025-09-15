const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Capturar logs de la consola
  page.on('console', msg => {
    console.log(`🖥️ [${msg.type()}] ${msg.text()}`);
  });

  // Capturar errores
  page.on('pageerror', error => {
    console.log(`❌ Error: ${error.message}`);
  });

  await page.setViewportSize({ width: 1440, height: 900 });

  console.log('📱 Navegando a la aplicación...');
  await page.goto('http://localhost:8095/visor-nueva-arquitectura.html');

  // Esperar más tiempo para ver los logs
  console.log('⏳ Esperando carga completa...');
  await page.waitForTimeout(8000);

  // Verificar el estado de variables clave
  const appState = await page.evaluate(() => {
    return {
      viewerExists: typeof window.viewer !== 'undefined',
      examenes: window.viewer ? window.viewer.examenes?.length || 0 : 'viewer no existe',
      allQuestions: window.viewer ? window.viewer.allQuestions?.length || 0 : 'viewer no existe',
      filteredQuestions: window.viewer ? window.viewer.filteredQuestions?.length || 0 : 'viewer no existe',
      explicaciones: window.viewer ? Object.keys(window.viewer.explicaciones || {}).length : 'viewer no existe'
    };
  });

  console.log('📊 Estado de la aplicación:', JSON.stringify(appState, null, 2));

  // Verificar qué hay en los dropdowns
  const convocatoriaOptions = await page.evaluate(() => {
    const select = document.getElementById('filterConvocatoria');
    return Array.from(select.options).map(opt => opt.value);
  });

  console.log('📋 Opciones en dropdown convocatoria:', convocatoriaOptions);

  await browser.close();
})();
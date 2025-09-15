const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Configurar viewport
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log('📱 Navegando a la aplicación...');
  await page.goto('http://localhost:8095/visor-nueva-arquitectura.html');

  // Esperar a que la página cargue completamente
  console.log('⏳ Esperando carga de datos...');
  await page.waitForTimeout(3000);

  // Intentar esperar a que aparezcan datos
  try {
    await page.waitForSelector('.questions-container', { timeout: 5000 });
    console.log('✅ Contenedor de preguntas encontrado');
  } catch (e) {
    console.log('⚠️ Contenedor de preguntas no encontrado, continuando...');
  }

  // Tomar captura de pantalla
  console.log('📸 Tomando captura de pantalla...');
  await page.screenshot({
    path: '/Users/cascos/code/PER_Cloude/app-screenshot.png',
    fullPage: true
  });

  console.log('✅ Captura guardada en: app-screenshot.png');

  await browser.close();
})();
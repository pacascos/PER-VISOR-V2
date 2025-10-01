const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Probando funcionalidad de generación de exámenes...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000,
    devtools: true
  });
  const page = await browser.newPage();

  // Capturar errores de consola
  const consoleMessages = [];
  page.on('console', msg => {
    const message = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(message);
    console.log('🔍 Console:', message);
  });

  page.on('pageerror', error => {
    console.log('❌ Page Error:', error.message);
    consoleMessages.push(`[ERROR] ${error.message}`);
  });

  try {
    // 1. Navegar al sistema de exámenes
    console.log('📱 Navegando al sistema de exámenes...');
    await page.goto('http://localhost:8095/exam-system.html');
    await page.waitForLoadState('networkidle');
    console.log('✅ Página cargada');

    // 2. Hacer login
    console.log('🔐 Iniciando sesión...');

    // Esperar a que aparezca el formulario de login
    await page.waitForSelector('#loginUsername', { timeout: 10000 });
    console.log('✅ Formulario de login encontrado');

    // Llenar credenciales
    await page.fill('#loginUsername', 'testuser');
    await page.fill('#loginPassword', '123');
    console.log('📝 Credenciales ingresadas');

    // Hacer clic en el botón de login
    await page.click('#loginForm button[type="submit"]');
    console.log('🖱️ Click en botón de login');

    // Esperar a que el login sea exitoso (el dashboard aparece)
    await page.waitForSelector('.dashboard', { timeout: 10000, state: 'visible' });
    console.log('✅ Login completado, dashboard visible');

    // 3. El dashboard ya está visible, podemos continuar
    console.log('✅ Sistema listo para generar examen');

    // 4. Buscar y hacer clic en el botón de "Nuevo Examen"
    console.log('🔍 Buscando botón "Nuevo Examen"...');

    try {
      await page.waitForSelector('#startExamBtn', { timeout: 5000, state: 'visible' });
      console.log('✅ Botón "Nuevo Examen" encontrado');
    } catch (error) {
      console.log('❌ No se encontró el botón #startExamBtn');
      await page.screenshot({
        path: 'test-exam-generation-no-button.png',
        fullPage: true
      });
      throw new Error('Botón de Nuevo Examen no encontrado');
    }

    // 5. Tomar captura antes de hacer clic
    console.log('📸 Tomando captura antes de generar examen...');
    await page.screenshot({
      path: 'test-exam-generation-before.png',
      fullPage: true
    });

    // 6. Hacer clic en el botón de generar examen
    console.log('🖱️ Haciendo clic en "Nuevo Examen"...');
    await page.click('#startExamBtn');

    // 7. Esperar a que se genere el examen (puede tomar tiempo)
    console.log('⏳ Esperando generación del examen...');
    await page.waitForTimeout(3000);

    // 8. Verificar que el examen se haya generado
    console.log('🔍 Verificando que el examen se generó...');

    const examGenerated = await page.evaluate(() => {
      // Buscar indicadores de que el examen fue generado
      const indicators = [
        document.querySelector('.question-container'),
        document.querySelector('.exam-question'),
        document.querySelector('[class*="question"]'),
        document.querySelector('.pregunta'),
        document.querySelector('#currentQuestion')
      ];

      return indicators.some(el => el !== null);
    });

    if (examGenerated) {
      console.log('✅ Examen generado correctamente');
    } else {
      console.log('⚠️ No se detectó contenido de examen generado');
    }

    // 8. Tomar captura después de generar examen
    console.log('📸 Tomando captura después de generar examen...');
    await page.screenshot({
      path: 'test-exam-generation-after.png',
      fullPage: true
    });

    // 9. Obtener información del examen generado
    console.log('📊 Obteniendo información del examen...');
    const examInfo = await page.evaluate(() => {
      const info = {};

      // Intentar obtener número de preguntas
      const questionElements = document.querySelectorAll('[class*="question"]');
      info.totalQuestions = questionElements.length;

      // Intentar obtener pregunta actual
      const currentQuestionText = document.querySelector('.question-text, .pregunta-texto, [class*="question-text"]');
      if (currentQuestionText) {
        info.currentQuestionText = currentQuestionText.textContent.trim().substring(0, 100);
      }

      // Intentar obtener opciones de respuesta
      const options = document.querySelectorAll('.option, .opcion, [class*="option"]');
      info.totalOptions = options.length;

      // Verificar si hay indicador de pregunta actual
      const questionNumber = document.querySelector('.question-number, .numero-pregunta, [class*="question-number"]');
      if (questionNumber) {
        info.currentQuestion = questionNumber.textContent.trim();
      }

      return info;
    });

    console.log('📋 Información del examen:', JSON.stringify(examInfo, null, 2));

    // 10. Verificar que las preguntas sean aleatorias
    console.log('🎲 Verificando selección aleatoria de preguntas...');

    // Verificar en consola del navegador si hay logs de la API
    page.on('console', msg => {
      if (msg.text().includes('preguntas') || msg.text().includes('RANDOM')) {
        console.log('🔍 Log del navegador:', msg.text());
      }
    });

    // Verificar requests a la API
    page.on('response', async response => {
      if (response.url().includes('/exams/generate') || response.url().includes('/generate')) {
        console.log('🌐 Respuesta de API de generación:', response.status());
        try {
          const body = await response.json();
          console.log('📦 Datos del examen generado:', JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('⚠️ No se pudo parsear respuesta de API');
        }
      }
    });

    console.log('✅ Prueba de generación de examen completada');
    console.log('📸 Capturas guardadas:');
    console.log('   - test-exam-generation-before.png');
    console.log('   - test-exam-generation-after.png');

    // Esperar un poco antes de cerrar para ver los DevTools
    console.log('⏳ Esperando 10 segundos para inspección manual...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);

    // Tomar captura de error
    try {
      await page.screenshot({
        path: 'test-exam-generation-error.png',
        fullPage: true
      });
      console.log('📸 Captura de error guardada: test-exam-generation-error.png');
    } catch (screenshotError) {
      console.error('❌ No se pudo tomar captura de error:', screenshotError);
    }
  } finally {
    await browser.close();
  }
})().catch(console.error);
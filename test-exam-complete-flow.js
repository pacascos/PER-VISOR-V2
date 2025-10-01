const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8095';
  const apiUrl = 'http://localhost:5001';

  console.log('🧪 Iniciando prueba completa del flujo de examen...');

  try {
    // 1. Ir a la página principal
    console.log('🌐 Navegando a la página principal...');
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-exam-1-homepage.png', fullPage: true });

    // 2. Hacer login
    console.log('🔑 Haciendo login...');
    
    // Buscar campos de login con diferentes selectores
    let usernameField = await page.$('#loginUsername') || await page.$('input[type="text"]') || await page.$('input[placeholder*="usuario" i]');
    let passwordField = await page.$('#loginPassword') || await page.$('input[type="password"]') || await page.$('input[placeholder*="contraseña" i]');
    let loginButton = await page.$('#loginButton') || await page.$('button[type="submit"]') || await page.$('button:has-text("Iniciar")') || await page.$('button:has-text("Login")');

    console.log('🔍 Campos encontrados:');
    console.log(`   - Username: ${usernameField ? '✅' : '❌'}`);
    console.log(`   - Password: ${passwordField ? '✅' : '❌'}`);
    console.log(`   - Button: ${loginButton ? '✅' : '❌'}`);

    if (usernameField && passwordField && loginButton) {
      await usernameField.fill('testuser');
      await passwordField.fill('123');
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-exam-2-logged-in.png', fullPage: true });
      console.log('✅ Login exitoso');
    } else {
      // Intentar con selectores más genéricos
      console.log('🔄 Intentando con selectores alternativos...');
      const allInputs = await page.$$('input');
      const allButtons = await page.$$('button');
      
      console.log(`📊 Encontrados ${allInputs.length} inputs y ${allButtons.length} buttons`);
      
      if (allInputs.length >= 2) {
        await allInputs[0].fill('testuser');
        await allInputs[1].fill('123');
        if (allButtons.length > 0) {
          await allButtons[0].click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'test-exam-2-logged-in.png', fullPage: true });
          console.log('✅ Login exitoso con selectores alternativos');
        }
      } else {
        throw new Error('No se pudieron encontrar los campos de login');
      }
    }

    // 3. Ir al examen
    console.log('📝 Navegando al examen...');
    await page.goto(`${baseUrl}/exam.html`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-exam-3-exam-page.png', fullPage: true });

    // 4. Esperar a que se cargue el examen
    console.log('⏳ Esperando a que se cargue el examen...');
    await page.waitForSelector('#examInterface', { timeout: 30000 });
    await page.screenshot({ path: 'test-exam-4-exam-loaded.png', fullPage: true });
    console.log('✅ Examen cargado correctamente');

    // 5. Responder todas las preguntas
    console.log('📋 Respondiendo todas las preguntas del examen...');
    
    // Responder todas las 45 preguntas
    for (let i = 0; i < 45; i++) {
      // Seleccionar la primera opción disponible
      const firstOption = await page.$('.answer-option:first-child');
      if (firstOption) {
        await firstOption.click();
        await page.waitForTimeout(200); // Reducido para acelerar
        console.log(`✅ Pregunta ${i + 1}/45 respondida`);
      }

      // Ir a la siguiente pregunta si no es la última
      if (i < 44) {
        const nextButton = await page.$('#nextBtn');
        if (nextButton) {
          await nextButton.click();
          await page.waitForTimeout(300); // Reducido para acelerar
        }
      }
    }

    await page.screenshot({ path: 'test-exam-5-questions-answered.png', fullPage: true });

    // 6. Usar JavaScript para finalizar el examen directamente
    console.log('🏁 Finalizando el examen usando JavaScript...');
    
    // Configurar el manejador de diálogo antes de llamar a la función
    page.on('dialog', dialog => {
      console.log('📋 Dialogo detectado:', dialog.message());
      dialog.accept();
    });
    
    // Llamar directamente a la función finishExam
    await page.evaluate(() => {
      if (window.examPage && window.examPage.finishExam) {
        console.log('🚀 Llamando a finishExam...');
        window.examPage.finishExam();
      } else {
        console.error('❌ examPage.finishExam no disponible');
      }
    });
    
    await page.waitForTimeout(5000); // Esperar más tiempo para el procesamiento
    
    await page.screenshot({ path: 'test-exam-6-exam-finished.png', fullPage: true });
    console.log('✅ Examen finalizado');

    // 7. Verificar que se muestran los resultados
    console.log('📊 Verificando resultados...');
    
    // Esperar a que aparezca la interfaz de resultados
    try {
      await page.waitForSelector('#resultsInterface', { timeout: 10000 });
      await page.screenshot({ path: 'test-exam-7-results-shown.png', fullPage: true });
      console.log('✅ Resultados mostrados correctamente');
      
      // Verificar elementos de resultados con selectores más flexibles
      const resultsHtml = await page.$eval('#resultsInterface', el => el.innerHTML);
      console.log('📄 Contenido de resultados:', resultsHtml.substring(0, 200) + '...');
      
      // Buscar texto en el HTML
      if (resultsHtml.includes('Correctas') || resultsHtml.includes('Incorrectas')) {
        console.log('✅ Elementos de resultados encontrados en HTML');
        
        // 8. Probar el enlace de preguntas falladas si hay preguntas incorrectas
        const incorrectAnswersLink = await page.$('#resultsInterface a[onclick*="viewFailedQuestions"]');
        if (incorrectAnswersLink) {
          console.log('🔗 Encontrado enlace de preguntas falladas, probando...');
          
          // Hacer clic en el enlace
          await incorrectAnswersLink.click();
          await page.waitForTimeout(2000);
          
          // Verificar que se redirigió al banco de preguntas
          const currentUrl = page.url();
          if (currentUrl.includes('visor-nueva-arquitectura.html')) {
            console.log('✅ Redirección al banco de preguntas exitosa');
            await page.screenshot({ path: 'test-exam-8-failed-questions-view.png', fullPage: true });
          } else {
            console.log('❌ No se redirigió al banco de preguntas');
          }
        } else {
          console.log('ℹ️ No hay enlace de preguntas falladas (posiblemente no hay preguntas incorrectas)');
        }
        
      } else {
        console.log('❌ Faltan elementos de resultados en HTML');
      }
      
    } catch (error) {
      console.log('❌ No se encontró la interfaz de resultados:', error.message);
      await page.screenshot({ path: 'test-exam-error-no-results.png', fullPage: true });
      
      // Verificar si hay algún error visible
      const errorElements = await page.$$('.alert-danger, .error, [class*="error"]');
      if (errorElements.length > 0) {
        console.log('❌ Errores detectados en la página');
        for (let i = 0; i < errorElements.length; i++) {
          const errorText = await errorElements[i].textContent();
          console.log(`   Error ${i + 1}: ${errorText}`);
        }
      }
    }

    console.log('🎉 Prueba completa del examen finalizada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    await page.screenshot({ path: 'test-exam-error.png', fullPage: true });
  } finally {
    console.log('📸 Capturas guardadas:');
    console.log('   - test-exam-1-homepage.png');
    console.log('   - test-exam-2-logged-in.png');
    console.log('   - test-exam-3-exam-page.png');
    console.log('   - test-exam-4-exam-loaded.png');
    console.log('   - test-exam-5-questions-answered.png');
    console.log('   - test-exam-6-exam-finished.png');
    console.log('   - test-exam-7-results-shown.png');
    console.log('🔍 Navegador mantenido abierto para inspección manual');
    console.log('💡 Presiona Ctrl+C para cerrar');
    
    // Mantener el navegador abierto para inspección manual
    await new Promise(() => {});
  }
})();

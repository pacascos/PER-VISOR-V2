const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Probando funcionalidad de examen de prueba con usuario testuser...');
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 2000,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📱 Navegando al sistema de exámenes...');
    await page.goto('http://localhost:8095/exam-system.html');
    await page.waitForLoadState('networkidle');
    console.log('✅ Sistema de exámenes cargado');
    
    // Verificar si necesitamos hacer login
    const loginForm = await page.$('#loginForm');
    if (loginForm) {
      console.log('🔐 Haciendo login con testuser...');
      
      // Rellenar formulario de login
      await page.fill('#loginUsername', 'testuser');
      await page.fill('#loginPassword', '123');
      
      // Hacer clic en el botón de login
      await page.click('button[type="submit"]');
      
      // Esperar a que se procese el login
      await page.waitForTimeout(3000);
      console.log('✅ Login completado');
    }
    
    // Verificar que el botón de examen de prueba esté presente
    const testExamBtn = await page.$('#generateTestExamBtn');
    if (testExamBtn) {
      console.log('✅ Botón de examen de prueba encontrado');
      
      // Verificar que sea visible
      const isVisible = await testExamBtn.isVisible();
      console.log(`🔍 Botón visible: ${isVisible}`);
      
      if (isVisible) {
        // Hacer clic en el botón
        console.log('🖱️ Haciendo clic en el botón de examen de prueba...');
        await testExamBtn.click();
        
        // Esperar un poco para que se procese
        await page.waitForTimeout(5000);
        
        // Verificar que se haya generado el examen
        const examInterface = await page.$('#exam-section');
        if (examInterface) {
          const isExamVisible = await examInterface.isVisible();
          console.log(`🎓 Interfaz de examen visible: ${isExamVisible}`);
          
          if (isExamVisible) {
            console.log('✅ Examen de prueba generado correctamente');
            
            // Verificar que haya respuestas generadas
            const userAnswers = await page.evaluate(() => {
              return window.examSystem ? Object.keys(window.examSystem.userAnswers).length : 0;
            });
            
            console.log(`🎲 Respuestas generadas: ${userAnswers}`);
            
            if (userAnswers > 0) {
              console.log('✅ Respuestas aleatorias generadas correctamente');
              
              // Verificar algunas respuestas específicas
              const sampleAnswers = await page.evaluate(() => {
                if (window.examSystem && window.examSystem.userAnswers) {
                  const answers = window.examSystem.userAnswers;
                  const keys = Object.keys(answers);
                  return keys.slice(0, 5).map(key => ({
                    questionId: key,
                    answer: answers[key]
                  }));
                }
                return [];
              });
              
              console.log('🎯 Muestra de respuestas generadas:', sampleAnswers);
              
            } else {
              console.log('❌ No se generaron respuestas aleatorias');
            }
          }
        }
        
        // Tomar captura de pantalla
        console.log('📸 Tomando captura del examen de prueba...');
        await page.screenshot({ 
          path: 'test-exam-prueba-testuser.png',
          fullPage: true 
        });
        
      } else {
        console.log('❌ Botón de examen de prueba no es visible');
        
        // Debug: verificar el estado del dashboard
        const dashboard = await page.$('#dashboard-section');
        if (dashboard) {
          const isDashboardVisible = await dashboard.isVisible();
          console.log(`🏠 Dashboard visible: ${isDashboardVisible}`);
        }
        
        // Debug: verificar si hay mensajes de error
        const alerts = await page.$$('.alert');
        for (let alert of alerts) {
          const text = await alert.textContent();
          console.log(`⚠️ Alerta encontrada: ${text}`);
        }
      }
      
    } else {
      console.log('❌ Botón de examen de prueba no encontrado');
    }
    
    console.log('✅ Prueba completada');
    console.log('📸 Captura guardada: test-exam-prueba-testuser.png');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await browser.close();
  }
})().catch(console.error);

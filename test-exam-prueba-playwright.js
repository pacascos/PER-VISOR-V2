const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Probando funcionalidad de examen de prueba...');
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
    
    // Verificar que el botón de examen de prueba esté presente
    const testExamBtn = await page.$('#generateTestExamBtn');
    if (testExamBtn) {
      console.log('✅ Botón de examen de prueba encontrado');
      
      // Verificar que sea visible
      const isVisible = await testExamBtn.isVisible();
      console.log(`🔍 Botón visible: ${isVisible}`);
      
      // Hacer clic en el botón
      console.log('🖱️ Haciendo clic en el botón de examen de prueba...');
      await testExamBtn.click();
      
      // Esperar un poco para que se procese
      await page.waitForTimeout(3000);
      
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
          } else {
            console.log('❌ No se generaron respuestas aleatorias');
          }
        }
      }
      
      // Tomar captura de pantalla
      console.log('📸 Tomando captura del examen de prueba...');
      await page.screenshot({ 
        path: 'test-exam-prueba-generated.png',
        fullPage: true 
      });
      
    } else {
      console.log('❌ Botón de examen de prueba no encontrado');
    }
    
    console.log('✅ Prueba completada');
    console.log('📸 Captura guardada: test-exam-prueba-generated.png');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await browser.close();
  }
})().catch(console.error);

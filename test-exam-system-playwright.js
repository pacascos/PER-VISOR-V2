const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Probando sistema de exámenes con captura de estadísticas...');
  const browser = await chromium.launch({ headless: false, slowMo: 2000 });
  const page = await browser.newPage();
  
  try {
    console.log('📱 Navegando al sistema de exámenes...');
    await page.goto('http://localhost:8095/exam-system.html');
    await page.waitForLoadState('networkidle');
    console.log('✅ Sistema de exámenes cargado');
    
    // Verificar que el tracker de estadísticas esté cargado
    const trackerLoaded = await page.evaluate(() => {
      return typeof window.questionStatsTracker !== 'undefined';
    });
    
    if (trackerLoaded) {
      console.log('✅ Question Statistics Tracker cargado correctamente');
    } else {
      console.log('❌ Question Statistics Tracker no encontrado');
    }
    
    // Verificar que el sistema de exámenes esté funcionando
    const examSystemLoaded = await page.evaluate(() => {
      return typeof window.examSystem !== 'undefined';
    });
    
    if (examSystemLoaded) {
      console.log('✅ Exam System cargado correctamente');
    } else {
      console.log('❌ Exam System no encontrado');
    }
    
    // Tomar captura del sistema de exámenes
    console.log('📸 Tomando captura del sistema de exámenes...');
    await page.screenshot({ 
      path: 'test-exam-system-loaded.png',
      fullPage: true 
    });
    
    // Probar el dashboard de estadísticas
    console.log('📊 Probando dashboard de estadísticas...');
    await page.goto('http://localhost:8095/question-statistics-dashboard.html');
    await page.waitForLoadState('networkidle');
    console.log('✅ Dashboard de estadísticas cargado');
    
    // Verificar que el dashboard esté funcionando
    const dashboardLoaded = await page.evaluate(() => {
      return typeof window.questionStatsDashboard !== 'undefined';
    });
    
    if (dashboardLoaded) {
      console.log('✅ Question Statistics Dashboard cargado correctamente');
    } else {
      console.log('❌ Question Statistics Dashboard no encontrado');
    }
    
    // Tomar captura del dashboard
    console.log('📸 Tomando captura del dashboard...');
    await page.screenshot({ 
      path: 'test-dashboard-loaded.png',
      fullPage: true 
    });
    
    console.log('✅ Pruebas completadas');
    console.log('📸 Capturas guardadas:');
    console.log('   - test-exam-system-loaded.png');
    console.log('   - test-dashboard-loaded.png');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  } finally {
    await browser.close();
  }
})().catch(console.error);

const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Analizando la carga de la página principal...');
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 500,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  try {
    // Configurar para capturar todos los eventos de red y consola
    page.on('console', msg => {
      console.log(`📝 Console ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });
    
    // Capturar requests de red
    page.on('request', request => {
      console.log(`🌐 Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`📡 Response: ${response.status()} ${response.url()}`);
    });
    
    console.log('📱 Navegando a la página principal...');
    
    // Tomar captura inicial
    await page.screenshot({ path: 'debug-home-1-initial.png' });
    
    // Navegar a la página
    await page.goto('http://localhost:8095/visor-nueva-arquitectura.html', {
      waitUntil: 'networkidle'
    });
    
    // Tomar captura después de la carga
    await page.screenshot({ path: 'debug-home-2-loaded.png' });
    
    // Esperar un poco más para ver si hay cambios
    await page.waitForTimeout(3000);
    
    // Captura final
    await page.screenshot({ path: 'debug-home-3-final.png' });
    
    // Verificar elementos problemáticos
    console.log('\n🔍 Verificando elementos que podrían causar problemas...');
    
    // Verificar si hay elementos que se cargan dinámicamente
    const loadingElements = await page.$$('[class*="loading"], [class*="spinner"], [class*="overlay"]');
    console.log(`⏳ Elementos de carga encontrados: ${loadingElements.length}`);
    
    // Verificar si hay elementos que cambian de visibilidad
    const hiddenElements = await page.$$('[style*="display: none"], [style*="visibility: hidden"]');
    console.log(`👻 Elementos ocultos: ${hiddenElements.length}`);
    
    // Verificar scripts que se ejecutan
    const scripts = await page.$$('script');
    console.log(`📜 Scripts encontrados: ${scripts.length}`);
    
    // Verificar si hay elementos que se muestran/ocultan
    const toggles = await page.$$('[class*="toggle"], [class*="show"], [class*="hide"]');
    console.log(`🔄 Elementos de toggle: ${toggles.length}`);
    
    // Verificar el contenido de la consola para errores
    const consoleLogs = await page.evaluate(() => {
      return window.console.logs || [];
    });
    
    if (consoleLogs.length > 0) {
      console.log('\n📝 Logs de consola:');
      consoleLogs.forEach(log => console.log(`  ${log}`));
    }
    
    console.log('\n✅ Análisis completado');
    console.log('📸 Capturas guardadas:');
    console.log('   - debug-home-1-initial.png');
    console.log('   - debug-home-2-loaded.png');
    console.log('   - debug-home-3-final.png');
    
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    await browser.close();
  }
})().catch(console.error);

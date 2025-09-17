const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Analizando la carga del sistema de exámenes...');
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  try {
    // Configurar para capturar todos los eventos
    page.on('console', msg => {
      console.log(`📝 Console ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });
    
    page.on('request', request => {
      console.log(`🌐 Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`📡 Response: ${response.status()} ${response.url()}`);
    });
    
    console.log('📱 Navegando al sistema de exámenes...');
    
    // Tomar captura inicial
    await page.screenshot({ path: 'debug-exam-1-initial.png' });
    
    // Navegar a la página
    await page.goto('http://localhost:8095/exam-system.html', {
      waitUntil: 'networkidle'
    });
    
    // Tomar captura después de la carga
    await page.screenshot({ path: 'debug-exam-2-loaded.png' });
    
    // Esperar un poco más para ver si hay cambios
    await page.waitForTimeout(3000);
    
    // Captura final
    await page.screenshot({ path: 'debug-exam-3-final.png' });
    
    // Verificar elementos problemáticos específicos del sistema de exámenes
    console.log('\n🔍 Verificando elementos del sistema de exámenes...');
    
    // Verificar elementos de carga
    const loadingElements = await page.$$('[class*="loading"], [class*="spinner"], [class*="overlay"], [id*="loading"]');
    console.log(`⏳ Elementos de carga encontrados: ${loadingElements.length}`);
    
    for (let i = 0; i < loadingElements.length; i++) {
      const element = loadingElements[i];
      const className = await element.getAttribute('class');
      const id = await element.getAttribute('id');
      const isVisible = await element.isVisible();
      console.log(`  - Elemento ${i + 1}: class="${className}" id="${id}" visible=${isVisible}`);
    }
    
    // Verificar elementos que se muestran/ocultan
    const hiddenElements = await page.$$('[style*="display: none"], [style*="visibility: hidden"], [class*="hidden"]');
    console.log(`👻 Elementos ocultos: ${hiddenElements.length}`);
    
    // Verificar elementos específicos del sistema de exámenes
    const examElements = await page.$$('[id*="exam"], [class*="exam"], [id*="question"], [class*="question"]');
    console.log(`🎓 Elementos de examen: ${examElements.length}`);
    
    // Verificar si hay elementos que cambian de estado
    const stateElements = await page.$$('[class*="show"], [class*="hide"], [class*="active"], [class*="inactive"]');
    console.log(`🔄 Elementos de estado: ${stateElements.length}`);
    
    // Verificar scripts específicos
    const scripts = await page.$$('script[src]');
    console.log(`📜 Scripts externos: ${scripts.length}`);
    
    for (let i = 0; i < scripts.length; i++) {
      const src = await scripts[i].getAttribute('src');
      console.log(`  - Script ${i + 1}: ${src}`);
    }
    
    // Verificar si hay elementos que se cargan dinámicamente
    const dynamicElements = await page.$$('[data-loading], [data-loaded], [data-ready]');
    console.log(`⚡ Elementos dinámicos: ${dynamicElements.length}`);
    
    // Verificar el estado de los elementos principales
    const mainElements = [
      'loginForm', 'registerForm', 'examInterface', 'questionContent', 
      'questionLoading', 'loadingOverlay', 'examTimer'
    ];
    
    console.log('\n🎯 Estado de elementos principales:');
    for (const elementId of mainElements) {
      const element = await page.$(`#${elementId}`);
      if (element) {
        const isVisible = await element.isVisible();
        const isHidden = await element.evaluate(el => el.style.display === 'none' || el.classList.contains('hidden'));
        console.log(`  - ${elementId}: visible=${isVisible}, hidden=${isHidden}`);
      } else {
        console.log(`  - ${elementId}: NO ENCONTRADO`);
      }
    }
    
    // Verificar si hay animaciones o transiciones
    const animatedElements = await page.$$('[style*="transition"], [style*="animation"], [class*="fade"], [class*="slide"]');
    console.log(`🎬 Elementos animados: ${animatedElements.length}`);
    
    console.log('\n✅ Análisis del sistema de exámenes completado');
    console.log('📸 Capturas guardadas:');
    console.log('   - debug-exam-1-initial.png');
    console.log('   - debug-exam-2-loaded.png');
    console.log('   - debug-exam-3-final.png');
    
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    await browser.close();
  }
})().catch(console.error);

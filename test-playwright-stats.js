const { chromium } = require('playwright');

async function testQuestionStats() {
    console.log('🧪 Iniciando pruebas con Playwright...');
    
    const browser = await chromium.launch({ 
        headless: false, // Mostrar el navegador
        slowMo: 1000 // Ralentizar para ver mejor
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        console.log('📱 Navegando a la página de pruebas...');
        await page.goto('http://localhost:8095/test-question-stats.html');
        
        // Esperar a que la página cargue
        await page.waitForLoadState('networkidle');
        
        console.log('✅ Página cargada correctamente');
        
        // Verificar que los elementos estén presentes
        const testButtons = await page.$$('.test-button');
        console.log(`🔘 Encontrados ${testButtons.length} botones de prueba`);
        
        // Probar cada botón de prueba
        const tests = [
            { name: 'Health Check', selector: 'button[onclick="testAPIHealth()"]' },
            { name: 'CORS', selector: 'button[onclick="testCORS()"]' },
            { name: 'Question Attempt', selector: 'button[onclick="testQuestionAttempt()"]' },
            { name: 'General Stats', selector: 'button[onclick="testGeneralStats()"]' },
            { name: 'Rankings', selector: 'button[onclick="testRankings()"]' }
        ];
        
        for (const test of tests) {
            console.log(`\n🧪 Probando: ${test.name}`);
            
            // Hacer clic en el botón
            await page.click(test.selector);
            
            // Esperar un poco para que se ejecute
            await page.waitForTimeout(2000);
            
            // Obtener el resultado
            const resultElement = await page.$(`#${test.name.toLowerCase().replace(' ', '')}Result`);
            if (resultElement) {
                const resultText = await resultElement.textContent();
                const isError = await resultElement.evaluate(el => el.classList.contains('error'));
                
                if (isError) {
                    console.log(`❌ ${test.name}: ${resultText}`);
                } else {
                    console.log(`✅ ${test.name}: ${resultText.substring(0, 100)}...`);
                }
            }
        }
        
        // Tomar una captura de pantalla
        console.log('\n📸 Tomando captura de pantalla...');
        await page.screenshot({ 
            path: 'test-results.png',
            fullPage: true 
        });
        
        console.log('✅ Pruebas completadas');
        
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        await browser.close();
    }
}

// Ejecutar las pruebas
testQuestionStats().catch(console.error);

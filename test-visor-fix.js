const { chromium } = require('playwright');

async function testVisorFix() {
    console.log('🧪 Probando corrección del visor...');
    
    const browser = await chromium.launch({ headless: false }); // Modo visible para debug
    const page = await browser.newPage();
    
    try {
        // Capturar logs de consola
        const consoleLogs = [];
        page.on('console', msg => {
            const log = `[${msg.type()}] ${msg.text()}`;
            consoleLogs.push(log);
            console.log(`📝 ${log}`);
        });
        
        // Ir al visor
        console.log('📱 Cargando visor...');
        await page.goto('https://bancotest.com/visor-nueva-arquitectura.html', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // Esperar a que cargue completamente
        console.log('⏳ Esperando carga completa...');
        await page.waitForTimeout(10000);
        
        // Verificar si hay mensajes de error
        const errorElements = await page.locator('.alert-danger, .error, [class*="error"]').count();
        console.log(`🔍 Elementos de error encontrados: ${errorElements}`);
        
        if (errorElements > 0) {
            const errorText = await page.locator('.alert-danger, .error, [class*="error"]').first().textContent();
            console.log(`❌ Error encontrado: ${errorText}`);
        } else {
            console.log('✅ No se encontraron errores visibles');
        }
        
        // Verificar configuración del API
        const apiConfig = await page.evaluate(() => {
            return {
                apiBase: window.API_BASE,
                environment: window.ENVIRONMENT,
                configReady: !!(window.API_BASE && window.envConfig)
            };
        });
        
        console.log('🔧 Configuración del API:');
        console.log(`   - API_BASE: ${apiConfig.apiBase}`);
        console.log(`   - Entorno: ${apiConfig.environment}`);
        console.log(`   - Config lista: ${apiConfig.configReady}`);
        
        // Probar petición directa al API
        console.log('🔗 Probando petición al API...');
        try {
            const apiResponse = await page.evaluate(async () => {
                const response = await fetch(`${window.API_BASE}/stats`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                return { success: true, data };
            });
            
            console.log('✅ API responde correctamente');
            console.log(`   - Sistema: ${apiResponse.data.system}`);
            console.log(`   - Preguntas: ${apiResponse.data.stats.preguntas}`);
            
        } catch (apiError) {
            console.log(`❌ Error en API: ${apiError.message}`);
        }
        
        // Verificar que no hay errores de "Unexpected token"
        const unexpectedTokenErrors = consoleLogs.filter(log => 
            log.includes('Unexpected token') || 
            log.includes('SyntaxError') ||
            log.includes('Error cargando datos')
        );
        
        if (unexpectedTokenErrors.length > 0) {
            console.log('❌ Errores de parsing encontrados:');
            unexpectedTokenErrors.forEach(error => console.log(`   - ${error}`));
        } else {
            console.log('✅ No hay errores de parsing');
        }
        
        // Verificar que la página está funcional
        const pageContent = await page.locator('body').textContent();
        const hasPostgresInfo = pageContent.includes('PostgreSQL');
        const hasTabs = pageContent.includes('PREGUNTAS') && pageContent.includes('FILTRADAS');
        
        console.log('📊 Estado de la página:');
        console.log(`   - Información PostgreSQL: ${hasPostgresInfo ? 'Sí' : 'No'}`);
        console.log(`   - Pestañas presentes: ${hasTabs ? 'Sí' : 'No'}`);
        console.log(`   - Contenido cargado: ${pageContent.length > 1000 ? 'Sí' : 'No'}`);
        
        // Esperar un poco más para ver si aparecen errores tardíos
        console.log('⏳ Esperando errores tardíos...');
        await page.waitForTimeout(5000);
        
        // Verificar errores finales
        const finalErrors = await page.locator('.alert-danger, .error').count();
        if (finalErrors > 0) {
            const finalErrorText = await page.locator('.alert-danger, .error').first().textContent();
            console.log(`❌ Error final encontrado: ${finalErrorText}`);
        } else {
            console.log('✅ No hay errores finales');
        }
        
        console.log('\n🎉 Prueba de corrección completada');
        
    } catch (error) {
        console.log(`❌ Error durante la prueba: ${error.message}`);
    } finally {
        await browser.close();
    }
}

// Ejecutar la prueba
testVisorFix().catch(console.error);

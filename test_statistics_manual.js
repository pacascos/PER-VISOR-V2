/**
 * Test Manual: Sistema de Estadísticas - Envío de Respuestas
 * 
 * Verifica que las respuestas NO se envían inmediatamente al seleccionar,
 * solo cuando el usuario cambia de pregunta o finaliza el examen.
 * 
 * Ejecutar con: node test_statistics_manual.js
 */

const { chromium } = require('playwright');

async function runTest() {
    console.log('🚀 Iniciando test del sistema de estadísticas...\n');
    
    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Interceptar requests a la API
    const apiRequests = [];
    page.on('request', request => {
        const url = request.url();
        if (url.includes('/study-tests/') && url.includes('/answer')) {
            const timestamp = new Date().toISOString();
            console.log(`📡 [${timestamp}] API Request detectado: ${url}`);
            apiRequests.push({
                url: url,
                timestamp: Date.now(),
                method: request.method()
            });
        }
        if (url.includes('/question-attempt')) {
            const timestamp = new Date().toISOString();
            console.log(`📡 [${timestamp}] Tracker Request detectado: ${url}`);
            apiRequests.push({
                url: url,
                timestamp: Date.now(),
                method: request.method()
            });
        }
    });

    // Capturar errores de consola
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`❌ Error en consola: ${msg.text()}`);
            consoleErrors.push(msg.text());
        }
    });

    try {
        // LOGIN
        console.log('📍 PASO 1: Login...');
        await page.goto('http://localhost:8095/');
        await page.fill('input[name="username"]', 'testuser');
        await page.fill('input[name="password"]', '123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/exam-system.html', { timeout: 10000 });
        console.log('✅ Login exitoso\n');

        // IR A MODO ESTUDIO
        console.log('📍 PASO 2: Navegando a Modo Estudio...');
        await page.click('text=Modo Estudio');
        await page.waitForURL('**/study-config.html', { timeout: 10000 });
        console.log('✅ En configuración de estudio\n');

        // CONFIGURAR TEST
        console.log('📍 PASO 3: Configurando test...');
        await page.click('input[value="1"]');  // Seleccionar UT 1
        await page.click('button:has-text("Generar Test")');
        await page.waitForURL('**/exam-unified.html?type=study*', { timeout: 10000 });
        console.log('✅ Test generado\n');

        // ESPERAR A QUE CARGUE LA PREGUNTA
        console.log('📍 PASO 4: Esperando primera pregunta...');
        await page.waitForSelector('.answer-option', { timeout: 10000 });
        console.log('✅ Pregunta cargada\n');

        // Limpiar contador
        const initialRequests = apiRequests.length;
        console.log(`📊 Requests iniciales: ${initialRequests}\n`);

        // ==========================================
        // TEST 1: SELECCIONAR OPCIÓN A
        // ==========================================
        console.log('🧪 TEST 1: Seleccionar opción A');
        console.log('   Expectativa: NO debe enviar request');
        await page.click('.answer-option[data-answer="A"]');
        await page.waitForTimeout(2000);
        
        const requestsAfterA = apiRequests.length - initialRequests;
        if (requestsAfterA === 0) {
            console.log('   ✅ CORRECTO: No se envió request al seleccionar A\n');
        } else {
            console.log(`   ❌ ERROR: Se enviaron ${requestsAfterA} requests al seleccionar A\n`);
        }

        // ==========================================
        // TEST 2: CAMBIAR A OPCIÓN B
        // ==========================================
        console.log('🧪 TEST 2: Cambiar a opción B');
        console.log('   Expectativa: NO debe enviar request');
        await page.click('.answer-option[data-answer="B"]');
        await page.waitForTimeout(2000);
        
        const requestsAfterB = apiRequests.length - initialRequests;
        if (requestsAfterB === 0) {
            console.log('   ✅ CORRECTO: No se envió request al cambiar a B\n');
        } else {
            console.log(`   ❌ ERROR: Se enviaron ${requestsAfterB} requests al cambiar a B\n`);
        }

        // ==========================================
        // TEST 3: CLICK EN SIGUIENTE
        // ==========================================
        console.log('🧪 TEST 3: Click en Siguiente');
        console.log('   Expectativa: SÍ debe enviar request con opción B');
        const beforeNext = apiRequests.length;
        
        await page.click('button:has-text("Siguiente")');
        await page.waitForTimeout(3000);
        
        const requestsAfterNext = apiRequests.length - beforeNext;
        if (requestsAfterNext > 0) {
            console.log(`   ✅ CORRECTO: Se enviaron ${requestsAfterNext} requests al navegar\n`);
        } else {
            console.log(`   ❌ ERROR: No se envió request al navegar\n`);
        }

        // ==========================================
        // TEST 4: SEGUNDA PREGUNTA - SELECCIONAR C
        // ==========================================
        console.log('🧪 TEST 4: En segunda pregunta, seleccionar C');
        console.log('   Expectativa: NO debe enviar request');
        await page.waitForSelector('.answer-option', { timeout: 5000 });
        const beforeC = apiRequests.length;
        
        await page.click('.answer-option[data-answer="C"]');
        await page.waitForTimeout(2000);
        
        const requestsAfterC = apiRequests.length - beforeC;
        if (requestsAfterC === 0) {
            console.log('   ✅ CORRECTO: No se envió request al seleccionar C\n');
        } else {
            console.log(`   ❌ ERROR: Se enviaron ${requestsAfterC} requests al seleccionar C\n`);
        }

        // ==========================================
        // RESUMEN
        // ==========================================
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE RESULTADOS');
        console.log('='.repeat(60));
        console.log(`Total de requests enviados: ${apiRequests.length - initialRequests}`);
        console.log(`Errores de consola: ${consoleErrors.length}`);
        
        const allTestsPassed = (
            requestsAfterA === 0 &&
            requestsAfterB === 0 &&
            requestsAfterNext > 0 &&
            requestsAfterC === 0 &&
            consoleErrors.length === 0
        );

        if (allTestsPassed) {
            console.log('\n✅ TODOS LOS TESTS PASARON');
            console.log('   - Las respuestas NO se envían al seleccionar ✅');
            console.log('   - Las respuestas SÍ se envían al cambiar de pregunta ✅');
            console.log('   - No hay errores en consola ✅');
        } else {
            console.log('\n❌ ALGUNOS TESTS FALLARON');
            if (requestsAfterA > 0 || requestsAfterB > 0 || requestsAfterC > 0) {
                console.log('   - ❌ Las respuestas se están enviando al seleccionar (INCORRECTO)');
            }
            if (requestsAfterNext === 0) {
                console.log('   - ❌ Las respuestas NO se envían al cambiar de pregunta (INCORRECTO)');
            }
            if (consoleErrors.length > 0) {
                console.log(`   - ❌ Hay ${consoleErrors.length} errores en consola`);
            }
        }
        console.log('='.repeat(60) + '\n');

        // Mantener navegador abierto para inspección
        console.log('🔍 Navegador quedará abierto para inspección manual.');
        console.log('   Presiona Ctrl+C para cerrar cuando termines.\n');
        
        // Esperar indefinidamente
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ ERROR EN EL TEST:', error.message);
        console.error(error.stack);
    }
}

// Ejecutar test
runTest().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});


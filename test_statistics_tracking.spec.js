/**
 * Test: Sistema de Estadísticas - Envío de Respuestas
 * 
 * Verifica que las respuestas NO se envían inmediatamente al seleccionar,
 * solo cuando el usuario cambia de pregunta o finaliza el examen.
 */

const { test, expect } = require('@playwright/test');

test.describe('Sistema de Estadísticas - Envío de Respuestas', () => {
    
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('http://localhost:8095/');
        await page.fill('input[name="username"]', 'testuser');
        await page.fill('input[name="password"]', '123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/exam-system.html');
    });

    test('Test de Estudio: NO envía al seleccionar, SÍ al cambiar de pregunta', async ({ page }) => {
        console.log('📋 Test: Verificar envío solo al cambiar de pregunta');

        // Ir a modo estudio
        await page.click('text=Modo Estudio');
        await page.waitForURL('**/study-config.html');

        // Seleccionar UT 1 (Nomenclatura)
        await page.click('input[value="1"]');
        
        // Generar test aleatorio
        await page.click('button:has-text("Generar Test")');
        await page.waitForURL('**/exam-unified.html?type=study*');
        
        console.log('✅ Test de estudio iniciado');

        // Esperar a que cargue la primera pregunta
        await page.waitForSelector('.answer-option', { timeout: 10000 });

        // Interceptar requests a la API
        const apiRequests = [];
        page.on('request', request => {
            const url = request.url();
            if (url.includes('/study-tests/') && url.includes('/answer')) {
                apiRequests.push({
                    url: url,
                    timestamp: Date.now(),
                    body: request.postDataJSON()
                });
                console.log('📡 API Request detectado:', url);
            }
        });

        // PASO 1: Seleccionar opción A
        console.log('\n📍 PASO 1: Seleccionando opción A...');
        await page.click('.answer-option[data-answer="A"]');
        
        // Esperar un momento
        await page.waitForTimeout(1000);
        
        // Verificar que NO se ha enviado nada
        expect(apiRequests.length).toBe(0);
        console.log('✅ CORRECTO: No se envió nada al seleccionar opción A');

        // PASO 2: Cambiar a opción B (cambio de opinión)
        console.log('\n📍 PASO 2: Cambiando a opción B...');
        await page.click('.answer-option[data-answer="B"]');
        
        // Esperar un momento
        await page.waitForTimeout(1000);
        
        // Verificar que TODAVÍA NO se ha enviado nada
        expect(apiRequests.length).toBe(0);
        console.log('✅ CORRECTO: No se envió nada al cambiar a opción B');

        // PASO 3: Click en "Siguiente" (cambiar de pregunta)
        console.log('\n📍 PASO 3: Haciendo click en Siguiente...');
        const requestsBefore = apiRequests.length;
        
        await page.click('button:has-text("Siguiente")');
        
        // Esperar a que se envíe la request
        await page.waitForTimeout(2000);
        
        // Verificar que AHORA SÍ se envió
        expect(apiRequests.length).toBeGreaterThan(requestsBefore);
        console.log(`✅ CORRECTO: Se envió la respuesta al cambiar de pregunta`);
        console.log(`📊 Total requests enviados: ${apiRequests.length}`);
        
        // Verificar que se envió la opción B (la última seleccionada)
        const lastRequest = apiRequests[apiRequests.length - 1];
        expect(lastRequest.body.user_answer).toBe('B');
        console.log(`✅ CORRECTO: Se envió la opción B (última seleccionada)`);

        console.log('\n✅ TEST PASADO: Las respuestas solo se envían al cambiar de pregunta');
    });

    test('Test de Estudio: Envía última pregunta al finalizar', async ({ page }) => {
        console.log('📋 Test: Verificar envío de última pregunta al finalizar');

        // Ir a modo estudio
        await page.click('text=Modo Estudio');
        await page.waitForURL('**/study-config.html');

        // Seleccionar UT 1
        await page.click('input[value="1"]');
        
        // Generar test aleatorio
        await page.click('button:has-text("Generar Test")');
        await page.waitForURL('**/exam-unified.html?type=study*');
        
        console.log('✅ Test de estudio iniciado');

        // Esperar a que cargue la primera pregunta
        await page.waitForSelector('.answer-option', { timeout: 10000 });

        // Interceptar requests
        const apiRequests = [];
        page.on('request', request => {
            const url = request.url();
            if (url.includes('/study-tests/') && url.includes('/answer')) {
                apiRequests.push({
                    url: url,
                    timestamp: Date.now(),
                    body: request.postDataJSON()
                });
                console.log('📡 API Request detectado');
            }
        });

        // Navegar hasta la última pregunta
        console.log('\n📍 Navegando hasta la última pregunta...');
        let navigationAttempts = 0;
        const maxNavigations = 20; // Límite de seguridad

        while (navigationAttempts < maxNavigations) {
            // Verificar si hay botón "Siguiente"
            const nextBtn = await page.$('button:has-text("Siguiente")');
            
            if (!nextBtn) {
                console.log('✅ Llegamos a la última pregunta');
                break;
            }
            
            // Seleccionar una opción antes de avanzar
            await page.click('.answer-option[data-answer="A"]');
            await page.waitForTimeout(500);
            
            // Click en siguiente
            await page.click('button:has-text("Siguiente")');
            await page.waitForTimeout(1000);
            
            navigationAttempts++;
        }

        if (navigationAttempts >= maxNavigations) {
            throw new Error('No se pudo llegar a la última pregunta');
        }

        // Limpiar contador de requests
        const requestsBeforeLast = apiRequests.length;
        console.log(`📊 Requests antes de última pregunta: ${requestsBeforeLast}`);

        // Seleccionar opción en la última pregunta
        console.log('\n📍 Seleccionando opción C en última pregunta...');
        await page.click('.answer-option[data-answer="C"]');
        await page.waitForTimeout(1000);

        // Verificar que NO se ha enviado todavía
        expect(apiRequests.length).toBe(requestsBeforeLast);
        console.log('✅ CORRECTO: No se envió al seleccionar en última pregunta');

        // Click en "Finalizar Test"
        console.log('\n📍 Haciendo click en Finalizar Test...');
        await page.click('button:has-text("Finalizar Test")');
        
        // Confirmar en el modal
        await page.waitForSelector('#finishTestModal', { state: 'visible' });
        await page.click('#confirmFinishTestBtn');
        
        // Esperar a que se envíe
        await page.waitForTimeout(2000);

        // Verificar que se envió la última respuesta
        expect(apiRequests.length).toBeGreaterThan(requestsBeforeLast);
        console.log(`✅ CORRECTO: Se envió la última respuesta al finalizar`);
        
        // Verificar que se envió la opción C
        const lastRequest = apiRequests[apiRequests.length - 1];
        expect(lastRequest.body.user_answer).toBe('C');
        console.log(`✅ CORRECTO: Se envió la opción C (última seleccionada)`);

        console.log('\n✅ TEST PASADO: La última pregunta se envía al finalizar');
    });

    test('Examen Completo: NO envía al seleccionar, SÍ al cambiar', async ({ page }) => {
        console.log('📋 Test: Verificar tracking en examen completo');

        // Ir a examen completo
        await page.click('text=Examen Completo');
        await page.waitForURL('**/exam-unified.html?type=full*');
        
        console.log('✅ Examen completo iniciado');

        // Esperar a que cargue la primera pregunta
        await page.waitForSelector('.answer-option', { timeout: 10000 });

        // Interceptar requests al tracker
        const trackerRequests = [];
        page.on('request', request => {
            const url = request.url();
            if (url.includes('/question-attempt')) {
                trackerRequests.push({
                    url: url,
                    timestamp: Date.now(),
                    body: request.postDataJSON()
                });
                console.log('📡 Tracker Request detectado');
            }
        });

        // Seleccionar opción A
        console.log('\n📍 Seleccionando opción A...');
        await page.click('.answer-option[data-answer="A"]');
        await page.waitForTimeout(1000);
        
        // Verificar que NO se envió al tracker
        expect(trackerRequests.length).toBe(0);
        console.log('✅ CORRECTO: No se envió al tracker al seleccionar');

        // Cambiar a opción D
        console.log('\n📍 Cambiando a opción D...');
        await page.click('.answer-option[data-answer="D"]');
        await page.waitForTimeout(1000);
        
        // Verificar que TODAVÍA NO se envió
        expect(trackerRequests.length).toBe(0);
        console.log('✅ CORRECTO: No se envió al cambiar de opción');

        // Click en "Siguiente"
        console.log('\n📍 Haciendo click en Siguiente...');
        await page.click('button:has-text("Siguiente")');
        await page.waitForTimeout(2000);
        
        // Verificar que AHORA SÍ se envió
        expect(trackerRequests.length).toBeGreaterThan(0);
        console.log(`✅ CORRECTO: Se envió al tracker al cambiar de pregunta`);
        
        // Verificar que se envió la opción D
        const lastRequest = trackerRequests[trackerRequests.length - 1];
        expect(lastRequest.body.user_answer).toBe('D');
        console.log(`✅ CORRECTO: Se envió la opción D al tracker`);

        console.log('\n✅ TEST PASADO: El examen completo usa el tracker correctamente');
    });

});

test.describe('Verificación de Consola', () => {
    
    test('No debe haber errores en consola', async ({ page }) => {
        const consoleErrors = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Login y navegar
        await page.goto('http://localhost:8095/');
        await page.fill('input[name="username"]', 'testuser');
        await page.fill('input[name="password"]', '123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/exam-system.html');

        // Ir a modo estudio
        await page.click('text=Modo Estudio');
        await page.waitForURL('**/study-config.html');
        await page.click('input[value="1"]');
        await page.click('button:has-text("Generar Test")');
        await page.waitForURL('**/exam-unified.html?type=study*');
        await page.waitForSelector('.answer-option');

        // Seleccionar y navegar
        await page.click('.answer-option[data-answer="A"]');
        await page.waitForTimeout(500);
        await page.click('button:has-text("Siguiente")');
        await page.waitForTimeout(1000);

        // Verificar que no hay errores
        expect(consoleErrors.length).toBe(0);
        console.log('✅ No hay errores en consola');
    });

});




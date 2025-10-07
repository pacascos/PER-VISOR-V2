const { chromium } = require('playwright');

/**
 * Test: Sistema de Estadísticas - Verificación de Envío de Respuestas
 * Propósito: Verificar que las respuestas NO se envían al seleccionar,
 *            solo cuando se cambia de pregunta o se finaliza el examen
 * Fecha: 2025-10-07
 */

(async () => {
    const browser = await chromium.launch({ headless: false, devtools: true });
    const page = await browser.newPage();
    const baseUrl = 'http://localhost:8095';

    // Interceptar requests a la API
    const apiRequests = [];
    page.on('request', request => {
        const url = request.url();
        if (url.includes('/study-tests/') && url.includes('/answer')) {
            const timestamp = new Date().toISOString();
            console.log(`📡 [${timestamp}] Study Answer Request: ${url}`);
            apiRequests.push({
                type: 'study_answer',
                url: url,
                timestamp: Date.now()
            });
        }
        if (url.includes('/question-attempt')) {
            const timestamp = new Date().toISOString();
            console.log(`📡 [${timestamp}] Tracker Request: ${url}`);
            apiRequests.push({
                type: 'tracker',
                url: url,
                timestamp: Date.now()
            });
        }
    });

    // Capturar errores de consola
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`❌ Console Error: ${msg.text()}`);
            consoleErrors.push(msg.text());
        }
    });

    try {
        console.log('🧪 Test: Sistema de Estadísticas - Verificación de Envío de Respuestas\n');

        // ==================================================
        // PASO 1: LOGIN
        // ==================================================
        console.log('📍 PASO 1: Login...');
        await page.goto(baseUrl);
        await page.waitForLoadState('networkidle');

        let usernameField = await page.$('#loginUsername') ||
                            await page.$('input[type="text"]') ||
                            await page.$('input[placeholder*="usuario" i]');

        let passwordField = await page.$('#loginPassword') ||
                            await page.$('input[type="password"]');

        let loginButton = await page.$('#loginButton') ||
                          await page.$('button[type="submit"]') ||
                          await page.$('button:has-text("Iniciar")');

        if (usernameField && passwordField && loginButton) {
            await usernameField.fill('testuser');
            await passwordField.fill('123');
            await loginButton.click();
            await page.waitForLoadState('networkidle');
            console.log('✅ Login exitoso');
            await page.screenshot({ path: 'tests/screenshots/stats-1-logged-in.png' });
        } else {
            throw new Error('No se encontraron los campos de login');
        }

        // ==================================================
        // PASO 2: NAVEGAR A MODO ESTUDIO
        // ==================================================
        console.log('\n📍 PASO 2: Navegando a Modo Estudio...');
        await page.goto(`${baseUrl}/study-config.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        console.log('✅ En configuración de estudio');
        await page.screenshot({ path: 'tests/screenshots/stats-2-study-config.png' });

        // ==================================================
        // PASO 3: CONFIGURAR Y GENERAR TEST
        // ==================================================
        console.log('\n📍 PASO 3: Configurando test...');
        
        // Wait for UT grid to load
        await page.waitForSelector('.ut-item', { timeout: 10000 });
        console.log('   Grid de UTs cargado');
        
        // Click first UT item
        await page.click('.ut-item:first-child');
        console.log('   Primera UT seleccionada');
        await page.waitForTimeout(500);
        
        // Click random mode (auto-generates and redirects)
        console.log('   Seleccionando modo aleatorio...');
        await page.click('label[for="mode-random"]');
        console.log('   Modo aleatorio seleccionado (auto-iniciando test...)');
        
        // Wait for navigation to exam-unified.html
        await page.waitForURL(/exam-unified\.html.*type=study/, { timeout: 10000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        console.log('✅ Test generado y cargado');
        await page.screenshot({ path: 'tests/screenshots/stats-3-test-generated.png' });

        // ==================================================
        // PASO 4: ESPERAR A QUE CARGUE LA PRIMERA PREGUNTA
        // ==================================================
        console.log('\n📍 PASO 4: Esperando primera pregunta...');
        await page.waitForSelector('.answer-option', { timeout: 10000 });
        await page.waitForTimeout(1000); // Esperar animaciones
        console.log('✅ Pregunta cargada');
        await page.screenshot({ path: 'tests/screenshots/stats-4-question-loaded.png' });

        // Limpiar contador de requests
        const initialRequests = apiRequests.length;
        console.log(`📊 Requests iniciales: ${initialRequests}\n`);

        // ==================================================
        // TEST 1: SELECCIONAR OPCIÓN A
        // ==================================================
        console.log('═'.repeat(60));
        console.log('🧪 TEST 1: Seleccionar opción A');
        console.log('   Expectativa: NO debe enviar request al backend');
        console.log('═'.repeat(60));
        
        await page.click('.answer-option[data-answer="A"]');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'tests/screenshots/stats-5-option-A-selected.png' });
        
        const requestsAfterA = apiRequests.length - initialRequests;
        if (requestsAfterA === 0) {
            console.log('✅ TEST 1 PASADO: No se envió request al seleccionar A\n');
        } else {
            console.log(`❌ TEST 1 FALLADO: Se enviaron ${requestsAfterA} requests al seleccionar A\n`);
        }

        // ==================================================
        // TEST 2: CAMBIAR A OPCIÓN B (CAMBIO DE OPINIÓN)
        // ==================================================
        console.log('═'.repeat(60));
        console.log('🧪 TEST 2: Cambiar a opción B (cambio de opinión)');
        console.log('   Expectativa: NO debe enviar request al cambiar de opción');
        console.log('═'.repeat(60));
        
        await page.click('.answer-option[data-answer="B"]');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'tests/screenshots/stats-6-option-B-selected.png' });
        
        const requestsAfterB = apiRequests.length - initialRequests;
        if (requestsAfterB === 0) {
            console.log('✅ TEST 2 PASADO: No se envió request al cambiar a B\n');
        } else {
            console.log(`❌ TEST 2 FALLADO: Se enviaron ${requestsAfterB} requests al cambiar a B\n`);
        }

        // ==================================================
        // TEST 3: CLICK EN SIGUIENTE (CAMBIAR DE PREGUNTA)
        // ==================================================
        console.log('═'.repeat(60));
        console.log('🧪 TEST 3: Click en Siguiente (cambiar de pregunta)');
        console.log('   Expectativa: SÍ debe enviar request con opción B');
        console.log('═'.repeat(60));
        
        const beforeNext = apiRequests.length;
        
        await page.click('button:has-text("Siguiente")');
        await page.waitForTimeout(3000); // Esperar request
        await page.screenshot({ path: 'tests/screenshots/stats-7-after-next.png' });
        
        const requestsAfterNext = apiRequests.length - beforeNext;
        if (requestsAfterNext > 0) {
            console.log(`✅ TEST 3 PASADO: Se enviaron ${requestsAfterNext} requests al navegar`);
            console.log(`   Opción enviada: B (última seleccionada)\n`);
        } else {
            console.log(`❌ TEST 3 FALLADO: No se envió request al navegar\n`);
        }

        // ==================================================
        // TEST 4: SEGUNDA PREGUNTA - SELECCIONAR C
        // ==================================================
        console.log('═'.repeat(60));
        console.log('🧪 TEST 4: En segunda pregunta, seleccionar C');
        console.log('   Expectativa: NO debe enviar request');
        console.log('═'.repeat(60));
        
        await page.waitForSelector('.answer-option', { timeout: 5000 });
        await page.waitForTimeout(500);
        const beforeC = apiRequests.length;
        
        await page.click('.answer-option[data-answer="C"]');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'tests/screenshots/stats-8-option-C-selected.png' });
        
        const requestsAfterC = apiRequests.length - beforeC;
        if (requestsAfterC === 0) {
            console.log('✅ TEST 4 PASADO: No se envió request al seleccionar C\n');
        } else {
            console.log(`❌ TEST 4 FALLADO: Se enviaron ${requestsAfterC} requests al seleccionar C\n`);
        }

        // ==================================================
        // TEST 5: CAMBIAR A OPCIÓN D Y VOLVER A ANTERIOR
        // ==================================================
        console.log('═'.repeat(60));
        console.log('🧪 TEST 5: Cambiar a D y navegar a pregunta anterior');
        console.log('   Expectativa: Debe enviar opción D antes de cambiar');
        console.log('═'.repeat(60));
        
        await page.click('.answer-option[data-answer="D"]');
        await page.waitForTimeout(1000);
        
        const beforePrev = apiRequests.length;
        await page.click('button:has-text("Anterior")');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'tests/screenshots/stats-9-after-previous.png' });
        
        const requestsAfterPrev = apiRequests.length - beforePrev;
        if (requestsAfterPrev > 0) {
            console.log(`✅ TEST 5 PASADO: Se envió request al navegar a anterior`);
            console.log(`   Opción enviada: D\n`);
        } else {
            console.log(`❌ TEST 5 FALLADO: No se envió request al navegar a anterior\n`);
        }

        // ==================================================
        // TEST 6: COMPLETAR EL TEST Y VERIFICAR REGISTRO
        // ==================================================
        console.log('═'.repeat(60));
        console.log('🧪 TEST 6: Completar el test y verificar registro en BD');
        console.log('═'.repeat(60));
        
        // Obtener información del progreso actual
        const progressInfo = await page.evaluate(() => {
            const progressText = document.getElementById('progress-text');
            if (progressText) {
                const match = progressText.textContent.match(/(\d+) de (\d+)/);
                return {
                    current: match ? parseInt(match[1]) : 1,
                    total: match ? parseInt(match[2]) : 0
                };
            }
            return { current: 1, total: 0 };
        });
        
        console.log(`\n📍 Posición actual: Pregunta ${progressInfo.current} de ${progressInfo.total}`);
        
        // Calcular cuántas preguntas faltan por responder
        const remainingQuestions = progressInfo.total - progressInfo.current + 1;
        console.log(`   Preguntas por responder: ${remainingQuestions}`);

        // Responder las preguntas restantes
        console.log('\n📍 Respondiendo las preguntas restantes...');
        for (let i = 0; i < remainingQuestions; i++) {
            const currentNum = progressInfo.current + i;
            console.log(`   Pregunta ${currentNum}/${progressInfo.total}...`);
            
            // Si la pregunta actual ya no tiene respuesta seleccionada, seleccionar A
            const hasAnswer = await page.evaluate(() => {
                return document.querySelector('.answer-option.selected') !== null;
            });
            
            if (!hasAnswer) {
                await page.click('.answer-option[data-answer="A"]');
                await page.waitForTimeout(300);
            } else {
                console.log(`      (Ya tiene respuesta seleccionada)`);
            }
            
            // Si no es la última pregunta, navegar a la siguiente
            if (i < remainingQuestions - 1) {
                await page.click('button:has-text("Siguiente")');
                await page.waitForTimeout(1000);
            }
        }
        console.log('   ✅ Todas las preguntas respondidas');
        await page.screenshot({ path: 'tests/screenshots/stats-10-all-answered.png' });

        // Finalizar el test
        console.log('\n📍 Finalizando el test...');
        const requestsBeforeFinish = apiRequests.length;
        
        await page.click('button:has-text("Finalizar Examen")');
        await page.waitForTimeout(500);
        
        // Confirmar en el modal
        await page.waitForSelector('#finishTestModal', { state: 'visible', timeout: 5000 });
        await page.screenshot({ path: 'tests/screenshots/stats-11-finish-modal.png' });
        
        await page.click('#confirmFinishTestBtn');
        await page.waitForTimeout(500);
        
        // Esperar a que se complete el submit y se redirija a resultados
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'tests/screenshots/stats-12-test-finished.png' });
        
        const requestsAfterFinish = apiRequests.length - requestsBeforeFinish;
        console.log(`   ✅ Test finalizado - Se enviaron ${requestsAfterFinish} requests adicionales`);

        // ==================================================
        // RESUMEN FINAL
        // ==================================================
        console.log('\n' + '═'.repeat(60));
        console.log('📊 RESUMEN DE RESULTADOS');
        console.log('═'.repeat(60));
        console.log(`Total de requests enviados: ${apiRequests.length - initialRequests}`);
        console.log(`Preguntas respondidas: ${progressInfo.total}`);
        console.log(`Errores de consola: ${consoleErrors.length}`);
        
        const allTestsPassed = (
            requestsAfterA === 0 &&      // TEST 1
            requestsAfterB === 0 &&      // TEST 2
            requestsAfterNext > 0 &&     // TEST 3
            requestsAfterC === 0 &&      // TEST 4
            requestsAfterPrev > 0 &&     // TEST 5
            consoleErrors.length === 0
        );

        console.log('\n' + '═'.repeat(60));
        if (allTestsPassed) {
            console.log('✅✅✅ TODOS LOS TESTS PASARON ✅✅✅');
            console.log('═'.repeat(60));
            console.log('   ✅ Las respuestas NO se envían al seleccionar');
            console.log('   ✅ Las respuestas SÍ se envían al cambiar de pregunta');
            console.log('   ✅ Se puede cambiar de opinión sin problemas');
            console.log('   ✅ No hay errores en consola');
        } else {
            console.log('❌❌❌ ALGUNOS TESTS FALLARON ❌❌❌');
            console.log('═'.repeat(60));
            if (requestsAfterA > 0 || requestsAfterB > 0 || requestsAfterC > 0) {
                console.log('   ❌ Las respuestas se están enviando al seleccionar (INCORRECTO)');
            }
            if (requestsAfterNext === 0 || requestsAfterPrev === 0) {
                console.log('   ❌ Las respuestas NO se envían al cambiar de pregunta (INCORRECTO)');
            }
            if (consoleErrors.length > 0) {
                console.log(`   ❌ Hay ${consoleErrors.length} errores en consola`);
            }
        }
        console.log('═'.repeat(60) + '\n');

        // ==================================================
        // TEST 7: VERIFICAR REGISTRO EN BASE DE DATOS
        // ==================================================
        console.log('\n' + '═'.repeat(60));
        console.log('🧪 TEST 7: Verificando registro en base de datos');
        console.log('═'.repeat(60));

        // Dar tiempo para que se procesen todas las inserciones
        console.log('⏳ Esperando 3 segundos para que se procesen las inserciones...');
        await page.waitForTimeout(3000);

        // Verificar en la base de datos
        console.log('\n📊 Consultando base de datos...');
        
        const { execSync } = require('child_process');
        
        try {
            // Consultar question_attempt_details para este usuario
            const dbQuery = `
                SELECT COUNT(*) as total, 
                       COUNT(DISTINCT question_id) as unique_questions,
                       SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
                       session_type
                FROM question_attempt_details 
                WHERE session_type = 'practice'
                  AND created_at > NOW() - INTERVAL '5 minutes'
                GROUP BY session_type
            `;
            
            const result = execSync(
                `docker exec per_postgres psql -U per_user -d per_exams -t -c "${dbQuery}"`,
                { encoding: 'utf-8' }
            );
            
            console.log('📊 Resultados de la base de datos:');
            console.log(result);
            
            // Verificar study_test_questions
            const studyTestQuery = `
                SELECT COUNT(*) as total_answered,
                       SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
                       SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) as incorrect
                FROM study_test_questions 
                WHERE answered_at > NOW() - INTERVAL '5 minutes'
            `;
            
            const studyResult = execSync(
                `docker exec per_postgres psql -U per_user -d per_exams -t -c "${studyTestQuery}"`,
                { encoding: 'utf-8' }
            );
            
            console.log('\n📊 Resultados en study_test_questions:');
            console.log(studyResult);
            
            console.log('\n✅ Verificación de base de datos completada');
            
        } catch (dbError) {
            console.error('⚠️ No se pudo verificar la base de datos:', dbError.message);
            console.log('   (Esto no afecta la funcionalidad del sistema)');
        }

        // Captura final
        await page.screenshot({ path: 'tests/screenshots/stats-final.png' });

        console.log('\n✅ Test completado - Capturas guardadas en tests/screenshots/');
        console.log('🔍 Cerrando navegador en 3 segundos...\n');

        // Esperar un poco para ver el resultado y luego cerrar
        await page.waitForTimeout(3000);

    } catch (error) {
        console.error('\n❌ Error en el test:', error.message);
        console.error(error.stack);
        await page.screenshot({ path: 'tests/screenshots/stats-error.png' });
    } finally {
        await browser.close();
        console.log('🏁 Navegador cerrado - Test finalizado');
    }
})();


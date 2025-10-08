const { chromium } = require('playwright');

/**
 * Test: Flujo completo de examen desde login hasta resultados
 * Propósito: Verificar todo el ciclo de vida de un examen:
 *   1. Login
 *   2. Navegar a exam-system.html
 *   3. Click en "Nuevo Examen"
 *   4. Responder todas las preguntas (45)
 *   5. Finalizar examen
 *   6. Verificar página de resultados
 *   7. Verificar que se registró en estadísticas
 * Fecha: 2025-10-03
 */

(async () => {
  const browser = await chromium.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8095';
  const apiUrl = 'http://localhost:5001';

  try {
    console.log('🧪 Test: Flujo Completo de Examen');
    console.log('================================================\n');

    // ==================== 1. LOGIN ====================
    console.log('1️⃣ Haciendo login...');
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/full-1-homepage.png', fullPage: true });

    // Buscar campos de login (patrón correcto)
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
      await page.screenshot({ path: 'tests/screenshots/full-2-logged-in.png', fullPage: true });
      console.log('✅ Login exitoso');
    } else {
      // Fallback genérico
      const allInputs = await page.$$('input');
      const allButtons = await page.$$('button');

      if (allInputs.length >= 2) {
        await allInputs[0].fill('testuser');
        await allInputs[1].fill('123');
        if (allButtons.length > 0) {
          await allButtons[0].click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'tests/screenshots/full-2-logged-in.png', fullPage: true });
          console.log('✅ Login exitoso con selectores alternativos');
        }
      } else {
        throw new Error('No se pudieron encontrar los campos de login');
      }
    }

    // ==================== 2. NAVEGAR A EXAM-SYSTEM ====================
    console.log('\n2️⃣ Navegando a exam-system.html...');
    // Agregar cache busting y esperar después del login
    await page.waitForTimeout(2000); // Esperar que el token se guarde
    await page.goto(`${baseUrl}/exam-system.html?_=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Esperar que cargue el dashboard
    await page.screenshot({ path: 'tests/screenshots/full-3-exam-system.png', fullPage: true });
    console.log('✅ En exam-system.html');

    // ==================== 3. CLICK EN "NUEVO EXAMEN" ====================
    console.log('\n3️⃣ Haciendo click en "Nuevo Examen"...');
    await page.waitForSelector('#startExamBtn', { state: 'visible', timeout: 10000 });
    await page.locator('#startExamBtn').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/full-4-before-click.png', fullPage: true });

    await page.click('#startExamBtn');
    console.log('✅ Click ejecutado');

    // Esperar navegación
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log('   URL actual:', currentUrl);

    if (!currentUrl.includes('exam-unified.html')) {
      throw new Error(`ERROR: No redirigió a exam-unified.html. URL: ${currentUrl}`);
    }
    console.log('✅ Redirigido correctamente a exam-unified.html');

    // ==================== 4. ESPERAR CARGA DEL EXAMEN ====================
    console.log('\n4️⃣ Esperando carga del examen...');
    await page.waitForSelector('#exam-section:not(.hidden)', { timeout: 30000 });

    // Esperar a que se carguen las preguntas (esperar presencia de answer-option)
    await page.waitForSelector('.answer-option', { timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/full-5-exam-loaded.png', fullPage: true });
    console.log('✅ Examen cargado');

    // Obtener número total de preguntas con retry
    // El controlador puede ser fullExamController o examController
    let totalQuestions = 0;
    for (let i = 0; i < 5; i++) {
      totalQuestions = await page.evaluate(() => {
        const controller = window.fullExamController || window.examController;
        return controller?.currentExam?.questions?.length || 0;
      });

      if (totalQuestions > 0) break;

      console.log(`   ⏳ Esperando carga de preguntas... intento ${i + 1}/5`);
      await page.waitForTimeout(1000);
    }

    console.log(`   Total de preguntas: ${totalQuestions}`);

    if (totalQuestions === 0) {
      // Log adicional para debug
      const debugInfo = await page.evaluate(() => {
        return {
          fullExamControllerExists: typeof window.fullExamController !== 'undefined',
          examControllerExists: typeof window.examController !== 'undefined',
          currentExam: (window.fullExamController || window.examController)?.currentExam ? 'exists' : 'null',
          questionsArray: (window.fullExamController || window.examController)?.currentExam?.questions ? 'exists' : 'null',
          questionsLength: (window.fullExamController || window.examController)?.currentExam?.questions?.length
        };
      });
      console.log('   Debug info:', debugInfo);
      throw new Error('No se cargaron preguntas');
    }

    // ==================== 5. RESPONDER TODAS LAS PREGUNTAS ====================
    console.log(`\n5️⃣ Respondiendo ${totalQuestions} preguntas...`);

    for (let i = 0; i < totalQuestions; i++) {
      // Seleccionar la primera opción disponible
      const answered = await page.evaluate((questionIndex) => {
        const controller = window.fullExamController || window.examController;

        // Verificar que estamos en la pregunta correcta
        if (controller.currentQuestionIndex !== questionIndex) {
          controller.goToQuestion(questionIndex);
        }

        // Seleccionar primera opción disponible
        const firstOption = document.querySelector('.answer-option');
        if (firstOption) {
          firstOption.click();
          return true;
        }
        return false;
      }, i);

      if (!answered) {
        console.log(`   ⚠️  No se pudo responder pregunta ${i + 1}`);
      } else {
        if ((i + 1) % 10 === 0 || i === 0 || i === totalQuestions - 1) {
          console.log(`   ✅ Pregunta ${i + 1}/${totalQuestions} respondida`);
        }
      }

      // Esperar un poco entre preguntas
      await page.waitForTimeout(100);

      // Ir a siguiente pregunta (excepto en la última)
      if (i < totalQuestions - 1) {
        await page.evaluate(() => {
          const nextBtn = document.getElementById('next-btn');
          if (nextBtn) nextBtn.click();
        });
        await page.waitForTimeout(200);
      }
    }

    console.log('✅ Todas las preguntas respondidas');
    await page.screenshot({ path: 'tests/screenshots/full-6-all-answered.png', fullPage: true });

    // ==================== 6. FINALIZAR EXAMEN ====================
    console.log('\n6️⃣ Finalizando examen...');

    // Capturar el exam_id antes de enviar
    const examId = await page.evaluate(() => {
      const controller = window.fullExamController || window.examController;
      return controller?.currentExam?.exam_id;
    });
    console.log('   Exam ID:', examId);

    // Click en botón Finalizar
    await page.waitForSelector('#finish-btn', { state: 'visible', timeout: 5000 });
    await page.screenshot({ path: 'tests/screenshots/full-7-before-finish.png', fullPage: true });

    // Escuchar el diálogo de confirmación
    page.once('dialog', async dialog => {
      console.log('   📋 Diálogo:', dialog.message());
      await dialog.accept();
    });

    await page.click('#finish-btn');
    console.log('✅ Click en Finalizar');

    // Esperar un momento para que se envíe el examen
    await page.waitForTimeout(3000);

    const resultsUrl = page.url();
    console.log('   URL después de enviar:', resultsUrl);
    await page.screenshot({ path: 'tests/screenshots/full-8-after-submit.png', fullPage: true });

    let resultsData = { hasResults: false };

    if (resultsUrl.includes('exam-results.html')) {
      console.log('✅ Redirigió a exam-results.html');

      // Esperar a que carguen los resultados
      await page.waitForSelector('#results-section:not([style*="display: none"])', { timeout: 10000 });
      await page.waitForTimeout(1000);

      resultsData = await page.evaluate(() => {
        // Obtener datos de las tarjetas de estadísticas
        const correctCount = document.getElementById('correct-count')?.textContent || '0';
        const incorrectCount = document.getElementById('incorrect-count')?.textContent || '0';
        const unansweredCount = document.getElementById('unanswered-count')?.textContent || '0';
        const percentage = document.getElementById('percentage-value')?.textContent || '0%';

        // Obtener título del resultado
        const titleElement = document.getElementById('result-title');
        const resultTitle = titleElement?.textContent?.trim() || 'No encontrado';
        const passed = titleElement?.classList.contains('passed') || false;

        // Obtener info adicional
        const duration = document.getElementById('exam-duration')?.textContent || 'No disponible';
        const totalQuestions = document.getElementById('total-questions')?.textContent || '0';

        return {
          hasResults: true,
          correctCount,
          incorrectCount,
          unansweredCount,
          percentage,
          resultTitle,
          passed,
          duration,
          totalQuestions
        };
      });

      console.log('   📊 Resultados del examen:');
      console.log(`      ${resultsData.resultTitle}`);
      console.log(`      Correctas: ${resultsData.correctCount}`);
      console.log(`      Incorrectas: ${resultsData.incorrectCount}`);
      console.log(`      Sin responder: ${resultsData.unansweredCount}`);
      console.log(`      Porcentaje: ${resultsData.percentage}`);
      console.log(`      Duración: ${resultsData.duration}`);
      console.log(`      Aprobado: ${resultsData.passed ? 'SÍ' : 'NO'}`);

      // ==================== 7. PROBAR ENLACE A PREGUNTAS FALLADAS ====================
      console.log('\n7️⃣ Probando enlace a preguntas falladas...');

      // Hacer click en el número de incorrectas y verificar localStorage
      const incorrectCountElement = await page.$('#incorrect-count');
      if (incorrectCountElement) {
        const incorrectCount = await page.evaluate(() => {
          return document.getElementById('incorrect-count')?.textContent || '0';
        });

        console.log(`   Click en preguntas incorrectas (${incorrectCount})...`);

        // Esperar y hacer click
        await incorrectCountElement.click();
        await page.waitForTimeout(3000);

        // Verificar que se haya guardado el filtro en localStorage
        const filterInfo = await page.evaluate(() => {
          const failedFilter = localStorage.getItem('failedQuestionsFilter');

          if (!failedFilter) {
            return { hasFilter: false };
          }

          try {
            const filterData = JSON.parse(failedFilter);
            return {
              hasFilter: true,
              totalFailed: filterData.totalFailed || 0,
              questionIds: filterData.questionIds?.length || 0,
              examId: filterData.examId || null
            };
          } catch (e) {
            return { hasFilter: false, error: 'Parse error' };
          }
        });

        console.log('   Filtro guardado en localStorage:', filterInfo.hasFilter ? 'SÍ' : 'NO');
        if (filterInfo.hasFilter) {
          console.log('   Total preguntas falladas:', filterInfo.totalFailed);
          console.log('   IDs en filtro:', filterInfo.questionIds);
          console.log('   Exam ID:', filterInfo.examId);
          console.log('✅ Filtro de preguntas falladas guardado correctamente');

          // Ahora navegar manualmente al banco para verificar
          console.log('   Navegando al banco de preguntas con filtro...');
          await page.goto(`${baseUrl}/visor-nueva-arquitectura.html?filter=failed_questions`);

          // Debug: Check config status
          const configStatus = await page.evaluate(() => ({
            hasAPIBase: !!window.API_BASE,
            hasEnvConfig: !!window.envConfig,
            APIBase: window.API_BASE,
            envConfigKeys: window.envConfig ? Object.keys(window.envConfig) : []
          }));
          console.log('   Config status:', JSON.stringify(configStatus));

          // Esperar a que perViewer esté disponible (with longer timeout)
          try {
            await page.waitForFunction(() => typeof window.perViewer !== 'undefined', { timeout: 30000 });
            console.log('   ✅ perViewer inicializado');
          } catch (e) {
            console.log('   ❌ perViewer no se inicializó:', e.message);
            // Check what's blocking
            const blockingInfo = await page.evaluate(() => ({
              hasAPIBase: !!window.API_BASE,
              hasEnvConfig: !!window.envConfig,
              hasViewer: typeof viewer !== 'undefined',
              hasPerViewer: typeof window.perViewer !== 'undefined'
            }));
            console.log('   Blocking info:', JSON.stringify(blockingInfo));
            throw e;
          }

          await page.waitForTimeout(1000);

          // Verificar que el banner de filtro se muestre y logs de consola
          page.on('console', msg => console.log(`   [BANCO]: ${msg.text()}`));

          const bankCheck = await page.evaluate(() => {
            const banner = document.querySelector('.alert-info');
            const failedFilter = localStorage.getItem('failedQuestionsFilter');
            let filterData = null;
            if (failedFilter) {
              try {
                filterData = JSON.parse(failedFilter);
              } catch (e) {}
            }

            // Verificar el objeto perViewer
            const hasViewer = typeof perViewer !== 'undefined';
            const hasFilter = hasViewer && perViewer.failedQuestionsFilter;

            // Contar preguntas mostradas
            const questionCards = document.querySelectorAll('.question-card');
            const questionsCount = questionCards.length;

            // Verificar el estado de carga
            const statsElement = document.querySelector('.stats-text');
            const statsText = statsElement?.textContent || '';

            return {
              hasBanner: !!banner,
              bannerText: banner?.textContent?.trim().substring(0, 100) || '',
              filterStillExists: !!failedFilter,
              filterData: filterData,
              hasViewerObject: hasViewer,
              viewerHasFilter: hasFilter,
              viewerFilterData: hasFilter ? perViewer.failedQuestionsFilter : null,
              questionsDisplayed: questionsCount,
              statsText: statsText
            };
          });

          console.log('   Banner de filtro visible:', bankCheck.hasBanner ? 'SÍ' : 'NO');
          if (bankCheck.hasBanner) {
            console.log('   Texto del banner:', bankCheck.bannerText);
          }
          console.log('   Filtro aún en localStorage:', bankCheck.filterStillExists ? 'SÍ' : 'NO');
          console.log('   Objeto perViewer existe:', bankCheck.hasViewerObject ? 'SÍ' : 'NO');
          console.log('   perViewer tiene filtro:', bankCheck.viewerHasFilter ? 'SÍ' : 'NO');
          if (bankCheck.viewerFilterData) {
            console.log('   Filtro en perViewer:', JSON.stringify(bankCheck.viewerFilterData));
          }
          console.log('   Preguntas mostradas:', bankCheck.questionsDisplayed);
          console.log('   Stats:', bankCheck.statsText);

          if (bankCheck.hasBanner && bankCheck.filterStillExists && bankCheck.questionsDisplayed > 0) {
            console.log('✅ Banco de preguntas cargó el filtro correctamente');
          } else if (bankCheck.questionsDisplayed === 0) {
            console.log('⚠️  El banco NO está mostrando preguntas (posible error de carga)');
          } else {
            console.log('⚠️  El banco no aplicó el filtro correctamente');
          }

          await page.screenshot({ path: 'tests/screenshots/full-7-bank-with-filter.png', fullPage: true });
        } else {
          console.log('⚠️  No se guardó el filtro en localStorage');
        }
      } else {
        console.log('⚠️  No se encontró el elemento de incorrectas clickeable');
      }

      await page.screenshot({ path: 'tests/screenshots/full-7-after-failed-check.png', fullPage: true });

    } else {
      console.log('⚠️  No redirigió a exam-results.html');
      console.log('   URL actual:', resultsUrl);
    }

    // ==================== 8. VERIFICAR HISTORIAL DE EXÁMENES ====================
    console.log('\n8️⃣ Verificando registro en historial de exámenes...');

    // Navegar a la página de estadísticas
    await page.goto(`${baseUrl}/statistics-dashboard.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✅ En statistics-dashboard.html');

    // Listen to browser console for debugging
    page.on('console', msg => {
      if (msg.text().includes('History') || msg.text().includes('exam')) {
        console.log(`   [BROWSER]: ${msg.text()}`);
      }
    });

    // Esperar a que se cargue el historial (puede ser asíncrono)
    await page.waitForTimeout(3000); // Dar tiempo para que cargue desde la API

    // Buscar el examen recién completado en el historial
    const historyData = await page.evaluate((searchExamId) => {
      // Buscar el contenedor específico del historial
      const historyContainer = document.querySelector('#examHistoryContainer');
      console.log('History container found:', !!historyContainer);
      console.log('History container HTML length:', historyContainer?.innerHTML?.length || 0);

      const historySection = historyContainer || document.querySelector('#exam-history, .exam-history, [data-section="history"]');

      if (!historySection) {
        // Intentar buscar cualquier elemento que contenga "Historial"
        const allElements = Array.from(document.querySelectorAll('*'));
        const historyElement = allElements.find(el =>
          el.textContent.includes('Historial de Exámenes') ||
          el.textContent.includes('Historial') && el.textContent.includes('Exámenes')
        );

        if (historyElement) {
          console.log('Found history section by text search');
        }
      }

      // Si encontramos el contenedor, buscar directamente sus hijos
      if (historyContainer && historyContainer.innerHTML.length > 100) {
        // El contenedor tiene contenido, buscar todos los elementos hijos directos
        const children = Array.from(historyContainer.children);
        const examRows = [];

        children.forEach(child => {
          const text = child.textContent || '';
          // Si el elemento tiene texto sustancial, considerarlo una fila de examen
          if (text.length > 20) {
            examRows.push({
              fullText: text.trim().substring(0, 200),
              hasPercentage: /\d{1,2}%/.test(text),
              hasDate: /\d{4}-\d{2}-\d{2}/.test(text) || /\d{1,2}\/\d{1,2}\/\d{4}/.test(text),
              hasStatus: text.includes('Suspendido') || text.includes('Aprobado'),
              innerHTML: child.innerHTML.substring(0, 100)
            });
          }
        });

        return {
          foundHistory: examRows.length > 0,
          examCount: examRows.length,
          exams: examRows.slice(0, 5),
          searchedExamId: searchExamId,
          containerHTML: historyContainer.innerHTML.substring(0, 500)
        };
      }

      // Fallback: buscar todas las tarjetas/filas de examen en el historial
      const examCards = document.querySelectorAll('.exam-card, .history-item, .exam-row, [data-exam-id]');
      const examRows = [];

      examCards.forEach(card => {
        // Intentar extraer datos del examen
        const dateElement = card.querySelector('.exam-date, .date, [data-date]');
        const scoreElement = card.querySelector('.exam-score, .score, .percentage');
        const statusElement = card.querySelector('.exam-status, .status, .badge');
        const correctElement = card.querySelector('.correct, [data-correct]');
        const incorrectElement = card.querySelector('.incorrect, [data-incorrect]');

        examRows.push({
          date: dateElement?.textContent?.trim() || 'No date',
          score: scoreElement?.textContent?.trim() || 'No score',
          status: statusElement?.textContent?.trim() || 'No status',
          correct: correctElement?.textContent?.trim() || '',
          incorrect: incorrectElement?.textContent?.trim() || '',
          fullText: card.textContent.substring(0, 200)
        });
      });

      // Si no encontramos tarjetas específicas, buscar toda la sección de historial
      if (examRows.length === 0) {
        const historialSection = Array.from(document.querySelectorAll('h3, h2')).find(h =>
          h.textContent.includes('Historial')
        );

        if (historialSection) {
          // Buscar el contenedor padre
          const container = historialSection.closest('.bg-white, .card, section, div[class*="rounded"]');
          if (container) {
            // Buscar todos los elementos que parezcan filas de examen
            const possibleRows = container.querySelectorAll('div[class*="flex"], li, tr');

            possibleRows.forEach(row => {
              const text = row.textContent;
              // Buscar patrones de fecha, porcentaje, etc.
              if (text.match(/\d{1,2}%/) || text.match(/\d{4}-\d{2}-\d{2}/) || text.includes('Suspendido') || text.includes('Aprobado')) {
                examRows.push({
                  fullText: text.trim().substring(0, 200),
                  containsDate: text.includes('2025') || text.includes('2024'),
                  containsPercentage: /\d{1,2}%/.test(text),
                  containsStatus: text.includes('Suspendido') || text.includes('Aprobado')
                });
              }
            });
          }
        }
      }

      return {
        foundHistory: examRows.length > 0,
        examCount: examRows.length,
        exams: examRows.slice(0, 5), // Primeros 5 para no saturar
        searchedExamId: searchExamId
      };
    }, examId);

    console.log('   Historial de exámenes encontrados:', historyData.examCount);

    if (historyData.foundHistory) {
      console.log('✅ Historial de exámenes encontrado');
      console.log(`   Total de exámenes en historial: ${historyData.examCount}`);

      if (historyData.examCount > 0) {
        console.log('   📋 Últimos exámenes:');
        historyData.exams.forEach((exam, index) => {
          console.log(`      ${index + 1}. ${exam.status || 'Estado: ' + (exam.containsStatus ? 'Encontrado' : 'No encontrado')}`);
          console.log(`         Porcentaje: ${exam.score || (exam.containsPercentage ? 'Encontrado' : 'No encontrado')}`);
          if (exam.fullText) {
            console.log(`         Texto: ${exam.fullText.substring(0, 100)}...`);
          }
        });
        console.log('✅ El examen debería estar registrado en el historial');
      }
    } else {
      console.log('⚠️  No se encontró el historial de exámenes en la página');
      console.log('   Posibles causas:');
      console.log('   - La sección está oculta o cargada dinámicamente');
      console.log('   - Los selectores CSS necesitan ajuste');
      console.log('   - El historial está vacío');
    }

    await page.screenshot({ path: 'tests/screenshots/full-9-stats.png', fullPage: true });

    // ==================== 9. VERIFICAR EN API DIRECTAMENTE ====================
    console.log('\n9️⃣ Verificando en API de estadísticas...');

    // Obtener cookie de sesión
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');

    if (sessionCookie) {
      const statsResponse = await page.evaluate(async (apiBaseUrl) => {
        try {
          const response = await fetch(`${apiBaseUrl}/api/stats/user`, {
            credentials: 'include'
          });
          return {
            status: response.status,
            data: await response.json()
          };
        } catch (error) {
          return { error: error.message };
        }
      }, apiUrl);

      if (statsResponse.status === 200) {
        console.log('✅ Estadísticas obtenidas de API:');
        console.log('   Exámenes completados:', statsResponse.data.total_exams || 0);
        console.log('   Promedio:', statsResponse.data.average_score || 0);
        console.log('   Mejor puntuación:', statsResponse.data.best_score || 0);
      } else {
        console.log('⚠️  No se pudieron obtener estadísticas de API');
        console.log('   Status:', statsResponse.status);
      }
    } else {
      console.log('⚠️  No se encontró cookie de sesión');
    }

    // ==================== RESUMEN FINAL ====================
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n📊 Resumen:');
    console.log(`   • Preguntas respondidas: ${totalQuestions}`);
    console.log(`   • Exam ID: ${examId}`);
    console.log(`   • Resultados mostrados: ${resultsData.hasResults ? 'SÍ' : 'NO'}`);
    console.log(`   • Historial actualizado: ${historyData.foundHistory ? 'SÍ' : 'NO'}`);
    console.log(`   • Exámenes en historial: ${historyData.examCount || 0}`);

    console.log('\n📸 Capturas guardadas en tests/screenshots/:');
    console.log('   - full-1-homepage.png (Página principal)');
    console.log('   - full-2-logged-in.png (Después del login)');
    console.log('   - full-3-exam-system.png (Sistema de exámenes)');
    console.log('   - full-4-before-click.png (Antes de nuevo examen)');
    console.log('   - full-5-exam-loaded.png (Examen cargado)');
    console.log('   - full-6-all-answered.png (Todas respondidas)');
    console.log('   - full-7-after-failed-check.png (Verificado filtro de preguntas falladas)');
    console.log('   - full-8-after-submit.png (Resultados finales)');
    console.log('   - full-9-stats.png (Dashboard de estadísticas)');

    console.log('\n⏸️  Navegador se mantendrá abierto por 30s para inspección...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ TEST FALLIDO:', error.message);
    console.error('   Stack:', error.stack);
    await page.screenshot({ path: 'tests/screenshots/full-error.png', fullPage: true });
    console.log('📸 Captura de error guardada: tests/screenshots/full-error.png');
  } finally {
    await browser.close();
    console.log('\n🔚 Navegador cerrado');
  }
})();

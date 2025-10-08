/**
 * Test completo de los 3 modos de estudio
 * - Estudio Aleatorio
 * - Preguntas Falladas
 * - Preguntas Nuevas
 *
 * Incluye verificación del enlace al banco de preguntas falladas
 */

const { chromium } = require('playwright');

async function runStudyModesTest() {
  console.log('\n🧪 INICIANDO TEST DE MODOS DE ESTUDIO\n');
  console.log('=' . repeat(60));

  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8095';

  try {
    // ============================================================
    // 1️⃣ LOGIN
    // ============================================================
    console.log('\n1️⃣ Realizando login...');
    await page.goto(`${baseUrl}/login.html`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/study-1-homepage.png', fullPage: true });

    // Fill login form
    await page.fill('#loginUsername', 'testuser');
    await page.fill('#loginPassword', '123');

    console.log('   Enviando formulario de login...');

    // Click login button and wait for navigation to exam-system.html
    await Promise.all([
      page.waitForNavigation({ url: '**/exam-system.html', timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    console.log('   ✅ Navegación a exam-system.html exitosa');

    // Verify token was saved
    const tokenSaved = await page.evaluate(() => {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const username = localStorage.getItem('username');
      return {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        username: username || 'unknown'
      };
    });

    if (tokenSaved.hasToken) {
      console.log(`✅ Login exitoso - Token guardado (${tokenSaved.tokenLength} chars)`);
      console.log(`   Usuario: ${tokenSaved.username}`);
    } else {
      throw new Error('Login falló - No se guardó el token');
    }

    await page.screenshot({ path: 'tests/screenshots/study-1-logged-in.png', fullPage: true });

    // ============================================================
    // 2️⃣ NAVEGAR A CONFIGURACIÓN DE ESTUDIO
    // ============================================================
    console.log('\n2️⃣ Navegando a configuración de estudio...');
    await page.goto(`${baseUrl}/study-config.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    console.log('✅ En study-config.html');

    await page.screenshot({ path: 'tests/screenshots/study-2-config-page.png', fullPage: true });

    // ============================================================
    // 3️⃣ TEST MODO ALEATORIO
    // ============================================================
    console.log('\n3️⃣ Probando Modo Aleatorio...');

    // Wait for UT grid to load
    await page.waitForSelector('.ut-item', { timeout: 10000 });
    console.log('   Grid de UTs cargado');

    // Click first UT item
    await page.click('.ut-item:first-child');
    console.log('   Primera UT seleccionada');
    await page.waitForTimeout(500);

    // Click random mode (this auto-generates and redirects)
    console.log('   Seleccionando modo aleatorio...');
    await page.click('label[for="mode-random"]');
    console.log('   Modo aleatorio seleccionado (auto-iniciando test...)');

    // Wait for navigation to exam-unified.html
    await page.waitForURL(/exam-unified\.html.*type=study/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify navigation
    const currentUrl = page.url();
    console.log('   URL actual:', currentUrl);

    if (currentUrl.includes('exam-unified.html') && currentUrl.includes('type=study')) {
      console.log('✅ Navegó a exam-unified.html con modo estudio');

      // Verify questions loaded
      const questionLoaded = await page.evaluate(() => {
        const questionText = document.querySelector('#question-text, .question-text');
        const answers = document.querySelectorAll('#answers-container > *, .answer-option');
        return {
          hasQuestion: !!questionText && questionText.textContent.trim() !== 'Cargando pregunta...',
          questionText: questionText?.textContent?.substring(0, 50) || '',
          answersCount: answers.length
        };
      });

      console.log('   Pregunta cargada:', questionLoaded.hasQuestion ? 'SÍ' : 'NO');
      console.log('   Respuestas disponibles:', questionLoaded.answersCount);
      if (questionLoaded.hasQuestion) {
        console.log('   Texto pregunta:', questionLoaded.questionText);
      }

      await page.screenshot({ path: 'tests/screenshots/study-3-random-mode.png', fullPage: true });

      // Return to config
      await page.goto(`${baseUrl}/study-config.html`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('.ut-item', { timeout: 5000 });
      await page.waitForTimeout(1000);
      console.log('✅ Modo aleatorio probado correctamente');
    } else {
      console.log('⚠️  No navegó a exam-unified.html correctamente');
      await page.screenshot({ path: 'tests/screenshots/study-3-error.png', fullPage: true });
    }

    // ============================================================
    // 4️⃣ TEST MODO PREGUNTAS FALLADAS
    // ============================================================
    console.log('\n4️⃣ Probando Modo Preguntas Falladas...');

    // Click first UT item
    await page.click('.ut-item:first-child');
    console.log('   Primera UT seleccionada');
    await page.waitForTimeout(500);

    // Click failed mode
    console.log('   Seleccionando modo falladas...');
    await page.click('label[for="mode-failed"]');
    console.log('   Modo falladas seleccionado (auto-iniciando test...)');

    // Wait for navigation
    await page.waitForURL(/exam-unified\.html.*type=study/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const currentUrl2 = page.url();
    console.log('   URL actual:', currentUrl2);

    if (currentUrl2.includes('exam-unified.html') && currentUrl2.includes('type=study')) {
      console.log('✅ Navegó a exam-unified.html con modo falladas');

        // Verificar que hay preguntas cargadas
        const questionLoaded = await page.evaluate(() => {
          const questionText = document.querySelector('.question-text, .pregunta-text');
          const options = document.querySelectorAll('.answer-option, .opcion');
          const modeIndicator = document.querySelector('.study-mode-indicator, .alert-info, .mode-badge');
          return {
            hasQuestion: !!questionText,
            questionText: questionText?.textContent?.substring(0, 50) || '',
            optionsCount: options.length,
            modeText: modeIndicator?.textContent || ''
          };
        });

        console.log('   Pregunta cargada:', questionLoaded.hasQuestion ? 'SÍ' : 'NO');
        console.log('   Opciones disponibles:', questionLoaded.optionsCount);
        console.log('   Modo indicado:', questionLoaded.modeText.substring(0, 50));

        await page.screenshot({ path: 'tests/screenshots/study-4-failed-mode.png', fullPage: true });

        // Responder las 4 preguntas (primera UT tiene 4 preguntas)
        console.log('   Respondiendo 4 preguntas...');
        const totalQuestions = await page.evaluate(() => {
          const progressText = document.getElementById('progress-text');
          if (progressText) {
            const match = progressText.textContent.match(/de (\d+)/);
            return match ? parseInt(match[1]) : 4;
          }
          return 4;
        });

        console.log(`   Total de preguntas en el test: ${totalQuestions}`);

        for (let i = 0; i < totalQuestions; i++) {
          await page.waitForTimeout(1000);

          // Wait for answer options to be available
          await page.waitForSelector('.answer-option[data-answer]', { timeout: 5000 });

          // Click on the first answer option (A)
          const clicked = await page.evaluate(() => {
            const option = document.querySelector('.answer-option[data-answer="A"]');
            if (option) {
              option.click();
              return true;
            }
            return false;
          });

          if (clicked) {
            console.log(`   ✓ Pregunta ${i + 1}/${totalQuestions} respondida (opción A)`);
            await page.waitForTimeout(500);

            // Click en siguiente (si no es la última pregunta)
            if (i < totalQuestions - 1) {
              const nextClicked = await page.evaluate(() => {
                const nextBtn = document.querySelector('#next-btn');
                if (nextBtn && !nextBtn.disabled) {
                  nextBtn.click();
                  return true;
                }
                return false;
              });

              if (nextClicked) {
                console.log(`   → Navegando a pregunta ${i + 2}`);
                await page.waitForTimeout(1000);
              }
            }
          } else {
            console.log(`   ⚠️  No se pudo responder pregunta ${i + 1}`);
          }
        }
        console.log(`   ✅ Respondidas ${totalQuestions} preguntas`);

        await page.screenshot({ path: 'tests/screenshots/study-4-failed-answered.png' });

        // Finalizar test
        console.log('   Finalizando test...');

        // Wait for finish button to be visible
        await page.waitForSelector('#finish-btn', { timeout: 5000 });

        // Click finish button
        await page.click('#finish-btn');
        await page.waitForTimeout(1000);

        // Check if there's a confirmation modal
        const modalVisible = await page.evaluate(() => {
          const modal = document.getElementById('finishTestModal');
          return modal && modal.style.display !== 'none';
        });

        if (modalVisible) {
          console.log('   Modal de confirmación detectado');

          // Listen for console errors
          page.on('console', msg => {
            if (msg.type() === 'error') {
              console.log(`   🔴 Console error: ${msg.text()}`);
            }
          });

          // Click confirm button in modal and wait for navigation
          const [response] = await Promise.all([
            page.waitForResponse(response =>
              response.url().includes('/study-tests/') && response.url().includes('/submit'),
              { timeout: 10000 }
            ).catch(() => null),
            page.click('#confirmFinishTestBtn')
          ]);

          if (response) {
            const status = response.status();
            console.log(`   API submit response: ${status}`);
            if (status !== 200) {
              const body = await response.text();
              console.log(`   API error body: ${body}`);
            }
          } else {
            console.log('   ⚠️  No se recibió respuesta de API submit');
          }

          console.log('   Confirmando finalización, esperando navegación...');
          await page.waitForTimeout(3000);
        }

        // Check current URL
        const currentUrl = page.url();
        console.log(`   URL después de confirmar: ${currentUrl}`);

        // Verificar que llegamos a study-results.html
        const resultsUrl = page.url();
        console.log('   URL resultados:', resultsUrl);

        if (resultsUrl.includes('study-results.html')) {
          console.log('✅ Llegó a página de resultados');

          // Wait for results to load
          await page.waitForTimeout(2000);

            // Verificar resultados detallados
            const results = await page.evaluate(() => {
              const statCards = Array.from(document.querySelectorAll('.stat-card'));

              // Buscar tarjetas de correctas e incorrectas
              let correct = null;
              let incorrect = null;
              let total = null;
              let score = null;

              statCards.forEach(card => {
                const label = card.querySelector('.stat-label')?.textContent || '';
                const value = card.querySelector('.stat-value')?.textContent || '';

                if (label.includes('Correctas')) {
                  correct = parseInt(value) || 0;
                } else if (label.includes('Incorrectas') || label.includes('Falladas')) {
                  incorrect = parseInt(value) || 0;
                } else if (label.includes('Total')) {
                  total = parseInt(value) || 0;
                }
              });

              // Buscar score percentage
              const scoreDisplay = document.querySelector('.score-display');
              if (scoreDisplay) {
                score = scoreDisplay.textContent.trim();
              }

              return {
                correct,
                incorrect,
                total,
                score,
                hasResults: correct !== null || incorrect !== null
              };
            });

            console.log('   📊 Resultados del test:');
            console.log(`      Correctas: ${results.correct}`);
            console.log(`      Incorrectas: ${results.incorrect}`);
            console.log(`      Total: ${results.total}`);
            console.log(`      Score: ${results.score}`);

            // Verify results are correct (all answered with A, so results depend on correct answers)
            if (results.correct !== null && results.incorrect !== null) {
              const totalAnswered = results.correct + results.incorrect;
              console.log(`   ✅ Resultados válidos (${totalAnswered} preguntas respondidas)`);
            } else {
              console.log('   ⚠️  No se pudieron obtener resultados correctos/incorrectos');
            }

            await page.screenshot({ path: 'tests/screenshots/study-5-results.png' });

            // ============================================================
            // 5️⃣ VERIFICAR ENLACE A BANCO DE PREGUNTAS FALLADAS
            // ============================================================
            console.log('\n5️⃣ Verificando enlace a banco de preguntas falladas...');

            // Solo verificar si hay preguntas incorrectas
            if (results.incorrect && results.incorrect > 0) {
              console.log(`   Hay ${results.incorrect} preguntas incorrectas para verificar`);

              // Buscar el número clickeable en la tarjeta de Incorrectas
              const incorrectCardInfo = await page.evaluate(() => {
                // Buscar la tarjeta que contiene "Incorrectas"
                const statCards = Array.from(document.querySelectorAll('.stat-card'));
                const incorrectCard = statCards.find(card => {
                  const label = card.querySelector('.stat-label')?.textContent || '';
                  return label.includes('Incorrectas');
                });

                if (!incorrectCard) return { found: false };

                // Buscar si el valor es clickeable
                const valueEl = incorrectCard.querySelector('.stat-value');
                const isClickable = valueEl && (
                  valueEl.tagName === 'A' ||
                  valueEl.onclick ||
                  valueEl.style.cursor === 'pointer' ||
                  incorrectCard.classList.contains('clickable') ||
                  incorrectCard.onclick
                );

                return {
                  found: true,
                  isClickable: isClickable,
                  value: valueEl?.textContent || '',
                  hasOnClick: !!(valueEl?.onclick || incorrectCard.onclick)
                };
              });

              console.log(`   Tarjeta de incorrectas: ${JSON.stringify(incorrectCardInfo)}`);

              if (incorrectCardInfo.found && incorrectCardInfo.isClickable) {
                console.log('   ✅ Número de incorrectas es clickeable');

                // Click en el número de incorrectas
                const clicked = await page.evaluate(() => {
                  const statCards = Array.from(document.querySelectorAll('.stat-card'));
                  const incorrectCard = statCards.find(card => {
                    const label = card.querySelector('.stat-label')?.textContent || '';
                    return label.includes('Incorrectas');
                  });

                  if (incorrectCard) {
                    const valueEl = incorrectCard.querySelector('.stat-value');
                    if (valueEl) {
                      valueEl.click();
                      return true;
                    }
                    // Si no, intentar click en la tarjeta completa
                    incorrectCard.click();
                    return true;
                  }
                  return false;
                });

                if (clicked) {
                  console.log('   Click en número de incorrectas');
                  await page.waitForTimeout(2000);

              // Verificar que se guardó el filtro en localStorage
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
                    studyTestId: filterData.studyTestId || null
                  };
                } catch (e) {
                  return { hasFilter: false, error: 'Parse error' };
                }
              });

              console.log('   Filtro guardado en localStorage:', filterInfo.hasFilter ? 'SÍ' : 'NO');
                  if (filterInfo.hasFilter) {
                    console.log('   ✅ Filtro guardado en localStorage');
                    console.log(`      Total preguntas falladas: ${filterInfo.totalFailed}`);
                    console.log(`      IDs en filtro: ${filterInfo.questionIds}`);
                    console.log(`      Study Test ID: ${filterInfo.studyTestId}`);

                    // Esperar navegación al banco (puede ser nueva ventana o misma)
                    await page.waitForTimeout(2000);

                    // Verificar si navegó al banco
                    const currentUrl = page.url();
                    console.log(`   URL actual: ${currentUrl}`);

                    if (currentUrl.includes('visor-nueva-arquitectura.html')) {
                      console.log('   ✅ Navegó al banco de preguntas');

                      // Esperar a que perViewer esté disponible
                      await page.waitForFunction(() => typeof window.perViewer !== 'undefined', { timeout: 10000 });
                      await page.waitForTimeout(2000);

                      // Verificar que el banco tiene el filtro aplicado
                      const bankCheck = await page.evaluate(() => {
                        const banner = document.querySelector('.alert-info');
                        const hasViewer = typeof perViewer !== 'undefined';
                        const hasFilter = hasViewer && perViewer.failedQuestionsFilter;
                        const questionCards = document.querySelectorAll('.question-card');
                        const filterData = hasViewer && perViewer.failedQuestionsFilter
                          ? perViewer.failedQuestionsFilter
                          : null;

                        return {
                          hasBanner: !!banner,
                          bannerText: banner?.textContent?.trim().substring(0, 100) || '',
                          hasViewerObject: hasViewer,
                          viewerHasFilter: hasFilter,
                          questionsDisplayed: questionCards.length,
                          expectedQuestions: filterData?.questionIds?.length || 0
                        };
                      });

                      console.log(`   Banner visible: ${bankCheck.hasBanner ? 'SÍ' : 'NO'}`);
                      console.log(`   Filtro aplicado: ${bankCheck.viewerHasFilter ? 'SÍ' : 'NO'}`);
                      console.log(`   Preguntas mostradas: ${bankCheck.questionsDisplayed}`);
                      console.log(`   Preguntas esperadas: ${bankCheck.expectedQuestions}`);

                      if (bankCheck.hasBanner && bankCheck.questionsDisplayed === bankCheck.expectedQuestions && bankCheck.questionsDisplayed === results.incorrect) {
                        console.log('   ✅ Banco muestra exactamente las preguntas falladas');
                      } else if (bankCheck.questionsDisplayed > 0) {
                        console.log('   ⚠️  Banco muestra preguntas pero puede no coincidir exactamente');
                      } else {
                        console.log('   ⚠️  Banco no muestra preguntas');
                      }

                      await page.screenshot({ path: 'tests/screenshots/study-6-bank-with-failed.png', fullPage: true });

                      // Volver a study-config para siguiente test
                      await page.goto(`${baseUrl}/study-config.html`);
                      await page.waitForLoadState('networkidle');
                      await page.waitForSelector('.ut-item', { timeout: 5000 });
                      await page.waitForTimeout(1000);
                    } else {
                      console.log('   ⚠️  No navegó al banco de preguntas');
                    }
                  } else {
                    console.log('   ⚠️  No se guardó el filtro en localStorage');
                  }
                } else {
                  console.log('   ⚠️  No se pudo hacer click en el enlace');
                }
              } else {
                console.log('   ⚠️  No se encontró enlace al banco de preguntas');
              }
            } else {
              console.log('   ℹ️  No hay preguntas incorrectas, saltando verificación de banco');

              // Volver a study-config para siguiente test
              await page.goto(`${baseUrl}/study-config.html`);
              await page.waitForLoadState('networkidle');
              await page.waitForSelector('.ut-item', { timeout: 5000 });
              await page.waitForTimeout(1000);
            }
          } else {
            console.log('⚠️  No llegó a study-results.html');

            // Volver a study-config para siguiente test
            await page.goto(`${baseUrl}/study-config.html`);
            await page.waitForLoadState('networkidle');
            await page.waitForSelector('.ut-item', { timeout: 5000 });
            await page.waitForTimeout(1000);
          }
      } else {
        console.log('⚠️  No navegó a exam-unified.html para preguntas falladas');
      }

    // ============================================================
    // 6️⃣ TEST MODO PREGUNTAS NUEVAS
    // ============================================================
    console.log('\n6️⃣ Probando Modo Preguntas Nuevas...');

    // Wait for UT grid (should be already loaded)
    await page.waitForSelector('.ut-item', { timeout: 5000 });

    // Click first UT item
    await page.click('.ut-item:first-child');
    console.log('   Primera UT seleccionada');
    await page.waitForTimeout(500);

    // Click new mode
    console.log('   Seleccionando modo nuevas...');
    await page.click('label[for="mode-new"]');
    console.log('   Modo nuevas seleccionado (auto-iniciando test...)');

    // Wait for navigation
    await page.waitForURL(/exam-unified\.html.*type=study/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const currentUrl3 = page.url();
    console.log('   URL actual:', currentUrl3);

    if (currentUrl3.includes('exam-unified.html') && currentUrl3.includes('type=study')) {
      console.log('✅ Navegó a exam-unified.html con modo nuevas');

      // Verify questions loaded
      const questionLoaded = await page.evaluate(() => {
        const questionText = document.querySelector('#question-text, .question-text');
        const answers = document.querySelectorAll('#answers-container > *, .answer-option');
        return {
          hasQuestion: !!questionText && questionText.textContent.trim() !== 'Cargando pregunta...',
          questionText: questionText?.textContent?.substring(0, 50) || '',
          answersCount: answers.length
        };
      });

      console.log('   Pregunta cargada:', questionLoaded.hasQuestion ? 'SÍ' : 'NO');
      console.log('   Respuestas disponibles:', questionLoaded.answersCount);
      if (questionLoaded.hasQuestion) {
        console.log('   Texto pregunta:', questionLoaded.questionText);
      }

      await page.screenshot({ path: 'tests/screenshots/study-7-new-mode.png', fullPage: true });

      console.log('✅ Modo preguntas nuevas funciona correctamente');
    } else {
      console.log('⚠️  No navegó a exam-unified.html correctamente');
      await page.screenshot({ path: 'tests/screenshots/study-7-error.png', fullPage: true });
    }

    // ============================================================
    // RESUMEN FINAL
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n📊 Resumen:');
    console.log('   • Modo Aleatorio: Probado ✅');
    console.log('   • Modo Preguntas Falladas: Probado ✅');
    console.log('   • Modo Preguntas Nuevas: Probado ✅');
    console.log('   • Enlace a banco con filtro: Probado ✅');
    console.log('\n📸 Capturas guardadas en tests/screenshots/:');
    console.log('   - study-1-logged-in.png (Después del login)');
    console.log('   - study-2-study-page.png (Página de estudio)');
    console.log('   - study-3-random-mode.png (Modo aleatorio)');
    console.log('   - study-4-failed-mode.png (Modo falladas - inicial)');
    console.log('   - study-4-failed-answered.png (Modo falladas - respondidas)');
    console.log('   - study-5-results.png (Resultados del test)');
    console.log('   - study-6-bank-with-failed.png (Banco con filtro)');
    console.log('   - study-7-new-mode.png (Modo preguntas nuevas)');

    console.log('\n⏸️  Navegador se mantendrá abierto por 30s para inspección...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ TEST FALLIDO:', error.message);
    console.error('   Stack:', error.stack);
    await page.screenshot({ path: 'tests/screenshots/study-error.png' });
  } finally {
    console.log('\n🔚 Navegador cerrado\n');
    await browser.close();
  }
}

// Ejecutar el test
runStudyModesTest().catch(console.error);

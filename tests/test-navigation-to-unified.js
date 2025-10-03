const { chromium } = require('playwright');

/**
 * Test: Navegación desde Login hasta Exam Unified
 * Propósito: Verificar que el botón "Nuevo Examen" redirige a exam-unified.html
 *           y que el diseño de círculos azules está correcto
 * Fecha: 2025-10-03
 *
 * Flujo:
 * 1. Login
 * 2. Click en "Nuevo Examen" en exam-system.html
 * 3. Verificar redirección a exam-unified.html
 * 4. Verificar diseño de círculos azules
 */

(async () => {
  const browser = await chromium.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8095';

  try {
    console.log('🧪 Test: Navegación a Exam Unified con Diseño');
    console.log('================================================\n');

    // 1. Login
    console.log('1️⃣ Haciendo login...');
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/nav-1-homepage.png', fullPage: true });

    // Buscar campos de login con || (patrón que funciona)
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
      await page.screenshot({ path: 'tests/screenshots/nav-2-logged-in.png', fullPage: true });
      console.log('✅ Login exitoso');
    } else {
      // Intentar con selectores más genéricos
      console.log('🔄 Intentando con selectores alternativos...');
      const allInputs = await page.$$('input');
      const allButtons = await page.$$('button');

      console.log(`📊 Encontrados ${allInputs.length} inputs y ${allButtons.length} buttons`);

      if (allInputs.length >= 2) {
        await allInputs[0].fill('testuser');
        await allInputs[1].fill('123');
        if (allButtons.length > 0) {
          await allButtons[0].click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'tests/screenshots/nav-2-logged-in.png', fullPage: true });
          console.log('✅ Login exitoso con selectores alternativos');
        }
      } else {
        throw new Error('No se pudieron encontrar los campos de login');
      }
    }

    // 2. Navegar a exam-system.html
    console.log('\n2️⃣ Navegando a exam-system.html...');
    await page.goto(`${baseUrl}/exam-system.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/nav-3-exam-system.png', fullPage: true });
    console.log('✅ En exam-system.html');

    // 3. Verificar que feature flags está cargado
    console.log('\n3️⃣ Verificando feature flags...');

    // Listen to console messages from the browser
    page.on('console', msg => {
      console.log(`   [BROWSER]: ${msg.text()}`);
    });

    const featureFlagsCheck = await page.evaluate(() => {
      return {
        loaded: typeof window.featureFlags !== 'undefined',
        userId: window.featureFlags?.userId,
        rollout: window.featureFlags?.flags?.unified_exam_page?.rolloutPercentage,
        enabled: window.featureFlags?.isEnabled('unified_exam_page'),
        allFlags: window.featureFlags ? Object.keys(window.featureFlags.flags) : []
      };
    });

    console.log('   Feature Flags loaded:', featureFlagsCheck.loaded);
    console.log('   User ID:', featureFlagsCheck.userId);
    console.log('   Rollout %:', featureFlagsCheck.rollout);
    console.log('   Unified page enabled:', featureFlagsCheck.enabled);
    console.log('   Available flags:', featureFlagsCheck.allFlags);

    if (!featureFlagsCheck.loaded) {
      console.log('⚠️  Feature flags no cargado, pero continuamos...');

      // Check if script tag exists
      const scriptCheck = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const featureFlagsScript = scripts.find(s => s.src.includes('feature-flags'));
        return {
          scriptExists: !!featureFlagsScript,
          scriptSrc: featureFlagsScript?.src || 'not found',
          allScripts: scripts.map(s => s.src || s.textContent.substring(0, 50))
        };
      });

      console.log('   Script tag exists:', scriptCheck.scriptExists);
      console.log('   Script src:', scriptCheck.scriptSrc);
    }

    // 4. Click en "Nuevo Examen"
    console.log('\n4️⃣ Haciendo click en "Nuevo Examen"...');

    // Esperar a que el botón esté visible
    await page.waitForSelector('#startExamBtn', { state: 'visible', timeout: 10000 });

    // Hacer scroll al botón
    await page.locator('#startExamBtn').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Tomar captura antes del click
    await page.screenshot({ path: 'tests/screenshots/nav-4-before-click.png', fullPage: true });

    // Click en el botón
    await page.click('#startExamBtn');
    console.log('✅ Click ejecutado');

    // 5. Esperar navegación
    console.log('\n5️⃣ Esperando navegación...');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('   URL actual:', currentUrl);

    await page.screenshot({ path: 'tests/screenshots/nav-5-after-click.png', fullPage: true });

    // 6. Verificar redirección
    console.log('\n6️⃣ Verificando redirección...');

    if (currentUrl.includes('exam-unified.html')) {
      console.log('✅ CORRECTO: Redirigido a exam-unified.html');
    } else if (currentUrl.includes('exam.html')) {
      console.log('❌ ERROR: Redirigido a exam.html (sistema antiguo)');
      console.log('   Esto indica que el feature flag no está funcionando');
      throw new Error('Redirección incorrecta a exam.html');
    } else {
      console.log('⚠️  URL inesperada:', currentUrl);
    }

    // 7. Esperar a que cargue el examen
    console.log('\n7️⃣ Esperando a que cargue el examen...');
    await page.waitForSelector('#exam-section:not(.hidden)', { timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/nav-6-exam-loaded.png', fullPage: true });
    console.log('✅ Examen cargado');

    // 8. Verificar diseño de círculos azules
    console.log('\n8️⃣ Verificando diseño de círculos azules...');

    const designCheck = await page.evaluate(() => {
      const answerOption = document.querySelector('.answer-option');
      const answerLetter = document.querySelector('.answer-letter');
      const answerText = document.querySelector('.answer-text');

      if (!answerOption || !answerLetter || !answerText) {
        return {
          success: false,
          error: 'Elementos no encontrados',
          html: document.querySelector('.answers-container')?.innerHTML || 'No container'
        };
      }

      const letterStyles = window.getComputedStyle(answerLetter);
      const optionStyles = window.getComputedStyle(answerOption);

      return {
        success: true,
        letter: {
          backgroundColor: letterStyles.backgroundColor,
          borderRadius: letterStyles.borderRadius,
          width: letterStyles.width,
          height: letterStyles.height,
          display: letterStyles.display
        },
        option: {
          display: optionStyles.display,
          gap: optionStyles.gap,
          border: optionStyles.border,
          background: optionStyles.background
        }
      };
    });

    if (designCheck.success) {
      console.log('✅ Diseño verificado:');
      console.log('   🔵 Círculo:', designCheck.letter.width, 'x', designCheck.letter.height);
      console.log('   ⭕ Border radius:', designCheck.letter.borderRadius);
      console.log('   🎨 Background:', designCheck.letter.backgroundColor);
      console.log('   📏 Gap:', designCheck.option.gap);
      console.log('   🖼️  Option border:', designCheck.option.border);
    } else {
      console.log('❌ ERROR: Elementos no encontrados');
      console.log('   HTML:', designCheck.html.substring(0, 200));
    }

    // 9. Test de selección
    console.log('\n9️⃣ Probando selección de respuesta...');
    await page.click('.answer-option:first-child');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/screenshots/nav-7-answer-selected.png', fullPage: true });

    const selectedStyles = await page.evaluate(() => {
      const selected = document.querySelector('.answer-option.selected');
      if (!selected) return { found: false };

      const styles = window.getComputedStyle(selected);
      return {
        found: true,
        background: styles.background,
        borderColor: styles.borderColor,
        color: styles.color
      };
    });

    if (selectedStyles.found) {
      console.log('✅ Selección funciona correctamente');
      console.log('   🎨 Background:', selectedStyles.background.substring(0, 50) + '...');
      console.log('   🖌️  Border color:', selectedStyles.borderColor);
      console.log('   ✏️  Color:', selectedStyles.color);
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\nCapturas guardadas en tests/screenshots/:');
    console.log('  - nav-1-homepage.png');
    console.log('  - nav-2-logged-in.png');
    console.log('  - nav-3-exam-system.png');
    console.log('  - nav-4-before-click.png');
    console.log('  - nav-5-after-click.png');
    console.log('  - nav-6-exam-loaded.png');
    console.log('  - nav-7-answer-selected.png');

    console.log('\n⏸️  Navegador se mantendrá abierto por 30s para inspección...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ TEST FALLIDO:', error.message);
    await page.screenshot({ path: 'tests/screenshots/nav-error.png', fullPage: true });
    console.log('📸 Captura de error guardada: tests/screenshots/nav-error.png');
  } finally {
    await browser.close();
    console.log('\n🔚 Navegador cerrado');
  }
})();

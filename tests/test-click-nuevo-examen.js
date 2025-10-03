const { chromium } = require('playwright');

/**
 * Test: Click en "Nuevo Examen" sin login
 * Propósito: Verificar redirección a exam-unified.html
 *           (Asume que ya tienes una sesión activa en localhost:8095)
 * Fecha: 2025-10-03
 */

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = 'http://localhost:8095';

  try {
    console.log('🧪 Test: Click en "Nuevo Examen"');
    console.log('==========================================\n');
    console.log('ℹ️  Este test asume que ya estás logueado en el navegador');
    console.log('ℹ️  Si falla, primero haz login manualmente en Chrome\n');

    // Ir directamente a exam-system.html
    console.log('1️⃣ Navegando a exam-system.html...');
    await page.goto(`${baseUrl}/exam-system.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/click-1-exam-system.png', fullPage: true });
    console.log('✅ Página cargada');

    // Verificar feature flags
    console.log('\n2️⃣ Verificando feature flags...');
    const ffCheck = await page.evaluate(() => {
      return {
        loaded: typeof window.featureFlags !== 'undefined',
        userId: window.featureFlags?.userId,
        rollout: window.featureFlags?.flags?.unified_exam_page?.rolloutPercentage,
        enabled: window.featureFlags?.isEnabled('unified_exam_page')
      };
    });

    console.log('   Loaded:', ffCheck.loaded);
    console.log('   User ID:', ffCheck.userId);
    console.log('   Rollout %:', ffCheck.rollout);
    console.log('   Enabled:', ffCheck.enabled);

    if (!ffCheck.enabled) {
      console.log('\n⚠️  Feature flag NO está enabled para este usuario');
      console.log('   Puedes forzarlo en consola: featureFlags.forceEnable("unified_exam_page")');
    }

    // Buscar y hacer click en "Nuevo Examen"
    console.log('\n3️⃣ Buscando botón "Nuevo Examen"...');

    await page.waitForSelector('#startExamBtn', { state: 'attached', timeout: 5000 });
    const isVisible = await page.isVisible('#startExamBtn');
    console.log('   Botón visible:', isVisible);

    if (!isVisible) {
      console.log('   ⚠️  Botón no visible, haciendo scroll...');
      await page.evaluate(() => {
        document.getElementById('startExamBtn')?.scrollIntoView();
      });
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'tests/screenshots/click-2-before-click.png', fullPage: true });

    console.log('\n4️⃣ Haciendo click...');
    await page.click('#startExamBtn', { timeout: 5000 });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log('   URL después del click:', currentUrl);

    await page.screenshot({ path: 'tests/screenshots/click-3-after-click.png', fullPage: true });

    //  Verificar redirección
    console.log('\n5️⃣ Verificando redirección...');

    if (currentUrl.includes('exam-unified.html')) {
      console.log('✅ CORRECTO: Redirigido a exam-unified.html');
    } else if (currentUrl.includes('exam.html')) {
      console.log('❌ ERROR: Redirigido a exam.html (sistema antiguo)');
      console.log('\n🔍 Posibles causas:');
      console.log('   1. Feature flag no está al 100%');
      console.log('   2. User ID > 99 (fuera de rango de rollout)');
      console.log('   3. Cache del navegador (Cmd+Shift+R para limpiar)');
      console.log('   4. feature-flags.js no cargó correctamente');
    } else {
      console.log('⚠️  URL inesperada:', currentUrl);
    }

    // Si llegamos a exam-unified, verificar diseño
    if (currentUrl.includes('exam-unified.html')) {
      console.log('\n6️⃣ Esperando carga del examen...');
      await page.waitForSelector('#exam-section:not(.hidden)', { timeout: 30000 });
      await page.waitForTimeout(2000);

      console.log('\n7️⃣ Verificando diseño...');
      const design = await page.evaluate(() => {
        const letter = document.querySelector('.answer-letter');
        const option = document.querySelector('.answer-option');

        if (!letter || !option) {
          return { found: false };
        }

        const letterStyles = window.getComputedStyle(letter);
        return {
          found: true,
          width: letterStyles.width,
          height: letterStyles.height,
          borderRadius: letterStyles.borderRadius,
          backgroundColor: letterStyles.backgroundColor
        };
      });

      if (design.found) {
        console.log('✅ Diseño correcto:');
        console.log('   🔵 Tamaño:', design.width, 'x', design.height);
        console.log('   ⭕ Border radius:', design.borderRadius);
        console.log('   🎨 Background:', design.backgroundColor);
      } else {
        console.log('❌ Elementos de diseño no encontrados');
      }

      await page.screenshot({ path: 'tests/screenshots/click-4-exam-loaded.png', fullPage: true });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETADO');
    console.log('='.repeat(60));
    console.log('\n📸 Capturas en tests/screenshots/click-*.png');
    console.log('\n⏸️  Navegador abierto por 30s...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'tests/screenshots/click-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();

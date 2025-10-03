const { chromium } = require('playwright');

async function testLocalLogin() {
    console.log('🧪 Testing Local Development Login...\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Escuchar errores de consola
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('❌ Console error:', msg.text());
        }
    });

    // Escuchar errores de red
    page.on('requestfailed', request => {
        console.log('❌ Network error:', request.url(), request.failure().errorText);
    });

    try {
        // 1. Ir a la página de login
        console.log('📍 Navegando a http://localhost:8095/exam-system.html');
        await page.goto('http://localhost:8095/exam-system.html', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // 2. Verificar que estamos en la página de login
        const loginFormVisible = await page.isVisible('#loginForm');
        console.log('✓ Formulario de login visible:', loginFormVisible);

        // 3. Llenar credenciales
        console.log('📝 Llenando credenciales (testuser/123)');
        await page.fill('#loginUsername', 'testuser');
        await page.fill('#loginPassword', '123');

        // 4. Hacer click en login
        console.log('🔐 Haciendo click en login...');
        await page.click('#loginForm button[type="submit"]');

        // 5. Esperar respuesta
        await page.waitForTimeout(2000);

        // 6. Verificar si el login fue exitoso
        const dashboardVisible = await page.isVisible('#dashboard-section');
        const authVisible = await page.isVisible('#auth-section');

        console.log('\n📊 Resultados:');
        console.log('  Dashboard visible:', dashboardVisible);
        console.log('  Auth visible:', authVisible);

        if (dashboardVisible && !authVisible) {
            console.log('\n✅ LOGIN EXITOSO - Dashboard cargado correctamente');

            // 7. Probar navegación a examen
            console.log('\n🧪 Probando navegación a examen...');
            await page.click('#startExamBtn');
            await page.waitForTimeout(2000);

            const currentUrl = page.url();
            console.log('  URL actual:', currentUrl);

            if (currentUrl.includes('exam.html')) {
                console.log('✅ Redirección a exam.html exitosa');

                // Esperar a que cargue el examen
                await page.waitForTimeout(3000);

                // Verificar si hay preguntas
                const questionVisible = await page.isVisible('#questionText');
                const optionsVisible = await page.isVisible('#answerOptions');

                console.log('  Pregunta visible:', questionVisible);
                console.log('  Opciones visibles:', optionsVisible);

                if (questionVisible && optionsVisible) {
                    console.log('✅ Examen cargado correctamente con preguntas');
                } else {
                    console.log('⚠️  Examen cargado pero sin preguntas visibles');
                }
            }

        } else {
            console.log('\n❌ LOGIN FALLIDO - No se cargó el dashboard');

            // Capturar screenshot
            await page.screenshot({ path: 'test_login_failed.png' });
            console.log('📸 Screenshot guardado: test_login_failed.png');
        }

        // Esperar antes de cerrar para ver el resultado
        console.log('\n⏳ Esperando 3 segundos antes de cerrar...');
        await page.waitForTimeout(3000);

    } catch (error) {
        console.error('❌ Error en el test:', error.message);
        await page.screenshot({ path: 'test_error.png' });
    } finally {
        await browser.close();
    }
}

testLocalLogin().catch(console.error);

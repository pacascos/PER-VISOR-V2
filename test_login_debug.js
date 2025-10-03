const { chromium } = require('playwright');

async function testLocalLogin() {
    console.log('🧪 Testing Local Development Login with Network Debugging...\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capturar TODAS las peticiones de red
    page.on('request', request => {
        console.log('➡️  REQUEST:', request.method(), request.url());
    });

    page.on('response', response => {
        const status = response.status();
        const url = response.url();
        if (status >= 400) {
            console.log('❌ RESPONSE ERROR:', status, url);
        } else {
            console.log('✅ RESPONSE OK:', status, url);
        }
    });

    // Escuchar errores de consola
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('🔴 Console error:', msg.text());
        }
    });

    try {
        // 1. Ir a la página de login
        console.log('\n📍 Navegando a http://localhost:8095/exam-system.html\n');
        await page.goto('http://localhost:8095/exam-system.html', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // 2. Esperar a que examSystem esté disponible
        await page.waitForFunction(() => window.examSystem !== undefined, { timeout: 5000 });
        console.log('✓ examSystem cargado\n');

        // 3. Llenar credenciales
        console.log('📝 Llenando credenciales (testuser/123)\n');
        await page.fill('#loginUsername', 'testuser');
        await page.fill('#loginPassword', '123');

        // 4. Hacer click en login
        console.log('🔐 Haciendo click en login...\n');
        await page.click('#loginForm button[type="submit"]');

        // 4. Esperar respuesta
        await page.waitForTimeout(3000);

        // 5. Verificar resultado
        const dashboardVisible = await page.isVisible('#dashboard-section');

        console.log('\n📊 Resultado final:');
        console.log(dashboardVisible ? '✅ LOGIN EXITOSO' : '❌ LOGIN FALLIDO');

        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    } finally {
        await browser.close();
    }
}

testLocalLogin().catch(console.error);

const { chromium } = require('playwright');

async function testLocal() {
    console.log('🧪 Test Login Local - Simplificado\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500  // Slow down para ver qué pasa
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capturar peticiones POST
    page.on('request', request => {
        if (request.method() === 'POST') {
            console.log('📤 POST:', request.url());
        }
    });

    // Capturar respuestas de error
    page.on('response', response => {
        if (response.status() >= 400) {
            console.log('❌ ERROR:', response.status(), response.url());
        } else if (response.url().includes('auth/login')) {
            console.log('✅ LOGIN RESPONSE:', response.status());
        }
    });

    // Capturar errores de consola
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('error') || text.includes('Error') || text.includes('ERROR')) {
            console.log('🔴 Console:', text);
        } else if (text.includes('Login exitoso') || text.includes('exitoso')) {
            console.log('✅ Console:', text);
        }
    });

    try {
        console.log('1️⃣ Navegando a exam-system.html...');
        await page.goto('http://localhost:8095/exam-system.html');

        console.log('2️⃣ Esperando 2 segundos a que cargue todo...');
        await page.waitForTimeout(2000);

        console.log('3️⃣ Llenando formulario...');
        await page.fill('#loginUsername', 'testuser');
        await page.fill('#loginPassword', '123');

        console.log('4️⃣ Haciendo click en Login...');
        await page.click('#loginForm button[type="submit"]');

        console.log('5️⃣ Esperando 5 segundos para ver resultado...');
        await page.waitForTimeout(5000);

        // Verificar resultado
        const dashboardVisible = await page.isVisible('#dashboard-section');
        const authVisible = await page.isVisible('#auth-section');
        const username = await page.textContent('#username').catch(() => null);

        console.log('\n📊 RESULTADO:');
        console.log('  Dashboard visible:', dashboardVisible);
        console.log('  Auth visible:', authVisible);
        console.log('  Username:', username);

        if (dashboardVisible && username) {
            console.log('\n✅✅✅ LOGIN EXITOSO ✅✅✅');
        } else {
            console.log('\n❌❌❌ LOGIN FALLIDO ❌❌❌');
            await page.screenshot({ path: 'login_failed.png' });
        }

        console.log('\nEsperando 3 segundos antes de cerrar...');
        await page.waitForTimeout(3000);

    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: 'test_error.png' });
    } finally {
        await browser.close();
    }
}

testLocal().catch(console.error);

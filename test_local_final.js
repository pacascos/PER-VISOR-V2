const { chromium } = require('playwright');

async function testLocalLogin() {
    console.log('🧪 Test Login Local - Versión Final\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 100
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Capturar TODAS las peticiones
    const requests = [];
    page.on('request', request => {
        requests.push({ method: request.method(), url: request.url() });
        if (request.method() === 'POST') {
            console.log('📤 POST:', request.url());
        }
    });

    // Capturar respuestas
    page.on('response', async response => {
        const url = response.url();
        const status = response.status();

        if (url.includes('auth/login')) {
            console.log(`📥 LOGIN RESPONSE: ${status}`);
            if (status === 200) {
                try {
                    const body = await response.json();
                    console.log('   ✅ Success:', body.success);
                    console.log('   🎫 Token:', body.token ? 'Recibido' : 'No recibido');
                } catch (e) {}
            }
        }

        if (status >= 400 && url.includes('8095')) {
            console.log(`❌ ERROR ${status}:`, url);
        }
    });

    // Errores de consola
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Login exitoso') || text.includes('exitoso')) {
            console.log('✅', text);
        } else if (text.includes('error') || text.includes('Error')) {
            console.log('🔴', text);
        }
    });

    try {
        console.log('1️⃣ Navegando a exam-system.html...');
        await page.goto('http://localhost:8095/exam-system.html', {
            waitUntil: 'domcontentloaded'
        });

        console.log('2️⃣ Esperando a que el formulario de login sea visible...');
        await page.waitForSelector('#loginUsername', { state: 'visible', timeout: 5000 });
        await page.waitForTimeout(1000);

        console.log('3️⃣ Verificando API_BASE...');
        const apiBase = await page.evaluate(() => window.API_BASE);
        console.log('   API_BASE =', `"${apiBase}"`);

        console.log('4️⃣ Llenando username...');
        await page.fill('#loginUsername', 'testuser');
        const usernameValue = await page.inputValue('#loginUsername');
        console.log('   Username ingresado:', usernameValue);

        console.log('5️⃣ Llenando password...');
        await page.fill('#loginPassword', '123');
        const passwordValue = await page.inputValue('#loginPassword');
        console.log('   Password ingresado:', passwordValue.replace(/./g, '*'));

        console.log('6️⃣ Haciendo click en botón Login...');
        const buttonText = await page.textContent('#loginForm button[type="submit"]');
        console.log('   Texto del botón:', buttonText);

        await page.click('#loginForm button[type="submit"]');

        console.log('7️⃣ Esperando respuesta (5 segundos)...');
        await page.waitForTimeout(5000);

        console.log('8️⃣ Verificando resultado...');
        const dashboardVisible = await page.isVisible('#dashboard-section');
        const authVisible = await page.isVisible('#auth-section');
        const usernameDisplay = await page.textContent('#username').catch(() => 'N/A');

        console.log('\n' + '='.repeat(50));
        console.log('📊 RESULTADO FINAL:');
        console.log('='.repeat(50));
        console.log('Dashboard visible:', dashboardVisible ? '✅ SÍ' : '❌ NO');
        console.log('Auth visible:', authVisible ? '⚠️  SÍ (mal)' : '✅ NO (bien)');
        console.log('Username:', usernameDisplay);
        console.log('Peticiones POST realizadas:', requests.filter(r => r.method === 'POST').length);

        if (dashboardVisible && usernameDisplay !== 'N/A') {
            console.log('\n🎉🎉🎉 ¡¡¡LOGIN EXITOSO!!! 🎉🎉🎉\n');
        } else {
            console.log('\n❌❌❌ LOGIN FALLÓ ❌❌❌');
            console.log('\nPeticiones POST realizadas:');
            requests.filter(r => r.method === 'POST').forEach(r => {
                console.log('  -', r.url);
            });
            await page.screenshot({ path: 'login_failed_final.png', fullPage: true });
            console.log('📸 Screenshot: login_failed_final.png\n');
        }

        console.log('Esperando 3 segundos...');
        await page.waitForTimeout(3000);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'test_error_final.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testLocalLogin().catch(console.error);

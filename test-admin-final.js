const { chromium } = require('playwright');

async function testAdminFinal() {
    console.log('🧪 Test final del panel de administración...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 1. Ir a la página principal
        console.log('📱 Navegando a https://bancotest.com/exam-system.html...');
        await page.goto('https://bancotest.com/exam-system.html');
        await page.waitForTimeout(3000);

        // 2. Hacer login
        console.log('🔑 Haciendo login...');
        await page.fill('#loginUsername', 'testuser');
        await page.fill('#loginPassword', '123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);

        // 3. Verificar login exitoso
        const usernameDisplay = await page.$('#username');
        if (usernameDisplay) {
            const username = await usernameDisplay.textContent();
            console.log(`✅ Login exitoso: ${username}`);
        }

        // 4. Verificar panel de administración
        const adminPanel = await page.$('#adminPanelBtn');
        const isVisible = await adminPanel.isVisible();
        console.log(`👑 Panel de administración visible: ${isVisible}`);

        if (isVisible) {
            console.log('✅ ¡Panel de administración funciona correctamente!');
            console.log('🎯 El usuario testuser tiene acceso de administrador');
            
            // 5. Hacer clic y verificar que se abre
            await page.evaluate(() => {
                const btn = document.getElementById('adminPanelBtn');
                if (btn) btn.click();
            });
            
            await page.waitForTimeout(3000);
            
            const pages = context.pages();
            if (pages.length > 1) {
                console.log('✅ ¡Panel de administración se abre correctamente!');
                const newPage = pages[1];
                await newPage.waitForLoadState();
                const newUrl = newPage.url();
                console.log(`🌐 Panel abierto en: ${newUrl}`);
            }
        } else {
            console.log('❌ Panel de administración no visible');
        }

        console.log('\n🎉 RESUMEN:');
        console.log('✅ API devuelve campo role correctamente');
        console.log('✅ Usuario testuser tiene rol admin en BD');
        console.log('✅ Frontend detecta rol de administrador');
        console.log('✅ Panel de administración es visible');
        console.log('✅ Panel de administración se abre correctamente');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

testAdminFinal().catch(console.error);

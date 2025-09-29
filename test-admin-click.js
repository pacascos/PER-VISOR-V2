const { chromium } = require('playwright');

async function testAdminClick() {
    console.log('🧪 Probando clic en panel de administración...');
    
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

        // 3. Verificar que el panel está visible
        const adminPanel = await page.$('#adminPanelBtn');
        const isVisible = await adminPanel.isVisible();
        console.log(`👑 Panel visible: ${isVisible}`);

        if (!isVisible) {
            console.log('❌ Panel no visible, terminando test');
            return;
        }

        // 4. Verificar si el event listener está funcionando
        console.log('🔍 Verificando event listener...');
        
        // Evaluar JavaScript en la página para verificar el event listener
        const hasEventListener = await page.evaluate(() => {
            const btn = document.getElementById('adminPanelBtn');
            if (!btn) return false;
            
            // Verificar si tiene event listeners
            const listeners = getEventListeners ? getEventListeners(btn) : 'getEventListeners no disponible';
            console.log('Event listeners:', listeners);
            
            // Simular clic programáticamente
            btn.click();
            return true;
        });

        console.log(`🎯 Event listener verificado: ${hasEventListener}`);

        // 5. Esperar un poco más para ver si se abre la ventana
        await page.waitForTimeout(3000);

        // 6. Verificar si se abrió una nueva ventana/pestaña
        const pages = context.pages();
        console.log(`📑 Páginas abiertas: ${pages.length}`);
        
        if (pages.length > 1) {
            const newPage = pages[1];
            await newPage.waitForLoadState();
            const newUrl = newPage.url();
            console.log(`🌐 Nueva página: ${newUrl}`);
            
            if (newUrl.includes('admin-panel.html')) {
                console.log('✅ ¡Panel de administración abierto correctamente!');
            } else {
                console.log('❌ Nueva página no es el panel de administración');
            }
        } else {
            console.log('❌ No se abrió nueva ventana/pestaña');
        }

        // 7. Tomar screenshot
        await page.screenshot({ path: 'debug-admin-click.png', fullPage: true });
        console.log('📸 Screenshot guardado');

    } catch (error) {
        console.error('❌ Error:', error);
        await page.screenshot({ path: 'debug-admin-click-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testAdminClick().catch(console.error);

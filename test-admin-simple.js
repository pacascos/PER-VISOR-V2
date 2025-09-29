const { chromium } = require('playwright');

async function testAdminSimple() {
    console.log('🧪 Test simple del panel de administración...');
    
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
            console.log('❌ Panel no visible');
            return;
        }

        // 4. Intentar hacer clic directamente
        console.log('🖱️ Haciendo clic directo...');
        
        // Usar evaluate para hacer clic desde JavaScript
        await page.evaluate(() => {
            const btn = document.getElementById('adminPanelBtn');
            if (btn) {
                console.log('Botón encontrado, haciendo clic...');
                btn.click();
            } else {
                console.log('Botón no encontrado');
            }
        });

        // 5. Esperar y verificar si se abrió nueva ventana
        await page.waitForTimeout(3000);
        
        const pages = context.pages();
        console.log(`📑 Páginas abiertas: ${pages.length}`);
        
        if (pages.length > 1) {
            console.log('✅ ¡Se abrió nueva ventana!');
            const newPage = pages[1];
            await newPage.waitForLoadState();
            const newUrl = newPage.url();
            console.log(`🌐 Nueva URL: ${newUrl}`);
        } else {
            console.log('❌ No se abrió nueva ventana');
            
            // Verificar la URL actual
            const currentUrl = page.url();
            console.log(`🌐 URL actual: ${currentUrl}`);
        }

        // 6. Tomar screenshot
        await page.screenshot({ path: 'debug-admin-simple.png', fullPage: true });
        console.log('📸 Screenshot guardado');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

testAdminSimple().catch(console.error);

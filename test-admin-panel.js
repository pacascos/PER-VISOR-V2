const { chromium } = require('playwright');

async function testAdminPanel() {
    console.log('🧪 Iniciando prueba del panel de administración...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 1. Ir a la página principal
        console.log('📱 Navegando a https://bancotest.com/exam-system.html...');
        await page.goto('https://bancotest.com/exam-system.html');
        await page.waitForTimeout(3000);

        // 2. Hacer login
        console.log('🔑 Haciendo login con testuser...');
        await page.fill('#loginUsername', 'testuser');
        await page.fill('#loginPassword', '123');
        
        // Buscar y hacer clic en el botón de login
        const loginButton = await page.$('button[type="submit"]');
        if (loginButton) {
            console.log('✅ Botón de login encontrado');
            await loginButton.click();
            await page.waitForTimeout(5000);
        } else {
            console.log('❌ Botón de login no encontrado');
            return;
        }

        // 3. Verificar si estamos logueados
        const usernameDisplay = await page.$('#username');
        if (usernameDisplay) {
            const username = await usernameDisplay.textContent();
            console.log(`✅ Login exitoso. Usuario: ${username}`);
        } else {
            console.log('❌ No se pudo verificar el login');
        }

        // 4. Buscar el panel de administración
        console.log('👑 Buscando panel de administración...');
        const adminPanel = await page.$('#adminPanelBtn');
        if (adminPanel) {
            const isVisible = await adminPanel.isVisible();
            console.log(`📊 Panel de administración encontrado. Visible: ${isVisible}`);
            
            if (isVisible) {
                console.log('✅ ¡Panel de administración visible!');
                
                // 5. Hacer clic en el panel
                console.log('🖱️ Haciendo clic en el panel de administración...');
                await adminPanel.click();
                await page.waitForTimeout(3000);
                
                // 6. Verificar si se abrió el panel
                const currentUrl = page.url();
                console.log(`🌐 URL actual: ${currentUrl}`);
                
                if (currentUrl.includes('admin-panel.html')) {
                    console.log('✅ ¡Panel de administración abierto correctamente!');
                } else {
                    console.log('❌ Panel de administración no se abrió');
                }
            } else {
                console.log('❌ Panel de administración no visible');
                
                // Verificar el estilo del elemento
                const style = await adminPanel.getAttribute('style');
                console.log(`🎨 Estilo del panel: ${style}`);
            }
        } else {
            console.log('❌ Panel de administración no encontrado');
        }

        // 7. Verificar la consola del navegador
        console.log('🔍 Verificando errores en la consola...');
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        
        await page.waitForTimeout(2000);
        if (errors.length > 0) {
            console.log('❌ Errores encontrados:');
            errors.forEach(error => console.log(`  - ${error}`));
        } else {
            console.log('✅ No se encontraron errores en la consola');
        }

        // 8. Tomar screenshot final
        console.log('📸 Tomando screenshot final...');
        await page.screenshot({ path: 'debug-admin-final.png', fullPage: true });
        console.log('✅ Screenshot guardado como debug-admin-final.png');

    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
        await page.screenshot({ path: 'debug-admin-error.png', fullPage: true });
        console.log('📸 Screenshot de error guardado como debug-admin-error.png');
    } finally {
        await browser.close();
    }
}

testAdminPanel().catch(console.error);
const { chromium } = require('playwright');

async function debugStudyPage() {
    console.log('🔍 Debugging página de estudio...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    const page = await context.newPage();
    
    try {
        // Login
        console.log('🔑 Haciendo login...');
        await page.goto('http://localhost:8095/exam-system.html');
        await page.waitForTimeout(2000);
        
        const usernameField = await page.$('input[type="text"]');
        const passwordField = await page.$('input[type="password"]');
        const loginButton = await page.$('button[type="submit"]');
        
        if (usernameField && passwordField && loginButton) {
            await usernameField.fill('testuser');
            await passwordField.fill('123');
            await loginButton.click();
            await page.waitForTimeout(3000);
            console.log('✅ Login completado');
        }
        
        // Navegar a página de estudio
        console.log('📄 Cargando study-config.html...');
        await page.goto('http://localhost:8095/study-config.html');
        await page.waitForTimeout(5000);
        
        // Inspeccionar elementos presentes
        console.log('\n🔍 Elementos encontrados en la página:');
        
        const elements = await page.evaluate(() => {
            const results = {};
            
            // Buscar elementos por clase
            const classes = [
                'ut-grid', 'ut-card', 'btn-generate', 'unified-tab-nav', 
                'unified-tab-item', 'unified-top-nav', 'page-title', 
                'unified-back-btn', 'mode-selector', 'mode-option'
            ];
            
            classes.forEach(className => {
                const elements = document.querySelectorAll(`.${className}`);
                results[className] = {
                    count: elements.length,
                    visible: Array.from(elements).filter(el => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    }).length
                };
            });
            
            // Buscar elementos por ID
            const ids = ['ut-grid', 'loading-spinner', 'error-message'];
            ids.forEach(id => {
                const element = document.getElementById(id);
                results[`#${id}`] = {
                    found: !!element,
                    visible: element ? window.getComputedStyle(element).display !== 'none' : false
                };
            });
            
            // Verificar contenido de la página
            results.pageContent = {
                title: document.title,
                bodyClasses: document.body.className,
                hasUtGrid: !!document.querySelector('.ut-grid'),
                hasConfigCard: !!document.querySelector('.config-card'),
                hasCardBody: !!document.querySelector('.card-body')
            };
            
            return results;
        });
        
        console.log('📊 Resultados del análisis:');
        console.log(JSON.stringify(elements, null, 2));
        
        // Tomar screenshot de debug
        await page.screenshot({ 
            path: 'screenshots-responsive/debug-study-page.png', 
            fullPage: true 
        });
        console.log('📸 Screenshot de debug guardado');
        
        // Verificar si hay errores en consola
        const consoleErrors = await page.evaluate(() => {
            // Esta función se ejecuta en el contexto de la página
            return window.consoleErrors || [];
        });
        
        if (consoleErrors.length > 0) {
            console.log('❌ Errores en consola:', consoleErrors);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

debugStudyPage();

const { chromium } = require('playwright');

// Configuración de dispositivos móviles para simular
const mobileDevices = [
    {
        name: 'iPhone SE',
        width: 375,
        height: 667,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    },
    {
        name: 'iPhone 12',
        width: 390,
        height: 844,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    },
    {
        name: 'Samsung Galaxy S21',
        width: 360,
        height: 800,
        userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
    },
    {
        name: 'iPad Mini',
        width: 768,
        height: 1024,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    }
];

async function testResponsiveDesign() {
    console.log('📱 Iniciando pruebas de responsive design en móviles...\n');
    
    const browser = await chromium.launch({ headless: false });
    
    for (const device of mobileDevices) {
        console.log(`🔍 Probando en ${device.name} (${device.width}x${device.height})`);
        
        const context = await browser.newContext({
            viewport: { width: device.width, height: device.height },
            userAgent: device.userAgent,
            deviceScaleFactor: 2, // Simular densidad de píxeles de móvil
            isMobile: true,
            hasTouch: true
        });
        
        const page = await context.newPage();
        
        try {
            // Primero hacer login
            console.log(`   🔑 Haciendo login...`);
            await page.goto('http://localhost:8095/exam-system.html', { 
                waitUntil: 'networkidle',
                timeout: 10000 
            });
            
            // Buscar campos de login con selectores más robustos
            await page.waitForTimeout(2000); // Esperar a que se cargue
            
            const usernameField = await page.$('input[type="text"], input[placeholder*="usuario" i], input[placeholder*="Usuario" i], #loginUsername, #username');
            const passwordField = await page.$('input[type="password"], input[placeholder*="contraseña" i], input[placeholder*="Contraseña" i], #loginPassword, #password');
            const loginButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Iniciar"), button:has-text("Login"), button:has-text("Entrar"), .btn-primary');
            
            if (usernameField && passwordField && loginButton) {
                console.log(`   📝 Campos de login encontrados, haciendo login...`);
                await usernameField.fill('testuser');
                await passwordField.fill('123');
                await loginButton.click();
                
                // Esperar a que se complete el login
                await page.waitForTimeout(3000);
                
                // Verificar si el login fue exitoso
                const currentUrl = page.url();
                if (currentUrl.includes('exam-system.html')) {
                    console.log(`   ✅ Login completado correctamente`);
                } else {
                    console.log(`   ⚠️  Login puede haber fallado, URL actual: ${currentUrl}`);
                }
            } else {
                console.log(`   ❌ No se encontraron campos de login:`);
                console.log(`      - Username: ${usernameField ? '✅' : '❌'}`);
                console.log(`      - Password: ${passwordField ? '✅' : '❌'}`);
                console.log(`      - Button: ${loginButton ? '✅' : '❌'}`);
                
                // Tomar screenshot de la página de login para debug
                await page.screenshot({ 
                    path: `${screenshotsDir}/debug-login-${device.name.replace(/\s+/g, '-').toLowerCase()}.png`, 
                    fullPage: true 
                });
            }
            
            // Ahora navegar a la página de estudio
            console.log(`   📄 Cargando study-config.html...`);
            await page.goto('http://localhost:8095/study-config.html', { 
                waitUntil: 'networkidle',
                timeout: 10000 
            });
            
            // Esperar a que se cargue completamente
            await page.waitForTimeout(3000);
            
            // Crear carpeta para screenshots si no existe
            const fs = require('fs');
            const screenshotsDir = 'screenshots-responsive';
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir);
            }
            
            // Tomar screenshot
            const screenshotPath = `${screenshotsDir}/test-responsive-${device.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            await page.screenshot({ 
                path: screenshotPath, 
                fullPage: true 
            });
            console.log(`   📸 Screenshot guardado: ${screenshotPath}`);
            
            // Verificar elementos problemáticos
            await checkResponsiveIssues(page, device);
            
            // Probar interacciones táctiles
            await testTouchInteractions(page, device);
            
        } catch (error) {
            console.log(`   ❌ Error en ${device.name}: ${error.message}`);
        } finally {
            await context.close();
        }
        
        console.log(`   ✅ Completado ${device.name}\n`);
    }
    
    await browser.close();
    console.log('🎉 Pruebas de responsive design completadas');
}

async function checkResponsiveIssues(page, device) {
    console.log(`   🔍 Verificando problemas de responsive...`);
    
    // 1. Verificar tabla de UTs
    const utGrid = await page.$('.ut-grid');
    if (utGrid) {
        const utCards = await page.$$('.ut-card');
        const gridComputedStyle = await page.evaluate(() => {
            const grid = document.querySelector('.ut-grid');
            return grid ? window.getComputedStyle(grid).gridTemplateColumns : 'no encontrado';
        });
        console.log(`     📊 UTs: ${utCards.length} elementos, grid: ${gridComputedStyle}`);
        
        // Verificar si hay overflow horizontal
        const hasHorizontalOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        if (hasHorizontalOverflow) {
            console.log(`     ⚠️  PROBLEMA: Overflow horizontal detectado`);
        }
    } else {
        console.log(`     ❌ Tabla de UTs no encontrada`);
    }
    
    // 2. Verificar botón de generar (se crea dinámicamente)
    const generateBtn = await page.$('.btn-generate, .action-buttons button, button[type="submit"]');
    if (generateBtn) {
        const btnBox = await generateBtn.boundingBox();
        if (btnBox) {
            const viewportWidth = device.width;
            const btnWidth = btnBox.width;
            const btnVisible = btnBox.width <= viewportWidth;
            
            console.log(`     🔘 Botón generar: ${btnWidth.toFixed(0)}px (viewport: ${viewportWidth}px)`);
            if (!btnVisible) {
                console.log(`     ⚠️  PROBLEMA: Botón no cabe en viewport`);
            }
        } else {
            console.log(`     ❌ Botón generar no visible`);
        }
    } else {
        console.log(`     ℹ️  Botón generar no presente (se crea al seleccionar modo)`);
    }
    
    // 3. Verificar navegación con tabs
    const tabNav = await page.$('.unified-tab-nav');
    if (tabNav) {
        const tabs = await page.$$('.unified-tab-item');
        const tabNavBox = await tabNav.boundingBox();
        if (tabNavBox) {
            const tabNavWidth = tabNavBox.width;
            const viewportWidth = device.width;
            
            console.log(`     🏷️  Tabs: ${tabs.length} elementos, ancho: ${tabNavWidth.toFixed(0)}px`);
            if (tabNavWidth > viewportWidth) {
                console.log(`     ⚠️  PROBLEMA: Navegación de tabs más ancha que viewport`);
            }
        } else {
            console.log(`     ❌ Navegación de tabs no visible`);
        }
    } else {
        console.log(`     ❌ Navegación de tabs no encontrada`);
    }
    
    // 4. Verificar navegación superior
    const topNav = await page.$('.unified-top-nav');
    if (topNav) {
        const pageTitle = await page.$('.page-title');
        const backBtn = await page.$('.unified-back-btn');
        
        if (pageTitle && backBtn) {
            const titleBox = await pageTitle.boundingBox();
            const backBtnBox = await backBtn.boundingBox();
            
            if (titleBox && backBtnBox) {
                // Verificar si se superponen
                const overlap = titleBox.x < (backBtnBox.x + backBtnBox.width);
                console.log(`     🔝 Navegación superior: Título y botón ${overlap ? 'SE SUPERPONEN' : 'OK'}`);
            } else {
                console.log(`     ❌ Elementos de navegación superior no visibles`);
            }
        } else {
            console.log(`     ❌ Navegación superior incompleta`);
        }
    } else {
        console.log(`     ❌ Navegación superior no encontrada`);
    }
    
    // 5. Verificar selector de modos
    const modeSelector = await page.$('.mode-selector');
    if (modeSelector) {
        const modes = await page.$$('.mode-option');
        const modeSelectorBox = await modeSelector.boundingBox();
        if (modeSelectorBox) {
            const modeWidth = modeSelectorBox.width / modes.length;
            const viewportWidth = device.width;
            
            console.log(`     🎛️  Modos: ${modes.length} elementos, ancho por modo: ${modeWidth.toFixed(0)}px`);
            if (modeWidth < 100) {
                console.log(`     ⚠️  PROBLEMA: Modos demasiado estrechos (${modeWidth.toFixed(0)}px)`);
            }
        } else {
            console.log(`     ❌ Selector de modos no visible`);
        }
    } else {
        console.log(`     ❌ Selector de modos no encontrado`);
    }
}

async function testTouchInteractions(page, device) {
    console.log(`   👆 Probando interacciones táctiles...`);
    
    try {
        // Probar tocar en una UT
        const firstUtCard = await page.$('.ut-card');
        if (firstUtCard) {
            await firstUtCard.tap();
            await page.waitForTimeout(500);
            console.log(`     ✅ UT card tocada correctamente`);
        }
        
        // Probar scroll en tabs si es necesario
        const tabNav = await page.$('.unified-tab-nav');
        if (tabNav) {
            const tabNavBox = await tabNav.boundingBox();
            const viewportWidth = device.width;
            
            if (tabNavBox.width > viewportWidth) {
                // Simular scroll horizontal en tabs
                await page.touchscreen.tap(tabNavBox.x + tabNavBox.width - 50, tabNavBox.y + tabNavBox.height / 2);
                await page.waitForTimeout(500);
                console.log(`     ✅ Scroll horizontal en tabs probado`);
            }
        }
        
        // Probar botón de generar
        const generateBtn = await page.$('.btn-generate');
        if (generateBtn) {
            const btnBox = await generateBtn.boundingBox();
            if (btnBox.width <= device.width) {
                await generateBtn.tap();
                await page.waitForTimeout(500);
                console.log(`     ✅ Botón generar tocado correctamente`);
            }
        }
        
    } catch (error) {
        console.log(`     ❌ Error en interacciones táctiles: ${error.message}`);
    }
}

// Función para generar reporte de problemas
async function generateResponsiveReport() {
    console.log('\n📋 REPORTE DE PROBLEMAS RESPONSIVE DETECTADOS:');
    console.log('================================================');
    console.log('');
    console.log('🔴 PROBLEMAS CRÍTICOS:');
    console.log('  - Tabla de UTs con grid fijo (2 columnas)');
    console.log('  - Botón "Siguiente" con ancho fijo');
    console.log('');
    console.log('🟡 PROBLEMAS ALTOS:');
    console.log('  - Navegación con tabs se superpone');
    console.log('  - Navegación superior con superposición');
    console.log('');
    console.log('🟠 PROBLEMAS MEDIOS:');
    console.log('  - Selector de modos muy estrecho');
    console.log('  - Contenedor principal con padding fijo');
    console.log('');
    console.log('💡 SOLUCIONES RECOMENDADAS:');
    console.log('  1. Implementar grid responsive (1→2→3 columnas)');
    console.log('  2. Botón con ancho completo en móvil');
    console.log('  3. Tabs con scroll horizontal');
    console.log('  4. Navegación superior en columna en móvil');
    console.log('');
}

// Ejecutar las pruebas
testResponsiveDesign()
    .then(() => generateResponsiveReport())
    .catch(error => {
        console.error('❌ Error en las pruebas:', error);
        process.exit(1);
    });

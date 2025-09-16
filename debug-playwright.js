#!/usr/bin/env node
/**
 * Script de depuración con Playwright para PER_Cloude
 * Permite navegar y depurar visualmente la aplicación
 */

const { chromium } = require('playwright');

class PERDebugger {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:8095';
        this.apiUrl = 'http://localhost:5001';
    }

    async init() {
        console.log('🚀 Iniciando depuración de PER_Cloude...');
        
        // Iniciar navegador
        this.browser = await chromium.launch({ 
            headless: false,
            devtools: true,
            args: ['--start-maximized']
        });
        
        // Crear nueva página
        this.page = await this.browser.newPage();
        
        // Configurar viewport
        await this.page.setViewportSize({ width: 1280, height: 720 });
        
        // Configurar timeouts
        this.page.setDefaultTimeout(10000);
        this.page.setDefaultNavigationTimeout(30000);
        
        console.log('✅ Navegador iniciado correctamente');
    }

    async navigateToApp() {
        console.log('🌐 Navegando a la aplicación...');
        await this.page.goto(`${this.baseUrl}/visor-nueva-arquitectura.html`);
        await this.page.waitForLoadState('networkidle');
        console.log('✅ Aplicación cargada');
    }

    async checkAPIHealth() {
        console.log('🔍 Verificando estado de la API...');
        try {
            const response = await this.page.request.get(`${this.apiUrl}/health`);
            const data = await response.json();
            console.log('✅ API Status:', data);
            return data.status === 'healthy';
        } catch (error) {
            console.error('❌ Error verificando API:', error.message);
            return false;
        }
    }

    async takeScreenshot(name = 'debug') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `debug-output/screenshot-${name}-${timestamp}.png`;
        await this.page.screenshot({ 
            path: filename, 
            fullPage: true 
        });
        console.log(`📸 Screenshot guardado: ${filename}`);
        return filename;
    }

    async debugFilters() {
        console.log('🔍 Probando filtros...');
        
        // Tomar screenshot inicial
        await this.takeScreenshot('filters-initial');
        
        // Probar filtro de convocatoria
        const convocatoriaSelect = await this.page.locator('#filterConvocatoria');
        if (await convocatoriaSelect.isVisible()) {
            await convocatoriaSelect.selectOption('2025-06-RECREO');
            console.log('✅ Filtro de convocatoria aplicado');
            await this.page.waitForTimeout(1000);
        }
        
        // Probar filtro de titulación
        const titulacionSelect = await this.page.locator('#filterTitulacion');
        if (await titulacionSelect.isVisible()) {
            await titulacionSelect.selectOption('PER_NORMAL');
            console.log('✅ Filtro de titulación aplicado');
            await this.page.waitForTimeout(1000);
        }
        
        // Tomar screenshot después de aplicar filtros
        await this.takeScreenshot('filters-applied');
        
        // Verificar que las preguntas se cargaron
        const questionsContainer = await this.page.locator('#questionsContainer');
        if (await questionsContainer.isVisible()) {
            const questionCount = await questionsContainer.locator('.question-card').count();
            console.log(`📊 Preguntas visibles: ${questionCount}`);
        }
    }

    async debugExplanationGeneration() {
        console.log('💡 Probando generación de explicaciones...');
        
        // Buscar un botón de explicación
        const explanationBtn = await this.page.locator('button:has-text("Explicación GPT-5")').first();
        
        if (await explanationBtn.isVisible()) {
            console.log('🔍 Botón de explicación encontrado');
            
            // Hacer clic en el botón
            await explanationBtn.click();
            await this.page.waitForTimeout(3000); // Esperar a que se genere
            
            // Tomar screenshot del modal de explicación
            await this.takeScreenshot('explanation-modal');
            
            // Verificar si el modal se abrió
            const modal = await this.page.locator('.modal:visible');
            if (await modal.isVisible()) {
                console.log('✅ Modal de explicación abierto');
                
                // Cerrar el modal
                const closeBtn = await this.page.locator('.modal .btn-close');
                if (await closeBtn.isVisible()) {
                    await closeBtn.click();
                    console.log('✅ Modal cerrado');
                }
            } else {
                console.log('⚠️ Modal de explicación no se abrió');
            }
        } else {
            console.log('⚠️ No se encontró botón de explicación');
        }
    }

    async debugPagination() {
        console.log('📄 Probando paginación...');
        
        // Verificar si hay paginación
        const pagination = await this.page.locator('#pagination');
        if (await pagination.isVisible()) {
            console.log('✅ Paginación encontrada');
            
            // Buscar botón de siguiente página
            const nextBtn = await this.page.locator('#pagination .page-link:has-text("Siguiente")');
            if (await nextBtn.isVisible() && !await nextBtn.isDisabled()) {
                await nextBtn.click();
                await this.page.waitForTimeout(1000);
                await this.takeScreenshot('pagination-next');
                console.log('✅ Navegación a siguiente página');
            }
        } else {
            console.log('⚠️ Paginación no encontrada');
        }
    }

    async runFullDebug() {
        try {
            await this.init();
            await this.navigateToApp();
            
            // Verificar API
            const apiHealthy = await this.checkAPIHealth();
            if (!apiHealthy) {
                console.log('⚠️ API no está disponible, continuando sin verificación...');
            }
            
            // Screenshot inicial
            await this.takeScreenshot('initial-load');
            
            // Debug de filtros
            await this.debugFilters();
            
            // Debug de explicaciones
            await this.debugExplanationGeneration();
            
            // Debug de paginación
            await this.debugPagination();
            
            // Screenshot final
            await this.takeScreenshot('final-state');
            
            console.log('🎉 Depuración completada. Revisa los screenshots en debug-output/');
            
        } catch (error) {
            console.error('❌ Error durante la depuración:', error);
            await this.takeScreenshot('error-state');
        } finally {
            // Mantener el navegador abierto para inspección manual
            console.log('🔍 Navegador mantenido abierto para inspección manual...');
            console.log('💡 Presiona Ctrl+C para cerrar');
            
            // Esperar indefinidamente hasta que el usuario presione Ctrl+C
            process.on('SIGINT', async () => {
                console.log('\n👋 Cerrando navegador...');
                if (this.browser) {
                    await this.browser.close();
                }
                process.exit(0);
            });
            
            // Mantener el proceso vivo
            await new Promise(() => {});
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const perDebugger = new PERDebugger();
    perDebugger.runFullDebug();
}

module.exports = PERDebugger;

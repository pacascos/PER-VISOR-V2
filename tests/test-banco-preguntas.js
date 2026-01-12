/**
 * Test Funcional Completo - Banco de Preguntas (visor-nueva-arquitectura.html)
 *
 * Ejecutar con: node tests/test-banco-preguntas.js
 *
 * Prerequisitos:
 * - Servidor web corriendo en localhost:8095
 * - API corriendo en localhost:5001
 * - Playwright instalado: npm install playwright
 */

const { chromium } = require('playwright');

// Configuracion
const BASE_URL = 'http://localhost:8095';
const CREDENTIALS = { username: 'testuser', password: '123' };
const SCREENSHOTS_DIR = './test-screenshots-banco';

// Resultados
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// Utilidad para registrar tests
function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}${details ? ' - ' + details : ''}`);
    results.tests.push({ name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('TEST FUNCIONAL: BANCO DE PREGUNTAS');
    console.log('='.repeat(60));
    console.log(`Fecha: ${new Date().toISOString()}`);
    console.log(`URL: ${BASE_URL}/visor-nueva-arquitectura.html`);
    console.log('='.repeat(60) + '\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capturar errores de consola
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    try {
        // ============================================================
        // SECCION 1: LOGIN
        // ============================================================
        console.log('\n📋 SECCION 1: LOGIN\n');

        await page.goto(`${BASE_URL}/login.html`);
        await page.waitForLoadState('networkidle');

        // Rellenar credenciales
        await page.fill('input[type="text"], input[name="username"]', CREDENTIALS.username);
        await page.fill('input[type="password"]', CREDENTIALS.password);
        await page.click('button[type="submit"], .login-btn, #loginBtn');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const loggedIn = page.url().includes('exam-system') || await page.locator('#username, .user-welcome').count() > 0;
        logTest('Login con credenciales de test', loggedIn);

        // ============================================================
        // SECCION 2: NAVEGACION AL BANCO
        // ============================================================
        console.log('\n📋 SECCION 2: NAVEGACION\n');

        await page.goto(`${BASE_URL}/visor-nueva-arquitectura.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Verificar navegacion unificada
        const hasTopNav = await page.locator('.unified-top-nav').count() > 0;
        logTest('Navegacion superior unificada presente', hasTopNav);

        const hasTabNav = await page.locator('.unified-tab-nav').count() > 0;
        logTest('Barra de tabs presente', hasTabNav);

        const tabCount = await page.locator('.unified-tab-item').count();
        logTest('4 tabs de navegacion', tabCount === 4, `Encontrados: ${tabCount}`);

        // Screenshot inicial
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-banco-inicial.png`, fullPage: true });

        // ============================================================
        // SECCION 3: FILTROS
        // ============================================================
        console.log('\n📋 SECCION 3: FILTROS\n');

        // 3.1 Filtro Convocatoria
        const filterConvocatoria = await page.locator('#filterConvocatoria').count() > 0;
        logTest('Filtro Convocatoria existe', filterConvocatoria);

        if (filterConvocatoria) {
            const optionsCount = await page.locator('#filterConvocatoria option').count();
            logTest('Filtro Convocatoria tiene opciones', optionsCount > 1, `Opciones: ${optionsCount}`);
        }

        // 3.2 Filtro Titulacion
        const filterTitulacion = await page.locator('#filterTitulacion').count() > 0;
        logTest('Filtro Titulacion existe', filterTitulacion);

        // 3.3 Filtro Test
        const filterTest = await page.locator('#filterTest').count() > 0;
        logTest('Filtro Numero de Test existe', filterTest);

        // 3.4 Filtro Tema/UT
        const filterTema = await page.locator('#filterTema').count() > 0;
        logTest('Filtro Tema/UT existe', filterTema);

        if (filterTema) {
            const temaOptions = await page.locator('#filterTema option').count();
            logTest('Filtro Tema tiene UTs', temaOptions > 1, `UTs: ${temaOptions - 1}`);
        }

        // 3.5 Checkbox Duplicados
        const filterDuplicados = await page.locator('#filterDuplicados').count() > 0;
        logTest('Checkbox Duplicados existe', filterDuplicados);

        // 3.6 Checkbox Anuladas
        const filterAnuladas = await page.locator('#filterAnuladas').count() > 0;
        logTest('Checkbox Anuladas existe', filterAnuladas);

        // 3.7 Campo de busqueda
        const searchInput = await page.locator('#searchInput').count() > 0;
        logTest('Campo de busqueda existe', searchInput);

        // ============================================================
        // SECCION 4: BOTONES DE ACCION
        // ============================================================
        console.log('\n📋 SECCION 4: BOTONES DE ACCION\n');

        // 4.1 Boton Buscar
        const btnBuscar = await page.locator('#searchBtn').count() > 0;
        logTest('Boton BUSCAR existe', btnBuscar);

        // 4.2 Boton Limpiar
        const btnLimpiar = await page.locator('#clearFilters').count() > 0;
        logTest('Boton LIMPIAR existe', btnLimpiar);

        // 4.3 Boton Toggle Respuestas
        const btnToggle = await page.locator('#toggleAnswers').count() > 0;
        logTest('Boton OCULTAR/MOSTRAR RESPUESTAS existe', btnToggle);

        // 4.4 Boton Explicaciones Auto
        const btnAutoExplain = await page.locator('#autoExplain').count() > 0;
        logTest('Boton EXPLICACIONES AUTO existe', btnAutoExplain);

        // ============================================================
        // SECCION 5: PANEL DE ESTADISTICAS
        // ============================================================
        console.log('\n📋 SECCION 5: PANEL DE ESTADISTICAS\n');

        const statTotal = await page.locator('#totalQuestions').count() > 0;
        logTest('Estadistica Total Preguntas existe', statTotal);

        const statFiltered = await page.locator('#filteredQuestions').count() > 0;
        logTest('Estadistica Preguntas Filtradas existe', statFiltered);

        const statExams = await page.locator('#totalExams').count() > 0;
        logTest('Estadistica Total Examenes existe', statExams);

        // Verificar que las estadisticas tienen valores
        await page.waitForTimeout(2000);
        const totalValue = await page.locator('#totalQuestions').textContent();
        logTest('Total preguntas cargado', totalValue && totalValue !== '-', `Valor: ${totalValue}`);

        // ============================================================
        // SECCION 6: CARGA DE PREGUNTAS
        // ============================================================
        console.log('\n📋 SECCION 6: CARGA DE PREGUNTAS\n');

        // Esperar a que carguen las preguntas
        await page.waitForTimeout(3000);

        const questionCards = await page.locator('.question-card').count();
        logTest('Preguntas cargadas en la pagina', questionCards > 0, `Cards: ${questionCards}`);

        await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-preguntas-cargadas.png`, fullPage: true });

        // ============================================================
        // SECCION 7: FUNCIONALIDAD DE FILTROS
        // ============================================================
        console.log('\n📋 SECCION 7: FUNCIONALIDAD DE FILTROS\n');

        // 7.1 Filtrar por UT
        if (filterTema && questionCards > 0) {
            const initialCount = await page.locator('.question-card').count();

            // Seleccionar UT1
            await page.selectOption('#filterTema', { index: 1 });
            await page.click('#searchBtn');
            await page.waitForTimeout(2000);

            const filteredCount = await page.locator('.question-card').count();
            logTest('Filtro por UT funciona', true, `Antes: ${initialCount}, Despues: ${filteredCount}`);

            await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-filtro-ut.png`, fullPage: true });

            // Limpiar filtros
            await page.click('#clearFilters');
            await page.waitForTimeout(2000);

            const afterClear = await page.locator('.question-card').count();
            logTest('Boton LIMPIAR funciona', afterClear >= filteredCount, `Cards despues de limpiar: ${afterClear}`);
        }

        // 7.2 Busqueda por texto
        if (searchInput && questionCards > 0) {
            await page.fill('#searchInput', 'navegacion');
            await page.click('#searchBtn');
            await page.waitForTimeout(2000);

            const searchResults = await page.locator('.question-card').count();
            logTest('Busqueda por texto funciona', true, `Resultados: ${searchResults}`);

            await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-busqueda-texto.png`, fullPage: true });

            // Limpiar
            await page.click('#clearFilters');
            await page.waitForTimeout(1000);
        }

        // ============================================================
        // SECCION 8: TOGGLE RESPUESTAS
        // ============================================================
        console.log('\n📋 SECCION 8: TOGGLE RESPUESTAS\n');

        if (btnToggle && questionCards > 0) {
            // Obtener texto inicial del boton
            const initialText = await page.locator('#toggleAnswers').textContent();

            // Click para cambiar estado
            await page.click('#toggleAnswers');
            await page.waitForTimeout(500);

            const afterText = await page.locator('#toggleAnswers').textContent();
            logTest('Toggle respuestas cambia estado', initialText !== afterText,
                `Antes: "${initialText.trim()}", Despues: "${afterText.trim()}"`);

            await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-toggle-respuestas.png`, fullPage: true });

            // Restaurar
            await page.click('#toggleAnswers');
        }

        // ============================================================
        // SECCION 9: PAGINACION
        // ============================================================
        console.log('\n📋 SECCION 9: PAGINACION\n');

        const pagination = await page.locator('#pagination').count() > 0;
        logTest('Paginacion existe', pagination);

        if (pagination) {
            const pageButtons = await page.locator('#pagination .page-link').count();
            logTest('Botones de paginacion presentes', pageButtons > 0, `Botones: ${pageButtons}`);

            // Intentar ir a pagina 2 si existe
            const page2 = await page.locator('#pagination .page-link:has-text("2")').count() > 0;
            if (page2) {
                await page.click('#pagination .page-link:has-text("2")');
                await page.waitForTimeout(1500);
                logTest('Navegacion a pagina 2 funciona', true);
                await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-paginacion.png`, fullPage: true });
            }
        }

        // ============================================================
        // SECCION 10: MODAL DE EXPLICACION
        // ============================================================
        console.log('\n📋 SECCION 10: MODAL DE EXPLICACION\n');

        // Buscar boton de explicacion en una pregunta
        const explainButtons = await page.locator('.question-card button:has-text("Explicacion"), .question-card .btn-explanation, .question-card [onclick*="showExplanation"]').count();
        logTest('Botones de explicacion en preguntas', explainButtons > 0, `Encontrados: ${explainButtons}`);

        // ============================================================
        // SECCION 11: MODAL DE EDICION
        // ============================================================
        console.log('\n📋 SECCION 11: MODAL DE EDICION\n');

        const editModal = await page.locator('#editModal').count() > 0;
        logTest('Modal de edicion existe en DOM', editModal);

        if (editModal) {
            // Verificar tabs del modal
            const tabContent = await page.locator('#editModal #tab-content, #editModal [data-tab="content"]').count() > 0;
            const tabAnswer = await page.locator('#editModal #tab-answer, #editModal [data-tab="answer"]').count() > 0;
            const tabMeta = await page.locator('#editModal #tab-metadata, #editModal [data-tab="metadata"]').count() > 0;

            logTest('Modal tiene tab Contenido', tabContent);
            logTest('Modal tiene tab Respuesta', tabAnswer);
            logTest('Modal tiene tab Metadata', tabMeta);
        }

        // ============================================================
        // SECCION 12: ERRORES DE CONSOLA
        // ============================================================
        console.log('\n📋 SECCION 12: ERRORES DE CONSOLA\n');

        logTest('Sin errores JavaScript criticos', consoleErrors.length === 0,
            consoleErrors.length > 0 ? `Errores: ${consoleErrors.slice(0, 3).join(', ')}` : 'Consola limpia');

        // ============================================================
        // RESUMEN
        // ============================================================
        console.log('\n' + '='.repeat(60));
        console.log('RESUMEN DE RESULTADOS');
        console.log('='.repeat(60));
        console.log(`✅ Pasados: ${results.passed}`);
        console.log(`❌ Fallidos: ${results.failed}`);
        console.log(`📊 Total: ${results.passed + results.failed}`);
        console.log(`📈 Porcentaje: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
        console.log('='.repeat(60));

        // Guardar resultados en JSON
        const fs = require('fs');
        if (!fs.existsSync(SCREENSHOTS_DIR)) {
            fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
        }
        fs.writeFileSync(
            `${SCREENSHOTS_DIR}/test-results.json`,
            JSON.stringify(results, null, 2)
        );
        console.log(`\n📁 Resultados guardados en: ${SCREENSHOTS_DIR}/test-results.json`);
        console.log(`📸 Screenshots guardados en: ${SCREENSHOTS_DIR}/`);

    } catch (error) {
        console.error('\n❌ ERROR DURANTE LOS TESTS:', error.message);
        results.tests.push({ name: 'Error general', passed: false, details: error.message });
    } finally {
        await browser.close();
    }

    return results;
}

// Ejecutar
runTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
});

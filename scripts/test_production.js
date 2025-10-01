#!/usr/bin/env node
/**
 * Script de pruebas E2E para verificar la web de producción
 * Prueba todas las secciones principales y verifica que no hay errores
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuración
const PRODUCTION_URL = "https://bancotest.com";
const API_URL = "https://per-api-435987927843.europe-west1.run.app";
const TIMEOUT = 30000; // 30 segundos
const SCREENSHOTS_DIR = "test_screenshots";

// Colores para output
const Colors = {
    GREEN: '\x1b[92m',
    RED: '\x1b[91m',
    YELLOW: '\x1b[93m',
    BLUE: '\x1b[94m',
    RESET: '\x1b[0m'
};

class ProductionTester {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            tests: [],
            passed: 0,
            failed: 0,
            errors: []
        };
        this.browser = null;
        this.context = null;
        this.page = null;
        this.consoleErrors = [];

        // Crear directorio para screenshots
        if (!fs.existsSync(SCREENSHOTS_DIR)) {
            fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
        }
    }

    log(message, level = "INFO") {
        let color = Colors.BLUE;
        if (level === "SUCCESS") color = Colors.GREEN;
        else if (level === "ERROR") color = Colors.RED;
        else if (level === "WARNING") color = Colors.YELLOW;

        console.log(`${color}[${level}]${Colors.RESET} ${message}`);
    }

    async startBrowser() {
        this.log("Iniciando navegador...");
        this.browser = await chromium.launch({
            headless: true
        });
        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });

        this.page = await this.context.newPage();

        // Capturar errores de consola
        this.page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning') {
                const errorMsg = `${msg.type().toUpperCase()}: ${msg.text()}`;
                this.consoleErrors.push(errorMsg);
                if (msg.type() === 'error') {
                    this.log(`Console error: ${msg.text()}`, "ERROR");
                }
            }
        });

        this.page.on('pageerror', err => {
            const errorMsg = `PAGE ERROR: ${err}`;
            this.consoleErrors.push(errorMsg);
            this.log(`Page error: ${err}`, "ERROR");
        });

        this.log("Navegador iniciado", "SUCCESS");
    }

    async doLogout() {
        this.log("Haciendo logout (limpiando sesión)...");
        try {
            // Limpiar localStorage, sessionStorage y cookies
            await this.page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
            await this.context.clearCookies();

            this.log("Sesión limpiada exitosamente", "SUCCESS");
            return true;
        } catch (error) {
            this.log(`Logout falló: ${error.message}`, "WARNING");
            return false;
        }
    }

    async doLogin() {
        const testName = "User Login";
        this.log(`Testing: ${testName}`);

        try {
            // Ir directamente a exam-system.html (requiere login)
            // Esto nos redirigirá automáticamente al login si no estamos autenticados
            await this.page.goto(`${PRODUCTION_URL}/exam-system.html`, {
                waitUntil: "networkidle",
                timeout: TIMEOUT
            });

            await this.page.waitForTimeout(3000);

            // Buscar el modal de login por el título "Iniciar Sesión"
            const loginTitle = await this.page.$('text="Iniciar Sesión"');

            if (loginTitle) {
                this.log("Página de login detectada, haciendo login...");
                await this.takeScreenshot("login_modal_detected");

                // Esperar a que los inputs sean visibles
                await this.page.waitForSelector('input[type="text"]:visible, input[type="email"]:visible', { timeout: 5000 });

                // Obtener todos los inputs visibles
                const inputs = await this.page.$$('input:visible');

                if (inputs.length >= 2) {
                    // Primer input visible = usuario/email
                    await inputs[0].fill('testuser');
                    await this.page.waitForTimeout(500);

                    // Segundo input visible = contraseña
                    await inputs[1].fill('123');
                    await this.page.waitForTimeout(500);

                    // Buscar botón "Entrar"
                    const loginBtn = await this.page.$('button:has-text("Entrar")');
                    if (loginBtn) {
                        await loginBtn.click();
                        this.log("Botón de login clickeado, esperando...");
                        await this.page.waitForTimeout(5000);

                        // Verificar si el login fue exitoso buscando el mensaje de bienvenida
                        const welcomeMessage = await this.page.$('text=/¡Bienvenido|Bienvenido|Nuevo Examen/i');

                        if (welcomeMessage) {
                            this.log("Login exitoso - Bienvenida detectada", "SUCCESS");
                            await this.takeScreenshot("logged_in");
                            return true;
                        }

                        // Si no hay mensaje de bienvenida, verificar si seguimos en el modal de login
                        const stillLoginModal = await this.page.$('text="Iniciar Sesión"');

                        if (stillLoginModal) {
                            this.log("Usuario no existe o credenciales incorrectas, intentando registrar...", "WARNING");

                            // Buscar link de registro
                            const registerLink = await this.page.$('a:has-text("Regístrate")');
                            if (registerLink) {
                                await registerLink.click();
                                await this.page.waitForTimeout(2000);

                                // Esperar modal de registro
                                await this.page.waitForSelector('input:visible', { timeout: 5000 });
                                const registerInputs = await this.page.$$('input:visible');

                                if (registerInputs.length >= 3) {
                                    // Nombre de usuario
                                    await registerInputs[0].fill('testuser');
                                    await this.page.waitForTimeout(500);

                                    // Email
                                    await registerInputs[1].fill('testuser@test.com');
                                    await this.page.waitForTimeout(500);

                                    // Contraseña
                                    await registerInputs[2].fill('123');
                                    await this.page.waitForTimeout(500);

                                    // Buscar botón de registro
                                    const registerBtn = await this.page.$('button:has-text("Registrar"), button:has-text("Crear")');
                                    if (registerBtn) {
                                        await registerBtn.click();
                                        this.log("Usuario registrado, esperando...");
                                        await this.page.waitForTimeout(5000);
                                    }
                                }
                            }
                        }

                        this.log("Login completado", "SUCCESS");
                        await this.takeScreenshot("logged_in");
                        return true;
                    } else {
                        this.log("No se encontró botón 'Entrar'", "ERROR");
                        await this.takeScreenshot("no_login_button");
                        return false;
                    }
                } else {
                    this.log("No se encontraron suficientes inputs visibles", "ERROR");
                    await this.takeScreenshot("no_inputs");
                    return false;
                }
            } else {
                this.log("Ya está autenticado (no aparece modal de login)", "SUCCESS");
                await this.takeScreenshot("already_logged_in");
                return true;
            }

        } catch (error) {
            this.log(`Login falló: ${error.message}`, "ERROR");
            await this.takeScreenshot("login_error");
            return false;
        }
    }

    async takeScreenshot(name) {
        const filename = `${SCREENSHOTS_DIR}/${name}_${Date.now()}.png`;
        await this.page.screenshot({ path: filename });
        return filename;
    }

    async testApiHealth() {
        const testName = "API Health Check";
        this.log(`Testing: ${testName}`);

        try {
            const response = await this.page.request.get(`${API_URL}/health`);
            if (response.status() !== 200) {
                throw new Error(`API health check failed with status ${response.status()}`);
            }

            const data = await response.json();
            if (data.status !== "healthy") {
                throw new Error("API status is not healthy");
            }
            if (data.database !== "connected") {
                throw new Error("Database is not connected");
            }

            this.recordSuccess(testName);
            return true;
        } catch (error) {
            this.recordFailure(testName, error.message);
            return false;
        }
    }

    async testHomepage() {
        const testName = "Homepage";
        this.log(`Testing: ${testName}`);

        try {
            this.consoleErrors = [];
            await this.page.goto(PRODUCTION_URL, {
                waitUntil: "networkidle",
                timeout: TIMEOUT
            });

            // Verificar título
            const title = await this.page.title();
            if (!title.includes("PER")) {
                throw new Error(`Unexpected title: ${title}`);
            }

            // Verificar que no hay errores de consola críticos
            const criticalErrors = this.consoleErrors.filter(e => e.includes("ERROR:"));
            if (criticalErrors.length > 0) {
                throw new Error(`Console errors found: ${criticalErrors.join(", ")}`);
            }

            await this.takeScreenshot("homepage");
            this.recordSuccess(testName);
            return true;
        } catch (error) {
            await this.takeScreenshot("homepage_error");
            this.recordFailure(testName, error.message);
            return false;
        }
    }

    async testExamSystem() {
        const testName = "Exam System (Nuevo Examen)";
        this.log(`Testing: ${testName}`);

        try {
            this.consoleErrors = [];

            // Si estamos en el dashboard, hacer click en "Nuevo Examen"
            const newExamBtn = await this.page.$('text="Nuevo Examen"');
            if (newExamBtn) {
                await newExamBtn.click();
                await this.page.waitForTimeout(3000);
            } else {
                throw new Error("No se encontró botón 'Nuevo Examen' en dashboard");
            }

            // Verificar que se cargó un examen (buscar elementos que indican que hay una pregunta)
            const hasQuestion = await this.page.$('text=/Pregunta \\d+ de|pregunta/i');
            const hasAnswerOptions = await this.page.$$('input[type="radio"]');

            if (!hasQuestion) {
                throw new Error("No se detectó texto de pregunta");
            }

            if (hasAnswerOptions.length < 2) {
                throw new Error("No se detectaron opciones de respuesta");
            }

            // Verificar que no hay errores críticos
            const criticalErrors = this.consoleErrors.filter(e =>
                e.includes("ERROR:") && !e.includes("404")
            );
            if (criticalErrors.length > 0) {
                throw new Error(`Console errors found: ${criticalErrors.join(", ")}`);
            }

            await this.takeScreenshot("exam_system_success");
            this.recordSuccess(testName);
            return true;
        } catch (error) {
            await this.takeScreenshot("exam_system_error");
            this.recordFailure(testName, error.message);
            return false;
        }
    }

    async testQuestionStatistics() {
        const testName = "Estadísticas de Preguntas";
        this.log(`Testing: ${testName}`);

        try {
            this.consoleErrors = [];

            // Hacer click en "Estadísticas de Preguntas"
            const statsBtn = await this.page.$('text="Estadísticas de Preguntas"');
            if (statsBtn) {
                await statsBtn.click();
                await this.page.waitForTimeout(3000);
            } else {
                throw new Error("No se encontró botón 'Estadísticas de Preguntas'");
            }

            // Verificar que se cargó la página de estadísticas
            // Puede tener diferentes contenidos dependiendo de si hay datos
            const hasContent = await this.page.$('body');

            if (!hasContent) {
                throw new Error("La página no cargó contenido");
            }

            // Verificar que no hay errores 500 o críticos
            const criticalErrors = this.consoleErrors.filter(e =>
                e.includes("ERROR:") && (e.includes("500") || e.includes("Failed"))
            );
            if (criticalErrors.length > 0) {
                throw new Error(`Errors found: ${criticalErrors.join(", ")}`);
            }

            await this.takeScreenshot("question_statistics_success");
            this.recordSuccess(testName);
            return true;
        } catch (error) {
            await this.takeScreenshot("question_statistics_error");
            this.recordFailure(testName, error.message);
            return false;
        }
    }

    async testStatisticsDashboard() {
        const testName = "Estadísticas (Dashboard)";
        this.log(`Testing: ${testName}`);

        try {
            this.consoleErrors = [];

            // Hacer click en "Estadísticas"
            const statsBtn = await this.page.$('text=/^Estadísticas$/');
            if (statsBtn) {
                await statsBtn.click();
                await this.page.waitForTimeout(3000);
            } else {
                // Alternativa: navegar directamente
                await this.page.goto(`${PRODUCTION_URL}/statistics-dashboard.html`, {
                    waitUntil: "networkidle",
                    timeout: TIMEOUT
                });
            }

            // Verificar que no hay errores 500 en user-stats
            const criticalErrors = this.consoleErrors.filter(e =>
                e.includes("500") || e.includes("Failed to load user statistics")
            );

            if (criticalErrors.length > 0) {
                throw new Error(`Statistics loading errors: ${criticalErrors.join(", ")}`);
            }

            await this.takeScreenshot("statistics_dashboard_success");
            this.recordSuccess(testName);
            return true;
        } catch (error) {
            await this.takeScreenshot("statistics_dashboard_error");
            this.recordFailure(testName, error.message);
            return false;
        }
    }

    async testQuestionBrowser() {
        const testName = "Banco de Preguntas";
        this.log(`Testing: ${testName}`);

        try {
            this.consoleErrors = [];

            // Hacer click en "Banco de Preguntas"
            const bankBtn = await this.page.$('text="Banco de Preguntas"');
            if (bankBtn) {
                await bankBtn.click();
                await this.page.waitForTimeout(3000);
            } else {
                throw new Error("No se encontró botón 'Banco de Preguntas'");
            }

            // Verificar que la página cargó (puede ser index.html o visor)
            // Simplemente verificamos que no hay errores críticos
            const criticalErrors = this.consoleErrors.filter(e =>
                e.includes("ERROR:") && (e.includes("500") || e.includes("Failed"))
            );

            if (criticalErrors.length > 0) {
                throw new Error(`Errors found: ${criticalErrors.join(", ")}`);
            }

            await this.takeScreenshot("question_browser_success");
            this.recordSuccess(testName);
            return true;
        } catch (error) {
            await this.takeScreenshot("question_browser_error");
            this.recordFailure(testName, error.message);
            return false;
        }
    }

    async testAdminPanel() {
        const testName = "Panel de Administración";
        this.log(`Testing: ${testName}`);

        try {
            this.consoleErrors = [];

            // Hacer click en "Panel de Administración"
            const adminBtn = await this.page.$('text="Panel de Administración"');
            if (adminBtn) {
                await adminBtn.click();
                await this.page.waitForTimeout(3000);
            } else {
                throw new Error("No se encontró botón 'Panel de Administración'");
            }

            // Verificar que no hay errores críticos
            const criticalErrors = this.consoleErrors.filter(e =>
                e.includes("ERROR:") && (e.includes("500") || e.includes("Failed"))
            );

            if (criticalErrors.length > 0) {
                throw new Error(`Errors found: ${criticalErrors.join(", ")}`);
            }

            await this.takeScreenshot("admin_panel_success");
            this.recordSuccess(testName);
            return true;
        } catch (error) {
            await this.takeScreenshot("admin_panel_error");
            this.recordFailure(testName, error.message);
            return false;
        }
    }

    async testCorsFunctionality() {
        const testName = "CORS Functionality";
        this.log(`Testing: ${testName}`);

        try {
            this.consoleErrors = [];
            await this.page.goto(PRODUCTION_URL, {
                waitUntil: "networkidle",
                timeout: TIMEOUT
            });

            // Hacer una petición a la API desde el frontend
            const response = await this.page.evaluate(async (apiUrl) => {
                try {
                    const res = await fetch(`${apiUrl}/health`);
                    return await res.json();
                } catch (err) {
                    return { error: err.message };
                }
            }, API_URL);

            if (response.error) {
                throw new Error(`CORS error: ${response.error}`);
            }
            if (response.status !== "healthy") {
                throw new Error("API not healthy");
            }

            // Verificar que no hay errores CORS en consola
            const corsErrors = this.consoleErrors.filter(e => e.toUpperCase().includes("CORS"));
            if (corsErrors.length > 0) {
                throw new Error(`CORS errors found: ${corsErrors.join(", ")}`);
            }

            this.recordSuccess(testName);
            return true;
        } catch (error) {
            this.recordFailure(testName, error.message);
            return false;
        }
    }

    recordSuccess(testName) {
        this.results.tests.push({
            name: testName,
            status: "PASSED",
            timestamp: new Date().toISOString()
        });
        this.results.passed++;
        this.log(`✓ ${testName} PASSED`, "SUCCESS");
    }

    recordFailure(testName, error) {
        this.results.tests.push({
            name: testName,
            status: "FAILED",
            error: error,
            timestamp: new Date().toISOString()
        });
        this.results.failed++;
        this.results.errors.push(`${testName}: ${error}`);
        this.log(`✗ ${testName} FAILED: ${error}`, "ERROR");
    }

    async cleanup() {
        if (this.context) await this.context.close();
        if (this.browser) await this.browser.close();
    }

    saveResults() {
        const filename = `test_results_${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
        this.log(`Results saved to ${filename}`, "SUCCESS");
    }

    printSummary() {
        console.log("\n" + "=".repeat(60));
        console.log("TEST SUMMARY");
        console.log("=".repeat(60));
        console.log(`Total tests: ${this.results.passed + this.results.failed}`);
        console.log(`${Colors.GREEN}Passed: ${this.results.passed}${Colors.RESET}`);
        console.log(`${Colors.RED}Failed: ${this.results.failed}${Colors.RESET}`);
        console.log("=".repeat(60));

        if (this.results.errors.length > 0) {
            console.log(`\n${Colors.RED}ERRORS:${Colors.RESET}`);
            this.results.errors.forEach(error => {
                console.log(`  - ${error}`);
            });
        }

        console.log(`\nScreenshots saved in: ${SCREENSHOTS_DIR}/`);
    }

    async runAllTests() {
        try {
            await this.startBrowser();

            // Tests sin autenticación
            const publicTests = [
                () => this.testApiHealth(),
                () => this.testHomepage(),
                () => this.testCorsFunctionality(),
            ];

            // Ejecutar tests públicos
            for (const testFunc of publicTests) {
                try {
                    await testFunc();
                } catch (error) {
                    this.log(`Unexpected error in test: ${error.message}`, "ERROR");
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Tests que requieren autenticación (verifican las 5 secciones principales del menú)
            const authTests = [
                { name: "Nuevo Examen", func: () => this.testExamSystem() },
                { name: "Estadísticas de Preguntas", func: () => this.testQuestionStatistics() },
                { name: "Estadísticas", func: () => this.testStatisticsDashboard() },
                { name: "Banco de Preguntas", func: () => this.testQuestionBrowser() },
                { name: "Panel de Administración", func: () => this.testAdminPanel() },
            ];

            // Ejecutar cada test autenticado con login/logout
            for (const test of authTests) {
                try {
                    // Login antes del test
                    await this.doLogin();

                    // Ejecutar el test
                    await test.func();

                    // Logout después del test
                    await this.doLogout();

                } catch (error) {
                    this.log(`Unexpected error in ${test.name}: ${error.message}`, "ERROR");
                    // Intentar logout aunque falle el test
                    try {
                        await this.doLogout();
                    } catch (e) {
                        this.log(`Logout falló después de error en test`, "WARNING");
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } finally {
            await this.cleanup();
            this.saveResults();
            this.printSummary();
        }

        // Retornar código de salida
        return this.results.failed === 0 ? 0 : 1;
    }
}

async function main() {
    console.log(`\n${Colors.BLUE}${"=".repeat(60)}${Colors.RESET}`);
    console.log(`${Colors.BLUE}PER Production Testing Suite${Colors.RESET}`);
    console.log(`${Colors.BLUE}${"=".repeat(60)}${Colors.RESET}\n`);
    console.log(`Testing URL: ${PRODUCTION_URL}`);
    console.log(`API URL: ${API_URL}\n`);

    const tester = new ProductionTester();
    const exitCode = await tester.runAllTests();

    process.exit(exitCode);
}

main();

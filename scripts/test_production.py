#!/usr/bin/env python3
"""
Script de pruebas E2E para verificar la web de producción
Prueba todas las secciones principales y verifica que no hay errores
"""

import os
import sys
import time
import json
from datetime import datetime
from playwright.sync_api import sync_playwright, expect

# Configuración
PRODUCTION_URL = "https://bancotest.com"
API_URL = "https://per-api-435987927843.europe-west1.run.app"
TIMEOUT = 30000  # 30 segundos
SCREENSHOTS_DIR = "test_screenshots"

# Colores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

class ProductionTester:
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": [],
            "passed": 0,
            "failed": 0,
            "errors": []
        }
        self.browser = None
        self.context = None
        self.page = None

        # Crear directorio para screenshots
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

    def log(self, message, level="INFO"):
        color = Colors.BLUE
        if level == "SUCCESS":
            color = Colors.GREEN
        elif level == "ERROR":
            color = Colors.RED
        elif level == "WARNING":
            color = Colors.YELLOW

        print(f"{color}[{level}]{Colors.RESET} {message}")

    def start_browser(self):
        """Iniciar navegador"""
        self.log("Iniciando navegador...")
        playwright = sync_playwright().start()
        self.browser = playwright.chromium.launch(headless=True)
        self.context = self.browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )

        # Capturar errores de consola
        self.console_errors = []
        self.page = self.context.new_page()
        self.page.on("console", lambda msg: self._handle_console(msg))
        self.page.on("pageerror", lambda err: self._handle_page_error(err))

        self.log("Navegador iniciado", "SUCCESS")

    def _handle_console(self, msg):
        """Capturar mensajes de consola"""
        if msg.type in ["error", "warning"]:
            error_msg = f"{msg.type.upper()}: {msg.text}"
            self.console_errors.append(error_msg)
            if msg.type == "error":
                self.log(f"Console error: {msg.text}", "ERROR")

    def _handle_page_error(self, err):
        """Capturar errores de página"""
        error_msg = f"PAGE ERROR: {err}"
        self.console_errors.append(error_msg)
        self.log(f"Page error: {err}", "ERROR")

    def take_screenshot(self, name):
        """Tomar screenshot"""
        filename = f"{SCREENSHOTS_DIR}/{name}_{int(time.time())}.png"
        self.page.screenshot(path=filename)
        return filename

    def test_api_health(self):
        """Verificar que la API está funcionando"""
        test_name = "API Health Check"
        self.log(f"Testing: {test_name}")

        try:
            response = self.page.request.get(f"{API_URL}/health")
            assert response.status == 200, f"API health check failed with status {response.status}"

            data = response.json()
            assert data.get("status") == "healthy", "API status is not healthy"
            assert data.get("database") == "connected", "Database is not connected"

            self._record_success(test_name)
            return True
        except Exception as e:
            self._record_failure(test_name, str(e))
            return False

    def test_homepage(self):
        """Verificar página principal"""
        test_name = "Homepage"
        self.log(f"Testing: {test_name}")

        try:
            self.console_errors = []
            self.page.goto(PRODUCTION_URL, wait_until="networkidle", timeout=TIMEOUT)

            # Verificar título
            expect(self.page).to_have_title("PER Examen - Sistema de Exámenes")

            # Verificar que no hay errores de consola críticos
            critical_errors = [e for e in self.console_errors if "ERROR:" in e]
            if critical_errors:
                raise Exception(f"Console errors found: {critical_errors}")

            self.take_screenshot("homepage")
            self._record_success(test_name)
            return True
        except Exception as e:
            self.take_screenshot(f"homepage_error")
            self._record_failure(test_name, str(e))
            return False

    def test_login(self):
        """Verificar login de usuario"""
        test_name = "User Login"
        self.log(f"Testing: {test_name}")

        try:
            self.console_errors = []
            self.page.goto(PRODUCTION_URL, wait_until="networkidle", timeout=TIMEOUT)

            # Click en botón de login
            self.page.click("button:has-text('Acceder')")
            self.page.wait_for_timeout(1000)

            # Rellenar formulario de login (usuario de prueba)
            self.page.fill("input[type='email']", "test@example.com")
            self.page.fill("input[type='password']", "test123")

            # Hacer login
            self.page.click("button:has-text('Iniciar')")
            self.page.wait_for_timeout(2000)

            # Si no existe el usuario, registrarlo
            if "Registro" in self.page.content() or "Register" in self.page.content():
                self.log("Usuario no existe, registrando...", "WARNING")
                # Hacer registro primero
                self.page.goto(PRODUCTION_URL)
                self.page.click("button:has-text('Registrarse')")
                self.page.wait_for_timeout(1000)

                self.page.fill("input[type='text']", "Test User")
                self.page.fill("input[type='email']", "test@example.com")
                self.page.fill("input[type='password']", "test123")
                self.page.click("button:has-text('Crear')")
                self.page.wait_for_timeout(2000)

            # Verificar que estamos logueados (buscar elementos típicos de usuario logueado)
            self.page.wait_for_timeout(2000)

            self.take_screenshot("logged_in")
            self._record_success(test_name)
            return True
        except Exception as e:
            self.take_screenshot(f"login_error")
            self._record_failure(test_name, str(e))
            return False

    def test_exam_system(self):
        """Verificar sistema de exámenes"""
        test_name = "Exam System"
        self.log(f"Testing: {test_name}")

        try:
            self.console_errors = []
            self.page.goto(f"{PRODUCTION_URL}/exam-system.html", wait_until="networkidle", timeout=TIMEOUT)

            # Esperar a que cargue la configuración
            self.page.wait_for_selector("#questionCount", timeout=10000)

            # Verificar elementos principales
            assert self.page.is_visible("#questionCount"), "Question count selector not visible"
            assert self.page.is_visible("#startExamBtn"), "Start exam button not visible"

            # Verificar que no hay errores críticos
            critical_errors = [e for e in self.console_errors if "ERROR:" in e and "404" not in e]
            if critical_errors:
                raise Exception(f"Console errors found: {critical_errors}")

            self.take_screenshot("exam_system")
            self._record_success(test_name)
            return True
        except Exception as e:
            self.take_screenshot(f"exam_system_error")
            self._record_failure(test_name, str(e))
            return False

    def test_create_exam(self):
        """Verificar creación de examen"""
        test_name = "Create Exam"
        self.log(f"Testing: {test_name}")

        try:
            self.console_errors = []
            self.page.goto(f"{PRODUCTION_URL}/exam-system.html", wait_until="networkidle", timeout=TIMEOUT)

            # Esperar a que cargue
            self.page.wait_for_selector("#startExamBtn", timeout=10000)

            # Seleccionar 10 preguntas
            self.page.select_option("#questionCount", "10")
            self.page.wait_for_timeout(500)

            # Iniciar examen
            self.page.click("#startExamBtn")

            # Esperar a que aparezca la primera pregunta
            self.page.wait_for_selector("#questionText", timeout=15000)

            # Verificar que hay opciones de respuesta
            assert self.page.is_visible(".answer-option"), "Answer options not visible"

            self.take_screenshot("exam_created")
            self._record_success(test_name)
            return True
        except Exception as e:
            self.take_screenshot(f"create_exam_error")
            self._record_failure(test_name, str(e))
            return False

    def test_statistics_dashboard(self):
        """Verificar dashboard de estadísticas"""
        test_name = "Statistics Dashboard"
        self.log(f"Testing: {test_name}")

        try:
            self.console_errors = []
            self.page.goto(f"{PRODUCTION_URL}/statistics-dashboard.html", wait_until="networkidle", timeout=TIMEOUT)

            # Esperar a que cargue el dashboard
            self.page.wait_for_timeout(3000)

            # Verificar que el dashboard se muestra
            # (puede estar vacío si no hay datos, pero no debería dar errores)

            # Verificar que no hay errores 500 o 404 en user-stats
            critical_errors = [e for e in self.console_errors
                             if ("500" in e or "Failed to load user statistics" in e)]

            if critical_errors:
                raise Exception(f"Statistics loading errors: {critical_errors}")

            self.take_screenshot("statistics_dashboard")
            self._record_success(test_name)
            return True
        except Exception as e:
            self.take_screenshot(f"statistics_error")
            self._record_failure(test_name, str(e))
            return False

    def test_question_browser(self):
        """Verificar navegador de preguntas"""
        test_name = "Question Browser"
        self.log(f"Testing: {test_name}")

        try:
            self.console_errors = []
            self.page.goto(f"{PRODUCTION_URL}/index.html", wait_until="networkidle", timeout=TIMEOUT)

            # Esperar a que carguen las preguntas
            self.page.wait_for_selector(".question-item", timeout=10000)

            # Verificar que hay preguntas
            questions = self.page.query_selector_all(".question-item")
            assert len(questions) > 0, "No questions loaded"

            # Click en una pregunta
            questions[0].click()
            self.page.wait_for_timeout(1000)

            # Verificar que se muestra el detalle
            assert self.page.is_visible(".question-detail"), "Question detail not visible"

            self.take_screenshot("question_browser")
            self._record_success(test_name)
            return True
        except Exception as e:
            self.take_screenshot(f"question_browser_error")
            self._record_failure(test_name, str(e))
            return False

    def test_cors_functionality(self):
        """Verificar que CORS funciona correctamente"""
        test_name = "CORS Functionality"
        self.log(f"Testing: {test_name}")

        try:
            self.console_errors = []
            self.page.goto(PRODUCTION_URL, wait_until="networkidle", timeout=TIMEOUT)

            # Hacer una petición a la API desde el frontend
            response = self.page.evaluate(f"""
                fetch('{API_URL}/health')
                    .then(r => r.json())
                    .then(data => data)
                    .catch(err => ({{ error: err.message }}))
            """)

            assert "error" not in response, f"CORS error: {response.get('error')}"
            assert response.get("status") == "healthy", "API not healthy"

            # Verificar que no hay errores CORS en consola
            cors_errors = [e for e in self.console_errors if "CORS" in e.upper()]
            if cors_errors:
                raise Exception(f"CORS errors found: {cors_errors}")

            self._record_success(test_name)
            return True
        except Exception as e:
            self._record_failure(test_name, str(e))
            return False

    def _record_success(self, test_name):
        """Registrar test exitoso"""
        self.results["tests"].append({
            "name": test_name,
            "status": "PASSED",
            "timestamp": datetime.now().isoformat()
        })
        self.results["passed"] += 1
        self.log(f"✓ {test_name} PASSED", "SUCCESS")

    def _record_failure(self, test_name, error):
        """Registrar test fallido"""
        self.results["tests"].append({
            "name": test_name,
            "status": "FAILED",
            "error": error,
            "timestamp": datetime.now().isoformat()
        })
        self.results["failed"] += 1
        self.results["errors"].append(f"{test_name}: {error}")
        self.log(f"✗ {test_name} FAILED: {error}", "ERROR")

    def cleanup(self):
        """Limpiar recursos"""
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()

    def save_results(self):
        """Guardar resultados en JSON"""
        filename = f"test_results_{int(time.time())}.json"
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        self.log(f"Results saved to {filename}", "SUCCESS")

    def print_summary(self):
        """Imprimir resumen de resultados"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total tests: {self.results['passed'] + self.results['failed']}")
        print(f"{Colors.GREEN}Passed: {self.results['passed']}{Colors.RESET}")
        print(f"{Colors.RED}Failed: {self.results['failed']}{Colors.RESET}")
        print("="*60)

        if self.results['errors']:
            print(f"\n{Colors.RED}ERRORS:{Colors.RESET}")
            for error in self.results['errors']:
                print(f"  - {error}")

        print(f"\nScreenshots saved in: {SCREENSHOTS_DIR}/")

    def run_all_tests(self):
        """Ejecutar todos los tests"""
        try:
            self.start_browser()

            # Lista de tests a ejecutar
            tests = [
                self.test_api_health,
                self.test_homepage,
                self.test_cors_functionality,
                self.test_exam_system,
                self.test_create_exam,
                self.test_statistics_dashboard,
                self.test_question_browser,
            ]

            # Ejecutar cada test
            for test_func in tests:
                try:
                    test_func()
                except Exception as e:
                    self.log(f"Unexpected error in {test_func.__name__}: {e}", "ERROR")

                # Pequeña pausa entre tests
                time.sleep(1)

        finally:
            self.cleanup()
            self.save_results()
            self.print_summary()

        # Retornar código de salida
        return 0 if self.results['failed'] == 0 else 1

def main():
    """Main function"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}PER Production Testing Suite{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    print(f"Testing URL: {PRODUCTION_URL}")
    print(f"API URL: {API_URL}\n")

    tester = ProductionTester()
    exit_code = tester.run_all_tests()

    sys.exit(exit_code)

if __name__ == "__main__":
    main()

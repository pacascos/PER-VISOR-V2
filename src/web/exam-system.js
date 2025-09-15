/**
 * Sistema de Exámenes PER - Frontend JavaScript
 * Gestiona autenticación, generación de exámenes y evaluación
 */

class ExamSystem {
    constructor() {
        this.API_BASE = 'http://localhost:5001';
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken');
        this.currentExam = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.examTimer = null;
        this.timeRemaining = 90 * 60; // 90 minutos en segundos

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        // Authentication events
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Dashboard events
        document.getElementById('startExamBtn').addEventListener('click', () => {
            this.startNewExam();
        });

        document.getElementById('viewQuestionsBankBtn').addEventListener('click', () => {
            window.open('visor-nueva-arquitectura.html', '_blank');
        });

        document.getElementById('viewStatsBtn').addEventListener('click', () => {
            this.showPERStats();
        });

        // Exam navigation events
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.goToPreviousQuestion();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.goToNextQuestion();
        });

        document.getElementById('finishBtn').addEventListener('click', () => {
            this.finishExam();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseExam();
        });
    }

    // Authentication Methods
    async checkAuthStatus() {
        if (this.authToken) {
            try {
                const response = await fetch(`${this.API_BASE}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    this.showDashboard();
                } else {
                    this.clearAuth();
                    this.showAuth();
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
                this.clearAuth();
                this.showAuth();
            }
        } else {
            this.showAuth();
        }
    }

    async handleLogin() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.authToken);
                this.showAlert('¡Login exitoso!', 'success');
                this.showDashboard();
            } else {
                this.showAlert(data.error || 'Error en el login', 'danger');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Error de conexión', 'danger');
        }
    }

    async handleRegister() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const response = await fetch(`${this.API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.authToken);
                this.showAlert('¡Registro exitoso!', 'success');
                this.showDashboard();
            } else {
                this.showAlert(data.error || 'Error en el registro', 'danger');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showAlert('Error de conexión', 'danger');
        }
    }

    handleLogout() {
        this.clearAuth();
        this.showAuth();
        this.showAlert('Sesión cerrada', 'info');
    }

    clearAuth() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
    }

    // UI Navigation Methods
    showAuth() {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
        document.getElementById('exam-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        document.getElementById('exam-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';

        // Update username display
        document.getElementById('username').textContent = this.currentUser.username;
    }

    showExamInterface() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'none';
        document.getElementById('exam-section').style.display = 'block';
        document.getElementById('results-section').style.display = 'none';
    }

    showResults() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'none';
        document.getElementById('exam-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'block';
    }

    showLoginForm() {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    }

    showRegisterForm() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }

    // Exam Methods
    async startNewExam() {
        try {
            this.showAlert('Generando examen...', 'info');

            const response = await fetch(`${this.API_BASE}/exams/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.currentExam = data;
                this.currentQuestionIndex = 0;
                this.userAnswers = {};
                this.timeRemaining = 90 * 60; // Reset timer

                // Load exam questions details
                await this.loadExamQuestions();

                this.showExamInterface();
                this.startTimer();
                this.displayCurrentQuestion();
                this.showAlert('¡Examen iniciado! Tienes 90 minutos.', 'success');
            } else {
                this.showAlert(data.error || 'Error generando examen', 'danger');
            }
        } catch (error) {
            console.error('Error starting exam:', error);
            this.showAlert('Error de conexión', 'danger');
        }
    }

    async loadExamQuestions() {
        // Load detailed question data from the exam endpoint
        try {
            const response = await fetch(`${this.API_BASE}/exams/${this.currentExam.exam_id}/questions`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentExam.questionDetails = data.questions;
            } else {
                console.error('Error loading exam questions');
                this.showAlert('Error cargando preguntas del examen', 'danger');
            }
        } catch (error) {
            console.error('Error loading exam questions:', error);
            this.showAlert('Error de conexión cargando preguntas', 'danger');
        }
    }

    displayCurrentQuestion() {
        const question = this.currentExam.questionDetails[this.currentQuestionIndex];

        if (!question) {
            console.error('Question not found:', this.currentQuestionIndex);
            return;
        }

        // Hide loading, show content
        document.getElementById('questionLoading').classList.add('hidden');
        document.getElementById('questionContent').classList.remove('hidden');

        // Update question number and category
        document.getElementById('questionNumber').textContent = this.currentQuestionIndex + 1;
        document.getElementById('questionUT').textContent = question.ut_number;
        document.getElementById('questionCategory').textContent = question.ut_category;

        // Update question text
        document.getElementById('questionText').textContent = question.texto_pregunta;

        // Update options
        const optionsContainer = document.getElementById('questionOptions');
        optionsContainer.innerHTML = '';

        const options = ['a', 'b', 'c', 'd'];
        options.forEach((letter, index) => {
            const optionText = question[`opcion_${letter}`];
            if (optionText) {
                const li = document.createElement('li');
                li.className = 'question-option';

                const savedAnswer = this.userAnswers[question.question_id];
                const isChecked = savedAnswer === letter ? 'checked' : '';

                li.innerHTML = `
                    <label class="option-label">
                        <input type="radio" name="question_${question.question_id}" value="${letter}"
                               class="option-input" ${isChecked}
                               onchange="examSystem.saveAnswer('${question.question_id}', '${letter}')">
                        <span class="option-letter">${letter.toUpperCase()}</span>
                        ${optionText}
                    </label>
                `;

                optionsContainer.appendChild(li);
            }
        });

        // Update progress
        this.updateProgress();

        // Update navigation buttons
        this.updateNavigationButtons();

        // Update viewer link
        this.updateViewerLink(question);
    }

    saveAnswer(questionId, answer) {
        this.userAnswers[questionId] = answer;
        console.log('Answer saved:', questionId, answer);
    }

    updateProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.currentExam.questions.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('currentQuestion').textContent = this.currentQuestionIndex + 1;
        document.getElementById('totalQuestions').textContent = this.currentExam.questions.length;
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const finishBtn = document.getElementById('finishBtn');

        // Previous button
        prevBtn.disabled = this.currentQuestionIndex === 0;

        // Next/Finish buttons
        const isLastQuestion = this.currentQuestionIndex === this.currentExam.questions.length - 1;

        if (isLastQuestion) {
            nextBtn.classList.add('hidden');
            finishBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            finishBtn.classList.add('hidden');
        }
    }

    goToPreviousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayCurrentQuestion();
        }
    }

    goToNextQuestion() {
        if (this.currentQuestionIndex < this.currentExam.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayCurrentQuestion();
        }
    }

    // Timer Methods
    startTimer() {
        this.examTimer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const timerElement = document.getElementById('timer');
        timerElement.textContent = timeString;

        // Add warning class if less than 10 minutes
        if (this.timeRemaining <= 600) {
            timerElement.classList.add('warning');
        }
    }

    pauseExam() {
        if (this.examTimer) {
            clearInterval(this.examTimer);
            this.examTimer = null;
            document.getElementById('pauseBtn').innerHTML = '<i class="fas fa-play me-1"></i>Continuar';
            this.showAlert('Examen pausado', 'info');
        } else {
            this.startTimer();
            document.getElementById('pauseBtn').innerHTML = '<i class="fas fa-pause me-1"></i>Pausar';
            this.showAlert('Examen reanudado', 'info');
        }
    }

    timeUp() {
        clearInterval(this.examTimer);
        this.showAlert('¡Tiempo agotado! El examen se ha finalizado automáticamente.', 'danger');
        this.finishExam();
    }

    async finishExam() {
        if (this.examTimer) {
            clearInterval(this.examTimer);
        }

        // Show confirmation dialog
        const answeredCount = Object.keys(this.userAnswers).length;
        const totalQuestions = this.currentExam.questions.length;

        if (answeredCount < totalQuestions) {
            const confirmFinish = confirm(
                `Has respondido ${answeredCount} de ${totalQuestions} preguntas. ` +
                '¿Estás seguro de que quieres finalizar el examen?'
            );

            if (!confirmFinish) {
                this.startTimer(); // Resume timer if cancelled
                return;
            }
        }

        try {
            const results = await this.submitExamAnswers();
            this.displayResults(results);
        } catch (error) {
            console.error('Error finishing exam:', error);
            this.showAlert('Error al finalizar el examen', 'danger');
        }
    }

    async submitExamAnswers() {
        // Submit all user answers to the backend
        const answersData = [];

        for (const [questionId, answer] of Object.entries(this.userAnswers)) {
            answersData.push({
                question_id: questionId,
                selected_answer: answer
            });
        }

        try {
            const response = await fetch(`${this.API_BASE}/exams/${this.currentExam.exam_id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({ answers: answersData })
            });

            if (response.ok) {
                const results = await response.json();
                this.examResults = results;
                return results;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error enviando respuestas');
            }
        } catch (error) {
            console.error('Error submitting answers:', error);
            throw error;
        }
    }

    calculateAndShowResults() {
        let correctAnswers = 0;
        let totalAnswered = 0;
        const utResults = {};

        // Initialize UT counters
        for (let i = 1; i <= 11; i++) {
            utResults[i] = { correct: 0, total: 0, errors: 0 };
        }

        // Calculate results
        this.currentExam.questionDetails.forEach(question => {
            const userAnswer = this.userAnswers[question.question_id];
            const utNumber = question.ut_number;

            utResults[utNumber].total++;

            if (userAnswer) {
                totalAnswered++;
                const isCorrect = userAnswer === question.respuesta_correcta;

                if (isCorrect) {
                    correctAnswers++;
                    utResults[utNumber].correct++;
                } else {
                    utResults[utNumber].errors++;
                }
            }
        });

        // Calculate percentage and pass/fail
        const percentage = totalAnswered > 0 ? (correctAnswers / totalAnswered * 100) : 0;
        const passed = this.checkIfPassed(percentage, utResults);

        // Display results
        this.displayResults({
            correctAnswers,
            totalAnswered,
            totalQuestions: this.currentExam.questions.length,
            percentage,
            passed,
            utResults
        });
    }

    checkIfPassed(percentage, utResults) {
        // PER passing criteria:
        // 1. Overall score >= 65%
        // 2. Critical UTs with error limits:
        //    - UT5 (Balizamiento): max 2 errors
        //    - UT6 (RIPA): max 5 errors
        //    - UT11 (Carta navegación): max 2 errors

        if (percentage < 65) return false;

        const criticalUTs = {
            5: 2,  // Balizamiento - max 2 errors
            6: 5,  // RIPA - max 5 errors
            11: 2  // Carta navegación - max 2 errors
        };

        for (const [utNumber, maxErrors] of Object.entries(criticalUTs)) {
            if (utResults[utNumber].errors > maxErrors) {
                return false;
            }
        }

        return true;
    }

    displayResults(results) {
        const summaryContainer = document.getElementById('examSummary');

        const passedClass = results.passed ? 'success' : 'fail';
        const passedIcon = results.passed ? 'fa-check-circle' : 'fa-times-circle';
        const passedText = results.passed ? '¡APROBADO!' : 'NO APROBADO';
        const passedColor = results.passed ? '#10b981' : '#ef4444';

        summaryContainer.innerHTML = `
            <div class="summary-icon ${passedClass}">
                <i class="fas ${passedIcon}"></i>
            </div>
            <div class="summary-title" style="color: ${passedColor}">
                ${passedText}
            </div>
            <div class="summary-score" style="color: ${passedColor}">
                ${Math.round(results.score_percentage)}%
            </div>
            <div class="summary-details">
                <p><strong>${results.correct_answers}</strong> respuestas correctas de <strong>${results.total_questions}</strong> preguntas</p>
                <p>Duración del examen: <strong>${results.duration_minutes}</strong> minutos</p>
            </div>

            <div class="mt-4">
                <h5>Resultados por Unidad Temática</h5>
                <div class="row">
                    ${this.generateUTResultsHTML(results.ut_results)}
                </div>
            </div>

            <div class="mt-4">
                <button class="btn btn-primary me-2" onclick="examSystem.showDashboard()">
                    <i class="fas fa-home me-1"></i>Volver al Inicio
                </button>
                <button class="btn btn-secondary" onclick="examSystem.startNewExam()">
                    <i class="fas fa-redo me-1"></i>Nuevo Examen
                </button>
            </div>
        `;

        this.showResults();
    }

    generateUTResultsHTML(utResults) {
        const utNames = {
            1: 'Nomenclatura náutica',
            2: 'Elementos de amarre y fondeo',
            3: 'Seguridad',
            4: 'Legislación',
            5: 'Balizamiento',
            6: 'Reglamento RIPA',
            7: 'Maniobra',
            8: 'Emergencias en la mar',
            9: 'Meteorología',
            10: 'Teoría de la navegación',
            11: 'Carta de navegación'
        };

        let html = '';
        for (let i = 1; i <= 11; i++) {
            const ut = utResults[i];
            const percentage = ut.total > 0 ? Math.round((ut.correct / ut.total) * 100) : 0;

            html += `
                <div class="col-md-6 mb-2">
                    <div class="d-flex justify-content-between align-items-center p-2 border rounded">
                        <span class="fw-bold">UT${i}</span>
                        <span class="small text-muted">${utNames[i]}</span>
                        <span class="badge ${percentage >= 65 ? 'bg-success' : 'bg-danger'}">
                            ${ut.correct}/${ut.total} (${percentage}%)
                        </span>
                    </div>
                </div>
            `;
        }
        return html;
    }

    generateViewerUrl(question) {
        // Construir URL del visor con solo el ID de la pregunta
        const baseUrl = 'visor-nueva-arquitectura.html';
        const params = new URLSearchParams();

        // Solo buscar por ID específico de la pregunta
        if (question.question_id) {
            params.append('search', question.question_id);
        }

        // Agregar parámetro especial para indicar que viene del sistema de exámenes
        params.append('from_exam', 'true');

        return `${baseUrl}?${params.toString()}`;
    }

    updateViewerLink(question) {
        // Actualizar enlace discreto en la zona de navegación
        const viewerUrl = this.generateViewerUrl(question);
        let viewerLinkElement = document.getElementById('viewerLink');

        if (!viewerLinkElement) {
            // Crear el enlace si no existe
            const navButtons = document.querySelector('.nav-buttons');
            viewerLinkElement = document.createElement('a');
            viewerLinkElement.id = 'viewerLink';
            viewerLinkElement.className = 'btn btn-outline-secondary btn-sm';
            viewerLinkElement.target = '_blank';
            viewerLinkElement.innerHTML = '<i class="fas fa-external-link-alt me-1"></i>Ver pregunta';
            navButtons.parentNode.insertBefore(viewerLinkElement, navButtons);
        }

        viewerLinkElement.href = viewerUrl;
    }

    // Utility Methods
    async showPERStats() {
        try {
            this.showAlert('Cargando estadísticas de preguntas PER...', 'info');

            const response = await fetch(`${this.API_BASE}/per-questions/stats`);

            if (response.ok) {
                const data = await response.json();
                this.displayPERStats(data);
            } else {
                this.showAlert('Error cargando estadísticas', 'danger');
            }
        } catch (error) {
            console.error('Error loading PER stats:', error);
            this.showAlert('Error de conexión', 'danger');
        }
    }

    displayPERStats(data) {
        const summaryContainer = document.getElementById('examSummary');

        let statsHTML = `
            <div class="text-center mb-4">
                <h3><i class="fas fa-chart-bar me-2"></i>Estadísticas de Preguntas PER</h3>
                <p class="text-muted">Base de datos con <strong>${data.total_per_questions}</strong> preguntas de exámenes PER oficiales</p>
            </div>

            <div class="row">
        `;

        data.per_questions_stats.forEach((stat, index) => {
            const utConfig = data.ut_configuration.find(ut => ut.category_name === stat.categoria);
            const utNumber = utConfig ? utConfig.ut_number : '?';
            const questionsNeeded = utConfig ? utConfig.questions_per_exam : 0;

            const coveragePercentage = questionsNeeded > 0 ? Math.round((stat.preguntas_validas / questionsNeeded) * 100) : 0;
            const coverageColor = coveragePercentage >= 1000 ? 'success' : coveragePercentage >= 500 ? 'warning' : 'danger';

            statsHTML += `
                <div class="col-md-6 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="card-title">
                                <span class="badge bg-primary me-2">UT${utNumber}</span>
                                ${stat.categoria}
                            </h6>
                            <div class="small text-muted mb-2">
                                Necesarias por examen: <strong>${questionsNeeded}</strong>
                            </div>
                            <div class="row text-center">
                                <div class="col-4">
                                    <div class="fw-bold text-primary">${stat.total_preguntas}</div>
                                    <div class="small text-muted">Total</div>
                                </div>
                                <div class="col-4">
                                    <div class="fw-bold text-success">${stat.per_normal}</div>
                                    <div class="small text-muted">Normal</div>
                                </div>
                                <div class="col-4">
                                    <div class="fw-bold text-info">${stat.per_liberado}</div>
                                    <div class="small text-muted">Liberado</div>
                                </div>
                            </div>
                            <div class="mt-2">
                                <span class="badge bg-${coverageColor}">
                                    ${Math.round(stat.preguntas_validas / questionsNeeded)}x cobertura
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        statsHTML += `
            </div>

            <div class="mt-4 text-center">
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>¡Excelente cobertura!</strong> Todas las UT tienen suficientes preguntas para generar múltiples exámenes únicos.
                </div>

                <button class="btn btn-primary" onclick="examSystem.showDashboard()">
                    <i class="fas fa-arrow-left me-1"></i>Volver al Dashboard
                </button>
            </div>
        `;

        summaryContainer.innerHTML = statsHTML;
        this.showResults();
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert_' + Date.now();

        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} mt-3" role="alert">
                ${message}
            </div>
        `;

        alertContainer.innerHTML = alertHTML;

        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                alertElement.remove();
            }
        }, 5000);
    }
}

// Initialize the exam system when the page loads
let examSystem;

document.addEventListener('DOMContentLoaded', () => {
    examSystem = new ExamSystem();
});

// Export for global access
window.examSystem = examSystem;
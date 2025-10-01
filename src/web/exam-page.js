/**
 * Sistema de Exámenes PER - Página de Examen
 * Gestiona la lógica específica de la página de examen
 */

class ExamPage {
    constructor() {
        // Usar configuración de entorno automática
        this.API_BASE = window.API_BASE || '/api';
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
        this.currentExam = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.examTimer = null;
        this.timeRemaining = 90 * 60; // 90 minutos en segundos
        this.questionStartTimes = {}; // Para rastrear tiempo por pregunta
        this.examStartTime = null;

        this.init();
    }

    init() {
        this.checkAuthStatus();
    }

    async checkAuthStatus() {
        if (!this.authToken) {
            console.error('❌ No auth token found');
            this.showAlert('Debes iniciar sesión para realizar un examen', 'danger');
            setTimeout(() => {
                window.location.href = 'exam-system.html';
            }, 2000);
            return;
        }

        console.log('🔍 Checking auth status with token:', this.authToken.substring(0, 20) + '...');

        try {
            const response = await fetch(`${this.API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Auth response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ User authenticated:', data);
                this.currentUser = data.user || data;
                this.startNewExam();
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Error de autenticación' }));
                console.error('❌ Auth error:', errorData);
                this.showAlert(`Error de autenticación: ${errorData.error || 'Token inválido'}`, 'danger');
                setTimeout(() => {
                    window.location.href = 'exam-system.html';
                }, 3000);
            }
        } catch (error) {
            console.error('❌ Auth check error:', error);
            this.showAlert(`Error de conexión: ${error.message}`, 'danger');
            setTimeout(() => {
                window.location.href = 'exam-system.html';
            }, 3000);
        }
    }

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
                this.examStartTime = new Date(); // Track exam start time for statistics

                // Las preguntas vienen como metadatos, necesitamos cargar los detalles
                console.log('🔍 Preguntas del examen (metadatos):', data.questions);
                console.log('🔍 Exam ID para cargar detalles:', data.exam_id);
                this.currentExam.questionDetails = data.questions || [];
                this.currentExam.exam_id = data.exam_id;
                
                // Cargar los detalles completos de las preguntas usando el exam_id
                await this.loadQuestionDetails();

                this.showExamInterface();
                this.startTimer();
                this.displayCurrentQuestion();
                this.showAlert('¡Examen iniciado! Tienes 90 minutos.', 'success');
            } else {
                this.showAlert(data.error || 'Error generando examen', 'danger');
                setTimeout(() => {
                    window.location.href = 'exam-system.html';
                }, 3000);
            }
        } catch (error) {
            console.error('Error starting exam:', error);
            this.showAlert('Error de conexión', 'danger');
            setTimeout(() => {
                window.location.href = 'exam-system.html';
            }, 3000);
        }
    }

    async loadQuestionDetails() {
        try {
            console.log('🔍 Cargando detalles completos de las preguntas para examen:', this.currentExam.exam_id);
            
            // Usar el endpoint específico para obtener todas las preguntas de un examen
            const response = await fetch(`${this.API_BASE}/exams/${this.currentExam.exam_id}/questions`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const responseData = await response.json();
                console.log('✅ Preguntas del examen cargadas:', responseData);
                
                if (responseData.questions && Array.isArray(responseData.questions)) {
                    this.currentExam.questionDetails = responseData.questions;
                    console.log('✅ Todas las preguntas cargadas con detalles completos:', this.currentExam.questionDetails.length);
                } else {
                    console.error('❌ Formato de respuesta incorrecto:', responseData);
                    throw new Error('Formato de respuesta incorrecto del servidor');
                }
            } else {
                console.error('❌ Error cargando preguntas del examen:', response.status);
                throw new Error(`Error cargando preguntas del examen: ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ Error cargando detalles de preguntas:', error);
            this.showAlert('Error cargando preguntas del examen', 'danger');
            setTimeout(() => {
                window.location.href = 'exam-system.html';
            }, 3000);
        }
    }

    showExamInterface() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('examInterface').style.display = 'block';
    }

    startTimer() {
        this.examTimer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.finishExam();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timerElement = document.getElementById('timerDisplay');
        if (timerElement) {
            timerElement.textContent = display;
        }

        // Cambiar color cuando quedan menos de 10 minutos
        const timerContainer = document.getElementById('examTimer');
        if (this.timeRemaining < 600) { // 10 minutos
            timerContainer.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        }
        if (this.timeRemaining < 300) { // 5 minutos
            timerContainer.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        }
    }

    displayCurrentQuestion() {
        if (!this.currentExam || !this.currentExam.questionDetails) {
            console.error('No exam data available');
            return;
        }

        const question = this.currentExam.questionDetails[this.currentQuestionIndex];
        if (!question) {
            console.error('No question data available');
            return;
        }

        // Record question start time
        this.questionStartTimes[this.currentQuestionIndex] = new Date();

        // Update question number and progress
        document.getElementById('questionNumber').textContent = this.currentQuestionIndex + 1;
        document.getElementById('questionText').textContent = question.texto_pregunta;

        // Update progress
        const progress = ((this.currentQuestionIndex + 1) / this.currentExam.total_questions) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `Pregunta ${this.currentQuestionIndex + 1} de ${this.currentExam.total_questions}`;

        // Update navigation buttons
        document.getElementById('prevBtn').disabled = this.currentQuestionIndex === 0;
        
        // Show finish button on last question
        if (this.currentQuestionIndex === this.currentExam.total_questions - 1) {
            document.getElementById('finishBtn').style.display = 'inline-flex';
            document.getElementById('nextBtn').style.display = 'none';
        } else {
            document.getElementById('finishBtn').style.display = 'none';
            document.getElementById('nextBtn').style.display = 'inline-flex';
        }

        // Display answer options
        this.displayAnswerOptions(question);
    }

    displayAnswerOptions(question) {
        const optionsContainer = document.getElementById('answerOptions');
        optionsContainer.innerHTML = '';

        console.log('🔍 Estructura de la pregunta actual:', question);
        console.log('🔍 Propiedades disponibles:', Object.keys(question));

        const options = [
            { letter: 'A', text: question.opcion_a || 'Opción A no disponible' },
            { letter: 'B', text: question.opcion_b || 'Opción B no disponible' },
            { letter: 'C', text: question.opcion_c || 'Opción C no disponible' },
            { letter: 'D', text: question.opcion_d || 'Opción D no disponible' }
        ];

        options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'answer-option';
            optionElement.onclick = () => this.selectAnswer(option.letter);

            // Check if this answer is already selected
            const isSelected = this.userAnswers[this.currentQuestionIndex] === option.letter;
            if (isSelected) {
                optionElement.classList.add('selected');
            }

            optionElement.innerHTML = `
                <div class="answer-letter">${option.letter}</div>
                <div class="answer-text">${option.text}</div>
            `;

            optionsContainer.appendChild(optionElement);
        });
    }

    selectAnswer(letter) {
        this.userAnswers[this.currentQuestionIndex] = letter;
        
        // Update visual selection
        const options = document.querySelectorAll('.answer-option');
        options.forEach(option => {
            option.classList.remove('selected');
        });
        
        // Find and select the clicked option
        const optionsArray = Array.from(options);
        const selectedIndex = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        if (optionsArray[selectedIndex]) {
            optionsArray[selectedIndex].classList.add('selected');
        }
    }

    goToNextQuestion() {
        if (this.currentQuestionIndex < this.currentExam.total_questions - 1) {
            this.currentQuestionIndex++;
            this.displayCurrentQuestion();
        }
    }

    goToPreviousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayCurrentQuestion();
        }
    }

    pauseExam() {
        if (confirm('¿Estás seguro de que quieres pausar el examen? Se guardará tu progreso actual.')) {
            clearInterval(this.examTimer);
            this.showAlert('Examen pausado. Tu progreso se ha guardado.', 'info');
            setTimeout(() => {
                window.location.href = 'exam-system.html';
            }, 2000);
        }
    }

    async finishExam() {
        if (confirm('¿Estás seguro de que quieres finalizar el examen? No podrás volver a editarlo.')) {
            clearInterval(this.examTimer);
            
            try {
                this.showAlert('Finalizando examen...', 'info');

                // Calculate results
                const results = this.calculateResults();
                
                // Save exam results
                await this.saveExamResults(results);

                // Show results
                this.showResults(results);

            } catch (error) {
                console.error('Error finishing exam:', error);
                this.showAlert('Error finalizando examen', 'danger');
            }
        }
    }

    calculateResults() {
        const totalQuestions = this.currentExam.total_questions;
        let correctAnswers = 0;
        let incorrectAnswers = 0;
        let unanswered = 0;

        const questionResults = [];

        for (let i = 0; i < totalQuestions; i++) {
            const question = this.currentExam.questionDetails[i];
            const userAnswer = this.userAnswers[i];
            const correctAnswer = question.respuesta_correcta;
            
            let isCorrect = false;
            if (userAnswer === correctAnswer) {
                isCorrect = true;
                correctAnswers++;
            } else if (userAnswer) {
                incorrectAnswers++;
            } else {
                unanswered++;
            }

            questionResults.push({
                question_id: question.id,
                user_answer: userAnswer,
                correct_answer: correctAnswer,
                is_correct: isCorrect,
                question_text: question.texto_pregunta,
                category: question.categoria
            });
        }

        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        const examDuration = Math.floor((new Date() - this.examStartTime) / 1000 / 60); // minutes

        return {
            exam_id: this.currentExam.exam_id,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            incorrect_answers: incorrectAnswers,
            unanswered: unanswered,
            percentage: percentage,
            duration_minutes: examDuration,
            question_results: questionResults,
            passed: percentage >= 70 // 70% to pass
        };
    }

    async saveExamResults(results) {
        const response = await fetch(`${this.API_BASE}/exams/${this.currentExam.exam_id}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
            },
            body: JSON.stringify({
                answers: this.userAnswers,
                duration_minutes: results.duration_minutes
            })
        });

        if (!response.ok) {
            throw new Error('Error guardando resultados del examen');
        }

        return response.json();
    }

    showResults(results) {
        document.getElementById('examInterface').style.display = 'none';
        
        const resultsHtml = `
            <div style="text-align: center; padding: 2rem;">
                <h2 style="color: ${results.passed ? '#10b981' : '#ef4444'}; margin-bottom: 1rem;">
                    <i class="fas fa-${results.passed ? 'check-circle' : 'times-circle'}"></i>
                    ${results.passed ? '¡Examen Aprobado!' : 'Examen No Aprobado'}
                </h2>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0;">
                    <div style="background: #f8f9ff; padding: 1.5rem; border-radius: 12px; border: 2px solid rgba(102, 126, 234, 0.1);">
                        <h3 style="color: #667eea; margin: 0 0 0.5rem 0;">${results.correct_answers}</h3>
                        <p style="margin: 0; color: #6b7280;">Correctas</p>
                    </div>
                    <div style="background: #fef2f2; padding: 1.5rem; border-radius: 12px; border: 2px solid rgba(239, 68, 68, 0.1);">
                        <h3 style="color: #ef4444; margin: 0 0 0.5rem 0;">${results.incorrect_answers}</h3>
                        <p style="margin: 0; color: #6b7280;">Incorrectas</p>
                    </div>
                    <div style="background: #f3f4f6; padding: 1.5rem; border-radius: 12px; border: 2px solid rgba(107, 114, 128, 0.1);">
                        <h3 style="color: #6b7280; margin: 0 0 0.5rem 0;">${results.unanswered}</h3>
                        <p style="margin: 0; color: #6b7280;">Sin responder</p>
                    </div>
                    <div style="background: ${results.passed ? '#f0fdf4' : '#fef2f2'}; padding: 1.5rem; border-radius: 12px; border: 2px solid ${results.passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};">
                        <h3 style="color: ${results.passed ? '#10b981' : '#ef4444'}; margin: 0 0 0.5rem 0;">${results.percentage}%</h3>
                        <p style="margin: 0; color: #6b7280;">Porcentaje</p>
                    </div>
                </div>
                
                <div style="margin: 2rem 0;">
                    <p style="color: #6b7280; margin-bottom: 1rem;">Duración del examen: ${results.duration_minutes} minutos</p>
                    <p style="color: #6b7280;">Preguntas totales: ${results.total_questions}</p>
                </div>
                
                <div style="margin-top: 2rem;">
                    <button class="unified-btn-primary" onclick="window.location.href='exam-system.html'">
                        <i class="fas fa-home"></i> Volver al Inicio
                    </button>
                    <button class="unified-btn-secondary" onclick="window.location.href='exam.html'">
                        <i class="fas fa-redo"></i> Nuevo Examen
                    </button>
                </div>
            </div>
        `;

        document.getElementById('resultsInterface').innerHTML = resultsHtml;
        document.getElementById('resultsInterface').style.display = 'block';
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();
        
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type}" role="alert">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
                ${message}
            </div>
        `;
        
        alertContainer.innerHTML = alertHtml;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                alertElement.remove();
            }
        }, 5000);
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    window.examPage = new ExamPage();
});

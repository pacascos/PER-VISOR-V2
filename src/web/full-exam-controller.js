/**
 * FullExamController - Controller for Complete PER Exams (45 questions)
 *
 * Extends ExamController to provide specific functionality for full exams.
 * Replaces the logic from exam-page.js with cleaner, more maintainable code.
 */

class FullExamController extends ExamController {
    constructor(options = {}) {
        super({
            ...options,
            examType: 'full'
        });

        this.examApi = new ExamAPI({
            authToken: this.authToken,
            onAuthError: () => this.handleAuthError()
        });

        console.log('📝 FullExamController initialized');
    }

    /**
     * Initialize the controller
     */
    async init() {
        // Check authentication
        const authenticated = await this.checkAuth();
        if (!authenticated) return;

        // Generate and load exam
        await this.generateExam();
    }

    /**
     * Check authentication status
     */
    async checkAuth() {
        if (!this.authToken) {
            this.showAlert('Debes iniciar sesión para realizar un examen', 'danger');
            setTimeout(() => {
                window.location.href = 'exam-system.html';
            }, 2000);
            return false;
        }

        try {
            const userData = await this.examApi.getCurrentUser();
            this.currentUser = userData.user || userData;
            console.log('✅ User authenticated:', this.currentUser.username);
            return true;
        } catch (error) {
            console.error('❌ Auth check failed:', error);
            this.showAlert('Error de autenticación. Redirigiendo...', 'danger');
            setTimeout(() => {
                window.location.href = 'exam-system.html';
            }, 2000);
            return false;
        }
    }

    /**
     * Handle authentication errors
     */
    handleAuthError() {
        this.showAlert('Sesión expirada. Por favor, inicia sesión nuevamente.', 'warning');
        setTimeout(() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('token');
            window.location.href = 'exam-system.html';
        }, 2000);
    }

    /**
     * Generate new full exam
     */
    async generateExam() {
        try {
            this.showAlert('Generando examen...', 'info');

            // Generate exam
            const examData = await this.examApi.generateFullExam();
            console.log('📝 Exam generated:', examData);

            // Load question details
            const questionData = await this.examApi.getExamQuestions(examData.exam_id);
            console.log('📚 Questions loaded:', questionData.questions.length);

            // Set up exam state
            this.currentExam = {
                exam_id: examData.exam_id,
                total_questions: examData.total_questions || 45,
                questions: questionData.questions,
                questionDetails: questionData.questions // Alias for compatibility
            };

            this.currentQuestionIndex = 0;
            this.userAnswers = {};
            this.questionStartTimes = {};
            this.timeRemaining = 90 * 60;
            this.examStartTime = new Date();

            // Show exam interface
            this.showExamInterface();
            this.startTimer();
            this.startQuestionTimer();
            this.displayCurrentQuestion();

            this.showAlert('¡Examen iniciado! Buena suerte 🍀', 'success');

        } catch (error) {
            console.error('❌ Error generating exam:', error);
            this.showAlert('Error al generar el examen. Intenta de nuevo.', 'danger');
        }
    }

    /**
     * Show exam interface
     */
    showExamInterface() {
        const loadingSection = document.getElementById('loading-section');
        const examSection = document.getElementById('exam-section');

        if (loadingSection) loadingSection.style.display = 'none';
        if (examSection) {
            examSection.classList.remove('hidden');
            examSection.style.display = 'block';
        }
    }

    /**
     * Display current question (override parent to add UI rendering)
     */
    displayCurrentQuestion() {
        const question = this.getCurrentQuestion();
        if (!question) return;

        // Update question number and category
        const questionNumber = document.getElementById('question-number');
        const questionCategory = document.getElementById('question-category');
        const questionText = document.getElementById('question-text');
        const answersContainer = document.getElementById('answers-container');

        if (questionNumber) {
            questionNumber.textContent = `Pregunta ${this.currentQuestionIndex + 1} de ${this.currentExam.questions.length}`;
        }

        if (questionCategory) {
            questionCategory.textContent = `UT ${question.ut_number || ''} - ${question.ut_category || question.categoria || ''}`;
        }

        if (questionText) {
            questionText.textContent = question.texto_pregunta;
        }

        // Render answer options
        if (answersContainer) {
            const options = ['A', 'B', 'C', 'D'];
            answersContainer.innerHTML = options.map(option => {
                const optionText = question[`opcion_${option.toLowerCase()}`] || '';
                const isSelected = this.userAnswers[question.question_id] === option;

                return `
                    <div class="answer-option ${isSelected ? 'selected' : ''}" data-answer="${option}">
                        <input
                            type="radio"
                            name="answer"
                            id="answer-${option}"
                            value="${option}"
                            ${isSelected ? 'checked' : ''}
                        >
                        <label for="answer-${option}" class="answer-label">
                            <span class="answer-letter">${option}</span>
                            ${optionText}
                        </label>
                    </div>
                `;
            }).join('');

            // Add event listeners to answer options
            answersContainer.querySelectorAll('.answer-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    const answer = option.dataset.answer;
                    this.selectAnswer(answer);

                    // Update UI
                    answersContainer.querySelectorAll('.answer-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    option.classList.add('selected');

                    // Check the radio
                    option.querySelector('input').checked = true;
                });
            });
        }

        // Update progress and navigation
        super.displayCurrentQuestion();
    }

    /**
     * Update navigation buttons (override parent)
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const finishBtn = document.getElementById('finish-btn');

        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }

        const isLastQuestion = this.currentQuestionIndex === this.currentExam.questions.length - 1;

        if (nextBtn) {
            nextBtn.style.display = isLastQuestion ? 'none' : 'inline-flex';
        }

        if (finishBtn) {
            finishBtn.style.display = isLastQuestion ? 'inline-flex' : 'none';
        }
    }

    /**
     * Submit exam (override parent)
     */
    async submitExam() {
        // Check if all questions are answered
        const unanswered = this.getUnansweredQuestions();

        if (unanswered.length > 0) {
            const confirmed = confirm(
                `Tienes ${unanswered.length} pregunta(s) sin responder.\n\n` +
                `¿Estás seguro de que quieres enviar el examen de todas formas?`
            );

            if (!confirmed) return;
        } else {
            const confirmed = confirm('¿Estás seguro de que quieres enviar el examen?');
            if (!confirmed) return;
        }

        try {
            this.stopTimer();
            this.showAlert('Enviando examen...', 'info');

            // Submit exam
            const results = await this.examApi.submitExam(this.currentExam.exam_id);
            console.log('✅ Exam submitted:', results);

            // Store results for results page
            sessionStorage.setItem('examResults', JSON.stringify(results));

            // Redirect to results page
            window.location.href = `exam-results.html?exam_id=${this.currentExam.exam_id}`;

        } catch (error) {
            console.error('❌ Error submitting exam:', error);
            this.showAlert('Error al enviar el examen. Intenta de nuevo.', 'danger');
            this.startTimer(); // Restart timer on error
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const finishBtn = document.getElementById('finish-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.goToPreviousQuestion());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToNextQuestion());
        }

        if (finishBtn) {
            finishBtn.addEventListener('click', () => this.submitExam());
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && this.currentQuestionIndex > 0) {
                this.goToPreviousQuestion();
            } else if (e.key === 'ArrowRight' && this.currentQuestionIndex < this.currentExam.questions.length - 1) {
                this.goToNextQuestion();
            } else if (e.key >= '1' && e.key <= '4') {
                const answers = ['A', 'B', 'C', 'D'];
                const answer = answers[parseInt(e.key) - 1];
                this.selectAnswer(answer);
                document.getElementById(`answer-${answer}`)?.click();
            }
        });

        console.log('✅ Event listeners set up');
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        this.initializeElements({
            progressBar: 'progress-bar',
            progressText: 'progress-text',
            timerElement: 'timer-value',
            questionContainer: 'question-section',
            navigationContainer: 'navigation-section'
        });

        this.setupEventListeners();
    }
}

// Auto-initialize when DOM is ready (only if NOT study mode)
document.addEventListener('DOMContentLoaded', async () => {
    // Check if this is study mode
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');

    // Only auto-initialize for full exams (default)
    if (type === 'study') {
        console.log('📚 Study mode detected, skipping FullExamController auto-init');
        return;
    }

    console.log('🚀 Initializing FullExamController...');

    const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');

    const controller = new FullExamController({ authToken });
    controller.initializeUI();
    await controller.init();

    // Make available globally for debugging
    window.fullExamController = controller;
});

console.log('📝 FullExamController class loaded');

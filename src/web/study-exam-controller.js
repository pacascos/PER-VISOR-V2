/**
 * StudyExamController - Controller for Study Mode Tests
 *
 * Extends ExamController to provide specific functionality for study mode.
 * Handles tests with selected UTs and different selection modes (random, failed, new).
 */

class StudyExamController extends ExamController {
    constructor(options = {}) {
        super({
            ...options,
            examType: 'study'
        });

        this.studyTestId = options.studyTestId || null;
        this.selectedUTs = options.selectedUTs || [];
        this.selectionMode = options.selectionMode || 'random';

        this.examApi = new ExamAPI({
            authToken: this.authToken,
            onAuthError: () => this.handleAuthError()
        });

        console.log('📚 StudyExamController initialized', {
            studyTestId: this.studyTestId,
            selectedUTs: this.selectedUTs,
            selectionMode: this.selectionMode
        });
    }

    /**
     * Initialize from URL parameters
     */
    static async initFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const studyTestId = urlParams.get('study_test_id');
        const type = urlParams.get('type');

        if (type !== 'study' || !studyTestId) {
            console.error('❌ Invalid study mode parameters');
            return null;
        }

        const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');

        const controller = new StudyExamController({
            authToken,
            studyTestId
        });

        await controller.init();
        return controller;
    }

    /**
     * Initialize the controller
     */
    async init() {
        // Check authentication
        const authenticated = await this.checkAuth();
        if (!authenticated) return;

        // Load existing study test
        await this.loadStudyTest();
    }

    /**
     * Check authentication status
     */
    async checkAuth() {
        if (!this.authToken) {
            this.showAlert('Debes iniciar sesión para realizar un test de estudio', 'danger');
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
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            window.location.href = 'exam-system.html';
        }, 2000);
    }

    /**
     * Load existing study test
     */
    async loadStudyTest() {
        try {
            this.showAlert('Cargando test de estudio...', 'info');

            // Load study test questions
            const data = await this.examApi.getStudyTestQuestions(this.studyTestId);
            console.log('📚 Study test loaded:', data);

            // Store metadata
            this.selectedUTs = data.selected_uts || [];
            this.selectionMode = data.selection_mode || 'random';

            // Transform questions to unified format
            const questionDetails = this.transformQuestionsFormat(data.questions);

            // Set up exam state
            this.currentExam = {
                exam_id: this.studyTestId,
                total_questions: data.total_questions || questionDetails.length,
                isStudyMode: true,
                studyTestId: this.studyTestId,
                selectedUTs: this.selectedUTs,
                selectionMode: this.selectionMode,
                questions: questionDetails,
                questionDetails: questionDetails // Alias
            };

            this.currentQuestionIndex = 0;
            this.userAnswers = {};
            this.questionStartTimes = {};
            this.timeRemaining = 90 * 60; // 90 minutes (same as full exam)
            this.examStartTime = new Date();

            // Show exam interface
            this.showExamInterface();
            this.showStudyModeBadge();
            this.startTimer();
            this.startQuestionTimer();
            this.displayCurrentQuestion();

            const modeNames = {
                random: 'Aleatorio',
                failed: 'Falladas',
                new: 'Nuevas'
            };
            this.showAlert(`Test de estudio iniciado: ${modeNames[this.selectionMode]} 📚`, 'success');

        } catch (error) {
            console.error('❌ Error loading study test:', error);
            this.showAlert('Error al cargar el test de estudio', 'danger');
            setTimeout(() => {
                window.location.href = 'study-config.html';
            }, 2000);
        }
    }

    /**
     * Transform study test questions to unified format
     */
    transformQuestionsFormat(questions) {
        return questions.map(q => ({
            question_id: q.id,
            order: q.order,
            ut_number: q.ut_number,
            ut_category: q.ut_category,
            texto_pregunta: q.texto_pregunta,
            respuesta_correcta: q.correct_answer || '',
            categoria: q.categoria,
            numero_pregunta: q.numero_pregunta,
            opcion_a: q.opciones?.A || q.opciones?.a || '',
            opcion_b: q.opciones?.B || q.opciones?.b || '',
            opcion_c: q.opciones?.C || q.opciones?.c || '',
            opcion_d: q.opciones?.D || q.opciones?.d || '',
            exam_info: q.exam_info
        }));
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
     * Show study mode badge
     */
    showStudyModeBadge() {
        // Remove any existing badge
        const existingBadge = document.getElementById('study-mode-badge');
        if (existingBadge) existingBadge.remove();

        // Create study mode badge
        const badge = document.createElement('div');
        badge.id = 'study-mode-badge';
        badge.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            z-index: 9998;
            box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        const modeIcons = {
            random: '🎲',
            failed: '❌',
            new: '✨'
        };

        const modeNames = {
            random: 'Aleatorio',
            failed: 'Falladas',
            new: 'Nuevas'
        };

        badge.innerHTML = `
            <i class="fas fa-book-reader"></i>
            <span>${modeIcons[this.selectionMode]} ${modeNames[this.selectionMode]}</span>
            <span style="opacity: 0.8; font-size: 0.75rem;">UTs: ${this.selectedUTs.join(', ')}</span>
        `;

        document.body.appendChild(badge);

        // Add back button
        this.addBackButton();
    }

    /**
     * Add back button to return to study config
     * REMOVED: Botón de volver eliminado por solicitud del usuario
     */
    addBackButton() {
        // Botón de volver eliminado - ya no se muestra
        // El usuario puede usar el botón "Cancelar Examen" en su lugar
    }

    /**
     * Display current question (override parent to add UI rendering)
     */
    displayCurrentQuestion() {
        const question = this.getCurrentQuestion();
        if (!question) return;

        // Start tracking statistics for this question
        if (window.questionStatsTracker) {
            window.questionStatsTracker.startQuestionTracking(question.question_id, {
                categoria: question.ut_category || question.categoria,
                respuesta_correcta: question.correct_answer || question.respuesta_correcta
            });
        }

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
                        <span class="answer-letter">${option}</span>
                        <span class="answer-text">${optionText}</span>
                    </div>
                `;
            }).join('');

            // Add event listeners to answer options
            answersContainer.querySelectorAll('.answer-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    const answer = option.dataset.answer;
                    this.selectAnswer(answer);

                    // Update UI immediately
                    answersContainer.querySelectorAll('.answer-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    option.classList.add('selected');

                    // NOTE: Answer is NOT sent to backend yet
                    // It will be sent when user navigates to another question or submits
                });
            });
        }

        // Update progress and navigation
        super.displayCurrentQuestion();
    }

    /**
     * Go to specific question (override to save answer before changing)
     */
    async goToQuestion(index) {
        // Save current question's answer before changing
        const currentQuestion = this.getCurrentQuestion();
        if (currentQuestion && this.userAnswers[currentQuestion.question_id]) {
            await this.recordAnswer(currentQuestion.question_id, this.userAnswers[currentQuestion.question_id]);
        }

        // Call parent method to change question
        super.goToQuestion(index);
    }

    /**
     * Go to next question (override to save answer before changing)
     */
    async goToNextQuestion() {
        // Save current question's answer before changing
        const currentQuestion = this.getCurrentQuestion();
        if (currentQuestion && this.userAnswers[currentQuestion.question_id]) {
            await this.recordAnswer(currentQuestion.question_id, this.userAnswers[currentQuestion.question_id]);
        }

        // Call parent method
        super.goToNextQuestion();
    }

    /**
     * Go to previous question (override to save answer before changing)
     */
    async goToPreviousQuestion() {
        // Save current question's answer before changing
        const currentQuestion = this.getCurrentQuestion();
        if (currentQuestion && this.userAnswers[currentQuestion.question_id]) {
            await this.recordAnswer(currentQuestion.question_id, this.userAnswers[currentQuestion.question_id]);
        }

        // Call parent method
        super.goToPreviousQuestion();
    }

    /**
     * Record answer to backend
     */
    async recordAnswer(questionId, userAnswer) {
        try {
            const timeSpent = this.getQuestionTimeSpent(questionId);
            const question = this.getCurrentQuestion();

            console.log('📝 Recording study answer:', {
                studyTestId: this.studyTestId,
                questionId,
                userAnswer,
                timeSpent
            });

            // Record to study test backend
            await this.examApi.recordStudyAnswer(
                this.studyTestId,
                questionId,
                userAnswer,
                timeSpent
            );

            // ALSO record using question stats tracker for consistency
            if (window.questionStatsTracker && question) {
                const correctAnswer = question.correct_answer || question.respuesta_correcta;
                const isCorrect = userAnswer.toUpperCase() === correctAnswer.toUpperCase();
                
                window.questionStatsTracker.recordAnswerAttempt(
                    questionId,
                    userAnswer,
                    isCorrect,
                    timeSpent
                );
            }

            console.log('✅ Answer recorded');
        } catch (error) {
            console.error('❌ Error recording answer:', error);
            // Don't block user, just log the error
        }
    }

    /**
     * Update navigation buttons (override parent)
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const finishBtn = document.getElementById('finish-btn');
        const viewInBankBtn = document.getElementById('view-in-bank-btn');

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

        // Show "Ver en Banco" button in study mode
        if (viewInBankBtn) {
            viewInBankBtn.style.display = 'inline-flex';
            this.updateViewInBankButton();
        }
    }

    /**
     * Update "Ver en Banco" button to open current question in question bank
     */
    updateViewInBankButton() {
        const viewInBankBtn = document.getElementById('view-in-bank-btn');
        if (!viewInBankBtn) return;

        const question = this.getCurrentQuestion();
        if (!question) return;

        // Generate URL to open this specific question in the question bank
        const questionId = question.id || question.question_id;
        const viewerUrl = `visor-nueva-arquitectura.html?question_id=${questionId}`;

        // Update button click handler
        viewInBankBtn.onclick = () => {
            window.open(viewerUrl, '_blank');
        };
    }

    /**
     * Submit study test (override parent)
     */
    async submitExam() {
        // Check if all questions are answered
        const unanswered = this.getUnansweredQuestions();

        if (unanswered.length > 0) {
            const confirmed = confirm(
                `Tienes ${unanswered.length} pregunta(s) sin responder.\n\n` +
                `¿Estás seguro de que quieres enviar el test de todas formas?`
            );

            if (!confirmed) return;
        } else {
            // Mostrar modal de confirmación bonito
            showFinishTestModal();
            return; // No continuar hasta que se confirme en el modal
        }

        try {
            this.stopTimer();
            this.showAlert('Finalizando test de estudio...', 'info');

            // Save current question's answer before submitting
            const currentQuestion = this.getCurrentQuestion();
            if (currentQuestion && this.userAnswers[currentQuestion.question_id]) {
                await this.recordAnswer(currentQuestion.question_id, this.userAnswers[currentQuestion.question_id]);
            }

            // End tracking for all questions
            if (window.questionStatsTracker) {
                this.currentExam.questions.forEach(question => {
                    window.questionStatsTracker.endQuestionTracking(question.question_id);
                });
            }

            // Submit study test (backend handles statistics update)
            const results = await this.examApi.submitStudyTest(this.studyTestId);
            console.log('✅ Study test submitted:', results);

            // Store results for results page
            sessionStorage.setItem('studyTestResults', JSON.stringify(results));

            // Redirect to study results page
            window.location.href = `study-results.html?study_test_id=${this.studyTestId}`;

        } catch (error) {
            console.error('❌ Error submitting study test:', error);
            this.showAlert('Error al finalizar el test. Intenta de nuevo.', 'danger');
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
        const cancelBtn = document.getElementById('cancel-btn');
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.goToPreviousQuestion());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToNextQuestion());
        }

        if (finishBtn) {
            finishBtn.addEventListener('click', () => this.submitExam());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.showCancelModal());
        }

        if (confirmCancelBtn) {
            confirmCancelBtn.addEventListener('click', () => this.cancelExam());
        }

        const confirmFinishTestBtn = document.getElementById('confirmFinishTestBtn');
        if (confirmFinishTestBtn) {
            confirmFinishTestBtn.addEventListener('click', () => this.confirmFinishTest());
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
                const answerOption = document.querySelector(`.answer-option[data-answer="${answer}"]`);
                if (answerOption) answerOption.click();
            }
        });

        console.log('✅ Event listeners set up');
    }

    /**
     * Show cancel exam confirmation modal
     */
    showCancelModal() {
        showCancelModal();
    }

    /**
     * Cancel exam and return to home
     */
    cancelExam() {
        console.log('🚫 Test de estudio cancelado por el usuario');
        
        // Clear any timers
        if (this.examTimer) {
            clearInterval(this.examTimer);
            this.examTimer = null;
        }

        // Clear exam data
        this.currentExam = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.questionStartTimes = {};
        this.examStartTime = null;

        // Hide modal
        hideCancelModal();

        // Redirect to home
        window.location.href = 'exam-system.html';
    }

    /**
     * Confirm finish test from modal
     */
    confirmFinishTest() {
        console.log('✅ Confirmando finalización del test de estudio');
        
        // Hide modal
        hideFinishTestModal();

        // Continue with the original submit logic
        this.continueSubmitTest();
    }

    /**
     * Continue with test submission (extracted from submitExam)
     */
    async continueSubmitTest() {
        try {
            this.stopTimer();
            this.showAlert('Finalizando test de estudio...', 'info');

            const response = await fetch(`${this.API_BASE}/study-tests/${this.studyTestId}/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Test de estudio finalizado:', result);

            // Redirect to results page
            window.location.href = `study-results.html?study_test_id=${this.studyTestId}`;

        } catch (error) {
            console.error('❌ Error submitting study test:', error);
            this.showAlert('Error al finalizar el test. Intenta de nuevo.', 'danger');
            this.startTimer(); // Restart timer on error
        }
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

console.log('📚 StudyExamController class loaded');

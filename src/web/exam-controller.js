/**
 * ExamController - Base Class for Unified Exam System
 *
 * This class provides the foundation for both full exams and study mode tests.
 * It extracts common functionality from ExamSystem and ExamPage classes.
 *
 * Design Principles:
 * - Backward compatible: coexists with existing classes
 * - Type-aware: supports 'full' and 'study' exam types
 * - DRY: eliminates code duplication
 * - Extensible: easy to add new exam types
 */

class ExamController {
    constructor(options = {}) {
        // Configuration
        this.API_BASE = window.API_BASE !== undefined ? window.API_BASE : '/api';
        this.authToken = options.authToken || null;
        this.examType = options.examType || 'full'; // 'full' or 'study'

        // Exam state
        this.currentExam = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.questionStartTimes = {};

        // Timer state
        this.timeRemaining = 90 * 60; // 90 minutes in seconds
        this.timerInterval = null;
        this.examStartTime = null;

        // UI elements (to be set by subclass or init)
        this.elements = {
            progressBar: null,
            progressText: null,
            timerElement: null,
            questionContainer: null,
            navigationContainer: null
        };

        // Callbacks (can be overridden)
        this.onTimeUp = null;
        this.onQuestionChange = null;
        this.onExamComplete = null;

        console.log('📚 ExamController initialized -', {
            type: this.examType,
            API_BASE: this.API_BASE
        });
    }

    /**
     * Initialize UI element references
     */
    initializeElements(elementIds) {
        Object.keys(elementIds).forEach(key => {
            this.elements[key] = document.getElementById(elementIds[key]);
        });
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
    }

    /**
     * Load exam data (to be implemented by subclass)
     */
    async loadExam(examId) {
        throw new Error('loadExam must be implemented by subclass');
    }

    /**
     * Submit exam (to be implemented by subclass)
     */
    async submitExam() {
        throw new Error('submitExam must be implemented by subclass');
    }

    // ==================== TIMER METHODS ====================

    /**
     * Start the exam timer
     */
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.examStartTime = new Date();

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.handleTimeUp();
            }
        }, 1000);

        this.updateTimerDisplay();
        console.log('⏱️ Timer started - 90 minutes');
    }

    /**
     * Stop the timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            console.log('⏱️ Timer stopped');
        }
    }

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        if (!this.elements.timerElement) return;

        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        this.elements.timerElement.textContent = timeString;

        // Warning at 5 minutes
        if (this.timeRemaining === 5 * 60) {
            this.showAlert('⚠️ Quedan 5 minutos', 'warning');
        }

        // Critical at 1 minute
        if (this.timeRemaining === 60) {
            this.showAlert('🚨 ¡Último minuto!', 'danger');
        }
    }

    /**
     * Handle time up
     */
    handleTimeUp() {
        this.stopTimer();
        this.showAlert('⏰ Tiempo agotado. Enviando examen...', 'warning');

        if (this.onTimeUp) {
            this.onTimeUp();
        } else {
            this.submitExam();
        }
    }

    // ==================== NAVIGATION METHODS ====================

    /**
     * Go to next question
     */
    goToNextQuestion() {
        if (!this.currentExam || !this.currentExam.questions) return;

        // Record time spent on current question
        const currentQuestion = this.getCurrentQuestion();
        if (currentQuestion) {
            const timeSpent = this.getQuestionTimeSpent(currentQuestion.question_id);
            console.log(`⏱️ Time spent on question ${currentQuestion.question_id}: ${timeSpent}s`);
        }

        if (this.currentQuestionIndex < this.currentExam.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayCurrentQuestion();
            this.startQuestionTimer();

            if (this.onQuestionChange) {
                this.onQuestionChange(this.currentQuestionIndex);
            }
        } else {
            console.log('📍 Already at last question');
        }
    }

    /**
     * Go to previous question
     */
    goToPreviousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayCurrentQuestion();
            this.startQuestionTimer();

            if (this.onQuestionChange) {
                this.onQuestionChange(this.currentQuestionIndex);
            }
        } else {
            console.log('📍 Already at first question');
        }
    }

    /**
     * Go to specific question by index
     */
    goToQuestion(index) {
        if (index >= 0 && index < this.currentExam.questions.length) {
            this.currentQuestionIndex = index;
            this.displayCurrentQuestion();
            this.startQuestionTimer();

            if (this.onQuestionChange) {
                this.onQuestionChange(this.currentQuestionIndex);
            }
        }
    }

    /**
     * Get current question
     */
    getCurrentQuestion() {
        if (!this.currentExam || !this.currentExam.questions) return null;
        return this.currentExam.questions[this.currentQuestionIndex];
    }

    /**
     * Start timer for current question
     */
    startQuestionTimer() {
        const question = this.getCurrentQuestion();
        if (question && !this.questionStartTimes[question.question_id]) {
            this.questionStartTimes[question.question_id] = Date.now();
        }
    }

    /**
     * Get time spent on a question
     */
    getQuestionTimeSpent(questionId) {
        if (!this.questionStartTimes[questionId]) return 0;
        return Math.floor((Date.now() - this.questionStartTimes[questionId]) / 1000);
    }

    /**
     * Display current question (to be implemented by subclass)
     */
    displayCurrentQuestion() {
        // Subclass should implement the UI rendering
        this.updateProgress();
        this.updateNavigationButtons();
    }

    // ==================== ANSWER HANDLING ====================

    /**
     * Select answer for current question
     */
    selectAnswer(answerId) {
        const question = this.getCurrentQuestion();
        if (!question) return;

        this.userAnswers[question.question_id] = answerId;
        console.log(`✅ Answer selected for Q${question.question_id}: ${answerId}`);

        this.updateProgress();
    }

    /**
     * Check if question is answered
     */
    isQuestionAnswered(questionId) {
        return this.userAnswers.hasOwnProperty(questionId);
    }

    /**
     * Get answer for question
     */
    getAnswer(questionId) {
        return this.userAnswers[questionId] || null;
    }

    /**
     * Get number of answered questions
     */
    getAnsweredCount() {
        return Object.keys(this.userAnswers).length;
    }

    /**
     * Get unanswered questions
     */
    getUnansweredQuestions() {
        if (!this.currentExam || !this.currentExam.questions) return [];

        return this.currentExam.questions.filter(q =>
            !this.isQuestionAnswered(q.question_id)
        );
    }

    // ==================== PROGRESS TRACKING ====================

    /**
     * Update progress bar and text
     */
    updateProgress() {
        if (!this.currentExam || !this.currentExam.questions) return;

        const totalQuestions = this.currentExam.questions.length;
        const answeredCount = this.getAnsweredCount();
        const progressPercentage = (answeredCount / totalQuestions) * 100;

        // Update progress bar
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${progressPercentage}%`;
            this.elements.progressBar.setAttribute('aria-valuenow', answeredCount);
        }

        // Update progress text
        if (this.elements.progressText) {
            this.elements.progressText.textContent =
                `Pregunta ${this.currentQuestionIndex + 1} de ${totalQuestions} | Respondidas: ${answeredCount}/${totalQuestions}`;
        }
    }

    /**
     * Update navigation buttons state
     */
    updateNavigationButtons() {
        // To be implemented by subclass based on UI structure
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        // Try to use Bootstrap toast if available
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            const toast = this.createToast(message, type);
            toastContainer.appendChild(toast);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                toast.remove();
            }, 5000);
        } else {
            // Fallback to console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Create toast element
     */
    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        return toast;
    }

    /**
     * Get exam statistics
     */
    getExamStats() {
        if (!this.currentExam) return null;

        const totalQuestions = this.currentExam.questions.length;
        const answeredCount = this.getAnsweredCount();
        const unansweredCount = totalQuestions - answeredCount;
        const timeElapsed = this.examStartTime
            ? Math.floor((Date.now() - this.examStartTime.getTime()) / 1000)
            : 0;

        return {
            totalQuestions,
            answeredCount,
            unansweredCount,
            completionPercentage: (answeredCount / totalQuestions) * 100,
            timeElapsedSeconds: timeElapsed,
            timeRemainingSeconds: this.timeRemaining
        };
    }

    /**
     * Validate exam is ready to submit
     */
    canSubmitExam() {
        if (!this.currentExam) return false;

        const unanswered = this.getUnansweredQuestions();
        return unanswered.length === 0;
    }

    /**
     * Get submit confirmation message
     */
    getSubmitConfirmationMessage() {
        const unanswered = this.getUnansweredQuestions();

        if (unanswered.length === 0) {
            return '¿Estás seguro de que quieres enviar el examen?';
        } else {
            return `Tienes ${unanswered.length} pregunta(s) sin responder. ¿Quieres enviar de todas formas?`;
        }
    }

    /**
     * Reset exam state
     */
    reset() {
        this.stopTimer();
        this.currentExam = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.questionStartTimes = {};
        this.timeRemaining = 90 * 60;
        this.examStartTime = null;

        console.log('🔄 ExamController reset');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopTimer();
        this.elements = {};
        console.log('🗑️ ExamController destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExamController;
}

console.log('📚 ExamController class loaded');

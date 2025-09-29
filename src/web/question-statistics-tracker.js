/**
 * Question Statistics Tracker
 * Módulo para capturar y enviar estadísticas detalladas de preguntas
 */

class QuestionStatisticsTracker {
    constructor() {
        // GUARDIAN: Detectar cuándo se crea un tracker
        console.log('🚨 CONSTRUCTOR DE TRACKER LLAMADO');
        console.log('🚨 Stack trace:', new Error().stack);
        console.log('🚨 window.currentUserId al momento de creación:', window.currentUserId);
        console.log('🚨 localStorage al momento de creación:', localStorage.getItem('currentUserId'));

        this.apiBase = window.API_BASE || '/api'; // Fallback por seguridad
        this.currentSession = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            questions: new Map() // questionId -> { startTime, attempts, etc. }
        };
        this.isEnabled = true;

    }

    /**
     * Generar ID único para la sesión
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Inicializar el tracker (sin parámetros)
     */
    initialize() {
        this.isEnabled = true;
        this.currentSession = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            questions: new Map()
        };
        console.log('📊 Tracker inicializado y habilitado');
    }

    /**
     * Iniciar seguimiento de una pregunta
     */
    startQuestionTracking(questionId, questionData) {
        if (!this.isEnabled) return;

        const questionInfo = {
            questionId: questionId,
            startTime: Date.now(),
            attempts: 0,
            timeSpent: 0,
            category: questionData.categoria || 'Unknown',
            correctAnswer: questionData.respuesta_correcta,
            sessionType: this.getSessionType(),
            examId: this.getCurrentExamId()
        };

        this.currentSession.questions.set(questionId, questionInfo);
        
    }

    /**
     * Registrar intento de respuesta
     */
    recordAnswerAttempt(questionId, userAnswer, isCorrect, timeSpent = null) {
        if (!this.isEnabled) return;

        const questionInfo = this.currentSession.questions.get(questionId);
        if (!questionInfo) {
            console.warn(`⚠️ No se encontró información de pregunta ${questionId}`);
            return;
        }

        questionInfo.attempts++;
        questionInfo.timeSpent = timeSpent || (Date.now() - questionInfo.startTime);
        questionInfo.userAnswer = userAnswer;
        questionInfo.isCorrect = isCorrect;
        questionInfo.lastAttemptTime = Date.now();

        console.log({
            userAnswer,
            isCorrect,
            timeSpent: questionInfo.timeSpent,
            attempts: questionInfo.attempts
        });

        // Enviar datos al servidor
        this.sendQuestionAttempt(questionInfo);
    }

    /**
     * Finalizar seguimiento de una pregunta
     */
    endQuestionTracking(questionId) {
        if (!this.isEnabled) return;

        const questionInfo = this.currentSession.questions.get(questionId);
        if (!questionInfo) return;

        questionInfo.endTime = Date.now();
        questionInfo.totalTime = questionInfo.endTime - questionInfo.startTime;

    }

    /**
     * Enviar intento de pregunta al servidor
     */
    async sendQuestionAttempt(questionInfo) {
        try {
            const userId = this.getCurrentUserId();

            // Si no hay usuario autenticado, no enviar estadísticas
            if (!userId) {
                console.warn('⚠️ No se puede enviar estadísticas: usuario no autenticado');
                return;
            }

            // Validación adicional para detectar el bug
            if (userId === 'anonymous') {
                console.error('❌ ERROR CRÍTICO: Tracker está enviando "anonymous" como user_id');
                console.error('window.currentUserId:', window.currentUserId);
                console.error('localStorage currentUserId:', localStorage.getItem('currentUserId'));
                return;
            }
            
            const attemptData = {
                user_id: userId,
                question_id: questionInfo.questionId,
                exam_id: questionInfo.examId,
                user_answer: questionInfo.userAnswer,
                correct_answer: questionInfo.correctAnswer,
                is_correct: questionInfo.isCorrect,
                time_spent_seconds: Math.round(questionInfo.timeSpent / 1000),
                category: questionInfo.category,
                attempt_order: questionInfo.attempts,
                session_type: questionInfo.sessionType
            };


            const response = await fetch(`${this.apiBase}/question-attempt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(attemptData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

        } catch (error) {
            console.error('❌ Error enviando intento de pregunta:', error);
        }
    }

    /**
     * Obtener tipo de sesión actual
     */
    getSessionType() {
        // Detectar tipo de sesión basado en la URL o contexto
        if (window.location.pathname.includes('exam-system')) {
            return 'exam';
        } else if (window.location.pathname.includes('practice')) {
            return 'practice';
        } else {
            return 'review';
        }
    }

    /**
     * Obtener ID del examen actual
     */
    getCurrentExamId() {
        // Intentar obtener el ID del examen desde el contexto actual
        const examId = window.currentExamId || 
                      localStorage.getItem('currentExamId') || 
                      null;
        return examId;
    }

    /**
     * Obtener ID del usuario actual
     */
    getCurrentUserId() {
        // Intentar obtener el ID del usuario desde el contexto actual
        // Siempre verificar el valor actual, no usar caché
        const userId = window.currentUserId || 
                      localStorage.getItem('currentUserId');
        
        // Si no hay usuario autenticado, no enviar estadísticas
        if (!userId || userId === 'anonymous') {
            return null;
        }
        
        return userId;
    }

    /**
     * Habilitar/deshabilitar el seguimiento
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * Obtener estadísticas de la sesión actual
     */
    getSessionStats() {
        const questions = Array.from(this.currentSession.questions.values());
        const totalQuestions = questions.length;
        const correctAnswers = questions.filter(q => q.isCorrect).length;
        const totalTime = questions.reduce((sum, q) => sum + (q.timeSpent || 0), 0);

        return {
            sessionId: this.currentSession.sessionId,
            totalQuestions,
            correctAnswers,
            incorrectAnswers: totalQuestions - correctAnswers,
            successRate: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
            totalTimeMs: totalTime,
            totalTimeMinutes: Math.round(totalTime / 60000 * 100) / 100,
            questions: questions
        };
    }

    /**
     * Limpiar datos de la sesión
     */
    clearSession() {
        this.currentSession.questions.clear();
        this.currentSession.sessionId = this.generateSessionId();
        this.currentSession.startTime = Date.now();
    }

    /**
     * Obtener estadísticas de una pregunta específica
     */
    getQuestionStats(questionId) {
        return this.currentSession.questions.get(questionId);
    }

    /**
     * Exportar datos de la sesión
     */
    exportSessionData() {
        return {
            session: this.currentSession,
            stats: this.getSessionStats(),
            timestamp: new Date().toISOString()
        };
    }
}

// Inicialización manual del tracker (se llamará después de autenticación)
window.initQuestionStatsTracker = function() {
    console.log('🚀 initQuestionStatsTracker() llamada');
    const currentUserId = window.currentUserId || localStorage.getItem('currentUserId');
    console.log('🔍 currentUserId obtenido:', currentUserId);
    console.log('🔍 window.currentUserId:', window.currentUserId);
    console.log('🔍 localStorage.currentUserId:', localStorage.getItem('currentUserId'));

    if (!currentUserId || currentUserId === 'anonymous') {
        console.log('⚠️ No se puede inicializar tracker: usuario no autenticado');
        // Asegurar que no hay tracker sin usuario autenticado
        if (window.questionStatsTracker) {
            delete window.questionStatsTracker;
        }
        return;
    }

    // SIEMPRE recrear el tracker para garantizar datos frescos
    if (window.questionStatsTracker) {
        console.log('🗑️ Eliminando tracker anterior');
        delete window.questionStatsTracker;
    }

    console.log('🔨 Creando nuevo tracker...');
    window.questionStatsTracker = new QuestionStatisticsTracker();
    window.questionStatsTracker.initialize();
    console.log('✅ Tracker de estadísticas inicializado/reinicializado para usuario:', currentUserId);
};

// GUARDIAN: Limpiar cualquier tracker existente al cargar la página
if (typeof window !== 'undefined') {
    console.log('🧹 Limpiando tracker al cargar página');
    if (window.questionStatsTracker) {
        console.log('🗑️ Eliminando tracker existente al cargar página');
        delete window.questionStatsTracker;
    }
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestionStatisticsTracker;
}

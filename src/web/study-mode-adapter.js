/**
 * Study Mode Adapter for Exam System
 * Extends ExamSystem class to support study mode functionality
 */

class StudyModeAdapter {
    constructor(examSystem) {
        this.examSystem = examSystem;
        this.isStudyMode = false;
        this.studyTestId = null;
        this.selectedUTs = [];
        this.selectionMode = null;

        this.checkStudyModeParams();
    }

    checkStudyModeParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const studyTestId = urlParams.get('study_test_id');
        const mode = urlParams.get('mode');

        if (studyTestId && mode === 'study') {
            this.isStudyMode = true;
            this.studyTestId = studyTestId;
            console.log('📚 Modo Estudio activado - Test ID:', studyTestId);
            this.initStudyMode();
        }
    }

    async initStudyMode() {
        // Wait for authentication
        await this.waitForAuth();

        // Load study test
        await this.loadStudyTest();

        // Show exam interface with study mode indicator
        this.showStudyModeIndicator();

        // Start the study test
        this.examSystem.showExamInterface();
        this.examSystem.startTimer();
        this.examSystem.displayCurrentQuestion();
        this.examSystem.showAlert('¡Test de estudio iniciado!', 'success');
    }

    async waitForAuth() {
        return new Promise((resolve) => {
            const checkAuth = setInterval(() => {
                if (this.examSystem.currentUser) {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
        });
    }

    async loadStudyTest() {
        try {
            const response = await fetch(`${this.examSystem.API_BASE}/study-tests/${this.studyTestId}/questions`, {
                headers: {
                    'Authorization': `Bearer ${this.examSystem.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error loading study test');
            }

            const data = await response.json();
            console.log('✅ Test de estudio cargado:', data);

            // Adapt study test data to exam format
            this.selectedUTs = data.selected_uts;
            this.selectionMode = data.selection_mode;

            // Transform to exam format
            const questionDetails = this.transformQuestionsFormat(data.questions);
            this.examSystem.currentExam = {
                exam_id: this.studyTestId,
                total_questions: data.total_questions,
                isStudyMode: true,
                studyTestId: this.studyTestId,
                selectedUTs: this.selectedUTs,
                selectionMode: this.selectionMode,
                questionDetails: questionDetails,
                questions: questionDetails  // Alias for compatibility with updateProgress
            };

            this.examSystem.currentQuestionIndex = 0;
            this.examSystem.userAnswers = {};
            this.examSystem.timeRemaining = 90 * 60; // Keep same timer
            this.examSystem.examStartTime = new Date();

        } catch (error) {
            console.error('Error loading study test:', error);
            this.examSystem.showAlert('Error cargando test de estudio', 'danger');
            setTimeout(() => {
                window.location.href = 'study-config.html';
            }, 2000);
        }
    }

    transformQuestionsFormat(questions) {
        // Transform study test questions to match exam format
        return questions.map(q => ({
            question_id: q.id,
            order: q.order,
            ut_number: q.ut_number,
            ut_category: q.ut_category,
            texto_pregunta: q.texto_pregunta,
            respuesta_correcta: q.correct_answer || '', // Hide for now
            categoria: q.categoria,
            numero_pregunta: q.numero_pregunta,
            opcion_a: q.opciones.A || q.opciones.a || '',
            opcion_b: q.opciones.B || q.opciones.b || '',
            opcion_c: q.opciones.C || q.opciones.c || '',
            opcion_d: q.opciones.D || q.opciones.d || '',
            exam_info: q.exam_info
        }));
    }

    showStudyModeIndicator() {
        // Add visual indicator that this is study mode
        const examSection = document.getElementById('exam-section');
        if (!examSection) return;

        // Create study mode badge
        const badge = document.createElement('div');
        badge.id = 'study-mode-badge';
        badge.style.cssText = `
            position: fixed;
            top: 50px;
            right: 10px;
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

        const modeNames = {
            random: '🎲 Aleatorio',
            failed: '❌ Falladas',
            new: '✨ Nuevas'
        };

        badge.innerHTML = `
            <i class="fas fa-book-reader"></i>
            <span>Modo Estudio</span>
            <span style="opacity: 0.8; font-size: 0.8rem;">${modeNames[this.selectionMode] || ''}</span>
        `;

        document.body.appendChild(badge);

        // Create cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-study-btn';
        cancelBtn.style.cssText = `
            position: fixed;
            top: 50px;
            left: 10px;
            background: #ef4444;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            z-index: 9998;
            box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        `;
        cancelBtn.innerHTML = `
            <i class="fas fa-times"></i>
            <span>Cancelar</span>
        `;
        cancelBtn.onclick = () => {
            if (confirm('¿Estás seguro de que quieres cancelar este test de estudio? Se perderá el progreso actual.')) {
                window.location.href = 'study-config.html';
            }
        };
        cancelBtn.onmouseover = () => {
            cancelBtn.style.background = '#dc2626';
            cancelBtn.style.transform = 'translateY(-2px)';
        };
        cancelBtn.onmouseout = () => {
            cancelBtn.style.background = '#ef4444';
            cancelBtn.style.transform = 'translateY(0)';
        };

        document.body.appendChild(cancelBtn);

        // Add UT selection info to progress area
        const progressText = document.querySelector('.progress-text');
        if (progressText) {
            const utInfo = document.createElement('span');
            utInfo.style.cssText = 'font-size: 0.85rem; opacity: 0.8;';
            utInfo.textContent = `UTs: ${this.selectedUTs.join(', ')}`;
            progressText.appendChild(utInfo);
        }
    }

    async recordAnswer(questionId, userAnswer, timeSpentSeconds) {
        if (!this.isStudyMode) return;

        try {
            console.log('🔄 Enviando respuesta al servidor:', {
                studyTestId: this.studyTestId,
                questionId: questionId,
                userAnswer: userAnswer,
                timeSpent: Math.floor(timeSpentSeconds)
            });

            const response = await fetch(`${this.examSystem.API_BASE}/study-tests/${this.studyTestId}/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.examSystem.authToken}`
                },
                body: JSON.stringify({
                    question_id: questionId,
                    user_answer: userAnswer,
                    time_spent_seconds: Math.floor(timeSpentSeconds)
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error recording study answer:', response.status, errorText);
            } else {
                const data = await response.json();
                console.log('✅ Respuesta registrada:', data);
            }
        } catch (error) {
            console.error('❌ Error recording answer:', error);
        }
    }

    async finishStudyTest() {
        try {
            this.examSystem.showAlert('Finalizando test de estudio...', 'info');

            const response = await fetch(`${this.examSystem.API_BASE}/study-tests/${this.studyTestId}/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.examSystem.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error submitting study test');
            }

            const data = await response.json();
            console.log('✅ Test de estudio completado:', data);

            // Store results for results page
            sessionStorage.setItem('studyTestResults', JSON.stringify(data));

            // Redirect to results page
            window.location.href = `study-results.html?study_test_id=${this.studyTestId}`;

        } catch (error) {
            console.error('Error finishing study test:', error);
            this.examSystem.showAlert('Error finalizando test de estudio', 'danger');
        }
    }
}

// Extend ExamSystem prototype to support study mode
(function() {
    const originalInit = ExamSystem.prototype.init;
    const originalStartNewExam = ExamSystem.prototype.startNewExam;
    const originalFinishExam = ExamSystem.prototype.finishExam;
    const originalDisplayCurrentQuestion = ExamSystem.prototype.displayCurrentQuestion;

    ExamSystem.prototype.init = function() {
        originalInit.call(this);

        // Initialize study mode adapter
        this.studyModeAdapter = new StudyModeAdapter(this);
    };

    ExamSystem.prototype.startNewExam = function() {
        // Check if in study mode
        if (this.studyModeAdapter && this.studyModeAdapter.isStudyMode) {
            // Study mode is handled by adapter init
            return;
        }
        return originalStartNewExam.call(this);
    };

    ExamSystem.prototype.finishExam = function() {
        // Check if in study mode
        if (this.studyModeAdapter && this.studyModeAdapter.isStudyMode) {
            return this.studyModeAdapter.finishStudyTest();
        }
        return originalFinishExam.call(this);
    };

    // Intercept answer recording for study mode
    const originalAnswerHandler = ExamSystem.prototype.goToNextQuestion;
    ExamSystem.prototype.goToNextQuestion = function() {
        // Record answer if in study mode BEFORE moving to next question
        if (this.studyModeAdapter && this.studyModeAdapter.isStudyMode) {
            const question = this.currentExam.questionDetails[this.currentQuestionIndex];
            const userAnswer = this.userAnswers[question.question_id];

            if (userAnswer && question) {
                const timeSpent = (Date.now() - (this.questionStartTimes[question.question_id] || Date.now())) / 1000;
                console.log('📝 Guardando respuesta modo estudio:', {
                    questionId: question.question_id,
                    userAnswer: userAnswer,
                    timeSpent: timeSpent
                });
                this.studyModeAdapter.recordAnswer(question.question_id, userAnswer, timeSpent);
            }
        }

        return originalAnswerHandler.call(this);
    };
})();

console.log('📚 Study Mode Adapter loaded');

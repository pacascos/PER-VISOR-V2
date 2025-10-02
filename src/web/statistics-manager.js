/**
 * StatisticsManager - Comprehensive statistics and gamification system for PER exams
 */
class StatisticsManager {
    constructor() {
        // Usar configuración de entorno automática
        this.API_BASE = window.API_BASE || '/api'; // Fallback por seguridad
        this.userId = this.getCurrentUserId();
        this.charts = {};

        // Achievement definitions
        this.achievements = {
            // Progress achievements
            first_exam: {
                id: 'first_exam',
                title: 'Primer Paso',
                description: 'Completa tu primer examen',
                icon: 'fas fa-baby',
                type: 'progress',
                condition: { exams_completed: 1 },
                xp: 50
            },
            exam_master: {
                id: 'exam_master',
                title: 'Maestro de Exámenes',
                description: 'Completa 10 exámenes',
                icon: 'fas fa-graduation-cap',
                type: 'progress',
                condition: { exams_completed: 10 },
                xp: 500
            },
            perfectionist: {
                id: 'perfectionist',
                title: 'Perfeccionista',
                description: 'Obtén 100% en un examen',
                icon: 'fas fa-star',
                type: 'mastery',
                condition: { perfect_score: 1 },
                xp: 200
            },
            // Streak achievements
            week_streak: {
                id: 'week_streak',
                title: 'Semana Constante',
                description: 'Estudia 7 días seguidos',
                icon: 'fas fa-fire',
                type: 'streak',
                condition: { daily_streak: 7 },
                xp: 150
            },
            month_streak: {
                id: 'month_streak',
                title: 'Mes Dedicado',
                description: 'Estudia 30 días seguidos',
                icon: 'fas fa-calendar-check',
                type: 'streak',
                condition: { daily_streak: 30 },
                xp: 1000
            },
            // Mastery achievements
            navigation_expert: {
                id: 'navigation_expert',
                title: 'Experto en Navegación',
                description: 'Domina UT3 con 90% de acierto',
                icon: 'fas fa-compass',
                type: 'mastery',
                condition: { topic_mastery: { 'UT3': 90 } },
                xp: 300
            },
            weather_master: {
                id: 'weather_master',
                title: 'Maestro del Tiempo',
                description: 'Domina UT7 con 90% de acierto',
                icon: 'fas fa-cloud-sun',
                type: 'mastery',
                condition: { topic_mastery: { 'UT7': 90 } },
                xp: 300
            },
            // Special achievements
            night_owl: {
                id: 'night_owl',
                title: 'Búho Nocturno',
                description: 'Completa un examen después de medianoche',
                icon: 'fas fa-moon',
                type: 'special',
                condition: { night_exam: 1 },
                xp: 100
            },
            speed_demon: {
                id: 'speed_demon',
                title: 'Demonio de la Velocidad',
                description: 'Completa un examen en menos de 30 minutos',
                icon: 'fas fa-tachometer-alt',
                type: 'special',
                condition: { fast_completion: 30 },
                xp: 150
            }
        };

        // Topic configuration
        this.topics = {
            'UT1': { name: 'Nomenclatura náutica', color: '#3b82f6' },
            'UT2': { name: 'Elementos de amarre y fondeo', color: '#10b981' },
            'UT3': { name: 'Seguridad en la mar', color: '#f59e0b' },
            'UT4': { name: 'Legislación', color: '#ef4444' },
            'UT5': { name: 'Balizamiento', color: '#8b5cf6' },
            'UT6': { name: 'Reglamento de abordajes', color: '#06b6d4' },
            'UT7': { name: 'Navegación', color: '#84cc16' },
            'UT8': { name: 'Meteorología', color: '#f97316' },
            'UT9': { name: 'Comunicaciones', color: '#ec4899' },
            'UT10': { name: 'Propulsión mecánica', color: '#6b7280' },
            'UT11': { name: 'Electricidad y electrónica', color: '#14b8a6' }
        };
    }

    getCurrentUserId() {
        // Get from localStorage or session (where exam system stores user info)
        const currentUser = localStorage.getItem('currentUser');
        
        if (currentUser) {
            try {
                const userData = JSON.parse(currentUser);
                return userData.id || userData.user_id;
            } catch (e) {
                console.error('Error parsing currentUser:', e);
            }
        }
        
        return localStorage.getItem('currentUserId') || null;
    }

    getCurrentAuthToken() {
        return localStorage.getItem('authToken') || null;
    }

    async initialize() {
        try {
            await this.loadUserStatistics();
            
            // Solo renderizar si tenemos datos válidos del usuario
            if (this.userStats && this.userId) {
                await this.renderDashboard();
            }
        } catch (error) {
            console.error('Error initializing statistics:', error);
            this.showError('Error cargando las estadísticas');
        }
    }

    async loadUserStatistics() {
        // Check if user is authenticated
        const authToken = this.getCurrentAuthToken();
        if (!this.userId || !authToken) {
            console.error('No authenticated user found');
            this.showError('Usuario no autenticado. Por favor, inicia sesión.');
            return;
        }

        try {
            // Prepare headers with authentication
            const headers = {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            };

            // Load user statistics
            const statsResponse = await fetch(`${this.API_BASE}/api/user-stats`, {
                headers: headers
            });

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                this.processRealUserStats(statsData);
            } else {
                throw new Error('Failed to load user statistics');
            }

            // Simplificar: usar solo los datos ya obtenidos del endpoint principal
            this.userAchievements = []; // Por ahora, sin achievements específicos

        } catch (error) {
            console.error('Error loading real user statistics:', error);
            this.showError(`Error cargando estadísticas: ${error.message}`);
        }
    }

    processRealUserStats(data) {
        // El endpoint /api/user-stats devuelve datos directamente
        this.userStats = {
            level: data.level || 1,
            xp: data.xp || 0,
            xp_to_next: data.xp_to_next || 500,
            exams_completed: data.exams_completed || 0,
            total_questions: data.total_questions || 0,
            correct_answers: data.correct_answers || 0,
            overall_score: data.overall_score || 0,
            study_time_hours: data.study_time_hours || 0,
            daily_streak: data.daily_streak || 0,
            longest_streak: data.longest_streak || 0,
            weak_topics: data.weak_topics || [],
            strong_topics: data.strong_topics || [],
            last_exam_date: data.last_exam_date ? new Date(data.last_exam_date) : null,
            created_at: new Date()
        };

        // Process topic performance (usando topic_progress del endpoint)
        this.userProgress = data.topic_progress || {};

        // Process exam history (usando exam_history del endpoint)
        this.examHistory = data.exam_history || [];
    }

    processProgressData(data) {
        if (data.daily_progress) {
            this.examHistory = data.daily_progress.map(day => ({
                date: day.exam_date,
                score: Math.round(day.avg_score),
                time_minutes: 90 // Default, as we don't have individual times in daily aggregate
            }));
        }

        // Update topic trends if available
        if (data.topic_progress) {
            Object.keys(data.topic_progress).forEach(topic => {
                if (this.userProgress[topic]) {
                    this.userProgress[topic].trend = data.topic_progress[topic].trend;
                }
            });
        }
    }

    calculateTrend(percentage) {
        // Simple trend calculation - in a real implementation,
        // this would compare with historical data
        if (percentage >= 85) return 'up';
        if (percentage <= 65) return 'down';
        return 'stable';
    }


    async renderDashboard() {
        // Hide loading state
        document.getElementById('loadingState').classList.add('d-none');
        document.getElementById('statsContent').classList.remove('d-none');
        document.getElementById('recommendationsSection').classList.remove('d-none');

        // Update header info
        this.updateHeader();

        // Update main stats
        this.updateMainStats();

        // Render charts
        this.renderEvolutionChart();
        this.renderRadarChart();

        // Render topic progress
        this.renderTopicProgress();

        // Check and render achievements
        this.checkAchievements();
        this.renderAchievements();

        // Render exam history
        this.renderExamHistory();

        // Render recommendations
        this.renderRecommendations();
    }

    updateHeader() {
        const levelText = document.getElementById('levelText');
        const streakText = document.getElementById('streakText');

        levelText.textContent = `Nivel ${this.userStats.level} (${this.userStats.xp} XP)`;
        streakText.textContent = `${this.userStats.daily_streak} días`;

        // Add flame animation for good streaks
        const streakIndicator = document.getElementById('streakIndicator');
        if (this.userStats.daily_streak >= 7) {
            streakIndicator.classList.add('streak-hot');
        }
    }

    updateMainStats() {
        // Overall score
        document.getElementById('overallScore').textContent = `${this.userStats.overall_score}%`;
        document.getElementById('overallProgress').style.width = `${this.userStats.overall_score}%`;

        // Exams completed
        document.getElementById('examsCompleted').textContent = this.userStats.exams_completed;
        const examProgress = (this.userStats.exams_completed / 20) * 100;
        document.getElementById('examProgress').style.width = `${Math.min(examProgress, 100)}%`;

        // Study time
        document.getElementById('studyTime').textContent = `${this.userStats.study_time_hours}h`;
        const timeProgress = (this.userStats.study_time_hours / 50) * 100;
        document.getElementById('timeProgress').style.width = `${Math.min(timeProgress, 100)}%`;

        // Weak areas
        document.getElementById('weakAreas').textContent = this.userStats.weak_topics.length;

        const weakAreasList = document.getElementById('weakAreasList');
        weakAreasList.innerHTML = '';
        this.userStats.weak_topics.forEach(topic => {
            const badge = document.createElement('small');
            badge.className = 'badge bg-danger me-1';
            badge.textContent = `${topic} - ${this.topics[topic].name}`;
            weakAreasList.appendChild(badge);
        });
    }

    renderEvolutionChart() {
        const ctx = document.getElementById('evolutionChart').getContext('2d');

        const dates = this.examHistory.map(exam => exam.date);
        const scores = this.examHistory.map(exam => exam.score);

        try {
            this.charts.evolution = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Puntuación (%)',
                        data: scores,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 50,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        } catch (error) {
            console.error('Error renderizando gráfico de evolución:', error);
        }
    }

    renderRadarChart() {
        const ctx = document.getElementById('radarChart').getContext('2d');

        const topicNames = Object.keys(this.userProgress);
        const topicScores = topicNames.map(topic => this.userProgress[topic].percentage);

        try {
            this.charts.radar = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: topicNames,
                datasets: [{
                    label: 'Dominio (%)',
                    data: topicScores,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        } catch (error) {
            console.error('❌ Error renderizando gráfico de radar:', error);
        }
    }

    renderTopicProgress() {
        const container = document.getElementById('topicMastery');
        container.innerHTML = '';

        Object.keys(this.userProgress).forEach(topicId => {
            const topic = this.userProgress[topicId];
            const topicInfo = this.topics[topicId];

            const topicItem = document.createElement('div');
            topicItem.className = 'topic-item';

            const trendIcon = topic.trend === 'up' ? 'fa-arrow-up text-success' :
                            topic.trend === 'down' ? 'fa-arrow-down text-danger' :
                            'fa-minus text-muted';

            topicItem.innerHTML = `
                <div class="topic-info">
                    <div class="topic-name">${topicId} - ${topicInfo.name}</div>
                    <div class="topic-stats">
                        ${topic.correct}/${topic.total} preguntas correctas
                        <i class="fas ${trendIcon} ms-2"></i>
                    </div>
                </div>
                <div class="topic-progress">
                    <div class="progress">
                        <div class="progress-bar" style="width: ${topic.percentage}%; background-color: ${topicInfo.color}"></div>
                    </div>
                </div>
                <div class="topic-score">${topic.percentage}%</div>
            `;

            container.appendChild(topicItem);
        });
    }

    renderAchievements() {
        const container = document.getElementById('achievementsGrid');
        container.innerHTML = '';

        Object.keys(this.achievements).forEach(achievementId => {
            const achievement = this.achievements[achievementId];
            const isUnlocked = this.userAchievements.includes(achievementId);

            const achievementBadge = document.createElement('div');
            achievementBadge.className = `achievement-badge ${isUnlocked ? 'unlocked' : 'locked'}`;
            achievementBadge.onclick = () => this.showAchievementDetail(achievement, isUnlocked);

            achievementBadge.innerHTML = `
                <div class="achievement-icon">
                    <i class="${achievement.icon}"></i>
                </div>
                <div class="achievement-title">${achievement.title}</div>
                <div class="achievement-description">${achievement.description}</div>
                ${isUnlocked ? `<small class="text-muted">+${achievement.xp} XP</small>` : ''}
            `;

            container.appendChild(achievementBadge);
        });
    }

    renderExamHistory() {
        const examHistoryContainer = document.getElementById('examHistoryContainer');
        if (!examHistoryContainer || !this.examHistory || this.examHistory.length === 0) {
            if (examHistoryContainer) {
                examHistoryContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #6b7280;">
                        <i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p>No hay exámenes completados aún</p>
                    </div>
                `;
            }
            return;
        }

        examHistoryContainer.innerHTML = '';

        this.examHistory.forEach(exam => {
            const examElement = document.createElement('div');
            examElement.className = `exam-history-item ${exam.passed ? 'passed' : 'failed'}`;
            
            const statusText = exam.passed ? 'Aprobado' : 'Suspenso';
            const statusClass = exam.passed ? 'passed' : 'failed';
            
            examElement.innerHTML = `
                <div class="exam-date">
                    <i class="fas fa-calendar-alt me-1"></i>
                    ${exam.date || 'Fecha no disponible'}
                </div>
                
                <div class="exam-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="exam-score ${statusClass}">
                    ${exam.score}%
                </div>
                
                <div class="exam-details">
                    <div class="exam-stats">
                        <div class="exam-stat">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            <span>${exam.correct_answers || 0} correctas</span>
                        </div>
                        <div class="exam-stat">
                            <i class="fas fa-times-circle" style="color: #ef4444;"></i>
                            <span>${exam.incorrect_answers || 0} fallos</span>
                        </div>
                        <div class="exam-stat">
                            <i class="fas fa-clock" style="color: #6b7280;"></i>
                            <span>${exam.time_minutes || 0} min</span>
                        </div>
                        <div class="exam-stat">
                            <i class="fas fa-list-ol" style="color: #6b7280;"></i>
                            <span>${exam.total_questions || 0} preguntas</span>
                        </div>
                    </div>
                    ${exam.incorrect_answers > 0 ? `
                        <div class="exam-actions" style="margin-top: 0.75rem;">
                            <button class="btn btn-sm btn-outline-danger" onclick="window.statisticsManager.viewFailedQuestions('${exam.exam_id}')">
                                <i class="fas fa-eye me-1"></i>Ver ${exam.incorrect_answers} Fallos
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
            
            examHistoryContainer.appendChild(examElement);
        });
    }

    renderRecommendations() {
        const container = document.getElementById('recommendationsList');
        container.innerHTML = '';

        const recommendations = this.generateRecommendations();

        recommendations.forEach(rec => {
            const recItem = document.createElement('div');
            recItem.className = 'recommendation-item';

            recItem.innerHTML = `
                <div class="recommendation-priority priority-${rec.priority}"></div>
                <div class="recommendation-content">
                    <div class="recommendation-title">
                        <i class="${rec.icon} me-2"></i>
                        ${rec.title}
                    </div>
                    <div class="recommendation-description">${rec.description}</div>
                </div>
            `;

            container.appendChild(recItem);
        });
    }

    generateRecommendations() {
        const recommendations = [];

        // Check weak areas
        this.userStats.weak_topics.forEach(topic => {
            recommendations.push({
                title: `Refuerza ${topic} - ${this.topics[topic].name}`,
                description: `Tu rendimiento en este tema es del ${this.userProgress[topic].percentage}%. Te recomendamos dedicar más tiempo a practicar.`,
                priority: 'high',
                icon: 'fas fa-exclamation-circle'
            });
        });

        // Check streak
        if (this.userStats.daily_streak === 0) {
            recommendations.push({
                title: 'Retoma tu rutina de estudio',
                description: 'No has estudiado hoy. Mantener una rutina constante es clave para el éxito.',
                priority: 'medium',
                icon: 'fas fa-calendar-alt'
            });
        }

        // Check exam frequency
        const daysSinceLastExam = Math.floor((new Date() - this.userStats.last_exam_date) / (1000 * 60 * 60 * 24));
        if (daysSinceLastExam > 3) {
            recommendations.push({
                title: 'Realiza un nuevo examen',
                description: `Han pasado ${daysSinceLastExam} días desde tu último examen. Es hora de poner a prueba tus conocimientos.`,
                priority: 'medium',
                icon: 'fas fa-clipboard-check'
            });
        }

        // Study time recommendation
        if (this.userStats.study_time_hours < 30) {
            recommendations.push({
                title: 'Aumenta tu tiempo de estudio',
                description: 'Para obtener mejores resultados, te recomendamos estudiar al menos 1 hora diaria.',
                priority: 'low',
                icon: 'fas fa-clock'
            });
        }

        return recommendations.slice(0, 5); // Limit to top 5 recommendations
    }

    checkAchievements() {
        const unlockedAchievements = [];
        
        Object.keys(this.achievements).forEach(achievementId => {
            const achievement = this.achievements[achievementId];
            const isUnlocked = this.evaluateAchievementCondition(achievement);
            
            if (isUnlocked && !this.userAchievements.includes(achievementId)) {
                unlockedAchievements.push(achievement);
                console.log(`🎉 ¡Logro desbloqueado! ${achievement.title}`);
            }
        });
        
        // Agregar nuevos logros desbloqueados
        unlockedAchievements.forEach(achievement => {
            this.userAchievements.push(achievement.id);
        });
        
        if (unlockedAchievements.length > 0) {
            // Mostrar notificación de nuevos logros
            this.showAchievementNotification(unlockedAchievements);
        }
    }

    evaluateAchievementCondition(achievement) {
        const condition = achievement.condition;
        
        switch (achievement.type) {
            case 'progress':
                return this.checkProgressCondition(condition);
            case 'mastery':
                return this.checkMasteryCondition(condition);
            case 'streak':
                return this.checkStreakCondition(condition);
            case 'special':
                return this.checkSpecialCondition(condition);
            default:
                return false;
        }
    }

    checkProgressCondition(condition) {
        if (condition.exams_completed && this.userStats) {
            return this.userStats.exams_completed >= condition.exams_completed;
        }
        if (condition.perfect_score && this.examHistory) {
            return this.examHistory.some(exam => exam.score >= 100);
        }
        return false;
    }

    checkMasteryCondition(condition) {
        if (condition.topic_mastery && this.userProgress) {
            for (const [topic, requiredScore] of Object.entries(condition.topic_mastery)) {
                if (this.userProgress[topic] && this.userProgress[topic].percentage >= requiredScore) {
                    return true;
                }
            }
        }
        return false;
    }

    checkStreakCondition(condition) {
        if (condition.daily_streak && this.userStats) {
            return this.userStats.daily_streak >= condition.daily_streak;
        }
        return false;
    }

    checkSpecialCondition(condition) {
        // Implementar lógica para logros especiales
        // Por ahora, retornar false ya que necesitaríamos más datos
        return false;
    }

    showAchievementNotification(achievements) {
        // Crear notificación visual de nuevos logros
        achievements.forEach(achievement => {
            const notification = document.createElement('div');
            notification.className = 'achievement-notification';
            notification.innerHTML = `
                <div class="achievement-notification-content">
                    <i class="${achievement.icon}"></i>
                    <div>
                        <strong>¡Logro desbloqueado!</strong><br>
                        ${achievement.title}<br>
                        <small>+${achievement.xp} XP</small>
                    </div>
                </div>
            `;
            
            // Agregar estilos
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 1000;
                animation: slideIn 0.5s ease-out;
            `;
            
            document.body.appendChild(notification);
            
            // Remover después de 5 segundos
            setTimeout(() => {
                notification.remove();
            }, 5000);
        });
    }

    showAchievementDetail(achievement, isUnlocked) {
        const modal = new bootstrap.Modal(document.createElement('div'));
        // Implementation for achievement detail modal
    }

    async viewFailedQuestions(examId) {
        try {
            console.log('🔍 Obteniendo preguntas falladas del examen:', examId);

            // Obtener preguntas falladas del examen
            const response = await fetch(`${this.API_BASE}/api/user/exam/${examId}/failed-questions`, {
                headers: {
                    'Authorization': `Bearer ${this.getCurrentAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success && data.failed_questions.length > 0) {
                // Extraer IDs de las preguntas falladas
                const failedQuestionIds = data.failed_questions.map(q => q.question_id);
                
                // Guardar el filtro en localStorage para que el banco de preguntas lo use
                localStorage.setItem('failedQuestionsFilter', JSON.stringify({
                    examId: examId,
                    questionIds: failedQuestionIds,
                    examDate: data.failed_questions[0].exam_date || new Date().toISOString(),
                    totalFailed: data.total_failed
                }));
                
                console.log('🔍 Redirigiendo al banco de preguntas con', failedQuestionIds.length, 'preguntas falladas');
                
                // Redirigir al banco de preguntas
                window.location.href = 'visor-nueva-arquitectura.html?filter=failed_questions';
            } else {
                this.showError('No se encontraron preguntas falladas para este examen');
            }

        } catch (error) {
            console.error('❌ Error obteniendo preguntas falladas:', error);
            this.showError(`Error cargando preguntas falladas: ${error.message}`);
        }
    }


    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = message;
        document.querySelector('.stats-container').appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Method to update statistics after completing an exam
    async updateAfterExam(examResults) {
        try {
            const response = await fetch(`${this.API_BASE}/api/statistics/exam-completed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    score: examResults.score,
                    time_minutes: examResults.time_minutes,
                    topic_results: examResults.topic_results,
                    date: new Date().toISOString()
                })
            });

            if (response.ok) {
                // Refresh dashboard
                await this.initialize();
            }
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatisticsManager;
}
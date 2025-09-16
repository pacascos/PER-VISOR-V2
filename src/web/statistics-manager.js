/**
 * StatisticsManager - Comprehensive statistics and gamification system for PER exams
 */
class StatisticsManager {
    constructor() {
        this.API_BASE = 'http://localhost:5001';
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
            await this.renderDashboard();
        } catch (error) {
            console.error('Error initializing statistics:', error);
            this.showError('Error cargando las estadísticas');
        }
    }

    async loadUserStatistics() {
        // Check if user is authenticated
        const authToken = this.getCurrentAuthToken();
        if (!this.userId || !authToken) {
            console.warn('No authenticated user found, using demo data');
            this.loadDemoData();
            return;
        }

        try {
            // Prepare headers with authentication
            const headers = {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            };

            // Load user statistics
            const statsResponse = await fetch(`${this.API_BASE}/api/statistics/user/${this.userId}`, {
                headers: headers
            });

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                this.processRealUserStats(statsData);
            } else {
                throw new Error('Failed to load user statistics');
            }

            // Load achievements
            const achievementsResponse = await fetch(`${this.API_BASE}/api/statistics/achievements/${this.userId}`, {
                headers: headers
            });

            if (achievementsResponse.ok) {
                const achievementsData = await achievementsResponse.json();
                this.userAchievements = achievementsData.unlocked.map(a => a.achievement_id);
            } else {
                this.userAchievements = [];
            }

            // Load progress data
            const progressResponse = await fetch(`${this.API_BASE}/api/statistics/progress/${this.userId}`, {
                headers: headers
            });

            if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                this.processProgressData(progressData);
            } else {
                this.examHistory = [];
            }

        } catch (error) {
            console.error('Error loading real user statistics:', error);
            console.warn('Falling back to demo data');
            this.loadDemoData();
        }
    }

    processRealUserStats(data) {
        const performance = data.performance || {};
        const levelInfo = data.level_info || {};
        const insights = data.insights || {};

        this.userStats = {
            level: levelInfo.level || 1,
            xp: levelInfo.xp || 0,
            xp_to_next: levelInfo.xp_to_next || 500,
            exams_completed: performance.exams_completed || 0,
            total_questions: performance.total_questions || 0,
            correct_answers: performance.correct_answers || 0,
            overall_score: performance.overall_score || 0,
            study_time_hours: performance.study_time_hours || 0,
            daily_streak: performance.daily_streak || 0,
            longest_streak: performance.longest_streak || 0,
            weak_topics: insights.weak_topics || [],
            strong_topics: insights.strong_topics || [],
            last_exam_date: performance.last_exam_date ? new Date(performance.last_exam_date) : null,
            created_at: data.user_info?.member_since ? new Date(data.user_info.member_since) : new Date()
        };

        // Process topic performance
        this.userProgress = {};
        if (data.topic_performance) {
            data.topic_performance.forEach(topic => {
                this.userProgress[topic.category] = {
                    correct: topic.correct,
                    total: topic.total,
                    percentage: Math.round(topic.avg_percentage),
                    trend: this.calculateTrend(topic.avg_percentage)
                };
            });
        }

        // Process recent exams
        if (data.recent_exams) {
            this.examHistory = data.recent_exams.map(exam => ({
                date: exam.completed_at.split('T')[0], // Extract date part
                score: exam.score,
                time_minutes: exam.time_taken_minutes
            }));
        }
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

    loadDemoData() {
        // Fallback demo data when no real data is available
        this.userStats = {
            level: 5,
            xp: 2450,
            xp_to_next: 550,
            exams_completed: 12,
            total_questions: 540,
            correct_answers: 459,
            overall_score: 85,
            study_time_hours: 24,
            daily_streak: 8,
            longest_streak: 15,
            weak_topics: ['UT3', 'UT7', 'UT9'],
            strong_topics: ['UT1', 'UT2', 'UT4'],
            last_exam_date: new Date('2025-01-14'),
            created_at: new Date('2024-12-01')
        };

        this.userProgress = {
            'UT1': { correct: 48, total: 50, percentage: 96, trend: 'up' },
            'UT2': { correct: 44, total: 48, percentage: 92, trend: 'stable' },
            'UT3': { correct: 35, total: 52, percentage: 67, trend: 'down' },
            'UT4': { correct: 42, total: 45, percentage: 93, trend: 'up' },
            'UT5': { correct: 38, total: 42, percentage: 90, trend: 'up' },
            'UT6': { correct: 41, total: 46, percentage: 89, trend: 'stable' },
            'UT7': { correct: 32, total: 48, percentage: 67, trend: 'down' },
            'UT8': { correct: 39, total: 44, percentage: 89, trend: 'up' },
            'UT9': { correct: 31, total: 47, percentage: 66, trend: 'down' },
            'UT10': { correct: 43, total: 49, percentage: 88, trend: 'stable' },
            'UT11': { correct: 40, total: 44, percentage: 91, trend: 'up' }
        };

        this.userAchievements = [
            'first_exam', 'exam_master', 'week_streak', 'navigation_expert', 'night_owl'
        ];

        this.examHistory = [
            { date: '2025-01-14', score: 87, time_minutes: 65 },
            { date: '2025-01-12', score: 82, time_minutes: 72 },
            { date: '2025-01-10', score: 89, time_minutes: 58 },
            { date: '2025-01-08', score: 76, time_minutes: 80 },
            { date: '2025-01-06', score: 91, time_minutes: 62 },
            { date: '2025-01-04', score: 84, time_minutes: 68 },
            { date: '2025-01-02', score: 79, time_minutes: 75 }
        ];
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

        // Render achievements
        this.renderAchievements();

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
    }

    renderRadarChart() {
        const ctx = document.getElementById('radarChart').getContext('2d');

        const topicNames = Object.keys(this.userProgress);
        const topicScores = topicNames.map(topic => this.userProgress[topic].percentage);

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

    showAchievementDetail(achievement, isUnlocked) {
        const modal = new bootstrap.Modal(document.createElement('div'));
        // Implementation for achievement detail modal
        console.log('Achievement detail:', achievement, isUnlocked);
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
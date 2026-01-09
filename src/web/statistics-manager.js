/**
 * StatisticsManager - Comprehensive statistics and gamification system for PER exams
 */
class StatisticsManager {
    constructor() {
        // Usar configuración de entorno automática
        this.API_BASE = window.API_BASE !== undefined ? window.API_BASE : '/api'; // Fallback por seguridad
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

        // Topic configuration - Unidades Temáticas oficiales del PER según ut_configuration
        this.topics = {
            'UT1': { name: 'Nomenclatura náutica', color: '#3b82f6' },
            'UT2': { name: 'Elementos de amarre y fondeo', color: '#10b981' },
            'UT3': { name: 'Seguridad', color: '#f59e0b' },
            'UT4': { name: 'Legislación', color: '#ef4444' },
            'UT5': { name: 'Balizamiento', color: '#8b5cf6' },
            'UT6': { name: 'Reglamento RIPA', color: '#06b6d4' },
            'UT7': { name: 'Maniobra', color: '#84cc16' },
            'UT8': { name: 'Emergencias en la mar', color: '#f97316' },
            'UT9': { name: 'Meteorología', color: '#ec4899' },
            'UT10': { name: 'Teoría de la navegación', color: '#6b7280' },
            'UT11': { name: 'Carta de navegación', color: '#14b8a6' }
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
        return localStorage.getItem('token') || localStorage.getItem('authToken') || null;
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
            const statsResponse = await fetch(`${this.API_BASE}/user-stats`, {
                headers: headers
            });

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                this.processRealUserStats(statsData);
            } else {
                throw new Error('Failed to load user statistics');
            }

            // Cargar logros desbloqueados desde el backend si existe el endpoint
            // Si no existe, calcular desde los datos locales
            try {
                const achievementsResponse = await fetch(`${this.API_BASE}/statistics/achievements/${this.userId}`, {
                    headers: headers
                });
                
                if (achievementsResponse.ok) {
                    const achievementsData = await achievementsResponse.json();
                    this.userAchievements = achievementsData.unlocked.map(a => a.achievement_id) || [];
                } else {
                    // Si no hay endpoint, calcular desde datos locales
                    this.userAchievements = [];
                }
            } catch (e) {
                // Si el endpoint no existe o hay error, calcular desde datos locales
                console.log('No se pudieron cargar logros del backend, se calcularán localmente');
                this.userAchievements = [];
            }

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
            // Obtener nombre del tema, o usar el código UT si no existe en el mapeo
            const topicName = this.topics[topic]?.name || topic;
            badge.textContent = `${topic} - ${topicName}`;
            weakAreasList.appendChild(badge);
        });
    }

    renderEvolutionChart() {
        const ctx = document.getElementById('evolutionChart').getContext('2d');

        // Los datos vienen ordenados DESC (más recientes primero), necesitamos invertirlos
        // para mostrar evolución temporal de izquierda a derecha (pasado → presente)
        const sortedHistory = [...this.examHistory].reverse();

        // Separar exámenes y tests de estudio
        const exams = sortedHistory.filter(item => item.exam_type === 'exam');
        const studyTests = sortedHistory.filter(item => item.exam_type === 'study_test');

        // Obtener todas las fechas únicas ordenadas para el eje X
        const allDates = sortedHistory.map(exam => {
            if (!exam.date) return null;
            try {
                const date = new Date(exam.date);
                return date.toISOString().split('T')[0]; // YYYY-MM-DD para comparación
            } catch (e) {
                return null;
            }
        }).filter(d => d !== null);

        const uniqueDates = [...new Set(allDates)].sort();
        
        // Formatear fechas para mostrar en el eje X (DD/MM/YYYY)
        const formattedDates = uniqueDates.map(dateStr => {
            try {
                const date = new Date(dateStr);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            } catch (e) {
                return dateStr;
            }
        });

        // Crear arrays de scores para cada fecha, usando null si no hay dato
        const examScores = uniqueDates.map(dateStr => {
            const exam = exams.find(e => {
                if (!e.date) return false;
                const examDate = new Date(e.date).toISOString().split('T')[0];
                return examDate === dateStr;
            });
            return exam ? exam.score : null;
        });

        const studyTestScores = uniqueDates.map(dateStr => {
            const test = studyTests.find(t => {
                if (!t.date) return false;
                const testDate = new Date(t.date).toISOString().split('T')[0];
                return testDate === dateStr;
            });
            return test ? test.score : null;
        });

        try {
            this.charts.evolution = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: formattedDates,
                    datasets: [
                        {
                            label: 'Exámenes',
                            data: examScores,
                            borderColor: '#4f46e5',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            fill: false,
                            tension: 0.4,
                            pointRadius: 7,
                            pointHoverRadius: 9,
                            pointStyle: 'circle',
                            borderWidth: 2
                        },
                        {
                            label: 'Tests de Estudio',
                            data: studyTestScores,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: false,
                            tension: 0.4,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            pointStyle: 'rect',
                            borderWidth: 2,
                            borderDash: [5, 5]
                        }
                    ]
                },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y + '%';
                                } else {
                                    label += 'Sin dato';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
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
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
        } catch (error) {
            console.error('Error renderizando gráfico de evolución:', error);
        }
    }

    renderRadarChart() {
        const ctx = document.getElementById('radarChart').getContext('2d');

        // Obtener códigos UT y sus datos
        const topicCodes = Object.keys(this.userProgress);
        const topicScores = topicCodes.map(topic => this.userProgress[topic].percentage);
        
        // Convertir códigos UT a nombres legibles para las etiquetas
        const topicLabels = topicCodes.map(topicCode => {
            const topicInfo = this.topics[topicCode];
            if (topicInfo && topicInfo.name) {
                // Mostrar código UT y nombre corto (ej: "UT3 - Navegación")
                return `${topicCode}\n${topicInfo.name.split(' ')[0]}`; // Solo primera palabra para no sobrecargar
            }
            return topicCode; // Fallback al código si no hay información
        });

        // Ordenar por código UT numérico (no alfabético) para mantener consistencia
        const sortedIndices = topicCodes.map((code, index) => ({ code, index, score: topicScores[index] }))
            .sort((a, b) => {
                // Extraer número de UT (ej: "UT3" -> 3, "UT11" -> 11)
                // Usar replace con regex /UT/i para ser case-insensitive
                const numA = parseInt(a.code.replace(/UT/i, '')) || 0;
                const numB = parseInt(b.code.replace(/UT/i, '')) || 0;
                return numA - numB;
            });

        const sortedLabels = sortedIndices.map(item => topicLabels[item.index]);
        const sortedScores = sortedIndices.map(item => item.score);
        const sortedCodes = sortedIndices.map(item => item.code);

        try {
            this.charts.radar = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: sortedLabels,
                datasets: [{
                    label: 'Dominio (%)',
                    data: sortedScores,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#10b981',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const index = context.dataIndex;
                                const code = sortedCodes[index];
                                const percentage = context.parsed.r;
                                return `${code}: ${percentage}%`;
                            }
                        }
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
                        },
                        pointLabels: {
                            font: {
                                size: 11
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

        // Ordenar temas por número UT (numérico, no alfabético)
        const sortedTopics = Object.keys(this.userProgress).sort((a, b) => {
            // Extraer número de UT (ej: "UT3" -> 3, "UT11" -> 11)
            const numA = parseInt(a.replace(/UT/i, '')) || 0;
            const numB = parseInt(b.replace(/UT/i, '')) || 0;
            return numA - numB;
        });

        sortedTopics.forEach(topicId => {
            const topic = this.userProgress[topicId];
            const topicInfo = this.topics[topicId];

            const topicItem = document.createElement('div');
            topicItem.className = 'topic-item';

            const trendIcon = topic.trend === 'up' ? 'fa-arrow-up text-success' :
                            topic.trend === 'down' ? 'fa-arrow-down text-danger' :
                            'fa-minus text-muted';

            topicItem.innerHTML = `
                <div class="topic-info">
                    <div class="topic-name">${topicId} - ${topicInfo ? topicInfo.name : 'Sin nombre'}</div>
                    <div class="topic-stats">
                        ${topic.correct}/${topic.total} preguntas correctas
                        <i class="fas ${trendIcon} ms-2"></i>
                    </div>
                </div>
                <div class="topic-progress">
                    <div class="progress">
                        <div class="progress-bar" style="width: ${topic.percentage}%; background-color: ${topicInfo ? topicInfo.color : '#6b7280'}"></div>
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
            const isStudyTest = exam.exam_type === 'study_test';
            const examTypeClass = isStudyTest ? 'exam-type-study-test' : 'exam-type-exam';
            examElement.className = `exam-history-item ${exam.passed ? 'passed' : 'failed'} ${examTypeClass}`;
            
            const statusText = exam.passed ? 'Aprobado' : 'Suspenso';
            const statusClass = exam.passed ? 'passed' : 'failed';
            const typeLabel = isStudyTest ? 'Test Estudio' : 'Examen';
            const typeIcon = isStudyTest ? 'fa-book-reader' : 'fa-clipboard-check';
            const typeBadgeColor = isStudyTest ? '#10b981' : '#4f46e5';
            
            // Format date to local timezone
            let formattedDate = 'Fecha no disponible';
            if (exam.date) {
                try {
                    const date = new Date(exam.date);
                    formattedDate = date.toLocaleString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch (e) {
                    formattedDate = exam.date;
                }
            }

            examElement.innerHTML = `
                <div class="exam-date">
                    <i class="fas fa-calendar-alt me-1"></i>
                    ${formattedDate}
                </div>
                
                <div class="exam-type-badge" style="background-color: ${typeBadgeColor};">
                    <i class="fas ${typeIcon}"></i>
                    <span>${typeLabel}</span>
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
                    <div class="exam-actions" style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${exam.incorrect_answers > 0 ? `
                            <button class="btn btn-sm btn-outline-danger" onclick="window.statisticsManager.viewFailedQuestions('${exam.exam_id}')">
                                <i class="fas fa-eye me-1"></i>Ver ${exam.incorrect_answers} Fallos
                            </button>
                        ` : ''}
                        ${!isStudyTest ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="window.statisticsManager.repeatExam('${exam.exam_id}')" title="Repetir este examen con las mismas preguntas">
                                <i class="fas fa-redo me-1"></i>Repetir Examen
                            </button>
                        ` : ''}
                    </div>
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
        if (this.userStats.last_exam_date) {
            try {
                const lastExamDate = new Date(this.userStats.last_exam_date);
                const daysSinceLastExam = Math.floor((new Date() - lastExamDate) / (1000 * 60 * 60 * 24));
                
                if (daysSinceLastExam > 3) {
                    recommendations.push({
                        title: 'Realiza un nuevo examen',
                        description: `Han pasado ${daysSinceLastExam} días desde tu último examen. Es hora de poner a prueba tus conocimientos.`,
                        priority: 'medium',
                        icon: 'fas fa-clipboard-check'
                    });
                }
            } catch (e) {
                console.error('Error calculando días desde último examen:', e);
            }
        } else if (this.userStats.exams_completed === 0) {
            // Si nunca ha hecho un examen
            recommendations.push({
                title: 'Realiza tu primer examen',
                description: 'Comienza tu camino realizando tu primer examen para evaluar tu nivel inicial.',
                priority: 'high',
                icon: 'fas fa-play-circle'
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
        
        // Agregar nuevos logros desbloqueados y guardarlos en el backend
        if (unlockedAchievements.length > 0) {
            unlockedAchievements.forEach(achievement => {
                this.userAchievements.push(achievement.id);
            });
            
            // Intentar guardar en el backend (si el endpoint existe)
            this.saveUnlockedAchievements(unlockedAchievements);
            
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
        // Verificar logros especiales basados en examHistory
        if (!this.examHistory || this.examHistory.length === 0) {
            return false;
        }

        // Búho Nocturno: completar examen después de medianoche (00:00-06:00)
        if (condition.night_exam) {
            return this.examHistory.some(exam => {
                if (!exam.date) return false;
                try {
                    const examDate = new Date(exam.date);
                    const hour = examDate.getHours();
                    return hour >= 0 && hour < 6; // Entre 00:00 y 06:00
                } catch (e) {
                    return false;
                }
            });
        }

        // Demonio de la Velocidad: completar examen en menos de X minutos
        if (condition.fast_completion) {
            const maxMinutes = condition.fast_completion;
            return this.examHistory.some(exam => {
                const timeMinutes = exam.time_minutes || 0;
                return timeMinutes > 0 && timeMinutes <= maxMinutes;
            });
        }

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

    async saveUnlockedAchievements(achievements) {
        // Intentar guardar logros desbloqueados en el backend
        try {
            const authToken = this.getCurrentAuthToken();
            if (!authToken) return;

            for (const achievement of achievements) {
                try {
                    await fetch(`${this.API_BASE}/statistics/achievements/${this.userId}/unlock`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            achievement_id: achievement.id,
                            xp: achievement.xp
                        })
                    });
                } catch (e) {
                    // Si el endpoint no existe, solo loguear (no es crítico)
                    console.log(`Endpoint de logros no disponible, logro ${achievement.id} solo en memoria`);
                }
            }
        } catch (error) {
            console.error('Error guardando logros:', error);
            // No es crítico, los logros seguirán funcionando localmente
        }
    }

    showAchievementDetail(achievement, isUnlocked) {
        const modal = new bootstrap.Modal(document.createElement('div'));
        // Implementation for achievement detail modal
    }

    showResetConfirmModal() {
        const modalElement = document.getElementById('resetStatsModal');
        if (!modalElement) {
            console.error('Modal de reseteo no encontrado');
            return;
        }

        const modal = new bootstrap.Modal(modalElement);
        const confirmInput = document.getElementById('resetConfirmText');
        const confirmBtn = document.getElementById('confirmResetBtn');
        const feedback = document.getElementById('resetConfirmFeedback');

        // Reset estado inicial
        confirmInput.value = '';
        confirmInput.classList.remove('is-invalid');
        confirmBtn.disabled = true;
        feedback.textContent = '';

        // Validar input en tiempo real
        confirmInput.addEventListener('input', () => {
            const inputValue = confirmInput.value.trim().toLowerCase();
            const requiredText = 'borrar';

            if (inputValue === requiredText) {
                confirmInput.classList.remove('is-invalid');
                confirmInput.classList.add('is-valid');
                confirmBtn.disabled = false;
                feedback.textContent = '';
            } else if (inputValue.length > 0) {
                confirmInput.classList.remove('is-valid');
                confirmInput.classList.add('is-invalid');
                confirmBtn.disabled = true;
                feedback.textContent = `Debes escribir exactamente "${requiredText}" para confirmar`;
            } else {
                confirmInput.classList.remove('is-invalid', 'is-valid');
                confirmBtn.disabled = true;
                feedback.textContent = '';
            }
        });

        // Confirmar reseteo
        confirmBtn.addEventListener('click', async () => {
            if (confirmInput.value.trim().toLowerCase() === 'borrar') {
                await this.resetUserStatistics();
                modal.hide();
            }
        });

        // Limpiar al cerrar el modal
        modalElement.addEventListener('hidden.bs.modal', () => {
            confirmInput.value = '';
            confirmInput.classList.remove('is-invalid', 'is-valid');
            confirmBtn.disabled = true;
            feedback.textContent = '';
        }, { once: true });

        modal.show();
    }

    async resetUserStatistics() {
        const authToken = this.getCurrentAuthToken();
        if (!authToken) {
            this.showError('No estás autenticado. Por favor, inicia sesión.');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/user/reset-statistics`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                
                // Mostrar mensaje de éxito
                this.showSuccess('Estadísticas reseteadas correctamente. Recargando página...');
                
                // Recargar la página después de 2 segundos
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                const error = await response.json();
                this.showError(`Error al resetear estadísticas: ${error.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error reseteando estadísticas:', error);
            this.showError(`Error al resetear estadísticas: ${error.message}`);
        }
    }

    showSuccess(message) {
        // Crear notificación de éxito
        const notification = document.createElement('div');
        notification.className = 'alert alert-success alert-dismissible fade show position-fixed';
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    async viewFailedQuestions(examId) {
        try {
            console.log('🔍 Obteniendo preguntas falladas del examen:', examId);

            // Obtener preguntas falladas del examen
            const response = await fetch(`${this.API_BASE}/user/exam/${examId}/failed-questions`, {
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

    async repeatExam(examId) {
        try {
            console.log('🔄 Repitiendo examen:', examId);

            // Mostrar mensaje de carga
            this.showSuccess('Generando nuevo examen con las mismas preguntas...');

            // Llamar al endpoint para repetir el examen
            const response = await fetch(`${this.API_BASE}/exams/${examId}/repeat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getCurrentAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success && data.exam_id) {
                console.log('✅ Examen repetido exitosamente. Nuevo exam_id:', data.exam_id);
                
                // Redirigir a la página de examen unificada
                window.location.href = `exam-unified.html?exam_id=${data.exam_id}`;
            } else {
                throw new Error('No se pudo generar el nuevo examen');
            }

        } catch (error) {
            console.error('❌ Error repitiendo examen:', error);
            this.showError(`Error al repetir el examen: ${error.message}`);
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
            const response = await fetch(`${this.API_BASE}/statistics/exam-completed`, {
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
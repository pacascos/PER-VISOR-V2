/**
 * Question Statistics Dashboard - UT Analysis (v2)
 * Dashboard para visualizar estadísticas de preguntas agrupadas por UT
 */

class QuestionStatisticsDashboard {
    constructor() {
        this.apiBase = window.API_BASE || '/api';
        this.utStats = [];
        this.chart = null;
        
        console.log('🚀 Inicializando Question Statistics Dashboard v2...');
        this.init();
    }

    init() {
        this.loadData();
    }

    async loadData() {
        try {
            console.log('📊 Cargando estadísticas por UT...');
            
            const response = await fetch(`${this.apiBase}/question-stats/by-ut`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📊 Datos recibidos:', data);
            
            if (data.success) {
                this.utStats = data.ut_stats;
                this.renderDashboard();
            } else {
                throw new Error('Error en la respuesta del servidor');
            }

        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            this.showNoData();
        }
    }

    renderDashboard() {
        console.log('📊 Renderizando dashboard con', this.utStats.length, 'UTs');
        
        // Hide loading, show content
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';

        this.renderSummaryCards();
        this.renderChart();
        this.renderUTCards();
    }

    renderSummaryCards() {
        const summaryCards = document.getElementById('summary-cards');
        
        if (!summaryCards) {
            console.error('❌ Elemento summary-cards no encontrado');
            return;
        }
        
        // Calculate totals
        const totalQuestions = this.utStats.reduce((sum, ut) => sum + ut.total_questions_available, 0);
        const totalAttempts = this.utStats.reduce((sum, ut) => sum + ut.total_attempts, 0);
        const totalCorrect = this.utStats.reduce((sum, ut) => sum + ut.total_correct, 0);
        const avgSuccessRate = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

        summaryCards.innerHTML = `
            <div class="summary-card">
                <h3>${totalQuestions.toLocaleString()}</h3>
                <p>Preguntas Disponibles</p>
            </div>
            <div class="summary-card">
                <h3>${totalAttempts.toLocaleString()}</h3>
                <p>Intentos Totales</p>
            </div>
            <div class="summary-card">
                <h3>${totalCorrect.toLocaleString()}</h3>
                <p>Respuestas Correctas</p>
            </div>
            <div class="summary-card">
                <h3>${avgSuccessRate}%</h3>
                <p>Tasa de Éxito Global</p>
            </div>
        `;
    }

    renderChart() {
        const canvas = document.getElementById('attemptsChart');
        
        if (!canvas) {
            console.error('❌ Elemento attemptsChart no encontrado');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }

        const labels = this.utStats.map(ut => `UT${ut.ut_number}`);
        const correct = this.utStats.map(ut => ut.total_correct);
        const incorrect = this.utStats.map(ut => ut.total_incorrect);

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Correctas',
                        data: correct,
                        backgroundColor: '#28a745',
                        borderColor: '#20c997',
                        borderWidth: 1
                    },
                    {
                        label: 'Incorrectas',
                        data: incorrect,
                        backgroundColor: '#dc3545',
                        borderColor: '#fd7e14',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#ddd',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Unidades Temáticas',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Intentos',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            precision: 0,
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                }
            }
        });
    }

    renderUTCards() {
        const utCards = document.getElementById('ut-cards');
        
        if (!utCards) {
            console.error('❌ Elemento ut-cards no encontrado');
            return;
        }
        
        utCards.innerHTML = this.utStats.map(ut => this.renderUTCard(ut)).join('');
    }

    renderUTCard(ut) {
        const successRate = parseFloat(ut.avg_success_rate) || 0;
        const successClass = successRate >= 70 ? '' : successRate >= 50 ? 'medium' : 'low';
        
        const topFailedHTML = ut.top_failed_questions.length > 0 
            ? ut.top_failed_questions.map(q => this.renderFailedQuestion(q)).join('')
            : '<p class="text-muted">No hay datos de preguntas falladas</p>';

        return `
            <div class="ut-card">
                <div class="ut-header">
                    <div class="ut-number">UT ${ut.ut_number}</div>
                    <div class="ut-name">${ut.ut_name}</div>
                </div>
                <div class="ut-body">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${ut.total_questions_available.toLocaleString()}</div>
                            <div class="stat-label">Preguntas Disponibles</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${ut.questions_with_stats}</div>
                            <div class="stat-label">Con Estadísticas</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${ut.total_attempts}</div>
                            <div class="stat-label">Intentos Totales</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${ut.total_correct}</div>
                            <div class="stat-label">Correctas</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${ut.total_incorrect}</div>
                            <div class="stat-label">Incorrectas</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value success-rate ${successClass}">${successRate}%</div>
                            <div class="stat-label">Tasa de Éxito</div>
                        </div>
                    </div>
                    
                    <div class="failed-questions">
                        <h6>
                            <i class="fas fa-exclamation-triangle"></i>
                            Top 5 Preguntas Más Falladas
                        </h6>
                        ${topFailedHTML}
                    </div>
                </div>
            </div>
        `;
    }

    renderFailedQuestion(question) {
        const failureRate = parseFloat(question.failure_rate) || 0;
        
        return `
            <div class="question-item">
                <div class="question-text">
                    ${question.texto_pregunta}
                </div>
                <div class="question-stats">
                    <div>
                        <span class="failure-badge">${failureRate}% fallos</span>
                        <span class="ms-2">${question.total_appearances} intentos</span>
                    </div>
                    <button class="view-question-btn" onclick="viewQuestion('${question.question_id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </div>
            </div>
        `;
    }

    showNoData() {
        const loading = document.getElementById('loading');
        const noData = document.getElementById('no-data');
        
        if (loading) loading.style.display = 'none';
        if (noData) noData.style.display = 'block';
    }
}

// Global functions
function viewQuestion(questionId) {
    // Open question in question bank
    const url = `visor-nueva-arquitectura.html?question_id=${questionId}`;
    window.open(url, '_blank');
}


// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM cargado, inicializando Question Statistics Dashboard v2...');
    new QuestionStatisticsDashboard();
});

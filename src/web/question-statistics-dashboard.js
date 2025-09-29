/**
 * Question Statistics Dashboard
 * Dashboard para visualizar estadísticas detalladas de preguntas
 */

class QuestionStatisticsDashboard {
    constructor() {
        this.apiBase = window.API_BASE || '/api'; // Fallback por seguridad
        this.currentCategory = 'all';
        this.viewMode = 'global'; // 'global' o 'personal'
        this.currentUserId = null;
        this.rankingsData = {};
        this.charts = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
    }

    bindEvents() {
        // Event listeners para botones de categoría
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectCategory(e.target.dataset.category);
            });
        });

        // Event listener para toggle de vista
        const viewToggle = document.getElementById('viewToggle');
        if (viewToggle) {
            viewToggle.addEventListener('change', (e) => {
                this.viewMode = e.target.checked ? 'personal' : 'global';
                this.updateViewMode();
                this.loadInitialData();
            });
        }

        // Obtener currentUserId si está disponible
        this.currentUserId = window.currentUserId || localStorage.getItem('currentUserId');
    }

    updateViewMode() {
        const viewLabel = document.getElementById('viewModeLabel');
        const titleElement = document.querySelector('.header h1');
        
        if (viewLabel) {
            viewLabel.textContent = this.viewMode === 'personal' ? 'Vista Personal' : 'Vista Global';
        }
        
        if (titleElement) {
            titleElement.textContent = this.viewMode === 'personal' 
                ? 'Mis Estadísticas de Preguntas' 
                : 'Estadísticas de Preguntas';
        }
    }

    selectCategory(category) {
        // Actualizar botones activos
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        this.currentCategory = category;
        this.loadRankings();
    }

    async loadInitialData() {
        try {
            await this.loadGeneralStats();
            await this.loadRankings();
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.showError('Error cargando datos iniciales');
        }
    }

    async loadGeneralStats() {
        try {
            let response;
            
            if (this.viewMode === 'personal' && this.currentUserId) {
                response = await fetch(`${this.apiBase}/question-stats/user/${this.currentUserId}`);
            } else {
                response = await fetch(`${this.apiBase}/question-stats/general`);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                const stats = this.viewMode === 'personal' ? data.user_stats : data.general_stats;
                const mostFailed = data.most_failed_question;
                
                this.updateGeneralStats({
                    totalQuestions: stats.total_questions || 0,
                    mostFailed: mostFailed ? mostFailed.total_incorrect_answers : 0,
                    errorRate: stats.avg_success_rate ? `${(100 - parseFloat(stats.avg_success_rate)).toFixed(1)}%` : '0%',
                    avgTime: stats.avg_time_seconds ? `${Math.round(parseFloat(stats.avg_time_seconds))}s` : '0s'
                });
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            // Mostrar datos de ejemplo en caso de error
            this.updateGeneralStats({
                totalQuestions: 0,
                mostFailed: 0,
                errorRate: '0%',
                avgTime: '0s'
            });
        }
    }

    updateGeneralStats(stats) {
        document.getElementById('totalQuestions').textContent = stats.totalQuestions;
        document.getElementById('mostFailed').textContent = stats.mostFailed;
        document.getElementById('errorRate').textContent = stats.errorRate;
        document.getElementById('avgTime').textContent = stats.avgTime;
    }

    async loadRankings() {
        try {
            this.showLoading();
            
            if (this.viewMode === 'personal' && this.currentUserId) {
                await this.loadPersonalRankings();
            } else if (this.currentCategory === 'all') {
                await this.loadAllCategoriesRankings();
            } else {
                await this.loadCategoryRankings(this.currentCategory);
            }
        } catch (error) {
            console.error('Error cargando rankings:', error);
            this.showError('Error cargando rankings de preguntas');
        }
    }

    async loadPersonalRankings() {
        try {
            const response = await fetch(`${this.apiBase}/question-stats/user/${this.currentUserId}/rankings`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.displayRankings(data.rankings);
        } catch (error) {
            console.error(`Error cargando rankings personales:`, error);
            this.showError('Error cargando tus estadísticas personales');
        }
    }

    async loadAllCategoriesRankings() {
        // Cargar rankings de todas las categorías
        const categories = [
            'Nomenclatura náutica',
            'Elementos de amarre y fondeo',
            'Seguridad',
            'Legislación',
            'Balizamiento',
            'Reglamento (RIPA)',
            'Maniobra y navegación',
            'Emergencias en la mar',
            'Meteorología',
            'Teoría de la navegación',
            'Carta de navegación'
        ];

        const allRankings = [];
        
        for (const category of categories) {
            try {
                const response = await fetch(`${this.apiBase}/question-stats/rankings/${encodeURIComponent(category)}`);
                if (response.ok) {
                    const data = await response.json();
                    allRankings.push(...data.rankings.slice(0, 5)); // Top 5 de cada categoría
                }
            } catch (error) {
                console.warn(`Error cargando rankings para ${category}:`, error);
            }
        }

        // Ordenar por failure_rate descendente
        allRankings.sort((a, b) => parseFloat(b.failure_rate) - parseFloat(a.failure_rate));
        
        this.displayRankings(allRankings.slice(0, 20)); // Top 20 global
    }

    async loadCategoryRankings(category) {
        try {
            const response = await fetch(`${this.apiBase}/question-stats/rankings/${encodeURIComponent(category)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.displayRankings(data.rankings);
        } catch (error) {
            console.error(`Error cargando rankings para ${category}:`, error);
            this.showError(`Error cargando rankings para ${category}`);
        }
    }

    displayRankings(rankings) {
        const content = document.getElementById('content');
        
        if (!rankings || rankings.length === 0) {
            content.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-chart-line"></i>
                    <h4>No hay datos disponibles</h4>
                    <p>No se encontraron estadísticas para esta categoría</p>
                </div>
            `;
            return;
        }

        let html = '<div class="ranking-container">';
        
        rankings.forEach((item, index) => {
            const position = index + 1;
            const failureRate = parseFloat(item.failure_rate) || 0;
            const successRate = 100 - failureRate;
            
            html += `
                <div class="ranking-item">
                    <div class="ranking-position">${position}</div>
                    <div class="ranking-content">
                        <div class="ranking-question">
                            ${this.truncateText(item.texto_pregunta, 100)}
                        </div>
                        <div class="ranking-stats">
                            <div class="ranking-stat">
                                <i class="fas fa-times-circle"></i>
                                <span class="failure-rate">${failureRate.toFixed(1)}% fallos</span>
                            </div>
                            <div class="ranking-stat">
                                <i class="fas fa-check-circle"></i>
                                <span class="success-rate">${successRate.toFixed(1)}% aciertos</span>
                            </div>
                            <div class="ranking-stat">
                                <i class="fas fa-chart-bar"></i>
                                <span>${item.total_attempts || 0} intentos</span>
                            </div>
                            <div class="ranking-stat">
                                <i class="fas fa-tag"></i>
                                <span>${item.category}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        content.innerHTML = html;
    }

    showLoading() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner"></i>
                <p>Cargando rankings...</p>
            </div>
        `;
    }

    showError(message) {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    truncateText(text, maxLength) {
        if (!text) return 'Sin texto';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Método para actualizar rankings automáticamente
    startAutoRefresh(intervalMinutes = 5) {
        setInterval(() => {
            this.loadRankings();
        }, intervalMinutes * 60 * 1000);
    }

    // Método para exportar datos
    exportData() {
        const data = {
            category: this.currentCategory,
            rankings: this.rankingsData,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `question-statistics-${this.currentCategory}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Inicializar dashboard cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.questionStatsDashboard = new QuestionStatisticsDashboard();
    
    // Iniciar actualización automática cada 5 minutos
    window.questionStatsDashboard.startAutoRefresh(5);
});

// Función global para actualizar rankings (llamada desde el botón)
function loadRankings() {
    if (window.questionStatsDashboard) {
        window.questionStatsDashboard.loadRankings();
    }
}

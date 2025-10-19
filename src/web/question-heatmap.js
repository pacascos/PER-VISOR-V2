/**
 * Question Heatmap Controller
 * Visualización de frecuencia de preguntas por UT
 */

class QuestionHeatmap {
    constructor() {
        this.currentFilter = 'all';
        this.heatmapData = null;
        this.tooltip = null;
        
        this.init();
    }

    async init() {
        console.log('🔥 Inicializando Question Heatmap...');
        
        this.setupEventListeners();
        this.createTooltip();
        await this.loadData();
    }

    setupEventListeners() {
        // Filtros
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.changeFilter(filter);
            });
        });

        // Click en cuadrado para ver pregunta
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('question-square')) {
                const questionId = e.target.getAttribute('data-question-id');
                this.openQuestionInBank(questionId);
            }
        });
    }

    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tooltip';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);

        // Event listeners para mostrar/ocultar tooltip
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('question-square')) {
                this.showTooltip(e.target, e);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('question-square')) {
                this.hideTooltip();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (e.target.classList.contains('question-square')) {
                this.updateTooltipPosition(e);
            }
        });
    }

    showTooltip(element, event) {
        const questionId = element.getAttribute('data-question-id');
        const questionData = this.getQuestionData(questionId);
        
        if (questionData) {
            const frequency = questionData.frequency;
            const successRate = parseFloat(questionData.success_rate) || 0;
            
            this.tooltip.innerHTML = `
                <strong>Pregunta ${questionData.numero_pregunta}</strong><br>
                <strong>Frecuencia:</strong> ${frequency} veces<br>
                <strong>Éxito:</strong> ${successRate.toFixed(1)}%<br>
                <strong>Convocatoria:</strong> ${questionData.convocatoria}<br>
                <em>Click para ver en banco</em>
            `;
            
            this.updateTooltipPosition(event);
            this.tooltip.style.display = 'block';
        }
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    updateTooltipPosition(event) {
        const x = event.clientX + 10;
        const y = event.clientY - 10;
        
        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = y + 'px';
    }

    getQuestionData(questionId) {
        if (!this.heatmapData) return null;
        
        for (const categoryName in this.heatmapData) {
            const ut = this.heatmapData[categoryName];
            const question = ut.questions.find(q => q.id === questionId);
            if (question) return question;
        }
        return null;
    }

    async loadData(filter = 'all') {
        try {
            console.log(`📊 Cargando datos del heatmap (filtro: ${filter})...`);

            // Usar el filtro seleccionado (aunque siempre devuelve estadísticas globales)
            const apiUrl = window.API_BASE || '/api';
            const response = await fetch(`${apiUrl}/question-heatmap/data?filter=${filter}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Error desconocido');
            }

            this.heatmapData = result.data;
            this.renderHeatmap(result.data, result.total_stats);
            this.updateStatsSummary(result.total_stats, filter);
            
            console.log('✅ Datos del heatmap cargados correctamente');

        } catch (error) {
            console.error('❌ Error cargando datos del heatmap:', error);
            this.showError(`Error cargando datos: ${error.message}`);
        }
    }

    changeFilter(newFilter) {
        console.log(`🔄 Cambiando filtro a: ${newFilter}`);
        
        // Actualizar botones
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${newFilter}"]`).classList.add('active');
        
        this.currentFilter = newFilter;
        this.loadData(newFilter);
    }

    renderHeatmap(data, totalStats) {
        const container = document.getElementById('heatmapContent');
        const loadingMessage = document.getElementById('loadingMessage');
        
        // Ocultar loading y mostrar contenido
        loadingMessage.style.display = 'none';
        container.style.display = 'block';
        
        // Generar HTML del heatmap compacto
        let html = '<div class="compact-heatmap">';
        
        // Crear array de entradas ordenadas por ut_number
        const sortedEntries = Object.entries(data).sort((a, b) => a[1].ut_number - b[1].ut_number);
        
        sortedEntries.forEach(([categoryKey, ut], index) => {
            const isLast = index === sortedEntries.length - 1;
            html += this.renderUTSectionCompact(ut, isLast, categoryKey);
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        console.log(`✅ Heatmap compacto renderizado: ${totalStats.total_questions} preguntas`);
    }

    renderUTSectionCompact(ut, isLast, categoryKey) {
        // Usar categoryKey (la clave del objeto) o ut_name como fallback
        const categoryName = categoryKey || ut.ut_name || ut.category_name;
        const utName = this.getUTDisplayName(categoryName);
        
        let html = `
            <div class="ut-section-compact" style="border-bottom: ${isLast ? 'none' : '1px solid rgba(102, 126, 234, 0.2)'};">
                <div class="ut-title-compact">
                    UT${ut.ut_number}: ${utName} (${ut.total_questions})
                </div>
                <div class="questions-grid-compact">
        `;
        
        // Renderizar cuadrados de preguntas
        ut.questions.forEach(question => {
            html += `
                <div class="question-square ${question.css_class}" 
                     data-question-id="${question.id}"
                     title="Pregunta ${question.numero_pregunta} - Frecuencia: ${question.frequency}">
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    getUTDisplayName(categoryName) {
        const utNames = {
            'Nomenclatura náutica': 'Nomenclatura náutica',
            'Teoría de la navegación': 'Teoría de la navegación', 
            'Carta de navegación': 'Carta de navegación',
            'Meteorología': 'Meteorología',
            'Seguridad': 'Seguridad',
            'Legislación': 'Legislación',
            'Reglamento (RIPA)': 'Reglamento (RIPA)',
            'Balizamiento': 'Balizamiento',
            'Maniobra y navegación': 'Maniobra y navegación',
            'Emergencias en la mar': 'Emergencias en la mar',
            'Elementos de amarre y fondeo': 'Elementos de amarre y fondeo'
        };
        
        return utNames[categoryName] || categoryName;
    }

    updateStatsSummary(totalStats, filter) {
        const statsContainer = document.getElementById('statsSummary');
        
        const neverSeenPct = ((totalStats.never_seen / totalStats.total_questions) * 100).toFixed(1);
        const seenOncePct = ((totalStats.seen_once / totalStats.total_questions) * 100).toFixed(1);
        const seenMultiplePct = ((totalStats.seen_multiple / totalStats.total_questions) * 100).toFixed(1);
        
        // Determinar el texto del filtro
        let filterText = '';
        switch(filter) {
            case 'exams':
                filterText = 'Solo Exámenes';
                break;
            case 'tests':
                filterText = 'Solo Tests';
                break;
            default:
                filterText = 'Todos (Exámenes + Tests)';
        }
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${totalStats.total_questions}</div>
                <div class="stat-label">Total Preguntas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalStats.never_seen}</div>
                <div class="stat-label">Nunca vistas (${neverSeenPct}%)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalStats.seen_once}</div>
                <div class="stat-label">Vistas 1 vez (${seenOncePct}%)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalStats.seen_multiple}</div>
                <div class="stat-label">Vistas 2+ veces (${seenMultiplePct}%)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalStats.max_frequency}</div>
                <div class="stat-label">Máxima Frecuencia</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="font-size: 1.2rem;">📊</div>
                <div class="stat-label">${filterText}</div>
            </div>
        `;
    }

    openQuestionInBank(questionId) {
        console.log(`🔍 Abriendo pregunta ${questionId} en banco...`);
        
        const url = `visor-nueva-arquitectura.html?question_id=${questionId}`;
        window.open(url, '_blank');
    }

    showError(message) {
        const container = document.getElementById('heatmapContent');
        const loadingMessage = document.getElementById('loadingMessage');
        
        loadingMessage.style.display = 'none';
        container.style.display = 'block';
        
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">❌ Error</h4>
                <p>${message}</p>
                <hr>
                <p class="mb-0">
                    <button class="btn btn-primary" onclick="location.reload()">
                        🔄 Recargar Página
                    </button>
                </p>
            </div>
        `;
    }
}

// Función para volver a estadísticas
function goBack() {
    window.location.href = 'question-statistics-dashboard.html';
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 Iniciando Question Heatmap...');
    new QuestionHeatmap();
});

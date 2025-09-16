/**
 * Visor de Exámenes Náuticos - JavaScript
 */

class ExamViewer {
    constructor() {
        this.data = null;
        this.filteredQuestions = [];
        this.currentPage = 1;
        this.questionsPerPage = 10;
        this.showAnswers = true;
        this.filters = {
            titulacion: 'all',  // Titulación (PER_NORMAL, PER_LIBERADO, PNB_NORMAL, PY_NORMAL, CY_NORMAL)
            convocatoria: 'all',
            test: 'all',
            tema: 'all',
            duplicados: true,  // Checkbox para mostrar duplicados (true = con duplicados, false = sin duplicados)
            search: ''
        };
        this.currentJsonFile = null;  // Solo PostgreSQL - no JSON
        this.availableConvocatorias = [];  // Convocatorias extraídas de PostgreSQL
        
        // Sistema de explicaciones
        this.explicaciones = {};  // Cache de explicaciones
        
        // Configurar listener para paste de imágenes
        this.setupPasteListener();
        
        this.init();
    }
    
    async init() {
        try {
            this.showLoading(true);

            // SOLO usar PostgreSQL - no JSON
            console.log('🔄 Iniciando visor con PostgreSQL exclusivamente...');
            await this.loadFromDatabase();
            console.log('✅ Datos cargados desde PostgreSQL');

            await this.loadExplanations();  // Cargar explicaciones antes de renderizar
            this.setupEventListeners();
            this.renderFilters();
            this.applyFilters();
            this.renderStats();
            this.showLoading(false);
        } catch (error) {
            console.error('❌ Error inicializando el visor:', error);
            this.showError('Error conectando con la base de datos PostgreSQL');
            this.showLoading(false);
        }
    }
    
    async loadData(jsonFile = null) {
        // Usar archivo especificado o el actual
        const dataUrl = jsonFile || this.currentJsonFile;
        console.log('🔍 Cargando datos desde:', window.location.origin + window.location.pathname + dataUrl);
        
        const response = await fetch(dataUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        this.data = await response.json();
        console.log('✅ Datos cargados desde:', dataUrl);
        console.log('📊 Metadata:', this.data.metadata);
        console.log('📋 Exámenes encontrados:', this.data.examenes?.length || 0);
        
        // Actualizar archivo actual
        if (jsonFile) {
            this.currentJsonFile = jsonFile;
        }
        
        // Extraer convocatorias disponibles del JSON unificado
        this.extractConvocatorias();
        
        // La información del JSON se muestra solo al hacer clic en el botón de debug
        // this.showDataInfo(); // Removido para que no se muestre automáticamente
    }
    
    extractConvocatorias() {
        // Extraer convocatorias del JSON
        if (this.data && this.data.convocatorias) {
            // Archivo unificado - múltiples convocatorias
            this.availableConvocatorias = Object.keys(this.data.convocatorias).map(key => ({
                id: key,
                descripcion: this.data.convocatorias[key].descripcion,
                examenes: this.data.convocatorias[key].examenes,
                preguntas: this.data.convocatorias[key].preguntas
            }));
            
            // Ordenar por fecha descendente (más reciente primero) - AUTOMÁTICO
            this.availableConvocatorias.sort((a, b) => {
                // Función que parsea automáticamente CUALQUIER formato de fecha
                const getDateValue = (id) => {
                    // Meses en español
                    const meses = {
                        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
                        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
                    };
                    
                    // Patrón 1: YYYY-MM formato (2024-06, 2025-04, etc.)
                    let match = id.match(/(\d{4})-(\d{2})/);
                    if (match) {
                        const año = parseInt(match[1]);
                        const mes = parseInt(match[2]);
                        return año * 100 + mes; // 202406, 202504, etc.
                    }
                    
                    // Patrón 2: mes_año formato (junio_2024, abril_2025, noviembre_2024, etc.)
                    match = id.match(/([a-z]+)_(\d{4})/i);
                    if (match) {
                        const mes = meses[match[1].toLowerCase()] || 1;
                        const año = parseInt(match[2]);
                        return año * 100 + mes;
                    }
                    
                    // Patrón 3: año_mes_resto formato (2024_06_recreo, etc.)
                    match = id.match(/(\d{4})_(\d{2})/);
                    if (match) {
                        const año = parseInt(match[1]);
                        const mes = parseInt(match[2]);
                        return año * 100 + mes;
                    }
                    
                    // Fallback: extraer cualquier año como último recurso
                    match = id.match(/(\d{4})/);
                    if (match) {
                        return parseInt(match[1]) * 100; // Solo año, mes = 0
                    }
                    
                    return 0; // Si no se puede parsear
                };
                
                return getDateValue(b.id) - getDateValue(a.id); // Descendente (más reciente primero)
            });
            
            console.log('📅 Convocatorias extraídas y ordenadas (unificado):', this.availableConvocatorias);
        } else {
            // Archivo individual - detectar convocatoria única
            const metadata = this.data?.metadata || {};
            const convocatoriaId = this.detectConvocatoriaFromFilename() || 'individual';
            const descripcion = this.getConvocatoriaDescription(convocatoriaId, metadata);
            
            this.availableConvocatorias = [{
                id: convocatoriaId,
                descripcion: descripcion,
                examenes: this.data?.examenes?.length || 0,
                preguntas: metadata?.total_preguntas || 0
            }];
            console.log('📅 Convocatoria extraída (individual):', this.availableConvocatorias);
        }
    }
    
    detectConvocatoriaFromFilename() {
        // Detectar convocatoria del nombre del archivo usando IDs reales del JSON
        if (this.currentJsonFile.includes('abril_2025')) {
            return '2025-04-RECREO';  // ID real en el JSON
        } else if (this.currentJsonFile.includes('abril_2024')) {
            return 'abril_2024';  // ID real en el JSON
        } else if (this.currentJsonFile.includes('junio_2025')) {
            return 'junio_2025';  // ID real en el JSON
        } else if (this.currentJsonFile.includes('abril_2023')) {
            return '2023-04-RECREO';  // ID real en el JSON
        }
        return null;
    }
    
    getConvocatoriaDescription(convocatoriaId, metadata) {
        // Generar descripción para archivo individual
        const examenes = this.data?.examenes?.length || 0;
        const preguntas = metadata?.total_preguntas || 0;
        
        if (convocatoriaId === '2025-04-RECREO') {
            return `Abril 2025 (${examenes} exámenes, ${preguntas} preguntas)`;
        } else if (convocatoriaId === 'abril_2024') {
            return `Abril 2024 (${examenes} exámenes, ${preguntas} preguntas)`;
        } else if (convocatoriaId === 'junio_2025') {
            return `Junio 2025 (${examenes} exámenes, ${preguntas} preguntas)`;
        } else if (convocatoriaId === '2023-04-RECREO') {
            return `Abril 2023 (${examenes} exámenes, ${preguntas} preguntas)`;
        } else {
            return `Convocatoria única (${examenes} exámenes, ${preguntas} preguntas)`;
        }
    }
    
    toggleDebugInfo() {
        // Alternar visibilidad de la capa de debug
        const existingInfo = document.getElementById('data-info');
        if (existingInfo) {
            existingInfo.remove();
            return; // Si ya existe, solo la quitamos
        }
        
        // Si no existe, la creamos
        this.showDataInfo();
    }
    
    showDataInfo() {
        // Eliminar info box anterior si existe
        const existingInfo = document.getElementById('data-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        // Crear elemento para mostrar info del JSON
        const infoDiv = document.createElement('div');
        infoDiv.id = 'data-info';
        infoDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #333;
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
            max-width: 300px;
        `;
        
        // Manejar metadata unificada vs individual
        const metadata = this.data.metadata_global || this.data.metadata || {};
        const fechaProcesamiento = metadata.fecha_procesamiento || metadata.fecha_unificacion || 'No disponible';
        const totalExamenes = this.data.examenes?.length || 0;
        const totalPreguntas = metadata.total_preguntas || 0;
        
        // Crear selector de archivo para debug
        const fileSelector = `
            <select id="debugFileSelector" style="width: 100%; margin: 5px 0; font-size: 11px;">
                <option value="data/json/data_junio_2025.json">📅 Junio 2025 (180 preguntas)</option>
                <option value="data/json/data_abril_2025.json">📅 Abril 2025 (430 preguntas)</option>
                <option value="data/json/data_noviembre_2024.json">📅 Noviembre 2024 (432 preguntas)</option>
                <option value="data/json/data_junio_2024.json">📅 Junio 2024 (270 preguntas)</option>
                <option value="data/json/data_abril_2024.json">📅 Abril 2024 (430 preguntas)</option>
                <option value="data/json/data_noviembre_2023.json">📅 Noviembre 2023 (430 preguntas)</option>
                <option value="data/json/data_junio_2023.json">📅 Junio 2023 (180 preguntas)</option>
                <option value="data/json/data_abril_2023.json">📅 Abril 2023 (430 preguntas)</option>
                <option value="data/json/data_diciembre_2022.json">📅 Diciembre 2022 (430 preguntas)</option>
                <option value="data/json/data_octubre_2022.json">📅 Octubre 2022 (180 preguntas)</option>
                <option value="data/json/data_junio_2022.json">📅 Junio 2022 (436 preguntas)</option>
                <option value="data/json/data_abril_2022.json">📅 Abril 2022 (270 preguntas)</option>
                <option value="data/json/data_diciembre_2021.json">📅 Diciembre 2021 (422 preguntas)</option>
                <option value="data/json/data_octubre_2021.json">📅 Octubre 2021 (180 preguntas)</option>
                <option value="data/json/data_julio_2021.json">📅 Julio 2021 (430 preguntas)</option>
                <option value="data/json/data_abril_2021.json">📅 Abril 2021 (234 preguntas)</option>
            </select>
        `;
        
        infoDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <strong>📊 Datos JSON Cargados</strong>
                <button id="closeDebugInfo" style="
                    background: none; 
                    border: none; 
                    color: white; 
                    font-size: 16px; 
                    cursor: pointer; 
                    padding: 2px 4px;
                    line-height: 1;
                    border-radius: 3px;
                    transition: all 0.2s ease;
                " title="Cerrar" 
                onmouseover="this.style.backgroundColor='rgba(255,255,255,0.2)'" 
                onmouseout="this.style.backgroundColor='none'">✕</button>
            </div>
            🗂️ Archivo: ${this.currentJsonFile}<br>
            📅 Procesado: ${fechaProcesamiento.substring(0,19)}<br>
            📋 Exámenes: ${totalExamenes}<br>
            📝 Preguntas: ${totalPreguntas}<br>
            📊 Tipo: ${this.data.metadata_global ? 'Unificado' : 'Individual'}<br>
            📅 Convocatorias: ${this.availableConvocatorias.length}<br>
            🌐 URL: ${window.location.href}<br>
            <br><strong>🔧 Debug - Cambiar Archivo:</strong>
            ${fileSelector}
        `;
        
        document.body.appendChild(infoDiv);
        
        // Configurar selector de debug
        const debugSelector = document.getElementById('debugFileSelector');
        if (debugSelector) {
            debugSelector.value = this.currentJsonFile;
            debugSelector.addEventListener('change', async (e) => {
                const selectedFile = e.target.value;
                console.log('🔧 Debug: Cambiando a archivo:', selectedFile);
                console.log('🔧 Debug: Archivo actual antes del cambio:', this.currentJsonFile);
                
                try {
                    this.showLoading(true);
                    await this.loadData(selectedFile);
                    console.log('🔧 Debug: Archivo actual después del cambio:', this.currentJsonFile);
                    
                    // CRÍTICO: Limpiar completamente los filtros para el nuevo archivo
                    this.clearFilters();
                    
                    // Los filtros ya están renderizados por clearFilters(), solo aplicar
                    this.applyFilters();
                    this.renderStats();
                    this.showLoading(false);
                    console.log('✅ Debug: Archivo cambiado exitosamente a:', selectedFile);
                } catch (error) {
                    console.error('❌ Debug: Error cambiando archivo:', error);
                    this.showError('Error cargando el archivo seleccionado');
                    this.showLoading(false);
                }
            });
        }
        
        // Configurar botón de cerrar (X)
        const closeButton = document.getElementById('closeDebugInfo');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.toggleDebugInfo(); // Reutiliza la función toggle para cerrar
            });
        }
        
        // Nota: La capa se puede cerrar con la tuerca ⚙️ o con la X
    }
    
    setupEventListeners() {
        // Botón de debug/configuración (tuerca)
        document.getElementById('debugToggle').addEventListener('click', () => {
            this.toggleDebugInfo();
        });
        
        // Filtro de convocatoria (filtra datos, no cambia archivo)
        document.getElementById('filterConvocatoria').addEventListener('change', (e) => {
            this.filters.convocatoria = e.target.value;
            this.updateDynamicFilters('convocatoria');
            this.applyFilters();
        });
        
        // Filtros dinámicos en cascada
        document.getElementById('filterTitulacion').addEventListener('change', (e) => {
            this.filters.titulacion = e.target.value;
            this.updateDynamicFilters('titulacion');
            this.applyFilters();
        });
        
        
        document.getElementById('filterTest').addEventListener('change', (e) => {
            this.filters.test = e.target.value;
            this.updateDynamicFilters('test');
            this.applyFilters();
        });
        
        document.getElementById('filterTema').addEventListener('change', (e) => {
            this.filters.tema = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('filterDuplicados').addEventListener('change', (e) => {
            this.filters.duplicados = e.target.checked;
            this.applyFilters();
        });
        
        // Búsqueda
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });
        
        // Botones de acción
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.applyFilters();
        });
        
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });
        
        document.getElementById('toggleAnswers').addEventListener('click', () => {
            this.toggleAnswers();
        });
        
        document.getElementById('clearSearch').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            this.filters.search = '';
            this.applyFilters();
        });
    }
    
    sortConvocatoriasByDate(a, b) {
        // Función para extraer año y mes de una convocatoria
        const parseConvocatoria = (conv) => {
            const meses = {
                'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
                'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
            };
            
            // Buscar patrón mes_año
            const match = conv.match(/([a-z]+)_(\d{4})/i);
            if (match) {
                const mes = meses[match[1].toLowerCase()] || 0;
                const año = parseInt(match[2]);
                return { año, mes, original: conv };
            }
            
            // Buscar solo año
            const yearMatch = conv.match(/(\d{4})/);
            if (yearMatch) {
                return { año: parseInt(yearMatch[1]), mes: 0, original: conv };
            }
            
            // Si no se puede parsear, ordenar al final
            return { año: 0, mes: 0, original: conv };
        };
        
        const dateA = parseConvocatoria(a);
        const dateB = parseConvocatoria(b);
        
        // Ordenar por año descendente (más reciente primero)
        if (dateA.año !== dateB.año) {
            return dateB.año - dateA.año;
        }
        
        // Si el año es igual, ordenar por mes descendente
        return dateB.mes - dateA.mes;
    }

    renderFilters() {
        if (!this.data || !this.data.examenes) {
            console.warn('⚠️ No hay datos disponibles para renderizar filtros');
            return;
        }

        // Inicializar con todos los valores únicos de tipo_examen
        const allTitulaciones = [...new Set(this.data.examenes.map(e => e.tipo_examen))].sort();

        // Renderizar filtro de titulación con nombres más descriptivos
        const titulacionesDescriptivas = this.mapTitulacionesToDescriptive(allTitulaciones);
        this.renderSelectOptions('filterTitulacion', titulacionesDescriptivas, 'Todas las titulaciones');
        
        // Poblar selector de convocatorias dinámicamente
        this.renderConvocatoriaFilter();
        
        // Inicializar filtros dinámicos
        this.updateDynamicFilters('init');
    }
    
    renderConvocatoriaFilter() {
        const select = document.getElementById('filterConvocatoria');
        if (!select) return;
        
        // Limpiar opciones existentes
        select.innerHTML = '';
        
        // Para archivos unificados, añadir opción "Todas"
        if (this.data.convocatorias) {
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'Todas las convocatorias';
            select.appendChild(allOption);
        }
        
        // Añadir convocatorias extraídas del JSON
        this.availableConvocatorias.forEach(conv => {
            const option = document.createElement('option');
            option.value = conv.id;
            option.textContent = conv.descripcion;
            select.appendChild(option);
        });
        
        // Para archivos individuales, seleccionar automáticamente la única convocatoria
        if (!this.data.convocatorias && this.availableConvocatorias.length === 1) {
            const convocatoriaId = this.availableConvocatorias[0].id;
            select.value = convocatoriaId;
            this.filters.convocatoria = convocatoriaId;
        } else {
            // Para archivos unificados, resetear a "all"
            select.value = 'all';
            this.filters.convocatoria = 'all';
        }
        
        console.log(`📅 Selector poblado con ${this.availableConvocatorias.length} convocatorias, seleccionado: ${select.value}`);
    }

    mapTitulacionesToDescriptive(titulaciones) {
        const mapping = {
            'PNB_NORMAL': 'PNB - Patrón de Navegación Básica',
            'PER_NORMAL': 'PER - Patrón de Embarcaciones de Recreo',
            'PER_LIBERADO': 'PER Liberado (con PNB aprobado)',
            'PY_NORMAL': 'PY - Patrón de Yate',
            'CY_NORMAL': 'CY - Capitán de Yate'
        };

        return titulaciones.map(t => ({
            value: t,
            text: mapping[t] || t
        }));
    }

    async loadFromDatabase() {
        try {
            console.log('🔄 Cargando datos desde PostgreSQL...');

            // Hacer petición a la API Flask para obtener datos de PostgreSQL
            const response = await fetch('http://localhost:5001/examenes');
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Datos cargados desde PostgreSQL:', data);
            console.log('📊 Total exámenes:', data.count);
            console.log('📋 Ejemplo examen:', data.examenes[0]);

            // Convertir datos de PostgreSQL al formato esperado
            this.data = this.convertPostgreSQLData(data);
            console.log('🔄 Datos convertidos:', this.data);
            console.log('📅 Convocatorias extraídas:', this.availableConvocatorias);

            this.renderFilters();
            this.applyFilters();

        } catch (error) {
            console.error('❌ Error cargando desde PostgreSQL:', error);
            throw error; // Propagar el error sin fallback
        }
    }

    convertPostgreSQLData(postgresData) {
        // Convertir estructura de PostgreSQL al formato esperado por el frontend
        const examenes = [];

        if (postgresData.examenes) {
            postgresData.examenes.forEach(exam => {
                const examen = {
                    id: exam.id,
                    titulo: exam.titulo,
                    fecha: exam.fecha,
                    convocatoria: exam.convocatoria,
                    convocatoria_id: exam.convocatoria,
                    tipo_examen: exam.tipo_examen,
                    titulacion: exam.tipo_examen, // Para compatibilidad con código existente
                    numero_test: this.extractTestNumber(exam.titulo),
                    preguntas: [], // Las preguntas se cargarán por separado según sea necesario
                    metadata: exam.metadata || {}
                };
                examenes.push(examen);
            });
        }

        // Extraer convocatorias únicas para los filtros
        const convocatorias = [...new Set(examenes.map(e => e.convocatoria))].sort().reverse();
        this.availableConvocatorias = convocatorias.map(conv => ({
            id: conv,
            descripcion: conv.replace('-RECREO', ' - RECREO').replace('-', ' ')
        }));

        return {
            examenes: examenes,
            metadata: {
                source: 'postgresql',
                total_examenes: examenes.length,
                fecha_carga: new Date().toISOString()
            }
        };
    }

    extractTestNumber(titulo) {
        // Extraer número de test del título (ej: "PER 2025-06-RECREO - Test 01" -> "01")
        const match = titulo.match(/Test\s+(\d+)/i);
        return match ? match[1] : '01';
    }
    
    renderSelectOptions(selectId, options, defaultText, defaultValue = null) {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`⚠️ Elemento no encontrado: ${selectId}`);
            return;
        }
        const currentValue = select.value; // Preservar selección actual si es válida

        select.innerHTML = `<option value="all">${defaultText}</option>`;

        options.forEach(option => {
            const optionElement = document.createElement('option');

            // Manejar tanto arrays simples como objetos {value, text}
            if (typeof option === 'object' && option.value && option.text) {
                optionElement.value = option.value;
                optionElement.textContent = option.text;
            } else {
                optionElement.value = option;
                optionElement.textContent = option;
            }

            select.appendChild(optionElement);
        });
        
        // Determinar qué valor usar
        let valueToSet = 'all';
        
        // 1. Si hay un defaultValue especificado y existe en las opciones, usarlo (prioritario en primera carga)
        const optionValues = options.map(opt => typeof opt === 'object' ? opt.value : opt);
        if (defaultValue && optionValues.includes(defaultValue)) {
            valueToSet = defaultValue;
            // Actualizar el filtro correspondiente
            if (selectId === 'filterTitulacion') this.filters.titulacion = defaultValue;
            if (selectId === 'filterConvocatoria') this.filters.convocatoria = defaultValue;
            if (selectId === 'filterTest') this.filters.test = defaultValue;
            if (selectId === 'filterTema') this.filters.tema = defaultValue;
        }
        // 2. Si hay un valor actual válido y no hay defaultValue, usarlo
        else if (currentValue && (currentValue === 'all' || optionValues.includes(currentValue))) {
            valueToSet = currentValue;
        }
        // 3. Usar 'all' como fallback
        else {
            // Actualizar filtro si se resetea
            if (selectId === 'filterConvocatoria') this.filters.convocatoria = 'all';
            if (selectId === 'filterTest') this.filters.test = 'all';
            if (selectId === 'filterTema') this.filters.tema = 'all';
        }
        
        select.value = valueToSet;
        
        // Debug: verificar que PER se establece correctamente
        if (selectId === 'filterTitulacion' && defaultValue === 'PER') {
            console.log(`Estableciendo ${selectId} a: ${valueToSet}, opciones disponibles:`, options);
        }
    }
    
    updateDynamicFilters(changedFilter) {
        if (!this.data || !this.data.examenes) return;
        
        // Obtener exámenes filtrados según selecciones actuales
        let filteredExams = this.data.examenes;
        
        // Aplicar filtro de titulación si está seleccionado
        if (this.filters.titulacion !== 'all') {
            filteredExams = filteredExams.filter(e => e.titulacion === this.filters.titulacion);
        }
        
        // Aplicar filtro de convocatoria si está seleccionado y no es el que cambió
        if (this.filters.convocatoria !== 'all' && changedFilter !== 'titulacion') {
            filteredExams = filteredExams.filter(e => (e.convocatoria_id || e.convocatoria) === this.filters.convocatoria);
        }
        
        // Actualizar opciones de convocatoria basado en titulación seleccionada
        if (changedFilter === 'titulacion' || changedFilter === 'init') {
            let convocatoriaExams = this.data.examenes;
            if (this.filters.titulacion !== 'all') {
                convocatoriaExams = convocatoriaExams.filter(e => e.titulacion === this.filters.titulacion);
            }
            const convocatorias = [...new Set(convocatoriaExams.map(e => e.convocatoria_id || e.convocatoria))];
            convocatorias.sort(this.sortConvocatoriasByDate.bind(this));
            // filterConvocatoria eliminado - ahora se usa convocatoriaSelector
        }
        
        // Actualizar opciones de test basado en titulación y convocatoria seleccionadas
        if (changedFilter === 'titulacion' || changedFilter === 'convocatoria' || changedFilter === 'init') {
            // Crear identificadores únicos que incluyan el tipo de examen para PER
            const tests = [...new Set(filteredExams.map(e => {
                if (e.titulacion === 'PER' && e.tipo_examen === 'PER_LIBERADO') {
                    return e.numero_test + ' (Liberado)';
                }
                return e.numero_test;
            }))].sort();
            this.renderSelectOptions('filterTest', tests, 'Todos los tests');
        }
        
        // Actualizar opciones de tema basado en todos los filtros anteriores
        if (changedFilter === 'titulacion' || changedFilter === 'convocatoria' || changedFilter === 'test' || changedFilter === 'init') {
            if (this.filters.test !== 'all' && changedFilter !== 'titulacion' && changedFilter !== 'convocatoria') {
                filteredExams = filteredExams.filter(e => {
                    // Crear el mismo identificador que en el filtro
                    let testIdentifier = e.numero_test;
                    if (e.titulacion === 'PER' && e.tipo_examen === 'PER_LIBERADO') {
                        testIdentifier = e.numero_test + ' (Liberado)';
                    }
                    return testIdentifier === this.filters.test;
                });
            }
            
            const temas = [...new Set(filteredExams.flatMap(e => 
                e.preguntas.map(p => p.tema).filter(t => t !== null && t !== undefined)
            ))].sort();
            this.renderSelectOptions('filterTema', temas, 'Todos los temas');
        }
    }
    
    applyFilters() {
        if (!this.data || !this.data.examenes) return;
        
        // Obtener todas las preguntas con metadatos del examen
        const allQuestions = [];
        this.data.examenes.forEach(examen => {
            examen.preguntas.forEach(pregunta => {
                // Crear identificador único para el test que incluya el tipo si es PER liberado
                let testIdentifier = examen.numero_test;
                if (examen.titulacion === 'PER' && examen.tipo_examen === 'PER_LIBERADO') {
                    testIdentifier = examen.numero_test + ' (Liberado)';
                }
                
                allQuestions.push({
                    ...pregunta,
                    examen_titulacion: examen.titulacion,
                    examen_convocatoria: examen.convocatoria_id || examen.convocatoria,
                    examen_test: testIdentifier,
                    examen_tipo: examen.tipo_examen
                });
            });
        });
        
        // Aplicar filtros
        this.filteredQuestions = allQuestions.filter(question => {
            // Filtro por titulación
            if (this.filters.titulacion !== 'all' && question.examen_titulacion !== this.filters.titulacion) {
                return false;
            }
            
            // Filtro por convocatoria
            if (this.filters.convocatoria !== 'all' && question.examen_convocatoria !== this.filters.convocatoria) {
                return false;
            }
            
            // Filtro por test
            if (this.filters.test !== 'all' && question.examen_test !== this.filters.test) {
                return false;
            }
            
            // Filtro por tema
            if (this.filters.tema !== 'all' && question.tema !== this.filters.tema) {
                return false;
            }
            
            // El filtro de duplicados se aplica después de todos los otros filtros
            // para poder deduplicar correctamente
            
            // Filtro por búsqueda
            if (this.filters.search) {
                const searchText = this.filters.search.toLowerCase();
                const questionText = question.enunciado.toLowerCase();
                const questionId = `${question.examen_titulacion}_${question.examen_test}_${question.numero}`.toLowerCase();
                
                if (!questionText.includes(searchText) && !questionId.includes(searchText)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Aplicar deduplicación si el checkbox está desmarcado (sin duplicados)
        if (!this.filters.duplicados) {
            this.filteredQuestions = this.deduplicateQuestions(this.filteredQuestions);
        }
        
        // Reset página actual
        this.currentPage = 1;
        
        // Renderizar resultados
        this.renderStats();
        this.renderQuestions();
        this.renderPagination();
    }
    
    deduplicateQuestions(questions) {
        // Usar Map para mantener solo la primera aparición de cada hash_pregunta
        const uniqueQuestionsMap = new Map();
        
        questions.forEach(question => {
            const hash = question.hash_pregunta;
            if (hash && !uniqueQuestionsMap.has(hash)) {
                // Añadir información de todas las apariciones a la primera instancia
                const allOccurrences = questions.filter(q => q.hash_pregunta === hash);
                const enhancedQuestion = {
                    ...question,
                    todas_apariciones: allOccurrences.map(q => ({
                        examen_titulacion: q.examen_titulacion,
                        examen_convocatoria: q.examen_convocatoria,
                        examen_test: q.examen_test,
                        numero: q.numero
                    }))
                };
                uniqueQuestionsMap.set(hash, enhancedQuestion);
            }
        });
        
        return Array.from(uniqueQuestionsMap.values());
    }
    
    renderStats() {
        const totalQuestions = this.filteredQuestions.length;
        const questionsWithAnswers = this.filteredQuestions.filter(q => 
            q.respuesta_correcta && q.respuesta_correcta !== null
        ).length;
        const coveragePercentage = totalQuestions > 0 ? 
            Math.round((questionsWithAnswers / totalQuestions) * 100) : 0;
        
        document.getElementById('totalQuestions').textContent = totalQuestions;
        document.getElementById('questionsWithAnswers').textContent = questionsWithAnswers;
        document.getElementById('coveragePercentage').textContent = `${coveragePercentage}%`;
    }
    
    renderQuestions() {
        const container = document.getElementById('questionsContainer');
        container.innerHTML = '';
        
        if (this.filteredQuestions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <p class="text-muted">No se encontraron preguntas con los filtros aplicados.</p>
                </div>
            `;
            return;
        }
        
        // Calcular rango de preguntas para la página actual
        const startIndex = (this.currentPage - 1) * this.questionsPerPage;
        const endIndex = Math.min(startIndex + this.questionsPerPage, this.filteredQuestions.length);
        const questionsToShow = this.filteredQuestions.slice(startIndex, endIndex);
        
        questionsToShow.forEach(question => {
            const questionCard = this.createQuestionCard(question);
            container.appendChild(questionCard);
        });
        
        // Actualizar botones de explicación después de renderizar
        this.updateAllExplanationButtons();
    }
    
    createQuestionCard(question) {
        const card = document.createElement('div');
        
        // Añadir clase 'anulada' usando el nuevo campo específico
        const esAnulada = question.anulada === true;
        card.className = esAnulada ? 'question-card anulada' : 'question-card';
        
        // Añadir atributo data-hash para poder actualizar la pregunta específica
        const hash = this.getExplanationHash(question);
        if (hash) {
            card.setAttribute('data-hash', hash);
        }
        
        // Crear identificador del test igual que en findQuestionById
        let testIdentifier = question.examen_test;
        if (question.examen_titulacion === 'PER' && question.examen_tipo === 'PER_LIBERADO') {
            testIdentifier = question.examen_test + ' (Liberado)';
        }
        
        const questionId = `${question.examen_titulacion}_${testIdentifier}_${question.numero}`;
        
        card.innerHTML = `
            <div class="question-header">
                <div class="question-badges">
                    <span class="badge badge-titulacion">${question.examen_titulacion}</span>
                    <span class="badge badge-convocatoria">${question.examen_convocatoria}</span>
                    <span class="badge badge-test">Test ${question.examen_test}</span>
                    ${question.tema ? `<span class="badge badge-tema">${question.tema}</span>` : ''}
                    ${this.renderDuplicateBadge(question)}
                </div>
                <div class="question-actions">
                    ${this.renderDuplicateButton(question)}
                    ${this.renderExplanationButton(question)}
                    <button class="btn-edit" onclick="examViewer.editQuestionByHash('${this.getExplanationHash(question)}')">
                        ✏️ Editar
                    </button>
                </div>
            </div>
            
            <div class="question-number-section">
                <span class="question-number">Pregunta ${question.numero}</span>
                <span class="question-check">✅</span>
                <span class="question-id">Hash: ${this.getExplanationHash(question)}</span>
                ${question.pdf_source ? `<a href="${question.pdf_source.preguntas}" target="_blank" class="pdf-link" title="Ver PDF original (línea ~${question.pdf_source.linea_aprox})">📄 PDF</a>` : ''}
            </div>
            
            <div class="question-text">${question.enunciado}</div>
            
            <ul class="options-list">
                ${question.opciones.map(opcion => {
                    const esAnulada = question.anulada === true;
                    const isCorrect = this.showAnswers && !esAnulada && opcion.letra === question.respuesta_correcta;
                    const optionClass = isCorrect ? 'option-correct' : 'option-incorrect';
                    const checkmark = isCorrect ? '✓ ' : '';
                    
                    return `
                        <li class="option-item ${optionClass}">
                            <span class="option-letter">${checkmark}${opcion.letra})</span>
                            ${opcion.texto}
                        </li>
                    `;
                }).join('')}
            </ul>
            
            ${this.showAnswers && (question.respuesta_correcta || question.anulada) ? `
                <div class="correct-answer">
                    ${question.anulada === true
                        ? '<span class="correct-answer-icon">⚠️</span>Pregunta ANULADA - Todas las respuestas son válidas'
                        : `<span class="correct-answer-icon">✅</span>Respuesta correcta: ${question.respuesta_correcta}`
                    }
                </div>
            ` : ''}
        `;
        
        return card;
    }
    
    renderPagination() {
        const container = document.getElementById('pagination');
        container.innerHTML = '';
        
        const totalPages = Math.ceil(this.filteredQuestions.length / this.questionsPerPage);
        
        if (totalPages <= 1) return;
        
        // Página anterior
        if (this.currentPage > 1) {
            container.appendChild(this.createPageButton('‹', this.currentPage - 1));
        }
        
        // Páginas numeradas
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const button = this.createPageButton(i, i);
            if (i === this.currentPage) {
                button.className += ' active';
            }
            container.appendChild(button);
        }
        
        // Página siguiente
        if (this.currentPage < totalPages) {
            container.appendChild(this.createPageButton('›', this.currentPage + 1));
        }
    }
    
    createPageButton(text, page) {
        const li = document.createElement('li');
        li.className = 'page-item';
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.textContent = text;
        a.href = '#';
        a.addEventListener('click', (e) => {
            e.preventDefault();
            this.currentPage = page;
            this.renderQuestions();
            this.renderPagination();
            window.scrollTo(0, 0);
        });
        
        li.appendChild(a);
        return li;
    }
    
    clearFilters() {
        this.filters = {
            titulacion: 'all',
            convocatoria: 'all',
            test: 'all',
            tema: 'all',
            duplicados: true,
            search: ''
        };
        
        // Resetear controles
        document.getElementById('filterTitulacion').value = 'all';
        document.getElementById('filterDuplicados').checked = true;
        document.getElementById('searchInput').value = '';
        
        // Reinicializar filtros dinámicos para mostrar todas las opciones
        this.updateDynamicFilters('init');
        
        this.applyFilters();
    }
    
    toggleAnswers() {
        this.showAnswers = !this.showAnswers;
        const button = document.getElementById('toggleAnswers');
        button.textContent = this.showAnswers ? '🙈 OCULTAR RESPUESTAS' : '👁️ MOSTRAR RESPUESTAS';
        this.renderQuestions();
    }
    
    editQuestionByHash(hashPregunta) {
        console.log('Editar pregunta por hash:', hashPregunta);
        
        // Buscar la pregunta por hash
        const pregunta = this.findQuestionByHash(hashPregunta);
        if (!pregunta) {
            alert('Error: No se encontró la pregunta con hash ' + hashPregunta);
            return;
        }
        
        // Crear modal de edición
        this.createEditModal(pregunta, hashPregunta);
    }
    
    editQuestion(questionId) {
        console.log('Editar pregunta:', questionId);
        
        // Buscar la pregunta en los datos
        const pregunta = this.findQuestionById(questionId);
        if (!pregunta) {
            alert('Error: No se encontró la pregunta');
            return;
        }
        
        // Crear modal de edición
        this.createEditModal(pregunta, questionId);
    }
    
    findQuestionByHash(hashPregunta) {
        // Buscar pregunta por hash (puede ser duplicada)
        if (!this.data || !this.data.examenes) return null;
        
        for (const examen of this.data.examenes) {
            for (const pregunta of examen.preguntas) {
                // Buscar por hash_explicacion primero, luego por hash_pregunta como fallback
                const preguntaHash = pregunta.hash_explicacion || pregunta.hash_pregunta;
                
                if (preguntaHash === hashPregunta) {
                    return {
                        ...pregunta,
                        examen_titulacion: examen.titulacion,
                        examen_convocatoria: examen.convocatoria_id || examen.convocatoria,
                        examen_test: examen.numero_test,
                        examen_tipo: examen.tipo_examen,
                        examen_original: examen
                    };
                }
            }
        }
        
        return null;
    }
    
    findAllQuestionsByHash(hashPregunta) {
        // Buscar TODAS las preguntas con el mismo hash (duplicados)
        const preguntasEncontradas = [];
        
        if (!this.data || !this.data.examenes) return preguntasEncontradas;
        
        for (const examen of this.data.examenes) {
            for (let i = 0; i < examen.preguntas.length; i++) {
                const pregunta = examen.preguntas[i];
                const preguntaHash = this.getExplanationHash(pregunta);
                
                if (preguntaHash === hashPregunta) {
                    preguntasEncontradas.push({
                        examen,
                        pregunta,
                        index: i
                    });
                }
            }
        }
        
        return preguntasEncontradas;
    }
    
    findQuestionById(questionId) {
        // Buscar pregunta por ID completo (titulacion_test_numero)
        const parts = questionId.split('_');
        if (parts.length < 3) return null;
        
        const titulacion = parts[0];
        const test = parts.slice(1, -1).join('_'); // En caso de que el test tenga guiones
        const numero = parseInt(parts[parts.length - 1]);
        
        if (!this.data || !this.data.examenes) return null;
        
        for (const examen of this.data.examenes) {
            if (examen.titulacion === titulacion) {
                // Crear identificador del test igual que en createQuestionCard
                let testIdentifier = examen.numero_test;
                if (examen.titulacion === 'PER' && examen.tipo_examen === 'PER_LIBERADO') {
                    testIdentifier = examen.numero_test + ' (Liberado)';
                }
                
                if (testIdentifier === test) {
                    for (const pregunta of examen.preguntas) {
                        if (pregunta.numero === numero) {
                            return {
                                ...pregunta,
                                examen_titulacion: examen.titulacion,
                                examen_convocatoria: examen.convocatoria_id || examen.convocatoria,
                                examen_test: testIdentifier,
                                examen_tipo: examen.tipo_examen,
                                examen_original: examen
                            };
                        }
                    }
                }
            }
        }
        return null;
    }
    
    createEditModal(pregunta, questionId) {
        // Eliminar modal existente si lo hay
        const existingModal = document.getElementById('editModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Crear modal
        const modal = document.createElement('div');
        modal.id = 'editModal';
        modal.className = 'modal-overlay';
        
        const modalContent = `
            <div class="modal-content edit-modal">
                <div class="modal-header">
                    <h3>✏️ Editar Pregunta</h3>
                    <button class="modal-close" onclick="examViewer.closeEditModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="editQuestionForm">
                        <!-- Pestañas -->
                        <div class="tab-container">
                            <div class="tab-buttons">
                                <button type="button" class="tab-button active" data-tab="content">
                                    📝 Contenido
                                </button>
                                <button type="button" class="tab-button" data-tab="answer">
                                    ✅ Respuesta
                                </button>
                                <button type="button" class="tab-button" data-tab="metadata">
                                    🏷️ Metadatos
                                </button>
                                <button type="button" class="tab-button" data-tab="explanation">
                                    📖 Explicación
                                </button>
                            </div>
                            
                            <!-- Pestaña de Contenido -->
                            <div class="tab-content active" id="tab-content">
                                <div class="form-group">
                                    <label for="editEnunciado">Enunciado de la pregunta:</label>
                                    <textarea id="editEnunciado" rows="4" required>${pregunta.enunciado}</textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label>Opciones de respuesta:</label>
                                    <div class="options-container" id="editOptionsContainer">
                                        ${pregunta.opciones.map((opcion, index) => `
                                            <div class="option-edit" data-index="${index}">
                                                <label for="editOpcion${index}">Opción ${opcion.letra}:</label>
                                                <div class="option-input-group">
                                                    <input type="text" id="editOpcion${index}" value="${opcion.texto}" required>
                                                    ${pregunta.opciones.length > 2 ? `<button type="button" class="btn-remove-option" onclick="examViewer.removeOption(${index})" title="Eliminar opción">×</button>` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <button type="button" class="btn-add-option" onclick="examViewer.addOption()">+ Añadir opción</button>
                                </div>
                            </div>
                            
                            <!-- Pestaña de Respuesta -->
                            <div class="tab-content" id="tab-answer">
                                <div class="form-group">
                                    <label for="editRespuestaCorrecta">Respuesta correcta:</label>
                                    <select id="editRespuestaCorrecta" required>
                                        ${pregunta.opciones.map(opcion => 
                                            `<option value="${opcion.letra}" ${opcion.letra === pregunta.respuesta_correcta ? 'selected' : ''}>${opcion.letra}) ${opcion.texto.substring(0, 50)}...</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="editAnulada" ${pregunta.anulada ? 'checked' : ''}>
                                        Pregunta anulada
                                    </label>
                                    <small class="form-help">Si está marcada, todas las respuestas serán válidas</small>
                                </div>
                            </div>
                            
                            <!-- Pestaña de Metadatos -->
                            <div class="tab-content" id="tab-metadata">
                                <div class="form-group">
                                    <label for="editTitulacion">Titulación:</label>
                                    <select id="editTitulacion" required>
                                        <option value="PER" ${pregunta.examen_titulacion === 'PER' ? 'selected' : ''}>PER</option>
                                        <option value="PNB" ${pregunta.examen_titulacion === 'PNB' ? 'selected' : ''}>PNB</option>
                                        <option value="CY" ${pregunta.examen_titulacion === 'CY' ? 'selected' : ''}>CY</option>
                                        <option value="PY" ${pregunta.examen_titulacion === 'PY' ? 'selected' : ''}>PY</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editConvocatoria">Convocatoria:</label>
                                    <input type="text" id="editConvocatoria" value="${pregunta.examen_convocatoria || ''}" readonly>
                                    <small class="form-help">Solo lectura - no se puede modificar</small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editTest">Test:</label>
                                    <input type="text" id="editTest" value="${pregunta.examen_test || ''}" readonly>
                                    <small class="form-help">Solo lectura - no se puede modificar</small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editTema">Tema:</label>
                                    <input type="text" id="editTema" value="${pregunta.tema || ''}">
                                </div>
                                
                                <div class="form-group">
                                    <label for="editNumero">Número de pregunta:</label>
                                    <input type="number" id="editNumero" value="${pregunta.numero}" min="1" max="50">
                                </div>
                            </div>
                            
                            <!-- Pestaña de Explicación -->
                            <div class="tab-content" id="tab-explanation">
                                <div class="explanation-tab-content">
                                    <div class="explanation-status">
                                        ${this.renderExplanationStatus(pregunta)}
                                    </div>
                                    
                                    <div class="explanation-actions">
                                        ${this.renderExplanationActions(pregunta)}
                                    </div>
                                    
                                    <div class="explanation-preview" id="explanationPreview">
                                        ${this.renderExplanationPreview(pregunta)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="examViewer.closeEditModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
        
        // Configurar eventos de pestañas
        this.setupTabEvents();
        
        // Configurar evento del formulario
        const form = document.getElementById('editQuestionForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveQuestionChanges(pregunta, questionId);
        });
        
        // Mostrar modal
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    setupTabEvents() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remover clase active de todos los botones y contenidos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Añadir clase active al botón y contenido seleccionados
                button.classList.add('active');
                document.getElementById(`tab-${targetTab}`).classList.add('active');
            });
        });
    }
    
    renderExplanationStatus(pregunta) {
        const hashPregunta = this.getExplanationHash(pregunta);
        const tieneExplicacion = this.checkExplanationExists(hashPregunta);
        
        if (tieneExplicacion) {
            const explicacion = this.explicaciones[hashPregunta];
            const imagePrompt = explicacion.image_prompt || 'No disponible';
            
            return `
                <div class="status-card status-success">
                    <h4>📖 Explicación disponible</h4>
                    <p>Esta pregunta ya tiene una explicación generada.</p>
                    <div class="explanation-meta">
                        <span class="meta-item">Nivel: ${explicacion.nivel_dificultad || 'No especificado'}</span>
                        <span class="meta-item">Generado: ${explicacion.fecha_creacion ? new Date(explicacion.fecha_creacion).toLocaleDateString() : 'No disponible'}</span>
                    </div>
                    
                    <div class="image-prompt-section">
                        <h5>🎨 Prompt para imagen:</h5>
                        <div class="image-prompt-container">
                            <textarea 
                                id="imagePromptText" 
                                class="image-prompt-text" 
                                readonly 
                                rows="3"
                                placeholder="No hay prompt de imagen disponible"
                            >${imagePrompt}</textarea>
                            <div class="image-prompt-buttons">
                                <button 
                                    type="button" 
                                    class="btn-copy-prompt" 
                                    onclick="examViewer.copyImagePrompt()"
                                    title="Copiar prompt al portapapeles"
                                >
                                    📋 Copiar
                                </button>
                            </div>
                        </div>
                        
                        ${explicacion.image_uploaded_url ? `
                            <div class="current-image-section">
                                <h6>🖼️ Imagen subida actual:</h6>
                                <div class="image-preview">
                                    <img src="http://localhost:5001/${explicacion.image_uploaded_url}" 
                                         alt="Imagen subida" 
                                         class="generated-image"
                                         onerror="this.style.display='none'">
                                    <div class="image-info">
                                        <small>📁 ${explicacion.image_uploaded_filename || 'archivo.png'}</small>
                                        <small>📅 ${explicacion.image_uploaded_at ? new Date(explicacion.image_uploaded_at).toLocaleString() : 'N/A'}</small>
                                    </div>
                                    <div class="image-actions">
                                        <button type="button" 
                                                class="btn-view-full-image" 
                                                onclick="examViewer.viewFullImage('http://localhost:5001/${explicacion.image_uploaded_url}')"
                                                title="Ver imagen completa">
                                            👁️ Ver completa
                                        </button>
                                        <button type="button" 
                                                class="btn-revert-to-svg" 
                                                onclick="examViewer.revertToSVG('${hashPregunta}')"
                                                title="Volver al SVG original">
                                            ↩️ Volver a SVG
                                        </button>
                                        <button type="button" 
                                                class="btn-upload-new-image" 
                                                onclick="examViewer.showImageUploadModal('${hashPregunta}')"
                                                title="Subir nueva imagen">
                                            🔄 Cambiar imagen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <div class="image-upload-section">
                                <h6>📤 Subir imagen personalizada:</h6>
                                <p>Puedes subir una imagen generada externamente (captura de pantalla, web, etc.) para reemplazar el SVG:</p>
                                <div class="upload-area" 
                                     id="uploadArea_${hashPregunta}"
                                     ondrop="examViewer.handleDrop(event, '${hashPregunta}')"
                                     ondragover="examViewer.handleDragOver(event)"
                                     ondragenter="examViewer.handleDragEnter(event)"
                                     ondragleave="examViewer.handleDragLeave(event)"
                                     onclick="document.getElementById('fileInput_${hashPregunta}').click()">
                                    <div class="upload-content">
                                        <div class="upload-icon">📁</div>
                                        <div class="upload-text">
                                            <strong>Arrastra una imagen aquí</strong><br>
                                            o <span class="upload-link">haz clic para seleccionar</span>
                                        </div>
                                        <div class="upload-formats">PNG, JPG, JPEG, GIF, WEBP</div>
                                    </div>
                                </div>
                                <input type="file" 
                                       id="fileInput_${hashPregunta}" 
                                       accept="image/*" 
                                       style="display: none"
                                       onchange="examViewer.handleFileSelect(event, '${hashPregunta}')">
                                <div class="upload-paste-info">
                                    <small>💡 También puedes pegar una imagen desde el portapapeles (Ctrl+V)</small>
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="status-card status-warning">
                    <h4>⚠️ Sin explicación</h4>
                    <p>Esta pregunta no tiene explicación generada.</p>
                </div>
            `;
        }
    }
    
    renderExplanationActions(pregunta) {
        const hashPregunta = this.getExplanationHash(pregunta);
        const tieneExplicacion = this.checkExplanationExists(hashPregunta);
        
        if (tieneExplicacion) {
            return `
                <div class="action-buttons">
                    <button type="button" class="btn btn-primary" onclick="examViewer.showExplanation('${hashPregunta}')">
                        👁️ Ver explicación
                    </button>
                    <button type="button" class="btn btn-warning" onclick="examViewer.regenerateExplanation('${hashPregunta}')">
                        🔄 Regenerar
                    </button>
                    <button type="button" class="btn btn-danger" onclick="examViewer.deleteExplanation('${hashPregunta}')">
                        🗑️ Eliminar
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="action-buttons">
                    <button type="button" class="btn btn-success" onclick="examViewer.generateExplanation('${hashPregunta}')">
                        🤖 Generar explicación
                    </button>
                </div>
            `;
        }
    }
    
    renderExplanationPreview(pregunta) {
        const hashPregunta = this.getExplanationHash(pregunta);
        const tieneExplicacion = this.checkExplanationExists(hashPregunta);
        
        if (tieneExplicacion) {
            const explicacion = this.explicaciones[hashPregunta];
            return `
                <div class="preview-content">
                    <h5>Vista previa de la explicación:</h5>
                    <div class="preview-text">
                        <strong>Resumen:</strong> ${explicacion.resumen_pregunta || 'No disponible'}<br>
                        <strong>Conclusión:</strong> ${explicacion.conclusion ? explicacion.conclusion.substring(0, 100) + '...' : 'No disponible'}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="preview-content">
                    <p class="text-muted">No hay explicación disponible para mostrar una vista previa.</p>
                </div>
            `;
        }
    }
    
    closeEditModal() {
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }
    
    async saveQuestionChanges(pregunta, questionId) {
        try {
            // Obtener datos del formulario de todas las pestañas
            const nuevoEnunciado = document.getElementById('editEnunciado').value.trim();
            const nuevaRespuestaCorrecta = document.getElementById('editRespuestaCorrecta').value;
            const nuevoTema = document.getElementById('editTema').value.trim();
            const esAnulada = document.getElementById('editAnulada').checked;
            const nuevaTitulacion = document.getElementById('editTitulacion').value;
            const nuevoNumero = parseInt(document.getElementById('editNumero').value);
            
            // Obtener nuevas opciones del DOM actual (no del array original)
            const nuevasOpciones = [];
            const container = document.getElementById('editOptionsContainer');
            const optionElements = container.querySelectorAll('.option-edit');
            
            optionElements.forEach((optionElement, index) => {
                const input = optionElement.querySelector('input');
                const label = optionElement.querySelector('label');
                if (input && label) {
                    const letra = label.textContent.match(/Opción ([A-Z]):/)?.[1] || String.fromCharCode(65 + index);
                    nuevasOpciones.push({
                        letra: letra,
                        texto: input.value.trim()
                    });
                }
            });
            
            // Validaciones
            if (!nuevoEnunciado) {
                alert('El enunciado no puede estar vacío');
                return;
            }
            
            if (nuevasOpciones.some(op => !op.texto)) {
                alert('Todas las opciones deben tener texto');
                return;
            }
            
            if (!nuevaRespuestaCorrecta && !esAnulada) {
                alert('Debe seleccionar una respuesta correcta o marcar como anulada');
                return;
            }
            
            if (nuevoNumero < 1 || nuevoNumero > 50) {
                alert('El número de pregunta debe estar entre 1 y 50');
                return;
            }
            
            // Obtener hash de la pregunta original para encontrar duplicados
            const hashOriginal = this.getExplanationHash(pregunta);
            
            // Encontrar TODAS las preguntas con el mismo hash (duplicados)
            const todasLasPreguntas = this.findAllQuestionsByHash(hashOriginal);
            
            if (todasLasPreguntas.length === 0) {
                alert('Error: No se encontró la pregunta en los datos');
                return;
            }
            
            console.log(`🔄 Actualizando ${todasLasPreguntas.length} pregunta(s) duplicada(s) con hash ${hashOriginal}`);
            
            // Crear pregunta actualizada
            const preguntaActualizada = {
                numero: nuevoNumero,
                enunciado: nuevoEnunciado,
                opciones: nuevasOpciones,
                respuesta_correcta: esAnulada ? null : nuevaRespuestaCorrecta,
                tema: nuevoTema || null,
                anulada: esAnulada
            };
            
            // Actualizar TODAS las preguntas duplicadas
            todasLasPreguntas.forEach(({ examen, pregunta, index }) => {
                // Actualizar titulación del examen si cambió
                if (nuevaTitulacion !== examen.titulacion) {
                    examen.titulacion = nuevaTitulacion;
                    console.log(`🔄 Titulación actualizada de ${pregunta.examen_titulacion} a ${nuevaTitulacion}`);
                }
                
                // Actualizar la pregunta en el examen
                examen.preguntas[index] = {
                    ...examen.preguntas[index],
                    ...preguntaActualizada
                };
                
                // Actualizar hash de la pregunta si existe
                if (examen.preguntas[index].hash_pregunta) {
                    // Recalcular hash con los nuevos datos
                    const nuevoHash = this.calculateQuestionHashSync(examen.preguntas[index]);
                    examen.preguntas[index].hash_pregunta = nuevoHash;
                }
            });
            
            // Guardar cambios (aquí podrías implementar persistencia)
            await this.saveDataChanges();
            
            // Cerrar modal
            this.closeEditModal();
            
            // Actualizar solo la pregunta específica en la vista (sin recargar toda la vista)
            this.updateQuestionInView(preguntaActualizada, hashOriginal);
            
            alert('✅ Pregunta actualizada correctamente');
            
        } catch (error) {
            console.error('Error guardando cambios:', error);
            alert('Error al guardar los cambios: ' + error.message);
        }
    }
    
    updateQuestionInView(preguntaActualizada, hashOriginal) {
        // Encontrar el elemento de la pregunta en el DOM
        const questionElement = document.querySelector(`[data-hash="${hashOriginal}"]`);
        
        if (!questionElement) {
            console.warn('No se encontró el elemento de la pregunta en el DOM');
            return;
        }
        
        // Actualizar el contenido del elemento sin recargar toda la vista
        const questionText = questionElement.querySelector('.question-text');
        const questionNumber = questionElement.querySelector('.question-number');
        const questionTheme = questionElement.querySelector('.question-theme');
        
        if (questionText) {
            questionText.textContent = preguntaActualizada.enunciado;
        }
        
        if (questionNumber) {
            questionNumber.textContent = `Pregunta ${preguntaActualizada.numero}`;
        }
        
        if (questionTheme) {
            questionTheme.textContent = preguntaActualizada.tema || 'Sin tema';
        }
        
        // Actualizar las opciones
        const optionsContainer = questionElement.querySelector('.question-options');
        if (optionsContainer) {
            const optionsHtml = preguntaActualizada.opciones.map(opcion => {
                const esCorrecta = opcion.letra === preguntaActualizada.respuesta_correcta;
                const claseOpcion = esCorrecta ? 'opcion-correcta' : 'opcion-incorrecta';
                const icono = esCorrecta ? '✅' : '❌';
                
                return `
                    <div class="question-option ${claseOpcion}">
                        <span class="option-letter">${opcion.letra})</span>
                        <span class="option-text">${opcion.texto}</span>
                        <span class="option-icon">${icono}</span>
                    </div>
                `;
            }).join('');
            
            optionsContainer.innerHTML = optionsHtml;
        }
        
        // Actualizar el estado de anulada si es necesario
        if (preguntaActualizada.anulada) {
            questionElement.classList.add('question-anulada');
            const anuladaBadge = questionElement.querySelector('.anulada-badge');
            if (!anuladaBadge) {
                const questionHeader = questionElement.querySelector('.question-header');
                if (questionHeader) {
                    questionHeader.insertAdjacentHTML('beforeend', '<span class="anulada-badge">ANULADA</span>');
                }
            }
        } else {
            questionElement.classList.remove('question-anulada');
            const anuladaBadge = questionElement.querySelector('.anulada-badge');
            if (anuladaBadge) {
                anuladaBadge.remove();
            }
        }
        
        console.log('✅ Pregunta actualizada en la vista sin recargar');
    }
    
    calculateQuestionHash(pregunta) {
        // Función para recalcular el hash de la pregunta (mismo algoritmo que el backend)
        const enunciado = pregunta.enunciado || '';
        const opciones = pregunta.opciones || [];
        
        // Normalizar texto (mismo algoritmo que el backend)
        const normalizarTexto = (texto) => {
            if (!texto) return '';
            return texto.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        };
        
        const enunciadoNorm = normalizarTexto(enunciado);
        const opcionesNorm = opciones
            .map(op => normalizarTexto(op.texto))
            .filter(texto => texto) // Solo añadir si no está vacío
            .sort()
            .join('|');
        
        const contenido = `${enunciadoNorm}|${opcionesNorm}`;
        
        // Generar hash SHA-256 (mismo algoritmo que el backend)
        return this.sha256(contenido).substring(0, 16);
    }
    
    async sha256(str) {
        // Usar Web Crypto API para generar SHA-256 real
        if (window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
        
        // Fallback: usar algoritmo simple
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    }
    
    calculateQuestionHashSync(pregunta) {
        // Función síncrona para calcular hash (compatible con el backend)
        const enunciado = pregunta.enunciado || '';
        const opciones = pregunta.opciones || [];
        
        // Normalizar texto (mismo algoritmo que el backend)
        const normalizarTexto = (texto) => {
            if (!texto) return '';
            return texto.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        };
        
        const enunciadoNorm = normalizarTexto(enunciado);
        const opcionesNorm = opciones
            .map(op => normalizarTexto(op.texto))
            .filter(texto => texto) // Solo añadir si no está vacío
            .sort()
            .join('|');
        
        const contenido = `${enunciadoNorm}|${opcionesNorm}`;
        
        // Usar el hash que ya tiene la pregunta si existe
        if (pregunta.hash_pregunta) {
            return pregunta.hash_pregunta;
        }
        
        // Generar hash simple compatible
        let hash = 0;
        for (let i = 0; i < contenido.length; i++) {
            const char = contenido.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(16).padStart(16, '0');
    }
    
    async saveDataChanges() {
        try {
            console.log('💾 Guardando cambios en el archivo JSON...');
            
            // Enviar cambios al servidor Flask para que los guarde
            const response = await fetch('http://localhost:5001/guardar-datos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.data)
            });
            
            if (response.ok) {
                console.log('✅ Cambios guardados exitosamente en el servidor');
            } else {
                console.error('❌ Error guardando en el servidor:', response.status, response.statusText);
                // Fallback: guardar en localStorage como respaldo
                this.saveToLocalStorage();
            }
            
        } catch (error) {
            console.error('❌ Error guardando cambios:', error);
            // Fallback: guardar en localStorage como respaldo
            this.saveToLocalStorage();
        }
    }
    
    saveToLocalStorage() {
        try {
            localStorage.setItem('per_visor_data_backup', JSON.stringify(this.data));
            console.log('💾 Cambios guardados en localStorage como respaldo');
        } catch (error) {
            console.error('❌ Error guardando en localStorage:', error);
        }
    }
    
    // Funciones para manejar explicaciones desde el modal de edición
    regenerateExplanation(hashPregunta) {
        // Primero eliminar la explicación existente
        this.deleteExplanation(hashPregunta);
        
        // Luego generar una nueva
        setTimeout(() => {
            this.generateExplanation(hashPregunta);
        }, 500);
    }
    
    deleteExplanation(hashPregunta) {
        if (confirm('¿Estás seguro de que quieres eliminar esta explicación?')) {
            // Eliminar del cache local
            delete this.explicaciones[hashPregunta];
            
            // Actualizar la vista previa en el modal
            this.updateExplanationPreview(hashPregunta);
            
            // Actualizar botones de acción
            this.updateExplanationActions(hashPregunta);
            
            console.log('🗑️ Explicación eliminada para hash:', hashPregunta);
        }
    }
    
    copyImagePrompt() {
        const textarea = document.getElementById('imagePromptText');
        if (!textarea) {
            alert('❌ No se encontró el prompt de imagen');
            return;
        }
        
        const promptText = textarea.value.trim();
        if (!promptText || promptText === 'No disponible') {
            alert('⚠️ No hay prompt de imagen disponible para copiar');
            return;
        }
        
        try {
            // Seleccionar y copiar el texto
            textarea.select();
            textarea.setSelectionRange(0, 99999); // Para dispositivos móviles
            
            // Usar la API del portapapeles
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(promptText).then(() => {
                    this.showCopySuccess();
                }).catch(() => {
                    // Fallback para navegadores que no soportan clipboard API
                    this.fallbackCopyTextToClipboard(promptText);
                });
            } else {
                // Fallback para navegadores más antiguos
                this.fallbackCopyTextToClipboard(promptText);
            }
        } catch (error) {
            console.error('Error copiando al portapapeles:', error);
            alert('❌ Error al copiar al portapapeles');
        }
    }
    
    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showCopySuccess();
            } else {
                alert('❌ No se pudo copiar al portapapeles');
            }
        } catch (err) {
            console.error('Fallback: Error copiando al portapapeles', err);
            alert('❌ Error al copiar al portapapeles');
        }
        
        document.body.removeChild(textArea);
    }
    
    showCopySuccess() {
        // Crear notificación temporal de éxito
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = '✅ Prompt copiado al portapapeles';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
        `;
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    async generateImagePNG(hashPregunta) {
        try {
            // Mostrar indicador de carga
            this.showLoadingNotification('🎨 Generando imagen PNG con GPT-5...');
            
            const response = await fetch('http://localhost:5001/reemplazar-svg-con-imagen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hash_pregunta: hashPregunta
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error generando imagen PNG');
            }
            
            const result = await response.json();
            
            // Actualizar explicación en cache local
            if (this.explicaciones[hashPregunta]) {
                this.explicaciones[hashPregunta].image_png_url = result.image_png_url;
                this.explicaciones[hashPregunta].image_png_generated_at = new Date().toISOString();
            }
            
            // Recargar la pestaña de explicación para mostrar la nueva imagen
            this.refreshExplanationTab(hashPregunta);
            
            this.showSuccessNotification('✅ Imagen PNG generada correctamente');
            
        } catch (error) {
            console.error('Error generando imagen PNG:', error);
            this.showErrorNotification(`❌ Error generando imagen PNG: ${error.message}`);
        }
    }
    
    async revertToSVG(hashPregunta) {
        try {
            // Actualizar explicación en cache local para remover imagen subida
            if (this.explicaciones[hashPregunta]) {
                delete this.explicaciones[hashPregunta].image_uploaded_url;
                delete this.explicaciones[hashPregunta].image_uploaded_at;
                delete this.explicaciones[hashPregunta].image_uploaded_filename;
            }
            
            // Recargar la pestaña de explicación para mostrar el SVG
            this.refreshExplanationTab(hashPregunta);
            
            this.showSuccessNotification('✅ Vuelto al SVG original');
            
        } catch (error) {
            console.error('Error revirtiendo a SVG:', error);
            this.showErrorNotification(`❌ Error revirtiendo a SVG: ${error.message}`);
        }
    }
    
    // Funciones para drag & drop y subida de imágenes
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }
    
    handleDragEnter(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }
    
    handleDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    }
    
    handleDrop(event, hashPregunta) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.uploadImage(files[0], hashPregunta);
            // Cerrar modal si estamos en el modal de subida de imagen
            if (event.currentTarget.id && event.currentTarget.id.startsWith('modalUploadArea_')) {
                this.closeImageUploadModal();
            }
        }
    }
    
    handleFileSelect(event, hashPregunta) {
        console.log('📁 Archivo seleccionado, hash:', hashPregunta);
        const file = event.target.files[0];
        if (file) {
            console.log('📁 Archivo válido:', file.name, file.type, file.size);
            this.uploadImage(file, hashPregunta);
            this.closeImageUploadModal();
        } else {
            console.log('⚠️ No se seleccionó archivo válido');
        }
    }
    
    closeImageUploadModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
            console.log('✅ Modal de subida de imagen cerrado');
        }
    }
    
    removeOption(index) {
        const container = document.getElementById('editOptionsContainer');
        const optionElement = container.querySelector(`[data-index="${index}"]`);
        
        if (optionElement && container.children.length > 2) {
            optionElement.remove();
            
            // Reindexar los elementos restantes
            const remainingOptions = container.querySelectorAll('.option-edit');
            remainingOptions.forEach((option, newIndex) => {
                option.setAttribute('data-index', newIndex);
                const input = option.querySelector('input');
                const label = option.querySelector('label');
                const letter = String.fromCharCode(65 + newIndex); // A, B, C, D...
                
                input.id = `editOpcion${newIndex}`;
                label.textContent = `Opción ${letter}:`;
                label.setAttribute('for', `editOpcion${newIndex}`);
                
                // Actualizar botones de eliminar
                const removeBtn = option.querySelector('.btn-remove-option');
                if (removeBtn) {
                    removeBtn.setAttribute('onclick', `examViewer.removeOption(${newIndex})`);
                }
            });
            
            // Actualizar el select de respuesta correcta
            this.updateAnswerSelect();
            
            console.log(`✅ Opción ${String.fromCharCode(65 + index)} eliminada`);
        }
    }
    
    addOption() {
        const container = document.getElementById('editOptionsContainer');
        const currentCount = container.children.length;
        const letter = String.fromCharCode(65 + currentCount); // A, B, C, D...
        
        const newOption = document.createElement('div');
        newOption.className = 'option-edit';
        newOption.setAttribute('data-index', currentCount);
        newOption.innerHTML = `
            <label for="editOpcion${currentCount}">Opción ${letter}:</label>
            <div class="option-input-group">
                <input type="text" id="editOpcion${currentCount}" value="" required>
                <button type="button" class="btn-remove-option" onclick="examViewer.removeOption(${currentCount})" title="Eliminar opción">×</button>
            </div>
        `;
        
        container.appendChild(newOption);
        
        // Actualizar el select de respuesta correcta
        this.updateAnswerSelect();
        
        console.log(`✅ Opción ${letter} añadida`);
    }
    
    updateAnswerSelect() {
        const container = document.getElementById('editOptionsContainer');
        const select = document.getElementById('editRespuestaCorrecta');
        
        if (select) {
            // Guardar la respuesta correcta actual
            const respuestaActual = select.value;
            
            // Limpiar opciones existentes
            select.innerHTML = '';
            
            // Añadir nuevas opciones
            const options = container.querySelectorAll('.option-edit');
            const letrasDisponibles = [];
            
            options.forEach((option, index) => {
                const letter = String.fromCharCode(65 + index);
                const input = option.querySelector('input');
                const text = input.value || `Opción ${letter}`;
                
                const optionElement = document.createElement('option');
                optionElement.value = letter;
                optionElement.textContent = `${letter}) ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
                select.appendChild(optionElement);
                letrasDisponibles.push(letter);
            });
            
            // Restaurar la respuesta correcta si aún está disponible
            if (letrasDisponibles.includes(respuestaActual)) {
                select.value = respuestaActual;
            } else if (letrasDisponibles.length > 0) {
                // Si la respuesta anterior ya no está disponible, seleccionar la primera disponible
                select.value = letrasDisponibles[0];
                console.log(`⚠️ Respuesta correcta '${respuestaActual}' ya no disponible, cambiada a '${letrasDisponibles[0]}'`);
            }
        }
    }
    
    async uploadImage(file, hashPregunta) {
        try {
            // Validar tipo de archivo
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                this.showErrorNotification('❌ Tipo de archivo no permitido. Use: PNG, JPG, JPEG, GIF, WEBP');
                return;
            }
            
            // Validar tamaño (máximo 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                this.showErrorNotification('❌ Archivo demasiado grande. Máximo 10MB');
                return;
            }
            
            // Mostrar indicador de carga
            this.showLoadingNotification('📤 Subiendo imagen...');
            
            // Crear FormData
            const formData = new FormData();
            formData.append('imagen', file);
            formData.append('hash_pregunta', hashPregunta);
            
            // Subir imagen
            const response = await fetch('http://localhost:5001/subir-imagen', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error subiendo imagen');
            }
            
            const result = await response.json();
            
            // Actualizar explicación en cache local
            if (this.explicaciones[hashPregunta]) {
                this.explicaciones[hashPregunta].image_uploaded_url = result.image_url;
                this.explicaciones[hashPregunta].image_uploaded_at = new Date().toISOString();
                this.explicaciones[hashPregunta].image_uploaded_filename = file.name;
            }
            
            // Recargar la pestaña de explicación para mostrar la nueva imagen
            this.refreshExplanationTab(hashPregunta);
            
            this.showSuccessNotification('✅ Imagen subida correctamente');
            
        } catch (error) {
            console.error('Error subiendo imagen:', error);
            this.showErrorNotification(`❌ Error subiendo imagen: ${error.message}`);
        }
    }
    
    showImageUploadModal(hashPregunta) {
        console.log('🔄 Abriendo modal para cambiar imagen, hash:', hashPregunta);
        // Crear modal para subir imagen
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📤 Subir nueva imagen</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="upload-area-large" 
                         id="modalUploadArea_${hashPregunta}"
                         ondrop="examViewer.handleDrop(event, '${hashPregunta}'); examViewer.closeImageUploadModal();"
                         ondragover="examViewer.handleDragOver(event)"
                         ondragenter="examViewer.handleDragEnter(event)"
                         ondragleave="examViewer.handleDragLeave(event)"
                         onclick="document.getElementById('modalFileInput_${hashPregunta}').click()">
                        <div class="upload-content">
                            <div class="upload-icon">📁</div>
                            <div class="upload-text">
                                <strong>Arrastra una imagen aquí</strong><br>
                                o <span class="upload-link">haz clic para seleccionar</span>
                            </div>
                            <div class="upload-formats">PNG, JPG, JPEG, GIF, WEBP (máx. 10MB)</div>
                        </div>
                    </div>
                    <input type="file" 
                           id="modalFileInput_${hashPregunta}" 
                           accept="image/*" 
                           style="display: none"
                           onchange="examViewer.handleFileSelect(event, '${hashPregunta}'); this.closest('.modal-overlay').remove();">
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        console.log('✅ Modal añadido al DOM');
        
        // Añadir clase show para mostrar el modal
        setTimeout(() => {
            modal.classList.add('show');
            console.log('✅ Clase show añadida al modal');
        }, 10);
    }
    
    // Función para manejar paste de imágenes
    setupPasteListener() {
        document.addEventListener('paste', (event) => {
            console.log('📋 Evento paste detectado');
            
            const items = event.clipboardData.items;
            console.log('📋 Items en portapapeles:', items.length);
            
            for (let item of items) {
                console.log('📋 Item tipo:', item.type);
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) {
                        console.log('📋 Imagen detectada en portapapeles:', file.name, file.type, file.size);
                        
                        // Buscar el área de upload activa o cualquier área de upload visible
                        let activeUploadArea = document.querySelector('.upload-area.drag-over, .upload-area-large');
                        
                        // Si no hay área activa, buscar cualquier área de upload visible (incluyendo modales)
                        if (!activeUploadArea) {
                            activeUploadArea = document.querySelector('.upload-area, .upload-area-large');
                        }
                        
                        if (activeUploadArea) {
                            const hashPregunta = activeUploadArea.id.split('_')[1];
                            console.log('📤 Subiendo imagen pegada para hash:', hashPregunta);
                            
                            // Añadir efecto visual al área de upload
                            activeUploadArea.classList.add('paste-active');
                            setTimeout(() => {
                                activeUploadArea.classList.remove('paste-active');
                            }, 1000);
                            
                            this.uploadImage(file, hashPregunta);
                            
                            // Cerrar modal si estamos en el modal de subida de imagen
                            if (activeUploadArea.id && activeUploadArea.id.startsWith('modalUploadArea_')) {
                                this.closeImageUploadModal();
                            }
                        } else {
                            console.log('⚠️ No se encontró área de upload activa para pegar imagen');
                            this.showErrorNotification('❌ No hay área de subida de imágenes activa. Abre el editor de una pregunta primero.');
                        }
                    }
                    break;
                }
            }
        });
    }
    
    viewFullImage(imageUrl) {
        // Abrir imagen en nueva ventana
        window.open(imageUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    }
    
    refreshExplanationTab(hashPregunta) {
        // Encontrar la pregunta y recargar la pestaña de explicación
        const pregunta = this.findQuestionByHash(hashPregunta);
        if (pregunta) {
            // Actualizar el contenido de la pestaña de explicación
            const explanationTab = document.getElementById('tab-explanation');
            if (explanationTab) {
                explanationTab.innerHTML = this.renderExplanationStatus(pregunta);
            }
        }
    }
    
    showLoadingNotification(message) {
        this.showNotification(message, '#2196F3');
    }
    
    showSuccessNotification(message) {
        this.showNotification(message, '#4CAF50');
    }
    
    showErrorNotification(message) {
        this.showNotification(message, '#f44336');
    }
    
    showNotification(message, color) {
        // Remover notificación anterior si existe
        const existingNotification = document.querySelector('.copy-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
        `;
        
        document.body.appendChild(notification);
        
        // Remover después de 4 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }
    
    updateExplanationPreview(hashPregunta) {
        const previewElement = document.getElementById('explanationPreview');
        if (previewElement) {
            const pregunta = this.findQuestionByHash(hashPregunta);
            if (pregunta) {
                previewElement.innerHTML = this.renderExplanationPreview(pregunta);
            }
        }
    }
    
    updateExplanationActions(hashPregunta) {
        const actionsElement = document.querySelector('.explanation-actions');
        if (actionsElement) {
            const pregunta = this.findQuestionByHash(hashPregunta);
            if (pregunta) {
                actionsElement.innerHTML = this.renderExplanationActions(pregunta);
            }
        }
    }
    
    renderDuplicateBadge(question) {
        if (!question.es_duplicada) {
            return '<span class="badge badge-unique" title="Pregunta única">✨ ÚNICA</span>';
        }
        
        const apariciones = question.total_apariciones || 2;
        return `<span class="badge badge-duplicate" title="Aparece en ${apariciones} exámenes">🔄 x${apariciones}</span>`;
    }
    
    renderDuplicateButton(question) {
        if (!question.es_duplicada) {
            return '';
        }
        
        const questionId = `${question.examen_titulacion}_${question.examen_test}_${question.numero}`;
        return `<button class="btn-duplicate" onclick="examViewer.showDuplicateInfo('${question.hash_pregunta}')" title="Ver dónde aparece esta pregunta">
            🔍 Ver duplicados
        </button>`;
    }
    
    renderExplanationButton(question) {
        const hashPregunta = this.getExplanationHash(question);
        const tieneExplicacion = this.checkExplanationExists(hashPregunta);
        
        if (tieneExplicacion) {
            return `<button class="btn-explanation btn-explanation-view" onclick="examViewer.showExplanation('${hashPregunta}')" title="Ver explicación disponible">
                📖 Ver explicación
            </button>`;
        } else {
            return `<button class="btn-explanation btn-explanation-generate" onclick="examViewer.generateExplanation('${hashPregunta}')" title="Generar explicación con IA">
                🤖 Generar explicación
            </button>`;
        }
    }
    
    showDuplicateInfo(hashPregunta) {
        // Buscar todas las apariciones de esta pregunta
        const apariciones = [];
        
        if (this.data && this.data.examenes) {
            this.data.examenes.forEach(examen => {
                examen.preguntas.forEach(pregunta => {
                    if (pregunta.hash_pregunta === hashPregunta) {
                        apariciones.push({
                            convocatoria: examen.convocatoria,
                            titulacion: examen.titulacion,
                            numero_test: examen.numero_test,
                            tipo: examen.tipo,
                            tema: pregunta.tema,
                            numero_pregunta: pregunta.numero,
                            enunciado: pregunta.enunciado
                        });
                    }
                });
            });
        }
        
        // Crear modal con información de duplicados
        this.createDuplicateModal(apariciones);
    }
    
    createDuplicateModal(apariciones) {
        // Eliminar modal existente si lo hay
        const existingModal = document.getElementById('duplicateModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Crear modal
        const modal = document.createElement('div');
        modal.id = 'duplicateModal';
        modal.className = 'modal-overlay';
        
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔄 Apariciones de esta pregunta</h3>
                    <button class="modal-close" onclick="examViewer.closeDuplicateModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="duplicate-summary">
                        <p><strong>Esta pregunta aparece en ${apariciones.length} exámenes:</strong></p>
                        ${apariciones.length > 0 ? `<p class="question-preview">"${apariciones[0].enunciado.substring(0, 100)}..."</p>` : ''}
                    </div>
                    <div class="duplicate-list">
                        ${apariciones.map((aparicion, index) => `
                            <div class="duplicate-item ${index === 0 ? 'current' : ''}">
                                <div class="duplicate-badges">
                                    <span class="badge badge-titulacion">${aparicion.titulacion}</span>
                                    <span class="badge badge-convocatoria">${aparicion.convocatoria}</span>
                                    <span class="badge badge-test">Test ${aparicion.numero_test}</span>
                                    <span class="badge badge-tipo">${aparicion.tipo}</span>
                                </div>
                                <div class="duplicate-details">
                                    <span class="question-number">Pregunta ${aparicion.numero_pregunta}</span>
                                    <span class="question-tema">${aparicion.tema}</span>
                                    ${index === 0 ? '<span class="current-indicator">← Actual</span>' : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="duplicate-stats">
                        <p><strong>Estadísticas:</strong></p>
                        <ul>
                            <li>Convocatorias: ${[...new Set(apariciones.map(a => a.convocatoria))].join(', ')}</li>
                            <li>Titulaciones: ${[...new Set(apariciones.map(a => a.titulacion))].join(', ')}</li>
                            <li>Temas: ${[...new Set(apariciones.map(a => a.tema))].join(', ')}</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="examViewer.closeDuplicateModal()">Cerrar</button>
                    <button class="btn btn-primary" onclick="examViewer.filterByDuplicate('${apariciones[0]?.hash_pregunta || ''}')">
                        Filtrar solo duplicados
                    </button>
                </div>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
        
        // Mostrar modal
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    closeDuplicateModal() {
        const modal = document.getElementById('duplicateModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }
    
    filterByDuplicate(hashPregunta) {
        // Implementar filtro para mostrar solo preguntas duplicadas
        console.log('Filtrar por duplicado:', hashPregunta);
        this.closeDuplicateModal();
        // TODO: Implementar filtro específico
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'flex' : 'none';
    }
    
    showError(message) {
        const container = document.getElementById('questionsContainer');
        container.innerHTML = `
            <div class="alert alert-danger text-center" role="alert">
                <h4>Error</h4>
                <p>${message}</p>
                <button class="btn btn-outline-danger" onclick="location.reload()">
                    Recargar página
                </button>
            </div>
        `;
    }
    
    // ==========================================
    // SISTEMA DE EXPLICACIONES
    // ==========================================
    
    async loadExplanations() {
        console.log('🔄 INICIANDO CARGA DE EXPLICACIONES...');
        this.explicaciones = {};
        
        try {
            console.log('🌐 Cargando desde API Flask...');
            const response = await fetch('http://localhost:5001/explicaciones');
            console.log('📡 Respuesta Flask:', response.status, response.statusText);
            
            if (response.ok) {
                const explicacionesFlask = await response.json();
                this.explicaciones = explicacionesFlask;
                console.log('✅ Explicaciones cargadas desde Flask:', Object.keys(explicacionesFlask).length);
                console.log('🔑 Hashes Flask:', Object.keys(explicacionesFlask));
            } else {
                throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error cargando explicaciones desde Flask:', error.message);
            alert(`Error cargando explicaciones: ${error.message}\n\nVerifica que el servidor Flask esté ejecutándose en http://localhost:5001`);
            throw error; // Re-lanzar el error para que se propague
        }
        
        console.log('📊 Total explicaciones cargadas:', Object.keys(this.explicaciones).length);
        console.log('🔑 Hashes de explicaciones cargadas:', Object.keys(this.explicaciones));
        
        // Actualizar todos los botones después de cargar las explicaciones
        this.updateAllExplanationButtons();
    }
    
    checkExplanationExists(hashPregunta) {
        const exists = hashPregunta && this.explicaciones.hasOwnProperty(hashPregunta);
        console.log('🔍 DEBUG checkExplanationExists:', {
            hashPregunta,
            exists,
            explicacionesKeys: Object.keys(this.explicaciones).slice(0, 3),
            totalExplicaciones: Object.keys(this.explicaciones).length,
            explicacionesObject: this.explicaciones
        });
        return exists;
    }
    
    getExplanationHash(pregunta) {
        // Para generar explicaciones, SIEMPRE usar hash_pregunta
        // hash_explicacion solo se usa para mostrar explicaciones ya generadas
        console.log('🔍 DEBUG getExplanationHash:', {
            hash_explicacion: pregunta.hash_explicacion,
            hash_pregunta: pregunta.hash_pregunta,
            enunciado: pregunta.enunciado?.substring(0, 30) + '...'
        });
        
        // Para generar explicaciones, usar hash_pregunta
        if (pregunta.hash_pregunta) {
            console.log('✅ Usando hash_pregunta para generar explicación:', pregunta.hash_pregunta);
            return pregunta.hash_pregunta;
        }
        
        console.log('❌ No se encontró hash_pregunta para esta pregunta');
        return null;
    }
    
    async generateExplanation(hashPregunta) {
        try {
            // Encontrar la pregunta
            const pregunta = this.findQuestionByHash(hashPregunta);
            if (!pregunta) {
                alert('Error: No se encontró la pregunta');
                return;
            }
            
            // Cambiar botón a estado de carga
            this.updateExplanationButton(hashPregunta, 'loading');
            
            // Generar explicación usando Flask
            const explicacion = await this.callOpenAI(pregunta);
            
            if (explicacion) {
                console.log('🎯 Explicación generada exitosamente para:', hashPregunta);
                
                // Guardar explicación localmente
                await this.saveExplanation(hashPregunta, explicacion);
                
                // Actualizar cache local
                this.explicaciones[hashPregunta] = explicacion;
                console.log('📝 Cache local actualizado');
                
                // Actualizar botón
                this.updateExplanationButton(hashPregunta, 'view');
                console.log('🔄 Botón actualizado a "view"');
                
                // Mostrar explicación generada
                this.showExplanation(hashPregunta);
                
                console.log('✅ Explicación generada exitosamente con Flask');
            } else {
                throw new Error('No se pudo generar la explicación');
            }
            
        } catch (error) {
            console.error('❌ Error generando explicación:', error);
            alert(`Error generando explicación: ${error.message}`);
            
            // Restaurar botón
            this.updateExplanationButton(hashPregunta, 'generate');
        }
    }
    
    async callOpenAI(pregunta) {
        console.log('📝 Enviando pregunta al API Flask en backend');
        
        try {
            // Llamar al API Flask en puerto 5000
            console.log('🚀 Llamando al API Flask (puerto 5001) para GPT-5');
            
            const response = await fetch('http://localhost:5001/generar-explicacion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pregunta)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Error del API Flask:', errorData);
                throw new Error(errorData.error || 'Error del API Flask');
            }
            
            const explicacion = await response.json();
            console.log('✅ Explicación recibida del API Flask:', explicacion);
            
            return explicacion;
            
        } catch (error) {
            console.error('Error llamando a OpenAI:', error);
            throw error;
        }
    }
    
    convertOpenAIResponse(explicacionData, pregunta) {
        // Convertir respuesta de OpenAI al formato del visor
        const opciones = [];
        
        // Añadir opción correcta con el nuevo formato detallado
        const opcionCorrectaData = explicacionData.analisis_detallado?.opcion_correcta;
        if (opcionCorrectaData) {
            const caracteristicasTexto = opcionCorrectaData.caracteristicas?.join('\n• ') || '';
            const definicionCompleta = `${opcionCorrectaData.definicion_tecnica}

🔧 Características:
• ${caracteristicasTexto}

📍 Ubicación y uso: ${opcionCorrectaData.ubicacion_uso}`;

            opciones.push({
                letra: opcionCorrectaData.letra,
                titulo: opcionCorrectaData.nombre,
                definicion: definicionCompleta,
                razon_correcta: `✅ ${opcionCorrectaData.por_que_correcta}`,
                razon_incorrecta: null
            });
        }
        
        // Añadir opciones incorrectas con formato detallado
        if (explicacionData.analisis_detallado?.opciones_incorrectas) {
            for (const opcionIncorrecta of explicacionData.analisis_detallado.opciones_incorrectas) {
                const caracteristicasTexto = opcionIncorrecta.caracteristicas?.join('\n• ') || '';
                const definicionCompleta = `${opcionIncorrecta.definicion_tecnica}

🔧 Características:
• ${caracteristicasTexto}

📍 Ubicación y uso: ${opcionIncorrecta.ubicacion_uso}

🔍 Diferencia clave: ${opcionIncorrecta.diferencia_clave}`;

                opciones.push({
                    letra: opcionIncorrecta.letra,
                    titulo: opcionIncorrecta.nombre,
                    definicion: definicionCompleta,
                    razon_incorrecta: `❌ ${opcionIncorrecta.por_que_incorrecta}`,
                    razon_correcta: null
                });
            }
        }
        
        // Recursos visuales
        const recursos_visuales = [];
        console.log('🖼️ Verificando SVG recibido:', explicacionData.svg_diagrama);
        
        if (explicacionData.svg_diagrama && 
            explicacionData.svg_diagrama !== "null" && 
            explicacionData.svg_diagrama !== null &&
            explicacionData.svg_diagrama.trim() !== '') {
            
            console.log('✅ SVG válido encontrado, añadiendo a recursos visuales');
            recursos_visuales.push({
                tipo: "svg",
                descripcion: "Diagrama explicativo generado por IA",
                svg_content: explicacionData.svg_diagrama,
                texto_alternativo: "Diagrama que ilustra la respuesta correcta"
            });
        } else {
            console.log('❌ No se encontró SVG válido o es null/vacío');
        }
        
        // Crear conclusión enriquecida
        let conclusion = explicacionData.conclusion_didactica || 'Conclusión no disponible';
        if (explicacionData.consejo_memoria) {
            conclusion += `\n\n💡 Consejo para recordar: ${explicacionData.consejo_memoria}`;
        }
        
        return {
            id: `exp_${Date.now()}_${pregunta.hash_pregunta?.substring(0, 8) || 'unknown'}`,
            resumen_pregunta: explicacionData.resumen_pregunta,
            opciones: opciones,
            conclusion: conclusion,
            recursos_visuales: recursos_visuales,
            nivel_dificultad: explicacionData.nivel_dificultad || 'Intermedio',
            fecha_creacion: new Date().toISOString(),
            llm_utilizado: 'openai-gpt-5-frontend'
        };
    }
    
    async saveExplanation(hashPregunta, explicacion) {
        try {
            // Guardar explicación en cache local
            this.explicaciones[hashPregunta] = explicacion;
            
            // Asignar hash_explicacion a la pregunta y todos sus duplicados
            this.assignExplanationToQuestionAndDuplicates(hashPregunta, hashPregunta);
            
            // Guardar explicaciones en el archivo JSON
            await this.saveExplanationsToFile();
            
            console.log('💾 Explicación guardada en cache local para hash:', hashPregunta);
            console.log('📊 Total explicaciones en cache:', Object.keys(this.explicaciones).length);
        } catch (error) {
            console.error('❌ Error actualizando cache local:', error);
        }
    }
    
    async saveExplanationsToFile() {
        try {
            // Enviar explicaciones al servidor Flask para que las guarde
            const response = await fetch('http://localhost:5001/guardar-explicaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.explicaciones)
            });
            
            if (response.ok) {
                console.log('✅ Explicaciones guardadas en el archivo JSON');
            } else {
                console.error('❌ Error guardando explicaciones:', response.status, response.statusText);
            }
            
        } catch (error) {
            console.error('❌ Error guardando explicaciones:', error);
        }
    }
    
    async deleteExplanationFromServer(hashPregunta) {
        try {
            // Enviar solicitud de borrado al servidor Flask
            const response = await fetch('http://localhost:5001/borrar-explicacion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ hash: hashPregunta })
            });
            
            if (response.ok) {
                console.log('✅ Explicación borrada del servidor');
            } else {
                console.error('❌ Error borrando explicación del servidor:', response.status, response.statusText);
            }
            
        } catch (error) {
            console.error('❌ Error borrando explicación del servidor:', error);
        }
    }
    
    assignExplanationToQuestionAndDuplicates(hashPregunta, hashExplicacion) {
        // Buscar la pregunta y asignarle el hash_explicacion
        for (const examen of this.data.examenes) {
            for (const pregunta of examen.preguntas) {
                if (pregunta.hash_pregunta === hashPregunta) {
                    pregunta.hash_explicacion = hashExplicacion;
                    console.log('✅ Asignado hash_explicacion a pregunta:', hashPregunta);
                    
                    // Si es duplicada, asignar a todas las apariciones
                    if (pregunta.es_duplicada && pregunta.otras_apariciones) {
                        for (const otra_aparicion of pregunta.otras_apariciones) {
                            // Buscar la otra aparición y asignarle la explicación
                            for (const otro_examen of this.data.examenes) {
                                for (const otra_pregunta of otro_examen.preguntas) {
                                    if (otra_pregunta.hash_pregunta === otra_aparicion.hash_pregunta &&
                                        otro_examen.convocatoria === otra_aparicion.convocatoria &&
                                        otro_examen.numero_test === otra_aparicion.numero_test) {
                                        otra_pregunta.hash_explicacion = hashExplicacion;
                                        console.log('✅ Asignado hash_explicacion a duplicado:', otra_pregunta.hash_pregunta);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    return;
                }
            }
        }
    }
    
    
    updateExplanationButton(hashPregunta, estado) {
        const buttons = document.querySelectorAll(`[onclick*="'${hashPregunta}'"]`);
        
        buttons.forEach(button => {
            if (button.classList.contains('btn-explanation')) {
                switch (estado) {
                    case 'loading':
                        button.innerHTML = '⏳ Generando...';
                        button.disabled = true;
                        button.className = 'btn-explanation btn-explanation-loading';
                        break;
                    case 'view':
                        button.innerHTML = '📖 Ver explicación';
                        button.disabled = false;
                        button.className = 'btn-explanation btn-explanation-view';
                        button.onclick = () => this.showExplanation(hashPregunta);
                        break;
                    case 'generate':
                        button.innerHTML = '🤖 Generar explicación';
                        button.disabled = false;
                        button.className = 'btn-explanation btn-explanation-generate';
                        button.onclick = () => this.generateExplanation(hashPregunta);
                        break;
                }
            }
        });
    }
    
    showExplanation(hashPregunta) {
        const explicacion = this.explicaciones[hashPregunta];
        if (!explicacion) {
            alert('Explicación no disponible');
            return;
        }
        
        // Crear modal de explicación
        this.createExplanationModal(explicacion, hashPregunta);
    }
    
    createExplanationModal(explicacion, hashPregunta) {
        // Remover modal existente
        this.closeExplanationModal();
        
        const pregunta = this.findQuestionByHash(hashPregunta);
        
        const modal = document.createElement('div');
        modal.id = 'explanationModal';
        modal.className = 'modal-overlay';
        
        // Renderizar opciones
        const opcionesHtml = explicacion.opciones.map(opcion => {
            const esCorrecta = opcion.razon_correcta;
            const claseOpcion = esCorrecta ? 'opcion-correcta' : 'opcion-incorrecta';
            
            return `
                <div class="explicacion-opcion ${claseOpcion}">
                    <div class="opcion-header">
                        <span class="opcion-letra">${opcion.letra})</span>
                        <strong>${opcion.titulo}</strong>
                        ${esCorrecta ? '<span class="badge-correcta">✓ CORRECTA</span>' : ''}
                    </div>
                    <p class="opcion-definicion">${opcion.definicion}</p>
                    ${opcion.razon_incorrecta ? `<p class="razon-incorrecta"><strong>Por qué es incorrecta:</strong> ${opcion.razon_incorrecta}</p>` : ''}
                    ${opcion.razon_correcta ? `<p class="razon-correcta"><strong>Por qué es correcta:</strong> ${opcion.razon_correcta}</p>` : ''}
                </div>
            `;
        }).join('');
        
        // Renderizar imagen o SVG - priorizar imagen subida
        let visualContent = '';
        
        if (explicacion.image_uploaded_url) {
            // Mostrar imagen subida si existe
            visualContent = `
                <div class="image-container">
                    <h4>🖼️ Ilustración:</h4>
                    <img src="http://localhost:5001/${explicacion.image_uploaded_url}" 
                         alt="Imagen de la explicación" 
                         class="explanation-image"
                         style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div class="image-info">
                        <small>📁 ${explicacion.image_uploaded_filename || 'archivo.png'}</small>
                        <small>📅 ${explicacion.image_uploaded_at ? new Date(explicacion.image_uploaded_at).toLocaleString() : 'N/A'}</small>
                    </div>
                </div>
            `;
        } else if (explicacion.recursos_visuales && explicacion.recursos_visuales.length > 0) {
            // Mostrar SVG si no hay imagen subida
            visualContent = explicacion.recursos_visuales.map(rv => 
                rv.svg_content ? `<div class="svg-container">${rv.svg_content}</div>` : ''
            ).join('');
        }
        
        modal.innerHTML = `
            <div class="modal-content explanation-modal">
                <div class="explanation-header">
                    <h2>📖 Explicación de la Pregunta</h2>
                    <button class="modal-close" onclick="examViewer.closeExplanationModal()">×</button>
                </div>
                
                <div class="explanation-body">
                    <div class="pregunta-context">
                        <h3>${explicacion.resumen_pregunta}</h3>
                        <div class="pregunta-original">
                            <strong>Pregunta:</strong> ${pregunta ? pregunta.enunciado : 'No disponible'}
                        </div>
                    </div>
                    
                    ${visualContent}
                    
                    <div class="opciones-explicacion">
                        <h4>Análisis de las opciones:</h4>
                        ${opcionesHtml}
                    </div>
                    
                    <div class="conclusion">
                        <div class="markdown-content">${this.formatMarkdown(explicacion.conclusion)}</div>
                    </div>
                    
                    <div class="explanation-meta">
                        <span class="meta-item">Nivel: ${explicacion.nivel_dificultad}</span>
                        <span class="meta-item">Generado con: ${explicacion.llm_utilizado}</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animar entrada
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    closeExplanationModal() {
        const modal = document.getElementById('explanationModal');
        if (modal) {
            modal.remove();
        }
    }
    
    
    // Función para limpiar todas las explicaciones
    async clearAllExplanations() {
        try {
            // Limpiar cache interno
            this.explicaciones = {};
            
            // Limpiar del servidor Flask
            await this.clearAllExplanationsFromServer();
            
            console.log('✅ Todas las explicaciones han sido borradas');
            
            // Forzar recarga de la página para limpiar cualquier estado
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error('❌ Error limpiando explicaciones:', error);
        }
    }
    
    async clearAllExplanationsFromServer() {
        try {
            // Enviar solicitud de limpieza al servidor Flask
            const response = await fetch('http://localhost:5001/limpiar-explicaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                console.log('✅ Explicaciones limpiadas del servidor');
            } else {
                console.error('❌ Error limpiando explicaciones del servidor:', response.status, response.statusText);
            }
            
        } catch (error) {
            console.error('❌ Error limpiando explicaciones del servidor:', error);
        }
    }
    
    updateAllExplanationButtons() {
        const buttons = document.querySelectorAll('.btn-explanation');
        buttons.forEach(button => {
            const hashPregunta = button.dataset.hash;
            if (hashPregunta) {
                // Verificar si existe la explicación
                const estado = this.checkExplanationExists(hashPregunta) ? 'view' : 'generate';
                this.updateExplanationButton(hashPregunta, estado);
            }
        });
    }
    
    formatMarkdown(text) {
        if (!text) return '';
        
        return text
            // Títulos H2
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            // Títulos H3
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            // Títulos H4
            .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
            // Negritas
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Cursivas
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Listas con viñetas
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            // Envolver listas en UL
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            // Párrafos (líneas separadas por doble salto)
            .replace(/\n\n/g, '</p><p>')
            // Envolver en párrafos
            .replace(/^(.)/s, '<p>$1')
            .replace(/(.)$/s, '$1</p>')
            // Limpiar párrafos vacíos
            .replace(/<p><\/p>/g, '')
            // Limpiar párrafos que solo contienen títulos o listas
            .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1')
            .replace(/<p>(<ul>.*<\/ul>)<\/p>/gs, '$1');
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.examViewer = new ExamViewer();
});

// Función global para limpiar explicaciones
window.clearExplanations = function() {
    if (window.examViewer) {
        window.examViewer.clearAllExplanations();
        alert('✅ Todas las explicaciones han sido borradas');
    }
};

// Función para borrar explicación específica
window.deleteExplanation = function(hashPregunta) {
    if (window.examViewer) {
        // Borrar del cache local
        delete window.examViewer.explicaciones[hashPregunta];
        
        // Borrar del servidor Flask
        window.examViewer.deleteExplanationFromServer(hashPregunta);
        
        // Actualizar botón
        window.examViewer.updateExplanationButton(hashPregunta, 'generate');
        
        console.log('🗑️ Explicación borrada para hash:', hashPregunta);
        alert('✅ Explicación borrada');
    }
};

// Funciones globales para eventos
window.editQuestion = (questionId) => {
    window.examViewer.editQuestion(questionId);
};
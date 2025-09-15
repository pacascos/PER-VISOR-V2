// Módulo para manejo de filtros
export class FilterManager {
    constructor(visor) {
        this.visor = visor;
    }

    buildFilterConditions(convocatoria, tema, search_text) {
        const conditions = [];
        const params = [];

        if (convocatoria) {
            conditions.push("e.convocatoria = ?");
            params.push(convocatoria);
        }

        if (tema) {
            conditions.push("(q.categoria = ? OR q.subcategoria = ?)");
            params.push(tema, tema);
        }

        if (search_text) {
            conditions.push("q.texto_pregunta LIKE ?");
            params.push(`%${search_text}%`);
        }

        return {
            whereClause: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
            params
        };
    }

    applyFilters(questions, filters) {
        let filtered = [...questions];

        if (filters.convocatoria) {
            filtered = filtered.filter(q =>
                q.convocatoria === filters.convocatoria
            );
        }

        if (filters.titulacion) {
            filtered = filtered.filter(q =>
                q.tipo_examen === filters.titulacion
            );
        }

        if (filters.test) {
            filtered = filtered.filter(q =>
                q.test === filters.test
            );
        }

        if (filters.tema) {
            filtered = filtered.filter(q =>
                q.categoria === filters.tema ||
                q.subcategoria === filters.tema
            );
        }

        if (filters.search) {
            filtered = filtered.filter(q =>
                q.texto_pregunta.toLowerCase().includes(filters.search.toLowerCase())
            );
        }

        if (filters.duplicados) {
            // Lógica para filtrar duplicados
            const uniqueHashes = new Set();
            filtered = filtered.filter(q => {
                if (uniqueHashes.has(q.hash_pregunta)) {
                    return false;
                }
                uniqueHashes.add(q.hash_pregunta);
                return true;
            });
        }

        return filtered;
    }

    clearFilters() {
        return {
            convocatoria: '',
            titulacion: '',
            test: '',
            tema: '',
            search: '',
            duplicados: false
        };
    }
}
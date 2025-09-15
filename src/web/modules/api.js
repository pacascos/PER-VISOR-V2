// Módulo para manejo de API
export class ApiClient {
    constructor(baseUrl = 'http://localhost:5001') {
        this.baseUrl = baseUrl;
    }

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API GET error:', error);
            throw error;
        }
    }

    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API POST error:', error);
            throw error;
        }
    }

    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API PUT error:', error);
            throw error;
        }
    }

    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API DELETE error:', error);
            throw error;
        }
    }

    // Métodos específicos de la API
    async getExams() {
        return this.get('/examenes');
    }

    async getQuestions(examId) {
        return this.get(`/preguntas/${examId}`);
    }

    async getFilteredQuestions(filters) {
        const params = new URLSearchParams();
        if (filters.convocatoria) params.append('convocatoria', filters.convocatoria);
        if (filters.tema) params.append('tema', filters.tema);
        if (filters.search) params.append('search', filters.search);

        const queryString = params.toString();
        return this.get(`/preguntas-filtradas${queryString ? '?' + queryString : ''}`);
    }

    async getExplanations() {
        return this.get('/explicaciones');
    }

    async generateExplanation(questionData) {
        return this.post('/generar-explicacion', questionData);
    }

    async updateQuestion(questionId, data) {
        return this.put(`/preguntas/${questionId}`, data);
    }

    async saveExplanation(data) {
        return this.put('/guardar-explicacion', data);
    }

    async deleteExplanation(questionId) {
        return this.delete('/borrar-explicacion', { question_id: questionId });
    }

    async getStats() {
        return this.get('/stats');
    }

    async checkHealth() {
        return this.get('/health');
    }
}
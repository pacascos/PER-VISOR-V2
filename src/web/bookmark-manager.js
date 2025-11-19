/**
 * BookmarkManager - Gestión de preguntas marcadas
 * Maneja el marcado y desmarcado de preguntas durante exámenes y tests
 */
class BookmarkManager {
    constructor(options = {}) {
        this.API_BASE = window.API_BASE !== undefined ? window.API_BASE : '/api';
        this.authToken = options.authToken || localStorage.getItem('token') || localStorage.getItem('authToken');
        this.bookmarkedQuestions = new Set(); // Cache de preguntas marcadas
    }

    /**
     * Obtener el estado de marcado de una pregunta
     */
    async getBookmarkStatus(questionId) {
        try {
            const response = await fetch(`${this.API_BASE}/questions/${questionId}/bookmark/status`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.bookmarked || false;
        } catch (error) {
            console.error('Error obteniendo estado de marcado:', error);
            return false;
        }
    }

    /**
     * Marcar una pregunta
     */
    async bookmarkQuestion(questionId) {
        try {
            const response = await fetch(`${this.API_BASE}/questions/${questionId}/bookmark`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.bookmarkedQuestions.add(questionId);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error marcando pregunta:', error);
            return false;
        }
    }

    /**
     * Desmarcar una pregunta
     */
    async unbookmarkQuestion(questionId) {
        try {
            const response = await fetch(`${this.API_BASE}/questions/${questionId}/bookmark`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.bookmarkedQuestions.delete(questionId);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error desmarcando pregunta:', error);
            return false;
        }
    }

    /**
     * Alternar el estado de marcado de una pregunta
     */
    async toggleBookmark(questionId) {
        const isBookmarked = this.bookmarkedQuestions.has(questionId) || await this.getBookmarkStatus(questionId);
        
        if (isBookmarked) {
            return await this.unbookmarkQuestion(questionId);
        } else {
            return await this.bookmarkQuestion(questionId);
        }
    }

    /**
     * Verificar si una pregunta está marcada (usando cache)
     */
    isBookmarked(questionId) {
        return this.bookmarkedQuestions.has(questionId);
    }

    /**
     * Cargar estado de marcado para una pregunta y actualizar cache
     */
    async loadBookmarkStatus(questionId) {
        const isBookmarked = await this.getBookmarkStatus(questionId);
        if (isBookmarked) {
            this.bookmarkedQuestions.add(questionId);
        } else {
            this.bookmarkedQuestions.delete(questionId);
        }
        return isBookmarked;
    }
}

// Exportar para uso global
window.BookmarkManager = BookmarkManager;


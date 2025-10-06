/**
 * ExamAPI - Unified API Abstraction Layer
 *
 * This class provides a clean abstraction for all exam-related API calls.
 * It eliminates code duplication and provides consistent error handling.
 *
 * Features:
 * - Unified authentication handling
 * - Consistent error handling and retry logic
 * - Support for both full exams and study tests
 * - Automatic token refresh
 * - Request/response logging
 */

class ExamAPI {
    constructor(options = {}) {
        this.API_BASE = window.API_BASE !== undefined ? window.API_BASE : '/api';
        this.authToken = options.authToken || null;
        this.onAuthError = options.onAuthError || null;
        this.retryAttempts = options.retryAttempts || 2;
        this.retryDelay = options.retryDelay || 1000;

        console.log('🌐 ExamAPI initialized -', { API_BASE: this.API_BASE });
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
        console.log('🔑 Auth token updated');
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        return headers;
    }

    /**
     * Generic fetch with error handling and retry logic
     */
    async fetchWithRetry(url, options = {}, attempt = 1) {
        try {
            console.log(`📤 ${options.method || 'GET'}: ${url}${attempt > 1 ? ` (attempt ${attempt})` : ''}`);

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.getAuthHeaders(),
                    ...options.headers
                }
            });

            console.log(`📥 Response: ${response.status} ${response.statusText}`);

            // Handle authentication errors
            if (response.status === 401 || response.status === 403) {
                console.error('❌ Authentication error');
                if (this.onAuthError) {
                    this.onAuthError(response);
                }
                throw new Error('Authentication required');
            }

            // Handle server errors with retry
            if (response.status >= 500 && attempt < this.retryAttempts) {
                console.warn(`⚠️ Server error, retrying in ${this.retryDelay}ms...`);
                await this.delay(this.retryDelay);
                return this.fetchWithRetry(url, options, attempt + 1);
            }

            // Handle client errors
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Request failed: ${response.status} - ${errorText}`);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // Parse JSON response
            const data = await response.json();
            console.log('✅ Request successful');
            return data;

        } catch (error) {
            // Retry on network errors
            if (error.name === 'TypeError' && attempt < this.retryAttempts) {
                console.warn(`⚠️ Network error, retrying in ${this.retryDelay}ms...`);
                await this.delay(this.retryDelay);
                return this.fetchWithRetry(url, options, attempt + 1);
            }

            console.error('❌ Request failed:', error);
            throw error;
        }
    }

    /**
     * Delay helper for retry logic
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==================== AUTHENTICATION ====================

    /**
     * Login user
     */
    async login(username, password) {
        const url = `${this.API_BASE}/auth/login`;
        const data = await this.fetchWithRetry(url, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (data.token) {
            this.setAuthToken(data.token);
        }

        return data;
    }

    /**
     * Get current user info
     */
    async getCurrentUser() {
        const url = `${this.API_BASE}/auth/me`;
        return await this.fetchWithRetry(url);
    }

    /**
     * Logout user
     */
    async logout() {
        const url = `${this.API_BASE}/auth/logout`;
        try {
            await this.fetchWithRetry(url, { method: 'POST' });
        } finally {
            this.authToken = null;
        }
    }

    // ==================== FULL EXAMS ====================

    /**
     * Generate new full exam (45 questions)
     */
    async generateFullExam() {
        const url = `${this.API_BASE}/exams/generate`;
        return await this.fetchWithRetry(url, { method: 'POST' });
    }

    /**
     * Get exam questions
     */
    async getExamQuestions(examId) {
        const url = `${this.API_BASE}/exams/${examId}/questions`;
        return await this.fetchWithRetry(url);
    }

    /**
     * Submit full exam
     */
    async submitExam(examId, answers = null) {
        const url = `${this.API_BASE}/exams/${examId}/submit`;
        const body = answers ? { answers } : undefined;

        return await this.fetchWithRetry(url, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined
        });
    }

    /**
     * Get exam results
     */
    async getExamResults(examId) {
        const url = `${this.API_BASE}/exams/${examId}/results`;
        return await this.fetchWithRetry(url);
    }

    // ==================== STUDY TESTS ====================

    /**
     * Generate study test
     */
    async generateStudyTest(selectedUTs, selectionMode, questionCount = 10) {
        const url = `${this.API_BASE}/study-tests/generate`;
        return await this.fetchWithRetry(url, {
            method: 'POST',
            body: JSON.stringify({
                selected_uts: selectedUTs,
                selection_mode: selectionMode,
                question_count: questionCount
            })
        });
    }

    /**
     * Get study test questions
     */
    async getStudyTestQuestions(studyTestId) {
        const url = `${this.API_BASE}/study-tests/${studyTestId}/questions`;
        return await this.fetchWithRetry(url);
    }

    /**
     * Record answer for study test
     */
    async recordStudyAnswer(studyTestId, questionId, userAnswer, timeSpentSeconds) {
        const url = `${this.API_BASE}/study-tests/${studyTestId}/answer`;
        return await this.fetchWithRetry(url, {
            method: 'POST',
            body: JSON.stringify({
                question_id: questionId,
                user_answer: userAnswer,
                time_spent_seconds: Math.floor(timeSpentSeconds)
            })
        });
    }

    /**
     * Submit study test
     */
    async submitStudyTest(studyTestId) {
        const url = `${this.API_BASE}/study-tests/${studyTestId}/submit`;
        return await this.fetchWithRetry(url, { method: 'POST' });
    }

    /**
     * Get study test results
     */
    async getStudyTestResults(studyTestId) {
        const url = `${this.API_BASE}/study-tests/${studyTestId}/results`;
        return await this.fetchWithRetry(url);
    }

    // ==================== STATISTICS ====================

    /**
     * Get user statistics
     */
    async getUserStats() {
        const url = `${this.API_BASE}/user-stats`;
        return await this.fetchWithRetry(url);
    }

    /**
     * Get PER question statistics
     */
    async getPERStats() {
        const url = `${this.API_BASE}/per-questions/stats`;
        return await this.fetchWithRetry(url);
    }

    /**
     * Get failed questions for specific exam
     */
    async getFailedQuestions(examId) {
        const url = `${this.API_BASE}/user/exam/${examId}/failed-questions`;
        return await this.fetchWithRetry(url);
    }

    /**
     * Record question attempt (for statistics tracking)
     */
    async recordQuestionAttempt(questionId, userAnswer, isCorrect, timeSpent, attempts = 1) {
        const url = `${this.API_BASE}/question-attempt`;
        return await this.fetchWithRetry(url, {
            method: 'POST',
            body: JSON.stringify({
                questionId,
                userAnswer,
                isCorrect,
                timeSpent,
                attempts
            })
        });
    }

    // ==================== ADMIN ====================

    /**
     * Get admin statistics
     */
    async getAdminStats() {
        const url = `${this.API_BASE}/admin/stats`;
        return await this.fetchWithRetry(url);
    }

    /**
     * Get all users (admin only)
     */
    async getUsers() {
        const url = `${this.API_BASE}/admin/users`;
        return await this.fetchWithRetry(url);
    }

    /**
     * Create user (admin only)
     */
    async createUser(userData) {
        const url = `${this.API_BASE}/admin/users`;
        return await this.fetchWithRetry(url, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    /**
     * Update user (admin only)
     */
    async updateUser(userId, userData) {
        const url = `${this.API_BASE}/admin/users/${userId}`;
        return await this.fetchWithRetry(url, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    /**
     * Delete user (admin only)
     */
    async deleteUser(userId) {
        const url = `${this.API_BASE}/admin/users/${userId}`;
        return await this.fetchWithRetry(url, { method: 'DELETE' });
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Check if API is reachable
     */
    async healthCheck() {
        try {
            const url = `${this.API_BASE}/health`;
            const response = await fetch(url);
            return response.ok;
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return false;
        }
    }

    /**
     * Get API configuration
     */
    getConfig() {
        return {
            API_BASE: this.API_BASE,
            hasToken: !!this.authToken,
            retryAttempts: this.retryAttempts,
            retryDelay: this.retryDelay
        };
    }

    /**
     * Clear authentication
     */
    clearAuth() {
        this.authToken = null;
        console.log('🔓 Authentication cleared');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExamAPI;
}

console.log('🌐 ExamAPI class loaded');

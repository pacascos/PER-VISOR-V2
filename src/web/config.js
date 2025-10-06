/**
 * Configuración de Entorno - PER Sistema
 * Detecta automáticamente el entorno y configura las URLs correctas
 */

class EnvironmentConfig {
    constructor() {
        this.detectEnvironment();
        this.setConfiguration();
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Detectar entorno basado en hostname
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            this.environment = 'development';
            this.isProduction = false;
        } else if (hostname === 'bancotest.com') {
            this.environment = 'production';
            this.isProduction = true;
        } else if (hostname.includes('run.app')) {
            this.environment = 'staging';
            this.isProduction = false;
        } else {
            // Fallback - asumir desarrollo
            this.environment = 'development';
            this.isProduction = false;
        }

        console.log(`🌍 Entorno detectado: ${this.environment}`);
    }

    setConfiguration() {
        switch (this.environment) {
            case 'development':
                this.config = {
                    API_BASE: '/api',  // Ruta base para el API
                    FRONTEND_BASE: '', // Relativa - mismo dominio
                    ENVIRONMENT_NAME: 'DESARROLLO',
                    ENVIRONMENT_COLOR: '#059669'
                };
                break;
                
            case 'staging':
                this.config = {
                    API_BASE: 'https://per-api-435987927843.europe-west1.run.app',
                    FRONTEND_BASE: 'https://per-frontend-435987927843.europe-west1.run.app',
                    ENVIRONMENT_NAME: 'STAGING',
                    ENVIRONMENT_COLOR: '#f59e0b'
                };
                break;
                
                   case 'production':
                       this.config = {
                           API_BASE: 'https://per-api-435987927843.europe-west1.run.app',  // Directa al API
                           FRONTEND_BASE: '', // Relativa - mismo dominio
                           ENVIRONMENT_NAME: 'PRODUCCIÓN',
                           ENVIRONMENT_COLOR: '#dc2626'
                       };
                       break;
                
            default:
                // Fallback a desarrollo
                this.config = {
                    API_BASE: '/api',  // Ruta base para el API
                    FRONTEND_BASE: '', // Relativa - mismo dominio
                    ENVIRONMENT_NAME: 'DESARROLLO',
                    ENVIRONMENT_COLOR: '#059669'
                };
        }

        // Configurar variables globales
        window.API_BASE = this.config.API_BASE;
        window.FRONTEND_BASE = this.config.FRONTEND_BASE;
        window.ENVIRONMENT = this.config.ENVIRONMENT_NAME;
        window.ENVIRONMENT_COLOR = this.config.ENVIRONMENT_COLOR;
        window.IS_PRODUCTION = this.isProduction;

        console.log(`🔗 API_BASE configurado: ${this.config.API_BASE}`);
        console.log(`🌐 FRONTEND_BASE configurado: ${this.config.FRONTEND_BASE}`);
    }

    getApiUrl(endpoint = '') {
        return `${this.config.API_BASE}${endpoint}`;
    }

    getFrontendUrl(path = '') {
        return `${this.config.FRONTEND_BASE}${path}`;
    }

    // Método para obtener configuración completa
    getConfig() {
        return { ...this.config, environment: this.environment, isProduction: this.isProduction };
    }
}

// Inicializar configuración global
window.envConfig = new EnvironmentConfig();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentConfig;
}

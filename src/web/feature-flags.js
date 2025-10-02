/**
 * Feature Flags System
 *
 * Manages feature flags for A/B testing and gradual rollouts.
 * Allows controlled deployment of new features to a percentage of users.
 */

class FeatureFlags {
    constructor() {
        this.flags = {};
        this.userId = this.getUserId();
        this.loadFlags();

        console.log('🚩 FeatureFlags initialized for user:', this.userId);
    }

    /**
     * Get or create persistent user ID for consistent A/B testing
     */
    getUserId() {
        let userId = localStorage.getItem('feature_flag_user_id');

        if (!userId) {
            // Generate random user ID (0-99 for easy percentage calculation)
            userId = Math.floor(Math.random() * 100).toString();
            localStorage.setItem('feature_flag_user_id', userId);
        }

        return parseInt(userId);
    }

    /**
     * Load feature flags configuration
     */
    loadFlags() {
        // Default flags configuration
        this.flags = {
            // Use unified exam page instead of exam.html
            'unified_exam_page': {
                enabled: true,
                rolloutPercentage: 75, // 75% of users (increased from 50%)
                description: 'New unified exam page using ExamController'
            },

            // Use unified study mode
            'unified_study_mode': {
                enabled: false,
                rolloutPercentage: 0,
                description: 'New unified study mode using ExamController'
            },

            // Enable new statistics dashboard
            'new_statistics_dashboard': {
                enabled: false,
                rolloutPercentage: 0,
                description: 'New statistics dashboard with charts'
            },

            // Enable keyboard shortcuts
            'keyboard_shortcuts': {
                enabled: true,
                rolloutPercentage: 100,
                description: 'Keyboard shortcuts for navigation'
            },

            // Enable dark mode
            'dark_mode': {
                enabled: false,
                rolloutPercentage: 0,
                description: 'Dark mode UI theme'
            }
        };

        // Override with server-provided flags if available
        const serverFlags = sessionStorage.getItem('feature_flags');
        if (serverFlags) {
            try {
                const parsed = JSON.parse(serverFlags);
                this.flags = { ...this.flags, ...parsed };
                console.log('✅ Loaded server feature flags');
            } catch (error) {
                console.error('❌ Error parsing server feature flags:', error);
            }
        }

        console.log('📋 Feature flags loaded:', Object.keys(this.flags).length);
    }

    /**
     * Check if a feature is enabled for current user
     */
    isEnabled(flagName) {
        const flag = this.flags[flagName];

        if (!flag) {
            console.warn(`⚠️ Unknown feature flag: ${flagName}`);
            return false;
        }

        if (!flag.enabled) {
            return false;
        }

        // Check rollout percentage
        const isInRollout = this.userId < flag.rolloutPercentage;

        console.log(`🚩 Feature "${flagName}": ${isInRollout ? 'ENABLED' : 'DISABLED'} (user ${this.userId} < ${flag.rolloutPercentage}%)`);

        // Track usage metrics
        this.trackUsage(flagName, isInRollout);

        return isInRollout;
    }

    /**
     * Track feature flag usage metrics
     */
    trackUsage(flagName, isEnabled) {
        const metrics = this.getMetrics();
        const key = `${flagName}_${isEnabled ? 'enabled' : 'disabled'}`;

        metrics[key] = (metrics[key] || 0) + 1;
        metrics.total = (metrics.total || 0) + 1;
        metrics.lastChecked = new Date().toISOString();

        localStorage.setItem('feature_flag_metrics', JSON.stringify(metrics));
    }

    /**
     * Get usage metrics
     */
    getMetrics() {
        const stored = localStorage.getItem('feature_flag_metrics');
        return stored ? JSON.parse(stored) : {};
    }

    /**
     * Clear metrics
     */
    clearMetrics() {
        localStorage.removeItem('feature_flag_metrics');
        console.log('📊 Metrics cleared');
    }

    /**
     * Force enable a feature (for testing)
     */
    forceEnable(flagName) {
        if (this.flags[flagName]) {
            this.flags[flagName].rolloutPercentage = 100;
            console.log(`✅ Force enabled feature: ${flagName}`);
        }
    }

    /**
     * Force disable a feature (for testing)
     */
    forceDisable(flagName) {
        if (this.flags[flagName]) {
            this.flags[flagName].rolloutPercentage = 0;
            console.log(`❌ Force disabled feature: ${flagName}`);
        }
    }

    /**
     * Get all flags status for current user
     */
    getAllFlags() {
        const status = {};
        Object.keys(this.flags).forEach(flagName => {
            status[flagName] = this.isEnabled(flagName);
        });
        return status;
    }

    /**
     * Log current flags status
     */
    logStatus() {
        console.log('\n' + '='.repeat(60));
        console.log('🚩 FEATURE FLAGS STATUS');
        console.log('='.repeat(60));
        console.log(`User ID: ${this.userId}`);
        console.log('');

        Object.entries(this.flags).forEach(([name, config]) => {
            const enabled = this.isEnabled(name);
            const icon = enabled ? '✅' : '❌';
            console.log(`${icon} ${name.padEnd(30)} ${enabled ? 'ON' : 'OFF'} (${config.rolloutPercentage}%)`);
            console.log(`   ${config.description}`);
        });

        console.log('='.repeat(60) + '\n');
    }

    /**
     * Log usage metrics
     */
    logMetrics() {
        const metrics = this.getMetrics();

        console.log('\n' + '='.repeat(60));
        console.log('📊 FEATURE FLAG METRICS');
        console.log('='.repeat(60));
        console.log(`Total checks: ${metrics.total || 0}`);
        console.log(`Last checked: ${metrics.lastChecked || 'Never'}`);
        console.log('');

        // Group by feature
        const byFeature = {};
        Object.entries(metrics).forEach(([key, value]) => {
            if (key === 'total' || key === 'lastChecked') return;

            const [feature, status] = key.split('_enabled');
            const featureName = feature + (status ? '_enabled' : '_disabled');

            if (!byFeature[feature]) {
                byFeature[feature] = { enabled: 0, disabled: 0 };
            }

            if (key.includes('_enabled')) {
                byFeature[feature].enabled = value;
            } else {
                byFeature[feature].disabled = value;
            }
        });

        Object.entries(byFeature).forEach(([feature, counts]) => {
            const total = counts.enabled + counts.disabled;
            const percentage = total > 0 ? ((counts.enabled / total) * 100).toFixed(1) : 0;
            console.log(`📌 ${feature}:`);
            console.log(`   Enabled: ${counts.enabled} (${percentage}%)`);
            console.log(`   Disabled: ${counts.disabled} (${(100 - percentage).toFixed(1)}%)`);
            console.log('');
        });

        console.log('='.repeat(60) + '\n');
    }
}

// Create global instance
const featureFlags = new FeatureFlags();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeatureFlags;
}

console.log('🚩 FeatureFlags system loaded');

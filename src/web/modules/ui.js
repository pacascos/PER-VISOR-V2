// Módulo para manejo de UI
export class UIManager {
    constructor(visor) {
        this.visor = visor;
    }

    showLoading(message = 'Cargando...') {
        const loadingDiv = document.getElementById('loading') || this.createLoadingElement();
        loadingDiv.textContent = message;
        loadingDiv.style.display = 'block';
    }

    hideLoading() {
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }

    createLoadingElement() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading';
        loadingDiv.className = 'loading-overlay';
        loadingDiv.textContent = 'Cargando...';
        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }

    showError(message, title = 'Error') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-header">
                <h3>${title}</h3>
                <button class="close-btn">&times;</button>
            </div>
            <p>${message}</p>
        `;

        document.body.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);

        // Close button functionality
        errorDiv.querySelector('.close-btn').addEventListener('click', () => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        });
    }

    showSuccess(message, title = 'Éxito') {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div class="success-header">
                <h3>${title}</h3>
                <button class="close-btn">&times;</button>
            </div>
            <p>${message}</p>
        `;

        document.body.appendChild(successDiv);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);

        // Close button functionality
        successDiv.querySelector('.close-btn').addEventListener('click', () => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        });
    }

    updateCounter(current, total) {
        const counterElement = document.getElementById('question-counter');
        if (counterElement) {
            counterElement.textContent = `${current} de ${total}`;
        }
    }

    updateProgressBar(percentage) {
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    toggleElement(elementId, show = null) {
        const element = document.getElementById(elementId);
        if (element) {
            if (show === null) {
                element.style.display = element.style.display === 'none' ? 'block' : 'none';
            } else {
                element.style.display = show ? 'block' : 'none';
            }
        }
    }

    clearContent(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '';
        }
    }

    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    setElementHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    }

    addClickListener(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', handler);
        }
    }

    removeClickListeners(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        }
    }

    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }
}
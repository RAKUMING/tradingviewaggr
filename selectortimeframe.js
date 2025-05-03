// timeframeSelector.js - Maneja la funcionalidad del selector de temporalidades

class TimeframeSelector {
    constructor(options = {}) {
        this.containerId = options.containerId || 'timeframes';
        this.buttonClass = options.buttonClass || 'timeframe-btn';
        this.activeClass = options.activeClass || 'active';
        this.defaultTimeframe = options.defaultTimeframe || '1h';
        this.onTimeframeChange = options.onTimeframeChange || null;
        
        this.container = document.getElementById(this.containerId);
        this.buttons = [];
        
        this.initialize();
    }
    
    // Inicializar el selector
    initialize() {
        if (!this.container) {
            console.error(`Contenedor con ID '${this.containerId}' no encontrado`);
            return;
        }
        
        // Obtener todos los botones de temporalidad
        this.buttons = this.container.querySelectorAll(`.${this.buttonClass}`);
        
        // Configurar los event listeners
        this.setupEventListeners();
        
        // Establecer temporalidad por defecto
        this.setActiveTimeframe(this.defaultTimeframe);
    }
    
    // Configurar event listeners para los botones
    setupEventListeners() {
        this.buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const timeframe = btn.getAttribute('data-time');
                await this.changeTimeframe(timeframe);
            });
        });
    }
    
    // Cambiar a una nueva temporalidad
    async changeTimeframe(timeframe) {
        // Actualizar estado visual
        this.setActiveTimeframe(timeframe);
        
        // Ejecutar callback si existe
        if (typeof this.onTimeframeChange === 'function') {
            try {
                await this.onTimeframeChange(timeframe);
            } catch (error) {
                console.error('Error al cambiar temporalidad:', error);
            }
        }
        
        return timeframe;
    }
    
    // Establecer botón activo
    setActiveTimeframe(timeframe) {
        // Quitar clase activa de todos los botones
        this.buttons.forEach(b => b.classList.remove(this.activeClass));
        
        // Añadir clase activa al botón correspondiente
        const activeButton = Array.from(this.buttons).find(
            btn => btn.getAttribute('data-time') === timeframe
        );
        
        if (activeButton) {
            activeButton.classList.add(this.activeClass);
        }
    }
    
    // Obtener la temporalidad actual
    getCurrentTimeframe() {
        const activeButton = this.container.querySelector(`.${this.buttonClass}.${this.activeClass}`);
        return activeButton ? activeButton.getAttribute('data-time') : this.defaultTimeframe;
    }
    
    // Añadir una nueva temporalidad
    addTimeframe(timeframe, label) {
        const button = document.createElement('button');
        button.className = this.buttonClass;
        button.setAttribute('data-time', timeframe);
        button.textContent = label || timeframe;
        
        this.container.appendChild(button);
        this.buttons = this.container.querySelectorAll(`.${this.buttonClass}`);
        
        // Actualizar event listeners
        button.addEventListener('click', async () => {
            await this.changeTimeframe(timeframe);
        });
        
        return button;
    }
    
    // Eliminar una temporalidad
    removeTimeframe(timeframe) {
        const buttonToRemove = Array.from(this.buttons).find(
            btn => btn.getAttribute('data-time') === timeframe
        );
        
        if (buttonToRemove) {
            buttonToRemove.remove();
            this.buttons = this.container.querySelectorAll(`.${this.buttonClass}`);
        }
    }
}

// Exportar la clase para su uso
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeframeSelector;
}

// manejador-alertas.js
class ManejadorAlertas {
    constructor() {
        this.elementoEMA = document.getElementById('alerta'); // Elemento para mostrar EMA20 y tendencia
        this.elementoEMA50 = document.getElementById('indicador-alerta'); // Elemento para mostrar solo EMA50
    }

    actualizarAlertas(indicadoresData) {
        // Verificar que los datos sean válidos
        if (!indicadoresData.ema20 || !indicadoresData.ema50 || 
            indicadoresData.ema20.length === 0 || indicadoresData.ema50.length === 0 || 
            !indicadoresData.candles || indicadoresData.candles.length === 0) {
            return;
        }

        // Obtener los valores más recientes
        const ultimoPrecio = indicadoresData.candles[indicadoresData.candles.length - 1].close;
        const ultimoEMA20 = indicadoresData.ema20[indicadoresData.ema20.length - 1].value;
        const ultimoEMA50 = indicadoresData.ema50[indicadoresData.ema50.length - 1].value;

        // Determinar tendencia con EMA20
        let estado = '';
        let clase = '';

        if (ultimoPrecio > ultimoEMA20) {
            estado = 'ALCISTA ↑';
            clase = 'price-up';
        } else if (ultimoPrecio < ultimoEMA20) {
            estado = 'BAJISTA ↓';
            clase = 'price-down';
        } else {
            estado = 'NEUTRAL →';
            clase = '';
        }

        // Actualizar texto de la alerta
        this.elementoEMA.textContent = `EMA20: ${ultimoEMA20.toFixed(2)} | ${estado}`;
        this.elementoEMA.className = clase;

        // Mostrar solo el valor de la EMA50
        this.elementoEMA50.textContent = `EMA50: ${ultimoEMA50.toFixed(2)}`;
    }
}

// Crear una instancia global para ser accedida desde otros scripts
window.manejadorAlertas = new ManejadorAlertas();

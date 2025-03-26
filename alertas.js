class ManejadorAlertas {
    constructor() {
        this.elementoAlerta = document.getElementById('alerta'); // Elemento para mostrar la señal de trading
        this.elementoEMA50 = document.getElementById('indicador-alerta'); // Elemento para mostrar EMA50
    }

    actualizarAlertas(indicadoresData) {
        // Verificar que los datos sean válidos y que haya al menos 2 valores en EMA20
        if (!indicadoresData.ema20 || indicadoresData.ema20.length < 2 ||
            !indicadoresData.ema50 || indicadoresData.ema50.length < 1) {
            return;
        }

        // Obtener los valores actuales y previos de EMA20
        const ultimoEMA20 = indicadoresData.ema20[indicadoresData.ema20.length - 1].value;
        const prevEMA20 = indicadoresData.ema20[indicadoresData.ema20.length - 2].value;
        const ultimoEMA50 = indicadoresData.ema50[indicadoresData.ema50.length - 1].value;

        let mensaje = '';
        let clase = '';

        // Determinar la pendiente de EMA20
        if (ultimoEMA20 > prevEMA20) {
            mensaje = 'LONG 🟩'; // Tendencia alcista
            clase = 'long';
        } else if (ultimoEMA20 < prevEMA20) {
            mensaje = 'SHORT 🟥'; // Tendencia bajista
            clase = 'short';
        } else {
            mensaje = 'NEUTRAL ➖';
            clase = 'neutral';
        }

        // Actualizar el contenido de la alerta
        this.elementoAlerta.textContent = `EMA20: ${ultimoEMA20.toFixed(2)} | ${mensaje}`;
        this.elementoAlerta.className = clase;

        // Mostrar el valor de la EMA50
        this.elementoEMA50.textContent = `EMA50: ${ultimoEMA50.toFixed(2)}`;
    }
}

// Instancia global para acceder desde otros scripts
window.manejadorAlertas = new ManejadorAlertas();

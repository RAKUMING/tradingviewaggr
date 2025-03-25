// manejador-alertas.js
class ManejadorAlertas {
    constructor() {
        this.elementoEMA20 = document.getElementById('alerta');
        this.elementoIndicador = document.getElementById('indicador-alerta');
    }

    actualizarAlertas(indicadoresData) {
        // Verificar si tenemos datos de EMA20 y precio
        if (indicadoresData.ema20 && indicadoresData.ema20.length > 0 && 
            indicadoresData.candles && indicadoresData.candles.length > 0) {
            
            // Obtener el último precio de cierre y el último valor de EMA20
            const ultimoPrecio = indicadoresData.candles[indicadoresData.candles.length - 1].close;
            const ultimoEMA20 = indicadoresData.ema20[indicadoresData.ema20.length - 1].value;

            // Determinar la relación entre precio y EMA20
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

            // Calcular el porcentaje de distancia
            const porcentajeDiferencia = Math.abs((ultimoPrecio - ultimoEMA20) / ultimoEMA20 * 100);

            // Actualizar texto de la alerta
            this.elementoEMA20.textContent = `EMA20: ${ultimoEMA20.toFixed(2)} | ${estado}`;
            this.elementoEMA20.className = clase;

            // Mostrar porcentaje de distancia
            this.elementoIndicador.textContent = `Distancia: ${porcentajeDiferencia.toFixed(2)}%`;
        }
    }
}

// Crear una instancia global para ser accedida desde otros scripts
window.manejadorAlertas = new ManejadorAlertas();
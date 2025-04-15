class ManejadorAlertas {
    constructor() {
        this.texview1 = document.getElementById('texview1');
        this.texview2 = document.getElementById('texview2');
        this.texview3 = document.getElementById('texview3');
        this.texview4 = document.getElementById('texview4');
    }

    actualizarAlertas(indicadoresData, indicadores2Data, ultimoCierre, liquidacionesData) {
        // Verificar que los datos existan antes de procesarlos
        if (!indicadoresData || !indicadores2Data) {
            console.error("Datos de indicadores no disponibles");
            return;
        }

        const close = ultimoCierre;
        
        // Error: binanceAPI no está definido
        // Usando una variable temporal para evitar el error
        const precioCurrent = this.getCurrentPrice ? this.getCurrentPrice() : close;

        // Procesamiento de liquidaciones
        const ultimaLiquidacionLong = (liquidacionesData && liquidacionesData.long && liquidacionesData.long.length > 0)
            ? Math.abs(liquidacionesData.long[liquidacionesData.long.length - 1].value)
            : 0;

        const ultimaLiquidacionShort = (liquidacionesData && liquidacionesData.short && liquidacionesData.short.length > 0)
            ? liquidacionesData.short[liquidacionesData.short.length - 1].value
            : 0;

        let totalLiquidacionesLong = 0;
        if (liquidacionesData && liquidacionesData.long && liquidacionesData.long.length > 0) {
            const longLength = liquidacionesData.long.length;
            const startIdx = Math.max(0, longLength - 10);
            for (let i = startIdx; i < longLength; i++) {
                totalLiquidacionesLong += Math.abs(liquidacionesData.long[i].value);
            }
        }

        let totalLiquidacionesShort = 0;
        if (liquidacionesData && liquidacionesData.short && liquidacionesData.short.length > 0) {
            const shortLength = liquidacionesData.short.length;
            const startIdx = Math.max(0, shortLength - 10);
            for (let i = startIdx; i < shortLength; i++) {
                totalLiquidacionesShort += liquidacionesData.short[i].value;
            }
        }

        const totalLiquidaciones = totalLiquidacionesLong + totalLiquidacionesShort;

        const ratioLiquidaciones = totalLiquidaciones > 0
            ? totalLiquidacionesLong / totalLiquidaciones
            : 0.5;

        // Obtener valores actualizados con verificación de datos
        // Verificar que cada array tenga suficientes elementos antes de acceder
        const ultimoVolumen = this.getValueSafely(indicadoresData.volumen, -1);
        const ultimoRSI = this.getValueSafely(indicadoresData.rsi, -1);
        const ultimoRSIOverBought = this.getValueSafely(indicadoresData.lineasRSI.sobreCompra, -1);
        const ultimoRSIOverSold = this.getValueSafely(indicadoresData.lineasRSI.sobreVenta, -1);
        const ultimoEMA20 = this.getValueSafely(indicadoresData.ema20, -1);
        const ultimoEMA50 = this.getValueSafely(indicadoresData.ema50, -1);
        const ultimoMACD = this.getValueSafely(indicadoresData.macd, -1);
        const ultimoMACDSignal = this.getValueSafely(indicadoresData.signal, -1);
        const ultimoMACDHistogram = this.getValueSafely(indicadoresData.histograma, -1);
        const ultimoBBInferior = this.getValueSafely(indicadoresData.bollinger.bb_inferior, -1);
        const ultimoBBSuperior = this.getValueSafely(indicadoresData.bollinger.bb_superior, -1);
        const ultimoSqueeze = this.getValueSafely(indicadores2Data.squeeze, -1);
        
        // Obtener valores anteriores inmediatos
        const anteriorVolumen = this.getValueSafely(indicadoresData.volumen, -2);
        const anteriorRSI = this.getValueSafely(indicadoresData.rsi, -2);
        // Corrigiendo el índice para anteriorEMA20 (estaba usando -3)
        const anteriorEMA20 = this.getValueSafely(indicadoresData.ema20, -2);
        const anteriorEMA50 = this.getValueSafely(indicadoresData.ema50, -2);
        const anteriorMACD = this.getValueSafely(indicadoresData.macd, -2);
        const anteriorMACDSignal = this.getValueSafely(indicadoresData.signal, -2);
        const anteriorMACDHistogram = this.getValueSafely(indicadoresData.histograma, -2);
        const anteriorBBInferior = this.getValueSafely(indicadoresData.bollinger.bb_inferior, -2);
        const anteriorBBSuperior = this.getValueSafely(indicadoresData.bollinger.bb_superior, -2);
        const anteriorSqueeze = this.getValueSafely(indicadores2Data.squeeze, -2);

        // Determinar tendencia con condiciones personalizadas directamente en el if
        const esAlcista =
            ultimoRSI > 25 &&
            ultimoMACDHistogram > anteriorMACDHistogram &&
            ultimoMACDSignal < ultimoMACD &&
           ultimoSqueeze > anteriorSqueeze &&
            close >= ultimoBBInferior &&
            close <= ultimoBBSuperior &&
            close > ultimoEMA20;

        const esBajista =
            ultimoRSI < 75 &&
            ultimoMACDHistogram < anteriorMACDHistogram &&
            ultimoMACDSignal > ultimoMACD &&
           ultimoSqueeze < anteriorSqueeze &&
           close >= ultimoBBInferior &&
           close <= ultimoBBSuperior &&
           close < ultimoEMA20;

        // Actualizar los elementos de la interfaz
        if (esAlcista) {
            this.texview1.textContent = 'Alcista ⬆️';
        } else if (esBajista) {
            this.texview1.textContent = 'Bajista ⬇️';
        } else {
            this.texview1.textContent = 'Neutral';
        }

        // Mostrar valores en sus elementos correspondientes
        if (this.texview2) this.texview2.textContent = ratioLiquidaciones.toFixed(2);
        if (this.texview3) this.texview3.textContent = ultimoCierre.toFixed(2);
        if (this.texview4) this.texview4.textContent = ultimaLiquidacionShort.toFixed(2);
    }

    // Método auxiliar para obtener valores de manera segura
    getValueSafely(array, index) {
        if (!array || !Array.isArray(array) || array.length === 0) {
            return 0;
        }
        
        const actualIndex = index < 0 ? array.length + index : index;
        
        if (actualIndex < 0 || actualIndex >= array.length) {
            return 0;
        }
        
        return array[actualIndex].value || 0;
    }
    
    
}

// Instanciar la clase y hacerla accesible globalmente
window.manejadorAlertas = new ManejadorAlertas();

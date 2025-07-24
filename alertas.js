class ManejadorAlertas {

    // =================== Inicialización y elementos del DOM ===================
    constructor() {
        this.texview1 = document.getElementById('texview1'); // EMA: Alcista/Bajista
        this.texview2 = document.getElementById('texview2'); // SuperTrend: Alcista/Bajista
        this.texview3 = document.getElementById('texview3'); // Liquidación SHORT
        this.texview4 = document.getElementById('texview4'); // Liquidación LONG
        this.texview5 = document.getElementById('texview5'); // Estado del sistema 🟢 ON

        this.latestIndicadoresData = {};     // Indicadores técnicos principales
        this.latestIndicadores2Data = {};    // Indicadores secundarios (como SuperTrend)
        this.latestLiquidationData = {};     // Datos de liquidaciones
    }

    // =================== Actualiza todos los valores y muestra resumen ===================
    actualizarAlertas(indicadoresData, indicadores2Data = {}, liquidationData = {}) {
        this.latestIndicadoresData = indicadoresData;
        this.latestIndicadores2Data = indicadores2Data;
        this.latestLiquidationData = liquidationData;

        // Indicadores técnicos disponibles
        const rsi = this.getValueSafely(indicadoresData?.rsi, -1)?.value;
        const ema20 = this.getValueSafely(indicadoresData?.ema20, -1)?.value;
        const ema50 = this.getValueSafely(indicadoresData?.ema50, -1)?.value;
        const macd = this.getValueSafely(indicadoresData?.macd, -1)?.value;
        const signal = this.getValueSafely(indicadoresData?.signal, -1)?.value;
        const histograma = this.getValueSafely(indicadoresData?.histograma, -1)?.value;
        const bb_inferior = this.getValueSafely(indicadoresData?.bollinger?.bb_inferior, -1)?.value;
        const bb_superior = this.getValueSafely(indicadoresData?.bollinger?.bb_superior, -1)?.value;
        const volumen = this.getValueSafely(indicadoresData?.volumen, -1)?.value;
        const close = this.getValueSafely(indicadoresData?.candles, -1)?.close;

        // Indicadores secundarios
        const squeeze = this.getValueSafely(indicadores2Data?.squeeze, -1)?.value;
        const supertrend = this.getValueSafely(indicadores2Data?.supertrend, -1)?.value;

        // Datos de liquidaciones recientes
        const liqShort = Array.isArray(liquidationData?.short) ? liquidationData.short.at(-15) ?? 0 : 0;
        const liqLong = Array.isArray(liquidationData?.long) ? liquidationData.long.at(-5) ?? 0 : 0;

        // =================== Mostrar tendencia EMA ===================
        if (this.texview1) {
            if (ema20 && ema50) {
                const tendencia = ema20 > ema50 ? '📈 EMA Alcista' : '📉 EMA Bajista';
                this.texview1.textContent = tendencia;
            } else {
                this.texview1.textContent = 'Tendencia EMA: N/A';
            }
        }

        // =================== Mostrar SuperTrend ===================
        if (this.texview2) {
            if (supertrend !== undefined) {
                const tendenciaST = supertrend > 0 ? '📈 Supertrend Alcista' : '📉 Supertrend Bajista';
                this.texview2.textContent = tendenciaST;
            } else {
                this.texview2.textContent = 'Tendencia ST: N/A';
            }
        }

        // =================== Mostrar Liquidaciones ===================
        if (this.texview3) this.texview3.textContent = `Liq.SHORT: ${liqShort.toLocaleString('es-ES')}`;
        if (this.texview4) this.texview4.textContent = `Liq.LONG: ${liqLong.toLocaleString('es-ES')}`;

        // =================== Estado del sistema ===================
        if (this.texview5) this.texview5.textContent = '🟢 System ONN';
    }

    // =================== Acceso seguro a arrays con índice negativo ===================
    getValueSafely(array, index) {
        if (!Array.isArray(array) || array.length === 0) return undefined;
        const i = index < 0 ? array.length + index : index;
        return i >= 0 && i < array.length ? array[i] : undefined;
    }
}

// =================== Inicializar manejador al cargar la página ===================
document.addEventListener('DOMContentLoaded', () => {
    window.manejadorAlertas = new ManejadorAlertas();
});

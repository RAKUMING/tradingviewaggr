class Indicadores2 {
    constructor() {
        this.cache = {
            squeeze: null,
            supertrend: null
        };
    }

    resetCache() {
        for (const key in this.cache) {
            this.cache[key] = null;
        }
    }

    // Función auxiliar para calcular EMA (reutilizada de la clase principal)
    calcularEMA(data, periodo) {
        const alpha = 2 / (periodo + 1);
        const ema = [];
        
        ema.push(data[0]);
        
        for (let i = 1; i < data.length; i++) {
            const valor = alpha * data[i] + (1 - alpha) * ema[i - 1];
            ema.push(valor);
        }
        
        return ema;
    }

    // Función auxiliar para calcular RMA (usado en ATR)
    calcularRMA(data, periodo) {
        const alpha = 1 / periodo;
        const rma = [];
        
        rma.push(data[0]);
        
        for (let i = 1; i < data.length; i++) {
            const valor = alpha * data[i] + (1 - alpha) * rma[i - 1];
            rma.push(valor);
        }
        
        return rma;
    }

    // SMA adaptativa que no requiere período completo
    smaAdaptativa(array, length, index) {
        if (index === 0) return array[0];
        
        const startIndex = Math.max(0, index - length + 1);
        const slice = array.slice(startIndex, index + 1);
        return slice.reduce((sum, val) => sum + val, 0) / slice.length;
    }

    // Regresión lineal adaptativa
    linregAdaptativa(array, length, index) {
        if (index === 0) return 0;
        
        const startIndex = Math.max(0, index - length + 1);
        const slice = array.slice(startIndex, index + 1);
        const n = slice.length;
        
        if (n < 2) return 0;
        
        const sumX = (n * (n - 1)) / 2;
        const sumY = slice.reduce((a, b) => a + b, 0);
        const sumXY = slice.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        const denominator = n * sumX2 - sumX * sumX;
        if (denominator === 0) return 0;

        return (n * sumXY - sumX * sumY) / denominator;
    }

    calcularSqueezeMomentum(data, options = {}) {
        const defaultOptions = {
            length: 20,
            smoothing: 3
        };
        const opts = { ...defaultOptions, ...options };

        if (this.cache.squeeze && this.cache.squeeze.length === data.close.length) {
            return this.cache.squeeze;
        }

        const source = data.close;
        const squeeze = [];

        // Calcular highest/lowest adaptativo y SMA
        for (let i = 0; i < source.length; i++) {
            // Highest/Lowest adaptativo (usa máximo 10 períodos o todos los disponibles)
            const lookback = Math.min(10, i + 1);
            const highSlice = data.high.slice(Math.max(0, i - lookback + 1), i + 1);
            const lowSlice = data.low.slice(Math.max(0, i - lookback + 1), i + 1);
            
            const highestHigh = Math.max(...highSlice);
            const lowestLow = Math.min(...lowSlice);
            
            // SMA adaptativa
            const smaClose = this.smaAdaptativa(source, opts.length, i);
            
            // Midpoint
            const midpoint = ((highestHigh + lowestLow) / 2 + smaClose) / 2;
            
            // Regresión lineal adaptativa
            const sz = this.linregAdaptativa(source, opts.length, i);
            
            squeeze.push(sz);
        }

        // Aplicar suavizado EMA en lugar de SMA
        const squeezeSuavizado = this.calcularEMA(squeeze, opts.smoothing);

        this.cache.squeeze = squeezeSuavizado;
        return squeezeSuavizado;
    }

    obtenerDatosSqueezeMomentum(data, options = {}) {
        const squeeze = this.calcularSqueezeMomentum(data, options);

        return data.time.map((time, i) => {
            let color;
            if (squeeze[i] > 0) {
                color = (i > 0 && squeeze[i] > squeeze[i - 1]) ? 'rgba(0, 255, 0, 1)' : 'rgba(0, 255, 0, 0.5)';
            } else {
                color = (i > 0 && squeeze[i] < squeeze[i - 1]) ? 'rgba(255, 0, 0, 1)' : 'rgba(255, 0, 0, 0.5)';
            }

            return {
                time: time,
                value: squeeze[i],
                color: color
            };
        });
    }

    calcularSuperTrend(data, length = 10, multiplier = 3) {
        if (this.cache.supertrend && this.cache.supertrend.length === data.close.length) {
            return this.cache.supertrend;
        }

        const supertrend = [];
        const upperBand = [];
        const lowerBand = [];

        // Calcular True Range para cada vela
        const trueRanges = [];
        trueRanges.push(data.high[0] - data.low[0]); // Primer TR

        for (let i = 1; i < data.close.length; i++) {
            const tr = Math.max(
                data.high[i] - data.low[i],
                Math.abs(data.high[i] - data.close[i - 1]),
                Math.abs(data.low[i] - data.close[i - 1])
            );
            trueRanges.push(tr);
        }

        // Calcular ATR usando RMA (como TradingView)
        const atr = this.calcularRMA(trueRanges, length);

        // Calcular SuperTrend desde el primer dato
        for (let i = 0; i < data.close.length; i++) {
            const hl2 = (data.high[i] + data.low[i]) / 2;
            const basicUpperBand = hl2 + multiplier * atr[i];
            const basicLowerBand = hl2 - multiplier * atr[i];

            if (i === 0) {
                upperBand.push(basicUpperBand);
                lowerBand.push(basicLowerBand);
                supertrend.push(data.close[i] > basicUpperBand ? basicLowerBand : basicUpperBand);
            } else {
                // Lógica de bandas
                const finalUpperBand = (basicUpperBand < upperBand[i - 1] || data.close[i - 1] > upperBand[i - 1]) 
                    ? basicUpperBand 
                    : upperBand[i - 1];
                
                const finalLowerBand = (basicLowerBand > lowerBand[i - 1] || data.close[i - 1] < lowerBand[i - 1]) 
                    ? basicLowerBand 
                    : lowerBand[i - 1];

                upperBand.push(finalUpperBand);
                lowerBand.push(finalLowerBand);

                // Lógica de SuperTrend
                const prevSupertrend = supertrend[i - 1];
                let currentSupertrend;

                if (prevSupertrend === upperBand[i - 1]) {
                    currentSupertrend = data.close[i] <= finalUpperBand ? finalUpperBand : finalLowerBand;
                } else {
                    currentSupertrend = data.close[i] >= finalLowerBand ? finalLowerBand : finalUpperBand;
                }

                supertrend.push(currentSupertrend);
            }
        }

        this.cache.supertrend = supertrend;
        return supertrend;
    }

    obtenerDatosSuperTrend(data, length = 10, multiplier = 1.5) {
        const supertrend = this.calcularSuperTrend(data, length, multiplier);

        return data.time.map((time, i) => ({
            time: time,
            value: supertrend[i],
            color: supertrend[i] > data.close[i] ? 'rgba(255, 0, 0, 1)' : 'rgba(0, 255, 0, 1)'
        }));
    }

    calcularTodosLosIndicadores2(data) {
        if (!data.close || data.close.length === 0) {
            console.error('Datos de cierre (close) no disponibles.');
            return null;
        }

        return {
            squeeze: this.obtenerDatosSqueezeMomentum(data),
            supertrend: this.obtenerDatosSuperTrend(data)
        };
    }
}

// Exportar la clase para uso en navegador
if (typeof window !== 'undefined') {
    window.Indicadores2 = Indicadores2;
}

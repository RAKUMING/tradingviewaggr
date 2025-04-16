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

    highest(array, length) {
        if (array.length < length) return null;
        return Math.max(...array.slice(-length));
    }

    lowest(array, length) {
        if (array.length < length) return null;
        return Math.min(...array.slice(-length));
    }

    sma(array, length) {
        if (array.length < length) return null;
        const slice = array.slice(-length);
        return slice.reduce((sum, val) => sum + val, 0) / length;
    }

    avg(values) {
        const validValues = values.filter(val => val !== null && !isNaN(val));
        if (validValues.length === 0) return null;
        return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    }

    linreg(array, length) {
        if (array.length < length) return null;

        const slice = array.slice(-length);
        const n = slice.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = slice.reduce((a, b) => a + b, 0);
        const sumXY = slice.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        const denominator = n * sumX2 - sumX * sumX;
        if (denominator === 0) return null;

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
        const highestHigh = source.map((_, i) => this.highest(data.high.slice(0, i + 1), 10));
        const lowestLow = source.map((_, i) => this.lowest(data.low.slice(0, i + 1), 10));
        const smaClose = source.map((_, i) => this.sma(source.slice(0, i + 1), opts.length));

        const midpoint = source.map((_, i) =>
            this.avg([this.avg([highestHigh[i], lowestLow[i]]), smaClose[i]])
        );

        let squeeze = new Array(source.length).fill(null);
        let squeezeValues = [];

        for (let i = 0; i < source.length; i++) {
            if (i < opts.length) {
                squeeze[i] = null;
                continue;
            }

            const tr = source[i] - midpoint[i];
            const sz = this.linreg(source.slice(0, i + 1), opts.length);

            squeezeValues.push(sz);
            if (squeezeValues.length > opts.smoothing) {
                squeezeValues.shift();
            }

            squeeze[i] = this.sma(squeezeValues, opts.smoothing);
        }

        this.cache.squeeze = squeeze;
        return squeeze;
    }

    obtenerDatosSqueezeMomentum(data, options = {}) {
        const squeeze = this.calcularSqueezeMomentum(data, options);

        return data.time.map((time, i) => {
            if (squeeze[i] === null) return null;

            let color;
            if (squeeze[i] > 0) {
                color = (squeeze[i] > squeeze[i - 1]) ? 'rgba(0, 255, 0, 1)' : 'rgba(0, 255, 0, 0.5)';
            } else {
                color = (squeeze[i] < squeeze[i - 1]) ? 'rgba(255, 0, 0, 1)' : 'rgba(255, 0, 0, 0.5)';
            }

            return {
                time: time,
                value: squeeze[i],
                color: color
            };
        }).filter(point => point !== null);
    }

    calcularSuperTrend(data, length = 10, multiplier = 1.5) {
        if (this.cache.supertrend && this.cache.supertrend.length === data.close.length) {
            return this.cache.supertrend;
        }

        let atr = new Array(data.close.length).fill(null);
        let upperBand = new Array(data.close.length).fill(null);
        let lowerBand = new Array(data.close.length).fill(null);
        let supertrend = new Array(data.close.length).fill(null);

        // Calcular ATR
        for (let i = length; i < data.close.length; i++) {
            const trValues = [
                data.high[i] - data.low[i],
                Math.abs(data.high[i] - data.close[i - 1]),
                Math.abs(data.low[i] - data.close[i - 1])
            ];
            const tr = Math.max(...trValues);
            
            // Calcular ATR usando SMA
            const atrSlice = atr.slice(Math.max(0, i - length), i).filter(val => val !== null);
            atr[i] = atrSlice.length > 0 
                ? (atrSlice.reduce((sum, val) => sum + val, 0) + tr) / (atrSlice.length + 1)
                : tr;
        }

        // Calcular bandas y SuperTrend
        for (let i = length; i < data.close.length; i++) {
            const basicUpperBand = (data.high[i] + data.low[i]) / 2 + multiplier * atr[i];
            const basicLowerBand = (data.high[i] + data.low[i]) / 2 - multiplier * atr[i];

            // Lógica de cambio de tendencia
            if (i === length) {
                upperBand[i] = basicUpperBand;
                lowerBand[i] = basicLowerBand;
            } else {
                // Ajuste de bandas
                upperBand[i] = (basicUpperBand < upperBand[i - 1] || data.close[i - 1] > upperBand[i - 1]) 
                    ? basicUpperBand 
                    : upperBand[i - 1];
                
                lowerBand[i] = (basicLowerBand > lowerBand[i - 1] || data.close[i - 1] < lowerBand[i - 1]) 
                    ? basicLowerBand 
                    : lowerBand[i - 1];
            }

            // Determinar SuperTrend
            const prevSupertrend = supertrend[i - 1];
            if (prevSupertrend === null) {
                supertrend[i] = data.close[i] > upperBand[i] ? lowerBand[i] : upperBand[i];
            } else {
                if (prevSupertrend === upperBand[i - 1]) {
                    supertrend[i] = data.close[i] > upperBand[i] ? lowerBand[i] : upperBand[i];
                } else {
                    supertrend[i] = data.close[i] < lowerBand[i] ? upperBand[i] : lowerBand[i];
                }
            }
        }

        this.cache.supertrend = supertrend;
        return supertrend;
    }

    obtenerDatosSuperTrend(data, length = 10, multiplier = 3) {
        const supertrend = this.calcularSuperTrend(data, length, multiplier);

        return data.time.map((time, i) => {
            if (supertrend[i] === null) return null;

            return {
                time: time,
                value: supertrend[i],
                color: supertrend[i] > data.close[i] ? 'rgba(255, 0, 0, 1)' : 'rgba(0, 255, 0, 1)'
            };
        }).filter(point => point !== null);
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

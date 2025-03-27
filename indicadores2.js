
class Indicadores2 {
    constructor() {
        this.cache = {
            squeeze: null
        };
    }

    // Restablecer caché cuando cambian los datos
    resetCache() {
        for (const key in this.cache) {
            this.cache[key] = null;
        }
    }

    // Función para calcular el máximo de un array en una ventana determinada
    highest(array, length) {
        if (array.length < length) return null;
        return Math.max(...array.slice(-length));
    }

    // Función para calcular el mínimo de un array en una ventana determinada
    lowest(array, length) {
        if (array.length < length) return null;
        return Math.min(...array.slice(-length));
    }

    // Función para calcular la media simple (SMA)
    sma(array, length) {
        if (array.length < length) return null;
        const slice = array.slice(-length);
        return slice.reduce((sum, val) => sum + val, 0) / length;
    }

    // Función para calcular el promedio de un conjunto de valores
    avg(values) {
        const validValues = values.filter(val => val !== null && !isNaN(val));
        if (validValues.length === 0) return null;
        return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    }

    // Regresión lineal simple (para calcular la pendiente)
    linreg(array, length) {
        if (array.length < length) return null;

        const slice = array.slice(-length);
        const n = slice.length;
        const sumX = (n * (n - 1)) / 2; // Suma de índices
        const sumY = slice.reduce((a, b) => a + b, 0);
        const sumXY = slice.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        const denominator = n * sumX2 - sumX * sumX;
        if (denominator === 0) return null;

        return (n * sumXY - sumX * sumY) / denominator;
    }

    // Calcular Squeeze Momentum con caché
    calcularSqueezeMomentum(data, options = {}) {
        const defaultOptions = {
            length: 20,
            smoothing: 3
        };
        const opts = { ...defaultOptions, ...options };

        // Usar caché si los datos no han cambiado
        if (this.cache.squeeze && this.cache.squeeze.length === data.close.length) {
            return this.cache.squeeze;
        }

        const source = data.close;
        const highestHigh = source.map((_, i) => this.highest(data.high.slice(0, i + 1), 5));
        const lowestLow = source.map((_, i) => this.lowest(data.low.slice(0, i + 1), 5));
        const smaClose = source.map((_, i) => this.sma(source.slice(0, i + 1), opts.length));

        const midpoint = source.map((_, i) =>
            this.avg([
                this.avg([highestHigh[i], lowestLow[i]]),
                smaClose[i]
            ])
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

        // Guardar en caché
        this.cache.squeeze = squeeze;
        return squeeze;
    }

    // Preparar datos para gráfico con colores
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

    // Calcular todos los indicadores
    calcularTodosLosIndicadores2(data) {
        const squeeze = this.obtenerDatosSqueezeMomentum(data);
        return { squeeze };
    }
}

// Exportar la clase para uso en navegador
if (typeof window !== 'undefined') {
    window.Indicadores2 = Indicadores2;
}
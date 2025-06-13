class Indicadores {
    constructor() {
        this.cache = {
            rsi: null,
            ema20: null,
            ema50: null,
            macd: null,
            macdSignal: null,
            macdHistograma: null,
            atr: null,
            bollinger: null,
        };
    }

    // Restablecer caché cuando cambian los datos
    resetCache() {
        for (const key in this.cache) {
            this.cache[key] = null;
        }
    }

    // Calcular RSI - Mejorado con método Wilder
    calcularRSI(data, periodo = 14) {
        if (this.cache.rsi && this.cache.rsi.length === data.close.length) {
            return this.cache.rsi;
        }

        const rsi = [];
        const cambios = [];
        
        // Calcular cambios de precio
        for (let i = 1; i < data.close.length; i++) {
            cambios.push(data.close[i] - data.close[i - 1]);
        }

        // Llenar los primeros valores con null
        for (let i = 0; i < periodo; i++) {
            rsi.push(null);
        }

        // Calcular las primeras medias usando SMA
        let sumaGanancias = 0;
        let sumaPerdidas = 0;
        
        for (let i = 0; i < periodo; i++) {
            if (cambios[i] > 0) {
                sumaGanancias += cambios[i];
            } else {
                sumaPerdidas += Math.abs(cambios[i]);
            }
        }

        let avgGain = sumaGanancias / periodo;
        let avgLoss = sumaPerdidas / periodo;
        
        // Calcular RSI para el primer valor
        let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));

        // Usar método de Wilder para el resto de valores
        for (let i = periodo; i < cambios.length; i++) {
            const ganancia = cambios[i] > 0 ? cambios[i] : 0;
            const perdida = cambios[i] < 0 ? Math.abs(cambios[i]) : 0;

            // Método de Wilder (EMA modificada)
            avgGain = ((avgGain * (periodo - 1)) + ganancia) / periodo;
            avgLoss = ((avgLoss * (periodo - 1)) + perdida) / periodo;

            rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }

        this.cache.rsi = rsi;
        return rsi;
    }

    // Calcular EMA - Mejorado con inicialización SMA
    calcularEMA(data, periodo) {
        const cacheKey = `ema${periodo}`;

        if (this.cache[cacheKey] && this.cache[cacheKey].length === data.close.length) {
            return this.cache[cacheKey];
        }

        const ema = [];
        const multiplicador = 2 / (periodo + 1);

        // Llenar valores iniciales con null
        for (let i = 0; i < periodo - 1; i++) {
            ema.push(null);
        }

        // Calcular SMA inicial
        let suma = 0;
        for (let i = 0; i < periodo; i++) {
            suma += data.close[i];
        }
        const smaInicial = suma / periodo;
        ema.push(smaInicial);

        // Calcular EMA para el resto de valores
        for (let i = periodo; i < data.close.length; i++) {
            const emaAnterior = ema[i - 1];
            const emaActual = (data.close[i] * multiplicador) + (emaAnterior * (1 - multiplicador));
            ema.push(emaActual);
        }

        this.cache[cacheKey] = ema;
        return ema;
    }

    // Calcular MACD - Mejorado con mejor manejo de la señal
    calcularMACD(data, periodoRapido = 12, periodoLento = 26, periodoSignal = 9) {
        if (this.cache.macd && 
            this.cache.macdSignal && 
            this.cache.macdHistograma && 
            this.cache.macd.length === data.close.length) {
            return {
                macd: this.cache.macd,
                signal: this.cache.macdSignal,
                histograma: this.cache.macdHistograma
            };
        }

        const emaRapida = this.calcularEMA(data, periodoRapido);
        const emaLenta = this.calcularEMA(data, periodoLento);

        // Calcular línea MACD
        const macd = [];
        for (let i = 0; i < data.close.length; i++) {
            if (emaRapida[i] === null || emaLenta[i] === null) {
                macd.push(null);
            } else {
                macd.push(emaRapida[i] - emaLenta[i]);
            }
        }

        // Calcular línea de señal usando EMA de la línea MACD
        const signal = [];
        const multiplicadorSignal = 2 / (periodoSignal + 1);
        
        // Encontrar el primer valor válido de MACD
        let primerIndiceValido = -1;
        for (let i = 0; i < macd.length; i++) {
            if (macd[i] !== null) {
                primerIndiceValido = i;
                break;
            }
        }

        // Llenar con null hasta tener suficientes valores para la señal
        for (let i = 0; i < primerIndiceValido + periodoSignal - 1; i++) {
            signal.push(null);
        }

        // Calcular SMA inicial para la señal
        if (primerIndiceValido !== -1 && primerIndiceValido + periodoSignal - 1 < macd.length) {
            let suma = 0;
            for (let i = 0; i < periodoSignal; i++) {
                suma += macd[primerIndiceValido + i];
            }
            const smaInicial = suma / periodoSignal;
            signal.push(smaInicial);

            // Calcular EMA para el resto de la señal
            for (let i = primerIndiceValido + periodoSignal; i < macd.length; i++) {
                if (macd[i] !== null) {
                    const signalAnterior = signal[i - 1];
                    const signalActual = (macd[i] * multiplicadorSignal) + (signalAnterior * (1 - multiplicadorSignal));
                    signal.push(signalActual);
                } else {
                    signal.push(null);
                }
            }
        }

        // Calcular histograma
        const histograma = [];
        for (let i = 0; i < data.close.length; i++) {
            if (macd[i] === null || signal[i] === null) {
                histograma.push(null);
            } else {
                histograma.push(macd[i] - signal[i]);
            }
        }

        this.cache.macd = macd;
        this.cache.macdSignal = signal;
        this.cache.macdHistograma = histograma;

        return {
            macd,
            signal,
            histograma
        };
    }

    // Calcular ATR - Mejorado con método de Wilder
    calcularATR(data, periodo = 14) {
        if (this.cache.atr && this.cache.atr.length === data.close.length) {
            return this.cache.atr;
        }

        const atr = [];
        const trueRanges = [];

        // Primer valor es null
        atr.push(null);

        // Calcular True Range para cada periodo
        for (let i = 1; i < data.close.length; i++) {
            const high = data.high[i];
            const low = data.low[i];
            const prevClose = data.close[i - 1];

            const tr1 = high - low;
            const tr2 = Math.abs(high - prevClose);
            const tr3 = Math.abs(low - prevClose);
            
            const trueRange = Math.max(tr1, tr2, tr3);
            trueRanges.push(trueRange);
        }

        // Llenar con null hasta tener suficientes valores
        for (let i = 1; i < periodo; i++) {
            atr.push(null);
        }

        // Calcular ATR inicial usando SMA
        let suma = 0;
        for (let i = 0; i < periodo; i++) {
            suma += trueRanges[i];
        }
        const atrInicial = suma / periodo;
        atr.push(atrInicial);

        // Usar método de Wilder para el resto
        for (let i = periodo; i < trueRanges.length; i++) {
            const atrAnterior = atr[atr.length - 1];
            const nuevoATR = ((atrAnterior * (periodo - 1)) + trueRanges[i]) / periodo;
            atr.push(nuevoATR);
        }

        this.cache.atr = atr;
        return atr;
    }

    // Calcular Bandas de Bollinger - Mejorado con desviación estándar correcta
    calcularBollinger(data, periodo = 20, desviaciones = 2) {
        if (this.cache.bollinger && this.cache.bollinger.banda_media.length === data.close.length) {
            return this.cache.bollinger;
        }

        const mediaMovil = [];
        const bandaSuperior = [];
        const bandaInferior = [];

        // Llenar valores iniciales con null
        for (let i = 0; i < periodo - 1; i++) {
            mediaMovil.push(null);
            bandaSuperior.push(null);
            bandaInferior.push(null);
        }

        // Calcular para cada posición válida
        for (let i = periodo - 1; i < data.close.length; i++) {
            // Obtener el segmento de precios
            const segmento = data.close.slice(i - periodo + 1, i + 1);
            
            // Calcular media móvil simple
            const media = segmento.reduce((a, b) => a + b) / periodo;
            mediaMovil.push(media);
            
            // Calcular desviación estándar (población, no muestra)
            const varianza = segmento.reduce((acc, val) => {
                return acc + Math.pow(val - media, 2);
            }, 0) / periodo;
            
            const desviacionEstandar = Math.sqrt(varianza);

            // Calcular bandas
            bandaSuperior.push(media + (desviacionEstandar * desviaciones));
            bandaInferior.push(media - (desviacionEstandar * desviaciones));
        }

        this.cache.bollinger = {
            banda_media: mediaMovil,
            bb_superior: bandaSuperior,
            bb_inferior: bandaInferior
        };

        return this.cache.bollinger;
    }

    // Preparar datos de RSI para gráfico
    obtenerDatosRSI(data) {
        const rsi = this.calcularRSI(data);

        return data.time.map((time, i) => ({
            time: time,
            value: rsi[i]
        })).filter(point => point.value !== null);
    }

    // Preparar datos de EMA para gráfico
    obtenerDatosEMA(data, periodo) {
        const ema = this.calcularEMA(data, periodo);

        return data.time.map((time, i) => ({
            time: time,
            value: ema[i]
        })).filter(point => point.value !== null);
    }

    // Preparar datos de MACD para gráfico con 4 colores en histograma
    obtenerDatosMACD(data, periodoRapido = 12, periodoLento = 26, periodoSignal = 9) {
        const { macd, signal, histograma } = this.calcularMACD(data, periodoRapido, periodoLento, periodoSignal);

        const macdLinea = data.time.map((time, i) => ({
            time: time,
            value: macd[i]
        })).filter(point => point.value !== null);

        const signalLinea = data.time.map((time, i) => ({
            time: time,
            value: signal[i]
        })).filter(point => point.value !== null);

        const histogramaData = data.time.map((time, i) => {
            if (histograma[i] === null) return null;
            
            let color;
            const valorActual = histograma[i];
            const valorAnterior = i > 0 ? histograma[i - 1] : null;
            
            if (valorActual > 0) {
                // Verde cuando es positivo
                color = (valorAnterior !== null && valorActual > valorAnterior) ? '#26a69a' : '#4caf50';
            } else {
                // Rojo cuando es negativo
                color = (valorAnterior !== null && valorActual < valorAnterior) ? '#ef5350' : '#f44336';
            }
            
            return {
                time: time,
                value: valorActual,
                color: color
            };
        }).filter(point => point !== null);

        return {
            macd: macdLinea,
            signal: signalLinea,
            histograma: histogramaData
        };
    }

    // Obtener datos para líneas de referencia RSI
    obtenerLineasRSI(data) {
        const tiempos = data.time;

        const sobreCompra = tiempos.map(time => ({
            time: time,
            value: 70
        }));

        const sobreVenta = tiempos.map(time => ({
            time: time,
            value: 30
        }));

        return {
            sobreCompra,
            sobreVenta
        };
    }

    // Colorear volumen basado en velas alcistas/bajistas
    colorearVolumen(data) {
        return data.time.map((time, i) => ({
            time: time,
            value: data.volume[i],
            color: data.close[i] > data.open[i] ? '#00770b' : '#77000f'
        }));
    }

    // Obtener datos para gráfico de ATR
    obtenerDatosATR(data, periodo = 14) {
        const atr = this.calcularATR(data, periodo);

        return data.time.map((time, i) => ({
            time: time,
            value: atr[i]
        })).filter(point => point.value !== null);
    }

    // Obtener datos para gráfico de Bollinger
    obtenerDatosBollinger(data, periodo = 20, desviaciones = 2) {
        const bollinger = this.calcularBollinger(data, periodo, desviaciones);

        return {
            bb_inferior: data.time.map((time, i) => ({
                time: time,
                value: bollinger.bb_inferior[i]
            })).filter(point => point.value !== null),
            bb_superior: data.time.map((time, i) => ({
                time: time,
                value: bollinger.bb_superior[i]
            })).filter(point => point.value !== null)
        };
    }

    // Calcular todos los indicadores
    calcularTodosLosIndicadores(data) {
        const candles = data.time.map((time, i) => ({
            time: time,
            open: data.open[i],
            high: data.high[i],
            low: data.low[i],
            close: data.close[i]
        }));

        const volumen = this.colorearVolumen(data);
        const rsi = this.obtenerDatosRSI(data);
        const lineasRSI = this.obtenerLineasRSI(data);
        const ema20 = this.obtenerDatosEMA(data, 200);
        const ema50 = this.obtenerDatosEMA(data, 55);
        const macdData = this.obtenerDatosMACD(data);
        const atr = this.obtenerDatosATR(data);
        const bollinger = this.obtenerDatosBollinger(data);

        return {
            candles,
            volumen,
            rsi,
            lineasRSI,
            ema20,
            ema50,
            macd: macdData.macd,
            signal: macdData.signal,
            histograma: macdData.histograma,
            atr,
            bollinger,
        };
    }
}

// Exportar la clase
window.Indicadores = Indicadores;

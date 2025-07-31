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

    // Calcular RSI exactamente como TradingView
    calcularRSI(data, periodo = 14) {
        if (this.cache.rsi && this.cache.rsi.length === data.close.length) {
            return this.cache.rsi;
        }

        const rsi = [];
        const alpha = 1 / periodo;

        // Calcular primer cambio
        const primerCambio = data.close[1] - data.close[0];
        let gananciaMedia = Math.max(primerCambio, 0);
        let perdidaMedia = Math.max(-primerCambio, 0);

        // Inicializar RSI desde el segundo precio
        rsi.push(50); // TradingView usa 50 como valor inicial

        // Calcular RSI usando suavizado exponencial
        for (let i = 1; i < data.close.length; i++) {
            const cambio = data.close[i] - data.close[i - 1];
            const ganancia = Math.max(cambio, 0);
            const perdida = Math.max(-cambio, 0);

            gananciaMedia = alpha * ganancia + (1 - alpha) * gananciaMedia;
            perdidaMedia = alpha * perdida + (1 - alpha) * perdidaMedia;

            const rs = perdidaMedia === 0 ? 100 : gananciaMedia / perdidaMedia;
            rsi.push(100 - (100 / (1 + rs)));
        }

        this.cache.rsi = rsi;
        return rsi;
    }

    // Calcular EMA exactamente como TradingView
    calcularEMA(data, periodo) {
        const cacheKey = `ema${periodo}`;

        if (this.cache[cacheKey] && this.cache[cacheKey].length === data.close.length) {
            return this.cache[cacheKey];
        }

        const ema = [];
        const alpha = 2 / (periodo + 1);

        // Inicializar con el primer precio (como hace TradingView)
        ema.push(data.close[0]);

        // Calcular EMA usando la fórmula: EMA[i] = alpha * precio[i] + (1 - alpha) * EMA[i-1]
        for (let i = 1; i < data.close.length; i++) {
            const valor = alpha * data.close[i] + (1 - alpha) * ema[i - 1];
            ema.push(valor);
        }

        this.cache[cacheKey] = ema;
        return ema;
    }

    // Calcular MACD exactamente como TradingView
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
            macd.push(emaRapida[i] - emaLenta[i]);
        }

        // Calcular señal como EMA del MACD
        const signal = [];
        const alpha = 2 / (periodoSignal + 1);
        
        // Inicializar señal con el primer valor MACD
        signal.push(macd[0]);

        // Calcular señal usando EMA
        for (let i = 1; i < macd.length; i++) {
            const valor = alpha * macd[i] + (1 - alpha) * signal[i - 1];
            signal.push(valor);
        }

        // Calcular histograma
        const histograma = [];
        for (let i = 0; i < data.close.length; i++) {
            histograma.push(macd[i] - signal[i]);
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

    // Calcular ATR exactamente como TradingView
    calcularATR(data, periodo = 14) {
        if (this.cache.atr && this.cache.atr.length === data.close.length) {
            return this.cache.atr;
        }

        const atr = [];
        const alpha = 1 / periodo;

        // Calcular primer True Range
        const primerTR = data.high[0] - data.low[0];
        atr.push(primerTR);

        // Calcular ATR usando suavizado exponencial (RMA)
        for (let i = 1; i < data.close.length; i++) {
            const high = data.high[i];
            const low = data.low[i];
            const prevClose = data.close[i - 1];

            const trueRange = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );

            const nuevoATR = alpha * trueRange + (1 - alpha) * atr[i - 1];
            atr.push(nuevoATR);
        }

        this.cache.atr = atr;
        return atr;
    }

    // Calcular Bandas de Bollinger exactamente como TradingView
    calcularBollinger(data, periodo = 20, desviaciones = 2) {
        if (this.cache.bollinger && this.cache.bollinger.banda_media.length === data.close.length) {
            return this.cache.bollinger;
        }

        const mediaMovil = [];
        const bandaSuperior = [];
        const bandaInferior = [];

        // Calcular SMA sin valores null iniciales
        for (let i = 0; i < data.close.length; i++) {
            if (i < periodo - 1) {
                // Para los primeros valores, usar todos los datos disponibles
                const segmento = data.close.slice(0, i + 1);
                const media = segmento.reduce((a, b) => a + b) / segmento.length;
                mediaMovil.push(media);
                
                // Calcular desviación estándar con datos disponibles
                const varianza = segmento.reduce((acc, val) => {
                    return acc + Math.pow(val - media, 2);
                }, 0) / segmento.length;
                
                const desviacionEstandar = Math.sqrt(varianza);
                bandaSuperior.push(media + (desviacionEstandar * desviaciones));
                bandaInferior.push(media - (desviacionEstandar * desviaciones));
            } else {
                // Usar ventana completa de período
                const segmento = data.close.slice(i - (periodo - 1), i + 1);
                const media = segmento.reduce((a, b) => a + b) / periodo;
                mediaMovil.push(media);
                
                // Calcular desviación estándar
                const varianza = segmento.reduce((acc, val) => {
                    return acc + Math.pow(val - media, 2);
                }, 0) / periodo;
                
                const desviacionEstandar = Math.sqrt(varianza);
                bandaSuperior.push(media + (desviacionEstandar * desviaciones));
                bandaInferior.push(media - (desviacionEstandar * desviaciones));
            }
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
            let color;
            if (histograma[i] > 0) {
                color = (histograma[i] > histograma[i - 1]) ? '#80ff98' : '#00820c'; // Verde fuerte y verde claro
            } else {
                color = (histograma[i] < histograma[i - 1]) ? '#ff9595' : '#c50800'; // Rojo fuerte y rojo claro
            }
            
            return {
                time: time,
                value: histograma[i],
                color: color
            };
        }).filter(point => point.value !== null);

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
            media: data.time.map((time, i) => ({
                time: time,
                value: bollinger.banda_media[i]
            })).filter(point => point.value !== null),
            bb_superior: data.time.map((time, i) => ({
                time: time,
                value: bollinger.bb_superior[i]
            })).filter(point => point.value !== null),
            bb_inferior: data.time.map((time, i) => ({
                time: time,
                value: bollinger.bb_inferior[i]
            })).filter(point => point.value !== null)
        };
    }


//Obtener datos para las bandas dw bollinger 
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
        const ema20 = this.obtenerDatosEMA(data, 20);
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

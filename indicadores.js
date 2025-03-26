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
            squeezeMomentum: null
        };
    }

    // Restablecer caché cuando cambian los datos
    resetCache() {
        for (const key in this.cache) {
            this.cache[key] = null;
        }
    }

    // Calcular RSI
    calcularRSI(data, periodo = 14) {
        if (this.cache.rsi && this.cache.rsi.length === data.close.length) {
            return this.cache.rsi;
        }

        const rsi = [];
        let ganancias = [];
        let perdidas = [];

        for (let i = 0; i < periodo; i++) {
            rsi.push(null);
        }

        for (let i = 1; i <= periodo; i++) {
            const cambio = data.close[i] - data.close[i - 1];
            ganancias.push(Math.max(cambio, 0));
            perdidas.push(Math.max(-cambio, 0));
        }

        let gananciaMedia = ganancias.reduce((a, b) => a + b) / periodo;
        let perdidaMedia = perdidas.reduce((a, b) => a + b) / periodo;
        let rs = perdidaMedia === 0 ? 100 : gananciaMedia / perdidaMedia;
        rsi.push(100 - (100 / (1 + rs)));

        for (let i = periodo + 1; i < data.close.length; i++) {
            const cambio = data.close[i] - data.close[i - 1];
            const ganancia = Math.max(cambio, 0);
            const perdida = Math.max(-cambio, 0);

            gananciaMedia = ((gananciaMedia * (periodo - 1)) + ganancia) / periodo;
            perdidaMedia = ((perdidaMedia * (periodo - 1)) + perdida) / periodo;

            rs = perdidaMedia === 0 ? 100 : gananciaMedia / perdidaMedia;
            rsi.push(100 - (100 / (1 + rs)));
        }

        this.cache.rsi = rsi;
        return rsi;
    }

    // Calcular EMA
    calcularEMA(data, periodo) {
        const cacheKey = `ema${periodo}`;

        if (this.cache[cacheKey] && this.cache[cacheKey].length === data.close.length) {
            return this.cache[cacheKey];
        }

        const ema = [];
        const multiplicador = 2 / (periodo + 1);

        for (let i = 0; i < periodo - 1; i++) {
            ema.push(null);
        }

        let valorInicial = 0;
        for (let i = 0; i < periodo; i++) {
            valorInicial += data.close[i];
        }
        valorInicial /= periodo;
        ema.push(valorInicial);

        for (let i = periodo; i < data.close.length; i++) {
            const valor = (data.close[i] - ema[ema.length - 1]) * multiplicador + ema[ema.length - 1];
            ema.push(valor);
        }

        this.cache[cacheKey] = ema;
        return ema;
    }

    // Calcular MACD
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

        const macd = [];
        for (let i = 0; i < data.close.length; i++) {
            if (emaRapida[i] === null || emaLenta[i] === null) {
                macd.push(null);
            } else {
                macd.push(emaRapida[i] - emaLenta[i]);
            }
        }

        const signal = [];
        const signalMultiplicador = 2 / (periodoSignal + 1);

        for (let i = 0; i < macd.length; i++) {
            if (macd[i] === null) {
                signal.push(null);
                continue;
            }

            let valoresValidos = [];
            for (let j = i; j < i + periodoSignal && j < macd.length; j++) {
                if (macd[j] !== null) {
                    valoresValidos.push(macd[j]);
                }
            }

            if (valoresValidos.length === periodoSignal) {
                const primerValor = valoresValidos.reduce((a, b) => a + b) / periodoSignal;
                signal.push(primerValor);

                for (let j = i + 1; j < macd.length; j++) {
                    const valor = (macd[j] - signal[signal.length - 1]) * signalMultiplicador + signal[signal.length - 1];
                    signal.push(valor);
                }

                break;
            } else {
                signal.push(null);
            }
        }

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

    // Calcular ATR
    calcularATR(data, periodo = 14) {
        if (this.cache.atr && this.cache.atr.length === data.close.length) {
            return this.cache.atr;
        }

        const atr = [];
        const trueRanges = [];

        for (let i = 1; i < data.close.length; i++) {
            const high = data.high[i];
            const low = data.low[i];
            const prevClose = data.close[i - 1];

            const trueRange = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );

            trueRanges.push(trueRange);
        }

        const primerATR = trueRanges.slice(0, periodo).reduce((a, b) => a + b) / periodo;
        atr.push(null);
        atr.push(primerATR);

        for (let i = periodo + 1; i < data.close.length; i++) {
            const ultimoATR = atr[atr.length - 1];
            const nuevoATR = ((ultimoATR * (periodo - 1)) + trueRanges[i - 1]) / periodo;
            atr.push(nuevoATR);
        }

        this.cache.atr = atr;
        return atr;
    }

    // Calcular Bandas de Bollinger
    calcularBollinger(data, periodo = 20, desviaciones = 2) {
        if (this.cache.bollinger && this.cache.bollinger.banda_media.length === data.close.length) {
            return this.cache.bollinger;
        }

        const mediaMovil = [];
        const bandaSuperior = [];
        const bandaInferior = [];

        for (let i = periodo - 1; i < data.close.length; i++) {
            const segmento = data.close.slice(i - (periodo - 1), i + 1);
            const media = segmento.reduce((a, b) => a + b) / periodo;
            mediaMovil.push(media);
        }

        for (let i = 0; i < mediaMovil.length; i++) {
            const segmento = data.close.slice(i, i + periodo);
            const varianza = segmento.reduce((acc, val) => {
                return acc + Math.pow(val - mediaMovil[i], 2);
            }, 0) / periodo;
            const desviacionEstandar = Math.sqrt(varianza);

            bandaSuperior.push(mediaMovil[i] + (desviacionEstandar * desviaciones));
            bandaInferior.push(mediaMovil[i] - (desviacionEstandar * desviaciones));
        }

        const nulls = Array(periodo - 1).fill(null);

        this.cache.bollinger = {
            banda_media: [...nulls, ...mediaMovil],
            bb_superior: [...nulls, ...bandaSuperior],
            bb_inferior: [...nulls, ...bandaInferior]
        };

        return this.cache.bollinger;
    }

    // Calcular Squeeze Momentum Indicator
    calcularSqueezeMomentum(data, bbPeriodo = 20, bbMultiplicador = 2, keltnerPeriodo = 20, atrMultiplicador = 1.5) {
        if (this.cache.squeezeMomentum && this.cache.squeezeMomentum.length === data.close.length) {
            return this.cache.squeezeMomentum;
        }

        const bollinger = this.calcularBollinger(data, bbPeriodo, bbMultiplicador);
        const atr = this.calcularATR(data, keltnerPeriodo);
        const ema = this.calcularEMA(data, 20);

        const squeezeMomentum = data.close.map((close, i) => {
            if (i < bbPeriodo || !ema[i]) return null;

            const bbWidth = (bollinger.bb_superior[i] - bollinger.bb_inferior[i]) / bollinger.banda_media[i];
            const keltnerWidth = atr[i] * atrMultiplicador;

            const momentum = ema[i] - ema[i - 1];

            let estado = 'normal';
            if (bbWidth < keltnerWidth) estado = 'apretado';
            if (bbWidth > keltnerWidth) estado = 'expandido';

            return {
                momentum: momentum,
                estado: estado
            };
        });

        this.cache.squeezeMomentum = squeezeMomentum;
        return squeezeMomentum;
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

    // Preparar datos de MACD para gráfico
    
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
            value: 30
        }));

        const sobreVenta = tiempos.map(time => ({
            time: time,
            value: 70
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

    // Obtener datos para gráfico de Squeeze Momentum
    obtenerDatosSqueezeMomentum(data) {
        const squeeze = this.calcularSqueezeMomentum(data);

        return data.time.map((time, i) => ({
            time: time,
            momentum: squeeze[i]?.momentum || null,
            estado: squeeze[i]?.estado || null,
            color: squeeze[i]?.momentum >= 0 ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)'
        })).filter(point => point.momentum !== null);
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

        const ema20 = this.obtenerDatosEMA(data, 24);
        const ema50 = this.obtenerDatosEMA(data, 50);

        const macdData = this.obtenerDatosMACD(data);
        

        const atr = this.obtenerDatosATR(data);
        const bollinger = this.obtenerDatosBollinger(data);
        const squeezeMomentum = this.obtenerDatosSqueezeMomentum(data);

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
            squeezeMomentum
        };
    }
}

// Exportar la clase
window.Indicadores = Indicadores;


// indicadores.js - Cálculo de indicadores técnicos

class Indicadores {
    constructor() {
        // Cache para indicadores calculados
        this.cache = {
            rsi: null,
            ema20: null,
            ema50: null,
            macd: null,
            macdSignal: null,
            macdHistograma: null
        };
    }

    // Restablecer caché cuando cambian los datos
    resetCache() {
        for (const key in this.cache) {
            this.cache[key] = null;
        }
    }

    // Calcular todos los indicadores y devolver en el formato esperado por el HTML
    calcularTodosLosIndicadores(data) {
        // Convertir los datos a formato candle para la gráfica
        const candles = data.time.map((time, i) => ({
            time: time,
            open: data.open[i],
            high: data.high[i],
            low: data.low[i],
            close: data.close[i]
        }));
        
        // Calcular volumen
        const volumen = this.colorearVolumen(data);
        
        // Calcular datos RSI
        const rsi = this.obtenerDatosRSI(data);
        const lineasRSI = this.obtenerLineasRSI(data);
        
        // Calcular EMAs
        const ema20 = this.obtenerDatosEMA(data, 200);
        const ema50 = this.obtenerDatosEMA(data, 50);
        
        // Calcular MACD
        const macdData = this.obtenerDatosMACD(data);
        const lineaCeroMACD = this.obtenerLineaCeroMACD(data);
        
        // Devolver todo en un solo objeto
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
            lineaCeroMACD
        };
    }

    // Calcular el RSI
    calcularRSI(data, periodo = 14) {
        // Usar caché si está disponible
        if (this.cache.rsi && this.cache.rsi.length === data.close.length) {
            return this.cache.rsi;
        }
        
        const rsi = [];
        let ganancias = [];
        let perdidas = [];
        
        // Llenar con valores nulos hasta tener suficientes datos
        for (let i = 0; i < periodo; i++) {
            rsi.push(null);
        }
        
        // Calcular cambios iniciales
        for (let i = 1; i <= periodo; i++) {
            const cambio = data.close[i] - data.close[i - 1];
            ganancias.push(Math.max(cambio, 0));
            perdidas.push(Math.max(-cambio, 0));
        }
        
        // Calcular primer RSI
        let gananciaMedia = ganancias.reduce((a, b) => a + b) / periodo;
        let perdidaMedia = perdidas.reduce((a, b) => a + b) / periodo;
        let rs = perdidaMedia === 0 ? 100 : gananciaMedia / perdidaMedia;
        rsi.push(100 - (100 / (1 + rs)));
        
        // Calcular RSI para el resto de puntos usando fórmula de suavizado
        for (let i = periodo + 1; i < data.close.length; i++) {
            const cambio = data.close[i] - data.close[i - 1];
            const ganancia = Math.max(cambio, 0);
            const perdida = Math.max(-cambio, 0);
            
            gananciaMedia = ((gananciaMedia * (periodo - 1)) + ganancia) / periodo;
            perdidaMedia = ((perdidaMedia * (periodo - 1)) + perdida) / periodo;
            
            rs = perdidaMedia === 0 ? 100 : gananciaMedia / perdidaMedia;
            rsi.push(100 - (100 / (1 + rs)));
        }
        
        // Guardar en caché
        this.cache.rsi = rsi;
        return rsi;
    }
    
    // Calcular EMA
    calcularEMA(data, periodo) {
        const cacheKey = `ema${periodo}`;
        
        // Usar caché si está disponible
        if (this.cache[cacheKey] && this.cache[cacheKey].length === data.close.length) {
            return this.cache[cacheKey];
        }
        
        const ema = [];
        const multiplicador = 2 / (periodo + 1);
        
        // Llenar con valores nulos hasta tener suficientes datos
        for (let i = 0; i < periodo - 1; i++) {
            ema.push(null);
        }
        
        // Primer EMA es un SMA
        let valorInicial = 0;
        for (let i = 0; i < periodo; i++) {
            valorInicial += data.close[i];
        }
        valorInicial /= periodo;
        ema.push(valorInicial);
        
        // Calcular EMA para el resto de puntos
        for (let i = periodo; i < data.close.length; i++) {
            const valor = (data.close[i] - ema[ema.length - 1]) * multiplicador + ema[ema.length - 1];
            ema.push(valor);
        }
        
        // Guardar en caché
        this.cache[cacheKey] = ema;
        return ema;
    }
    
    // Calcular MACD
    calcularMACD(data, periodoRapido = 12, periodoLento = 26, periodoSignal = 9) {
        // Usar caché si está disponible
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
        
        // Calcular EMAs
        const emaRapida = this.calcularEMA(data, periodoRapido);
        const emaLenta = this.calcularEMA(data, periodoLento);
        
        // Calcular línea MACD (EMA rápida - EMA lenta)
        const macd = [];
        for (let i = 0; i < data.close.length; i++) {
            if (emaRapida[i] === null || emaLenta[i] === null) {
                macd.push(null);
            } else {
                macd.push(emaRapida[i] - emaLenta[i]);
            }
        }
        
        // Calcular línea de señal (EMA del MACD)
        const signal = [];
        const signalMultiplicador = 2 / (periodoSignal + 1);
        
        // Llenar con valores nulos hasta tener suficientes datos
        for (let i = 0; i < macd.length; i++) {
            if (macd[i] === null) {
                signal.push(null);
                continue;
            }
            
            // Buscar periodo inicial completo para calcular el primer valor de signal
            let valoresValidos = [];
            for (let j = i; j < i + periodoSignal && j < macd.length; j++) {
                if (macd[j] !== null) {
                    valoresValidos.push(macd[j]);
                }
            }
            
            if (valoresValidos.length === periodoSignal) {
                // Calculamos primer valor como SMA
                const primerValor = valoresValidos.reduce((a, b) => a + b) / periodoSignal;
                signal.push(primerValor);
                
                // Calculamos el resto con EMA
                for (let j = i + 1; j < macd.length; j++) {
                    const valor = (macd[j] - signal[signal.length - 1]) * signalMultiplicador + signal[signal.length - 1];
                    signal.push(valor);
                }
                
                break;
            } else {
                signal.push(null);
            }
        }
        
        // Calcular histograma (MACD - Signal)
        const histograma = [];
        for (let i = 0; i < data.close.length; i++) {
            if (macd[i] === null || signal[i] === null) {
                histograma.push(null);
            } else {
                histograma.push(macd[i] - signal[i]);
            }
        }
        
        // Guardar en caché
        this.cache.macd = macd;
        this.cache.macdSignal = signal;
        this.cache.macdHistograma = histograma;
        
        return {
            macd,
            signal,
            histograma
        };
    }
    
    // Preparar datos de RSI para gráfico
    obtenerDatosRSI(data) {
        const rsi = this.calcularRSI(data);
        
        // Convertir a formato para gráfico
        return data.time.map((time, i) => ({
            time: time,
            value: rsi[i]
        })).filter(point => point.value !== null);
    }
    
    // Preparar datos de EMA para gráfico
    obtenerDatosEMA(data, periodo) {
        const ema = this.calcularEMA(data, periodo);
        
        // Convertir a formato para gráfico
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
            color: data.close[i] > data.open[i] ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)'
        }));
    }

}

// Exportar la clase
window.Indicadores = Indicadores;

class BinanceAPI {
    constructor() {
        this.socket = null;
        this.candleData = {
            time: [],
            open: [],
            high: [],
            low: [],
            close: [],
            volume: []
        };
        this.liquidationData = {
            time: [],
            long: [],
            short: []
        };
        this.currentTimeframe = '5m';
        this.priceCurrent = 0;
        this.onUpdateCallback = null;
        
        // Inicializar datos automáticamente al crear la instancia
        this.initializeData();
    }
    
    // Método nuevo para inicializar los datos al inicio
    async initializeData() {
        // Cargar datos  liquidaciones al iniciar
           await this.loadLiquidationData();
        // Iniciar las actualizaciones en vivo
        this.startLiveUpdates();
    }

    // Establecer callback para actualizaciones de datos  
    setUpdateCallback(callback) {  
        this.onUpdateCallback = callback;  
    }  

    // Obtener el precio actual  
    getCurrentPrice() {  
        return this.priceCurrent;  
    }  

    // Obtener el último valor de un array específico  
    getLast(arrayName, offset = 0) {  
        const idx = this.candleData[arrayName].length - 1 - offset;  
        return idx >= 0 ? this.candleData[arrayName][idx] : null;  
    }  

    // Cambiar temporalidad y recargar datos  
    async changeTimeframe(timeframe) {  
        if (this.socket) {  
            this.socket.close();  
        }  
          
        this.currentTimeframe = timeframe;  
        await this.loadHistoricalData();  
        await this.loadLiquidationData();  
        this.startLiveUpdates();  
          
        return this.candleData;  
    }

    // Iniciar actualizaciones en vivo  
    startLiveUpdates() {  
        if (this.socket) {  
            this.socket.close();  
        }  
          
        this.socket = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${this.currentTimeframe}`);  

        this.socket.onmessage = event => {  
            const message = JSON.parse(event.data);  
            const kline = message.k;  
            const newTime = kline.t / 1000;  
            const price = parseFloat(kline.c);  
              
            this.priceCurrent = price;  
              
            // Actualizar o añadir nueva vela  
            const lastTime = this.getLast('time');  
              
            if (lastTime && newTime === lastTime) {  
                // Actualizar vela existente  
                const lastIndex = this.candleData.time.length - 1;  
                this.candleData.high[lastIndex] = Math.max(this.candleData.high[lastIndex], parseFloat(kline.h));  
                this.candleData.low[lastIndex] = Math.min(this.candleData.low[lastIndex], parseFloat(kline.l));  
                this.candleData.close[lastIndex] = parseFloat(kline.c);  
                this.candleData.volume[lastIndex] = parseFloat(kline.v);  
            } else {  
                // Añadir nueva vela  
                this.candleData.time.push(newTime);  
                this.candleData.open.push(parseFloat(kline.o));  
                this.candleData.high.push(parseFloat(kline.h));  
                this.candleData.low.push(parseFloat(kline.l));  
                this.candleData.close.push(parseFloat(kline.c));  
                this.candleData.volume.push(parseFloat(kline.v));  
                  
                // Mantener un tamaño máximo para evitar uso excesivo de memoria  
                if (this.candleData.time.length > 1000) {  
                    for (const key in this.candleData) {  
                        this.candleData[key].shift();  
                    }  
                }  
            }
              
            // Añadir la información de liquidaciones a los datos de velas para enviarla en el callback
            const dataToSend = { ...this.candleData, liquidationData: this.liquidationData };
              
            // Notificar sobre la actualización  
            if (this.onUpdateCallback) {  
                this.onUpdateCallback(dataToSend);  
            }  
        };  

        
  
    }  

    // Obtener datos históricos  
    async loadHistoricalData() {  
        try {  
            const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${this.currentTimeframe}&limit=500`);  
            const data = await res.json();  
              
            // Reiniciar los arrays de datos  
            for (const key in this.candleData) {  
                this.candleData[key] = [];  
            }  
              
            // Llenar con nuevos datos  
            data.forEach(candle => {  
                this.candleData.time.push(candle[0] / 1000);  
                this.candleData.open.push(parseFloat(candle[1]));  
                this.candleData.high.push(parseFloat(candle[2]));  
                this.candleData.low.push(parseFloat(candle[3]));  
                this.candleData.close.push(parseFloat(candle[4]));  
                this.candleData.volume.push(parseFloat(candle[5]));  
            });  
              
            if (data.length > 0) {  
                this.priceCurrent = this.candleData.close[this.candleData.close.length - 1];  
            }  
              
            console.log(`✅ Cargadas ${data.length} velas para temporalidad ${this.currentTimeframe}`);  
            return this.candleData;  
        } catch (error) {  
            console.error("Error obteniendo datos históricos:", error);  
            return this.candleData;  
        }  
    }  

    // Obtener y procesar las liquidaciones  
    async loadLiquidationData() {  
        try {  
            const res = await fetch('https://liquidacionesjs.vercel.app/liquidaciones?download');  
            let data = await res.json();  
              
            // Reiniciar los arrays de datos de liquidaciones  
            for (const key in this.liquidationData) {  
                this.liquidationData[key] = [];  
            }  
              
            // Asegurarnos de que data sea un array  
            if (!Array.isArray(data)) {  
                // Si viene como string con múltiples objetos JSON, convertirlo a array  
                if (typeof data === 'string') {  
                    data = JSON.parse('[' + data + ']');  
                } else {  
                    console.error("Formato de datos de liquidaciones inesperado");  
                    return this.liquidationData;  
                }  
            }  
            
            // Procesar directamente las liquidaciones (siempre en formato 1m)
            data.forEach(item => {  
                this.liquidationData.time.push(item.timestamp / 1000); // Convertir a segundos como en los datos de Binance  
                this.liquidationData.long.push(parseFloat(item.long) || 0);  
                this.liquidationData.short.push(parseFloat(item.short) || 0);  
            });  
              
            // Mantener un tamaño máximo similar al de los datos históricos  
            if (this.liquidationData.time.length > 1000) {  
                const excessEntries = this.liquidationData.time.length - 1000;  
                for (const key in this.liquidationData) {  
                    this.liquidationData[key] = this.liquidationData[key].slice(excessEntries);  
                }  
            }  
              
            console.log(`✅ Cargadas ${data.length} liquidaciones`);  
            return this.liquidationData;  
        } catch (error) {  
            console.error("Error obteniendo datos de liquidaciones:", error);  
            return this.liquidationData;  
        }  
    }
}

// Exportar la clase
window.BinanceAPI = BinanceAPI;

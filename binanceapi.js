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

        this.currentTimeframe = '1h';
        this.priceCurrent = 0;
        this.onUpdateCallback = null;
        this.isLoadingLiquidations = false;
        this.loading = false;

        this.initializeData();
    }

    async initializeData() {
        this.loading = true;
        try {
            await this.loadHistoricalData();
            this.startLiveUpdates();
            this.loadLiquidationData(); // Cargar en segundo plano
        } finally {
            this.loading = false;
        }
    }

    setUpdateCallback(callback) {
        this.onUpdateCallback = callback;
    }

    getCurrentPrice() {
        return this.priceCurrent;
    }

    getLast(arrayName, offset = 0) {
        const idx = this.candleData[arrayName].length - 1 - offset;
        return idx >= 0 ? this.candleData[arrayName][idx] : null;
    }

    async changeTimeframe(timeframe) {
        try {
            this.loading = true;
            this.sendUpdate();

            if (this.socket) {
                this.socket.close();
            }

            // Limpiar todos los datos
            for (const key in this.candleData) {
                this.candleData[key] = [];
            }
            this.clearLiquidationData();
            
            this.currentTimeframe = timeframe;

            // Cargar datos principales
            await this.loadHistoricalData();
            this.startLiveUpdates();
            
            // Iniciar carga de liquidaciones en segundo plano
            this.loadLiquidationData();

            return this.candleData;
        } catch (error) {
            console.error("Error changing timeframe:", error);
            if (this.onUpdateCallback) {
                this.onUpdateCallback({ 
                    error: true, 
                    message: error.message,
                    candleData: this.candleData,
                    liquidationData: this.liquidationData
                });
            }
            return this.candleData;
        } finally {
            this.loading = false;
            this.sendUpdate();
        }
    }

    clearLiquidationData() {
        for (const key in this.liquidationData) {
            this.liquidationData[key] = [];
        }
    }

    sendUpdate() {
        const dataToSend = { 
            ...this.candleData, 
            liquidationData: this.liquidationData,
            loading: this.loading,
            loadingLiquidations: this.isLoadingLiquidations
        };
        
        if (this.onUpdateCallback) {
            this.onUpdateCallback(dataToSend);
        }
    }

    startLiveUpdates() {
        if (this.socket) {
            this.socket.close();
        }

        this.socket = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${this.currentTimeframe}`);

        this.socket.onmessage = async event => {
            const message = JSON.parse(event.data);
            const kline = message.k;
            const newTime = kline.t / 1000;
            const price = parseFloat(kline.c);

            this.priceCurrent = price;

            const lastTime = this.getLast('time');

            if (lastTime && newTime === lastTime) {
                const lastIndex = this.candleData.time.length - 1;
                this.candleData.high[lastIndex] = Math.max(this.candleData.high[lastIndex], parseFloat(kline.h));
                this.candleData.low[lastIndex] = Math.min(this.candleData.low[lastIndex], parseFloat(kline.l));
                this.candleData.close[lastIndex] = parseFloat(kline.c);
                this.candleData.volume[lastIndex] = parseFloat(kline.v);
            } else {
                this.candleData.time.push(newTime);
                this.candleData.open.push(parseFloat(kline.o));
                this.candleData.high.push(parseFloat(kline.h));
                this.candleData.low.push(parseFloat(kline.l));
                this.candleData.close.push(parseFloat(kline.c));
                this.candleData.volume.push(parseFloat(kline.v));

                if (this.candleData.time.length > 1000) {
                    for (const key in this.candleData) {
                        this.candleData[key].shift();
                    }
                }
            }

            this.sendUpdate();
        };
    }

    async loadHistoricalData() {
        try {
            const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${this.currentTimeframe}&limit=500`);
            const data = await res.json();

            // Limpiar antes de cargar nuevos datos
            for (const key in this.candleData) {
                this.candleData[key] = [];
            }

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

            console.log(`✅ Cargadas ${data.length} velas para ${this.currentTimeframe}`);
            return this.candleData;
        } catch (error) {
            console.error("Error en datos históricos:", error);
            return this.candleData;
        }
    }

    async loadLiquidationData() {
        try {
            this.isLoadingLiquidations = true;
            this.sendUpdate(); // Actualizar estado de carga
            
            let liquidationUrl;
            let timeframeLabel;
            
            switch(this.currentTimeframe) {
                case '1m':
                    liquidationUrl = 'https://liquidacionesjs.vercel.app/liquidaciones1min?download';
                    timeframeLabel = '1m';
                    break;
                case '5m':
                    liquidationUrl = 'https://liquidacionesjs.vercel.app/liquidaciones5min?download';
                    timeframeLabel = '5m';
                    break;
                case '15m':
                    liquidationUrl = 'https://liquidacionesjs.vercel.app/liquidaciones15min?download';
                    timeframeLabel = '15m';
                    break;
                case '1h':
                    liquidationUrl = 'https://liquidacionesjs.vercel.app/liquidaciones1hour?download';
                    timeframeLabel = '1h';
                    break;
                case '4h':
                    liquidationUrl = 'https://liquidacionesjs.vercel.app/liquidaciones4hour?download';
                    timeframeLabel = '4h';
                    break;
                case '1d':
                    liquidationUrl = 'https://liquidacionesjs.vercel.app/liquidacionesdaily?download';
                    timeframeLabel = '1d';
                    break;
                default:
                    liquidationUrl = 'https://liquidacionesjs.vercel.app/liquidaciones5min?download';
                    timeframeLabel = '5m';
            }
            
            const res = await fetch(liquidationUrl);
            let data = await res.json();

            this.clearLiquidationData();

            if (!Array.isArray(data)) {
                if (typeof data === 'string') {
                    data = JSON.parse('[' + data + ']');
                } else {
                    console.error("Formato de liquidaciones inesperado");
                    return;
                }
            }

            data.forEach(item => {
                this.liquidationData.time.push(item.timestamp / 1000);
                this.liquidationData.long.push(parseFloat(item.long) || 0);
                this.liquidationData.short.push(parseFloat(item.short) || 0);
            });

            console.log(`✅ Liquidaciones cargadas (${timeframeLabel})`);
            
        } catch (error) {
            console.error("Error en liquidaciones:", error);
        } finally {
            this.isLoadingLiquidations = false;
            this.sendUpdate();
        }
    }
}

window.BinanceAPI = BinanceAPI;

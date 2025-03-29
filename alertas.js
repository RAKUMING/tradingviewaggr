
class ManejadorAlertas {
    constructor() {
        this.elementoAlerta = document.getElementById('alerta');
        this.elementoEMA20 = document.getElementById('indicador-alerta');
        this.elementoRsi = document.getElementById('rsi');
        this.elementoMomentum = document.getElementById('momentum');
        
        // Webhook URL for Discord
        this.webhookURL = "https://discord.com/api/webhooks/1354463737507217498/fYvupiqtmEjB08aFTFNqhBxWv2FfjOkUAyLuu2uQitFUFHT_9PjQwvl6YD8m0l8U0SLi";
        
        // Variables para el contador de tiempo
        this.tiempoInicio = null;
        this.contadorInterval = null;
        this.tiempoTranscurrido = 0;
        
        // Iniciar el contador de tiempo inmediatamente
        this.iniciarContador();
    }
    
    iniciarContador() {
        // Guardar tiempo de inicio
        this.tiempoInicio = new Date();
        
        // Actualizar el tiempo transcurrido cada segundo para mostrarlo en la interfaz
        setInterval(() => {
            const ahora = new Date();
            this.tiempoTranscurrido = Math.floor((ahora - this.tiempoInicio) / 1000);
            // Actualizar el elemento con el tiempo transcurrido
            this.elementoMomentum.textContent = this.formatearTiempo(this.tiempoTranscurrido);
        }, 1000); // Actualizar cada segundo
        
        // Configurar intervalo para enviar alertas cada 30 segundos
        this.contadorInterval = setInterval(() => {
            // Enviar alerta periódica
            this.enviarAlertaPeriodica();
        }, 30000); // 30 segundos
        
        // Agregar evento para limpiar el intervalo cuando se cierre la página
        window.addEventListener('beforeunload', () => {
            if (this.contadorInterval) {
                clearInterval(this.contadorInterval);
            }
        });
    }
    
    formatearTiempo(segundos) {
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        const segs = segundos % 60;
        
        return `${horas}:${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
    }
    
    async enviarAlertaPeriodica() {
        try {
            // Obtener valores actuales
            const precioActual = binanceAPI.getCurrentPrice();
            const ema20 = parseFloat(this.elementoEMA20.textContent) || 0;
            const rsi = parseFloat(this.elementoRsi.textContent) || 0;
            
            // Preparar el mensaje con el formato especificado
            const mensaje = {
                content: "⚠️NUEVA ALERTA⚠️\n\n" +
                         `TIEMPO:  ${this.formatearTiempo(this.tiempoTranscurrido)}\n` +
                         `PRECIO ACTUAL: ${precioActual.toFixed(2)}\n` +
                         `EMA20: ${ema20.toFixed(2)}\n` +
                         `RSI: ${rsi.toFixed(2)}\n\n\n` +
                          `________________________________`
            };

            // Enviar la solicitud al webhook
            const respuesta = await fetch(this.webhookURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mensaje)
            });

            if (!respuesta.ok) {
                console.error('Error al enviar la alerta periódica:', respuesta.statusText);
            }
        } catch (error) {
            console.error('Error en enviarAlertaPeriodica:', error);
        }
    }

    actualizarAlertas(indicadoresData, indicadores2Data, ultimoCierre) {
        // Obtener valores actualizados
        const ultimoVolumen = indicadoresData.volumen[indicadoresData.volumen.length - 1].value;
        const ultimoRSI = indicadoresData.rsi[indicadoresData.rsi.length - 1].value;
        const ultimoRSIOverBought = indicadoresData.lineasRSI.sobreCompra[indicadoresData.lineasRSI.sobreCompra.length - 1].value;
        const ultimoRSIOverSold = indicadoresData.lineasRSI.sobreVenta[indicadoresData.lineasRSI.sobreVenta.length - 1].value;
        const ultimoEMA20 = indicadoresData.ema20[indicadoresData.ema20.length - 1].value;
        const prevEMA20 = indicadoresData.ema20[indicadoresData.ema20.length - 2].value;
        const ultimoEMA50 = indicadoresData.ema50[indicadoresData.ema50.length - 1].value;
        const ultimoMACD = indicadoresData.macd[indicadoresData.macd.length - 1].value;
        const ultimoMACDSignal = indicadoresData.signal[indicadoresData.signal.length - 1].value;
        const ultimoMACDHistogram = indicadoresData.histograma[indicadoresData.histograma.length - 1].value;
        const ultimoBBInferior = indicadoresData.bollinger.bb_inferior[indicadoresData.bollinger.bb_inferior.length - 1].value;
        const ultimoBBSuperior = indicadoresData.bollinger.bb_superior[indicadoresData.bollinger.bb_superior.length - 1].value;
        const ultimoSqueeze = indicadores2Data.squeeze[indicadores2Data.squeeze.length - 1].value;
        const close = ultimoCierre;
        const precioCurrent = binanceAPI.getCurrentPrice();

        // Determinar la tendencia de la EMA20
        if (ultimoEMA20 > prevEMA20) {
            this.elementoAlerta.textContent = 'Alcista ⬆️';
        } else if (ultimoEMA20 < prevEMA20) {
            this.elementoAlerta.textContent = 'Bajista ⬇️';
        } else {
            this.elementoAlerta.textContent = '';
        }

        // Mostrar el valor del RSI en el elemento HTML
        this.elementoEMA20.textContent = close.toFixed(2);
        this.elementoRsi.textContent = ultimoRSI.toFixed(2);
        // No actualizamos elementoMomentum aquí porque ahora muestra el tiempo transcurrido
    }
}

// Instanciar la clase y hacerla accesible globalmente
window.manejadorAlertas = new ManejadorAlertas();

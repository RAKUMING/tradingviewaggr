
class ManejadorAlertas {
    constructor() {
        this.elementoAlerta = document.getElementById('alerta');
        this.elementoEMA20 = document.getElementById('indicador-alerta');
        this.elementoRsi = document.getElementById('rsi');
        this.elementoMomentum = document.getElementById('momentum');
        
        // Webhook URL for Discord
        this.webhookURL = "https://discord.com/api/webhooks/1354463737507217498/fYvupiqtmEjB08aFTFNqhBxWv2FfjOkUAyLuu2uQitFUFHT_9PjQwvl6YD8m0l8U0SLi";
        
        // Variable para rastrear el último cierre que disparó la alerta
        this.ultimoCierreAlerta = null;
    }

    async enviarAlertaWebhook(datosIndicadores) {
        try {
            // Preparar el mensaje con todos los indicadores
            const mensaje = {
                content: "🚨 Nueva Alerta de Trading 🚨",
                embeds: [{
                    title: "Detalles de los Indicadores",
                    description: "Condiciones de alerta cumplidas",
                    color: 5814783, // Color naranja
                    fields: [
                        { name: "Close", value: datosIndicadores.close.toFixed(2), inline: true },
                        { name: "EMA 20", value: datosIndicadores.ema20.toFixed(2), inline: true },
                        { name: "EMA 50", value: datosIndicadores.ema50.toFixed(2), inline: true },
                        { name: "RSI", value: datosIndicadores.rsi.toFixed(2), inline: true },
                        { name: "MACD", value: datosIndicadores.macd.toFixed(2), inline: true },
                        { name: "MACD Signal", value: datosIndicadores.signal.toFixed(2), inline: true },
                        { name: "Momentum (Squeeze)", value: datosIndicadores.momentum.toFixed(2), inline: true },
                        { name: "Precio Actual", value: datosIndicadores.precioActual.toFixed(2), inline: true }
                    ]
                }]
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
                console.error('Error al enviar el webhook:', respuesta.statusText);
            }
        } catch (error) {
            console.error('Error en enviarAlertaWebhook:', error);
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
        this.elementoMomentum.textContent = ultimoSqueeze.toFixed(2);

        // Verificar condiciones para enviar alerta
        const condicionesAlerta = (
            close > ultimoEMA20 
            
        );

        // Enviar alerta solo si se cumplen las condiciones y el cierre es diferente al último que disparó una alerta
        if (condicionesAlerta && this.ultimoCierreAlerta !== close) {
            // Preparar datos para el webhook
            const datosParaWebhook = {
                close: close,
                ema20: ultimoEMA20,
                ema50: ultimoEMA50,
                rsi: ultimoRSI,
                macd: ultimoMACD,
                signal: ultimoMACDSignal,
                momentum: ultimoSqueeze,
                precioActual: precioCurrent
            };

            // Enviar alerta al webhook
            this.enviarAlertaWebhook(datosParaWebhook);

            // Actualizar el último cierre que disparó la alerta
            this.ultimoCierreAlerta = close;
        }
    }
}

// Instanciar la clase y hacerla accesible globalmente
window.manejadorAlertas = new ManejadorAlertas();

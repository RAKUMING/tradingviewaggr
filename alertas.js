
class ManejadorAlertas {
    constructor() {
        this.elementoAlerta = document.getElementById('alerta');
        this.elementoValorEMA20 = document.getElementById('indicador-alerta');
        this.webhookURL = "https://discord.com/api/webhooks/1354463737507217498/fYvupiqtmEjB08aFTFNqhBxWv2FfjOkUAyLuu2uQitFUFHT_9PjQwvl6YD8m0l8U0SLi";
        this.ultimaSeñal = null; // Para recordar la última señal
    }

    actualizarAlertas(indicadoresData) {
        if (!indicadoresData.ema20 || indicadoresData.ema20.length < 2) {
            return;
        }

        const ultimoEMA20 = indicadoresData.ema20[indicadoresData.ema20.length - 1].value;
        const prevEMA20 = indicadoresData.ema20[indicadoresData.ema20.length - 2].value;

        let mensaje = '';
        let clase = '';

        if (ultimoEMA20 > prevEMA20) {
            mensaje = 'LONG 🟩';
            clase = 'long';
        } else if (ultimoEMA20 < prevEMA20) {
            mensaje = 'SHORT 🟥';
            clase = 'short';
        }

        if (mensaje !== '' && mensaje !== this.ultimaSeñal) {
            this.elementoAlerta.textContent = mensaje;
            this.elementoAlerta.className = clase;
            this.elementoValorEMA20.textContent = `EMA20: ${ultimoEMA20.toFixed(2)}`;
            this.enviarAlertaDiscord(`📢 **Alerta de Trading**\n🔹 EMA20: ${ultimoEMA20.toFixed(2)}\n📊 **Señal:** ${mensaje}`);
            this.ultimaSeñal = mensaje;
        } else if (mensaje === '') {
            // Si no hay señal, resetear el texto de la alerta
            this.elementoAlerta.textContent = '';
            this.elementoAlerta.className = '';
            this.elementoValorEMA20.textContent = '';
            this.ultimaSeñal = null;
        } else {
            // Si no cambia la señal, actualizar solo el valor de la EMA20
            this.elementoValorEMA20.textContent = `EMA20: ${ultimoEMA20.toFixed(2)}`;
        }
    }

    async enviarAlertaDiscord(mensaje) {
        try {
            await fetch(this.webhookURL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: mensaje })
            });
            console.log("Alerta enviada a Discord con éxito.");
        } catch (error) {
            console.error("Error al enviar alerta a Discord:", error);
        }
    }
}

window.manejadorAlertas = new ManejadorAlertas();

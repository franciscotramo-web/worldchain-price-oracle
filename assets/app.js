/* =================================================================
   🧠 CAPA LÓGICA DE PROGRAMACIÓN WEB3 - ORGANIC LABS ARCHITECTURE
   ================================================================= */

const precioElemento = document.getElementById('precio-live');
const relojElemento = document.getElementById('clock-live');
const minimoElemento = document.getElementById('precio-minimo');
const maximoElemento = document.getElementById('precio-maximo');

const modalAnuncio = document.getElementById('modal-publicidad');
const totalPagarElemento = document.getElementById('ad-total-pagar');

let precioAnteriorBlockchain = null;

// CONTROLADORES INTERACTIVOS VISUALES DEL MODAL
const abrirPasarelaPublicitaria = () => {
    modalAnuncio.style.display = 'flex';
    setTimeout(() => { modalAnuncio.style.opacity = '1'; }, 10);
    const contenido = modalAnuncio.querySelector('.modal-content');
    contenido.style.transform = 'scale(1)';
};

const cerrarPasarelaPublicitaria = () => {
    modalAnuncio.style.opacity = '0';
    const contenido = modalAnuncio.querySelector('.modal-content');
    contenido.style.transform = 'scale(0.9)';
    setTimeout(() => { modalAnuncio.style.display = 'none'; }, 300);
};

document.getElementById('sponsor-link').addEventListener('click', (e) => {
    e.preventDefault();
    abrirPasarelaPublicitaria();
});

const calcularTarifaPublicitaria = () => {
    const dias = parseInt(document.getElementById('ad-duracion').value);
    let total = 1.50;
    if (dias === 7) total = 7.00;
    if (dias === 14) total = 12.00;
    totalPagarElemento.innerText = `$${total.toFixed(2)} USDC`;
};
// =================================================================
// 🚀 PASARELA AUTÓNOMA: Integración con la Wallet y Envío de Hash al Backend
// =================================================================
const procesarPagoAnuncioAutonomo = async () => {
    const urlDestino = document.getElementById('ad-url-destino').value;
    const urlBannerImg = document.getElementById('ad-url-banner-img').value;
    const textoBanner = document.getElementById('ad-texto-banner').value;
    const dias = document.getElementById('ad-duracion').value;

    if (!urlDestino || (!urlBannerImg && !textoBanner)) {
        alert("❌ Por favor, rellena el enlace del proyecto y al menos un método publicitario (Imagen o Texto).");
        return;
    }

    let costoUSDC = 1.50;
    if (dias === "7") costoUSDC = 7.00;
    if (dias === "14") costoUSDC = 12.00;

    // ✅ VALIDADO: Tu dirección real de MetaMask para recibir los fondos directo en World Chain
    const MI_BILLETERA_METAMASK_REAL = "0x526376e1e12a0e46ce021D8069d82DAc14413dB0";
    const CONTRACT_USDC_WORLD_CHAIN = "0x79A02482A880b0755F0a57d62059345205567346";

    const deepLinkPagoWorldApp = `ethereum:${CONTRACT_USDC_WORLD_CHAIN}/transfer?address=${MI_BILLETERA_METAMASK_REAL}&uint256=${costoUSDC * 1000000}`;

    console.log("📡 Despachando orden de cobro multimedia hacia la World App...");
    window.open(deepLinkPagoWorldApp, '_blank');
    cerrarPasarelaPublicitaria();

    // Captura asíncrona segura mediante prompt para auditoría on-chain
    setTimeout(async () => {
        const hashCliente = prompt("💎 ¡Transacción enviada! Para activar tu banner de inmediato en piloto automático, pega aquí el Hash de la transacción arrojado por tu Wallet:");

        if (hashCliente) {
            relojElemento.innerText = "⏳ Auditando pago on-chain en el servidor...";
            relojElemento.style.color = "var(--brand-blue)";

            try {
                const respuestaServidor = await fetch('https://worldchain-price-oracle.vercel.app/api/verificar-pago', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        txHash: hashCliente.trim(),
                        urlDestino: urlDestino.trim(),
                        urlBannerImg: urlBannerImg ? urlBannerImg.trim() : '',
                        textoBanner: textoBanner ? textoBanner.trim() : '',
                        dias: dias
                    })
                });

                const respuestaJSON = await respuestaServidor.json();

                if (respuestaJSON.success) {
                    alert("✅ ¡Éxito absoluto! Tu pago fue verificado en los bloques de World Chain. Tu anuncio está activo a nivel global.");
                    refrescarPrecioDesdeBackend();
                } else {
                    alert(`❌ Validación Rechazada: ${respuestaJSON.details || respuestaJSON.error}`);
                    refrescarPrecioDesdeBackend();
                }
            } catch (err) {
                alert("❌ Error de comunicación con el escudo de auditoría: " + err.message);
                refrescarPrecioDesdeBackend();
            }
        }
    }, 1500);
};

// =================================================================
// 📡 CONSUMO DE DATOS CENTRALIZADOS: Renderizado adaptativo de Banners
// =================================================================
const refrescarPrecioDesdeBackend = async () => {
    try {
        const respuesta = await fetch('https://worldchain-price-oracle.vercel.app/api/precio');

        if (!respuesta.ok) {
            throw new Error(`HTTP Error ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (datos.success) {
            const precioActual = datos.price;
            precioElemento.innerText = `$${precioActual.toFixed(6)}`;

            if (datos.priceMin12h !== undefined && datos.priceMax12h !== undefined) {
                minimoElemento.innerText = `$${datos.priceMin12h.toFixed(4)}`;
                maximoElemento.innerText = `$${datos.priceMax12h.toFixed(4)}`;
            }

            const imgComponente = document.getElementById('sponsor-image');
            const txtComponente = document.getElementById('sponsor-text');
            const linkComponente = document.getElementById('sponsor-link');

            if (datos.adActive && datos.adBannerUrl && datos.adBannerUrl.startsWith('http')) {
                txtComponente.style.display = 'none';
                imgComponente.src = datos.adBannerUrl;
                imgComponente.style.display = 'block';
                if (datos.adTargetUrl) linkComponente.href = datos.adTargetUrl;
            } else if (datos.adActive && datos.adText) {
                imgComponente.style.display = 'none';
                txtComponente.innerText = datos.adText;
                txtComponente.style.display = 'block';
                if (datos.adTargetUrl) linkComponente.href = datos.adTargetUrl;
            } else {
                imgComponente.style.display = 'none';
                txtComponente.innerText = "📢 Publicita tu Proyecto aquí (Cobro diario) 🚀";
                txtComponente.style.display = 'block';
                linkComponente.href = "https://t.me";
            }

            // CONTROL DINÁMICO OPTIMIZADO DE TENDENCIAS
            const flechaElemento = document.getElementById('tendencia-flecha');
            const tarjetaElemento = document.getElementById('app-card');

            if (precioAnteriorBlockchain !== null) {
                if (precioActual > precioAnteriorBlockchain) {
                    flechaElemento.innerText = "▲";
                    flechaElemento.style.color = 'var(--brand-green)';
                    precioElemento.style.color = 'var(--brand-green)';
                    precioElemento.style.textShadow = '0 0 15px rgba(57, 211, 83, 0.6)';
                    tarjetaElemento.style.setProperty('--glow-color', 'rgba(57, 211, 83, 0.25)');
                } else if (precioActual < precioAnteriorBlockchain) {
                    flechaElemento.innerText = "▼";
                    flechaElemento.style.color = 'var(--brand-red)';
                    precioElemento.style.color = 'var(--brand-red)';
                    precioElemento.style.textShadow = '0 0 15px rgba(248, 81, 73, 0.6)';
                    tarjetaElemento.style.setProperty('--glow-color', 'rgba(248, 81, 73, 0.25)');
                } else {
                    precioElemento.style.color = 'var(--text-primary)';
                    precioElemento.style.textShadow = '0 0 10px rgba(240, 246, 252, 0.1)';
                }
            }

            precioAnteriorBlockchain = precioActual;

            const horaLocal = new Date(datos.timestamp).toLocaleTimeString();
            relojElemento.innerText = `✅ Bloque verificado a las ${horaLocal}`;
            relojElemento.style.color = 'var(--text-secondary)';
        } else {
            throw new Error("Estado fallido.");
        }
    } catch (error) {
        precioElemento.innerText = "❌ ERR";
        precioElemento.style.color = 'var(--brand-red)';
        relojElemento.innerText = "Falla de enlace con la API REST.";
        relojElemento.style.color = 'var(--brand-red)';
    }
};

refrescarPrecioDesdeBackend();
setInterval(refrescarPrecioDesdeBackend, 5000);

/* =================================================================
   🧠 CAPA LÓGICA DE PROGRAMACIÓN WEB3 - INTERFAZ DE ALTA RETENCIÓN UX
   ================================================================= */

const precioElemento = document.getElementById('precio-live');
const relojElemento = document.getElementById('clock-live');
const minimoElemento = document.getElementById('precio-minimo');
const maximoElemento = document.getElementById('precio-maximo');
const modalAnuncio = document.getElementById('modal-publicidad');
const totalPagarElemento = document.getElementById('ad-total-pagar');

let precioAnteriorBlockchain = null;
const URL_BASE = 'https://worldchain-price-oracle.vercel.app';

// CONTROLADORES INTERACTIVOS VISUALES DEL FORMULARIO
const abrirModal = () => {
    if (modalAnuncio) {
        modalAnuncio.style.display = 'flex';
        modalAnuncio.style.opacity = '1';
    }
};

const cerrarPasarelaPublicitaria = () => {
    if (modalAnuncio) {
        modalAnuncio.style.opacity = '0';
        modalAnuncio.style.display = 'none';
    }
};

// ASOCIACIÓN IMPACABLE DE EVENTOS A LOS ELEMENTOS DEL DOM
const btnComprar = document.getElementById('btn-comprar-anuncio');
if (btnComprar) btnComprar.addEventListener('click', abrirModal);

const sponsorLink = document.getElementById('sponsor-link');
if (sponsorLink) {
    sponsorLink.addEventListener('click', (e) => {
        e.preventDefault();
        abrirModal();
    });
}

const btnCerrar = document.getElementById('btn-cerrar-modal');
if (btnCerrar) btnCerrar.addEventListener('click', cerrarPasarelaPublicitaria);

const selectDuracion = document.getElementById('ad-duracion');
if (selectDuracion) {
    selectDuracion.addEventListener('change', () => {
        const dias = parseInt(selectDuracion.value);
        let total = 1.50;
        if (dias === 7) total = 7.00;
        if (dias === 14) total = 12.00;
        if (totalPagarElemento) totalPagarElemento.innerText = `$${total.toFixed(2)} USDC`;
    });
}

// =================================================================
// 🚀 PASARELA DE COBRO AUTÓNOMA: Integración nativa con la Wallet
// =================================================================
const procesarPagoAnuncioAutonomo = async () => {
    const urlDestino = document.getElementById('ad-url-destino').value;
    const urlBannerImg = document.getElementById('ad-url-banner-img').value;
    const textoBanner = document.getElementById('ad-texto-banner').value;
    const dias = document.getElementById('ad-duracion').value;

    if (!urlDestino || (!urlBannerImg && !textoBanner)) {
        alert("❌ Por favor, rellena el enlace de tu proyecto.");
        return;
    }

    let costoUSDC = 1.50;
    if (dias === "7") costoUSDC = 7.00;
    if (dias === "14") costoUSDC = 12.00;

    // ✅ TUS DATOS OFICIALES DE ENTORNO FIJADOS SIN ESCRITURA INCOMPLETA
    const MI_BILLETERA_METAMASK_REAL = "0x526376e1e12a0e46ce021D8069d82DAc14413dB0";
    const CONTRACT_USDC_WORLD_CHAIN = "0x79A02482A880b0755F0a57d62059345205567346";

    // Disparamos el Deep Link nativo hacia la billetera cripto del celular
    window.open(`ethereum:${CONTRACT_USDC_WORLD_CHAIN}/transfer?address=${MI_BILLETERA_METAMASK_REAL}&uint256=${costoUSDC * 1000000}`, '_blank');
    cerrarPasarelaPublicitaria();

    setTimeout(async () => {
        const hashCliente = prompt("💎 ¡Pago enviado! Pega aquí el Hash de la transacción arrojado por tu Wallet:");
        if (hashCliente && hashCliente.trim() !== "") {
            if (relojElemento) relojElemento.innerText = "⏳ Auditando pago on-chain...";
            try {
                const res = await fetch(`${URL_BASE}/api/verificar-pago`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        txHash: hashCliente.trim(), urlDestino: urlDestino.trim(),
                        urlBannerImg: urlBannerImg.trim(), textoBanner: textoBanner.trim(), dias: dias
                    })
                });
                const data = await res.json();
                if (data.success) {
                    alert("✅ ¡Anuncio activado con éxito a nivel global!");
                } else {
                    alert(`❌ Validación Rechazada: ${data.error}`);
                }
                refrescarPrecioDesdeBackend();
            } catch (err) {
                alert("❌ Falla de comunicación: " + err.message);
                refrescarPrecioDesdeBackend();
            }
        }
    }, 1500);
};

const btnPagar = document.getElementById('btn-pagar-wallet');
if (btnPagar) btnPagar.addEventListener('click', procesarPagoAnuncioAutonomo);

// =================================================================
// 📡 CONSUMO DE DATOS CENTRALIZADOS: Sincronización del Oráculo y Estilos UX
// =================================================================
const refrescarPrecioDesdeBackend = async () => {
    try {
        const respuesta = await fetch(`${URL_BASE}/api/precio`);
        const datos = await respuesta.json();

        if (datos.success) {
            const precioActual = datos.price;
            if (precioElemento) precioElemento.innerText = `$${precioActual.toFixed(6)}`;

            if (datos.priceMin12h !== undefined && datos.priceMax12h !== undefined) {
                if (minimoElemento) minimoElemento.innerText = `$${datos.priceMin12h.toFixed(4)}`;
                if (maximoElemento) maximoElemento.innerText = `$${datos.priceMax12h.toFixed(4)}`;
            }

            // Renderizador publicitario superior multimedia adaptativo
            const imgComponente = document.getElementById('sponsor-image');
            const txtComponente = document.getElementById('sponsor-text');
            const linkComponente = document.getElementById('sponsor-link');

            if (imgComponente && txtComponente) {
                if (datos.adActive && datos.adBannerUrl && datos.adBannerUrl.trim().startsWith('http')) {
                    txtComponente.style.display = 'none';
                    imgComponente.src = datos.adBannerUrl.trim();
                    imgComponente.style.display = 'block';
                    if (linkComponente && datos.adTargetUrl) {
                        linkComponente.href = datos.adTargetUrl.trim();
                    }
                } else {
                    // Fallback Oficial: Tu canal real de Soporte si la Base de Datos está limpia
                    imgComponente.style.display = 'none';
                    txtComponente.innerText = "📢 Publicita tu Proyecto aquí (Cobro diario) 🚀";
                    txtComponente.style.display = 'block';
                    if (linkComponente) {
                        linkComponente.href = "https://t.me/+K3X3kajhpa04YTAx";
                    }
                }
            }

            // SECCIÓN MAESTRA DE ALTA RETENCIÓN: Estilos y Destellos Dinámicos de Tendencia
            const flechaElemento = document.getElementById('tendencia-flecha');
            const tarjetaElemento = document.getElementById('app-card');

            if (precioAnteriorBlockchain !== null && flechaElemento && precioElemento && tarjetaElemento) {
                if (precioActual > precioAnteriorBlockchain) {
                    flechaElemento.innerText = "▲";
                    flechaElemento.style.color = '#39d353';
                    precioElemento.style.color = '#39d353';
                    precioElemento.style.textShadow = '0 0 18px rgba(57, 211, 83, 0.7)';
                    tarjetaElemento.style.setProperty('--glow-color', 'rgba(57, 211, 83, 0.25)');
                } else if (precioActual < precioAnteriorBlockchain) {
                    flechaElemento.innerText = "▼";
                    flechaElemento.style.color = '#f85149';
                    precioElemento.style.color = '#f85149';
                    precioElemento.style.textShadow = '0 0 18px rgba(248, 81, 73, 0.7)';
                    tarjetaElemento.style.setProperty('--glow-color', 'rgba(248, 81, 73, 0.25)');
                }
            }

            precioAnteriorBlockchain = precioActual;

            if (relojElemento) {
                relojElemento.innerText = `✅ Bloque verificado: ${new Date(datos.timestamp).toLocaleTimeString()}`;
                relojElemento.style.color = 'var(--text-secondary)';
            }
        }
    } catch (error) {
        if (precioElemento) {
            precioElemento.innerText = "❌ ERR";
            precioElemento.style.color = 'var(--brand-red)';
        }
        if (relojElemento) {
            relojElemento.innerText = "Falla de enlace con la API REST.";
            relojElemento.style.color = 'var(--brand-red)';
        }
    }
};

refrescarPrecioDesdeBackend();
setInterval(refrescarPrecioDesdeBackend, 5000);

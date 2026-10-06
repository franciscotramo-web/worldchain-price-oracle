/* =================================================================
   🧠 CAPA LÓGICA WEB3 - COBRO MULTIMEDIA Y AUDITORÍA ON-CHAIN
   ================================================================= */

const precioElemento = document.getElementById('precio-live');
const relojElemento = document.getElementById('clock-live');
const minimoElemento = document.getElementById('precio-minimo');
const maximoElemento = document.getElementById('precio-maximo');
const modalAnuncio = document.getElementById('modal-publicidad');
const totalPagarElemento = document.getElementById('ad-total-pagar');

let precioAnteriorBlockchain = null;
const URL_BASE = 'https://worldchain-price-oracle.vercel.app';

const abrirPasarelaPublicitaria = () => { modalAnuncio.style.display = 'flex'; };
const cerrarPasarelaPublicitaria = () => { modalAnuncio.style.display = 'none'; };

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

// 🚀 PASARELA DE COBRO DE ALTA INGENIERÍA: Integración Nativa Ethereum Request
const procesarPagoAnuncioAutonomo = async () => {
    const urlDestino = document.getElementById('ad-url-destino').value;
    const urlBannerImg = document.getElementById('ad-url-banner-img').value;
    const textoBanner = document.getElementById('ad-texto-banner').value;
    const dias = document.getElementById('ad-duracion').value;

    if (!urlDestino || (!urlBannerImg && !textoBanner)) {
        alert("❌ Por favor, rellena los campos obligatorios.");
        return;
    }

    let costoUSDC = 1.50;
    if (dias === "7") costoUSDC = 7.00;
    if (dias === "14") costoUSDC = 12.00;

    const MI_BILLETERA_METAMASK_REAL = "0x526376e1e12a0e46ce021D8069d82DAc14413dB0";
    const CONTRACT_USDC_WORLD_CHAIN = "0x79A02482A880b0755F0a57d62059345205567346";

    // Disparador directo del Deep Link nativo para World App / MetaMask
    window.open(`ethereum:${CONTRACT_USDC_WORLD_CHAIN}/transfer?address=${MI_BILLETERA_METAMASK_REAL}&uint256=${costoUSDC * 1000000}`, '_blank');
    cerrarPasarelaPublicitaria();

    setTimeout(async () => {
        const hashCliente = prompt("💎 ¡Pago enviado! Pega aquí el Hash de la transacción para activarlo en piloto automático:");
        if (hashCliente) {
            relojElemento.innerText = "⏳ Auditando pago on-chain en el servidor...";
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
                    alert("✅ ¡Éxito! Pago validado on-chain. Anuncio activo a nivel global.");
                } else {
                    alert(`❌ Validación Rechazada: ${data.error}`);
                }
                refrescarPrecioDesdeBackend();
            } catch (err) {
                alert("❌ Falla de comunicación con el validador: " + err.message);
                refrescarPrecioDesdeBackend();
            }
        }
    }, 1500);
};

// 📡 CONSUMO DE DATOS CENTRALIZADOS: Renderizado asíncrono optimizado
const refrescarPrecioDesdeBackend = async () => {
    try {
        const respuesta = await fetch(`${URL_BASE}/api/precio`);
        const datos = await respuesta.json();

        if (datos.success) {
            const precioActual = datos.price;
            precioElemento.innerText = `$${precioActual.toFixed(6)}`;

            if (datos.priceMin12h !== undefined && datos.priceMax12h !== undefined) {
                minimoElemento.innerText = `$${datos.priceMin12h.toFixed(4)}`;
                maximoElemento.innerText = `$${datos.priceMax12h.toFixed(4)}`;
            }

            const img = document.getElementById('sponsor-image');
            const txt = document.getElementById('sponsor-text');
            const lnk = document.getElementById('sponsor-link');

            if (datos.adActive && datos.adBannerUrl) {
                txt.style.display = 'none'; img.src = datos.adBannerUrl; img.style.display = 'block';
                if (datos.adTargetUrl) lnk.href = datos.adTargetUrl;
            } else {
                img.style.display = 'none'; txt.innerText = "📢 Publicita tu Proyecto aquí (Cobro diario) 🚀";
                txt.style.display = 'block'; lnk.href = "#";
            }

            const flecha = document.getElementById('tendencia-flecha');
            const tarjeta = document.getElementById('app-card');

            if (precioAnteriorBlockchain !== null) {
                if (precioActual > precioAnteriorBlockchain) {
                    flecha.innerText = "▲"; flecha.style.color = '#39d353'; precioElemento.style.color = '#39d353';
                    tarjeta.style.setProperty('--glow-color', 'rgba(57,211,83,0.25)');
                } else if (precioActual < precioAnteriorBlockchain) {
                    flecha.innerText = "▼"; flecha.style.color = '#f85149'; precioElemento.style.color = '#f85149';
                    tarjeta.style.setProperty('--glow-color', 'rgba(248,81,73,0.25)');
                }
            }
            precioAnteriorBlockchain = precioActual;
            relojElemento.innerText = `✅ Bloque verificado a las ${new Date(datos.timestamp).toLocaleTimeString()}`;
        }
    } catch (error) {
        precioElemento.innerText = "❌ ERR";
        relojElemento.innerText = "Falla de enlace con la API REST.";
    }
};

refrescarPrecioDesdeBackend();
setInterval(refrescarPrecioDesdeBackend, 5000);

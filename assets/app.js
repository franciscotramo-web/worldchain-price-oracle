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
const URL_BASE = 'https://worldchain-price-oracle.vercel.app';

// CONTROLADORES INTERACTIVOS VISUALES DEL FORMULARIO
const abrirPasarelaPublicitaria = () => {
    modalAnuncio.style.display = 'flex';
};

const cerrarPasarelaPublicitaria = () => {
    modalAnuncio.style.display = 'none';
};

// Escuchamos de forma explícita el clic en el cartel superior
document.getElementById('sponsor-link').addEventListener('click', (e) => {
    e.preventDefault();
    abrirPasarelaPublicitaria();
});

// COTIZADOR ELÁSTICO DE TARIFAS EN TIEMPO REAL
const calcularTarifaPublicitaria = () => {
    const dias = parseInt(document.getElementById('ad-duracion').value);
    let total = 1.50;
    if (dias === 7) total = 7.00;
    if (dias === 14) total = 12.00;
    totalPagarElemento.innerText = `$${total.toFixed(2)} USDC`;
};

// =================================================================
// 🚀 PASARELA DE COBRO AUTÓNOMA: Integración nativa con la Wallet
// =================================================================
const procesarPagoAnuncioAutonomo = async () => {
    const urlDestino = document.getElementById('ad-url-destino').value;
    const urlBannerImg = document.getElementById('ad-url-banner-img').value;
    const textoBanner = document.getElementById('ad-texto-banner').value;
    const dias = document.getElementById('ad-duracion').value;

    if (!urlDestino || (!urlBannerImg && !textoBanner)) {
        alert("❌ Por favor, rellena el enlace de tu proyecto y al menos un método publicitario.");
        return;
    }

    let costoUSDC = 1.50;
    if (dias === "7") costoUSDC = 7.00;
    if (dias === "14") costoUSDC = 12.00;

    const MI_BILLETERA_METAMASK_REAL = "0x526376e1e12a0e46ce021D8069d82DAc14413dB0";
    const CONTRACT_USDC_WORLD_CHAIN = "0x79A02482A880b0755F0a57d62059345205567346";

    // Disparamos el Deep Link nativo hacia la billetera cripto
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
                        txHash: hashCliente.trim(),
                        urlDestino: urlDestino.trim(),
                        urlBannerImg: urlBannerImg.trim(),
                        textoBanner: textoBanner.trim(),
                        dias: dias
                    })
                });
                const data = await res.json();
                if (data.success) {
                    alert("✅ ¡Éxito absoluto! Tu pago fue verificado. El anuncio ya está activo.");
                } else {
                    alert(`❌ Validación Rechazada: ${data.error}`);
                }
                refrescarPrecioDesdeBackend();
            } catch (err) {
                alert("❌ Falla de comunicación con el escudo de auditoría: " + err.message);
                refrescarPrecioDesdeBackend();
            }
        }
    }, 1500);
};

// =================================================================
// 📡 CONSUMO DE DATOS CENTRALIZADOS: Sincronización del Oráculo
// =================================================================
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

            // Mapeo simétrico riguroso alineado con los IDs reales de tu index.html
            const imgComponente = document.getElementById('sponsor-image');
            const txtComponente = document.getElementById('sponsor-text');
            const linkComponente = document.getElementById('sponsor-link');

            if (datos.adActive && datos.adBannerUrl) {
                txtComponente.style.display = 'none';
                imgComponente.src = datos.adBannerUrl;
                imgComponente.style.display = 'block';
                linkComponente.href = datos.adTargetUrl;
            } else {
                imgComponente.style.display = 'none';
                txtComponente.innerText = "📢 Publicita tu Proyecto aquí (Cobro diario) 🚀";
                txtComponente.style.display = 'block';
                linkComponente.href = "#";
            }

            // CONTROL DINÁMICO DE TENDENCIAS EN LA TARJETA
            const flechaElemento = document.getElementById('tendencia-flecha');
            const tarjetaElemento = document.getElementById('app-card');

            if (precioAnteriorBlockchain !== null) {
                if (precioActual > precioAnteriorBlockchain) {
                    flechaElemento.innerText = "▲";
                    flechaElemento.style.color = '#39d353';
                    precioElemento.style.color = '#39d353';
                    tarjetaElemento.style.setProperty('--glow-color', 'rgba(57,211,83,0.25)');
                } else if (precioActual < precioAnteriorBlockchain) {
                    flechaElemento.innerText = "▼";
                    flechaElemento.style.color = '#f85149';
                    precioElemento.style.color = '#f85149';
                    tarjetaElemento.style.setProperty('--glow-color', 'rgba(248,81,73,0.25)');
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

// Inicializadores automáticos del ciclo de ejecución
refrescarPrecioDesdeBackend();
setInterval(refrescarPrecioDesdeBackend, 5000);

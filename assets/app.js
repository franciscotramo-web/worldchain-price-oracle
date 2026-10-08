const precioElemento = document.getElementById('precio-live');
const relojElemento = document.getElementById('clock-live');
const minimoElemento = document.getElementById('precio-minimo');
const maximoElemento = document.getElementById('precio-maximo');
const modalAnuncio = document.getElementById('modal-publicidad');
const totalPagarElemento = document.getElementById('ad-total-pagar');

let precioAnteriorBlockchain = null;
const URL_BASE = 'https://worldchain-price-oracle.vercel.app/';

// 🛠️ INICIALIZACIÓN OFICIAL DEL MINIKIT DE WORLDCOIN
if (window.MiniKit) {
    window.MiniKit.init();
}

const abrirModal = () => { if (modalAnuncio) modalAnuncio.style.display = 'flex'; };
const cerrarPasarelaPublicitaria = () => { if (modalAnuncio) modalAnuncio.style.display = 'none'; };

const btnComprar = document.getElementById('btn-comprar-anuncio');
if (btnComprar) btnComprar.addEventListener('click', abrirModal);

const btnCerrar = document.getElementById('btn-cerrar-modal');
if (btnCerrar) btnCerrar.addEventListener('click', cerrarPasarelaPublicitaria);

const selectDuracion = document.getElementById('ad-duracion');
if (selectDuracion) {
    selectDuracion.addEventListener('change', () => {
        const total = selectDuracion.value === "test" ? 0.015 : 1.50;
        if (totalPagarElemento) totalPagarElemento.innerText = `$${total.toFixed(3)} USDC`;
    });
}

// 🚀 PASARELA DE ALTA INGENIERÍA: Invocación del puente nativo de Worldcoin
const procesarPagoAnuncioAutonomo = async () => {
    const urlDestino = document.getElementById('ad-url-destino').value;
    const urlBannerImg = document.getElementById('ad-url-banner-img').value;
    const textoBanner = document.getElementById('ad-texto-banner').value;
    const dias = selectDuracion.value;

    if (!urlDestino) return alert("❌ Introduce la URL de redirección.");

    let costoUSDC = dias === "test" ? 0.015 : 1.50;
    const MI_BILLETERA_METAMASK_REAL = "0x526376e1e12a0e46ce021D8069d82DAc14413dB0";
    const CONTRACT_USDC_WORLD_CHAIN = "0x79A02482A880b0755F0a57d62059345205567346";

    const modalContent = document.querySelector('.modal-content');
    modalContent.innerHTML = `
        <div style="font-weight:700; margin-bottom:15px; font-size:1.1rem; color:var(--brand-green);">⚡ Firmando con World App...</div>
        <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4; text-align:center;">
            Autoriza la orden por <b>$${costoUSDC} USDC</b> en la cortina oficial de tu billetera.
        </div>
    `;

    try {
        // DETECCIÓN DINÁMICA DEL ENTORNO DE LA TIENDA DE WORLDCOIN
        if (window.MiniKit && window.MiniKit.isInstalled()) {
            console.log("💎 Ejecutando transacción integrada mediante MiniKit Bridge.");

            // Invocación nativa del bridge del sistema operativo del celular
            const respuestaPago = await window.MiniKit.commands.sendTransaction({
                to: MI_BILLETERA_METAMASK_REAL,
                token: CONTRACT_USDC_WORLD_CHAIN,
                amount: (costoUSDC * 1000000).toString() // Unidades base
            });

            if (respuestaPago && respuestaPago.transactionHash) {
                // El puente captura el hash en silencio de fondo. Fricción cero para el usuario.
                await fetch(`${URL_BASE}/api/verificar-pago`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txHash: respuestaPago.transactionHash, urlDestino, urlBannerImg, textoBanner, dias })
                });
                alert("✅ ¡Pago verificado! Banner activo por 5 minutos.");
                window.location.reload();
            }
        } else {
            // Fallback Universal Seguro: Si abres la app fuera de la billetera (ej: navegador web de PC)
            console.log("⚠️ Fuera de la World App. Despachando Deep Link estándar.");
            window.open(`ethereum:${CONTRACT_USDC_WORLD_CHAIN}/transfer?address=${MI_BILLETERA_METAMASK_REAL}&uint256=${costoUSDC * 1000000}`, '_blank');

            setTimeout(() => { window.location.reload(); }, 5000);
        }
    } catch (err) {
        alert("❌ Error: " + err.message);
        window.location.reload();
    }
};

const btnPagar = document.getElementById('btn-pagar-wallet');
if (btnPagar) btnPagar.addEventListener('click', procesarPagoAnuncioAutonomo);

const refrescarPrecioDesdeBackend = async () => {
    try {
        const respuesta = await fetch(`${URL_BASE}/api/precio`);
        const datos = await respuesta.json();

        if (datos.success) {
            const precioActual = datos.price;
            if (precioElemento) precioElemento.innerText = `$${precioActual.toFixed(6)}`;

            if (minimoElemento && datos.priceMin12h !== undefined) minimoElemento.innerText = `$${datos.priceMin12h.toFixed(4)}`;
            if (maximoElemento && datos.priceMax12h !== undefined) maximoElemento.innerText = `$${datos.priceMax12h.toFixed(4)}`;

            const img = document.getElementById('sponsor-image'); const txt = document.getElementById('sponsor-text'); const lnk = document.getElementById('sponsor-link');
            if (img && txt) {
                if (datos.adActive && datos.adBannerUrl && datos.adBannerUrl.trim().startsWith('http')) {
                    txt.style.display = 'none'; img.src = datos.adBannerUrl.trim(); img.style.display = 'block';
                    if (lnk && datos.adTargetUrl) lnk.href = datos.adTargetUrl.trim();
                } else {
                    img.style.display = 'none'; txt.innerText = "📢 Publicita tu Proyecto aquí (Cobro diario) 🚀"; txt.style.display = 'block';
                    if (lnk) lnk.href = "https://t.me";
                }
            }

            const flecha = document.getElementById('tendencia-flecha'); const tarjeta = document.getElementById('app-card');
            if (precioAnteriorBlockchain !== null && flecha && precioElemento && tarjeta) {
                if (precioActual > precioAnteriorBlockchain) {
                    flecha.innerText = "▲"; flecha.style.color = '#39d353'; precioElemento.style.color = '#39d353';
                    precioElemento.style.textShadow = '0 0 18px rgba(57, 211, 83, 0.7)';
                    tarjeta.style.setProperty('--glow-color', 'rgba(57, 211, 83, 0.25)');
                } else if (precioActual < precioAnteriorBlockchain) {
                    flecha.innerText = "▼"; flecha.style.color = '#f85149'; precioElemento.style.color = '#f85149';
                    precioElemento.style.textShadow = '0 0 18px rgba(248, 81, 73, 0.7)';
                    tarjetaElemento.style.setProperty('--glow-color', 'rgba(248, 81, 73, 0.25)');
                }
            }
            precioAnteriorBlockchain = precioActual;
            if (relojElemento) relojElemento.innerText = `✅ Bloque verificado: ${new Date(datos.timestamp).toLocaleTimeString()}`;
        }
    } catch (error) { if (precioElemento) precioElemento.innerText = "❌ ERR"; }
};

refrescarPrecioDesdeBackend();
setInterval(refrescarPrecioDesdeBackend, 5000);

/* =================================================================
   🧠 CAPA LÓGICA DE PROGRAMACIÓN WEB3 - ORGANIC LABS ARCHITECTURE
   ================================================================= */

const precioElemento = document.getElementById('precio-live');
const relojElemento = document.getElementById('clock-live');
const minimoElemento = document.getElementById('precio-minimo');
const maximoElemento = document.getElementById('precio-maximo');

// Referencias exclusivas de la pasarela interactiva de anuncios
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

// Escuchamos el clic en el banner superior para abrir el formulario interactivo
document.getElementById('sponsor-link').addEventListener('click', (e) => {
    e.preventDefault();
    abrirPasarelaPublicitaria();
});

// CÁLCULO ELÁSTICO AUTOMÁTICO DE TARIFAS PUBLICITARIAS
const calcularTarifaPublicitaria = () => {
    const dias = parseInt(document.getElementById('ad-duracion').value);
    let total = 1.50;
    if (dias === 7) total = 7.00;
    if (dias === 14) total = 12.00;
    totalPagarElemento.innerText = `$${total.toFixed(2)} USDC`;
};

// =================================================================
// 🚀 PASARELA AUTÓNOMA: Enlace profundo (Deep Link) con la World App
// =================================================================
const procesarPagoAnuncioAutonomo = async () => {
    const urlDestino = document.getElementById('ad-url-destino').value;
    const urlBannerImg = document.getElementById('ad-url-banner-img').value;
    const textoBanner = document.getElementById('ad-texto-banner').value;
    const dias = document.getElementById('ad-duracion').value;

    // Validación estricta de control de calidad (QA)
    if (!urlDestino || (!urlBannerImg && !textoBanner)) {
        alert("❌ Por favor, rellena el enlace del proyecto y al menos un método publicitario (Imagen o Texto).");
        return;
    }

    let costoUSDC = 1.50;
    if (dias === "7") costoUSDC = 7.00;
    if (dias === "14") costoUSDC = 12.00;

    // ⚠️ REQUERIMIENTO COMPULSORIO: Cambia esta wallet por tu dirección pública real (0x...) de World Chain
    const MI_BILLETERA_RECEPTORA_REAL = "0x526376e1e12a0e46ce021D8069d82DAc14413dB0";
    const CONTRACT_USDC_WORLD_CHAIN = "0x79A02482A880b0755F0a57d62059345205567346";

    // Gatillo criptográfico nativo para transferir tokens ERC-20 mediante la billetera del celular
    const deepLinkPagoWorldApp = `ethereum:${CONTRACT_USDC_WORLD_CHAIN}/transfer?address=${MI_BILLETERA_RECEPTORA_REAL}&uint256=${costoUSDC * 1000000}`;

    console.log("📡 Despachando orden de cobro multimedia hacia la World App...");
    window.open(deepLinkPagoWorldApp, '_blank');
    cerrarPasarelaPublicitaria();
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

            // Sincronización idéntica de bandas de trading globales
            if (datos.priceMin12h !== undefined && datos.priceMax12h !== undefined) {
                minimoElemento.innerText = `$${datos.priceMin12h.toFixed(4)}`;
                maximoElemento.innerText = `$${datos.priceMax12h.toFixed(4)}`;
            }

            // 🛠️ INTEGRACIÓN MULTIMEDIA ADAPTATIVA (Renderizador de imágenes meme)
            const imgComponente = document.getElementById('sponsor-image');
            const txtComponente = document.getElementById('sponsor-text');
            const linkComponente = document.getElementById('sponsor-link');

            // Si el servidor despacha un anuncio activo con URL de imagen válida
            if (datos.adActive && datos.adBannerUrl && datos.adBannerUrl.startsWith('http')) {
                txtComponente.style.display = 'none';
                imgComponente.src = datos.adBannerUrl;
                imgComponente.style.display = 'block';
                if (datos.adTargetUrl) linkComponente.href = datos.adTargetUrl;
            } else if (datos.adActive && datos.adText) {
                // Si es un anuncio de solo texto comprado por un cliente
                imgComponente.style.display = 'none';
                txtComponente.innerText = datos.adText;
                txtComponente.style.display = 'block';
                if (datos.adTargetUrl) linkComponente.href = datos.adTargetUrl;
            } else {
                // Fallback por defecto (Tu propio cartel de soporte institucional limpio)
                imgComponente.style.display = 'none';
                txtComponente.innerText = "📢 Publicita tu Proyecto aquí (Cobro diario) 🚀";
                txtComponente.style.display = 'block';
                linkComponente.href = "https://t.me";
            }

            // CONTROL DINÁMICO DE COLORES E INDICADORES DE TENDENCIA
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

const navegarAAnunciosPagados = () => {
    console.log("🎯 Disparador de eventos de premios activado.");
    alert("🤖 Lógica de navegación de premios detectada. Próximamente activo.");
};

refrescarPrecioDesdeBackend();
setInterval(refrescarPrecioDesdeBackend, 5000);

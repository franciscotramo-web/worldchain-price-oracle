import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, getAddress, decodeEventLog } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const app = express();
app.use(express.json()); // Habilitamos la lectura de JSON en el cuerpo de las peticiones (Obligatorio)
app.use(cors({ origin: '*' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const CHAINLINK_WLD_FEED = getAddress('0x8Bb2943AB030E3eE05a58d9832525B4f60A97FA0');
const CONTRACT_USDC_WORLD_CHAIN = getAddress('0x79A02482A880b0755F0a57d62059345205567346');

const chainlinkFeedAbi = [{
    name: 'latestRoundData', type: 'function', stateMutability: 'view', inputs: [],
    outputs: [
        { name: 'roundId', type: 'uint80' }, { name: 'answer', type: 'int256' },
        { name: 'startedAt', type: 'uint256' }, { name: 'updatedAt', type: 'uint256' },
        { name: 'answeredInRound', type: 'uint80' }
    ]
}];

// ABI Minimal para decodificar y validar el evento nativo Transfer(address,address,uint256) de USDC
const erc20TransferAbi = [{
    name: 'Transfer', type: 'event',
    inputs: [
        { indexed: true, name: 'from', type: 'address' },
        { indexed: true, name: 'to', type: 'address' },
        { indexed: false, name: 'value', type: 'uint256' }
    ]
}];

app.use((req, res, next) => {
    res.header("X-Frame-Options", "SAMEORIGIN");
    res.header("X-Content-Type-Options", "nosniff");
    res.header("X-XSS-Protection", "1; mode=block");
    next();
});

app.get('/', (req, res) => {
    res.send("🤖 Backend de Organic Labs operativo en tu dominio de Vercel.");
});

// =================================================================
// 🛡️ NUEVO ENDPOINT DE QA: Validador de Transacciones Blockchain y Registro de Errores
// =================================================================
app.post('/api/verificar-pago', async (req, res) => {
    const { txHash, urlDestino, urlBannerImg, textoBanner, dias } = req.body;
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://worldchain.org";

    // ⚠️ REQUERIMIENTO COMPULSORIO: Reemplaza esta dirección con tu billetera real de MetaMask configurada para World Chain
    const MI_BILLETERA_METAMASK_REAL = getAddress("0x526376e1e12a0e46ce021D8069d82DAc14413dB0");

    console.log(`📡 Iniciando auditoría para el Hash: ${txHash}`);

    try {
        if (!txHash || !urlDestino || !dias) {
            return res.status(400).json({ success: false, error: "Datos de entrada incompletos para la verificación." });
        }

        // Calculamos cuánto dinero debió haber pagado estrictamente el cliente según el plan
        let costoEsperadoUSDC = 1.50;
        if (Number(dias) === 7) costoEsperadoUSDC = 7.00;
        if (Number(dias) === 14) costoEsperadoUSDC = 12.00;

        // Instanciamos el cliente Web3 de control mediante tu nodo de Alchemy
        const clienteWeb3 = createPublicClient({ chain: worldchain, transport: http(rpcUrl) });

        // 🔍 CONSULTA ON-CHAIN: Extraemos el recibo de la transacción directamente de la blockchain
        const recibo = await clienteWeb3.getTransactionReceipt({ hash: txHash });

        if (!recibo) {
            throw new Error("La transacción no existe o aún no ha sido minada en World Chain.");
        }

        if (recibo.status !== 'success') {
            throw new Error("Transacción fraudulenta detectada: El estado del envío es RECHAZADO / FALLIDO on-chain.");
        }

        let pagoValidadoCorrectamente = false;
        let montoTransferidoCripto = 0;

        // Escaneamos los logs internos de la transacción buscando el evento de transferencia de USDC
        for (const log of recibo.logs) {
            if (getAddress(log.address) === CONTRACT_USDC_WORLD_CHAIN) {
                const eventoDecodificado = decodeEventLog({
                    abi: erc20TransferAbi,
                    eventName: 'Transfer',
                    topics: log.topics,
                    data: log.data
                });

                const destinatarioDinero = getAddress(eventoDecodificado.args.to);
                montoTransferidoCripto = Number(eventoDecodificado.args.value) / 1000000; // USDC usa 6 decimales

                // Verificamos si el destinatario es tu MetaMask y si el monto cubre la tarifa contratada
                if (destinatarioDinero === MI_BILLETERA_METAMASK_REAL && montoTransferidoCripto >= costoEsperadoUSDC) {
                    pagoValidadoCorrectamente = true;
                    break;
                }
            }
        }

        if (!pagoValidadoCorrectamente) {
            throw new Error(`Auditoría Fallida: El destinatario no es tu billetera o el monto pagado ($${montoTransferidoCripto}) es menor al plan seleccionado ($${costoEsperadoUSDC}).`);
        }

        // 🛠️ ASENTO SEGURO EN SUPABASE: Si el pago pasó el escudo, calculamos los días y congelamos el banner
        const fechaExpiración = new Date();
        fechaExpiración.setDate(fechaExpiración.getDate() + Number(dias));

        await supabase.from('anuncios_premium').delete().neq('id', 0); // Limpieza de campañas antiguas
        const { error: insertError } = await supabase.from('anuncios_premium').insert([{
            url_destino: urlDestino,
            url_banner: urlBannerImg || '',
            dias_contratados: Number(dias),
            billetera_pagador: recibo.from,
            expira_en: fechaExpiración.toISOString()
        }]);

        if (insertError) throw new Error(`Falla al guardar en base de datos: ${insertError.message}`);

        console.log(`✅ Transacción verificada con éxito. Anuncio activado por ${dias} días.`);
        return res.status(200).json({ success: true, message: "Pago auditado on-chain y campaña publicitaria activada de inmediato." });

    } catch (error) {
        // 🚨 SISTEMA DE CAPTURA DE LOGS EXTRACTO: Registramos con precisión milimétrica la traza del error
        console.error("❌ ALERTA DE CONTROL DE CALIDAD - FALLA EN PASARELA:", error.message);
        return res.status(500).json({
            success: false,
            error: "La validación blockchain fue rechazada de forma segura.",
            details: error.message
        });
    }
});

// (Se mantienen idénticos tus endpoints /api/precio y /api/actualizar-12h de los pasos anteriores...)
app.get('/api/precio', async (req, res) => {
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://worldchain.org";
    try {
        const clienteWeb3 = createPublicClient({ chain: worldchain, transport: http(rpcUrl) });
        const resultadoData = await clienteWeb3.readContract({ address: CHAINLINK_WLD_FEED, abi: chainlinkFeedAbi, functionName: 'latestRoundData' });
        let precioCrudoBigInt = Array.isArray(resultadoData) ? resultadoData : (resultadoData && resultadoData.answer !== undefined ? resultadoData.answer : resultadoData);
        const precioRealUSD = Number(precioCrudoBigInt) / Math.pow(10, 18);

        const { data: registroHistorico } = await supabase.from('historico_oraculo').select('precio').order('id', { ascending: false }).limit(1).single();
        const precioBase12hAtras = registroHistorico ? Number(registroHistorico.precio) : precioRealUSD;

        let min12h = precioBase12hAtras; let max12h = precioBase12hAtras;
        if (precioRealUSD < precioBase12hAtras) min12h = precioRealUSD;
        else if (precioRealUSD > precioBase12hAtras) max12h = precioRealUSD;

        const { data: anuncioActivo } = await supabase.from('anuncios_premium').select('*').gt('expira_en', new Date().toISOString()).order('id', { ascending: false }).limit(1).single();

        return res.status(200).json({
            success: true, symbol: "WLD", price: precioRealUSD, priceMin12h: min12h, priceMax12h: max12h,
            adActive: !!anuncioActivo,
            adTargetUrl: anuncioActivo ? anuncioActivo.url_destino : null,
            adBannerUrl: anuncioActivo ? anuncioActivo.url_banner : null,
            adText: (anuncioActivo && !anuncioActivo.url_banner) ? anuncioActivo.url_banner : null,
            timestamp: new Date().toISOString()
        });
    } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/actualizar-12h', async (req, res) => {
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://worldchain.org";
    try {
        const clienteWeb3 = createPublicClient({ chain: worldchain, transport: http(rpcUrl) });
        const resultadoData = await clienteWeb3.readContract({ address: CHAINLINK_WLD_FEED, abi: chainlinkFeedAbi, functionName: 'latestRoundData' });
        let precioCrudoBigInt = Array.isArray(resultadoData) ? resultadoData : (resultadoData && resultadoData.answer !== undefined ? resultadoData.answer : resultadoData);
        const precioFrescoWld = Number(precioCrudoBigInt) / Math.pow(10, 18);
        await supabase.from('historico_oraculo').delete().neq('id', 0);
        await supabase.from('historico_oraculo').insert([{ precio: precioFrescoWld }]);
        return res.status(200).json({ success: true, message: "Memoria permanente en Supabase actualizada." });
    } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
});

if (process.env.NODE_ENV !== 'production') {
    const PUERTO = process.env.PORT || 3000;
    app.listen(PUERTO, () => { console.log(`🚀 Servidor local activo en puerto ${PUERTO}`); });
}
export default app;

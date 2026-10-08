import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, getAddress, decodeEventLog } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const app = express();
app.use(express.json());
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

const erc20TransferAbi = [{
    name: 'Transfer', type: 'event',
    inputs: [
        { indexed: true, name: 'from', type: 'address' },
        { indexed: true, name: 'to', type: 'address' },
        { indexed: false, name: 'value', type: 'uint256' }
    ]
}];

app.get('/', (req, res) => { res.send("🤖 Backend operativo."); });

// =================================================================
// 📡 ENDPOINT OPTIMIZADO: Patrón de Caching Global Centralizado (Push-Pull)
// =================================================================
app.get('/api/precio', async (req, res) => {
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://worldchain.org";
    const ahora = new Date();

    try {
        // 1. Extraemos el último registro guardado en la bitácora de Supabase
        const { data: registroCache } = await supabase
            .from('historico_oraculo')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        let precioFinal = registroCache ? Number(registroCache.precio) : 0.50;
        let min12h = registroCache ? Number(registroCache.precio_min) : 0.50;
        let max12h = registroCache ? Number(registroCache.precio_max) : 0.50;
        let timestampActualizacion = registroCache ? new Date(registroCache.updated_at || ahora) : ahora;

        // Calculamos cuánto tiempo ha pasado desde que el servidor leyó la blockchain por última vez
        const segundosDesdeUltimaLectura = (ahora - timestampActualizacion) / 1000;

        // 🧠 EL ESCUDO DE CONTROL DE CALIDAD:
        // Si han pasado menos de 5 segundos, NO consultamos la blockchain. Devolvemos el dato congelado.
        if (registroCache && segundosDesdeUltimaLectura < 5) {
            const { data: ad } = await supabase.from('anuncios_premium').select('*').gt('expira_en', ahora.toISOString()).order('id', { ascending: false }).limit(1).single();
            return res.status(200).json({
                success: true, symbol: "WLD", price: precioFinal, priceMin12h: min12h, priceMax12h: max12h,
                adActive: !!ad, adTargetUrl: ad ? ad.url_destino : null, adBannerUrl: ad ? ad.url_banner : null,
                timestamp: timestampActualizacion.toISOString()
            });
        }

        // 🛰️ SOLICITUD DE ACTUALIZACIÓN DE CACHÉ: Solo un usuario cada 5 segundos ejecuta este bloque
        console.log("📡 Ventana TTL expirada. Interrogando nodo de World Chain...");
        const clienteWeb3 = createPublicClient({ chain: worldchain, transport: http(rpcUrl) });
        const resData = await clienteWeb3.readContract({ address: CHAINLINK_WLD_FEED, abi: chainlinkFeedAbi, functionName: 'latestRoundData' });

        let rawBig = resData !== null && resData !== undefined ? (Array.isArray(resData) ? resData : (typeof resData === 'bigint' ? resData : resData.answer)) : null;
        const precioRealUSD = Number(rawBig) / Math.pow(10, 18);

        // Si la tabla tiene datos válidos, calculamos las bandas de las 12 horas de ejercicio
        if (registroCache) {
            const fechaRegistroInicial = new Date(registroCache.created_at || ahora);
            const diferenciaHoras = (ahora - fechaRegistroInicial) / (1000 * 60 * 60);

            if (diferenciaHoras < 12) {
                min12h = precioRealUSD < Number(registroCache.precio_min) ? precioRealUSD : Number(registroCache.precio_min);
                max12h = precioRealUSD > Number(registroCache.precio_max) ? precioRealUSD : Number(registroCache.precio_max);

                // Actualizamos el caché central en Supabase
                await supabase.from('historico_oraculo').update({ precio: precioRealUSD, precio_min: min12h, precio_max: max12h }).eq('id', registroCache.id);
            } else {
                // Pasadas las 12 horas, reseteamos el pivote de forma limpia
                await supabase.from('historico_oraculo').delete().neq('id', 0);
                await supabase.from('historico_oraculo').insert([{ precio: precioRealUSD, precio_min: precioRealUSD, precio_max: precioRealUSD }]);
                min12h = precioRealUSD; max12h = precioRealUSD;
            }
        } else {
            await supabase.from('historico_oraculo').insert([{ precio: precioRealUSD, precio_min: precioRealUSD, precio_max: precioRealUSD }]);
            min12h = precioRealUSD; max12h = precioRealUSD;
        }

        const { data: ad } = await supabase.from('anuncios_premium').select('*').gt('expira_en', ahora.toISOString()).order('id', { ascending: false }).limit(1).single();

        return res.status(200).json({
            success: true, symbol: "WLD", price: precioRealUSD, priceMin12h: min12h, priceMax12h: max12h,
            adActive: !!ad, adTargetUrl: ad ? ad.url_destino : null, adBannerUrl: ad ? ad.url_banner : null,
            timestamp: ahora.toISOString()
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: "Falla de sincronización centralizada", details: error.message });
    }
});

// =================================================================
// 🛡️ ENDPOINT COEXISTENTE DE VALIDACIÓN DE COMPRAS MULTIMEDIA
// =================================================================
app.post('/api/verificar-pago', async (req, res) => {
    const { txHash, urlDestino, urlBannerImg, textoBanner, dias } = req.body;
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://worldchain.org";
    const MI_BILLETERA_METAMASK_REAL = getAddress("0x526376e1e12a0e46ce021D8069d82DAc14413dB0");

    try {
        if (!txHash || !urlDestino || !dias) return res.status(400).json({ success: false, error: "Datos incompletos." });

        let costoEsperadoUSDC = 1.50;
        let minutosAdicionales = 0; let diasAdicionales = 0;

        if (dias === "test") { costoEsperadoUSDC = 0.015; minutosAdicionales = 5; }
        else if (Number(dias) === 7) { costoEsperadoUSDC = 7.00; diasAdicionales = 7; }
        else if (Number(dias) === 14) { costoEsperadoUSDC = 12.00; diasAdicionales = 14; }
        else { costoEsperadoUSDC = 1.50; diasAdicionales = 1; }

        const clienteWeb3 = createPublicClient({ chain: worldchain, transport: http(rpcUrl) });
        const recibo = await clienteWeb3.getTransactionReceipt({ hash: txHash });

        if (!recibo || recibo.status !== 'success') throw new Error("Transacción inválida.");

        let pagoValidadoCorrectamente = false;
        for (const log of recibo.logs) {
            if (getAddress(log.address) === CONTRACT_USDC_WORLD_CHAIN) {
                const ev = decodeEventLog({ abi: erc20TransferAbi, eventName: 'Transfer', topics: log.topics, data: log.data });
                if (getAddress(ev.args.to) === MI_BILLETERA_METAMASK_REAL && (Number(ev.args.value) / 1000000) >= costoEsperadoUSDC) {
                    pagoValidadoCorrectamente = true; break;
                }
            }
        }

        if (!pagoValidadoCorrectamente) throw new Error("Abono no recibido.");

        const fechaExpiracion = new Date();
        if (dias === "test") fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + minutosAdicionales);
        else fechaExpiracion.setDate(fechaExpiracion.getDate() + diasAdicionales);

        await supabase.from('anuncios_premium').delete().neq('id', 0);
        await supabase.from('anuncios_premium').insert([{
            url_destino: urlDestino, url_banner: urlBannerImg || '', dias_contratados: dias === "test" ? 0 : Number(dias), billetera_pagador: recibo.from, expira_en: fechaExpiracion.toISOString()
        }]);

        return res.status(200).json({ success: true });
    } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
});

export default app;

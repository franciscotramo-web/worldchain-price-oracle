import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, getAddress } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const CHAINLINK_WLD_FEED = getAddress('0x8Bb2943AB030E3eE05a58d9832525B4f60A97FA0');

const chainlinkFeedAbi = [{
    name: 'latestRoundData', type: 'function', stateMutability: 'view', inputs: [],
    outputs: [
        { name: 'roundId', type: 'uint80' }, { name: 'answer', type: 'int256' },
        { name: 'startedAt', type: 'uint256' }, { name: 'updatedAt', type: 'uint256' },
        { name: 'answeredInRound', type: 'uint80' }
    ]
}];

app.use((req, res, next) => {
    res.header("X-Frame-Options", "SAMEORIGIN");
    res.header("X-Content-Type-Options", "nosniff");
    next();
});

app.get('/', (req, res) => {
    res.send("🤖 Backend operativo.");
});

// =================================================================
// 🛢️ ENDPOINT REPARADO: Extracción Nativa Blindada contra Fallas de Viem
// =================================================================
app.get('/api/precio', async (req, res) => {
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://worldchain.org";
    try {
        const clienteWeb3 = createPublicClient({ chain: worldchain, transport: http(rpcUrl) });

        const resultadoData = await clienteWeb3.readContract({
            address: CHAINLINK_WLD_FEED,
            abi: chainlinkFeedAbi,
            functionName: 'latestRoundData'
        });

        // 🛠️ SOLUCIÓN DE ALTA INGENIERÍA: Evaluamos físicamente qué devolvió el nodo para evitar nulos
        let precioCrudoBigInt = null;

        if (resultadoData !== null && resultadoData !== undefined) {
            if (Array.isArray(resultadoData) && resultadoData.length > 1) {
                precioCrudoBigInt = resultadoData[1]; // Respuesta típica en formato de Arreglo
            } else if (typeof resultadoData === 'bigint' || typeof resultadoData === 'number') {
                precioCrudoBigInt = resultadoData; // Respuesta plana
            } else if (resultadoData.answer !== undefined) {
                precioCrudoBigInt = resultadoData.answer; // Objeto estructurado
            }
        }

        if (precioCrudoBigInt === null || precioCrudoBigInt === undefined) {
            throw new Error("La blockchain devolvió una estructura incompatible.");
        }

        const precioRealUSD = Number(precioCrudoBigInt) / Math.pow(10, 18);

        // Lectura de bandas en Supabase
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
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Error de lectura on-chain", details: error.message });
    }
});

app.get('/api/actualizar-12h', async (req, res) => {
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://worldchain.org";
    try {
        const clienteWeb3 = createPublicClient({ chain: worldchain, transport: http(rpcUrl) });
        const resultadoData = await clienteWeb3.readContract({ address: CHAINLINK_WLD_FEED, abi: chainlinkFeedAbi, functionName: 'latestRoundData' });

        let precioCrudoBigInt = Array.isArray(resultadoData) ? resultadoData[1] : (resultadoData.answer || resultadoData);
        const precioFrescoWld = Number(precioCrudoBigInt) / Math.pow(10, 18);

        await supabase.from('historico_oraculo').delete().neq('id', 0);
        await supabase.from('historico_oraculo').insert([{ precio: precioFrescoWld }]);
        return res.status(200).json({ success: true, message: "Memoria Supabase actualizada." });
    } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
});

export default app;

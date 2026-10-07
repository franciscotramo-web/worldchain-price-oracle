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

app.get('/', (req, res) => { res.send("🤖 Backend operativo."); });

// =================================================================
// 📊 ENDPOINT MAESTRO: Algoritmo de Banda Rígida de 12 Horas con Supabase
// =================================================================
app.get('/api/precio', async (req, res) => {
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://worldchain.org";
    try {
        const clienteWeb3 = createPublicClient({ chain: worldchain, transport: http(rpcUrl) });

        const resultadoData = await clienteWeb3.readContract({
            address: CHAINLINK_WLD_FEED, abi: chainlinkFeedAbi, functionName: 'latestRoundData'
        });

        let precioCrudoBigInt = null;
        if (resultadoData !== null && resultadoData !== undefined) {
            if (Array.isArray(resultadoData) && resultadoData.length > 1) { precioCrudoBigInt = resultadoData[1]; }
            else if (typeof resultadoData === 'bigint' || typeof resultadoData === 'number') { precioCrudoBigInt = resultadoData; }
            else if (resultadoData.answer !== undefined) { precioCrudoBigInt = resultadoData.answer; }
        }

        if (precioCrudoBigInt === null || precioCrudoBigInt === undefined) {
            throw new Error("Estructura blockchain incompatible.");
        }

        const precioRealUSD = Number(precioCrudoBigInt) / Math.pow(10, 18);

        // 🔍 LEEMOS LA VENTANA DE TIEMPO EN SUPABASE
        const { data: registroHistorico } = await supabase
            .from('historico_oraculo')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        let min12h = precioRealUSD;
        let max12h = precioRealUSD;
        const ahora = new Date();

        if (registroHistorico) {
            const fechaRegistro = new Date(registroHistorico.created_at || registroHistorico.creado_en || ahora);
            const diferenciaHoras = (ahora - fechaRegistro) / (1000 * 60 * 60);

            // Si estamos dentro de la ventana de las 12 horas, aplicamos las reglas estrictas de superación
            if (diferenciaHoras < 12) {
                // Recuperamos el mínimo y máximo históricos guardados en las columnas de la tabla
                const antiguoMin = registroHistorico.precio_min || registroHistorico.precio;
                const antiguoMax = registroHistorico.precio_max || registroHistorico.precio;

                // El mínimo y máximo SOLO cambian si el precio actual supera los extremos
                min12h = precioRealUSD < Number(antiguoMin) ? precioRealUSD : Number(antiguoMin);
                max12h = precioRealUSD > Number(antiguoMax) ? precioRealUSD : Number(antiguoMax);

                // Actualizamos el registro actual en Supabase para mantener la memoria viva sin crear filas basura
                await supabase
                    .from('historico_oraculo')
                    .update({ precio_min: min12h, precio_max: max12h })
                    .eq('id', registroHistorico.id);
            } else {
                // Si ya pasaron las 12 horas exactas, reseteamos la ventana e insertamos un nuevo pivote limpio
                await supabase.from('historico_oraculo').delete().neq('id', 0);
                await supabase.from('historico_oraculo').insert([{ precio: precioRealUSD, precio_min: precioRealUSD, precio_max: precioRealUSD }]);
            }
        } else {
            // Inicialización por si la tabla está vacía
            await supabase.from('historico_oraculo').insert([{ precio: precioRealUSD, precio_min: precioRealUSD, precio_max: precioRealUSD }]);
        }

        const { data: anuncioActivo } = await supabase.from('anuncios_premium').select('*').gt('expira_en', new Date().toISOString()).order('id', { ascending: false }).limit(1).single();

        return res.status(200).json({
            success: true, symbol: "WLD", price: precioRealUSD,
            priceMin12h: min12h, priceMax12h: max12h, // Datos consistentes inmutables entregados globalmente
            adActive: !!anuncioActivo,
            adTargetUrl: anuncioActivo ? anuncioActivo.url_destino : null,
            adBannerUrl: anuncioActivo ? anuncioActivo.url_banner : null,
            timestamp: ahora.toISOString()
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Error de consistencia de datos", details: error.message });
    }
});

// Endpoint simplificado para el Cron-Job de vaciado secuencial
app.get('/api/actualizar-12h', async (req, res) => {
    try {
        await supabase.from('historico_oraculo').delete().neq('id', 0);
        return res.status(200).json({ success: true, message: "Ventana de 12 horas reseteada de forma manual con éxito." });
    } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
});

export default app;

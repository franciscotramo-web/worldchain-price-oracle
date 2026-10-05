import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js'; // Importamos el cliente oficial de Supabase
import { createPublicClient, http, getAddress } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const app = express();

// Convención Senior: Habilitar CORS global de forma explícita para solicitudes cruzadas externas
app.use(cors({ origin: '*' }));

// Conexión robusta a tu base de datos Supabase mediante tus variables de entorno protegidas
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Dirección institucional del oráculo de Chainlink (WLD/USD) en World Chain
const CHAINLINK_WLD_FEED = getAddress('0x8Bb2943AB030E3eE05a58d9832525B4f60A97FA0');

const chainlinkFeedAbi = [
    {
        name: 'latestRoundData',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: 'roundId', type: 'uint80' },
            { name: 'answer', type: 'int256' },
            { name: 'startedAt', type: 'uint256' },
            { name: 'updatedAt', type: 'uint256' },
            { name: 'answeredInRound', type: 'uint80' }
        ]
    }
];

// 🛠️ BLINDAJE DE SEGURIDAD INTERNACIONAL (Middleware de Cabeceras OWASP)
app.use((req, res, next) => {
    res.header("X-Frame-Options", "SAMEORIGIN");
    res.header("X-Content-Type-Options", "nosniff");
    res.header("X-XSS-Protection", "1; mode=block");
    next();
});

// Ruta de control estática para verificar estado en el navegador
app.get('/', (req, res) => {
    res.send("🤖 Backend de Organic Labs operativo en tu dominio de Vercel.");
});

// =================================================================
// 🛢️ ROUTER 1: Endpoint estándar modificado para leer tu memoria en Supabase
// =================================================================
app.get('/api/precio', async (req, res) => {
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://worldchain.org";

    try {
        const clienteWeb3 = createPublicClient({
            chain: worldchain,
            transport: http(rpcUrl)
        });

        const resultadoData = await clienteWeb3.readContract({
            address: CHAINLINK_WLD_FEED,
            abi: chainlinkFeedAbi,
            functionName: 'latestRoundData'
        });

        let precioCrudoBigInt;

        if (Array.isArray(resultadoData)) {
            precioCrudoBigInt = resultadoData[1];
        } else if (resultadoData && resultadoData.answer !== undefined) {
            precioCrudoBigInt = resultadoData.answer;
        } else {
            precioCrudoBigInt = resultadoData;
        }

        if (precioCrudoBigInt === undefined || precioCrudoBigInt === null) {
            throw new Error("La estructura devuelta por el oráculo Chainlink no es válida.");
        }

        const precioRealUSD = Number(precioCrudoBigInt) / Math.pow(10, 18);

        // 🔍 LEEMOS LA MEMORIA PERMANENTE: Extraemos el precio congelado en Supabase
        const { data: registroHistorico, error: errorSupabase } = await supabase
            .from('historico_oraculo')
            .select('precio')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        // Si la tabla de Supabase llega a fallar o está vacía, usamos el precio actual como fallback seguro de QA
        const precio12hAtras = (!errorSupabase && registroHistorico) ? Number(registroHistorico.precio) : precioRealUSD;

        return res.status(200).json({
            success: true,
            symbol: "WLD",
            price: precioRealUSD,
            price12hAgo: precio12hAtras, // Enviamos el dato histórico de Supabase a tus usuarios
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ Error interno del oráculo en la nube:", error.message);
        return res.status(500).json({
            success: false,
            error: "Falla interna de procesamiento al interrogar la blockchain.",
            details: error.message
        });
    }
});

// =================================================================
// ⏰ ROUTER 2: La ruta dedicada que golpeará el Cron-Job cada 12 horas
// =================================================================
app.get('/api/actualizar-12h', async (req, res) => {
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://worldchain.org";

    try {
        const clienteWeb3 = createPublicClient({
            chain: worldchain,
            transport: http(rpcUrl)
        });

        const resultadoData = await clienteWeb3.readContract({
            address: CHAINLINK_WLD_FEED,
            abi: chainlinkFeedAbi,
            functionName: 'latestRoundData'
        });

        let precioCrudoBigInt;

        if (Array.isArray(resultadoData)) {
            precioCrudoBigInt = resultadoData[1];
        } else if (resultadoData && resultadoData.answer !== undefined) {
            precioCrudoBigInt = resultadoData.answer;
        } else {
            precioCrudoBigInt = resultadoData;
        }

        const precioFrescoWld = Number(precioCrudoBigInt) / Math.pow(10, 18);

        // 🛠️ ACTUALIZAMOS LA MEMORIA: Limpiamos la tabla en Supabase e insertamos el nuevo precio base
        await supabase.from('historico_oraculo').delete().neq('id', 0); // Limpieza rápida de registros viejos
        const { error: insertError } = await supabase.from('historico_oraculo').insert([{ precio: precioFrescoWld }]);

        if (insertError) {
            throw new Error(`Error al insertar en Supabase: ${insertError.message}`);
        }

        return res.status(200).json({
            success: true,
            message: "Memoria permanente en Supabase actualizada con éxito total.",
            priceSaved: precioFrescoWld,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ Error en la ruta de actualización autónoma:", error.message);
        return res.status(500).json({
            success: false,
            error: "Falla interna al intentar guardar datos en Supabase.",
            details: error.message
        });
    }
});

// Soporte nativo para entorno de desarrollo local
if (process.env.NODE_ENV !== 'production') {
    const PUERTO = process.env.PORT || 3000;
    app.listen(PUERTO, () => {
        console.log(`🚀 Servidor local activo en puerto ${PUERTO}`);
    });
}

export default app;

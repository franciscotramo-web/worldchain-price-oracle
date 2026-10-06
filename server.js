import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js'; // Cliente oficial de Supabase
import { createPublicClient, http, getAddress } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const app = express();

// Convención Senior: Habilitar CORS global explícito para solicitudes cruzadas seguras
app.use(cors({ origin: '*' }));

// Conexión robusta a tu base de datos Supabase mediante variables de entorno protegidas
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Dirección institucional del oráculo de Chainlink (WLD/USD Feed) en World Chain
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

// BLINDAJE DE SEGURIDAD INTERNACIONAL (Middleware de Cabeceras OWASP)
app.use((req, res, next) => {
    res.header("X-Frame-Options", "SAMEORIGIN");
    res.header("X-Content-Type-Options", "nosniff");
    res.header("X-XSS-Protection", "1; mode=block");
    next();
});

// Ruta de control estática para verificar el estado en el navegador
app.get('/', (req, res) => {
    res.send("🤖 Backend de Organic Labs operativo en tu dominio de Vercel.");
});
// =================================================================
// 🛢️ ROUTER 1: Endpoint estándar con soporte para anuncios multimedia
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
            throw new Error("No se pudo mapear el BigInt de Chainlink.");
        }

        const precioRealUSD = Number(precioCrudoBigInt) / Math.pow(10, 18);

        // 🔍 LEEMOS LA MEMORIA BASE: Extraemos el precio de referencia de Supabase
        const { data: registroHistorico } = await supabase
            .from('historico_oraculo')
            .select('precio')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        const precioBase12hAtras = registroHistorico ? Number(registroHistorico.precio) : precioRealUSD;

        let min12h = precioBase12hAtras;
        let max12h = precioBase12hAtras;

        if (precioRealUSD < precioBase12hAtras) {
            min12h = precioRealUSD;
        } else if (precioRealUSD > precioBase12hAtras) {
            max12h = precioRealUSD;
        }

        // =================================================================
        // 📢 ESCÁNER AUTOMÁTICO DE ANUNCIOS MULTIMEDIA (SUPABASE)
        // =================================================================
        // Buscamos el último anuncio contratado que aún no haya expirado
        const { data: anuncioActivo } = await supabase
            .from('anuncios_premium')
            .select('*')
            .gt('expira_en', new Date().toISOString())
            .order('id', { ascending: false })
            .limit(1)
            .single();

        return res.status(200).json({
            success: true,
            symbol: "WLD",
            price: precioRealUSD,
            priceMin12h: min12h,
            priceMax12h: max12h,
            // Empaquetamos la data publicitaria para el frontend elástico
            adActive: !!anuncioActivo,
            adTargetUrl: anuncioActivo ? anuncioActivo.url_destino : null,
            adBannerUrl: anuncioActivo ? anuncioActivo.url_banner : null,
            adText: (anuncioActivo && !anuncioActivo.url_banner) ? anuncioActivo.url_banner : null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ Error interno del oráculo centralizado:", error.message);
        return res.status(500).json({
            success: false,
            error: "Falla interna de procesamiento al interrogar la blockchain.",
            details: error.message
        });
    }
});

// =================================================================
// ⏰ ROUTER 2: Ruta autónoma del Cron-Job para congelar el pivote
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

        await supabase.from('historico_oraculo').delete().neq('id', 0);
        await supabase.from('historico_oraculo').insert([{ precio: precioFrescoWld }]);

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

if (process.env.NODE_ENV !== 'production') {
    const PUERTO = process.env.PORT || 3000;
    app.listen(PUERTO, () => {
        console.log(`🚀 Servidor local activo en puerto ${PUERTO}`);
    });
}

export default app;

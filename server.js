import express from 'express';
import cors from 'cors';
import { createPublicClient, http, getAddress } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const app = express();

app.use(cors({ origin: '*' }));

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

// 🛠️ BLINDAJE DE SEGURIDAD INTERNACIONAL (Middleware)
app.use((req, res, next) => {
    res.header("X-Frame-Options", "SAMEORIGIN"); // Evita que clonen tu app en sitios maliciosos
    res.header("X-Content-Type-Options", "nosniff"); // Protege contra inyecciones de scripts disfrazados de texto
    res.header("X-XSS-Protection", "1; mode=block"); // Activa el filtro contra ataques Cross-Site Scripting
    next();
});


app.get('/', (req, res) => {
    res.send("🤖 Backend de Organic Labs operativo en tu dominio de Vercel.");
});

app.get('/api/precio', async (req, res) => {
    // ✅ CORREGIDO: Reemplazamos worldchain.org por el nodo RPC público legítimo de World Chain como fallback de producción
    const rpcUrl = process.env.WORLD_CHAIN_RPC || "https://mainnet.worldchain.org";

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

        return res.status(200).json({
            success: true,
            symbol: "WLD",
            price: precioRealUSD,
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

if (process.env.NODE_ENV !== 'production') {
    const PUERTO = process.env.PORT || 3000;
    app.listen(PUERTO, () => {
        console.log(`🚀 Servidor local activo en puerto ${PUERTO}`);
    });
}

export default app;

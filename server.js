import express from 'express';
import { createPublicClient, http, getAddress } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const app = express();
// Definimos el puerto estándar de desarrollo (puedes usar el 3000)
const PUERTO = 3000;

const rpcUrl = process.env.WORLD_CHAIN_RPC;
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

// Middleware para permitir CORS (Cross-Origin Resource Sharing)
// Esto es obligatorio en producción para que tu HTML pueda hacer peticiones a tu servidor sin bloqueos de navegador
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Función interna que interroga al contrato de Chainlink usando tu túnel de Alchemy
const consultarPrecioRealBlockchain = async () => {
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

        // Desestructuramos para extraer exactamente el valor numérico 'answer'
        const [roundId, answer] = resultadoData;

        // 🛠️ CORRECCIÓN CLAVE: Ajustamos la escala a 18 decimales nativos del formato del nodo
        const precioRealUSD = Number(answer) / Math.pow(10, 18);
        return precioRealUSD;
    } catch (error) {
        console.error("❌ Error leyendo el bloque blockchain:", error.message);
        return null;
    }
};


// 🎯 ENDPOINT DE TU API REST: Tu HTML frontend consumirá esta ruta
app.get('/api/precio', async (req, res) => {
    const precioActual = await consultarPrecioRealBlockchain();

    if (precioActual !== null) {
        // Devolvemos una respuesta estructurada en formato JSON estándar de producción
        res.json({
            success: true,
            symbol: "WLD",
            price: precioActual,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(500).json({
            success: false,
            error: "No se pudo sincronizar el estado global del bloque con el oráculo."
        });
    }
});

// Iniciamos el servidor Express en tu máquina local
app.listen(PUERTO, () => {
    console.log("=============================================================");
    console.log(`🚀 SERVIDOR API REST DE PRODUCCIÓN ACTIVO EN EL PUERTO ${PUERTO}`);
    console.log("=============================================================");
    console.log(`🔗 Endpoint local real: http://localhost:${PUERTO}/api/precio`);
    console.log("Presiona 'Ctrl + C' para apagar el servidor backend.\n");
});

import express from 'express';
import cors from 'cors';
import { createPublicClient, http, getAddress } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const app = express();

// Activamos el control de accesos CORS global abierto
app.use(cors({ origin: '*' }));

// Dirección institucional del oráculo de Chainlink en World Chain
const CHAINLINK_WLD_FEED = getAddress('0x8Bb2943AB030E3eE05a58d9832525B4f60A97FA0');

const chainlinkFeedAbi = [
    {
        name: 'latestRoundData',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: 'roundId', type: 'uint80' },
            { name: 'answer', type: 'int256' }, // El parámetro que contiene el precio spot
            { name: 'startedAt', type: 'uint256' },
            { name: 'updatedAt', type: 'uint256' },
            { name: 'answeredInRound', type: 'uint80' }
        ]
    }
];

app.get('/', (req, res) => {
    res.send("🤖 Backend de Organic Labs operativo en tu dominio de Vercel.");
});

app.get('/api/precio', async (req, res) => {
    // Si la variable del panel de Vercel se retrasa, el nodo oficial de respaldo directo mantendrá el flujo
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

        // 🛠️ ARQUITECTURA DEFENSIVA DE SELECCIÓN (Cierre del Bug):
        // Si resultadoData es un arreglo convencional, extraemos el índice 1.
        // Si resultadoData es un objeto JSON Serverless, extraemos la propiedad .answer directamente.
        let precioCrudoBigInt;
        
        if (Array.isArray(resultadoData)) {
            precioCrudoBigInt = resultadoData[1];
        } else if (resultadoData && resultadoData.answer !== undefined) {
            precioCrudoBigInt = resultadoData.answer;
        } else {
            // Si la estructura del bloque cambia por completo, leemos el Objeto completo
            precioCrudoBigInt = resultadoData;
        }

        // Verificación estricta de tipos de datos antes de proceder al cálculo aritmético
        if (precioCrudoBigInt === undefined || precioCrudoBigInt === null) {
            throw new Error("La estructura devuelta por el oráculo Chainlink no es válida.");
        }

        // Escalamos matemáticamente los 18 decimales nativos del formato de precisión Ether/Wei
        const precioRealUSD = Number(precioCrudoBigInt) / Math.pow(10, 18);

        // Devolvemos el estado JSON limpio y autorizado con código HTTP 200 de éxito
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

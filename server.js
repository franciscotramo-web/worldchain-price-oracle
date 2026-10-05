import express from 'express';
import cors from 'cors'; // 🛠️ NUEVA LIBRERÍA: Gestión nativa de CORS para Vercel
import { createPublicClient, http, getAddress } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const app = express();

// Activamos CORS de manera global con configuración abierta de producción
app.use(cors({ origin: '*' }));

// Dirección oficial del oráculo de Chainlink en World Chain
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

// Ruta raíz de control para verificar estado del servidor en el navegador
app.get('/', (req, res) => {
    res.send("🤖 Backend de Organic Labs operativo en tu dominio de Vercel.");
});

// Endpoint técnico de consulta que llama tu archivo index.html
app.get('/api/precio', async (req, res) => {
    // Si la variable de Vercel falla, usamos el nodo público oficial de World Chain de respaldo directo
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

        const [roundId, answer] = resultadoData;

        // Escalamos los 18 decimales nativos del bloque
        const precioRealUSD = Number(answer) / Math.pow(10, 18);

        return res.status(200).json({
            success: true,
            symbol: "WLD",
            price: precioRealUSD,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ Falla en la lectura on-chain:", error.message);
        return res.status(500).json({
            success: false,
            error: "Error interno al conectar con la infraestructura on-chain.",
            details: error.message
        });
    }
});

// Soporte local para desarrollo continuo en tu PC
if (process.env.NODE_ENV !== 'production') {
    const PUERTO = process.env.PORT || 3000;
    app.listen(PUERTO, () => {
        console.log(`🚀 Servidor local corriendo en el puerto ${PUERTO}`);
    });
}

export default app;

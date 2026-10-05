import express from 'express';
import { createPublicClient, http, getAddress } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const app = express();

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

// 🛠️ CONFIGURACIÓN DE CABECERAS CORS DE PRODUCCIÓN
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Permite que tu GitHub Pages lea los datos sin bloqueos
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Ruta raíz confirmativa para evitar el 'Cannot GET /'
app.get('/', (req, res) => {
    res.send("🤖 Backend de Organic Labs operativo en Vercel.");
});

// Endpoint técnico que consumirá tu frontend
app.get('/api/precio', async (req, res) => {
    // Captura el RPC configurado en el panel de variables de Vercel
    const rpcUrl = process.env.WORLD_CHAIN_RPC;

    if (!rpcUrl) {
        return res.status(500).json({
            success: false,
            error: "Falta configurar la variable de entorno WORLD_CHAIN_RPC en el panel de Vercel."
        });
    }

    try {
        // Inicializamos el cliente Web3 ADENTRO de la petición para entornos Serverless
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

        // Ajustamos la escala matemática a los 18 decimales nativos del nodo
        const precioRealUSD = Number(answer) / Math.pow(10, 18);

        return res.status(200).json({
            success: true,
            symbol: "WLD",
            price: precioRealUSD,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Error al conectar con la infraestructura de World Chain.",
            details: error.message
        });
    }
});

// 🛠️ CAMBIO CRÍTICO DE PRODUCCIÓN PARA VERCEL SERVERLESS:
// En la nube, Vercel no necesita el método 'app.listen()'. 
// Exportamos el módulo para que la plataforma gestione los puertos de forma automática.
if (process.env.NODE_ENV !== 'production') {
    const PUERTO = process.env.PORT || 3000;
    app.listen(PUERTO, () => {
        console.log(`🚀 Servidor de desarrollo corriendo localmente en el puerto ${PUERTO}`);
    });
}

export default app;

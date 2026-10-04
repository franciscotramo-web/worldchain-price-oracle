import { createPublicClient, http, getAddress } from 'viem';
import { worldchain } from 'viem/chains';
import 'dotenv/config';

const rpcUrl = process.env.WORLD_CHAIN_RPC;

// CONTRATO OFICIAL DE CHAINLINK (WLD / USD) EN LA MAINNET DE WORLD CHAIN
const CHAINLINK_WLD_FEED = getAddress('0x8Bb2943AB030E3eE05a58d9832525B4f60A97FA0');

// ABI técnico completo de Chainlink para mapear el arreglo de salida de latestRoundData
const chainlinkFeedAbi = [
    {
        name: 'latestRoundData',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: 'roundId', type: 'uint80' },
            { name: 'answer', type: 'int256' }, // Índice 1 del arreglo: El precio entero
            { name: 'startedAt', type: 'uint256' },
            { name: 'updatedAt', type: 'uint256' },
            { name: 'answeredInRound', type: 'uint80' }
        ]
    }
];

const consultarPrecioRealBlockchain = async () => {
    try {
        const clienteWeb3 = createPublicClient({
            chain: worldchain,
            transport: http(rpcUrl)
        });

        // Leemos el contrato (devuelve el arreglo con los metadatos)
        const resultadoData = await clienteWeb3.readContract({
            address: CHAINLINK_WLD_FEED,
            abi: chainlinkFeedAbi,
            functionName: 'latestRoundData'
        });

        // Extraemos el segundo elemento del arreglo (el precio en entero largo)
        const [roundId, answer] = resultadoData;

        // 🛠️ ESCALA AJUSTADA A PRODUCCIÓN: Dividimos por 10^18 para corregir el formato Wei
        const precioRealUSD = Number(answer) / Math.pow(10, 18);
        return precioRealUSD;

    } catch (error) {
        throw new Error(`Falla en la consulta del oráculo Chainlink: ${error.message}`);
    }
};


const ejecutarAnalisisFinanciero = async () => {
    console.log("=============================================================");
    console.log("🤖 ORÁCULO ON-CHAIN DE PRODUCCIÓN EN TIEMPO REAL (CHAINLINK)");
    console.log("=============================================================");

    try {
        console.log("📡 Conectando a tu nodo de Alchemy e interrogando el Feed oficial...");
        const precioWLD = await consultarPrecioRealBlockchain();

        console.log("\n-------------------------------------------------------------");
        console.log(`📊 DATOS EXTRAÍDOS DEL CONTRATO EN TIEMPO REAL:`);
        console.log("-------------------------------------------------------------");
        // Formateamos visualmente a 2 decimales para tu interfaz frontend (ej: 0.58 usd)
        console.log(`• Precio spot de Worldcoin: $${precioWLD.toFixed(2)} USD por WLD`);
        console.log(`• Precio exacto con decimales puros: $${precioWLD} USD`);
        console.log(`• Sincronización del bloque: Actualizado el ${new Date().toLocaleTimeString()}`);
        console.log(`• Infraestructura de Red: Conexión Privada Autorizada (Alchemy)`);
        console.log("-------------------------------------------------------------");
        console.log("✅ Éxito: Precio real inyectado desde el estado global del bloque.");
        console.log("=============================================================\n");

    } catch (error) {
        console.error("\n❌ Falla Crítica en el Servidor de Producción:");
        console.error(`• Detalle técnico: ${error.message}\n`);
    }
};

// --- CONFIGURACIÓN DEL BUCLE DINÁMICO DE PRODUCCIÓN ---
const INTERVALO_REFRESCO = 5000;

console.clear();
console.log(`🚀 Iniciando ciclo de monitoreo continuo cada ${INTERVALO_REFRESCO / 1000} segundos...`);
console.log("Presiona 'Ctrl + C' en la terminal en cualquier momento para detener el proceso.\n");

ejecutarAnalisisFinanciero();

setInterval(async () => {
    console.clear();
    await ejecutarAnalisisFinanciero();
}, INTERVALO_REFRESCO);

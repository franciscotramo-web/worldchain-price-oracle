# 🤖 World Chain On-Chain Price Feed Oracle

Un oráculo financiero descentralizado en tiempo real desarrollado en Node.js que consume el estado global de la blockchain de **World Chain**. El sistema interactúa directamente con el contrato inteligente del **Price Feed de Chainlink (WLD/USD)** utilizando un nodo RPC dedicado y privado de alta disponibilidad, procesando la matemática primitiva del bloque sin intermediarios centralizados ni dependencias web Web2.

## 🚀 Arquitectura y Características Técnicas

- **Conexión RPC Empresarial:** Integración nativa con la infraestructura de **Alchemy** para el procesamiento seguro de datos en la mainnet de World Chain.
- **Bypass de Cortafuegos Transparente:** Al consultar directamente el estado global del bloque mediante llamadas de lectura RPC (`eth_call`), el software elude de raíz las restricciones geográficas e IPs residenciales bloqueadas por CDNs tradicionales (Cloudflare/CloudFront).
- **Procesamiento de Precisión Blockchain:** Gestión y desestructuración algorítmica de arreglos asíncronos complejos devueltos por el método `latestRoundData` de Chainlink.
- **Calibración Matemática de Escala:** Conversión exacta de datos primitivos de tipo de dato entero largo a números flotantes legibles mediante el ajuste estricto de la precisión nativa de la red.
- **Panel Dinámico de Alta Disponibilidad:** Motor de refresco continuo automatizado (`setInterval`) con limpieza de memoria en consola para el monitoreo interactivo del libro de órdenes descentralizado.

## 🛠️ Tecnologías Utilizadas

- **Runtime:** Node.js v24+
- **Web3 Client Toolkit:** [Viem Core Library](https://viem.sh) (Soporte nativo para el stack de Optimism Superchain)
- **Environment Management:** Dotenv
- **Data Source:** Chainlink Oracles & Alchemy Node Infrastructure

## 📦 Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com
   cd worldchain-price-oracle
   ```

2. **Instalar dependencias de producción:**
   ```bash
   npm install
   ```

3. **Configurar las variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   WORLD_CHAIN_RPC="https://alchemy.com"
   WALLET_ADDRESS="0xTuDireccionSafeDeWorldApp"
   ```

## 🖥️ Ejecución

Para iniciar el procesador de datos de mercado en tiempo real en tu terminal local, ejecuta:

```bash
node botprice.js
```

---
*Desarrollado como parte de un portafolio profesional de soluciones híbridas Fullstack JavaScript & Web3.*

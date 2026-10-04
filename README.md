# 🤖 World Chain API REST & Live Price Feed Oracle

Un ecosistema Fullstack descentralizado y de alta disponibilidad que consume el estado global de la blockchain de **World Chain**. El proyecto expone una arquitectura Cliente-Servidor robusta mediante una API REST que interroga al contrato inteligente del **Price Feed de Chainlink (WLD/USD)** a través de un nodo dedicado privado, procesando fluctuaciones numéricas milimétricas e integrando un modelo de monetización publicitaria on-chain.

## 🚀 Arquitectura del Sistema (Fullstack Design)

El proyecto está diseñado bajo un modelo desacoplado para eludir los cortafuegos y restricciones de red residenciales (como los errores HTTP 403/429 generados por CDNs comerciales):

1. **Backend (Servidor de Producción API REST):** Desarrollado en Node.js con **Express.js**, actúa como un puente de confianza (*Proxy*). Utiliza la librería **Viem Core** y un túnel HTTPS privado de **Alchemy** para conectarse directo al bloque, desestructurar el arreglo asíncrono del método `latestRoundData` de Chainlink y calibrar la precisión matemática nativa a 18 decimales.
2. **Frontend (Interfaz Gráfica de Usuario):** Una aplicación Web interactiva que realiza peticiones asíncronas (`fetch`) al endpoint local en intervalos regulares de 5 segundos, garantizando un flujo interactivo y tabular de datos numéricos crudos.
3. **Monetización Publicitaria Real:** Integración nativa de bloques publicitarios Web3 (A-Ads) mediante estructuras asíncronas (`iframe`), monetizando el tráfico de usuarios verified bajo métricas CPM/CPC sin impactar el rendimiento de la pila asíncrona.

## 🛠️ Stack Tecnológico

- **Backend:** Node.js v24+, Express.js, Viem Library, Dotenv.
- **Frontend:** HTML5 nativo, CSS3 Grid/Flexbox, JavaScript Asíncrono (Async/Await).
- **Data & Infraestructura:** Chainlink Smart Contracts, Alchemy Node Gateway.
- **Monetización:** A-Ads Network API.

## 📦 Despliegue y Ejecución Local

1. **Configurar Variables de Entorno (`.env`):**
   ```env
   WORLD_CHAIN_RPC="https://alchemy.com"
   WALLET_ADDRESS="0xTuDireccionSafeDeWorldApp"
   ```

2. **Iniciar el Servidor API REST:**
   ```bash
   node server.js
   ```

3. **Lanzar la Interfaz Frontend:**
   Abre el archivo `index.html` directamente en tu navegador web para visualizar el panel de monitoreo dinámico a 6 decimales de precisión en tiempo real.

---
*Desarrollado como un caso de estudio real de optimización de infraestructura de redes, consumo de contratos inteligentes y monetización publicitaria Web3.*


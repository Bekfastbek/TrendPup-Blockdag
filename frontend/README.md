
# Trendpup: AI-Powered Memecoin Intelligence & BlockDAG Subscription System

Trendpup is an advanced AI agent that finds trending memecoins by combining real-time social media analysis, on-chain data, and conversational intelligence. It is built for next-gen EVM-compatible chains and leverages BlockDAG smart contracts for access control and subscriptions.

## How Trendpup Works

- **AI Agent for Memecoin Discovery:**
  - Continuously scrapes Twitter/X and other social platforms for early mentions of new tokens.
  - Uses advanced filtering (engagement, credibility, semantic analysis) to surface authentic, high-potential meme tokens.
  - Aggregates on-chain data (DEX listings, liquidity, price action) and social sentiment.
  - AI models analyze risk, investment potential, and provide rationale for each token.
  - Users interact with the agent via chat to get real-time insights and ask questions about tokens.

- **BlockDAG Smart Contract Integration:**
  - Trendpup uses the BlockDAG Primordial Testnet for its subscription system.
  - Access to the dashboard and AI agent is gated by a BlockDAG smart contract (`SimpleAccessFee`).
  - Users pay a small fee (1 ETH on testnet) to unlock full access; the contract tracks paid users.
  - The frontend uses RainbowKit and wagmi to connect wallets and interact with the contract.

- **Solana Memecoin Showcase:**
  - As BlockDAG does not yet have memecoins, Trendpup currently showcases its capabilities using Solana memecoins.
  - All analytics, chat, and explorer features use Solana data as a sample.
  - Once BlockDAG memecoins launch, Trendpup will shift to native BlockDAG token support.

## Hackathon Context: BlockDAG Primordial Testnet

Trendpup is submitted to the BlockDAG Primordial Testnet hackathon in the "AI × Smart Contracts" and "DeFi, Reinvented" categories.

- **Why BlockDAG?**
  - BlockDAG is a modular, EVM-compatible chain designed for high performance and composability.
  - Trendpup leverages BlockDAG for programmable access control, subscription payments, and future memecoin analytics.
  - The subscription system is fully on-chain, demonstrating real-world utility for dApps and AI agents.

- **Future Vision:**
  - As BlockDAG's ecosystem grows, Trendpup will support native memecoin discovery, analytics, and trading.
  - The AI agent and dashboard are chain-agnostic and ready for rapid migration.

## Features

- Real-time chat with AI agent for memecoin insights
- Memecoin explorer and analytics (currently Solana, future BlockDAG)
- BlockDAG smart contract subscription system
- Modern wallet integration (RainbowKit, wagmi)
- Responsive, multi-window dashboard UI

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Build the application:

```bash
pnpm run build
```

3. Start the production server:

```bash
pnpm start
```

Or run in development mode:

```bash
pnpm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Build the application:

```bash
npm run build
```

3. Start the production server:

```bash
npm start
```

Or run in development mode:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Wallet Integration

The frontend uses RainbowKit for wallet connectivity, supporting:
- MetaMask
- WalletConnect
- And other popular Ethereum wallets

Make sure your wallet is configured for the Avalanche Fuji testnet.

## Configuration

- `next.config.cjs`: Next.js configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `postcss.config.js`: PostCSS configuration
- `src/wagmi.ts`: Wagmi and RainbowKit configuration for Avalanche Fuji

## Running the Server

Trendpup uses Next.js with nginx for HTTPS and WebSocket proxying:

1. **Start the Next.js server:**
   ```bash
   # Build and start the server
   pnpm run build
   pnpm start
   ```
   This will start Next.js on port 3000.

2. **Access the app:**
   The application is available at https://trendpup.duckdns.org

## Nginx Configuration

The application runs behind nginx which:
- Handles HTTPS/SSL encryption
- Proxies HTTP requests to the Next.js server on port 3000
- Proxies WebSocket connections at `/ws` to the backend WebSocket server on port 8080

```nginx
# Main configuration at /etc/nginx/sites-enabled/trendpup.conf
server {
    listen 443 ssl;
    server_name trendpup.duckdns.org;

    # Frontend proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```
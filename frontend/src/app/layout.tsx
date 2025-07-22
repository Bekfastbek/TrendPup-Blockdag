'use client';

import 'cross-fetch/polyfill';

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { useState } from 'react';

const inter = Inter({ subsets: ["latin"] });

// Moved metadata to a separate file since this is now a client component
// export const metadata: Metadata = {
//   title: "trendpup - Advanced Memecoin Intelligence",
//   description: "Discover emerging meme tokens on Solana before significant price movements",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());

  // BlockDAG Testnet chain config
  const blockdagTestnet = {
    id: 1043,
    name: 'BlockDAG Testnet',
    network: 'blockdag-testnet',
    nativeCurrency: {
      name: 'BlockDAG',
      symbol: 'BDAG',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: ['https://rpc.primordial.bdagscan.com'] },
      public: { http: ['https://rpc.primordial.bdagscan.com'] },
    },
    blockExplorers: {
      default: { name: 'BlockDAG Explorer', url: 'https://primordial.bdagscan.com' },
    },
    testnet: true,
  };

  const { connectors } = getDefaultWallets({
    appName: 'Trendpup',
    projectId: '56a8c019e538c3ca51e5128efbb033c9',
  });

  const config = createConfig({
    chains: [blockdagTestnet],
    transports: {
      [blockdagTestnet.id]: http(),
    },
    connectors,
  });

  return (
    <html lang="en">
      <body className={inter.className}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider modalSize="compact">
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}

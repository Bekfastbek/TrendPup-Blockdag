'use client';

import 'cross-fetch/polyfill';

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@solana/wallet-adapter-react-ui/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { endpoint, wallets } from '../solana';
import { useState } from 'react';

const inter = Inter({ subsets: ["latin"] });

// Moved metadata to a separate file since this is now a client component
// export const metadata: Metadata = {
//   title: "Sniffle - Advanced Memecoin Intelligence",
//   description: "Discover emerging meme tokens on Solana before significant price movements",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <body className={inter.className}>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <QueryClientProvider client={queryClient}>
                {children}
              </QueryClientProvider>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { useMemo } from 'react';

// Use Solana devnet for development
export const network = WalletAdapterNetwork.Devnet;

// You can also provide a custom RPC endpoint
export const endpoint = useMemo(() => clusterApiUrl(network), [network]);

// Configure supported wallets
export const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new CoinbaseWalletAdapter(),
];

export const SOLANA_RPC_ENDPOINT = endpoint;

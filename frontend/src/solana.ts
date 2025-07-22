import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Use Solana devnet for development
export const network = WalletAdapterNetwork.Devnet;

// You can also provide a custom RPC endpoint
export const endpoint = clusterApiUrl(network);

// Configure supported wallets - start with empty array, wallets will be loaded dynamically
export const wallets = [];

export const SOLANA_RPC_ENDPOINT = endpoint;

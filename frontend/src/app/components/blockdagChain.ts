import { Chain } from '@rainbow-me/rainbowkit';

export const blockdagTestnet: Chain = {
  id: 1043,
  name: 'BlockDAG Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BlockDAG',
    symbol: 'BDAG',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.primordial.bdagscan.com'],
    },
    public: {
      http: ['https://rpc.primordial.bdagscan.com'],
    },
  },
  blockExplorers: {
    default: { name: 'BlockDAG Explorer', url: 'https://primordial.bdagscan.com' },
  },
  testnet: true,
};

import { createConfig, http } from 'wagmi';
import { blockdagTestnet } from './blockdagChain';

export const chains = [blockdagTestnet] as const;
export const publicClient = http('https://rpc.primordial.bdagscan.com');

export const wagmiConfig = createConfig({
  chains,
  transports: {
    [blockdagTestnet.id]: publicClient
  }
});

'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { FaWallet } from 'react-icons/fa';

export default function SolanaWalletButton() {
  const { connected, publicKey } = useWallet();

  return (
    <div className="flex items-center gap-2">
      <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !px-4 !py-2 !text-white !font-medium !transition-colors" />
    </div>
  );
}

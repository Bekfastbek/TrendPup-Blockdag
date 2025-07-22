import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccount, useContractRead, useContractWrite, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';


// Contract details for SimpleAccessFee
const CONTRACT_ADDRESS = '0xF93132d75c20EfeD556EC2Bc5aC777750665D3a9';
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "hasPaid",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pay",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];
const SUBSCRIPTION_COST_ETH = '1'; // 1 ETH

const AccessControlContext = createContext({
  hasSubscription: false,
  loading: true,
  buySubscription: async () => {},
});

export function useAccessControl() {
  return useContext(AccessControlContext);
}

export const AccessControlProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected } = useAccount();
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);


  // Check subscription status using hasPaid(address)
  const { data: hasPaidRaw, refetch } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'hasPaid',
    args: address ? [address] : undefined,
  });

  useEffect(() => {
    if (!address) {
      setHasSubscription(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setHasSubscription(Boolean(hasPaidRaw));
    setLoading(false);
  }, [address, hasPaidRaw]);


  // Buy subscription (calls pay() payable)
  const { writeContract, data: txData, isPending } = useContractWrite();

  const { isSuccess } = useWaitForTransactionReceipt({
    hash: txData,
  });

  useEffect(() => {
    if (isSuccess) {
      refetch();
    }
  }, [isSuccess, refetch]);

  const buySubscription = async () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'pay',
      value: parseEther(SUBSCRIPTION_COST_ETH),
      args: [],
    });
  };

  return (
    <AccessControlContext.Provider value={{ hasSubscription, loading, buySubscription }}>
      {children}
    </AccessControlContext.Provider>
  );
};

// UI wrapper for gating access
export const AccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasSubscription, loading, buySubscription } = useAccessControl();
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Connect your wallet to continue</h2>
        <ConnectButton />
      </div>
    );
  }
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Checking subscription...</div>;
  }
  if (!hasSubscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <img src="/trendpup-logo.png" alt="Trendpup Logo" width={120} height={120} className="mb-6 rounded-full shadow-lg" />
        <h2 className="text-2xl font-bold mb-4">Subscription Required</h2>
        <p className="mb-4">You need a Trendpup subscription to access the dashboard.</p>
        <button
          className="px-6 py-3 bg-solana-gradient text-white rounded-lg font-semibold"
          onClick={buySubscription}
        >
          Buy Subscription (1 BDAG)
        </button>
      </div>
    );
  }
  return <>{children}</>;
};

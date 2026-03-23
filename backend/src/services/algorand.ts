import { v4 as uuidv4 } from 'uuid';

/**
 * Mock Algorand SDK wrapper.
 * In production, replace with actual algosdk calls.
 */

export function generateTxHash(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  for (let i = 0; i < 52; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateASATransfer(params: {
  from: string;
  to: string;
  asaId: number;
  amount: number;
}): {
  txHash: string;
  blockNumber: number;
  confirmedAt: string;
  fee: number;
  asaId: number;
} {
  return {
    txHash: generateTxHash(),
    blockNumber: Math.floor(Math.random() * 1000000) + 40000000,
    confirmedAt: new Date().toISOString(),
    fee: 0, // Subsidized via SHG treasury
    asaId: params.asaId,
  };
}

export function generateMultiSigTx(params: {
  signers: string[];
  threshold: number;
  amount: number;
}): {
  txHash: string;
  multiSigAddress: string;
  threshold: number;
  signers: string[];
} {
  return {
    txHash: generateTxHash(),
    multiSigAddress: 'SHGMULTI' + uuidv4().replace(/-/g, '').slice(0, 28).toUpperCase(),
    threshold: params.threshold,
    signers: params.signers,
  };
}

export function generateSBTMint(memberId: string): {
  asaId: number;
  txHash: string;
  did: string;
  mintedAt: string;
} {
  return {
    asaId: Math.floor(Math.random() * 900000000) + 100000000,
    txHash: generateTxHash(),
    did: `shg.chain/m/${Math.random().toString(36).slice(2, 6)}...${Math.random().toString(36).slice(2, 4)}`,
    mintedAt: new Date().toISOString(),
  };
}

export function verifyTransaction(txHash: string): {
  valid: boolean;
  block: number;
  confirmedAt: string;
  type: string;
  amount: number;
  explorer: string;
} {
  // Mock verification — always returns valid for demo
  return {
    valid: true,
    block: Math.floor(Math.random() * 1000000) + 40000000,
    confirmedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    type: 'ApplicationCall',
    amount: Math.floor(Math.random() * 50000) + 500,
    explorer: `https://testnet.algoexplorer.io/tx/${txHash}`,
  };
}

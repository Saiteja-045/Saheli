import { v4 as uuidv4 } from 'uuid';
import Transaction from '../models/Transaction';

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

type TxStatus = 'pending' | 'confirmed' | 'failed';

type LifecycleRecord = {
  txHash: string;
  status: TxStatus;
  type: string;
  amount: number;
  createdAt: string;
  confirmedAt?: string;
  block?: number;
};

const txLifecycleStore = new Map<string, LifecycleRecord>();

export function registerTransactionLifecycle(params: {
  txHash: string;
  type?: string;
  amount?: number;
  initialStatus?: TxStatus;
  autoConfirm?: boolean;
  autoConfirmDelayMs?: number;
}): LifecycleRecord {
  const existing = txLifecycleStore.get(params.txHash);
  if (existing) {
    return existing;
  }

  const record: LifecycleRecord = {
    txHash: params.txHash,
    status: params.initialStatus || 'pending',
    type: params.type || 'ApplicationCall',
    amount: params.amount || 0,
    createdAt: new Date().toISOString(),
  };

  txLifecycleStore.set(params.txHash, record);

  const shouldAutoConfirm = params.autoConfirm ?? true;
  if (shouldAutoConfirm && record.status === 'pending') {
    const delayMs = params.autoConfirmDelayMs ?? (2000 + Math.floor(Math.random() * 3000));
    setTimeout(() => {
      const current = txLifecycleStore.get(params.txHash);
      if (!current || current.status !== 'pending') return;
      current.status = 'confirmed';
      current.confirmedAt = new Date().toISOString();
      current.block = Math.floor(Math.random() * 1000000) + 40000000;
      txLifecycleStore.set(params.txHash, current);
    }, delayMs);
  }

  return record;
}

export function setTransactionLifecycleStatus(txHash: string, status: TxStatus): void {
  const existing = txLifecycleStore.get(txHash);
  if (!existing) {
    txLifecycleStore.set(txHash, {
      txHash,
      status,
      type: 'ApplicationCall',
      amount: 0,
      createdAt: new Date().toISOString(),
      confirmedAt: status === 'confirmed' ? new Date().toISOString() : undefined,
      block: status === 'confirmed' ? Math.floor(Math.random() * 1000000) + 40000000 : undefined,
    });
    return;
  }

  existing.status = status;
  if (status === 'confirmed') {
    existing.confirmedAt = existing.confirmedAt || new Date().toISOString();
    existing.block = existing.block || Math.floor(Math.random() * 1000000) + 40000000;
  }
  txLifecycleStore.set(txHash, existing);
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

export async function verifyTransaction(txHash: string): Promise<{
  valid: boolean;
  status: TxStatus | 'not_found';
  block?: number;
  confirmedAt?: string;
  type?: string;
  amount?: number;
  explorer: string;
}> {
  const dbTx = await Transaction.findOne({ txHash }).lean();
  if (dbTx) {
    const normalizedStatus: TxStatus = (dbTx.status as TxStatus) || 'pending';
    return {
      valid: normalizedStatus !== 'failed',
      status: normalizedStatus,
      block: normalizedStatus === 'confirmed' ? Math.floor(Math.random() * 1000000) + 40000000 : undefined,
      confirmedAt: normalizedStatus === 'confirmed' ? new Date().toISOString() : undefined,
      type: dbTx.type,
      amount: dbTx.amount,
      explorer: `https://testnet.algoexplorer.io/tx/${txHash}`,
    };
  }

  const lifecycleTx = txLifecycleStore.get(txHash);
  if (lifecycleTx) {
    return {
      valid: lifecycleTx.status !== 'failed',
      status: lifecycleTx.status,
      block: lifecycleTx.block,
      confirmedAt: lifecycleTx.confirmedAt,
      type: lifecycleTx.type,
      amount: lifecycleTx.amount,
      explorer: `https://testnet.algoexplorer.io/tx/${txHash}`,
    };
  }

  return {
    valid: false,
    status: 'not_found',
    explorer: `https://testnet.algoexplorer.io/tx/${txHash}`,
  };
}

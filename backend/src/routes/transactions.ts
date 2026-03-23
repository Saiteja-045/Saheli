import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ledgerStream, members } from '../data/mockData';
import { generateTxHash } from '../services/algorand';

const router = Router();

// In-memory ledger for demo mutations
const mutableLedger = [...ledgerStream];

// GET /api/transactions
router.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: mutableLedger.slice(0, 10) });
});

// POST /api/transactions (create deposit)
router.post('/', (req: Request, res: Response) => {
  const { memberId, type, amount, description } = req.body;

  if (!memberId || !type || !amount) {
    res.status(400).json({ success: false, error: 'memberId, type, amount required' });
    return;
  }

  const member = members.find(m => m.id === memberId);
  if (!member) {
    res.status(404).json({ success: false, error: 'Member not found' });
    return;
  }

  const txHash = generateTxHash();
  const newTx = {
    id: uuidv4(),
    type,
    amount,
    description: description || `${type} via WhatsApp`,
    timestamp: new Date().toISOString(),
    txHash,
    status: 'confirmed' as const,
    agentProcessed: true,
  };

  // Update in-memory member balance
  if (type === 'deposit') {
    member.totalSavings += amount;
  }

  member.transactions.unshift(newTx);

  // Also add to ledger stream
  mutableLedger.unshift({
    id: uuidv4(),
    event: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'}: ${member.name}`,
    txId: txHash.slice(0, 12) + '...',
    amount: type === 'deposit' ? amount : -amount,
    type: type === 'deposit' ? 'credit' : 'debit',
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    data: {
      transaction: newTx,
      txHash,
      explorerUrl: `https://testnet.algoexplorer.io/tx/${txHash}`,
      message: `✅ Transaction confirmed on Algorand blockchain`,
    },
  });
});

// GET /api/transactions/ledger (raw ledger stream)
router.get('/ledger', (_req: Request, res: Response) => {
  res.json({ success: true, data: mutableLedger });
});

export default router;

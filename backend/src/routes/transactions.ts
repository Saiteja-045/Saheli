import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import {
  generateTxHash,
  registerTransactionLifecycle,
  setTransactionLifecycleStatus,
} from '../services/txEngine';
import Transaction from '../models/Transaction';
import User from '../models/User';
import { recalculateIdleFunds } from '../services/agentEngine';

const router = Router();

function mapTxForLedger(tx: any) {
  const isCredit = ['deposit', 'yield', 'loan_repayment'].includes(tx.type);
  return {
    id: String(tx._id),
    event: `${tx.type}: ${tx.user?.name || 'Member'}`,
    txId: tx.transactionId ? `${tx.transactionId.slice(0, 12)}...` : `TX-${String(tx._id).slice(-6)}`,
    amount: isCredit ? tx.amount : -Math.abs(tx.amount),
    type: isCredit ? 'credit' : 'debit',
    timestamp: tx.createdAt,
  };
}

// GET /api/transactions
router.get('/', async (_req: Request, res: Response) => {
  const txs = await Transaction.find({ status: { $ne: 'failed' } })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  const mapped = txs.map(mapTxForLedger);

  res.json({ success: true, data: mapped });
});

// POST /api/transactions (create deposit/withdrawal/yield)
router.post('/', async (req: Request, res: Response) => {
  const { memberId, type, amount, description } = req.body;

  if (!memberId || !type || !amount) {
    res.status(400).json({ success: false, error: 'memberId, type, amount required' });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    res.status(400).json({ success: false, error: 'memberId must be a valid Mongo ObjectId' });
    return;
  }

  const user = await User.findById(memberId);
  if (!user || user.role !== 'member') {
    res.status(404).json({ success: false, error: 'Member not found' });
    return;
  }

  const transactionId = generateTxHash(); // Keeping generateTxHash for ID generation

  registerTransactionLifecycle({
    transactionId,
    type,
    amount,
    initialStatus: 'pending',
    autoConfirm: true,
  });

  const newTx = {
    id: uuidv4(),
    type,
    amount,
    description: description || `${type} via WhatsApp`,
    timestamp: new Date().toISOString(),
    transactionId,
    status: 'pending' as const,
    agentProcessed: true,
  };
  await Transaction.create({
    user: user._id,
    type,
    amount,
    description: description || `${type} via WhatsApp`,
    transactionId,
    status: 'pending',
    agentProcessed: true,
  });

  setTimeout(async () => {
    await Transaction.updateOne({ transactionId }, { $set: { status: 'confirmed' } });
    setTransactionLifecycleStatus(transactionId, 'confirmed');
  }, 2500 + Math.floor(Math.random() * 2500));

  if (type === 'deposit') user.totalSavings += amount;
  if (type === 'withdrawal') user.totalSavings = Math.max(0, user.totalSavings - amount);
  if (type === 'yield') user.yieldEarned = (user.yieldEarned || 0) + amount;
  await user.save();

  await recalculateIdleFunds();

  res.status(201).json({
    success: true,
    data: {
      transaction: {
        ...newTx,
        memberName: user.name,
      },
      transactionId,
      message: '⏳ Transaction submitted. Confirmation pending.',
    },
  });
});

// GET /api/transactions/ledger (raw ledger stream)
router.get('/ledger', async (_req: Request, res: Response) => {
  const ledger = await Transaction.find({ status: { $ne: 'failed' } })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ success: true, data: ledger.map(mapTxForLedger) });
});

export default router;

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { ledgerStream, members } from '../data/mockData';
import {
  generateTxHash,
  registerTransactionLifecycle,
  setTransactionLifecycleStatus,
} from '../services/algorand';
import Transaction from '../models/Transaction';
import User from '../models/User';
import { recalculateIdleFunds } from '../services/agentEngine';

const router = Router();

// In-memory ledger for demo mutations
const mutableLedger = [...ledgerStream];

// GET /api/transactions
router.get('/', async (_req: Request, res: Response) => {
  const txs = await Transaction.find({ status: { $ne: 'failed' } })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  if (!txs.length) {
    res.json({ success: true, data: mutableLedger.slice(0, 10) });
    return;
  }

  const mapped = txs.map((tx: any) => ({
    id: String(tx._id),
    event: `${tx.type}: ${tx.user?.name || 'Member'}`,
    txId: tx.txHash ? `${tx.txHash.slice(0, 12)}...` : `TX-${String(tx._id).slice(-6)}`,
    amount: tx.amount,
    type: ['deposit', 'yield', 'loan_repayment'].includes(tx.type) ? 'credit' : 'debit',
    timestamp: tx.createdAt,
  }));

  res.json({ success: true, data: mapped });
});

// POST /api/transactions (create deposit/withdrawal/yield)
router.post('/', async (req: Request, res: Response) => {
  const { memberId, type, amount, description } = req.body;

  if (!memberId || !type || !amount) {
    res.status(400).json({ success: false, error: 'memberId, type, amount required' });
    return;
  }

  const isDbMember = mongoose.Types.ObjectId.isValid(memberId);
  const txHash = generateTxHash();

  registerTransactionLifecycle({
    txHash,
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
    txHash,
    status: 'pending' as const,
    agentProcessed: true,
  };

  if (isDbMember) {
    const user = await User.findById(memberId);
    if (!user) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }

    await Transaction.create({
      user: user._id,
      type,
      amount,
      description: description || `${type} via WhatsApp`,
      txHash,
      status: 'pending',
      agentProcessed: true,
    });

    setTimeout(async () => {
      await Transaction.updateOne({ txHash }, { $set: { status: 'confirmed' } });
      setTransactionLifecycleStatus(txHash, 'confirmed');
    }, 2500 + Math.floor(Math.random() * 2500));

    if (type === 'deposit') user.totalSavings += amount;
    if (type === 'withdrawal') user.totalSavings = Math.max(0, user.totalSavings - amount);
    if (type === 'yield') user.yieldEarned = (user.yieldEarned || 0) + amount;
    await user.save();

    await recalculateIdleFunds();

    mutableLedger.unshift({
      id: uuidv4(),
      event: `${type === 'deposit' ? 'Deposit' : type === 'withdrawal' ? 'Withdrawal' : 'Transaction'}: ${user.name}`,
      txId: txHash.slice(0, 12) + '...',
      amount: ['deposit', 'yield', 'loan_repayment'].includes(type) ? amount : -Math.abs(amount),
      type: ['deposit', 'yield', 'loan_repayment'].includes(type) ? 'credit' : 'debit',
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        transaction: {
          ...newTx,
          memberName: user.name,
        },
        txHash,
        explorerUrl: `https://testnet.algoexplorer.io/tx/${txHash}`,
        message: '⏳ Transaction submitted to Algorand. Confirmation pending.',
      },
    });
    return;
  }

  const member = members.find(m => m.id === memberId);
  if (!member) {
    res.status(404).json({ success: false, error: 'Member not found' });
    return;
  }

  if (type === 'deposit') {
    member.totalSavings += amount;
  }

  member.transactions.unshift(newTx);

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
      message: '⏳ Transaction submitted to Algorand. Confirmation pending.',
    },
  });
});

// GET /api/transactions/ledger (raw ledger stream)
router.get('/ledger', (_req: Request, res: Response) => {
  res.json({ success: true, data: mutableLedger });
});

export default router;

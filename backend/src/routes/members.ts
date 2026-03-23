import { Router, Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { members as mockMembers } from '../data/mockData';

const router = Router();

// GET /api/members — Public (Leaders & Banks see all)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const members = await User.find({ role: 'member' }).select('-password');
    // Fall back to mock data for hackathon demo if DB is empty
    if (members.length === 0) {
      const safe = mockMembers.map(({ transactions: _t, ...m }) => m);
      return res.json({ success: true, data: safe });
    }
    res.json({ success: true, data: members });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/members/:id — Public (any valid ID, including legacy 'm1')
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Handle legacy mock IDs like 'm1', 'm2', 'm3'
    const isLegacyId = /^m\d+$/.test(req.params.id);
    if (isLegacyId) {
      const member = mockMembers.find(m => m.id === req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, error: 'Member not found' });
      }
      return res.json({ success: true, data: member });
    }

    const member = await User.findById(req.params.id).select('-password');
    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    res.json({ success: true, data: member });
  } catch (error: any) {
    // CastError = invalid ObjectId, fall back to mock
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/members/:id/transactions — Public
router.get('/:id/transactions', async (req: Request, res: Response) => {
  try {
    // Handle legacy mock IDs
    const isLegacyId = /^m\d+$/.test(req.params.id);
    if (isLegacyId) {
      const member = mockMembers.find(m => m.id === req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, error: 'Member not found' });
      }
      return res.json({ success: true, data: member.transactions });
    }

    const transactions = await Transaction.find({ user: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: transactions });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


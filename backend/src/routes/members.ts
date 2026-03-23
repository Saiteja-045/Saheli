import { Router, Request, Response } from 'express';
import { members } from '../data/mockData';

const router = Router();

// GET /api/members
router.get('/', (_req: Request, res: Response) => {
  const safe = members.map(({ transactions: _t, ...m }) => m);
  res.json({ success: true, data: safe });
});

// GET /api/members/:id
router.get('/:id', (req: Request, res: Response) => {
  const member = members.find(m => m.id === req.params.id);
  if (!member) {
    res.status(404).json({ success: false, error: 'Member not found' });
    return;
  }
  res.json({ success: true, data: member });
});

// GET /api/members/:id/transactions
router.get('/:id/transactions', (req: Request, res: Response) => {
  const member = members.find(m => m.id === req.params.id);
  if (!member) {
    res.status(404).json({ success: false, error: 'Member not found' });
    return;
  }
  res.json({ success: true, data: member.transactions });
});

export default router;

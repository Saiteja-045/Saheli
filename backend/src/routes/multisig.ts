import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { multiSigActions, MultiSigAction } from '../data/mockData';
import { generateTxHash } from '../services/algorand';

const router = Router();

const mutableActions: MultiSigAction[] = [...multiSigActions];

// GET /api/multisig/pending
router.get('/pending', (_req: Request, res: Response) => {
  const pending = mutableActions.filter(a => a.status === 'pending');
  res.json({ success: true, data: pending });
});

// GET /api/multisig
router.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: mutableActions });
});

// POST /api/multisig/:id/sign
router.post('/:id/sign', (req: Request, res: Response) => {
  const action = mutableActions.find(a => a.id === req.params.id);
  if (!action) {
    res.status(404).json({ success: false, error: 'Action not found' });
    return;
  }

  if (action.status !== 'pending') {
    res.status(400).json({ success: false, error: `Action is already ${action.status}` });
    return;
  }

  const signerId = req.body.signerId || `leader_${uuidv4().slice(0, 4)}`;
  if (!action.signatures.includes(signerId)) {
    action.signatures.push(signerId);
  }

  let message = `✍️ Signature ${action.signatures.length}/${action.signaturesRequired} recorded.`;

  if (action.signatures.length >= action.signaturesRequired) {
    action.status = 'executed';
    action.txHash = generateTxHash();
    message = `✅ Threshold reached! Action executed on Algorand. TX: ${action.txHash?.slice(0, 12)}...`;
  }

  res.json({
    success: true,
    data: { action, message },
  });
});

// POST /api/multisig/:id/reject
router.post('/:id/reject', (req: Request, res: Response) => {
  const action = mutableActions.find(a => a.id === req.params.id);
  if (!action) {
    res.status(404).json({ success: false, error: 'Action not found' });
    return;
  }

  action.status = 'rejected';
  res.json({
    success: true,
    data: { action, message: '❌ Action rejected by leader.' },
  });
});

// POST /api/multisig (create new action)
router.post('/', (req: Request, res: Response) => {
  const { type, description, amount, requestedBy } = req.body;

  const newAction: MultiSigAction = {
    id: uuidv4(),
    type: type || 'loan_approval',
    description: description || 'New multi-sig action',
    amount: amount || 0,
    requestedBy: requestedBy || 'AI Agent',
    signatures: [],
    signaturesRequired: 3,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  mutableActions.unshift(newAction);
  res.status(201).json({ success: true, data: newAction });
});

export default router;

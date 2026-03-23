import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { multiSigActions, MultiSigAction as MockAction } from '../data/mockData';
import { generateTxHash } from '../services/algorand';
import MultiSigActionModel from '../models/MultiSigAction';
import { registerTransactionLifecycle } from '../services/algorand';
import LoanModel from '../models/Loan';
import { queueBankDisbursement } from '../services/bankDisbursementService';

const router = Router();

async function ensureSeeded() {
  const count = await MultiSigActionModel.countDocuments();
  if (count > 0) return;
  await MultiSigActionModel.insertMany(multiSigActions);
}

function mapDocToAction(doc: any): MockAction {
  return {
    id: doc.id,
    type: doc.type,
    description: doc.description,
    amount: doc.amount,
    requestedBy: doc.requestedBy,
    signatures: doc.signatures || [],
    signaturesRequired: doc.signaturesRequired,
    status: doc.status,
    createdAt: doc.createdAt,
    txHash: doc.txHash,
  };
}

// GET /api/multisig/pending
router.get('/pending', async (_req: Request, res: Response) => {
  await ensureSeeded();
  const pending = await MultiSigActionModel.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: pending });
});

// GET /api/multisig
router.get('/', async (_req: Request, res: Response) => {
  await ensureSeeded();
  const actions = await MultiSigActionModel.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: actions.map(mapDocToAction) });
});

// POST /api/multisig/:id/sign
router.post('/:id/sign', async (req: Request, res: Response) => {
  await ensureSeeded();
  const action = await MultiSigActionModel.findOne({ id: req.params.id });
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
    registerTransactionLifecycle({
      txHash: action.txHash,
      type: action.type,
      amount: action.amount,
      initialStatus: 'pending',
      autoConfirm: true,
    });
    message = `✅ Threshold reached! Action executed on Algorand. TX: ${action.txHash?.slice(0, 12)}...`;

    if (action.type === 'loan_approval' && action.linkedLoanId) {
      const loan = await LoanModel.findById(action.linkedLoanId);
      if (loan) {
        loan.approvals = action.signatures.length;
        loan.approvalsRequired = action.signaturesRequired;
        loan.status = 'approved';
        await loan.save();

        await queueBankDisbursement({
          loanId: String(loan._id),
          userId: String(loan.user),
          amount: loan.amount,
          notes: 'Leader approvals completed via multi-sig; sent to bank for payout',
          autoProcess: true,
        });

        message = '✅ Leader threshold reached. Loan forwarded to bank for payout processing.';
      }
    }
  }

  await action.save();

  res.json({
    success: true,
    data: { action: mapDocToAction(action), message },
  });
});

// POST /api/multisig/:id/reject
router.post('/:id/reject', async (req: Request, res: Response) => {
  await ensureSeeded();
  const action = await MultiSigActionModel.findOne({ id: req.params.id });
  if (!action) {
    res.status(404).json({ success: false, error: 'Action not found' });
    return;
  }

  action.status = 'rejected';
  await action.save();
  res.json({
    success: true,
    data: { action: mapDocToAction(action), message: '❌ Action rejected by leader.' },
  });
});

// POST /api/multisig (create new action)
router.post('/', async (req: Request, res: Response) => {
  const { type, description, amount, requestedBy } = req.body;

  const newAction: MockAction = {
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

  const created = await MultiSigActionModel.create(newAction);
  res.status(201).json({ success: true, data: mapDocToAction(created) });
});

export default router;

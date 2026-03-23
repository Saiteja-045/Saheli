import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { loans, members, Loan } from '../data/mockData';
import { generateTxHash } from '../services/algorand';

const router = Router();

// In-memory loan store for mutations
const mutableLoans: Loan[] = [...loans];

function evaluateLoan(trustScore: number, amount: number, purpose: string): {
  recommendation: 'approve' | 'review' | 'reject';
  reason: string;
  fastTrack: boolean;
} {
  const isEmergency = /medical|hospital|emergency|health/i.test(purpose);
  const isMicroLoan = amount <= 5000;

  if (trustScore >= 800 && isMicroLoan) {
    return {
      recommendation: 'approve',
      reason: `Trust score ${trustScore}/1000. Micro-loan qualifies for fast-track leader approval.`,
      fastTrack: true,
    };
  }
  if (trustScore >= 750 && isEmergency) {
    return {
      recommendation: 'approve',
      reason: `Emergency medical loan. Trust score ${trustScore}/1000 clears emergency threshold. Routing for expedited 1/3 multi-sig approval.`,
      fastTrack: true,
    };
  }
  if (trustScore >= 700) {
    return {
      recommendation: 'approve',
      reason: `Trust score ${trustScore}/1000 meets approval threshold. Routing for standard multi-sig approval.`,
      fastTrack: false,
    };
  }
  if (trustScore >= 600) {
    return {
      recommendation: 'review',
      reason: `Trust score ${trustScore}/1000 is below confidence threshold. Manual review by SHG leader recommended.`,
      fastTrack: false,
    };
  }
  return {
    recommendation: 'reject',
    reason: `Trust score ${trustScore}/1000 is insufficient for this loan amount. Member should improve repayment consistency first.`,
    fastTrack: false,
  };
}

// GET /api/loans
router.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: mutableLoans });
});

// GET /api/loans/:id
router.get('/:id', (req: Request, res: Response) => {
  const loan = mutableLoans.find(l => l.id === req.params.id);
  if (!loan) {
    res.status(404).json({ success: false, error: 'Loan not found' });
    return;
  }
  res.json({ success: true, data: loan });
});

// POST /api/loans/request
router.post('/request', (req: Request, res: Response) => {
  const { memberId, amount, purpose } = req.body;

  if (!memberId || !amount || !purpose) {
    res.status(400).json({ success: false, error: 'memberId, amount, purpose required' });
    return;
  }

  const member = members.find(m => m.id === memberId);
  if (!member) {
    res.status(404).json({ success: false, error: 'Member not found' });
    return;
  }

  const evaluation = evaluateLoan(member.trustScore, amount, purpose);

  const newLoan: Loan = {
    id: uuidv4(),
    memberId,
    memberName: member.name,
    amount,
    purpose,
    status: 'pending',
    trustScoreAtApplication: member.trustScore,
    aiRecommendation: evaluation.recommendation,
    aiReason: evaluation.reason,
    approvals: 0,
    approvalsRequired: evaluation.fastTrack ? 1 : 3,
    repaidAmount: 0,
    createdAt: new Date().toISOString(),
  };

  mutableLoans.unshift(newLoan);

  res.status(201).json({
    success: true,
    data: {
      loan: newLoan,
      evaluation,
      message: `📋 Loan request submitted. Leader approval is required before funds are disbursed and QR proof is generated.`,
    },
  });
});

// POST /api/loans/:id/approve
router.post('/:id/approve', (req: Request, res: Response) => {
  const loan = mutableLoans.find(l => l.id === req.params.id);
  if (!loan) {
    res.status(404).json({ success: false, error: 'Loan not found' });
    return;
  }

  if (loan.status !== 'pending') {
    res.status(400).json({ success: false, error: `Loan is already ${loan.status}` });
    return;
  }

  loan.approvals += 1;

  if (loan.approvals >= loan.approvalsRequired) {
    loan.status = 'approved';
    loan.txHash = generateTxHash();
    loan.disbursedAt = new Date().toISOString();
    loan.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  res.json({
    success: true,
    data: {
      loan,
      message: loan.status === 'approved'
        ? `✅ Multi-sig threshold reached! Funds disbursed on Algorand.`
        : `✍️ Approval ${loan.approvals}/${loan.approvalsRequired} recorded.`,
    },
  });
});

export default router;

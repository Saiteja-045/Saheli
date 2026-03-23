import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { loans, members, Loan as MockLoan } from '../data/mockData';
import { generateTxHash, registerTransactionLifecycle } from '../services/algorand';
import LoanModel from '../models/Loan';
import User from '../models/User';
import MultiSigActionModel from '../models/MultiSigAction';
import BankDisbursement from '../models/BankDisbursement';
import { queueBankDisbursement, processBankDisbursement } from '../services/bankDisbursementService';

const router = Router();

const mutableLoans: MockLoan[] = [...loans];

function evaluateLoan(trustScore: number, amount: number, purpose: string): {
  recommendation: 'approve' | 'review' | 'reject';
  reason: string;
  autoApprove: boolean;
} {
  const isEmergency = /medical|hospital|emergency|health/i.test(purpose);
  const isMicroLoan = amount <= 5000;

  if (trustScore >= 800 && isMicroLoan) {
    return {
      recommendation: 'approve',
      reason: `Trust score ${trustScore}/1000. Micro-loan within auto-approval threshold. AI auto-approving instantly.`,
      autoApprove: true,
    };
  }
  if (trustScore >= 750 && isEmergency) {
    return {
      recommendation: 'approve',
      reason: `Emergency medical loan. Trust score ${trustScore}/1000 clears emergency threshold. Routing for expedited 1/3 multi-sig approval.`,
      autoApprove: false,
    };
  }
  if (trustScore >= 700) {
    return {
      recommendation: 'approve',
      reason: `Trust score ${trustScore}/1000 meets approval threshold. Routing for standard multi-sig approval.`,
      autoApprove: false,
    };
  }
  if (trustScore >= 600) {
    return {
      recommendation: 'review',
      reason: `Trust score ${trustScore}/1000 is below confidence threshold. Manual review by SHG leader recommended.`,
      autoApprove: false,
    };
  }
  return {
    recommendation: 'reject',
    reason: `Trust score ${trustScore}/1000 is insufficient for this loan amount. Member should improve repayment consistency first.`,
    autoApprove: false,
  };
}

function mapDbLoanToResponse(loan: any): MockLoan {
  const user = loan.user;
  return {
    id: String(loan._id),
    memberId: typeof user === 'object' && user ? String(user._id) : String(loan.user),
    memberName: typeof user === 'object' && user ? user.name : 'Member',
    amount: loan.amount,
    purpose: loan.purpose,
    status: loan.status,
    trustScoreAtApplication: loan.trustScoreAtApplication || 0,
    aiRecommendation: loan.aiRecommendation,
    aiReason: loan.aiReason,
    approvals: loan.approvals,
    approvalsRequired: loan.approvalsRequired,
    disbursedAt: loan.disbursedAt?.toISOString?.() || undefined,
    dueDate: loan.dueDate?.toISOString?.() || undefined,
    repaidAmount: loan.repaidAmount,
    createdAt: loan.createdAt?.toISOString?.() || new Date().toISOString(),
    txHash: loan.txHash,
  };
}

async function createLoanApprovalAction(params: {
  loanId: string;
  memberName: string;
  amount: number;
  purpose: string;
  signaturesRequired: number;
  emergency: boolean;
}) {
  await MultiSigActionModel.create({
    id: uuidv4(),
    type: 'loan_approval',
    description: `Loan approval for ${params.memberName} (${params.purpose})`,
    amount: params.amount,
    requestedBy: params.memberName,
    signatures: [],
    signaturesRequired: params.signaturesRequired,
    status: 'pending',
    isEmergency: params.emergency,
    destinationRole: 'bank',
    linkedLoanId: params.loanId,
    createdAt: new Date().toISOString(),
  });
}

// GET /api/loans/bank-queue/list
router.get('/bank-queue/list', async (_req: Request, res: Response) => {
  const queue = await BankDisbursement.find()
    .populate({ path: 'loan', populate: { path: 'user', select: 'name phone' } })
    .populate('user', 'name phone')
    .sort({ queuedAt: -1 })
    .lean();

  res.json({ success: true, data: queue });
});

// POST /api/loans/bank-queue/:id/process
router.post('/bank-queue/:id/process', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { processedBy = 'BANK_OFFICER' } = req.body || {};

  const processed = await processBankDisbursement(id, processedBy);
  if (!processed) {
    res.status(404).json({ success: false, error: 'Disbursement request not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      disbursement: processed,
      message: processed.status === 'approved'
        ? '✅ Bank disbursement completed and member credited.'
        : `ℹ️ Disbursement status: ${processed.status}`,
    },
  });
});

// GET /api/loans
router.get('/', async (_req: Request, res: Response) => {
  const dbLoans = await LoanModel.find().populate('user', 'name').sort({ createdAt: -1 }).lean();
  const transformed = dbLoans.map(mapDbLoanToResponse);
  res.json({ success: true, data: [...transformed, ...mutableLoans] });
});

// GET /api/loans/:id
router.get('/:id', async (req: Request, res: Response) => {
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    const dbLoan = await LoanModel.findById(req.params.id).populate('user', 'name').lean();
    if (dbLoan) {
      res.json({ success: true, data: mapDbLoanToResponse(dbLoan) });
      return;
    }
  }

  const loan = mutableLoans.find(l => l.id === req.params.id);
  if (!loan) {
    res.status(404).json({ success: false, error: 'Loan not found' });
    return;
  }
  res.json({ success: true, data: loan });
});

// POST /api/loans/request
router.post('/request', async (req: Request, res: Response) => {
  const { memberId, amount, purpose } = req.body;

  if (!memberId || !amount || !purpose) {
    res.status(400).json({ success: false, error: 'memberId, amount, purpose required' });
    return;
  }

  const isDbMember = mongoose.Types.ObjectId.isValid(memberId);
  let memberName = 'Member';
  let trustScore = 700;
  let dbUser: any = null;

  if (isDbMember) {
    dbUser = await User.findById(memberId);
    if (!dbUser) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    memberName = dbUser.name;
    trustScore = dbUser.trustScore || trustScore;
  } else {
    const mockMember = members.find(m => m.id === memberId);
    if (!mockMember) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    memberName = mockMember.name;
    trustScore = mockMember.trustScore;
  }

  const evaluation = evaluateLoan(trustScore, amount, purpose);

  if (dbUser) {
    const created = await LoanModel.create({
      user: dbUser._id,
      amount,
      purpose,
      status: evaluation.autoApprove ? 'approved' : 'pending',
      trustScoreAtApplication: trustScore,
      aiRecommendation: evaluation.recommendation,
      aiReason: evaluation.reason,
      approvals: evaluation.autoApprove ? 3 : 0,
      approvalsRequired: amount <= 5000 ? 1 : 3,
      disbursedAt: undefined,
      dueDate: undefined,
      repaidAmount: 0,
    });

    if (evaluation.autoApprove) {
      await queueBankDisbursement({
        loanId: String(created._id),
        userId: String(dbUser._id),
        amount,
        notes: 'AI auto-approved micro-loan; routed to bank for payout',
        autoProcess: true,
      });
    } else if (evaluation.recommendation !== 'reject') {
      await createLoanApprovalAction({
        loanId: String(created._id),
        memberName,
        amount,
        purpose,
        signaturesRequired: amount <= 5000 ? 1 : 3,
        emergency: /medical|hospital|emergency|health/i.test(purpose),
      });
    }

    const hydrated = await LoanModel.findById(created._id).populate('user', 'name').lean();

    res.status(201).json({
      success: true,
      data: {
        loan: hydrated ? mapDbLoanToResponse(hydrated) : null,
        evaluation,
        txHash: undefined,
        message: evaluation.autoApprove
          ? `🤖 AI Agent auto-approved ₹${amount.toLocaleString('en-IN')} for ${memberName}. Sent to bank for payout.`
          : evaluation.recommendation === 'reject'
            ? `❌ Loan request rejected by AI risk policy: ${evaluation.reason}`
            : '📋 Loan request submitted and sent to Leader multi-sig approvals.',
      },
    });
    return;
  }

  const txHash = evaluation.autoApprove ? generateTxHash() : undefined;
  if (txHash) {
    registerTransactionLifecycle({
      txHash,
      type: 'loan_disbursement',
      amount,
      initialStatus: 'pending',
      autoConfirm: true,
    });
  }

  const newLoan: MockLoan = {
    id: uuidv4(),
    memberId,
    memberName,
    amount,
    purpose,
    status: evaluation.autoApprove ? 'approved' : 'pending',
    trustScoreAtApplication: trustScore,
    aiRecommendation: evaluation.recommendation,
    aiReason: evaluation.reason,
    approvals: evaluation.autoApprove ? 3 : 0,
    approvalsRequired: amount <= 5000 ? 1 : 3,
    disbursedAt: evaluation.autoApprove ? new Date().toISOString() : undefined,
    dueDate: evaluation.autoApprove
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
    repaidAmount: 0,
    createdAt: new Date().toISOString(),
    txHash,
  };

  mutableLoans.unshift(newLoan);

  res.status(201).json({
    success: true,
    data: {
      loan: newLoan,
      evaluation,
      txHash,
      message: evaluation.autoApprove
        ? ` AI Agent auto-approved ₹${amount.toLocaleString('en-IN')} for ${memberName}`
        : ` Loan request submitted. AI recommendation: ${evaluation.recommendation.toUpperCase()}`,
      explorerUrl: txHash ? `https://testnet.algoexplorer.io/tx/${txHash}` : undefined,
    },
  });
});

// POST /api/loans/:id/approve (fallback/direct flow)
router.post('/:id/approve', async (req: Request, res: Response) => {
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    const dbLoan = await LoanModel.findById(req.params.id);
    if (dbLoan) {
      if (dbLoan.status !== 'pending') {
        res.status(400).json({ success: false, error: `Loan is already ${dbLoan.status}` });
        return;
      }

      dbLoan.approvals += 1;

      if (dbLoan.approvals >= dbLoan.approvalsRequired) {
        dbLoan.status = 'approved';
        await queueBankDisbursement({
          loanId: String(dbLoan._id),
          userId: String(dbLoan.user),
          amount: dbLoan.amount,
          notes: 'Leader approvals completed; routed to bank',
          autoProcess: true,
        });
      }

      await dbLoan.save();
      const hydrated = await LoanModel.findById(dbLoan._id).populate('user', 'name').lean();

      res.json({
        success: true,
        data: {
          loan: hydrated ? mapDbLoanToResponse(hydrated) : null,
          message: dbLoan.status === 'approved'
            ? 'Multi-sig threshold reached! Sent to bank for disbursement.'
            : ` Approval ${dbLoan.approvals}/${dbLoan.approvalsRequired} recorded.`,
        },
      });
      return;
    }
  }

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
    registerTransactionLifecycle({
      txHash: loan.txHash,
      type: 'loan_disbursement',
      amount: loan.amount,
      initialStatus: 'pending',
      autoConfirm: true,
    });
    loan.disbursedAt = new Date().toISOString();
    loan.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  res.json({
    success: true,
    data: {
      loan,
      message: loan.status === 'approved'
        ? '✅ Multi-sig threshold reached! Funds disbursed on Algorand.'
        : `✍️ Approval ${loan.approvals}/${loan.approvalsRequired} recorded.`,
    },
  });
});

export default router;

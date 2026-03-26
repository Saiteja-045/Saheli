import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
<<<<<<< HEAD
import LoanModel from '../models/Loan';
import User from '../models/User';
import MultiSigActionModel from '../models/MultiSigAction';
import BankDisbursement from '../models/BankDisbursement';
import { generateTxHash } from '../services/txEngine';
import { queueBankDisbursement, processBankDisbursement } from '../services/bankDisbursementService';

const router = Router();

=======
import { loans, members, Loan } from '../data/mockData';
import { generateTxHash } from '../services/algorand';
import { sendWhatsAppMessage } from '../services/whatsapp';
import User from '../models/User';
import mongoose from 'mongoose';

const router = Router();

// In-memory loan store for mutations
const mutableLoans: Loan[] = [...loans];

type WhatsAppAttempt = {
  attempted: boolean;
  sent: boolean;
  sid?: string;
  error?: string;
};

async function sendWhatsAppSafe(toPhone: string | undefined, body: string): Promise<WhatsAppAttempt> {
  if (!toPhone) {
    return { attempted: false, sent: false, error: 'Member phone number unavailable' };
  }

  try {
    const result = await sendWhatsAppMessage({ toPhone, body });
    return { attempted: true, sent: true, sid: result.sid };
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      error: error instanceof Error ? error.message : 'WhatsApp send failed',
    };
  }
}

>>>>>>> 6cd127775d3326dac72f1b349e2afe7f4ac32378
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
      reason: `Emergency medical loan. Trust score ${trustScore}/1000 clears emergency threshold. Routing for expedited 1/3 approval.`,
      fastTrack: true,
    };
  }
  if (trustScore >= 700) {
    return {
      recommendation: 'approve',
      reason: `Trust score ${trustScore}/1000 meets approval threshold. Routing for standard approval.`,
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

function mapLoan(doc: any) {
  return {
    id: String(doc._id),
    memberId: String(doc.user?._id || doc.user),
    memberName: doc.user?.name || 'Member',
    amount: doc.amount,
    purpose: doc.purpose,
    status: doc.status,
    trustScoreAtApplication: doc.trustScoreAtApplication,
    aiRecommendation: doc.aiRecommendation,
    aiReason: doc.aiReason,
    approvals: doc.approvals,
    approvalsRequired: doc.approvalsRequired,
    disbursedAt: doc.disbursedAt,
    dueDate: doc.dueDate,
    repaidAmount: doc.repaidAmount,
    createdAt: doc.createdAt,
    transactionId: doc.transactionId,
  };
}

// GET /api/loans
router.get('/', async (_req: Request, res: Response) => {
  const loans = await LoanModel.find()
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: loans.map(mapLoan) });
});

// GET /api/loans/:id
router.get('/:id', async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404).json({ success: false, error: 'Loan not found' });
    return;
  }

  const loan = await LoanModel.findById(req.params.id).populate('user', 'name').lean();
  if (!loan) {
    res.status(404).json({ success: false, error: 'Loan not found' });
    return;
  }
  res.json({ success: true, data: mapLoan(loan) });
});

// POST /api/loans/request
router.post('/request', async (req: Request, res: Response) => {
  const { memberId, amount, purpose } = req.body;

  if (!memberId || !amount || !purpose) {
    res.status(400).json({ success: false, error: 'memberId, amount, purpose required' });
    return;
  }

<<<<<<< HEAD
  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    res.status(400).json({ success: false, error: 'memberId must be a valid Mongo ObjectId' });
    return;
  }

  const member = await User.findById(memberId);
  if (!member || member.role !== 'member') {
=======
  const legacyMember = members.find(m => m.id === memberId);
  let memberName = legacyMember?.name;
  let trustScore = legacyMember?.trustScore;
  let memberPhone = legacyMember?.phone;
  let memberShgId = legacyMember?.shgId;

  if (!legacyMember && mongoose.Types.ObjectId.isValid(memberId)) {
    const dbMember = await User.findById(memberId).select('name trustScore role').lean();
    if (!dbMember || dbMember.role !== 'member') {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    memberName = dbMember.name;
    trustScore = dbMember.trustScore || 650;
    memberPhone = dbMember.phone;
    memberShgId = dbMember.shgId || undefined;
  }

  if (!memberName || trustScore === undefined) {
>>>>>>> 6cd127775d3326dac72f1b349e2afe7f4ac32378
    res.status(404).json({ success: false, error: 'Member not found' });
    return;
  }

<<<<<<< HEAD
  const evaluation = evaluateLoan(member.trustScore || 700, amount, purpose);
  const approvalsRequired = evaluation.fastTrack ? 1 : 3;

  const loan = await LoanModel.create({
    user: member._id,
    amount,
    purpose,
    status: 'pending',
    trustScoreAtApplication: member.trustScore || 700,
=======
  const evaluation = evaluateLoan(trustScore, amount, purpose);

  const newLoan: Loan = {
    id: uuidv4(),
    memberId,
    memberName,
    amount,
    purpose,
    status: 'pending',
    trustScoreAtApplication: trustScore,
>>>>>>> 6cd127775d3326dac72f1b349e2afe7f4ac32378
    aiRecommendation: evaluation.recommendation,
    aiReason: evaluation.reason,
    approvals: 0,
    approvalsRequired,
    repaidAmount: 0,
  });

  if (evaluation.recommendation !== 'reject') {
    await MultiSigActionModel.create({
      id: uuidv4(),
      type: 'loan_approval',
      description: `Loan approval for ${member.name}`,
      amount,
      requestedBy: member.name,
      signatures: [],
      signaturesRequired: approvalsRequired,
      status: 'pending',
      linkedLoanId: String(loan._id),
      destinationRole: 'leader',
      createdAt: new Date().toISOString(),
    });
  }

  const hydrated = await LoanModel.findById(loan._id).populate('user', 'name').lean();

  const whatsappToMember = await sendWhatsAppSafe(
    memberPhone,
    [
      `Namaste ${memberName}, your loan request has been submitted.`,
      `Amount: Rs ${Number(amount).toLocaleString('en-IN')}`,
      `Purpose: ${purpose}`,
      `Status: Pending leader approval (${newLoan.approvalsRequired}-of-${newLoan.approvalsRequired})`,
    ].join('\n'),
  );

  const leaderFilter: Record<string, string> = { role: 'leader' };
  if (memberShgId) {
    leaderFilter.shgId = memberShgId;
  }

  const leaders = await User.find(leaderFilter).select('name phone').lean();
  const leaderSends = await Promise.allSettled(
    leaders
      .map((leader: any) => leader.phone)
      .filter(Boolean)
      .map((leaderPhone: string) =>
        sendWhatsAppSafe(
          leaderPhone,
          [
            'New SHG loan request needs approval.',
            `Member: ${memberName}`,
            `Amount: Rs ${Number(amount).toLocaleString('en-IN')}`,
            `Purpose: ${purpose}`,
            `Recommendation: ${evaluation.recommendation.toUpperCase()}`,
          ].join('\n'),
        ),
      ),
  );

  const leaderNotifications = {
    attempted: leaderSends.length,
    sent: leaderSends.filter(s => s.status === 'fulfilled' && s.value.sent).length,
  };

  res.status(201).json({
    success: true,
    data: {
      loan: mapLoan(hydrated || loan.toObject()),
      evaluation,
<<<<<<< HEAD
      message: 'Loan request submitted. Leader approval is required before funds are disbursed and QR proof is generated.',
=======
      whatsapp: {
        member: whatsappToMember,
        leaders: leaderNotifications,
      },
      message: `📋 Loan request submitted. Leader approval is required before funds are disbursed and QR proof is generated.`,
>>>>>>> 6cd127775d3326dac72f1b349e2afe7f4ac32378
    },
  });
});

// POST /api/loans/:id/approve
router.post('/:id/approve', async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404).json({ success: false, error: 'Loan not found' });
    return;
  }

  const loan = await LoanModel.findById(req.params.id);
  if (!loan) {
    res.status(404).json({ success: false, error: 'Loan not found' });
    return;
  }

  if (loan.status !== 'pending') {
    res.status(400).json({ success: false, error: `Loan is already ${loan.status}` });
    return;
  }

  loan.approvals += 1;

  let message = `Approval ${loan.approvals}/${loan.approvalsRequired} recorded.`;
  if (loan.approvals >= loan.approvalsRequired) {
    loan.status = 'approved';
    loan.transactionId = generateTxHash();
    loan.disbursedAt = new Date();
    loan.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    message = 'Approval threshold reached! Loan moved for bank payout processing.';

    await queueBankDisbursement({
      loanId: String(loan._id),
      userId: String(loan.user),
      amount: loan.amount,
      notes: 'Manual leader approval endpoint triggered',
      autoProcess: true,
    });
  }

<<<<<<< HEAD
  await loan.save();

  const action = await MultiSigActionModel.findOne({ linkedLoanId: String(loan._id), status: 'pending' });
  if (action) {
    action.signatures = Array.from(new Set([...(action.signatures || []), req.body.signerId || 'leader_manual']));
    action.signaturesRequired = loan.approvalsRequired;
    if (loan.status === 'approved') {
      action.status = 'executed';
      action.transactionId = loan.transactionId;
    }
    await action.save();
  }

  const hydrated = await LoanModel.findById(loan._id).populate('user', 'name').lean();
  const mapped = mapLoan(hydrated || loan.toObject());
  res.json({ success: true, data: { loan: mapped, message } });
});

// GET /api/loans/bank-queue/list
router.get('/bank-queue/list', async (_req: Request, res: Response) => {
  const queue = await BankDisbursement.find({ status: 'pending' })
    .populate('loan', 'amount purpose status')
    .populate('user', 'name phone')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: queue });
});

// POST /api/loans/bank-queue/:id/process
router.post('/bank-queue/:id/process', async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404).json({ success: false, error: 'Queue item not found' });
    return;
  }

  const processed = await processBankDisbursement(req.params.id, req.body.processedBy || 'BANK_OFFICER');
  if (!processed) {
    res.status(404).json({ success: false, error: 'Queue item not found' });
    return;
  }

  res.json({ success: true, data: processed });
=======
  const sendResponse = async () => {
    let whatsapp: WhatsAppAttempt = { attempted: false, sent: false };

    if (loan.status === 'approved') {
      const legacyMember = members.find(m => m.id === loan.memberId);
      let memberPhone = legacyMember?.phone;

      if (!memberPhone && mongoose.Types.ObjectId.isValid(loan.memberId)) {
        const dbMember = await User.findById(loan.memberId).select('phone').lean();
        memberPhone = dbMember?.phone;
      }

      whatsapp = await sendWhatsAppSafe(
        memberPhone,
        [
          `Good news ${loan.memberName}!`,
          `Your loan is approved and disbursed.`,
          `Amount: Rs ${loan.amount.toLocaleString('en-IN')}`,
          `Tx: ${loan.txHash}`,
          `Verify: https://testnet.algoexplorer.io/tx/${loan.txHash}`,
        ].join('\n'),
      );
    }

    res.json({
      success: true,
      data: {
        loan,
        whatsapp,
        message: loan.status === 'approved'
          ? `✅ Multi-sig threshold reached! Funds disbursed on Algorand.`
          : `✍️ Approval ${loan.approvals}/${loan.approvalsRequired} recorded.`,
      },
    });
  };

  sendResponse().catch((error: unknown) => {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send approval response',
    });
  });
>>>>>>> 6cd127775d3326dac72f1b349e2afe7f4ac32378
});

export default router;

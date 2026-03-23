import { Router, Request, Response } from 'express';
import { shgGroups, institutionalStats, treasuryStats, ledgerStream } from '../data/mockData';
import User from '../models/User';
import Transaction from '../models/Transaction';
import AgentStateModel from '../models/AgentState';

const router = Router();

function trustLabel(score: number): string {
  if (score >= 900) return 'A+';
  if (score >= 800) return 'A';
  if (score >= 700) return 'B+';
  return 'B';
}

// GET /api/stats/treasury (for Leader dashboard)
router.get('/treasury', async (_req: Request, res: Response) => {
  const [memberStats, txAgg, monthYieldAgg, agentState] = await Promise.all([
    User.aggregate([
      { $match: { role: 'member' } },
      {
        $group: {
          _id: null,
          totalMembers: { $sum: 1 },
          activeMembers: { $sum: { $cond: [{ $gt: ['$totalSavings', 0] }, 1, 0] } },
          avgTrust: { $avg: '$trustScore' },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { status: { $ne: 'failed' } } },
      {
        $group: {
          _id: null,
          inflow: {
            $sum: {
              $cond: [{ $in: ['$type', ['deposit', 'yield', 'loan_repayment']] }, '$amount', 0],
            },
          },
          outflow: {
            $sum: {
              $cond: [{ $in: ['$type', ['withdrawal', 'loan_disbursement']] }, '$amount', 0],
            },
          },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          type: 'yield',
          status: { $ne: 'failed' },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    AgentStateModel.findOne({ key: 'singleton' }).lean(),
  ]);

  if (!memberStats.length && !txAgg.length) {
    res.json({ success: true, data: treasuryStats });
    return;
  }

  const members = memberStats[0] || { totalMembers: 0, activeMembers: 0, avgTrust: 0 };
  const tx = txAgg[0] || { inflow: 0, outflow: 0 };
  const totalLiquidity = Math.max(0, (tx.inflow || 0) - (tx.outflow || 0));
  const monthYield = monthYieldAgg[0]?.total || 0;
  const yieldThisMonth = totalLiquidity > 0 ? Number(((monthYield / totalLiquidity) * 100).toFixed(2)) : 0;
  const trustScoreValue = Math.round(members.avgTrust || 0);

  res.json({
    success: true,
    data: {
      totalLiquidity,
      yieldThisMonth,
      trustScore: trustLabel(trustScoreValue),
      trustScoreValue,
      activeMembers: members.activeMembers,
      totalMembers: members.totalMembers,
      idleFundsDeployed: agentState?.totalDeployed || 0,
      idleFundsAPY: agentState?.vaultPositions?.length
        ? Number((agentState.vaultPositions.reduce((s: number, v: any) => s + (v.apy || 0), 0) / agentState.vaultPositions.length).toFixed(2))
        : 0,
      totalYieldGenerated: agentState?.totalYieldHarvested || monthYield,
    },
  });
});

// GET /api/stats/institutional (for Bank/NGO dashboard)
router.get('/institutional', async (_req: Request, res: Response) => {
  const [membersCount, txAgg, avgTrust, repayingLoans] = await Promise.all([
    User.countDocuments({ role: 'member' }),
    Transaction.aggregate([
      { $match: { status: { $ne: 'failed' } } },
      {
        $group: {
          _id: null,
          inflow: {
            $sum: {
              $cond: [{ $in: ['$type', ['deposit', 'yield', 'loan_repayment']] }, '$amount', 0],
            },
          },
        },
      },
    ]),
    User.aggregate([{ $match: { role: 'member' } }, { $group: { _id: null, avg: { $avg: '$trustScore' } } }]),
    User.aggregate([
      { $match: { role: 'member' } },
      { $group: { _id: null, totalLoanAmount: { $sum: '$activeLoansAmount' } } },
    ]),
  ]);

  if (!membersCount && !txAgg.length) {
    res.json({ success: true, data: institutionalStats });
    return;
  }

  res.json({
    success: true,
    data: {
      regionalLiquidity: txAgg[0]?.inflow || 0,
      activeGrants: Math.max(0, Math.floor((membersCount || 0) / 5)),
      shgsMonitored: Math.max(1, Math.floor((membersCount || 0) / 20)),
      aggregateTrustIndex: Math.round(avgTrust[0]?.avg || 0),
      repaymentRate: 99.2,
      lockedLiquidity: repayingLoans[0]?.totalLoanAmount || 0,
      auditFrequency: '6s/Block',
    },
  });
});

// GET /api/stats/shg-directory (all SHG groups)
router.get('/shg-directory', async (_req: Request, res: Response) => {
  const grouped = await User.aggregate([
    { $match: { role: 'member', shgId: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$shgId',
        memberCount: { $sum: 1 },
        totalLiquidity: { $sum: '$totalSavings' },
        avgTrust: { $avg: '$trustScore' },
      },
    },
    { $sort: { totalLiquidity: -1 } },
  ]);

  if (!grouped.length) {
    res.json({ success: true, data: shgGroups });
    return;
  }

  const data = grouped.map((g, idx) => ({
    id: String(g._id),
    name: `SHG ${String(g._id).toUpperCase()}`,
    registrationId: `SHG-${String(g._id).toUpperCase()}`,
    trustScore: Math.round(g.avgTrust || 0),
    memberCount: g.memberCount,
    activeLoans: `₹${Math.round((g.totalLiquidity || 0) * 0.28).toLocaleString('en-IN')}`,
    totalLiquidity: g.totalLiquidity,
    yieldThisMonth: Number((Math.max(1.1, (g.avgTrust || 700) / 220)).toFixed(1)),
    auditStatus: (idx % 4 === 0 ? 'PENDING_AUDIT' : 'IMMUTABLE_OK') as 'IMMUTABLE_OK' | 'PENDING_AUDIT' | 'FLAGGED',
    region: 'India',
  }));

  res.json({ success: true, data });
});

// GET /api/stats/ledger (real-time ledger stream for Bank dashboard)
router.get('/ledger', async (_req: Request, res: Response) => {
  const latest = await Transaction.find({ status: { $ne: 'failed' } })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(25)
    .lean();

  if (!latest.length) {
    res.json({ success: true, data: ledgerStream });
    return;
  }

  const data = latest.map((tx: any) => {
    const isCredit = ['deposit', 'yield', 'loan_repayment'].includes(tx.type);
    const eventMap: Record<string, string> = {
      deposit: 'Deposit Confirmed',
      withdrawal: 'Withdrawal Confirmed',
      loan_disbursement: 'Loan Disbursal',
      loan_repayment: 'Loan Repayment',
      yield: 'Yield Harvested',
    };

    return {
      id: String(tx._id),
      event: `${eventMap[tx.type] || 'Ledger Event'}: ${tx.user?.name || 'Member'}`,
      txId: tx.txHash ? `${tx.txHash.slice(0, 12)}...` : `TX-${String(tx._id).slice(-6)}`,
      amount: isCredit ? tx.amount : -Math.abs(tx.amount),
      type: isCredit ? 'credit' : 'debit',
      timestamp: tx.createdAt,
    };
  });

  res.json({ success: true, data });
});

export default router;

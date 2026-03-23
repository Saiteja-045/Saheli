import { Router, Request, Response } from 'express';
import {
  agentState,
  deployIdleFunds,
  harvestYield,
  processEmergencyLoan,
  getAgentStatus,
} from '../services/agentEngine';
import { members } from '../data/mockData';

const router = Router();

// GET /api/agent/status — full agent state
router.get('/status', (_req: Request, res: Response) => {
  res.json({ success: true, data: getAgentStatus() });
});

// GET /api/agent/log — recent agent activity log
router.get('/log', (_req: Request, res: Response) => {
  const status = getAgentStatus();
  res.json({ success: true, data: status.agentLog.slice(0, 20) });
});

// GET /api/agent/vaults — vault positions only
router.get('/vaults', (_req: Request, res: Response) => {
  const status = getAgentStatus();
  res.json({
    success: true,
    data: {
      positions: status.vaultPositions,
      totalAUM: status.totalVaultAUM,
      pendingYield: status.pendingYield,
      averageAPY: Math.round(status.averageAPY * 10) / 10,
      idleFunds: status.idleFunds,
      totalYieldHarvested: status.totalYieldHarvested,
    },
  });
});

// POST /api/agent/invest — trigger idle fund deployment
router.post('/invest', (req: Request, res: Response) => {
  const { amount } = req.body;

  if (agentState.idleFunds < 1000) {
    res.status(400).json({
      success: false,
      error: 'Insufficient idle funds to deploy (minimum ₹1,000)',
    });
    return;
  }

  const deployAmount = amount ? Math.min(amount, agentState.idleFunds) : agentState.idleFunds;
  const result = deployIdleFunds(deployAmount);

  console.log(`[Agent] Deployed ₹${deployAmount.toLocaleString('en-IN')} to ${result.vault.protocol}`);

  res.json({
    success: true,
    data: {
      vault: result.vault,
      logEntry: result.logEntry,
      newIdleFunds: result.newIdleFunds,
      message: `🤖 Agent deployed ₹${deployAmount.toLocaleString('en-IN')} to ${result.vault.protocol} at ${result.vault.apy}% APY`,
    },
  });
});

// POST /api/agent/harvest — harvest accumulated yield
router.post('/harvest', (req: Request, res: Response) => {
  const { vaultId } = req.body;
  const result = harvestYield(vaultId);

  console.log(`[Agent] Harvested ₹${result.harvested.toLocaleString('en-IN')} yield`);

  res.json({
    success: true,
    data: {
      harvested: result.harvested,
      logEntry: result.logEntry,
      newIdleFunds: agentState.idleFunds,
      message: `✅ Harvested ₹${result.harvested.toLocaleString('en-IN')} yield. Added to treasury.`,
    },
  });
});

// POST /api/agent/emergency-loan — agentic emergency loan flow
router.post('/emergency-loan', (req: Request, res: Response) => {
  const { memberId = 'm1', amount, purpose = 'emergency medical' } = req.body;

  if (!amount) {
    res.status(400).json({ success: false, error: 'amount is required' });
    return;
  }

  const member = members.find(m => m.id === memberId);
  if (!member) {
    res.status(404).json({ success: false, error: 'Member not found' });
    return;
  }

  const result = processEmergencyLoan({
    memberId,
    memberName: member.name,
    trustScore: member.trustScore,
    amount,
    purpose,
  });

  const statusCode = result.approved ? 201 : 202;
  res.status(statusCode).json({
    success: true,
    data: {
      ...result,
      memberName: member.name,
      trustScore: member.trustScore,
      signaturesRequired: result.threshold,
      message: result.autoApproved
        ? `🚨 EMERGENCY LOAN DISBURSED in <3s — ₹${amount.toLocaleString('en-IN')} sent to ${member.name}`
        : `📋 Loan queued for ${result.threshold}-of-3 multi-sig approval`,
      explorerUrl: result.txHash
        ? `https://testnet.algoexplorer.io/tx/${result.txHash}`
        : undefined,
    },
  });
});

// GET /api/agent/repayments — auto-repayment schedules
router.get('/repayments', (_req: Request, res: Response) => {
  res.json({ success: true, data: agentState.autoRepayments });
});

export default router;

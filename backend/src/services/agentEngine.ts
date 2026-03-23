import { v4 as uuidv4 } from 'uuid';
import { generateTxHash } from './algorand';

// ─── Agent State ─────────────────────────────────────────────────────────────

export interface VaultPosition {
  id: string;
  protocol: string;
  asset: string;
  deployed: number;
  apy: number;
  yieldAccrued: number;
  stakedAt: string;
  txHash: string;
  status: 'active' | 'withdrawing' | 'completed';
}

export interface AutoRepayment {
  loanId: string;
  memberId: string;
  memberName: string;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  nextDueDate: string;
  deductionSource: 'future_deposit' | 'yield_share';
  status: 'active' | 'completed' | 'defaulted';
}

export interface AgentLogEntry {
  id: string;
  tag: 'LOAN' | 'VAULT' | 'REPAY' | 'ALERT' | 'SYSTEM';
  message: string;
  detail?: string;
  amount?: number;
  txHash?: string;
  timestamp: string;
}

export interface AgentState {
  idleFunds: number;
  totalDeployed: number;
  totalYieldHarvested: number;
  lastScanAt: string;
  vaultPositions: VaultPosition[];
  autoRepayments: AutoRepayment[];
  agentLog: AgentLogEntry[];
}

// ─── Initial State ───────────────────────────────────────────────────────────

export const agentState: AgentState = {
  idleFunds: 345800,
  totalDeployed: 900000,
  totalYieldHarvested: 52400,
  lastScanAt: new Date(Date.now() - 120000).toISOString(),
  vaultPositions: [
    {
      id: 'vault1',
      protocol: 'Folks Finance',
      asset: 'ALGO',
      deployed: 500000,
      apy: 4.2,
      yieldAccrued: 4200,
      stakedAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
      txHash: generateTxHash(),
      status: 'active',
    },
    {
      id: 'vault2',
      protocol: 'Tinyman',
      asset: 'USDC-ALGO LP',
      deployed: 250000,
      apy: 6.8,
      yieldAccrued: 2380,
      stakedAt: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
      txHash: generateTxHash(),
      status: 'active',
    },
    {
      id: 'vault3',
      protocol: 'Algofi',
      asset: 'gALGO',
      deployed: 150000,
      apy: 5.1,
      yieldAccrued: 1020,
      stakedAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
      txHash: generateTxHash(),
      status: 'active',
    },
  ],
  autoRepayments: [
    {
      loanId: 'loan2',
      memberId: 'm2',
      memberName: 'Sita Ramaiah',
      installmentAmount: 1083,
      totalInstallments: 6,
      paidInstallments: 3,
      nextDueDate: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
      deductionSource: 'future_deposit',
      status: 'active',
    },
  ],
  agentLog: [
    {
      id: 'al1',
      tag: 'VAULT',
      message: 'Deployed ₹5,00,000 → Folks Finance ALGO vault',
      detail: '4.2% APY confirmed. Block #42891034',
      amount: 500000,
      txHash: generateTxHash(),
      timestamp: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    },
    {
      id: 'al2',
      tag: 'VAULT',
      message: 'Staked ₹2,50,000 → Tinyman USDC-ALGO LP',
      detail: '6.8% APY. Dual-sided liquidity provision.',
      amount: 250000,
      txHash: generateTxHash(),
      timestamp: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
    },
    {
      id: 'al3',
      tag: 'LOAN',
      message: 'Emergency loan auto-approved for Lakshmi Devi',
      detail: 'SBT Score 850/1000 cleared. 1-of-3 threshold. ₹5,000 disbursed.',
      amount: 5000,
      txHash: generateTxHash(),
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: 'al4',
      tag: 'REPAY',
      message: 'Auto-deducted ₹1,083 from Sita Ramaiah deposit',
      detail: 'Installment 3/6. Loan loan2 on track.',
      amount: 1083,
      timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
    {
      id: 'al5',
      tag: 'ALERT',
      message: 'Idle funds detected: ₹3,45,800 uninvested',
      detail: 'Scanning for optimal DeFi yield opportunities...',
      amount: 345800,
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: 'al6',
      tag: 'SYSTEM',
      message: 'Agent sweep complete — 3 vaults healthy',
      detail: 'Total AUM: ₹9,00,000 | Avg APY: 5.2%',
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
  ],
};

// ─── Agent Actions ────────────────────────────────────────────────────────────

export function deployIdleFunds(amount?: number): {
  vault: VaultPosition;
  logEntry: AgentLogEntry;
  newIdleFunds: number;
} {
  const deployAmount = amount || Math.min(agentState.idleFunds, 50000);
  const protocols = [
    { protocol: 'Folks Finance', asset: 'ALGO', apy: 4.2 },
    { protocol: 'Tinyman', asset: 'USDC-ALGO LP', apy: 6.8 },
    { protocol: 'Algofi', asset: 'gALGO', apy: 5.1 },
    { protocol: 'Pact', asset: 'ALGO-USDT LP', apy: 7.3 },
  ];
  const chosen = protocols[Math.floor(Math.random() * protocols.length)];
  const txHash = generateTxHash();

  const vault: VaultPosition = {
    id: uuidv4(),
    protocol: chosen.protocol,
    asset: chosen.asset,
    deployed: deployAmount,
    apy: chosen.apy,
    yieldAccrued: 0,
    stakedAt: new Date().toISOString(),
    txHash,
    status: 'active',
  };

  agentState.vaultPositions.push(vault);
  agentState.idleFunds = Math.max(0, agentState.idleFunds - deployAmount);
  agentState.totalDeployed += deployAmount;
  agentState.lastScanAt = new Date().toISOString();

  const logEntry: AgentLogEntry = {
    id: uuidv4(),
    tag: 'VAULT',
    message: `Deployed ₹${deployAmount.toLocaleString('en-IN')} → ${chosen.protocol} ${chosen.asset} vault`,
    detail: `${chosen.apy}% APY. TX: ${txHash.slice(0, 16)}...`,
    amount: deployAmount,
    txHash,
    timestamp: new Date().toISOString(),
  };
  agentState.agentLog.unshift(logEntry);

  return { vault, logEntry, newIdleFunds: agentState.idleFunds };
}

export function harvestYield(vaultId?: string): {
  harvested: number;
  logEntry: AgentLogEntry;
} {
  const targetVaults = vaultId
    ? agentState.vaultPositions.filter(v => v.id === vaultId)
    : agentState.vaultPositions.filter(v => v.status === 'active');

  const totalHarvested = targetVaults.reduce((sum, v) => {
    // Simulate accrued yield since staking
    const hoursStaked = (Date.now() - new Date(v.stakedAt).getTime()) / 3600000;
    const accrued = Math.floor((v.deployed * v.apy / 100 / 8760) * hoursStaked);
    const toHarvest = v.yieldAccrued || accrued;
    v.yieldAccrued = 0;
    return sum + toHarvest;
  }, 0);

  const harvestedAmount = Math.max(totalHarvested, 1200);
  agentState.totalYieldHarvested += harvestedAmount;
  agentState.idleFunds += harvestedAmount;

  const logEntry: AgentLogEntry = {
    id: uuidv4(),
    tag: 'VAULT',
    message: `Harvested ₹${harvestedAmount.toLocaleString('en-IN')} yield from ${targetVaults.length} vaults`,
    detail: 'Yield redistributed to SHG treasury.',
    amount: harvestedAmount,
    txHash: generateTxHash(),
    timestamp: new Date().toISOString(),
  };
  agentState.agentLog.unshift(logEntry);

  return { harvested: harvestedAmount, logEntry };
}

export function processEmergencyLoan(params: {
  memberId: string;
  memberName: string;
  trustScore: number;
  amount: number;
  purpose: string;
}): {
  approved: boolean;
  autoApproved: boolean;
  threshold: number;
  txHash?: string;
  autoRepayment?: AutoRepayment;
  logEntry: AgentLogEntry;
  reason: string;
} {
  const { memberId, memberName, trustScore, amount, purpose } = params;
  const isEmergency = /medical|hospital|emergency|health|urgent|accident/i.test(purpose);
  const isMicroLoan = amount <= 5000;
  const isHighScore = trustScore >= 750;

  let approved = false;
  let autoApproved = false;
  let threshold = 3;
  let reason = '';
  let txHash: string | undefined;
  let autoRepayment: AutoRepayment | undefined;

  if (isMicroLoan && trustScore >= 800) {
    approved = true;
    autoApproved = true;
    threshold = 1;
    reason = `✅ SBT Score ${trustScore}/1000 exceeds micro-loan auto-approval threshold. Funds disbursed instantly.`;
  } else if (isEmergency && isHighScore) {
    approved = true;
    autoApproved = true;
    threshold = 1; // Emergency override: 1-of-3
    reason = `🚨 Emergency override activated. SBT Score ${trustScore}/1000. Multi-sig threshold lowered to 1-of-3. Disbursed in <3s.`;
  } else if (trustScore >= 700) {
    approved = false;
    autoApproved = false;
    threshold = 3;
    reason = `📋 Routed to standard 3-of-3 multi-sig. SBT Score ${trustScore}/1000 qualifies for approval.`;
  } else {
    approved = false;
    autoApproved = false;
    threshold = 3;
    reason = `⚠️ SBT Score ${trustScore}/1000 below emergency threshold (750). Standard review required.`;
  }

  if (autoApproved) {
    txHash = generateTxHash();
    const installmentAmount = Math.ceil(amount / 6);
    autoRepayment = {
      loanId: uuidv4(),
      memberId,
      memberName,
      installmentAmount,
      totalInstallments: 6,
      paidInstallments: 0,
      nextDueDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
      deductionSource: 'future_deposit',
      status: 'active',
    };
    agentState.autoRepayments.push(autoRepayment);
    agentState.idleFunds = Math.max(0, agentState.idleFunds - amount);
  }

  const logEntry: AgentLogEntry = {
    id: uuidv4(),
    tag: 'LOAN',
    message: autoApproved
      ? `Emergency loan disbursed for ${memberName} — ₹${amount.toLocaleString('en-IN')}`
      : `Loan request routed to multi-sig for ${memberName} — ₹${amount.toLocaleString('en-IN')}`,
    detail: reason,
    amount,
    txHash,
    timestamp: new Date().toISOString(),
  };
  agentState.agentLog.unshift(logEntry);
  agentState.lastScanAt = new Date().toISOString();

  return { approved, autoApproved, threshold, txHash, autoRepayment, logEntry, reason };
}

export function getAgentStatus() {
  // Tick yield accruals
  agentState.vaultPositions.forEach(v => {
    if (v.status === 'active') {
      const hoursStaked = (Date.now() - new Date(v.stakedAt).getTime()) / 3600000;
      v.yieldAccrued = Math.floor((v.deployed * v.apy / 100 / 8760) * hoursStaked);
    }
  });

  return {
    ...agentState,
    totalVaultAUM: agentState.vaultPositions.reduce((s, v) => s + v.deployed, 0),
    pendingYield: agentState.vaultPositions.reduce((s, v) => s + v.yieldAccrued, 0),
    averageAPY: agentState.vaultPositions.length
      ? agentState.vaultPositions.reduce((s, v) => s + v.apy, 0) / agentState.vaultPositions.length
      : 0,
  };
}

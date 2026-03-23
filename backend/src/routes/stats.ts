import { Router, Request, Response } from 'express';
import { shgGroups, institutionalStats, treasuryStats, ledgerStream } from '../data/mockData';
import { v4 as uuidv4 } from 'uuid';
import { generateTxHash } from '../services/algorand';

const router = Router();
const mutableInstitutionalStats = { ...institutionalStats };
const mutableLedger = [...ledgerStream];

// GET /api/stats/treasury (for Leader dashboard)
router.get('/treasury', (_req: Request, res: Response) => {
  res.json({ success: true, data: treasuryStats });
});

// GET /api/stats/institutional (for Bank/NGO dashboard)
router.get('/institutional', (_req: Request, res: Response) => {
  res.json({ success: true, data: mutableInstitutionalStats });
});

// GET /api/stats/shg-directory (all SHG groups)
router.get('/shg-directory', (_req: Request, res: Response) => {
  res.json({ success: true, data: shgGroups });
});

// GET /api/stats/ledger (real-time ledger stream for Bank dashboard)
router.get('/ledger', (_req: Request, res: Response) => {
  res.json({ success: true, data: mutableLedger });
});

// POST /api/stats/grants/approve (bank one-click grant approval)
router.post('/grants/approve', (_req: Request, res: Response) => {
  const amount = 75000;
  mutableInstitutionalStats.activeGrants += 1;
  mutableInstitutionalStats.regionalLiquidity += amount;

  mutableLedger.unshift({
    id: uuidv4(),
    event: 'Grant Approved & Disbursed',
    txId: generateTxHash().slice(0, 12) + '...',
    amount,
    type: 'credit',
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    data: {
      amount,
      activeGrants: mutableInstitutionalStats.activeGrants,
      regionalLiquidity: mutableInstitutionalStats.regionalLiquidity,
      message: `✅ Grant of ₹${amount.toLocaleString('en-IN')} approved and logged on-chain.`,
    },
  });
});

export default router;

import { Router, Request, Response } from 'express';
import { shgGroups, institutionalStats, treasuryStats, ledgerStream } from '../data/mockData';

const router = Router();

// GET /api/stats/treasury (for Leader dashboard)
router.get('/treasury', (_req: Request, res: Response) => {
  res.json({ success: true, data: treasuryStats });
});

// GET /api/stats/institutional (for Bank/NGO dashboard)
router.get('/institutional', (_req: Request, res: Response) => {
  res.json({ success: true, data: institutionalStats });
});

// GET /api/stats/shg-directory (all SHG groups)
router.get('/shg-directory', (_req: Request, res: Response) => {
  res.json({ success: true, data: shgGroups });
});

// GET /api/stats/ledger (real-time ledger stream for Bank dashboard)
router.get('/ledger', (_req: Request, res: Response) => {
  res.json({ success: true, data: ledgerStream });
});

export default router;

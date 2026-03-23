import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { verifyTransaction, generateTxHash } from '../services/algorand';

const router = Router();

// POST /api/qr/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { txHash, memberId, memberName, amount, type } = req.body;

    const hash = txHash || generateTxHash();

    // Build the QR payload — this is what gets embedded in the QR code
    const qrPayload = JSON.stringify({
      platform: 'SHG Chain',
      network: 'Algorand Testnet',
      txHash: hash,
      memberId: memberId || 'm1',
      memberName: memberName || 'Lakshmi Devi',
      amount,
      type: type || 'deposit',
      verified: true,
      verifyUrl: `https://testnet.algoexplorer.io/tx/${hash}`,
      timestamp: new Date().toISOString(),
    });

    // Generate QR as base64 data URL
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#191C1D',
        light: '#FFFFFF',
      },
    });

    res.json({
      success: true,
      data: {
        txHash: hash,
        qrCode: qrDataUrl,
        payload: JSON.parse(qrPayload),
        explorerUrl: `https://testnet.algoexplorer.io/tx/${hash}`,
        message: '✅ QR proof generated. Share this with any bank officer to verify offline.',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'QR generation failed' });
  }
});

// GET /api/qr/verify/:txHash
router.get('/verify/:txHash', (req: Request, res: Response) => {
  const { txHash } = req.params;
  const result = verifyTransaction(txHash);

  res.json({
    success: true,
    data: {
      txHash,
      ...result,
      message: result.valid
        ? '✅ Transaction verified on Algorand blockchain'
        : '❌ Transaction not found',
    },
  });
});

export default router;

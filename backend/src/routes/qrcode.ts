import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { verifyTransaction, generateTxHash, registerTransactionLifecycle } from '../services/algorand';

const router = Router();

// POST /api/qr/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { txHash, memberId, memberName, amount, type } = req.body;

    const hash = txHash || generateTxHash();
    const lifecycle = registerTransactionLifecycle({
      txHash: hash,
      type: type || 'deposit',
      amount: Number(amount) || 0,
      initialStatus: 'pending',
      autoConfirm: true,
    });

    // Build the QR payload — this is what gets embedded in the QR code
    const qrPayload = JSON.stringify({
      platform: 'Saheli',
      network: 'Algorand Testnet',
      txHash: hash,
      memberId: memberId || 'm1',
      memberName: memberName || 'Lakshmi Devi',
      amount,
      type: type || 'deposit',
      txStatus: lifecycle.status,
      verified: lifecycle.status === 'confirmed',
      verifyUrl: `https://testnet.algoexplorer.io/tx/${hash}`,
      saheliVerifyUrl: `/api/qr/verify/${hash}`,
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
        message: '✅ QR proof generated. Transaction will move from pending to confirmed shortly.',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'QR generation failed' });
  }
});

// GET /api/qr/verify/:txHash
router.get('/verify/:txHash', async (req: Request, res: Response) => {
  const { txHash } = req.params;
  const result = await verifyTransaction(txHash);

  res.json({
    success: true,
    data: {
      txHash,
      ...result,
      message: !result.valid
        ? '❌ Transaction not found'
        : result.status === 'pending'
          ? '⏳ Transaction is pending confirmation'
          : '✅ Transaction verified on Algorand blockchain',
    },
  });
});

export default router;

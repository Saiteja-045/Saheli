import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { verifyTransaction, generateTxHash } from '../services/algorand';
import { members } from '../data/mockData';
import { sendQRCodeWhatsAppReceipt } from '../services/whatsapp';

const router = Router();

// POST /api/qr/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      txHash,
      memberId,
      memberName,
      memberPhone,
      amount,
      type,
      walletAddress,
      autoSendWhatsApp = true,
    } = req.body;

    const hash = txHash || generateTxHash();
    const walletDeepLink = walletAddress
      ? `algorand://${walletAddress}?amount=0&note=${encodeURIComponent(`saheli:${hash}`)}`
      : undefined;

    // Build the QR payload — this is what gets embedded in the QR code
    const qrPayload = JSON.stringify({
      platform: 'Saheli',
      network: 'Algorand Testnet',
      txHash: hash,
      memberId: memberId || 'm1',
      memberName: memberName || 'Lakshmi Devi',
      amount,
      type: type || 'deposit',
      verified: true,
      verifyUrl: `https://testnet.algoexplorer.io/tx/${hash}`,
      walletAddress: walletAddress || null,
      walletDeepLink: walletDeepLink || null,
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

    const fallbackPhone = memberId ? members.find((m) => m.id === memberId)?.phone : undefined;
    const targetPhone = memberPhone || fallbackPhone;

    let whatsapp: {
      attempted: boolean;
      sent: boolean;
      messageSid?: string;
      mediaUrl?: string;
      status?: string;
      error?: string;
    } = {
      attempted: false,
      sent: false,
    };

    if (autoSendWhatsApp && targetPhone) {
      whatsapp.attempted = true;
      try {
        const delivery = await sendQRCodeWhatsAppReceipt({
          toPhone: targetPhone,
          memberName: memberName || 'Member',
          txHash: hash,
          explorerUrl: `https://testnet.algoexplorer.io/tx/${hash}`,
          qrDataUrl,
        });
        whatsapp = {
          attempted: true,
          sent: true,
          messageSid: delivery.messageSid,
          mediaUrl: delivery.mediaUrl,
          status: delivery.twilioStatus,
        };
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : 'Failed to send WhatsApp message';
        whatsapp = {
          attempted: true,
          sent: false,
          error: errMessage,
        };
      }
    }

    res.json({
      success: true,
      data: {
        txHash: hash,
        qrCode: qrDataUrl,
        payload: JSON.parse(qrPayload),
        explorerUrl: `https://testnet.algoexplorer.io/tx/${hash}`,
        walletDeepLink,
        whatsapp,
        message: whatsapp.sent
          ? '✅ QR proof generated and sent to member on WhatsApp.'
          : '✅ QR proof generated. Share this with any bank officer to verify offline.',
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

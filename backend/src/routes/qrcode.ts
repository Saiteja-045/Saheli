import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
<<<<<<< HEAD
import { verifyTransaction, generateTxHash } from '../services/txEngine';
=======
import { verifyTransaction, generateTxHash, registerTransactionLifecycle } from '../services/algorand';
import { members } from '../data/mockData';
>>>>>>> 6cd127775d3326dac72f1b349e2afe7f4ac32378
import { sendQRCodeWhatsAppReceipt } from '../services/whatsapp';
import mongoose from 'mongoose';
import User from '../models/User';

const router = Router();

// POST /api/qr/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      transactionId,
      memberId,
      memberName,
      memberPhone,
      amount,
      type,
      autoSendWhatsApp = true,
    } = req.body;

<<<<<<< HEAD
    const hash = transactionId || generateTxHash();
    let resolvedMemberName = memberName;
    let resolvedPhone = memberPhone;

    if ((!resolvedMemberName || !resolvedPhone) && memberId && mongoose.Types.ObjectId.isValid(memberId)) {
      const member = await User.findById(memberId).select('name phone role').lean();
      if (member && member.role === 'member') {
        resolvedMemberName = resolvedMemberName || member.name;
        resolvedPhone = resolvedPhone || member.phone;
      }
    }
=======
    const hash = txHash || generateTxHash();
    registerTransactionLifecycle({
      txHash: hash,
      type: type || 'identity_proof',
      amount: Number(amount || 0),
      initialStatus: 'confirmed',
      autoConfirm: false,
    });
    const walletDeepLink = walletAddress
      ? `algorand://${walletAddress}?note=${encodeURIComponent(`saheli:${hash}`)}`
      : `https://perawallet.app/`;
>>>>>>> 6cd127775d3326dac72f1b349e2afe7f4ac32378

    // Build the QR payload — this is what gets embedded in the QR code
    const qrPayload = JSON.stringify({
      platform: 'Saheli',
      transactionId: hash,
      memberId: memberId || undefined,
      memberName: resolvedMemberName || 'Member',
      amount,
      type: type || 'deposit',
      verified: true,
      verifyUrl: `/api/qr/verify/${hash}`,
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

    const targetPhone = resolvedPhone;

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
          memberName: resolvedMemberName || 'Member',
          transactionId: hash,
          explorerUrl: `/api/qr/verify/${hash}`,
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
        transactionId: hash,
        qrCode: qrDataUrl,
        payload: JSON.parse(qrPayload),
        whatsapp,
        message: whatsapp.sent
          ? '✅ QR proof generated and sent to member on WhatsApp.'
          : '✅ QR proof generated. Share this with any bank officer to verify.',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'QR generation failed' });
  }
});

<<<<<<< HEAD
// GET /api/qr/verify/:transactionId
router.get('/verify/:transactionId', async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  const result = await verifyTransaction(transactionId);
=======
// GET /api/qr/verify/:txHash
router.get('/verify/:txHash', async (req: Request, res: Response) => {
  const { txHash } = req.params;
  const result = await verifyTransaction(txHash);
>>>>>>> 6cd127775d3326dac72f1b349e2afe7f4ac32378

  res.json({
    success: true,
    data: {
      transactionId,
      ...result,
      message: result.valid
        ? '✅ Transaction verified successfully'
        : '❌ Transaction not found',
    },
  });
});

export default router;

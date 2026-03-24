import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { aiLog, treasuryStats, AILogEntry } from '../data/mockData';
import { generateTxHash } from '../services/algorand';
import { processEmergencyLoan } from '../services/agentEngine';
import mongoose from 'mongoose';
import User from '../models/User';
import Transaction from '../models/Transaction';

const router = Router();

const mutableLog: AILogEntry[] = [...aiLog];

async function generateOpenAIWhatsAppReply(args: {
  message: string;
  memberName: string;
}): Promise<string | null> {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return null;
  }

  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: [
              'You are Saheli AI, a WhatsApp assistant for Women SHG finance users in India.',
              'Keep replies practical, polite, and short (max 120 words).',
              'If user asks about deposits/withdrawals/loans/balance/QR, guide them with exact next action phrase.',
              'Never invent transaction IDs or balances.',
            ].join(' '),
          },
          {
            role: 'user',
            content: `Member: ${args.memberName}\nMessage: ${args.message}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch {
    return null;
  }
}

// Intents the AI agent can parse from WhatsApp messages
function parseIntent(message: string): {
  intent: 'deposit' | 'withdraw' | 'loan' | 'balance' | 'qr' | 'unknown';
  amount?: number;
  purpose?: string;
} {
  const lower = message.toLowerCase();

  // Extract amount
  const amountMatch = lower.match(/(\d[\d,]*)\s*(rupees?|rs\.?|₹)/i) ||
    lower.match(/(₹)\s*(\d[\d,]*)/i) ||
    lower.match(/(\d[\d,]+)/);
  const amount = amountMatch ? parseInt(amountMatch[0].replace(/[^\d]/g, '')) : undefined;

  if (/deposit|save|jama|jamaa|डिपॉजिट|save money/i.test(lower)) {
    return { intent: 'deposit', amount };
  }
  if (/withdraw|nikalo|निकाल|take out|cash out/i.test(lower)) {
    return { intent: 'withdraw', amount };
  }
  if (/loan|borrow|urgent|emergency|need money|medical|hospital|दवाई|उधार|accident|health/i.test(lower)) {
    const purposeMatch = lower.match(/for\s+(.+?)(?:\s*\.|$)/i);
    const isEmergency = /urgent|emergency|medical|hospital|accident|health/i.test(lower);
    return {
      intent: 'loan',
      amount,
      purpose: purposeMatch ? purposeMatch[1] : (isEmergency ? 'emergency medical' : 'general purpose'),
    };
  }
  if (/balance|kitna|कितना|how much|savings/i.test(lower)) {
    return { intent: 'balance' };
  }
  if (/qr|certificate|proof|verify/i.test(lower)) {
    return { intent: 'qr' };
  }

  return { intent: 'unknown' };
}

async function buildAgentResponse(
  intent: ReturnType<typeof parseIntent>,
  memberName = 'Lakshmi',
  memberId = 'm1',
): Promise<{
  reply: string;
  action?: string;
  txHash?: string;
  amount?: number;
  showQR?: boolean;
}> {
  const txHash = generateTxHash();

  switch (intent.intent) {
    case 'deposit': {
      const amt = intent.amount || 500;
      // Add to AI log
      mutableLog.unshift({
        id: uuidv4(),
        type: 'sync',
        icon: 'CheckCircle2',
        title: `Deposit of ₹${amt.toLocaleString('en-IN')} by ${memberName} via WhatsApp`,
        highlight: 'Blockchain confirmed',
        timestamp: new Date().toISOString(),
        amount: amt,
      });
      return {
        reply: `✅ Done! Your deposit of *₹${amt.toLocaleString('en-IN')}* has been recorded on the Algorand blockchain.\n\n📊 New balance: ₹${(42500 + amt).toLocaleString('en-IN')}\n\n🔗 TX ID: \`${txHash.slice(0, 16)}...\`\n\n_Tap below for your QR proof receipt_`,
        action: 'deposit_confirmed',
        txHash,
        amount: amt,
        showQR: true,
      };
    }
    case 'withdraw': {
      const amt = intent.amount || 500;
      return {
        reply: `✅ Withdrawal of *₹${amt.toLocaleString('en-IN')}* initiated.\n\nPlease visit your nearest BC agent with this receipt.\n\n🔗 TX ID: \`${txHash.slice(0, 16)}...\``,
        action: 'withdraw_initiated',
        txHash,
        amount: amt,
        showQR: true,
      };
    }
    case 'loan': {
      const amt = intent.amount || 5000;
      let trustScore = 850;
      if (mongoose.Types.ObjectId.isValid(memberId)) {
        const user = await User.findById(memberId).select('trustScore');
        if (user) trustScore = user.trustScore;
      }

      const agentResult = await processEmergencyLoan({
        memberId,
        memberName,
        trustScore,
        amount: amt,
        purpose: intent.purpose || 'general purpose',
      });

      if (agentResult.autoApproved) {
        mutableLog.unshift({
          id: uuidv4(),
          type: 'loan_auto_approve',
          icon: 'Zap',
          title: `Emergency loan disbursed ₹${amt.toLocaleString('en-IN')} for ${memberName}`,
          highlight: `Score: 850/1000 · 1-of-3 override`,
          timestamp: new Date().toISOString(),
          amount: amt,
        });
        const installment = agentResult.autoRepayment?.installmentAmount || Math.ceil(amt / 6);
        return {
          reply: `🚨 *EMERGENCY LOAN DISBURSED*\n\n🤖 AI Agent activated emergency protocol:\n• SBT Score: *850/1000 (Excellent)*\n• Multi-sig threshold: *1-of-3 (Emergency Override)*\n• Amount: *₹${amt.toLocaleString('en-IN')}*\n• Purpose: ${intent.purpose}\n\n✅ Funds sent to your account in *<3 seconds*\n🔗 TX: \`${agentResult.txHash?.slice(0, 16)}...\`\n\n📅 *Auto-Repayment Scheduled:*\n₹${installment.toLocaleString('en-IN')}/month × 6 installments\nDeducted automatically from your next deposits.`,
          action: 'emergency_loan_disbursed',
          txHash: agentResult.txHash,
          amount: amt,
          showQR: true,
        };
      }
      return {
        reply: `📋 *Loan Request Received*\n\n*Amount:* ₹${amt.toLocaleString('en-IN')}\n*Purpose:* ${intent.purpose || 'General use'}\n\n🔍 SBT Score evaluated: 850/1000\n⏳ Routing to ${agentResult.threshold}-of-3 multi-sig approval\n\n_SHG leaders have been notified via WhatsApp. You'll receive confirmation shortly._`,
        action: 'loan_pending_approval',
        amount: amt,
      };
    }
    case 'balance':
      return {
        reply: `💰 *${memberName}'s Account*\n\n📈 Savings: *₹42,500*\n🤝 Active Loans: *₹12,000*\n✨ Yield Earned: *₹1,840*\n⭐ Trust Score: *850/1000 (Excellent)*\n\n_Your AI agent is investing idle funds at 4.2% APY_`,
      };
    case 'qr':
      return {
        reply: `📱 Generating your QR proof certificate...\n\nThis QR code contains your verified identity and can be scanned by any bank officer to verify your creditworthiness — no internet needed!`,
        action: 'qr_generated',
        txHash,
        showQR: true,
      };
    default:
      return {
        reply: `👋 Namaste! I'm your Saheli AI Agent.\n\nYou can say:\n• *"Deposit 500 rupees"*\n• *"I need a loan for ₹5000"*\n• *"My balance"*\n• *"Generate QR proof"*\n\n_I understand Hindi, Kannada, and Telugu too!_ 🇮🇳`,
      };
  }
}

// GET /api/ai-agent/log
router.get('/log', (_req: Request, res: Response) => {
  res.json({ success: true, data: mutableLog.slice(0, 10) });
});

// GET /api/ai-agent/suggestions
router.get('/suggestions', async (req: Request, res: Response) => {
  const { memberId } = req.query;

  const defaultSuggestions = [
    { label: '💰 Deposit savings', text: 'Deposit 500 rupees' },
    { label: '📋 Request loan', text: 'I need a loan for ₹5000' },
    { label: '📊 My balance', text: 'My balance' },
    { label: '📱 Generate QR proof', text: 'Generate QR proof' },
  ];

  if (!memberId || typeof memberId !== 'string' || !mongoose.Types.ObjectId.isValid(memberId)) {
    res.json({ success: true, data: defaultSuggestions });
    return;
  }

  const [user, latestTx, pendingLoan] = await Promise.all([
    User.findById(memberId).select('totalSavings activeLoans trustScore').lean(),
    Transaction.findOne({ user: memberId }).sort({ createdAt: -1 }).lean(),
    User.findById(memberId).select('activeLoans').lean(),
  ]);

  if (!user) {
    res.json({ success: true, data: defaultSuggestions });
    return;
  }

  const suggestions = [] as Array<{ label: string; text: string }>;

  if ((pendingLoan?.activeLoans || 0) > 0) {
    suggestions.push({ label: '📌 Loan status', text: 'Check my loan status' });
  }

  if ((user.totalSavings || 0) < 1000) {
    suggestions.push({ label: '💰 Add weekly savings', text: 'Deposit 500 rupees' });
  }

  const lastTxAgeDays = latestTx?.createdAt
    ? Math.floor((Date.now() - new Date(latestTx.createdAt).getTime()) / (24 * 60 * 60 * 1000))
    : 999;
  if (lastTxAgeDays > 30) {
    suggestions.push({ label: '🔄 Sync new deposit', text: 'Deposit 1000 rupees' });
  }

  if ((user.trustScore || 0) >= 800) {
    suggestions.push({ label: '🚨 Emergency ₹8000 hospital', text: 'Emergency 8000 rupees for hospital' });
  }

  suggestions.push({ label: '📊 My balance', text: 'My balance' });
  suggestions.push({ label: '📱 Generate QR proof', text: 'Generate QR proof' });

  res.json({ success: true, data: suggestions.slice(0, 5) });
});

// GET /api/ai-agent/insights
router.get('/insights', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      treasuryStats,
      insights: [
        {
          type: 'yield_opportunity',
          title: 'Idle Fund Opportunity',
          body: `₹${(50000).toLocaleString('en-IN')} is currently idle. Recommend deploying to Folks Finance vault for 4.2% APY.`,
          action: 'deploy_funds',
          priority: 'high',
        },
        {
          type: 'repayment_reminder',
          title: 'Upcoming Repayments',
          body: '3 members have loan installments due this week. AI will send WhatsApp reminders.',
          action: 'send_reminders',
          priority: 'medium',
        },
        {
          type: 'score_update',
          title: 'Trust Score Update',
          body: 'Lakshmi Devi\'s SBT score improved to 850 after consistent 6-month repayment streak.',
          priority: 'low',
        },
      ],
    },
  });
});

// POST /api/ai-agent/chat (WhatsApp message parsing)
router.post('/chat', async (req: Request, res: Response) => {
  const { message, memberId = 'm1', memberName = 'Lakshmi' } = req.body;

  if (!message) {
    res.status(400).json({ success: false, error: 'message is required' });
    return;
  }

  // Simulate a short processing delay acknowledgment
  const intent = parseIntent(message);
  const response = await buildAgentResponse(intent, memberName, memberId);

  // For free-form WhatsApp queries, try a real LLM response and keep deterministic fallback.
  if (intent.intent === 'unknown') {
    const llmReply = await generateOpenAIWhatsAppReply({
      message,
      memberName,
    });
    if (llmReply) {
      response.reply = llmReply;
    }
  }

  // Log the interaction
  console.log(`[AI Agent] Member: ${memberName} | Intent: ${intent.intent} | Message: "${message}"`);

  res.json({
    success: true,
    data: {
      memberId,
      originalMessage: message,
      detectedIntent: intent.intent,
      detectedAmount: intent.amount,
      aiProvider: intent.intent === 'unknown' && process.env.OPENAI_API_KEY ? 'openai+fallback' : 'rules',
      ...response,
    },
  });
});

export default router;

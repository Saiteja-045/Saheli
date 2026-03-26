import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/db';
import { initializeAgentState } from './services/agentEngine';

dotenv.config();

// Connect to MongoDB
connectDB();
initializeAgentState().catch(err => {
  console.error('Failed to initialize agent state:', err.message);
});

import authRouter from './routes/auth';
import membersRouter from './routes/members';
import transactionsRouter from './routes/transactions';
import loansRouter from './routes/loans';
import multisigRouter from './routes/multisig';
import aiAgentRouter from './routes/aiAgent';
import qrcodeRouter from './routes/qrcode';
import statsRouter from './routes/stats';
import agentRouter from './routes/agent';

const app = express();
const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 3001);
const FRONTEND_DIST_PATH = process.env.FRONTEND_DIST_PATH || path.resolve(__dirname, '../../app/dist');

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000');
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTwimlMessage(message: string) {
  const safe = escapeXml(message).slice(0, 1500);
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}

async function transcribeTwilioAudio(mediaUrl: string, contentType?: string): Promise<string | null> {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey || !mediaUrl) {
    return null;
  }

  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const authHeaders: Record<string, string> = {};
    if (twilioSid && twilioToken) {
      authHeaders.Authorization = `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`;
    }

    const mediaRes = await fetch(mediaUrl, { headers: authHeaders });
    if (!mediaRes.ok) {
      return null;
    }

    const audioBuffer = Buffer.from(await mediaRes.arrayBuffer());
    const form = new FormData();
    form.append('model', 'whisper-1');
    form.append('file', new Blob([audioBuffer], { type: contentType || 'audio/ogg' }), 'voice-note.ogg');

    const transcribeRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: form,
    });

    if (!transcribeRes.ok) {
      return null;
    }

    const json = await transcribeRes.json() as { text?: string };
    return json.text?.trim() || null;
  } catch {
    return null;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/loans', loansRouter);
app.use('/api/multisig', multisigRouter);
app.use('/api/ai-agent', aiAgentRouter);
app.use('/api/qr', qrcodeRouter);
app.use('/api/stats', statsRouter);
app.use('/api/agent', agentRouter);

if (fs.existsSync(FRONTEND_DIST_PATH)) {
  app.use(express.static(FRONTEND_DIST_PATH));
}

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Saheli Saheli API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET  /api/members',
      'GET  /api/members/:id',
      'GET  /api/transactions',
      'POST /api/transactions',
      'GET  /api/loans',
      'POST /api/loans/request',
      'POST /api/loans/:id/approve',
      'GET  /api/multisig/pending',
      'POST /api/multisig/:id/sign',
      'GET  /api/ai-agent/log',
      'POST /api/ai-agent/chat',
      'POST /api/qr/generate',
      'GET  /api/qr/verify/:transactionId',
      'GET  /api/stats/treasury',
      'GET  /api/stats/institutional',
      'GET  /api/stats/shg-directory',
    ],
  });
});

// ─── Twilio WhatsApp Webhook (for production integration) ─────────────────
app.post('/webhook/whatsapp', async (req, res) => {
  const {
    Body,
    From,
    ProfileName,
    NumMedia,
    MediaUrl0,
    MediaContentType0,
  } = req.body;

  let incomingMessage: string = (Body || '').trim();
  const hasAudio = Number(NumMedia || 0) > 0 && /^audio\//i.test(MediaContentType0 || '');

  if (!incomingMessage && hasAudio) {
    const transcript = await transcribeTwilioAudio(MediaUrl0, MediaContentType0);
    if (transcript) {
      incomingMessage = transcript;
    }
  }

  if (!incomingMessage) {
    res.set('Content-Type', 'text/xml');
    res.send(buildTwimlMessage('I received your voice note, but transcription is unavailable right now. Please send the request as text or configure OPENAI_API_KEY for voice support.'));
    return;
  }

  console.log(`[WhatsApp Webhook] From: ${From} | Message: ${incomingMessage}`);

  let reply = 'Processing your request...';
  try {
    const aiRes = await fetch(`http://127.0.0.1:${PORT}/api/ai-agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: incomingMessage,
        memberName: ProfileName || 'SHG Member',
      }),
    });
    const json = await aiRes.json() as any;
    const agentData = json?.data;
    if (agentData?.reply) {
      reply = agentData.reply;
      if (agentData.txHash) {
        reply += `\n\nRef: ${agentData.txHash}`;
      }
    }
  } catch {
    reply = 'Service temporarily unavailable. Please try again in a few moments.';
  }

  res.set('Content-Type', 'text/xml');
  res.send(buildTwimlMessage(reply));
});

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  if (!_req.path.startsWith('/api') && !_req.path.startsWith('/webhook') && fs.existsSync(FRONTEND_DIST_PATH)) {
    res.sendFile(path.join(FRONTEND_DIST_PATH, 'index.html'));
    return;
  }
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ─── Start ──────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n Saheli Saheli API running on http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\nShutting down server gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Safety net: catch port-in-use errors early
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use. Please kill the stale process and restart.`);
    console.error('   Run: npx kill-port ' + PORT);
    process.exit(1);
  } else {
    throw err;
  }
});

export default app;

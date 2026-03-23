import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';

dotenv.config();

// Connect to MongoDB
connectDB();

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
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
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
      'GET  /api/qr/verify/:txHash',
      'GET  /api/stats/treasury',
      'GET  /api/stats/institutional',
      'GET  /api/stats/shg-directory',
    ],
  });
});

// ─── Twilio WhatsApp Webhook (for production integration) ─────────────────
app.post('/webhook/whatsapp', (req, res) => {
  const { Body, From } = req.body;
  console.log(`[WhatsApp Webhook] From: ${From} | Message: ${Body}`);
  // In production: parse intent via /api/ai-agent/chat and send Twilio reply
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Processing your request...</Message></Response>`);
});

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
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

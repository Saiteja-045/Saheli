# SHG Chain (Saheli)

Agentic AI and Algorand-powered financial hub for Women Self-Help Groups (SHGs).

Built for hackathon demonstration under the themes:
- Blockchain with Algorand
- Agentic AI x Blockchain

## Executive Summary

SHG Chain digitizes SHG savings, loans, and trust records using an auditable blockchain-first architecture with a WhatsApp-first user experience.

The platform addresses common SHG pain points:
- Manual bookkeeping errors
- Low transparency in pooled funds
- Slow emergency loan processing
- Limited institutional credit visibility
- Rural onboarding friction due to app complexity

The project combines:
- WhatsApp voice/text interactions
- AI-driven treasury and loan workflows
- Multi-role web dashboards (Member, Leader, Bank/NGO)
- QR-based offline verification proofs
- Optional Twilio + Cloudinary integration for automatic WhatsApp QR delivery

## Problem Statement

Large numbers of women in SHGs rely on collective savings and micro-credit but face trust, auditability, and formal credit access barriers. Traditional records are easy to dispute and difficult for banks/NGOs to verify quickly.

## Solution

SHG Chain creates a digital financial layer where transactions and reputation signals are verifiable, role-governed, and accessible through familiar channels like WhatsApp.

Core design goals:
- Make Web3 invisible to end users
- Keep verification strong for institutions
- Automate repetitive treasury and repayment workflows
- Keep the demo reliable under hackathon constraints

## Feature Set

### Must-Have Features

1. WhatsApp-first text and voice flow
- Backend webhook endpoint receives WhatsApp messages
- Voice notes can be transcribed using OpenAI Whisper (when configured)
- Intent parsing supports deposit, withdrawal, loan, balance, and QR requests

2. Agentic micro-loan flow
- Emergency and micro-loan logic in AI/agent routes
- Leader approval is enforced before final loan QR generation in dashboard flow
- Auto-repayment schedules are tracked and exposed via API

3. AI-driven idle fund management
- Simulated vault deployment and yield harvesting through agent routes
- Leader dashboard includes invest/harvest controls and terminal log

4. Offline-first QR proof system
- QR payload contains transaction metadata and explorer verification reference
- Verification endpoint available for scan-side checks
- Optional wallet deep link included in QR payload

5. Role-based web portals
- Member dashboard: passport, activity, loan request, auto-repayment, support/settings
- Leader dashboard: treasury controls, approvals, reports, loan queue, QR generation
- Bank dashboard: scanner flow, SHG directory, grant approval, ledger monitoring

### Wow-Factor Extensions Included in This Repo

- Dynamic trust-score style passport surfaces (d-SBT concept represented in UI and data model)
- Gasless interaction pattern for member-side loan requests (relayer-style backend flow)
- Multi-sig approval workflows for sensitive actions
- WhatsApp QR proof auto-delivery using Twilio + Cloudinary

## Current Implementation Notes

This codebase is optimized for a working hackathon demo:
- Several blockchain actions are represented with realistic mocked Algorand transaction hashes and explorer links
- Agent behavior is implemented as deterministic/simulated logic in backend services for stable demo results
- Twilio and Cloudinary flows are real API integrations and work when credentials are configured

## Technical Architecture

### Frontend
- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn-style UI components
- GSAP-based motion and dashboard transitions
- Pera wallet connect integration for wallet UX

### Backend
- Node.js + Express + TypeScript
- MongoDB via Mongoose
- JWT auth and role-aware data routing
- AI/agent workflow endpoints
- Twilio webhook handling for WhatsApp
- Cloudinary upload for QR media hosting

### Blockchain Layer
- Algorand SDK dependency included
- Transaction/hash interactions abstracted for demo reliability
- QR verification URLs point to Algorand explorer patterns

## Repository Structure

```
.
|- app/         # React frontend
|  |- src/
|  |  |- components/
|  |  |- dashboards/
|  |  |- contexts/
|  |  |- hooks/
|  |  |- lib/
|- backend/     # Express API
|  |- src/
|  |  |- routes/
|  |  |- services/
|  |  |- models/
|  |  |- middleware/
|  |  |- config/
```

## Local Setup

### Prerequisites
- Node.js 20+
- npm
- MongoDB (local or remote)

### 1) Install dependencies

From project root:

```bash
cd app && npm install
cd ../backend && npm install
```

### 2) Configure backend environment

Copy and edit:

```bash
cd backend
cp .env.example .env
```

Minimum required for local run:
- PORT
- NODE_ENV
- MONGODB_URI (optional if using default local fallback)

For WhatsApp + QR media delivery:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_WHATSAPP_FROM (or TWILIO_WHATSAPP_NUMBER)
- CLOUDINARY_CLOUD_NAME
- Either CLOUDINARY_UPLOAD_PRESET, or CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET

Optional voice transcription:
- OPENAI_API_KEY

### 3) Run backend

```bash
cd backend
npm run dev
```

Backend health:
- http://127.0.0.1:3001/health

### 4) Run frontend

```bash
cd app
npm run dev
```

Frontend runs on Vite default and proxies /api to backend (127.0.0.1:3001).

## Demo User Seeding (Judging Panel)

Seed endpoint:
- POST /api/auth/seed-demo

PowerShell example:

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:3001/api/auth/seed-demo"
```

Demo credentials:
- Member: +91-9876543210
- Leader: +91-9000000001
- Bank: +91-9000000002
- Password: demo1234

## WhatsApp Integration

### Incoming WhatsApp messages
- Endpoint: POST /webhook/whatsapp
- Supports text and media payload handling
- If media is audio and OPENAI_API_KEY is set, backend attempts transcription
- Parsed intent is forwarded to the AI chat route

### Automatic QR delivery to member WhatsApp
- Triggered by QR generation route: POST /api/qr/generate
- Backend flow:
	1. Generate QR as data URL
	2. Upload image to Cloudinary
	3. Send Twilio WhatsApp media message with proof details and QR image
- Response includes delivery metadata:
	- attempted
	- sent
	- messageSid
	- mediaUrl
	- error (if failed)

## Primary API Areas

- Auth: /api/auth
	- register, login, profile, seed-demo
- Members: /api/members
- Transactions: /api/transactions
- Loans: /api/loans
- Multi-sig: /api/multisig
- AI Chat/Insights: /api/ai-agent
- Autonomous Agent: /api/agent
- QR: /api/qr
- Stats and institutional views: /api/stats

## Product Flows (Demo)

### Flow 1: Member QR Proof
1. Member generates QR in dashboard
2. QR payload is created with tx metadata
3. System attempts Cloudinary upload and Twilio WhatsApp send
4. Member receives QR proof in WhatsApp (when configured)

### Flow 2: Emergency/Micro Loan Lifecycle
1. Member requests loan from member experience
2. Backend evaluates risk and threshold policy
3. Leader approves in loan queue
4. Loan becomes approved and QR can be generated

### Flow 3: Institutional Verification
1. Bank dashboard opens scanner flow
2. TX hash / payload is verified through QR verify endpoint
3. Institution views ledger and SHG trust context

## Build and Quality Checks

Frontend:

```bash
cd app
npm run build
```

Backend:

```bash
cd backend
npm run build
```

## Known Demo Constraints

- Some blockchain operations are intentionally mocked for deterministic judging demos
- Twilio WhatsApp delivery requires valid sender setup and approved destination policy
- Cloudinary delivery requires working cloud credentials or upload preset

## Pitch Positioning (Suggested)

"We made Web3 invisible. Rural women interact via WhatsApp voice/text, while institutions get auditable on-chain proofs, governed approvals, and AI-assisted treasury intelligence."

## Team Notes

If you are presenting this project live:
- Keep backend and frontend pre-warmed before demo
- Seed demo users before judge login walkthrough
- Keep Twilio and Cloudinary credentials validated in advance
- Use the member QR generation flow to showcase instant WhatsApp proof delivery



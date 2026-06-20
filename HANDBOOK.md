# PayFlow — Handoff Document

## What is PayFlow?
Smart Payment Orchestration platform. Routes payments through the best processor (Stripe, PayPal, etc.) based on cost, success rate, and availability. ML-ready Smart Router v1 (rule-based) is built. MVP is functional in local mode.

## Current State ✅ Done
- Monorepo (packages/shared, payflow-sdk, payflow-server, payflow-dashboard)
- Smart Router v1 (rule-based: cost + success rate + availability + fallback)
- Stripe + PayPal adapters with local simulation mode (no API keys needed)
- Fastify REST API (POST /api/charge, POST /api/merchants, GET /api/transactions, GET /api/health)
- React + Vite dashboard (3 tabs: Payment form + transaction log, Savings calculator, Compare table)
- Landing page with trust bar, features, comparison, FAQ, waitlist CTA
- 7 unit tests passing, TypeScript compiles clean
- Git repo initialized on GitHub: https://github.com/alejodurazo1-cpu/payflow

## 🔴 What's Missing to Launch

### 1. Deploy API to Render (blocked by user — needs credit card auth)
- User paused at credit card verification step on Render.com
- render.yaml is configured and pushed to GitHub
- To deploy: visit https://dashboard.render.com → New Web Service → connect GitHub → select `alejodurazo1-cpu/payflow` → Render auto-detects render.yaml → Deploy
- Start command: `npx tsx packages/payflow-server/src/index.ts`
- Free tier sleeps after 15 min idle, first request after sleep takes ~30s

### 2. Deploy Frontend to Vercel (alternative if no Render)
- Build command: `cd packages/payflow-dashboard && npm run build`
- Output dir: `packages/payflow-dashboard/dist`
- Environment variable: `VITE_API_URL` pointing to Render or local API
- Vercel auto-deploys from GitHub on push

### 3. Production Data Persistence
- Currently transactions stored in memory (lost on restart)
- Need SQLite or PostgreSQL for persistence
- Add Drizzle ORM or Prisma
- Easy option: SQLite with better-sqlite3 (no server needed, file-based)

### 4. Stripe Connect Setup for Monetization
- Create Stripe account (free)
- Enable Stripe Connect platform mode
- Configure markup (admin takes 0.3-0.5% on top of processor fee)
- Set up merchant onboarding flow
- See Monetization section below for full strategy

### 5. Waitlist Email Capture
- Formspree or Mailchimp for waitlist on landing page
- Currently the form submits to placeholder `#`

### 6. Custom Domain
- Render provides `*.onrender.com` for free
- Vercel provides `*.vercel.app` for free
- Custom domain requires DNS config

### 7. Smart Router v2 — ML Upgrade
- Current v1 is rule-based (static weights for cost + success + availability)
- v2 would use historical transaction data to train a lightweight ML model
- Could use TensorFlow.js or a simple logistic regression

## Monetization Strategy
- **SaaS subscription**: $29/mo per merchant (dashboard access, analytics, routing rules)
- **Transaction markup**: 0.3-0.5% on each processed transaction (via Stripe Connect)
- **Freemium**: Free tier with basic routing, paid tier with ML routing + advanced analytics
- Admin never handles money directly — Stripe Connect handles KYC, AML, PCI compliance

## Architecture Details
- **Port**: 3001 (configurable via PORT env)
- **Local mode**: `PAYFLOW_MODE=local` — simulates all transactions, no API keys needed
- **Live mode**: `PAYFLOW_MODE=live` — requires real Stripe/PayPal API keys
- Default merchant created on startup: `merchant_1` (Demo Merchant, maxFeeRate 3.5%)

## Key Files
| File | Purpose |
|------|---------|
| `packages/payflow-sdk/src/router/smart-router.ts` | Smart Router v1 engine |
| `packages/payflow-sdk/src/client.ts` | Unified client (register merchants, process payments, get transactions) |
| `packages/payflow-server/src/index.ts` | Fastify API server + static file serving |
| `packages/payflow-dashboard/src/App.tsx` | React dashboard |
| `index.html` | Landing page (public, SEO-friendly) |
| `render.yaml` | Render deployment config |
| `.github/workflows/deploy.yml` | CI workflow (test + typecheck on push) |

## Environment Variables
```env
PAYFLOW_MODE=local       # 'local' or 'live'
PORT=3001
STRIPE_SECRET_KEY=sk_test_placeholder
PAYPAL_CLIENT_ID=test
PAYPAL_SECRET=test
```

## Running Locally
```bash
# Start everything
.\start-payflow.ps1

# Or manually:
npm run dev -w packages/payflow-server   # API on :3001
npm run dev -w packages/payflow-dashboard # Dashboard on :5173
```

## Testing
```bash
npm test          # 7 tests total
npx tsc --noEmit  # TypeScript check
```

## SDK (published as open source via GitHub)
- `packages/payflow-sdk/` — published as @payflow/sdk
- Other devs can install via: `npm install @payflow/sdk`
- They register their merchant config, then call `client.processPayment(request)`
- Smart Router automatically selects best processor

## Contact / Credentials
- GitHub: alejodurazo1-cpu / payflow
- GitHub token: stored in environment, scopes: repo + workflow
- No other accounts created yet (no Render, Vercel, Stripe)

## Next Agent Instructions
1. Resume by asking user if they want to proceed with Render deployment or use Vercel
2. If Render chosen: go to https://dashboard.render.com, connect GitHub, deploy from render.yaml
3. If Vercel chosen: go to https://vercel.com, import GitHub repo, set build/output config for payflow-dashboard
4. For persistence: add SQLite + Drizzle ORM in 1-2 hours of work
5. For Stripe Connect: create Stripe account, enable Connect, add markup logic (2-3 hours)
6. Run `npm test && npx tsc --noEmit` before any new commit
7. The .gitignore has patterns for compiled .js/.d.ts in src/ — keep them clean

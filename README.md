# Intraday Scout — Real-Time Stock Research & Analysis

AI-powered stock screening tool that identifies intraday trading candidates with unusual volume in the $5–$20 price range.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLIENT (React)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │CandidateList│ │DetailPanel│ │  Charts/News    │ │
│  └─────┬────┘ └─────┬────┘ └────────┬─────────┘ │
│        └────────────┼───────────────┘            │
│                     │ SSE + REST                 │
├─────────────────────┼───────────────────────────┤
│                  SERVER (Express)                │
│  ┌─────────┐  ┌─────────┐  ┌───────────────┐   │
│  │ API Routes│  │ Screener│  │  Cron Scheduler│   │
│  └────┬────┘  └────┬────┘  └───────┬───────┘   │
│       │            │               │            │
│  ┌────┴────────────┴───────────────┴──────┐     │
│  │           Service Layer                 │     │
│  │  Polygon · Yahoo · Finnhub · Claude AI  │     │
│  └────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────┐   │
│  │  Cache (node-cache) · Request Queue       │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js v20+
- API keys: [Polygon.io](https://polygon.io), [Finnhub.io](https://finnhub.io), [Anthropic](https://console.anthropic.com)

### Setup

```bash
# Clone the repo
git clone <your-repo-url>
cd stock-picker-app

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Install dependencies
npm run install:all

# Development (runs both server and client)
npm run dev

# Production build
npm run build
npm start
```

### API Keys

| Service | URL | Free Tier | Env Var |
|---------|-----|-----------|---------|
| Polygon.io | https://polygon.io/dashboard/signup | 5 calls/min (EOD only) | `POLYGON_API_KEY` |
| Finnhub.io | https://finnhub.io/register | 60 calls/min | `FINNHUB_API_KEY` |
| Anthropic | https://console.anthropic.com | Pay-per-use | `ANTHROPIC_API_KEY` |

> **Note:** Polygon.io free tier does not include real-time data or the snapshot endpoint. The app falls back to Yahoo Finance automatically when Polygon data is unavailable.

## Deployment

### Railway (Recommended)
1. Connect your GitHub repo at [railway.app](https://railway.app)
2. Set environment variables in the Railway dashboard
3. Railway auto-deploys on push to `main`

### Render
1. Connect your repo at [render.com](https://render.com)
2. The `render.yaml` blueprint configures the service automatically
3. Set API keys in the Render dashboard under Environment

### Docker
```bash
docker build -t intraday-scout .
docker run -p 3001:3001 --env-file .env intraday-scout
```

## Project Structure

```
stock-picker-app/
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── components/     # UI components
│       ├── hooks/          # Custom hooks (SSE, API)
│       └── types/          # TypeScript types
├── server/                 # Express backend
│   └── src/
│       ├── services/       # API integrations
│       ├── routes/         # Express routes
│       ├── types/          # TypeScript types
│       ├── utils/          # Cache, request queue
│       ├── indicators.ts   # Technical analysis
│       ├── screener.ts     # Screening pipeline
│       └── index.ts        # Entry point
├── .env.example            # Environment template
├── railway.toml            # Railway config
├── render.yaml             # Render config
├── Dockerfile              # Container config
└── .github/workflows/      # CI/CD
```

## Disclaimer

Intraday Scout is for informational and educational purposes only. Nothing on this platform constitutes financial advice. Always conduct your own due diligence.

# Architecture — Intraday Scout

## Data Flow

```
Market Opens (9:30 ET)
        │
        ▼
┌─────────────────┐
│ Cron Trigger     │  Every 5 min during market hours
│ (node-cron)      │
└────────┬────────┘
         ▼
┌─────────────────┐
│ StockScreener    │  screener.ts — Full Pipeline
│                  │
│ 1. Universe Fetch│◄── Polygon Snapshot API (or Yahoo fallback)
│ 2. Price Filter  │    $5–$20 range
│ 3. Volume Filter │    Volume Ratio ≥ 2.0x, min 500K shares
│ 4. Liquidity     │    Spread ≤ 2%, NYSE/NASDAQ/AMEX only
│ 5. Sort & Rank   │    Top 20 by volume ratio
│ 6. Enrich        │◄── Polygon bars, Finnhub news, Claude AI
│ 7. Score         │    Composite Scout Score (0–100)
└────────┬────────┘
         ▼
┌─────────────────┐
│ In-Memory Cache  │  node-cache with TTL per data type
│                  │  AI results: 10 min TTL
│                  │  Price data: 1-2 min TTL
│                  │  News: 5 min TTL
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│REST API│ │  SSE   │  Push updates to connected clients
└────────┘ └────────┘
```

## Component Map

### Server Services
| Module | Source | Rate Limit | Cache TTL |
|--------|--------|------------|-----------|
| `polygon.ts` | Polygon.io REST | 5/min (free) or unlimited (paid) | 60–120s |
| `yahooFinance.ts` | yahoo-finance2 npm | Unofficial, ~2000/hr | 60–120s |
| `finnhub.ts` | Finnhub REST | 60/min | 300s |
| `claude.ts` | Anthropic API | Pay-per-use | 600s |

### Frontend Components
| Component | Purpose |
|-----------|---------|
| `Navbar` | Market clock, status, refresh button |
| `CandidateList` | Sortable/filterable list of top 10 |
| `CandidateCard` | Compact card with key metrics |
| `DetailPanel` | Full analysis view for selected stock |
| `PriceChart` | Intraday sparkline with VWAP/EMA overlays |
| `VolumeChart` | Bar chart with average volume reference line |
| `AlertBanner` | Notification for new candidates |
| `Disclaimer` | Legal disclaimer footer |

## Caching Strategy

All caching uses `node-cache` (in-memory).

- **Snapshots:** 120s — bulk market data refreshes slowly
- **Intraday bars:** 60s — needs to be fairly fresh during market hours
- **Ticker details:** 86400s (24h) — company info rarely changes
- **News articles:** 300s — news is semi-static within 5 min
- **AI analysis:** 600s (10 min) — conserves API credits, analysis changes slowly
- **Screener results:** 600s — full pipeline results as fallback

## Rate Limit Management

Each service uses a `RequestQueue` with configurable inter-request delay:

| Service | Delay | Purpose |
|---------|-------|---------|
| Polygon | 250ms | Stay within 5 req/min on free tier |
| Finnhub | 200ms | Stay within 60 req/min |
| Claude | 500ms | Prevent burst spending |

Queues process requests sequentially with the configured delay between each. Pending requests are logged.

## Scout Score Formula

```
Scout Score (0–100) = Volume (40%) + RSI (20%) + News (20%) + AI (20%)

Volume:  normalize ratio 2x–10x → 0–40 points
RSI:     50–70 = 20pts, 40–50 = 12pts, 70–80 = 10pts, else = 4pts
News:    base 10, +2 per positive, -2 per negative, clamped 0–20
AI:      (confidence / 10) × 20
```

# API Documentation — Intraday Scout

Base URL: `http://localhost:3001` (development) or your deployed URL.

## Endpoints

### GET /api/health

Health check with server time and market status.

**Response:**
```json
{
  "status": "ok",
  "serverTime": "2024-01-15T14:30:00.000Z",
  "marketStatus": {
    "isOpen": true,
    "currentTime": "09:30:00",
    "nextEvent": "4:00 PM ET",
    "message": "Market is open. Data refreshes every 5 minutes."
  },
  "candidateCount": 10,
  "lastRun": "2024-01-15T14:25:00.000Z",
  "isRunning": false
}
```

### GET /api/candidates

Returns the current top 10 Scout candidates with all enriched data.

**Response:**
```json
{
  "candidates": [
    {
      "ticker": "XYZ",
      "name": "XYZ Corp",
      "exchange": "NASDAQ",
      "sector": "Technology",
      "currentPrice": 12.50,
      "open": 11.80,
      "high": 13.00,
      "low": 11.50,
      "previousClose": 11.75,
      "change": 0.75,
      "changePercent": 6.38,
      "volume": 5000000,
      "averageVolume30d": 1200000,
      "volumeRatio": 4.17,
      "marketCap": 500000000,
      "week52High": 18.50,
      "week52Low": 5.20,
      "intradayBars": [ ... ],
      "indicators": {
        "vwap": 12.35,
        "ema20": 12.10,
        "rsi14": 62.5,
        "priceVsPriorClose": 6.38
      },
      "news": [ ... ],
      "aiAnalysis": {
        "summary": "XYZ showing strong momentum...",
        "catalyst": "Earnings beat expectations",
        "sentiment": "bullish",
        "confidence": 8,
        "risk_factors": ["Overbought RSI approaching", "Low market cap"],
        "suggested_action": "consider long",
        "reasoning": "Volume surge driven by...",
        "timestamp": "2024-01-15T14:25:00.000Z"
      },
      "scoutScore": 78,
      "lastUpdated": "2024-01-15T14:25:00.000Z"
    }
  ],
  "marketStatus": { ... },
  "lastUpdated": "2024-01-15T14:25:00.000Z",
  "count": 10
}
```

### GET /api/candidate/:ticker

Returns full detail for a single ticker.

**Response:** `{ "candidate": { ... } }` — same structure as above.

**404 Response:** `{ "error": "Ticker XYZ not found in current candidates" }`

### GET /api/news/:ticker

Returns last 48h of news for a ticker.

**Response:**
```json
{
  "ticker": "XYZ",
  "news": [
    {
      "headline": "XYZ Corp Reports Record Earnings",
      "summary": "The company exceeded analyst expectations...",
      "source": "Reuters",
      "url": "https://...",
      "publishedAt": "2024-01-15T12:00:00.000Z",
      "sentimentTag": "positive"
    }
  ],
  "count": 5
}
```

### GET /api/refresh

Manually triggers a full screener run. Rate-limited to once per minute.

**Response:** `{ "message": "Refresh started", "status": "started" }`

**429 Response:** `{ "error": "Rate limited", "message": "Please wait 45 seconds before refreshing again" }`

### GET /api/stream

Server-Sent Events endpoint. Pushes `candidate_update` events to subscribed clients.

**Event format:**
```
data: {"type":"candidate_update","candidates":[...],"timestamp":"2024-01-15T14:30:00.000Z"}
```

**Initial event on connect:**
```
data: {"type":"initial","candidates":[...],"marketStatus":{...},"lastUpdated":"..."}
```

Heartbeat sent every 30 seconds: `: heartbeat`

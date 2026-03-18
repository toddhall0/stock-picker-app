# Troubleshooting — Intraday Scout

## Common Issues

### "No candidates found" / Empty candidate list

**Cause:** Usually occurs outside market hours or when API keys are missing/invalid.

**Solutions:**
1. Check `/api/health` — verify market status and API configuration
2. During market closed hours, the app shows last cached results. If no cache exists (first run outside hours), the list will be empty.
3. Verify your Polygon API key is valid and has sufficient tier access
4. The Yahoo Finance fallback activates automatically if Polygon returns no data

### Polygon API returns 403 Forbidden

**Cause:** The snapshot endpoint (`/v2/snapshot/locale/us/markets/stocks/tickers`) requires a paid Polygon.io plan (Starter at $29/mo).

**Solution:** The app automatically falls back to Yahoo Finance's screener for universe data. You'll see this log message:
```
[Polygon] Snapshot endpoint requires paid plan. Falling back to Yahoo Finance.
```

### API Quota Exhausted

**Polygon (free tier):** 5 calls/minute. The request queue spaces calls 250ms apart, but heavy usage can still hit limits.
- Symptoms: 429 responses in server logs
- Solution: Upgrade to Polygon Starter plan or rely on Yahoo Finance fallback

**Finnhub:** 60 calls/minute. Should be sufficient for 10 candidates.
- If hit: News will be empty for some candidates. Cached results still served.

**Anthropic:** Pay-per-use, no hard rate limit.
- If key is invalid/expired: AI analysis shows "Analysis unavailable" in the UI

### Market Closed Behavior

- Between 4:00 PM and 9:30 AM ET (and weekends), the screener does NOT run
- Last cached results are served with a "Market Closed" banner
- The cron scheduler only fires during `9-15 * * 1-5` (Mon–Fri, market hours)
- Manual refresh via the UI button still works outside hours but may return stale data

### Missing Data Fallbacks

| Data Source | Primary | Fallback | When Fallback Activates |
|-------------|---------|----------|------------------------|
| Universe scan | Polygon Snapshot | Yahoo Finance Screener | Polygon returns empty/403 |
| Intraday bars | Polygon Bars | Yahoo Finance Chart | Polygon returns empty |
| Company details | Polygon Details | Yahoo Finance Quote | Polygon fails |
| News | Finnhub | (none) | Shows empty news list |
| AI Analysis | Claude API | (none) | Shows "Analysis unavailable" |

### SSE Reconnection

The frontend automatically reconnects SSE after 5 seconds on disconnect. If you see stale data:
1. Check browser DevTools → Network → EventStream for the `/api/stream` connection
2. The server sends heartbeat pings every 30 seconds
3. Hard refresh the page if SSE doesn't reconnect

### Build Failures

**Client build fails:**
```bash
cd client && npm ci && npx tsc --noEmit  # Check for type errors
```

**Server build fails:**
```bash
cd server && npm ci && npx tsc --noEmit  # Check for type errors
```

### Environment Variables Not Loading

- Local: Ensure `.env` file exists at the project root (not inside `server/` or `client/`)
- Railway: Set variables in the service's Variables tab
- Render: Set variables in the service's Environment tab
- Docker: Pass `--env-file .env` to `docker run`

### Port Conflicts

Default port is 3001. If occupied:
```bash
PORT=3002 npm start
```
Or set `PORT` in your `.env` file.

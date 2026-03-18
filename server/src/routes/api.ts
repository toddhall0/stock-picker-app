import { Router, Request, Response } from 'express';
import { getMarketStatus } from '../config';
import { screener } from '../screener';
import { fetchCompanyNews } from '../services/finnhub';

const router = Router();

// Rate limit tracker for manual refresh
let lastManualRefresh = 0;

// SSE clients
const sseClients: Set<Response> = new Set();

export function broadcastSSE(data: Record<string, unknown>): void {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// GET /api/health
router.get('/health', (_req: Request, res: Response) => {
  const market = getMarketStatus();
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    marketStatus: market,
    candidateCount: screener.getCandidates().length,
    lastRun: screener.getLastRunTime() || null,
    isRunning: screener.isScreenerRunning(),
  });
});

// GET /api/candidates
router.get('/candidates', (_req: Request, res: Response) => {
  const candidates = screener.getCandidates();
  const market = getMarketStatus();

  res.json({
    candidates,
    marketStatus: market,
    lastUpdated: screener.getLastRunTime() || null,
    count: candidates.length,
  });
});

// GET /api/candidate/:ticker
router.get('/candidate/:ticker', (req: Request, res: Response) => {
  const ticker = req.params.ticker as string;
  const candidate = screener.getCandidate(ticker.toUpperCase());

  if (!candidate) {
    res.status(404).json({ error: `Ticker ${ticker.toUpperCase()} not found in current candidates` });
    return;
  }

  res.json({ candidate });
});

// GET /api/news/:ticker
router.get('/news/:ticker', async (req: Request, res: Response) => {
  const ticker = req.params.ticker as string;
  try {
    const news = await fetchCompanyNews(ticker.toUpperCase());
    res.json({ ticker: ticker.toUpperCase(), news, count: news.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news', detail: (error as Error).message });
  }
});

// GET /api/refresh
router.get('/refresh', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (now - lastManualRefresh < 60_000) {
    const waitSeconds = Math.ceil((60_000 - (now - lastManualRefresh)) / 1000);
    res.status(429).json({
      error: 'Rate limited',
      message: `Please wait ${waitSeconds} seconds before refreshing again`,
    });
    return;
  }

  if (screener.isScreenerRunning()) {
    res.json({ message: 'Screener is already running', status: 'in_progress' });
    return;
  }

  lastManualRefresh = now;
  res.json({ message: 'Refresh started', status: 'started' });

  // Run pipeline in background — don't await
  screener.runFullPipeline().then((candidates) => {
    broadcastSSE({
      type: 'candidate_update',
      candidates,
      timestamp: new Date().toISOString(),
    });
  });
});

// GET /api/stream — SSE endpoint
router.get('/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial data
  const candidates = screener.getCandidates();
  const market = getMarketStatus();
  res.write(`data: ${JSON.stringify({
    type: 'initial',
    candidates,
    marketStatus: market,
    lastUpdated: screener.getLastRunTime(),
  })}\n\n`);

  sseClients.add(res);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 30_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

export default router;

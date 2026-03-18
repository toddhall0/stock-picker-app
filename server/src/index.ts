import express from 'express';
import cors from 'cors';
import path from 'path';
import cron from 'node-cron';
import { config, getMarketStatus } from './config.js';
import apiRouter, { broadcastSSE } from './routes/api.js';
import { screener } from './screener.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRouter);

// Serve static frontend in production
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// SPA fallback — serve index.html for non-API routes
app.get('*', (_req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).json({ message: 'Intraday Scout API is running. Frontend not built yet.' });
    }
  });
});

// Start server
app.listen(config.port, () => {
  console.log('');
  console.log('===========================================');
  console.log('  INTRADAY SCOUT — Stock Research Engine');
  console.log('===========================================');
  console.log(`  Server:    http://localhost:${config.port}`);
  console.log(`  Env:       ${config.nodeEnv}`);
  console.log(`  Polygon:   ${config.polygonApiKey ? 'configured' : 'NOT SET'}`);
  console.log(`  Finnhub:   ${config.finnhubApiKey ? 'configured' : 'NOT SET'}`);
  console.log(`  Anthropic: ${config.anthropicApiKey ? 'configured' : 'NOT SET'}`);
  console.log('===========================================');
  console.log('');

  const market = getMarketStatus();
  console.log(`  Market:    ${market.isOpen ? 'OPEN' : 'CLOSED'} — ${market.message}`);
  console.log(`  Time (ET): ${market.currentTime}`);
  console.log('');

  // Run initial pipeline
  console.log('[Startup] Running initial screener pipeline...');
  screener.runFullPipeline().then((candidates) => {
    console.log(`[Startup] Initial run complete: ${candidates.length} candidates`);
    broadcastSSE({
      type: 'candidate_update',
      candidates,
      timestamp: new Date().toISOString(),
    });
  });
});

// Cron: refresh every N minutes during market hours (Mon-Fri, 9:30-16:00 ET)
const interval = config.refreshIntervalMinutes;
cron.schedule(`*/${interval} 9-15 * * 1-5`, async () => {
  const market = getMarketStatus();
  if (!market.isOpen) return;

  console.log(`[Cron] Scheduled refresh at ${new Date().toISOString()}`);
  const candidates = await screener.runFullPipeline();
  broadcastSSE({
    type: 'candidate_update',
    candidates,
    timestamp: new Date().toISOString(),
  });
}, {
  timezone: config.marketTimezone,
});

// Also cover the 16:00 hour for the closing period
cron.schedule(`0-30/${interval} 16 * * 1-5`, async () => {
  const market = getMarketStatus();
  if (!market.isOpen) return;

  console.log(`[Cron] Closing hour refresh at ${new Date().toISOString()}`);
  const candidates = await screener.runFullPipeline();
  broadcastSSE({
    type: 'candidate_update',
    candidates,
    timestamp: new Date().toISOString(),
  });
}, {
  timezone: config.marketTimezone,
});

export default app;

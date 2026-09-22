import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { dbService } from './db/database.js';
import { logger, agentEvents } from './utils/logger.js';
import { orchestratorAgent } from './agents/orchestratorAgent.js';
import { newsletterAgent } from './agents/newsletterAgent.js';
import { brevoService } from './services/brevoService.js';
import { schedulerService } from './services/schedulerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 1. GET /api/trends - Fetch all current trends formatted for side-by-side view
app.get('/api/trends', (req, res) => {
  try {
    const globalTrends = dbService.getTracksByRegion('GLOBAL');
    const turkeyTrends = dbService.getTracksByRegion('TR');
    const stats = dbService.getStats();

    res.json({
      success: true,
      last_updated: stats.lastUpdated,
      global_trends: globalTrends,
      turkey_trends: turkeyTrends,
      stats: stats
    });
  } catch (error) {
    logger.error('System', `Failed to load trends: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/tracks/:id/like - Live Like button handler
app.post('/api/tracks/:id/like', (req, res) => {
  const { id } = req.params;
  try {
    const updatedTrack = dbService.incrementLike(id);
    if (!updatedTrack) {
      return res.status(404).json({ success: false, message: 'Şarkı bulunamadı' });
    }

    res.json({
      success: true,
      track: updatedTrack
    });
  } catch (error) {
    logger.error('System', `Failed to like track ${id}: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST /api/subscribe - Newsletter subscription with Brevo integration
app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Geçerli bir e-posta adresi giriniz.' });
  }

  try {
    const result = await brevoService.subscribeContact(email.trim().toLowerCase());
    res.json(result);
  } catch (error) {
    logger.error('Newsletter', `Subscription error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. POST /api/agents/run - Trigger the multi-agent AI research pipeline
app.post('/api/agents/run', async (req, res) => {
  if (orchestratorAgent.getIsRunning()) {
    return res.status(429).json({
      success: false,
      message: 'Ajanlar şu anda çalışıyor, lütfen tamamlanmasını bekleyin.'
    });
  }

  try {
    // Run asynchronously or await
    const result = await orchestratorAgent.executePipeline();
    res.json({
      success: true,
      message: 'Çoklu ajan trend analizi ve güncellemesi başarıyla tamamlandı.',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ajan süreci sırasında bir hata oluştu: ' + error.message
    });
  }
});

// 5. GET /api/agents/stream - Server-Sent Events (SSE) for real-time agent output streaming
app.get('/api/agents/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE Stream connected.' })}\n\n`);

  const onLog = (entry) => {
    res.write(`data: ${JSON.stringify({ type: 'log', data: entry })}\n\n`);
  };

  const onStart = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'pipeline:start', data })}\n\n`);
  };

  const onComplete = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'pipeline:complete', data })}\n\n`);
  };

  agentEvents.on('log', onLog);
  agentEvents.on('pipeline:start', onStart);
  agentEvents.on('pipeline:complete', onComplete);

  req.on('close', () => {
    agentEvents.off('log', onLog);
    agentEvents.off('pipeline:start', onStart);
    agentEvents.off('pipeline:complete', onComplete);
  });
});

// 6. GET /api/agents/logs - Get recent execution logs
app.get('/api/agents/logs', (req, res) => {
  res.json({
    success: true,
    logs: logger.getHistory()
  });
});

// 7. GET /api/newsletter/preview - Preview the generated HTML newsletter
app.get('/api/newsletter/preview', async (req, res) => {
  try {
    const html = await newsletterAgent.generateNewsletterHtml({
      websiteUrl: `${req.protocol}://${req.get('host')}`
    });
    res.type('html').send(html);
  } catch (error) {
    res.status(500).send(`Bülten şablonu oluşturulamadı: ${error.message}`);
  }
});

// 8. POST /api/newsletter/dispatch - Dispatch the newsletter via Brevo
app.post('/api/newsletter/dispatch', async (req, res) => {
  const { targetEmail, subject } = req.body;
  try {
    const result = await newsletterAgent.dispatchNewsletter({
      targetEmail: targetEmail ? targetEmail.trim() : null,
      subject: subject || null
    });
    res.json({
      success: true,
      message: 'Bülten başarıyla gönderildi!',
      result
    });
  } catch (error) {
    logger.error('Newsletter', `Newsletter dispatch error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. GET /api/newsletter/history - Get past dispatched newsletters
app.get('/api/newsletter/history', (req, res) => {
  res.json({
    success: true,
    history: dbService.getNewsletterHistory()
  });
});

// 10. GET /api/settings - Read current settings (masks secrets)
app.get('/api/settings', (req, res) => {
  const settings = dbService.getAllSettings();
  const brevoKey = settings.BREVO_API_KEY || config.brevo.apiKey;
  const geminiKey = settings.GEMINI_API_KEY || config.ai.geminiApiKey;

  res.json({
    success: true,
    settings: {
      BREVO_API_KEY: brevoKey ? `••••••••${brevoKey.slice(-4)}` : '',
      hasBrevoKey: !!brevoKey,
      BREVO_LIST_ID: settings.BREVO_LIST_ID || config.brevo.listId,
      BREVO_SENDER_NAME: settings.BREVO_SENDER_NAME || config.brevo.senderName,
      BREVO_SENDER_EMAIL: settings.BREVO_SENDER_EMAIL || config.brevo.senderEmail,
      GEMINI_API_KEY: geminiKey ? `••••••••${geminiKey.slice(-4)}` : '',
      hasGeminiKey: !!geminiKey,
      CRON_ENABLED: settings.CRON_ENABLED === 'true' || config.scheduler.enabled,
      CRON_SCHEDULE: settings.CRON_SCHEDULE || config.scheduler.cronSchedule
    }
  });
});

// 11. POST /api/settings - Update settings
app.post('/api/settings', (req, res) => {
  const {
    brevoApiKey,
    brevoListId,
    brevoSenderName,
    brevoSenderEmail,
    geminiApiKey,
    cronEnabled,
    cronSchedule
  } = req.body;

  if (brevoApiKey && !brevoApiKey.startsWith('•••')) {
    dbService.setSetting('BREVO_API_KEY', brevoApiKey.trim());
  }
  if (brevoListId) {
    dbService.setSetting('BREVO_LIST_ID', String(brevoListId).trim());
  }
  if (brevoSenderName) {
    dbService.setSetting('BREVO_SENDER_NAME', brevoSenderName.trim());
  }
  if (brevoSenderEmail) {
    dbService.setSetting('BREVO_SENDER_EMAIL', brevoSenderEmail.trim());
  }
  if (geminiApiKey && !geminiApiKey.startsWith('•••')) {
    dbService.setSetting('GEMINI_API_KEY', geminiApiKey.trim());
  }
  if (typeof cronEnabled !== 'undefined') {
    dbService.setSetting('CRON_ENABLED', cronEnabled ? 'true' : 'false');
    if (cronEnabled && cronSchedule) {
      schedulerService.start(cronSchedule);
    } else if (!cronEnabled) {
      schedulerService.stop();
    }
  }

  logger.info('System', 'Application settings updated via Dashboard.');
  res.json({ success: true, message: 'Ayarlar başarıyla kaydedildi.' });
});

// 12. GET /api/stats - Dashboard metrics
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: dbService.getStats()
  });
});

// Catch-all for SPA (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
app.listen(config.port, () => {
  logger.success('System', `TrendHits Agentic AI Dashboard is running!`);
  logger.info('System', `Local URL: http://localhost:${config.port}`);
  schedulerService.init();
});

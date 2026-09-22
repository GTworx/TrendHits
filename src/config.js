import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/trendhits.db'),
  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    listId: parseInt(process.env.BREVO_LIST_ID || '2', 10),
    senderName: process.env.BREVO_SENDER_NAME || 'TrendHits Music Intelligence',
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'newsletter@trendhits.com'
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-1.5-flash'
  },
  scheduler: {
    enabled: process.env.CRON_ENABLED === 'true',
    cronSchedule: process.env.CRON_SCHEDULE || '0 0 * * *' // Default: Daily at midnight
  }
};

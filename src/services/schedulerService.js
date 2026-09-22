import cron from 'node-cron';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { orchestratorAgent } from '../agents/orchestratorAgent.js';
import { dbService } from '../db/database.js';

let cronTask = null;

export const schedulerService = {
  init() {
    const cronSchedule = dbService.getSetting('CRON_SCHEDULE') || config.scheduler.cronSchedule;
    const isEnabled = dbService.getSetting('CRON_ENABLED') === 'true' || config.scheduler.enabled;

    if (isEnabled && cron.validate(cronSchedule)) {
      this.start(cronSchedule);
    } else {
      logger.info('System', 'Cron scheduler initialized (Status: Inactive/Manual trigger mode).');
    }
  },

  start(schedule = '0 0 * * *') {
    if (cronTask) {
      cronTask.stop();
    }

    if (!cron.validate(schedule)) {
      throw new Error(`Geçersiz cron zaman ifadesi: ${schedule}`);
    }

    cronTask = cron.schedule(schedule, async () => {
      logger.info('System', `⏰ Scheduled trigger: Running Multi-Agent trend pipeline (${schedule})...`);
      try {
        await orchestratorAgent.executePipeline();
      } catch (err) {
        logger.error('System', `Scheduled pipeline execution failed: ${err.message}`);
      }
    });

    dbService.setSetting('CRON_ENABLED', 'true');
    dbService.setSetting('CRON_SCHEDULE', schedule);
    logger.success('System', `Scheduled cron active: ${schedule}`);
  },

  stop() {
    if (cronTask) {
      cronTask.stop();
      cronTask = null;
    }
    dbService.setSetting('CRON_ENABLED', 'false');
    logger.info('System', 'Cron scheduler stopped.');
  },

  getStatus() {
    return {
      active: !!cronTask,
      schedule: dbService.getSetting('CRON_SCHEDULE') || config.scheduler.cronSchedule
    };
  }
};

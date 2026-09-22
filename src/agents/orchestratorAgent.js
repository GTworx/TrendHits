import { logger, agentEvents } from '../utils/logger.js';
import { globalTrendAgent } from './globalTrendAgent.js';
import { turkeyTrendAgent } from './turkeyTrendAgent.js';
import { validatorAgent } from './validatorAgent.js';
import { dbService } from '../db/database.js';

let isRunning = false;

export const orchestratorAgent = {
  name: 'Orchestrator',

  getIsRunning() {
    return isRunning;
  },

  async executePipeline() {
    if (isRunning) {
      throw new Error('Bir trend araştırma süreci şu an zaten çalışıyor.');
    }

    isRunning = true;
    const runId = 'run-' + Date.now();

    try {
      logger.info(this.name, `🏁 [Run: ${runId}] Multi-Agent Music Trend Intelligence Pipeline initiated.`);
      agentEvents.emit('pipeline:start', { runId, timestamp: new Date().toISOString() });

      // Step 1: Parallel Execution of Global and Turkey Trend Agents
      logger.info(this.name, '⚡ Executing Global Music Trend Agent and TR Music Trend Agent in parallel...');

      const [globalRaw, turkeyRaw] = await Promise.all([
        globalTrendAgent.run({ runId }),
        turkeyTrendAgent.run({ runId })
      ]);

      logger.success(this.name, `Parallel research complete. Global candidates: ${globalRaw.length}, TR candidates: ${turkeyRaw.length}`);

      // Step 2: Validation, Normalization & Deduplication
      logger.info(this.name, '🛡️ Routing raw datasets to Validator Agent for normalization and quality assurance...');
      const validatedData = await validatorAgent.run(globalRaw, turkeyRaw);

      // Step 3: Database Persistence (Preserving existing Community Likes)
      logger.info(this.name, '💾 Persisting validated tracks to SQLite database...');
      const allTracks = [...validatedData.global_trends, ...validatedData.turkey_trends];
      dbService.saveTracksBatch(allTracks);

      logger.success(this.name, `🎉 Successfully updated ${allTracks.length} tracks in database.`);

      const result = {
        runId,
        last_updated: validatedData.last_updated,
        global_trends: validatedData.global_trends,
        turkey_trends: validatedData.turkey_trends,
        stats: dbService.getStats()
      };

      agentEvents.emit('pipeline:complete', result);
      return result;
    } catch (error) {
      logger.error(this.name, `Pipeline execution failed: ${error.message}`, error);
      agentEvents.emit('pipeline:error', { runId, error: error.message });
      throw error;
    } finally {
      isRunning = false;
    }
  }
};

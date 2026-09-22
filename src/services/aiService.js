import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { dbService } from '../db/database.js';

export const aiService = {
  getApiKey(service = 'gemini') {
    if (service === 'gemini') {
      return dbService.getSetting('GEMINI_API_KEY') || config.ai.geminiApiKey || process.env.GEMINI_API_KEY;
    }
    if (service === 'openai') {
      return dbService.getSetting('OPENAI_API_KEY') || config.ai.openaiApiKey || process.env.OPENAI_API_KEY;
    }
    return null;
  },

  async generateWithGemini(prompt, systemInstruction = '') {
    const apiKey = this.getApiKey('gemini');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: config.ai.model || 'gemini-1.5-flash',
      systemInstruction: systemInstruction || undefined
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  },

  // Free iTunes search API for realistic audio previews and artwork
  async enrichTrackWithMedia(trackName, artistName) {
    try {
      const query = encodeURIComponent(`${trackName} ${artistName}`);
      const res = await axios.get(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`, {
        timeout: 4000
      });

      if (res.data && res.data.results && res.data.results.length > 0) {
        const item = res.data.results[0];
        return {
          preview_url: item.previewUrl || '',
          image_url: (item.artworkUrl100 || '').replace('100x100bb', '400x400bb'),
          genre: item.primaryGenreName || ''
        };
      }
    } catch {
      // Quiet fail if network / rate limit
    }
    return { preview_url: '', image_url: '', genre: '' };
  }
};

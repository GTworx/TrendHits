import { logger } from '../utils/logger.js';

export const validatorAgent = {
  name: 'Validator',

  async run(globalTracks = [], turkeyTracks = []) {
    logger.info(this.name, '🔍 Initiating data validation, spelling normalization & deduplication...');

    // Step 1: Clean & normalize Global tracks
    const cleanGlobal = this.cleanAndDeduplicate(globalTracks, 'GLOBAL');
    logger.info(this.name, `Verified ${cleanGlobal.length} unique Global tracks.`);

    // Step 2: Clean & normalize Turkey tracks
    const cleanTurkey = this.cleanAndDeduplicate(turkeyTracks, 'TR');
    logger.info(this.name, `Verified ${cleanTurkey.length} unique Turkish tracks.`);

    // Step 3: Balance counts (e.g. 25 each)
    const targetCount = 25;
    const finalGlobal = cleanGlobal.slice(0, targetCount);
    const finalTurkey = cleanTurkey.slice(0, targetCount);

    // Re-index ranks and IDs to ensure strict ordering
    finalGlobal.forEach((t, i) => {
      t.rank = i + 1;
      t.id = `global-${i + 1}`;
    });

    finalTurkey.forEach((t, i) => {
      t.rank = i + 1;
      t.id = `tr-${i + 1}`;
    });

    logger.success(this.name, `Balanced dataset: Exactly ${finalGlobal.length} Global and ${finalTurkey.length} Turkey tracks validated.`);

    return {
      last_updated: new Date().toISOString(),
      global_trends: finalGlobal,
      turkey_trends: finalTurkey
    };
  },

  cleanAndDeduplicate(tracks, region) {
    const seen = new Set();
    const result = [];

    for (const item of tracks) {
      if (!item || !item.title || !item.artist) continue;

      const normalizedTitle = this.normalizeTitle(item.title);
      const normalizedArtist = this.normalizeArtist(item.artist);
      const key = `${normalizedArtist.toLowerCase()}|||${normalizedTitle.toLowerCase()}`;

      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      result.push({
        id: item.id || `${region.toLowerCase()}-${result.length + 1}`,
        rank: result.length + 1,
        title: normalizedTitle,
        artist: normalizedArtist,
        region: region,
        source: item.source || (region === 'GLOBAL' ? 'Spotify Global / Billboard' : 'Spotify TR / YouTube TR'),
        genre: item.genre || (region === 'GLOBAL' ? 'Pop' : 'Türkçe Pop'),
        likes_count: item.likes_count || 0,
        preview_url: item.preview_url || '',
        image_url: item.image_url || ''
      });
    }

    return result;
  },

  normalizeTitle(title) {
    if (!title) return '';
    return title
      .trim()
      .replace(/\s+/g, ' ')
      // Clean up common streaming artifacts like (Official Video) or [Lyric Video]
      .replace(/\s*(\(|\[)(Official|Lyric|Audio|Video|HD|4K|Clip).*?(\)|\])/gi, '')
      .trim();
  },

  normalizeArtist(artist) {
    if (!artist) return '';
    return artist
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ' & ')
      .trim();
  }
};

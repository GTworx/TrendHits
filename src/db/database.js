import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { initialTracks } from './seedData.js';
import { logger } from '../utils/logger.js';

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(config.dbPath);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  // 1. Tracks table as requested in TrendyHits 1 & 2
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id VARCHAR(64) PRIMARY KEY,
      rank INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      artist VARCHAR(255) NOT NULL,
      region VARCHAR(10) NOT NULL,
      source VARCHAR(100),
      genre VARCHAR(100),
      likes_count INT DEFAULT 0,
      preview_url TEXT,
      image_url TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Newsletter subscribers table (Brevo integration)
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      brevo_id VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Agent execution logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id VARCHAR(64),
      agent_name VARCHAR(64),
      level VARCHAR(20),
      message TEXT,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Newsletter history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS newsletters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject VARCHAR(255),
      recipients_count INT DEFAULT 0,
      brevo_message_id VARCHAR(100),
      status VARCHAR(50),
      html_preview TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Dynamic settings table (Brevo key, Gemini key, auto-refresh, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(64) PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default tracks if table is empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM tracks').get();
  if (countRow.count === 0) {
    logger.info('System', 'Seeding database with initial Global and TR music trends...');
    const insertStmt = db.prepare(`
      INSERT INTO tracks (id, rank, title, artist, region, source, genre, likes_count, preview_url, image_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    for (const track of initialTracks) {
      insertStmt.run(
        track.id,
        track.rank,
        track.title,
        track.artist,
        track.region,
        track.source || 'Charts Intelligence',
        track.genre || 'Pop',
        track.likes_count || 0,
        track.preview_url || '',
        track.image_url || ''
      );
    }
    logger.success('System', `Seeded ${initialTracks.length} tracks successfully into SQLite.`);
  }
}

export const dbService = {
  getAllTracks() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tracks ORDER BY region ASC, rank ASC').all();
  },

  getTracksByRegion(region) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tracks WHERE region = ? ORDER BY rank ASC').all(region);
  },

  getTrackById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  },

  incrementLike(id) {
    const db = getDatabase();
    const updateStmt = db.prepare('UPDATE tracks SET likes_count = likes_count + 1 WHERE id = ?');
    updateStmt.run(id);
    return db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
  },

  upsertTrack(track) {
    const db = getDatabase();
    // Check if track exists to preserve existing likes_count
    const existing = db.prepare('SELECT likes_count FROM tracks WHERE id = ?').get(track.id);
    const likes = existing ? existing.likes_count : (track.likes_count || 0);

    const stmt = db.prepare(`
      INSERT INTO tracks (id, rank, title, artist, region, source, genre, likes_count, preview_url, image_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        rank = excluded.rank,
        title = excluded.title,
        artist = excluded.artist,
        region = excluded.region,
        source = excluded.source,
        genre = excluded.genre,
        preview_url = CASE WHEN excluded.preview_url != '' THEN excluded.preview_url ELSE tracks.preview_url END,
        image_url = CASE WHEN excluded.image_url != '' THEN excluded.image_url ELSE tracks.image_url END,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      track.id,
      track.rank,
      track.title,
      track.artist,
      track.region,
      track.source || '',
      track.genre || '',
      likes,
      track.preview_url || '',
      track.image_url || ''
    );
  },

  saveTracksBatch(tracks) {
    for (const track of tracks) {
      this.upsertTrack(track);
    }
  },

  addSubscriber(email, brevoId = null) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO subscribers (email, brevo_id, status)
      VALUES (?, ?, 'active')
      ON CONFLICT(email) DO UPDATE SET
        brevo_id = COALESCE(excluded.brevo_id, subscribers.brevo_id),
        status = 'active'
    `);
    stmt.run(email, brevoId);
    return db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
  },

  getSubscribers() {
    const db = getDatabase();
    return db.prepare("SELECT * FROM subscribers WHERE status = 'active' ORDER BY created_at DESC").all();
  },

  getSubscribersCount() {
    const db = getDatabase();
    const row = db.prepare("SELECT COUNT(*) as count FROM subscribers WHERE status = 'active'").get();
    return row ? row.count : 0;
  },

  saveNewsletter(subject, recipientsCount, brevoMessageId, status, htmlPreview) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO newsletters (subject, recipients_count, brevo_message_id, status, html_preview)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(subject, recipientsCount, brevoMessageId, status, htmlPreview);
  },

  getNewsletterHistory() {
    const db = getDatabase();
    return db.prepare('SELECT id, subject, recipients_count, brevo_message_id, status, created_at FROM newsletters ORDER BY created_at DESC LIMIT 20').all();
  },

  getSetting(key, defaultValue = '') {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  },

  setSetting(key, value) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, String(value));
  },

  getAllSettings() {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  },

  getStats() {
    const db = getDatabase();
    const totalTracks = db.prepare('SELECT COUNT(*) as c FROM tracks').get().c;
    const globalCount = db.prepare("SELECT COUNT(*) as c FROM tracks WHERE region = 'GLOBAL'").get().c;
    const trCount = db.prepare("SELECT COUNT(*) as c FROM tracks WHERE region = 'TR'").get().c;
    const totalLikes = db.prepare('SELECT SUM(likes_count) as s FROM tracks').get().s || 0;
    const subscribersCount = this.getSubscribersCount();
    const lastTrack = db.prepare('SELECT updated_at FROM tracks ORDER BY updated_at DESC LIMIT 1').get();

    return {
      totalTracks,
      globalCount,
      trCount,
      totalLikes,
      subscribersCount,
      lastUpdated: lastTrack ? lastTrack.updated_at : new Date().toISOString()
    };
  }
};

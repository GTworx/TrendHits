// API client and real-time SSE listener for TrendHits

export const api = {
  async getTrends() {
    const res = await fetch('/api/trends');
    if (!res.ok) throw new Error('Trend verileri alınamadı');
    return res.json();
  },

  async likeTrack(id) {
    const res = await fetch(`/api/tracks/${encodeURIComponent(id)}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Beğeni kaydedilemedi');
    return res.json();
  },

  async subscribe(email) {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  },

  async runAgents() {
    const res = await fetch('/api/agents/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async getLogs() {
    const res = await fetch('/api/agents/logs');
    if (!res.ok) throw new Error('Log verileri alınamadı');
    return res.json();
  },

  async getSettings() {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Ayarlar alınamadı');
    return res.json();
  },

  async saveSettings(settings) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  async dispatchNewsletter(data) {
    const res = await fetch('/api/newsletter/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getNewsletterHistory() {
    const res = await fetch('/api/newsletter/history');
    if (!res.ok) throw new Error('Geçmiş bültenler alınamadı');
    return res.json();
  },

  connectSSE({ onLog, onStart, onComplete }) {
    try {
      const eventSource = new EventSource('/api/agents/stream');

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'log' && onLog) {
            onLog(payload.data);
          } else if (payload.type === 'pipeline:start' && onStart) {
            onStart(payload.data);
          } else if (payload.type === 'pipeline:complete' && onComplete) {
            onComplete(payload.data);
          }
        } catch (e) {
          console.error('SSE JSON parse error:', e);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('SSE stream error, retrying in 5s...', err);
        eventSource.close();
        setTimeout(() => this.connectSSE({ onLog, onStart, onComplete }), 5000);
      };

      return eventSource;
    } catch (e) {
      console.error('SSE initialization error:', e);
    }
  }
};

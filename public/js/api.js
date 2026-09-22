// API client and real-time SSE listener for TrendHits

/**
 * Helper to safely fetch and parse JSON with user-friendly error messages
 */
async function safeFetch(url, options = {}, defaultErrorMsg = 'İşlem başarısız') {
  let res;
  try {
    res = await fetch(url, options);
  } catch (networkErr) {
    throw new Error('Ağ hatası: Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.');
  }

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    let errorDetail = '';
    try {
      if (contentType.includes('application/json')) {
        const json = await res.json();
        errorDetail = json.message || json.error || '';
      } else {
        const text = await res.text();
        if (text.includes('Bad request, missing form') || res.status === 404) {
          throw new Error(
            `Backend API bulunamadı (HTTP ${res.status}). Statik barındırmada (Netlify) Node.js sunucusu çalışmıyor veya proxy yönlendirmesi yapılmamış.`
          );
        }
        errorDetail = text.slice(0, 120);
      }
    } catch (parseErr) {
      if (parseErr.message && !parseErr.message.includes('JSON')) {
        throw parseErr;
      }
    }

    throw new Error(
      errorDetail
        ? `${defaultErrorMsg}: ${errorDetail}`
        : `${defaultErrorMsg} (HTTP ${res.status})`
    );
  }

  // HTTP OK but check if response is valid JSON
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (text.includes('Bad request, missing form')) {
      throw new Error(
        'Backend sunucusuna ulaşılamadı. Netlify statik ortamında Node.js ajanları çalışamaz.'
      );
    }
    throw new Error('Sunucu beklenen JSON yanıtını dönmedi.');
  }

  try {
    return await res.json();
  } catch (err) {
    throw new Error('Sunucu yanıtı JSON olarak ayrıştırılamadı.');
  }
}

export const api = {
  async getTrends() {
    try {
      return await safeFetch('/api/trends', {}, 'Trend verileri alınamadı');
    } catch (err) {
      console.warn('API /api/trends erişilemedi, statik demo verisi yükleniyor...', err.message);
      try {
        const fallbackRes = await fetch('/data/initialTrends.json');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          return fallbackData;
        }
      } catch (fallbackErr) {
        console.error('Demo veri seti yüklenemedi:', fallbackErr);
      }
      throw err;
    }
  },

  async likeTrack(id) {
    try {
      return await safeFetch(`/api/tracks/${encodeURIComponent(id)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, 'Beğeni kaydedilemedi');
    } catch (err) {
      // If backend is unavailable (e.g. Netlify static mode), gracefully simulate like
      if (err.message.includes('Backend API bulunamadı') || err.message.includes('HTTP 404') || err.message.includes('HTTP 400')) {
        return {
          success: true,
          simulated: true,
          track: { id }
        };
      }
      throw err;
    }
  },

  async subscribe(email) {
    try {
      return await safeFetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }, 'Bülten aboneliği kaydedilemedi');
    } catch (err) {
      // If backend / function is unavailable, persist in demo mode
      if (err.message.includes('Backend API bulunamadı') || err.message.includes('HTTP 404') || err.message.includes('HTTP 400')) {
        try {
          const stored = JSON.parse(localStorage.getItem('trendhits_subscribers') || '[]');
          if (!stored.includes(email)) {
            stored.push(email);
            localStorage.setItem('trendhits_subscribers', JSON.stringify(stored));
          }
        } catch {}

        return {
          success: true,
          mode: 'demo_simulated',
          message: 'Bültene başarıyla kaydoldunuz! (Demo modunda yerel olarak kaydedildi)'
        };
      }
      throw err;
    }
  },

  async runAgents() {
    return await safeFetch('/api/agents/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, 'Ajan araştırması başlatılamadı');
  },

  async getLogs() {
    return await safeFetch('/api/agents/logs', {}, 'Log verileri alınamadı');
  },

  async getSettings() {
    return await safeFetch('/api/settings', {}, 'Ayarlar alınamadı');
  },

  async saveSettings(settings) {
    return await safeFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    }, 'Ayarlar kaydedilemedi');
  },

  async dispatchNewsletter(data) {
    return await safeFetch('/api/newsletter/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'Bülten gönderimi başlatılamadı');
  },

  async getNewsletterHistory() {
    return await safeFetch('/api/newsletter/history', {}, 'Geçmiş bültenler alınamadı');
  },

  connectSSE({ onLog, onStart, onComplete }) {
    let retryCount = 0;
    const maxRetries = 2;

    try {
      const eventSource = new EventSource('/api/agents/stream');

      eventSource.onopen = () => {
        retryCount = 0;
      };

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
        eventSource.close();
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => this.connectSSE({ onLog, onStart, onComplete }), 6000 * retryCount);
        } else {
          console.warn('SSE terminal yayınına bağlanılamadı (Backend çevrimdışı olabilir).');
        }
      };

      return eventSource;
    } catch (e) {
      console.error('SSE initialization error:', e);
    }
  }
};

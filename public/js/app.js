import { api } from './api.js';
import { musicPlayer } from './audioPlayer.js';

// Application State
const state = {
  globalTracks: [],
  turkeyTracks: [],
  stats: {},
  searchQuery: '',
  sortBy: 'rank', // 'rank' or 'likes'
  likedTracks: new Set(),
  isAgentRunning: false,
  terminalOpen: false
};

// Local storage for liked tracks
try {
  const savedLikes = localStorage.getItem('trendhits_likes');
  if (savedLikes) {
    state.likedTracks = new Set(JSON.parse(savedLikes));
  }
} catch {
  // Ignore storage errors
}

function saveLikedTracks() {
  try {
    localStorage.setItem('trendhits_likes', JSON.stringify([...state.likedTracks]));
  } catch {
    // Ignore storage errors
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initSSE();
  loadTrends();
  setupEventListeners();
  setupPlayerListener();
});

// Load Trends and Stats
async function loadTrends() {
  try {
    const data = await api.getTrends();
    if (data.success) {
      state.globalTracks = data.global_trends || [];
      state.turkeyTracks = data.turkey_trends || [];
      state.stats = data.stats || {};
      renderAll();
      if (data.is_demo) {
        showToast('Demo Modu: Statik trend verileri yüklendi (Backend çevrimdışı).', 'info');
      }
    }
  } catch (err) {
    console.error('Trend verisi yüklenirken hata:', err);
    showToast('Trend verileri yüklenemedi: ' + err.message, 'error');
  }
}

// Connect Server-Sent Events (SSE) for Real-Time Multi-Agent Streaming
function initSSE() {
  api.connectSSE({
    onLog: (log) => {
      appendTerminalLog(log);
    },
    onStart: (data) => {
      state.isAgentRunning = true;
      updateRunAgentButton();
      openTerminal();
      showToast('⚡ Çoklu ajan trend araştırması başlatıldı!', 'info');
    },
    onComplete: (data) => {
      state.isAgentRunning = false;
      updateRunAgentButton();
      if (data.global_trends && data.turkey_trends) {
        state.globalTracks = data.global_trends;
        state.turkeyTracks = data.turkey_trends;
        state.stats = data.stats || state.stats;
        renderAll();
      } else {
        loadTrends();
      }
      showToast('🎉 Trend araştırması tamamlandı ve güncellendi!', 'success');
    }
  });
}

// Setup Event Listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderTracks();
    });
  }

  // Sort selector
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderTracks();
    });
  }

  // Run Agents Button
  const runAgentsBtn = document.getElementById('run-agents-btn');
  if (runAgentsBtn) {
    runAgentsBtn.addEventListener('click', handleRunAgents);
  }

  // Newsletter Form (Bottom of page)
  const subscribeForm = document.getElementById('subscribe-form');
  if (subscribeForm) {
    subscribeForm.addEventListener('submit', handleSubscribe);
  }

  // Terminal Toggle
  const toggleTerminalBtn = document.getElementById('toggle-terminal-btn');
  if (toggleTerminalBtn) {
    toggleTerminalBtn.addEventListener('click', toggleTerminal);
  }

  const closeTerminalBtn = document.getElementById('close-terminal-btn');
  if (closeTerminalBtn) {
    closeTerminalBtn.addEventListener('click', closeTerminal);
  }

  const clearTerminalBtn = document.getElementById('clear-terminal-btn');
  if (clearTerminalBtn) {
    clearTerminalBtn.addEventListener('click', clearTerminal);
  }

  // Newsletter Studio Modal Triggers
  const openNewsletterBtn = document.getElementById('open-newsletter-btn');
  if (openNewsletterBtn) {
    openNewsletterBtn.addEventListener('click', openNewsletterModal);
  }

  const closeNewsletterBtn = document.getElementById('close-newsletter-modal');
  if (closeNewsletterBtn) {
    closeNewsletterBtn.addEventListener('click', closeNewsletterModal);
  }

  const dispatchNewsletterBtn = document.getElementById('dispatch-newsletter-btn');
  if (dispatchNewsletterBtn) {
    dispatchNewsletterBtn.addEventListener('click', handleDispatchNewsletter);
  }

  // Settings Modal Triggers
  const openSettingsBtn = document.getElementById('open-settings-btn');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', openSettingsModal);
  }

  const closeSettingsBtn = document.getElementById('close-settings-modal');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
  }

  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', handleSaveSettings);
  }

  // Audio Bar Stop
  const stopAudioBtn = document.getElementById('stop-audio-btn');
  if (stopAudioBtn) {
    stopAudioBtn.addEventListener('click', () => musicPlayer.stop());
  }
}

// Render Master
function renderAll() {
  renderTracks();
  renderStats();
}

// Render Stats Header
function renderStats() {
  const stats = state.stats;
  const totalTracksEl = document.getElementById('stat-total-tracks');
  const totalLikesEl = document.getElementById('stat-total-likes');
  const subscribersEl = document.getElementById('stat-subscribers');
  const lastUpdatedEl = document.getElementById('stat-last-updated');

  if (totalTracksEl) totalTracksEl.textContent = stats.totalTracks || (state.globalTracks.length + state.turkeyTracks.length);
  if (totalLikesEl) totalLikesEl.textContent = (stats.totalLikes || 0).toLocaleString();
  if (subscribersEl) subscribersEl.textContent = stats.subscribersCount || 0;
  if (lastUpdatedEl && stats.lastUpdated) {
    const d = new Date(stats.lastUpdated);
    lastUpdatedEl.textContent = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }
}

// Filter and Sort tracks
function processTracks(tracks) {
  let list = [...tracks];

  // Search filter
  if (state.searchQuery) {
    list = list.filter((t) =>
      t.title.toLowerCase().includes(state.searchQuery) ||
      t.artist.toLowerCase().includes(state.searchQuery) ||
      (t.genre && t.genre.toLowerCase().includes(state.searchQuery))
    );
  }

  // Sort
  if (state.sortBy === 'likes') {
    list.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
  } else {
    list.sort((a, b) => a.rank - b.rank);
  }

  return list;
}

// Render Left & Right Columns
function renderTracks() {
  const globalContainer = document.getElementById('global-tracks-container');
  const turkeyContainer = document.getElementById('turkey-tracks-container');

  const filteredGlobal = processTracks(state.globalTracks);
  const filteredTurkey = processTracks(state.turkeyTracks);

  if (globalContainer) {
    globalContainer.innerHTML = filteredGlobal.length > 0
      ? filteredGlobal.map((track) => renderTrackRow(track)).join('')
      : `<div class="p-8 text-center text-slate-400 text-sm">Arama kriterlerine uygun global parça bulunamadı.</div>`;
  }

  if (turkeyContainer) {
    turkeyContainer.innerHTML = filteredTurkey.length > 0
      ? filteredTurkey.map((track) => renderTrackRow(track)).join('')
      : `<div class="p-8 text-center text-slate-400 text-sm">Arama kriterlerine uygun Türkiye parçası bulunamadı.</div>`;
  }

  // Re-attach buttons event handlers
  attachTrackEvents();
}

// Helper to extract player metadata and authentic brand styling
function getPlayerMeta(track) {
  let playerUrl = track.player_url;
  const src = (track.source || '').toLowerCase();
  const q = encodeURIComponent(`${track.artist} ${track.title}`);

  if (!playerUrl) {
    if (src.startsWith('youtube') || (src.includes('youtube') && !src.includes('spotify'))) {
      playerUrl = `https://music.youtube.com/search?q=${q}`;
    } else if (src.startsWith('apple') || (src.includes('apple') && !src.includes('spotify'))) {
      playerUrl = `https://music.apple.com/search?term=${q}`;
    } else {
      playerUrl = `https://open.spotify.com/search/${q}`;
    }
  }

  if (playerUrl.includes('youtube.com')) {
    return {
      platform: 'YouTube Music',
      shortName: 'YT Music',
      url: playerUrl,
      btnClass: 'hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 text-slate-300',
      iconSvg: `
        <svg class="w-3.5 h-3.5 fill-current text-red-500 shrink-0" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      `
    };
  }

  if (playerUrl.includes('apple.com')) {
    return {
      platform: 'Apple Music',
      shortName: 'Apple Music',
      url: playerUrl,
      btnClass: 'hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-pink-400 text-slate-300',
      iconSvg: `
        <svg class="w-3.5 h-3.5 fill-current text-pink-500 shrink-0" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.07.64-2.73 1.41-.57.66-.99 1.73-.91 2.76 1.06.08 2.06-.55 2.63-1.3"/>
        </svg>
      `
    };
  }

  return {
    platform: 'Spotify',
    shortName: 'Spotify',
    url: playerUrl,
    btnClass: 'hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-300',
    iconSvg: `
      <svg class="w-3.5 h-3.5 fill-current text-[#1DB954] shrink-0" viewBox="0 0 24 24">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    `
  };
}

// Track Row Template (Implements Section 2 of TrendyHits 2.md)
function renderTrackRow(track) {
  const isLiked = state.likedTracks.has(track.id);
  const isCurrentAudio = musicPlayer.currentTrack && musicPlayer.currentTrack.id === track.id && musicPlayer.isPlaying;
  const player = getPlayerMeta(track);

  // Rank Badge Style
  let rankClass = 'rank-default';
  if (track.rank === 1) rankClass = 'rank-gold';
  else if (track.rank === 2) rankClass = 'rank-silver';
  else if (track.rank === 3) rankClass = 'rank-bronze';

  const defaultImg = track.region === 'GLOBAL'
    ? 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&auto=format&fit=crop&q=80';

  const coverImg = track.image_url || defaultImg;

  return `
    <div class="group relative flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/70 hover:border-slate-700 transition-all duration-200">
      
      <!-- Left: Rank + Cover + Info -->
      <div class="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
        <!-- Rank -->
        <span class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${rankClass}">
          #${track.rank}
        </span>

        <!-- Cover & Play Overlay -->
        <div class="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-800 group/art cursor-pointer play-track-btn" data-id="${track.id}" title="Önizleme Dinle">
          <img src="${coverImg}" alt="${track.title}" class="w-full h-full object-cover group-hover/art:scale-105 transition duration-300" loading="lazy" />
          <div class="absolute inset-0 bg-black/40 flex items-center justify-center ${isCurrentAudio ? 'opacity-100 bg-black/60' : 'opacity-0 group-hover/art:opacity-100'} transition">
            ${isCurrentAudio ? `
              <div class="flex items-end gap-0.5 h-4">
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
              </div>
            ` : `
              <svg class="w-5 h-5 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            `}
          </div>
        </div>

        <!-- Title & Artist -->
        <div class="min-w-0">
          <a 
            href="${player.url}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="font-semibold text-slate-100 text-sm truncate group-hover:text-indigo-400 hover:underline inline-flex items-center gap-1.5" 
            title="${track.title} (${player.platform}'da Aç)"
          >
            <span class="truncate">${track.title}</span>
            <svg class="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-75 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
          </a>
          <p class="text-xs text-slate-400 truncate mt-0.5" title="${track.artist}">
            ${track.artist}
          </p>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
              ${track.genre || (track.region === 'GLOBAL' ? 'Pop' : 'Türkçe Pop')}
            </span>
            <span class="text-[10px] text-slate-500 hidden sm:inline-block">
              ${track.source ? track.source.split('/')[0].trim() : ''}
            </span>
          </div>
        </div>
      </div>

      <!-- Right: Action Buttons (Real Player Link + Like Button) -->
      <div class="flex items-center gap-2 shrink-0">
        
        <!-- Direct Source Player Link Button -->
        <a 
          href="${player.url}" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-700/80 bg-slate-800/60 ${player.btnClass} transition"
          title="${player.platform}'da Dinle"
        >
          ${player.iconSvg}
          <span class="hidden md:inline text-[11px] font-medium">${player.shortName}</span>
          <svg class="w-3 h-3 text-slate-400 -mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </a>

        <!-- Like Button (Heart & Counter) -->
        <button 
          data-id="${track.id}"
          class="like-btn shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border ${isLiked ? 'border-red-500/60 bg-red-500/10 text-red-400' : 'border-slate-700/80 bg-slate-800/50 text-slate-400 hover:text-red-400 hover:border-red-500/30'} transition"
          title="Beğen"
        >
          <svg class="w-4 h-4 fill-current ${isLiked ? 'text-red-500 animate-heart' : ''}" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span class="text-xs font-semibold track-likes-count">
            ${track.likes_count || 0}
          </span>
        </button>

      </div>

    </div>
  `;
}

// Attach Event Listeners to rendered track items
function attachTrackEvents() {
  // Likes
  document.querySelectorAll('.like-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const trackId = btn.getAttribute('data-id');
      handleLike(trackId, btn);
    });
  });

  // Audio Play
  document.querySelectorAll('.play-track-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const trackId = btn.getAttribute('data-id');
      const all = [...state.globalTracks, ...state.turkeyTracks];
      const track = all.find((t) => t.id === trackId);
      if (track) {
        musicPlayer.toggle(track);
      }
    });
  });
}

// Like Button Handler (Implements Section 2 of TrendyHits 2.md)
async function handleLike(trackId, buttonEl) {
  // Optimistic UI update
  state.likedTracks.add(trackId);
  saveLikedTracks();

  const countEl = buttonEl.querySelector('.track-likes-count');
  const heartSvg = buttonEl.querySelector('svg');
  let currentCount = parseInt(countEl.textContent || '0', 10);
  currentCount += 1;
  countEl.textContent = currentCount;

  buttonEl.classList.remove('border-slate-700/80', 'text-slate-400');
  buttonEl.classList.add('border-red-500/60', 'bg-red-500/10', 'text-red-400');
  heartSvg.classList.add('text-red-500', 'animate-heart');

  // Trigger floating heart particle
  spawnHeartParticle(buttonEl);

  try {
    const res = await api.likeTrack(trackId);
    if (res.success && res.track) {
      // Update track in state
      const targetList = res.track.region === 'GLOBAL' ? state.globalTracks : state.turkeyTracks;
      const index = targetList.findIndex((t) => t.id === trackId);
      if (index !== -1) {
        targetList[index].likes_count = res.track.likes_count;
      }
      countEl.textContent = res.track.likes_count;
      state.stats.totalLikes = (state.stats.totalLikes || 0) + 1;
      renderStats();
    }
  } catch (err) {
    console.error('Like failed:', err);
  }
}

// Playful heart particle
function spawnHeartParticle(btn) {
  const rect = btn.getBoundingClientRect();
  const particle = document.createElement('div');
  particle.textContent = '❤️';
  particle.style.position = 'fixed';
  particle.style.left = `${rect.left + rect.width / 2}px`;
  particle.style.top = `${rect.top}px`;
  particle.style.pointerEvents = 'none';
  particle.style.fontSize = '18px';
  particle.style.zIndex = '9999';
  particle.style.animation = 'floatParticle 0.7s forwards ease-out';
  document.body.appendChild(particle);
  setTimeout(() => particle.remove(), 700);
}

// Audio Player Floating Bar Listener
function setupPlayerListener() {
  musicPlayer.onChange(({ track, isPlaying }) => {
    const playerBar = document.getElementById('floating-player-bar');
    const playerTitle = document.getElementById('player-track-title');
    const playerArtist = document.getElementById('player-track-artist');
    const playerCover = document.getElementById('player-track-cover');
    const playerPlayIcon = document.getElementById('player-play-icon');
    const playerLink = document.getElementById('player-external-link');

    if (track && playerBar) {
      playerBar.classList.remove('hidden');
      if (playerTitle) playerTitle.textContent = track.title;
      if (playerArtist) playerArtist.textContent = track.artist;
      if (playerCover && track.image_url) playerCover.src = track.image_url;

      if (playerLink) {
        const meta = getPlayerMeta(track);
        playerLink.href = meta.url;
        playerLink.title = `${meta.platform}'da Orijinal Parçayı Dinle`;
        playerLink.classList.remove('hidden');
      }

      if (playerPlayIcon) {
        playerPlayIcon.innerHTML = isPlaying
          ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
          : `<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      }
    } else if (playerBar) {
      playerBar.classList.add('hidden');
      if (playerLink) playerLink.classList.add('hidden');
    }

    renderTracks();
  });
}

// Multi-Agent Pipeline Run Handler
async function handleRunAgents() {
  if (state.isAgentRunning) return;

  state.isAgentRunning = true;
  updateRunAgentButton();
  openTerminal();

  try {
    showToast('⚡ Ajanlar çalışmaya başladı...', 'info');
    const res = await api.runAgents();
    if (res.success && res.data) {
      state.globalTracks = res.data.global_trends;
      state.turkeyTracks = res.data.turkey_trends;
      state.stats = res.data.stats || state.stats;
      renderAll();
      showToast('✓ Tüm listeler ve veritabanı güncellendi!', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    state.isAgentRunning = false;
    updateRunAgentButton();
  }
}

function updateRunAgentButton() {
  const btn = document.getElementById('run-agents-btn');
  if (!btn) return;

  if (state.isAgentRunning) {
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      Ajanlar Araştırıyor...
    `;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
  } else {
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
      Ajanları Çalıştır
    `;
    btn.classList.remove('opacity-75', 'cursor-not-allowed');
  }
}

// Newsletter Subscription Handler (Implements Section 3 of TrendyHits 2.md)
async function handleSubscribe(e) {
  e.preventDefault();
  const input = document.getElementById('subscribe-email-input');
  const btn = document.getElementById('subscribe-submit-btn');
  const messageEl = document.getElementById('subscribe-message');

  const email = input.value.trim();
  if (!email) return;

  btn.disabled = true;
  btn.innerHTML = `
    <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
    Kaydediliyor...
  `;

  try {
    const res = await api.subscribe(email);
    messageEl.classList.remove('hidden', 'text-red-400', 'text-emerald-400');

    if (res.success) {
      messageEl.textContent = res.message || 'Bültene başarıyla kaydoldunuz!';
      messageEl.classList.add('text-emerald-400');
      input.value = '';
      state.stats.subscribersCount = (state.stats.subscribersCount || 0) + 1;
      renderStats();
    } else {
      messageEl.textContent = res.error || 'Abonelik işlemi tamamlanamadı.';
      messageEl.classList.add('text-red-400');
    }
  } catch (err) {
    messageEl.classList.remove('hidden');
    messageEl.textContent = 'Bağlantı hatası: ' + err.message;
    messageEl.classList.add('text-red-400');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `Abone Ol`;
  }
}

// Terminal Drawer Controls
function openTerminal() {
  const terminal = document.getElementById('agent-terminal-drawer');
  if (terminal) {
    terminal.classList.remove('translate-y-full');
    state.terminalOpen = true;
  }
}

function closeTerminal() {
  const terminal = document.getElementById('agent-terminal-drawer');
  if (terminal) {
    terminal.classList.add('translate-y-full');
    state.terminalOpen = false;
  }
}

function toggleTerminal() {
  if (state.terminalOpen) {
    closeTerminal();
  } else {
    openTerminal();
  }
}

function clearTerminal() {
  const container = document.getElementById('terminal-logs-container');
  if (container) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-2">Log temizlendi. Yeni olaylar bekleniyor...</div>`;
  }
}

function appendTerminalLog(log) {
  const container = document.getElementById('terminal-logs-container');
  if (!container) return;

  const time = log.timestamp ? log.timestamp.substring(11, 19) : new Date().toLocaleTimeString();

  // Colors for agents
  const agentBadges = {
    Orchestrator: 'bg-purple-900/80 text-purple-300 border-purple-700/60',
    'Global-Agent': 'bg-blue-900/80 text-blue-300 border-blue-700/60',
    'TR-Agent': 'bg-red-900/80 text-red-300 border-red-700/60',
    Validator: 'bg-amber-900/80 text-amber-300 border-amber-700/60',
    Newsletter: 'bg-emerald-900/80 text-emerald-300 border-emerald-700/60',
    System: 'bg-cyan-900/80 text-cyan-300 border-cyan-700/60'
  };

  const badgeClass = agentBadges[log.agent] || 'bg-slate-800 text-slate-300 border-slate-700';

  const row = document.createElement('div');
  row.className = 'flex items-start gap-2.5 py-1 text-xs font-mono border-b border-slate-800/40';
  row.innerHTML = `
    <span class="text-slate-500 shrink-0 select-none">${time}</span>
    <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${badgeClass}">${log.agent}</span>
    <span class="text-slate-300 break-words leading-relaxed">${log.message}</span>
  `;

  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

// Newsletter Studio Modal Controls
async function openNewsletterModal() {
  const modal = document.getElementById('newsletter-modal');
  if (modal) {
    modal.classList.remove('hidden');
    // Load iframe preview
    const iframe = document.getElementById('newsletter-preview-frame');
    if (iframe) {
      iframe.src = '/api/newsletter/preview?t=' + Date.now();
    }
    loadNewsletterHistory();
  }
}

function closeNewsletterModal() {
  const modal = document.getElementById('newsletter-modal');
  if (modal) modal.classList.add('hidden');
}

async function loadNewsletterHistory() {
  const container = document.getElementById('newsletter-history-list');
  if (!container) return;

  try {
    const res = await api.getNewsletterHistory();
    if (res.success && res.history) {
      if (res.history.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500">Henüz gönderilmiş bülten bulunmuyor.</p>`;
      } else {
        container.innerHTML = res.history
          .map(
            (item) => `
          <div class="flex items-center justify-between p-2 rounded bg-slate-800/60 text-xs border border-slate-700/50 mb-1.5">
            <div>
              <p class="font-medium text-slate-200">${item.subject}</p>
              <p class="text-[10px] text-slate-400">${new Date(item.created_at).toLocaleString('tr-TR')}</p>
            </div>
            <div class="text-right">
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${item.status === 'sent' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'}">
                ${item.status}
              </span>
              <p class="text-[10px] text-slate-400 mt-0.5">${item.recipients_count} alıcı</p>
            </div>
          </div>
        `
          )
          .join('');
      }
    }
  } catch (e) {
    console.error('History load error:', e);
  }
}

async function handleDispatchNewsletter() {
  const btn = document.getElementById('dispatch-newsletter-btn');
  const targetEmailInput = document.getElementById('newsletter-target-email');
  const subjectInput = document.getElementById('newsletter-subject-input');

  const targetEmail = targetEmailInput.value.trim();
  const subject = subjectInput.value.trim();

  btn.disabled = true;
  btn.textContent = 'Gönderiliyor...';

  try {
    const res = await api.dispatchNewsletter({ targetEmail, subject });
    if (res.success) {
      showToast('Bülten başarıyla iletildi! (' + res.result.mode + ')', 'success');
      loadNewsletterHistory();
    } else {
      showToast('Hata: ' + res.message, 'error');
    }
  } catch (err) {
    showToast('Gönderim hatası: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Bülteni Gönder (Brevo)';
  }
}

// Settings Modal Controls
async function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  try {
    const res = await api.getSettings();
    if (res.success && res.settings) {
      const s = res.settings;
      document.getElementById('setting-brevo-key').value = s.BREVO_API_KEY || '';
      document.getElementById('setting-brevo-list-id').value = s.BREVO_LIST_ID || '2';
      document.getElementById('setting-brevo-name').value = s.BREVO_SENDER_NAME || '';
      document.getElementById('setting-brevo-email').value = s.BREVO_SENDER_EMAIL || '';
      document.getElementById('setting-gemini-key').value = s.GEMINI_API_KEY || '';
      document.getElementById('setting-cron-enabled').checked = !!s.CRON_ENABLED;
      document.getElementById('setting-cron-schedule').value = s.CRON_SCHEDULE || '0 0 * * *';
    }
  } catch (err) {
    console.error('Settings load error:', err);
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('save-settings-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Kaydediliyor...';

  const payload = {
    brevoApiKey: document.getElementById('setting-brevo-key').value,
    brevoListId: document.getElementById('setting-brevo-list-id').value,
    brevoSenderName: document.getElementById('setting-brevo-name').value,
    brevoSenderEmail: document.getElementById('setting-brevo-email').value,
    geminiApiKey: document.getElementById('setting-gemini-key').value,
    cronEnabled: document.getElementById('setting-cron-enabled').checked,
    cronSchedule: document.getElementById('setting-cron-schedule').value
  };

  try {
    const res = await api.saveSettings(payload);
    if (res.success) {
      showToast('Ayarlar kaydedildi!', 'success');
      closeSettingsModal();
    }
  } catch (err) {
    showToast('Ayarlar kaydedilemedi: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Değişiklikleri Kaydet';
  }
}

// Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-indigo-600';
  toast.className = `${bg} text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.textContent = message;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

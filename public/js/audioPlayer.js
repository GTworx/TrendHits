// Interactive Audio Player with Web Audio API fallback for TrendHits

class MusicPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.volume = 0.5;
    this.currentTrack = null;
    this.isPlaying = false;
    this.listeners = [];
    this.synthInterval = null;

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.notifyListeners();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notifyListeners();
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notifyListeners();
    });

    this.audio.addEventListener('error', () => {
      // Fallback to synth if audio stream fails
      if (this.currentTrack && this.isPlaying) {
        this.playSynthesizedBeats();
      }
    });
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    for (const cb of this.listeners) {
      cb({
        track: this.currentTrack,
        isPlaying: this.isPlaying
      });
    }
  }

  toggle(track) {
    if (this.currentTrack && this.currentTrack.id === track.id) {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.resume();
      }
    } else {
      this.play(track);
    }
  }

  play(track) {
    this.stopSynth();
    this.currentTrack = track;

    if (track.preview_url && track.preview_url.trim() !== '') {
      this.audio.src = track.preview_url;
      this.audio.play().catch(() => {
        this.playSynthesizedBeats();
      });
    } else {
      this.playSynthesizedBeats();
    }
  }

  pause() {
    this.audio.pause();
    this.stopSynth();
    this.isPlaying = false;
    this.notifyListeners();
  }

  resume() {
    if (this.audio.src) {
      this.audio.play();
    } else {
      this.playSynthesizedBeats();
    }
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.stopSynth();
    this.currentTrack = null;
    this.isPlaying = false;
    this.notifyListeners();
  }

  // Web Audio synth for ambient preview when audio preview is unavailable
  playSynthesizedBeats() {
    this.isPlaying = true;
    this.notifyListeners();

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.audioCtx = this.audioCtx || new AudioCtx();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const notes = [261.63, 329.63, 392.0, 523.25, 440.0, 349.23];
      let step = 0;

      this.synthInterval = setInterval(() => {
        if (!this.isPlaying) {
          clearInterval(this.synthInterval);
          return;
        }

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const freq = notes[step % notes.length];
        step++;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.35);
      }, 350);

      // Auto stop after 20 seconds
      setTimeout(() => {
        if (this.isPlaying && !this.audio.src) {
          this.pause();
        }
      }, 20000);
    } catch {
      // AudioCtx not allowed without user interaction
    }
  }

  stopSynth() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }
}

export const musicPlayer = new MusicPlayer();

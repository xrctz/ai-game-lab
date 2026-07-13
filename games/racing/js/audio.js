// VEIL RUSH — procedural sound effects via Web Audio API (no external audio files).
// Exposes a single `audio` singleton used by main.js for engine hum, boost/orb/gate
// stingers, and countdown beeps. All sounds are synthesized with oscillators/gain
// envelopes/filters. Mute state persists in localStorage.

const MUTE_KEY = 'veilrush.muted';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.engineOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.ready = false;
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
  }

  /** Create/resume the AudioContext. Must be called from a user gesture handler
   * to satisfy browser autoplay-gating (mirrors cinematicVideo.play().catch()). */
  init() {
    if (this.ready) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return; // Web Audio unsupported — fail silently, game still playable.
    try {
      this.ctx = new Ctx();
    } catch (e) {
      console.warn('VEIL RUSH: Web Audio unavailable', e);
      return;
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.ctx.destination);

    // Continuous engine hum bed — pitch/volume driven by updateEngine(speed).
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineOsc.start();

    this.ready = true;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  isMuted() {
    return this.muted;
  }

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Continuous engine hum — call every frame with current speed while racing. */
  updateEngine(speed, maxSpeed = 48) {
    if (!this.ready) return;
    const t = Math.max(0, Math.min(1, speed / (maxSpeed || 48)));
    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(52 + t * 150, now, 0.09);
    this.engineFilter.frequency.setTargetAtTime(220 + t * 1600, now, 0.09);
    const targetGain = 0.012 + t * 0.055;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.15);
  }

  /** Fade engine hum to silence (pause/result/menu transitions). */
  stopEngine() {
    if (!this.ready) return;
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  _envelope(duration, peak, attack = 0.008) {
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    return g;
  }

  /** Boost activation whoosh — rising filtered sawtooth sweep. */
  playBoost() {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.42);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.42);
    const g = this._envelope(0.6, 0.32, 0.02);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  /** Orb pickup chime — two quick bright sine notes. */
  playOrbChime() {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = this._envelope(0.32, 0.22, 0.004);
      osc.connect(g);
      g.connect(this.masterGain);
      const start = now + i * 0.055;
      osc.start(start);
      osc.stop(start + 0.34);
    });
  }

  /** Prism Gate pass "whomp" — falling triangle thump. */
  playGateWhomp() {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.26);
    const g = this._envelope(0.3, 0.4, 0.004);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  /** Countdown tick — square beep; final "RUSH/GO" tick is higher/longer. */
  playCountdownBeep(isFinal = false) {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = isFinal ? 880 : 523.25;
    const duration = isFinal ? 0.42 : 0.16;
    const g = this._envelope(duration, isFinal ? 0.26 : 0.16, 0.004);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}

export const audio = new AudioEngine();

/**
 * VEIL RUSH — lightweight WebAudio synth layer.
 * No assets, no dependencies: engine hum, boost sweep, pickup chimes,
 * countdown beeps and position blips, all generated with oscillators.
 * Mute preference persists via localStorage.
 */

const MUTE_KEY = 'veilrush.muted';

class VeilAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engine = null;
    this.muted = false;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch (e) {
      /* storage unavailable (sandboxed iframe) — default unmuted */
    }
  }

  /** Lazily create the AudioContext; safe to call from any user gesture. */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  setMuted(m) {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch (e) {
      /* ignore */
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.03);
    }
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  /** Short enveloped tone. `time` delays start (seconds from now). */
  tone({ freq, endFreq = 0, time = 0, dur = 0.15, type = 'sine', vol = 0.22 }) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + time;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // ----- Engine hum (continuous, pitch follows speed) -----
  startEngine() {
    const ctx = this.ensure();
    if (!ctx || this.engine) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 42;
    const sub = ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.value = 84;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start();
    sub.start();
    this.engine = { osc, sub, filter, gain };
  }

  /** ratio: 0..1 of max speed. */
  setEngine(ratio, boosting) {
    if (!this.engine || !this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 40 + ratio * 90 + (boosting ? 40 : 0);
    this.engine.osc.frequency.setTargetAtTime(f, t, 0.08);
    this.engine.sub.frequency.setTargetAtTime(f * 2.01, t, 0.08);
    this.engine.filter.frequency.setTargetAtTime(240 + ratio * 900 + (boosting ? 600 : 0), t, 0.1);
    this.engine.gain.gain.setTargetAtTime(0.05 + ratio * 0.075, t, 0.1);
  }

  stopEngine() {
    if (!this.engine || !this.ctx) return;
    const { osc, sub, gain } = this.engine;
    const t = this.ctx.currentTime;
    gain.gain.setTargetAtTime(0, t, 0.05);
    osc.stop(t + 0.35);
    sub.stop(t + 0.35);
    this.engine = null;
  }

  // ----- One-shot cues -----
  orb() {
    this.tone({ freq: 1040, dur: 0.09, vol: 0.16 });
    this.tone({ freq: 1560, time: 0.07, dur: 0.12, vol: 0.14 });
  }

  gate() {
    this.tone({ freq: 520, dur: 0.18, type: 'triangle', vol: 0.2 });
    this.tone({ freq: 780, dur: 0.22, type: 'triangle', vol: 0.15 });
  }

  boost() {
    this.tone({ freq: 180, endFreq: 720, dur: 0.5, type: 'sawtooth', vol: 0.18 });
    this.tone({ freq: 360, endFreq: 1440, dur: 0.35, type: 'sine', vol: 0.1 });
  }

  count(go) {
    if (go) this.tone({ freq: 880, dur: 0.4, type: 'square', vol: 0.16 });
    else this.tone({ freq: 440, dur: 0.12, type: 'square', vol: 0.12 });
  }

  lap(best) {
    this.tone({ freq: 660, dur: 0.1, type: 'triangle', vol: 0.18 });
    this.tone({ freq: 880, time: 0.09, dur: 0.14, type: 'triangle', vol: 0.18 });
    if (best) this.tone({ freq: 1320, time: 0.2, dur: 0.2, type: 'triangle', vol: 0.16 });
  }

  place(up) {
    if (up) this.tone({ freq: 620, endFreq: 940, dur: 0.14, vol: 0.14 });
    else this.tone({ freq: 500, endFreq: 300, dur: 0.16, vol: 0.12 });
  }

  finish() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => this.tone({ freq: f, time: i * 0.11, dur: 0.22, type: 'triangle', vol: 0.18 }));
  }
}

export const veilAudio = new VeilAudio();

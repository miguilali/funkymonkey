'use strict';
const AudioSys = {
  ctx: null,
  muted: false,
  musicTimer: null,
  step: 0,
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch (e) {
      this.ctx = null;
    }
  },
  beep(f, d, type, v, slide) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(v || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + d + 0.02);
  },
  sfx(n) {
    switch (n) {
      case 'jump': this.beep(280, 0.16, 'square', 0.1, 260); break;
      case 'attack': this.beep(520, 0.08, 'sawtooth', 0.08, -220); break;
      case 'coin': this.beep(920, 0.07, 'square', 0.09); this.beep(1380, 0.12, 'square', 0.07); break;
      case 'hurt': this.beep(200, 0.25, 'sawtooth', 0.14, -120); break;
      case 'stomp': this.beep(160, 0.12, 'square', 0.12, -60); break;
      case 'bosshit': this.beep(140, 0.2, 'sawtooth', 0.16, 60); break;
      case 'roar': this.beep(90, 0.5, 'sawtooth', 0.18, -30); break;
      case 'shoot': this.beep(640, 0.1, 'triangle', 0.08, -300); break;
      case 'die': this.beep(300, 0.5, 'square', 0.12, -240); break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) =>
          setTimeout(() => this.beep(f, 0.18, 'square', 0.1), i * 130)
        );
        break;
    }
  },
  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    const bass = [110, 110, 131, 110, 98, 98, 147, 131];
    const lead = [440, 523, 659, 523, 587, 494, 440, 392];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const s = this.step % 8;
      this.beep(bass[s], 0.2, 'triangle', 0.05);
      if (this.step % 2 === 0) this.beep(lead[s], 0.14, 'square', 0.025);
      this.step++;
    }, 240);
  },
  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
};

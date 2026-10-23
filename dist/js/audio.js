export class Sound {
  constructor() {
    this.volume = 0.65;
    this.ctx = null;
    this.lastPing = 0;
  }
  unlock() {
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    } catch {}
  }
  tone(
    freq,
    duration = 0.12,
    type = "sine",
    gain = 0.15,
    delay = 0,
    end = freq,
  ) {
    if (!this.ctx || !this.volume) return;
    const t = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + duration + 0.02);
  }
  play(name) {
    if (name === "menu" || name === "rotate") {
      this.tone(620, 0.07, "sine", 0.09, 0, 940);
      return;
    }
    if (name === "charge") {
      this.tone(160, 0.12, "triangle", 0.08, 0, 350);
      return;
    }
    if (name === "fire") {
      this.tone(620, 0.16, "sawtooth", 0.06, 0, 120);
      this.tone(1200, 0.09, "sine", 0.12, 0, 300);
    }
    if (name === "reflect") {
      if (this.ctx && this.ctx.currentTime - this.lastPing < 0.035) return;
      this.lastPing = this.ctx?.currentTime || 0;
      this.tone(1400, 0.12, "sine", 0.1, 0, 900);
      this.tone(2200, 0.07, "sine", 0.045);
    }
    if (name === "destroy") {
      this.tone(220, 0.2, "triangle", 0.16, 0, 55);
      this.tone(880, 0.16, "sine", 0.14, 0, 1760);
    }
    if (name === "hit") {
      this.tone(420, 0.15, "square", 0.045, 0, 220);
    }
    if (name === "split") {
      this.tone(520, 0.22, "sine", 0.1, 0, 1600);
      this.tone(780, 0.22, "sine", 0.1, 0.03, 2100);
    }
    if (name === "chain") {
      [0, 1, 2].forEach((i) =>
        this.tone(
          500 + i * 220,
          0.18,
          "triangle",
          0.12,
          i * 0.045,
          1000 + i * 220,
        ),
      );
    }
    if (name === "clear") {
      [440, 660, 880, 1320].forEach((f, i) =>
        this.tone(f, 0.32, "sine", 0.12, i * 0.09),
      );
    }
    if (name === "fail" || name === "absorb") {
      this.tone(160, 0.25, "sawtooth", 0.06, 0, 55);
    }
    if (name === "retry") {
      this.tone(330, 0.12, "triangle", 0.08, 0, 660);
    }
  }
}

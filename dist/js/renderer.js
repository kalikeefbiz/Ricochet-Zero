import { endpoints, gateOpen, distance } from "./geometry.js";
const C = {
  cyan: "#67ebdf",
  purple: "#bd9dff",
  amber: "#ffc46d",
  red: "#ff8196",
  dim: "#193238",
};
function path(c, points) {
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
}
function poly(c, x, y, r, n = 6, spin = 0) {
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = spin + (i * Math.PI * 2) / n;
    const px = x + Math.cos(a) * r,
      py = y + Math.sin(a) * r;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}
function line(c, a, b, color, width = 1, glow = 0) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.shadowColor = color;
  c.shadowBlur = glow;
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.stroke();
  c.shadowBlur = 0;
}
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.particles = [];
    this.rings = [];
    this.shake = 0;
    this.reduced = false;
    this.resize();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * this.ratio);
    this.canvas.height = Math.round(r.height * this.ratio);
    this.scale = this.canvas.width / 360;
  }
  effect(e) {
    const colors = {
      destroy: C.amber,
      hit: C.amber,
      reflect: C.cyan,
      absorb: C.red,
      split: C.purple,
      chain: C.purple,
      fire: C.cyan,
      clear: C.cyan,
      rotate: C.purple,
    };
    const color = colors[e.type];
    if (!color) return;
    const major = ["destroy", "chain", "clear"].includes(e.type);
    if (!this.reduced) {
      for (let i = 0; i < (major ? 20 : 7); i++) {
        const a = Math.random() * Math.PI * 2,
          s = major ? 40 + Math.random() * 110 : 15 + Math.random() * 60;
        this.particles.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: major ? 0.55 : 0.25,
          max: major ? 0.55 : 0.25,
          color,
        });
      }
      if (major) this.shake = 3;
    }
    this.rings.push({
      x: e.x,
      y: e.y,
      r: 4,
      max: e.type === "chain" ? e.radius : major ? 50 : 20,
      life: 0.45,
      color,
    });
    if (this.particles.length > 150)
      this.particles.splice(0, this.particles.length - 150);
  }
  draw(
    arena,
    {
      aim = { x: 0, y: -1 },
      paths = [],
      aiming = false,
      dt = 0,
      time = 0,
      demo = false,
    } = {},
  ) {
    const c = this.ctx,
      s = this.scale;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "#080f14";
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(s, 0, 0, s, 0, 0);
    c.save();
    if (this.shake > 0.1 && !this.reduced) {
      c.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake,
      );
      this.shake *= 0.86;
    }
    const grad = c.createRadialGradient(180, 270, 20, 180, 270, 320);
    grad.addColorStop(0, "#10232a");
    grad.addColorStop(1, "#081116");
    c.fillStyle = grad;
    c.fillRect(0, 0, 360, 520);
    // Machined floor, intentionally quieter than every interactive component.
    c.strokeStyle = "#183038";
    c.lineWidth = 0.5;
    c.globalAlpha = 0.45;
    for (let x = 36; x < 344; x += 24) {
      c.beginPath();
      c.moveTo(x, 18);
      c.lineTo(x, 502);
      c.stroke();
    }
    for (let y = 32; y < 502; y += 24) {
      c.beginPath();
      c.moveTo(18, y);
      c.lineTo(342, y);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.fillStyle = "#34545a";
    for (let x = 60; x < 330; x += 72)
      for (let y = 56; y < 480; y += 72) {
        c.globalAlpha = 0.55;
        c.fillRect(x - 2, y, 4, 0.6);
        c.fillRect(x, y - 2, 0.6, 4);
      }
    c.globalAlpha = 1;
    c.strokeStyle = "#20373d";
    c.lineWidth = 1;
    path(c, [
      { x: 5, y: 30 },
      { x: 5, y: 5 },
      { x: 30, y: 5 },
    ]);
    c.stroke();
    path(c, [
      { x: 330, y: 5 },
      { x: 355, y: 5 },
      { x: 355, y: 30 },
    ]);
    c.stroke();
    path(c, [
      { x: 5, y: 490 },
      { x: 5, y: 515 },
      { x: 30, y: 515 },
    ]);
    c.stroke();
    path(c, [
      { x: 330, y: 515 },
      { x: 355, y: 515 },
      { x: 355, y: 490 },
    ]);
    c.stroke();
    c.strokeStyle = "#245259";
    c.lineWidth = 2;
    c.strokeRect(16, 16, 328, 488);
    for (let side = 0; side < 2; side++)
      for (let y = 38; y < 490; y += 44) {
        line(
          c,
          { x: 16 + 328 * side, y },
          { x: 16 + 328 * side, y: y + 18 },
          "#4aa49e",
          1,
          3,
        );
      }
    for (const [x, y, flip] of [
      [16, 16, 1],
      [344, 16, -1],
      [16, 504, 1],
      [344, 504, -1],
    ]) {
      line(c, { x, y }, { x: x + flip * 23, y }, C.cyan, 2, 5);
    }
    c.font = "7px monospace";
    c.fillStyle = "#3d6268";
    c.fillText("RZ / OPTICAL TEST CHAMBER", 28, 32);
    c.textAlign = "right";
    c.fillText(
      String(arena.level.id || "00").padStart(2, "0") +
        " — " +
        (demo ? "SIMULATION" : "LIVE"),
      332,
      32,
    );
    c.textAlign = "left";
    for (const b of arena.level.barriers || []) {
      const [a, z] = endpoints(b, arena.time),
        open = b.period && gateOpen(b, arena.time);
      if (b.period) {
        c.setLineDash(open ? [4, 7] : []);
        line(c, a, z, open ? "#9e8653" : C.amber, open ? 1.5 : 5, open ? 0 : 6);
        c.setLineDash([]);
        for (const e of [a, z]) {
          c.fillStyle = C.amber;
          c.fillRect(e.x - 4, e.y - 4, 8, 8);
        }
        const f = ((arena.time + (b.phase || 0)) % b.period) / b.period;
        c.font = "7px monospace";
        c.fillStyle = C.amber;
        c.fillText(open ? "GATE / OPEN" : "GATE / LOCK", b.x - 23, b.y - 12);
        line(
          c,
          { x: b.x - 20, y: b.y + 12 },
          { x: b.x - 20 + 40 * f, y: b.y + 12 },
          C.amber,
          1,
        );
      } else {
        line(c, a, z, "#283b42", 12);
        line(c, a, z, "#657279", 1);
        const len = distance(a, z);
        for (let d = 8; d < len - 5; d += 12) {
          const f = d / len,
            x = a.x + (z.x - a.x) * f,
            y = a.y + (z.y - a.y) * f;
          c.save();
          c.translate(x, y);
          c.rotate(b.angle);
          line(c, { x: -2, y: -4 }, { x: 2, y: 4 }, "#af8b57", 1.5);
          c.restore();
        }
        for (const e of [a, z]) {
          poly(c, e.x, e.y, 6, 4, Math.PI / 4);
          c.fillStyle = "#536065";
          c.fill();
        }
        if (b.motion) {
          c.setLineDash([2, 4]);
          const axis = b.motion.axis;
          line(
            c,
            {
              x: b.x - (axis === "x" ? b.motion.range : 0),
              y: b.y - (axis === "y" ? b.motion.range : 0),
            },
            {
              x: b.x + (axis === "x" ? b.motion.range : 0),
              y: b.y + (axis === "y" ? b.motion.range : 0),
            },
            "#667279",
            0.5,
          );
          c.setLineDash([]);
        }
      }
    }
    for (const m of arena.mirrors) {
      const [a, b] = endpoints(m, arena.time),
        color = m.rotatable ? C.purple : C.cyan;
      if (m.rotatable) {
        c.setLineDash([2, 5]);
        c.strokeStyle = "#6d608c";
        c.lineWidth = 0.6;
        c.beginPath();
        c.arc(m.x, m.y, 27, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
        c.font = "8px monospace";
        c.fillStyle = color;
        c.fillText(
          String.fromCharCode(65 + arena.mirrors.indexOf(m)) + " ↻",
          m.x + 21,
          m.y - 20,
        );
      }
      line(c, a, b, "#09171c", 9);
      line(c, a, b, color, 3, 10);
      line(c, a, b, "#ddfff6", 0.8);
      for (const e of [a, b]) {
        poly(c, e.x, e.y, 3, 4, Math.PI / 4);
        c.fillStyle = color;
        c.fill();
      }
      c.fillStyle = "#102028";
      c.beginPath();
      c.arc(m.x, m.y, 4, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.stroke();
    }
    for (const sp of arena.level.splitters || []) {
      const t = time * 0.3;
      poly(c, sp.x, sp.y, 15, 3, -Math.PI / 2);
      c.fillStyle = "#211b35";
      c.fill();
      c.strokeStyle = C.purple;
      c.shadowColor = C.purple;
      c.shadowBlur = 12;
      c.lineWidth = 1.5;
      c.stroke();
      c.shadowBlur = 0;
      poly(c, sp.x, sp.y, 6, 3, Math.PI / 2);
      c.stroke();
      c.beginPath();
      c.arc(sp.x, sp.y, 20, t, t + Math.PI * 0.8);
      c.strokeStyle = "#755a9d";
      c.lineWidth = 0.7;
      c.stroke();
    }
    for (const target of arena.targets) {
      if (target.hp <= 0) continue;
      const { x, y } = target;
      const color =
        target.initialHp > 1 ? C.amber : target.chain ? C.purple : C.amber;
      if (target.chain) {
        c.setLineDash([1, 7]);
        c.lineWidth = 0.6;
        c.strokeStyle = "#765a89";
        c.globalAlpha = 0.5;
        c.beginPath();
        c.arc(x, y, target.chain, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
        c.setLineDash([]);
      }
      const pulse = this.reduced ? 0 : Math.sin(time * 3 + x) * 1.5;
      poly(c, x, y, target.r + 6 + pulse, 6, Math.PI / 6);
      c.strokeStyle = color;
      c.globalAlpha = 0.25;
      c.lineWidth = 0.7;
      c.stroke();
      c.globalAlpha = 1;
      poly(c, x, y, target.r, 6, Math.PI / 6);
      c.fillStyle = "#24241d";
      c.fill();
      c.strokeStyle = color;
      c.shadowColor = color;
      c.shadowBlur = 10;
      c.lineWidth = 1.5;
      c.stroke();
      c.shadowBlur = 0;
      if (target.initialHp > 1) {
        c.font = "bold 10px monospace";
        c.textAlign = "center";
        c.fillStyle = color;
        c.fillText(target.hp, x, y + 3.5);
        c.textAlign = "left";
        c.beginPath();
        c.arc(
          x,
          y,
          target.r + 3,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * (target.hp / target.initialHp),
        );
        c.stroke();
      } else {
        poly(c, x, y, 4, 4, 0);
        c.fillStyle = color;
        c.fill();
      }
      if (target.chain) {
        line(c, { x: x - 3, y }, { x: x + 3, y }, "#efddff", 1.3);
        line(c, { x, y: y - 3 }, { x, y: y + 3 }, "#efddff", 1.3);
      }
    }
    // The preview and pulse use the same collision geometry.
    if (aiming || demo) {
      for (const pts of paths) {
        c.globalAlpha = demo ? 0.65 : 0.5;
        c.setLineDash([3, 6]);
        path(c, pts);
        c.strokeStyle = C.cyan;
        c.lineWidth = 1;
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;
        for (const p of pts.slice(1, -1)) {
          c.beginPath();
          c.arc(p.x, p.y, 3, 0, Math.PI * 2);
          c.strokeStyle = C.cyan;
          c.lineWidth = 0.7;
          c.stroke();
        }
        const end = pts.at(-1);
        if (end) {
          c.beginPath();
          c.arc(end.x, end.y, 4, 0, Math.PI * 2);
          c.strokeStyle = C.cyan;
          c.stroke();
        }
      }
    }
    for (const p of arena.projectiles) {
      const pts = p.trail;
      if (pts.length > 1) {
        c.globalAlpha = p.alive ? 1 : 0.14;
        path(c, pts);
        c.lineWidth = 3;
        c.strokeStyle = p.split.size ? C.purple : C.cyan;
        c.shadowColor = c.strokeStyle;
        c.shadowBlur = 9;
        c.stroke();
        c.lineWidth = 1;
        c.strokeStyle = "#effff9";
        c.stroke();
        c.shadowBlur = 0;
        c.globalAlpha = 1;
      }
      if (p.alive) {
        c.fillStyle = "#effffa";
        c.shadowColor = C.cyan;
        c.shadowBlur = 14;
        c.beginPath();
        c.arc(p.x, p.y, 3, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
      }
    }
    const l = arena.level.launcher;
    c.save();
    c.translate(l.x, l.y);
    c.strokeStyle = "#36535b";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(0, 0, 22, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([1, 4]);
    c.beginPath();
    c.arc(0, 0, 29, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    c.rotate(Math.atan2(aim.y, aim.x) + Math.PI / 2);
    poly(c, 0, 0, 14, 6, Math.PI / 6);
    c.fillStyle = "#102b32";
    c.fill();
    c.strokeStyle = C.cyan;
    c.lineWidth = 1.5;
    c.shadowColor = C.cyan;
    c.shadowBlur = aiming ? 15 : 4;
    c.stroke();
    c.fillStyle = C.cyan;
    c.fillRect(-3, -23, 6, 14);
    c.fillStyle = "#e2fff8";
    c.fillRect(-1, -22, 2, 8);
    c.shadowBlur = 0;
    c.fillStyle = C.cyan;
    c.beginPath();
    c.arc(0, 0, 4, 0, Math.PI * 2);
    c.fill();
    c.restore();
    if (demo) {
      const pts = paths[0] || [];
      let lengths = pts.slice(1).map((p, i) => distance(p, pts[i]));
      let total = lengths.reduce((a, b) => a + b, 0),
        travel = ((time * 0.15) % 1) * total;
      for (let i = 0; i < lengths.length; i++) {
        if (travel <= lengths[i]) {
          const a = pts[i],
            b = pts[i + 1],
            f = travel / lengths[i];
          c.beginPath();
          c.arc(
            a.x + (b.x - a.x) * f,
            a.y + (b.y - a.y) * f,
            4,
            0,
            Math.PI * 2,
          );
          c.fillStyle = "#effff8";
          c.shadowColor = C.cyan;
          c.shadowBlur = 20;
          c.fill();
          c.shadowBlur = 0;
          break;
        }
        travel -= lengths[i];
      }
    }
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      c.globalAlpha = p.life / p.max;
      c.fillStyle = p.color;
      c.fillRect(p.x, p.y, 2, 2);
    }
    c.globalAlpha = 1;
    this.rings = this.rings.filter((r) => (r.life -= dt) > 0);
    for (const r of this.rings) {
      r.r += (r.max - r.r) * dt * 8;
      c.globalAlpha = r.life / 0.45;
      c.strokeStyle = r.color;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.restore();
  }
}

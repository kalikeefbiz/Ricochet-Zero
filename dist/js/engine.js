import {
  add,
  sub,
  mul,
  unit,
  rotate,
  reflect,
  rayCircle,
  rayCapsule,
  endpoints,
  gateOpen,
  distance,
} from "./geometry.js";
export const STEP = 1 / 120,
  SPEED = 430,
  MAX_BOUNCES = 16,
  LIFETIME = 7,
  RADIUS = 2.5,
  MIRROR_HALF = 2;
const walls = [
  { id: "w0", a: { x: 16, y: 16 }, b: { x: 344, y: 16 } },
  { id: "w1", a: { x: 344, y: 16 }, b: { x: 344, y: 504 } },
  { id: "w2", a: { x: 344, y: 504 }, b: { x: 16, y: 504 } },
  { id: "w3", a: { x: 16, y: 504 }, b: { x: 16, y: 16 } },
];
export class Arena {
  constructor(level) {
    this.level = structuredClone(level);
    this.targets = this.level.targets.map((t, i) => ({
      r: 12,
      hp: 1,
      ...t,
      id: "t" + i,
      initialHp: t.hp || 1,
    }));
    this.mirrors = this.level.mirrors || [];
    this.time = 0;
    this.shots = 0;
    this.bounces = 0;
    this.mirrorBounces = 0;
    this.wallBounces = 0;
    this.precisionTotal = 0;
    this.aimHits = 0;
    this.hits = 0;
    this.misses = 0;
    this.shotHits = 0;
    this.projectiles = [];
    this.events = [];
    this.status = "ready";
    this.nextId = 0;
    this.shotBounces = 0;
  }
  emit(type, p, extra = {}) {
    this.events.push({ type, x: p.x, y: p.y, ...extra });
  }
  rotateMirror(index) {
    const m = this.mirrors[index];
    if (this.status !== "ready" || !m?.rotatable) return false;
    m.angle = (m.angle + Math.PI / 12) % Math.PI;
    this.emit("rotate", m);
    return true;
  }
  fire(direction) {
    if (this.status !== "ready" || this.shots >= this.level.shots) return false;
    this.shots++;
    this.shotHits = 0;
    this.shotBounces = 0;
    this.status = "firing";
    this.projectiles = [
      this.makeProjectile(this.level.launcher, unit(direction)),
    ];
    this.emit("fire", this.level.launcher);
    return true;
  }
  makeProjectile(p, d, source) {
    return {
      id: ++this.nextId,
      x: p.x,
      y: p.y,
      d: { ...d },
      age: source?.age || 0,
      bounces: source?.bounces || 0,
      mirrorBounces: source?.mirrorBounces || 0,
      wallBounces: source?.wallBounces || 0,
      hit: new Set(source?.hit || []),
      split: new Set(source?.split || []),
      trail: [{ x: p.x, y: p.y }],
      alive: true,
    };
  }
  hitTarget(t, p, direct = true) {
    if (t.hp <= 0 || (t.initialHp > 1 && t.lastShot === this.shots)) return;
    t.lastShot = this.shots;
    const precision = direct
      ? Math.max(
          0,
          1 -
            Math.abs((t.x - p.x) * p.d.y - (t.y - p.y) * p.d.x) /
              (t.r + RADIUS),
        )
      : null;
    (t.routes ??= []).push({
      shot: this.shots,
      mirrors: p.mirrorBounces || 0,
      walls: p.wallBounces || 0,
      direct,
      precision,
    });
    if (direct) {
      this.aimHits++;
      this.precisionTotal += precision;
    }
    t.hp--;
    this.hits++;
    this.shotHits++;
    this.emit(t.hp <= 0 ? "destroy" : "hit", t, { chain: !!t.chain });
    if (t.hp <= 0 && t.chain) {
      this.emit("chain", t, { radius: t.chain });
      for (const other of this.targets)
        if (other.hp > 0 && distance(t, other) <= t.chain)
          this.hitTarget(other, p, false);
    }
  }
  collision(p, max) {
    let best = null;
    const consider = (hit, type, obj) => {
      if (hit && (!best || hit.t < best.t)) best = { ...hit, type, obj };
    };
    for (const w of walls)
      consider(rayCapsule(p, p.d, w.a, w.b, RADIUS, max), "reflect", w);
    for (const m of this.mirrors) {
      const [a, b] = endpoints(m, this.time);
      consider(
        rayCapsule(p, p.d, a, b, RADIUS + MIRROR_HALF, max),
        "reflect",
        m,
      );
    }
    for (const b of this.level.barriers || []) {
      if (b.period && gateOpen(b, this.time)) continue;
      const [a, z] = endpoints(b, this.time);
      consider(
        rayCapsule(p, p.d, a, z, RADIUS + (b.halfWidth ?? 4), max),
        "absorb",
        b,
      );
    }
    for (const s of this.level.splitters || [])
      if (!p.split.has(s.id))
        consider(rayCircle(p, p.d, s, 11 + RADIUS, max), "split", s);
    for (const t of this.targets)
      if (
        t.hp > 0 &&
        !p.hit.has(t.id) &&
        !(t.initialHp > 1 && t.lastShot === this.shots)
      )
        consider(rayCircle(p, p.d, t, t.r + RADIUS, max), "target", t);
    return best;
  }
  step(dt = STEP) {
    this.time += dt;
    if (this.status !== "firing") return;
    const spawned = [];
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= LIFETIME) {
        p.alive = false;
        this.emit("expire", p);
        continue;
      }
      let remaining = SPEED * dt,
        safety = 0;
      while (remaining > 0.001 && p.alive && safety++ < 12) {
        const hit = this.collision(p, remaining);
        const travel = hit ? hit.t : remaining;
        p.x += p.d.x * travel;
        p.y += p.d.y * travel;
        remaining -= travel;
        if (!hit) break;
        p.trail.push({ x: p.x, y: p.y, corner: true });
        if (hit.type === "target") {
          p.hit.add(hit.obj.id);
          this.hitTarget(hit.obj, p);
        }
        if (hit.type === "absorb") {
          p.alive = false;
          this.emit("absorb", p);
        }
        if (hit.type === "reflect") {
          p.d = unit(reflect(p.d, hit.normal));
          p.bounces++;
          this.bounces++;
          this.shotBounces++;
          const mirror =
            this.mirrors.includes(hit.obj) && hit.obj.kind !== "wall";
          if (mirror) {
            p.mirrorBounces++;
            this.mirrorBounces++;
          } else {
            p.wallBounces++;
            this.wallBounces++;
          }
          this.emit("reflect", p, {
            surface: mirror ? "mirror" : "wall",
            id: hit.obj.id,
          });
          if (p.bounces >= MAX_BOUNCES) {
            p.alive = false;
            this.emit("expire", p);
          }
        }
        if (hit.type === "split") {
          p.split.add(hit.obj.id);
          p.x = hit.obj.x;
          p.y = hit.obj.y;
          p.alive = false;
          this.emit("split", p);
          for (const a of [-1, 1]) {
            const d = rotate(p.d, a * (hit.obj.spread || Math.PI / 6));
            spawned.push(this.makeProjectile(add(p, mul(d, 1)), d, p));
          }
        }
        if (p.alive) {
          p.x += p.d.x * 0.04;
          p.y += p.d.y * 0.04;
          remaining = Math.max(0, remaining - 0.04);
        }
      }
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 65) p.trail.shift();
    }
    this.projectiles.push(...spawned);
    if (this.targets.every((t) => t.hp <= 0)) {
      this.status = "cleared";
      this.emit("clear", this.level.launcher);
      return;
    }
    if (this.targets.every((t) => t.hp <= 0 || t.lastShot === this.shots))
      for (const p of this.projectiles) p.alive = false;
    if (this.projectiles.every((p) => !p.alive)) {
      if (this.shotHits === 0) this.misses++;
      this.status = this.shots >= this.level.shots ? "failed" : "ready";
      this.emit(
        this.status === "failed" ? "fail" : "ready",
        this.level.launcher,
      );
    }
  }
  recall() {
    if (this.status !== "firing") return false;
    for (const p of this.projectiles) p.alive = false;
    this.step();
    return true;
  }
  settle() {
    let steps = 0;
    while (this.status === "firing" && steps++ < 2000) this.step();
    return this.status;
  }
  drain() {
    return this.events.splice(0);
  }
}
export function preview(arena, direction, maxDistance = 900) {
  const clone = new Arena(arena.level);
  clone.mirrors = structuredClone(arena.mirrors);
  clone.time = arena.time;
  clone.targets = structuredClone(arena.targets);
  const paths = [],
    pending = [
      {
        p: { ...arena.level.launcher },
        d: unit(direction),
        split: new Set(),
        hit: new Set(),
        budget: maxDistance,
        depth: 0,
      },
    ];
  while (pending.length && paths.length < 8) {
    let { p, d, split, hit, budget, depth } = pending.shift();
    const points = [{ ...p }];
    let bounces = 0;
    while (budget > 0 && bounces < 7) {
      const h = clone.collision({ ...p, d, hit, split }, budget);
      const dist = h ? h.t : budget;
      p = add(p, mul(d, dist));
      points.push({ ...p });
      budget -= dist;
      if (!h) break;
      if (h.type === "target") hit.add(h.obj.id);
      if (h.type === "absorb") break;
      if (h.type === "reflect") {
        d = reflect(d, h.normal);
        bounces++;
      }
      if (h.type === "split") {
        p = { x: h.obj.x, y: h.obj.y };
        split.add(h.obj.id);
        if (depth < 2)
          for (const sign of [-1, 1]) {
            const dir = rotate(d, sign * (h.obj.spread || Math.PI / 6));
            pending.push({
              p: add(p, mul(dir, 0.1)),
              d: dir,
              split: new Set(split),
              hit: new Set(hit),
              budget,
              depth: depth + 1,
            });
          }
        break;
      }
      p = add(p, mul(d, 0.1));
      budget -= 0.1;
    }
    paths.push(points);
  }
  return paths;
}
export function rating(arena) {
  const accuracy = arena.aimHits ? arena.precisionTotal / arena.aimHits : 0;
  const reflectionMastery = arena.targets.every(
    (t) =>
      t.routes?.length &&
      t.routes.every((r) => r.mirrors >= (arena.level.requiredMirrors || 0)),
  );
  const efficient = arena.shots <= arena.level.par && arena.misses === 0;
  const stars =
    efficient &&
    reflectionMastery &&
    accuracy >= (arena.level.starPrecision ?? 0.72)
      ? 3
      : arena.shots <= arena.level.par + 1
        ? 2
        : 1;
  const perfect =
    stars === 3 &&
    accuracy >= (arena.level.masteryPrecision ?? 0.88) &&
    arena.mirrorBounces >= (arena.level.perfectBounces || 0);
  return {
    stars,
    perfect,
    shots: arena.shots,
    accuracy,
    reflectionMastery,
    score: Math.round(
      1000 +
        Math.max(0, arena.level.shots - arena.shots) * 350 +
        arena.targets.length * 150 +
        Math.min(arena.mirrorBounces, arena.level.perfectBounces || 8) * 45 +
        accuracy * 400 +
        (efficient ? 250 : 0) +
        (perfect ? 500 : 0),
    ),
  };
}

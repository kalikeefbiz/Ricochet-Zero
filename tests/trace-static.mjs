// Event-driven adversarial tracer. It uses the game's exact collision queries,
// target rules, reflection normals, radius, lifetime distance and bounce cap.
// Hazards may be removed by the caller to conservatively allow every open window.
import { Arena, SPEED, LIFETIME, MAX_BOUNCES } from "../dist/js/engine.js";
import { add, mul, rotate, unit, reflect } from "../dist/js/geometry.js";
export function traceStatic(level, direction, angles) {
  const a = new Arena(level);
  if (angles)
    for (let i = 0; i < a.mirrors.length; i++) a.mirrors[i].angle = angles[i];
  a.fire(direction);
  const queue = [{ p: a.projectiles[0], budget: SPEED * LIFETIME }];
  while (queue.length) {
    let { p, budget } = queue.shift();
    let safety = 0;
    while (p.alive && budget > 0.001 && safety++ < 100) {
      const h = a.collision(p, budget);
      if (!h) break;
      p.x += p.d.x * h.t;
      p.y += p.d.y * h.t;
      budget -= h.t;
      if (h.type === "target") {
        p.hit.add(h.obj.id);
        a.hitTarget(h.obj, p);
      }
      if (h.type === "absorb") break;
      if (h.type === "reflect") {
        p.d = unit(reflect(p.d, h.normal));
        p.bounces++;
        a.bounces++;
        const mirror = a.mirrors.includes(h.obj) && h.obj.kind !== "wall";
        if (mirror) {
          p.mirrorBounces++;
          a.mirrorBounces++;
        } else {
          p.wallBounces++;
          a.wallBounces++;
        }
        if (p.bounces >= MAX_BOUNCES) break;
      }
      if (h.type === "split") {
        p.split.add(h.obj.id);
        p.x = h.obj.x;
        p.y = h.obj.y;
        for (const sign of [-1, 1]) {
          const d = rotate(p.d, sign * (h.obj.spread || Math.PI / 6));
          queue.push({
            p: a.makeProjectile(add(p, mul(d, 1)), d, p),
            budget: budget - 1,
          });
        }
        break;
      }
      p.x += p.d.x * 0.04;
      p.y += p.d.y * 0.04;
      budget -= 0.04;
    }
  }
  a.status = a.targets.every((t) => t.hp <= 0) ? "cleared" : "ready";
  return a;
}
export const permissive = (level) => ({
  ...structuredClone(level),
  barriers: (level.barriers || []).filter((b) => !b.motion && !b.period),
});
export function configStates(level) {
  const states = [],
    a = new Arena(level);
  states.push(a.mirrors.map((m) => m.angle));
  for (const r of level.solution.rotations || [])
    for (let i = 0; i < r.taps; i++) a.rotateMirror(r.index);
  states.push(a.mirrors.map((m) => m.angle));
  for (const step of level.solution.steps || [])
    if (step.rotations?.length) {
      for (const r of step.rotations)
        for (let i = 0; i < r.taps; i++) a.rotateMirror(r.index);
      states.push(a.mirrors.map((m) => m.angle));
    }
  return states;
}
export const direction = (angle) => ({
  x: Math.cos(angle),
  y: Math.sin(angle),
});

// Optimistic shot-cover bound: allow every sampled configuration between shots
// and let a hit chain core detonate immediately, even when it is armored. This
// can underestimate the true minimum, so it cannot dismiss a cheaper shortcut.
export function minimumSampledShots(targets, patterns) {
  const goals = targets.map((t) => t.hp || 1),
    unique = new Map();
  for (const pattern of patterns) {
    const v = [...pattern];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < targets.length; i++)
        if (v[i] > 0 && targets[i].chain)
          for (let j = 0; j < targets.length; j++)
            if (
              !v[j] &&
              Math.hypot(
                targets[i].x - targets[j].x,
                targets[i].y - targets[j].y,
              ) <= targets[i].chain
            ) {
              v[j] = 1;
              changed = true;
            }
    }
    if (v.some(Boolean)) unique.set(v.join(","), v);
  }
  let frontier = [goals.map(() => 0)],
    seen = new Set([frontier[0].join(",")]);
  for (let depth = 1; depth <= goals.reduce((a, b) => a + b, 0); depth++) {
    const next = [];
    for (const state of frontier)
      for (const damage of unique.values()) {
        const state2 = state.map((n, i) => Math.min(goals[i], n + damage[i]));
        if (state2.every((n, i) => n === goals[i])) return depth;
        const k = state2.join(",");
        if (!seen.has(k)) {
          seen.add(k);
          next.push(state2);
        }
      }
    frontier = next;
    if (!frontier.length) break;
  }
  return Infinity;
}

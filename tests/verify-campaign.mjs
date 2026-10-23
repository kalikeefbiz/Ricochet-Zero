import { Arena, rating } from "../dist/js/engine.js";
import { ALL_LEVELS } from "../dist/js/levels.js";
import { rotate } from "../dist/js/geometry.js";
import fs from "node:fs";
export const cloneArena = (a) =>
  Object.assign(new Arena(a.level), structuredClone(a));
export function applyRotations(a, rotations = []) {
  for (const r of rotations)
    for (let t = 0; t < r.taps; t++) a.rotateMirror(r.index);
}
export function prepareStep(a, step, index) {
  applyRotations(a, step.rotations);
  if (index && a.level.solution.alignPeriod) {
    const period = a.level.solution.alignPeriod;
    a.time = Math.ceil((a.time + 0.001) / period) * period;
  }
  if (step.wait) a.time += step.wait;
}
export function attempt(level, offset = 0) {
  const a = new Arena(level);
  applyRotations(a, level.solution.rotations);
  a.time = level.solution.wait || 0;
  const steps =
    level.solution.steps || Array.from({ length: level.par }, () => ({}));
  for (let i = 0; i < steps.length; i++) {
    if (a.status === "cleared" || a.status !== "ready") break;
    prepareStep(a, steps[i], i);
    a.fire(
      rotate(
        steps[i].direction || level.solution.direction,
        Array.isArray(offset) ? offset[i] : offset,
      ),
    );
    a.settle();
  }
  return a;
}
export function solve(level) {
  let a = new Arena(level);
  applyRotations(a, level.solution.rotations);
  a.time = level.solution.wait || 0;
  const plan =
      level.solution.steps || Array.from({ length: level.par }, () => ({})),
    offsets = [],
    margins = [],
    clearMargins = [],
    sequence = [];
  const switchAt = plan.findIndex((s, i) => i > 0 && s.rotations?.length);
  for (let shot = 0; shot < plan.length; shot++) {
    if (a.status === "cleared") break;
    prepareStep(a, plan[shot], shot);
    const expected = a.targets.filter(
      (t) =>
        t.hp > 0 &&
        (switchAt < 0 || shot < switchAt
          ? t.x < 180 || switchAt < 0
          : t.x > 180),
    );
    const candidates = [];
    for (let i = -160; i <= 160; i++) {
      const offset = i * 0.00075,
        b = cloneArena(a);
      b.events = [];
      b.fire(rotate(plan[shot].direction || level.solution.direction, offset));
      b.settle();
      const damage = expected.reduce(
        (n, t) => n + t.hp - b.targets.find((x) => x.id === t.id).hp,
        0,
      );
      const contacts = b.aimHits - a.aimHits;
      const precision = contacts
        ? (b.precisionTotal - a.precisionTotal) / contacts
        : 0;
      if (damage > 0 && ["ready", "cleared"].includes(b.status))
        candidates.push({
          i,
          offset,
          b,
          damage,
          precision,
          bounces: b.bounces - a.bounces,
        });
    }
    if (!candidates.length) return null;
    const max = Math.max(...candidates.map((c) => c.damage));
    let optimal = candidates.filter((c) => c.damage === max);
    const precise = optimal.filter(
      (c) => c.precision >= (level.masteryPrecision ?? 0.88),
    );
    if (precise.length) optimal = precise;
    else {
      const stars = optimal.filter(
        (c) => c.precision >= (level.starPrecision ?? 0.72),
      );
      if (stars.length) optimal = stars;
    }
    const min = Math.min(...optimal.map((c) => c.bounces));
    optimal = optimal.filter((c) => c.bounces === min);
    const groups = [];
    for (const c of optimal) {
      const last = groups.at(-1);
      if (last && last.at(-1).i === c.i - 1) last.push(c);
      else groups.push([c]);
    }
    groups.sort(
      (x, y) =>
        y.length - x.length ||
        Math.abs(x[Math.floor(x.length / 2)].offset) -
          Math.abs(y[Math.floor(y.length / 2)].offset),
    );
    const group = groups[0],
      best = group[Math.floor(group.length / 2)];
    const wins = candidates.filter((c) => c.damage === max).map((c) => c.i);
    let low = best.i,
      high = best.i;
    while (wins.includes(low - 1)) low--;
    while (wins.includes(high + 1)) high++;
    clearMargins.push(
      Math.min(best.i - low + 0.5, high - best.i + 0.5) * 0.00075,
    );
    offsets.push(best.offset);
    margins.push((group.length * 0.00075) / 2);
    sequence.push({
      offset: best.offset,
      time: a.time,
      rotations: plan[shot].rotations || [],
      precision: best.precision,
      reflections: best.bounces,
    });
    a = best.b;
  }
  if (a.status !== "cleared") return null;
  return {
    a,
    offset: offsets[0],
    offsets,
    margin: Math.min(...margins),
    clearMargin: Math.min(...clearMargins),
    sequence,
  };
}
if (process.argv[1]?.endsWith("verify-campaign.mjs")) {
  const results = [];
  for (const l of ALL_LEVELS) {
    const r = solve(l),
      grade = r ? rating(r.a) : null;
    const row = {
      id: l.id,
      name: l.name,
      solved: !!r,
      offset: r?.offset,
      offsets: r?.offsets,
      marginRadians: r?.margin,
      clearMarginRadians: r?.clearMargin,
      shots: r?.a.shots,
      bounces: r?.a.bounces,
      mirrorBounces: r?.a.mirrorBounces,
      wallBounces: r?.a.wallBounces,
      minimumTargetMirrors: r
        ? Math.min(
            ...r.a.targets.flatMap((t) => t.routes.map((h) => h.mirrors)),
          )
        : null,
      perfect: grade?.perfect,
      stars: grade?.stars,
      accuracy: grade?.accuracy,
      sequence: r?.sequence,
    };
    results.push(row);
    console.log(
      `${r ? "PASS" : "FAIL"} ${String(l.id).padStart(2, "0")} ${l.name}${r ? ` · ${r.a.shots} shots · ${r.a.mirrorBounces} mirror / ${r.a.wallBounces} wall · ${grade.stars} stars · ${(grade.accuracy * 100).toFixed(0)}% accuracy` : ""}`,
    );
  }
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(
    "artifacts/solutions.json",
    JSON.stringify(results, null, 2),
  );
  if (results.some((r) => !r.solved)) process.exitCode = 1;
}

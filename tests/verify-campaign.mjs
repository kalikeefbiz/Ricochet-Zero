import { Arena, STEP, rating } from "../dist/js/engine.js";
import { ALL_LEVELS } from "../dist/js/levels.js";
import { rotate } from "../dist/js/geometry.js";
import fs from "node:fs";
export function attempt(level, offset = 0) {
  const a = new Arena(level);
  for (const r of level.solution.rotations || [])
    for (let t = 0; t < r.taps; t++) a.rotateMirror(r.index);
  a.time = level.solution.wait || 0;
  const d = rotate(level.solution.direction, offset);
  for (let shot = 0; shot < level.par; shot++) {
    if (a.status === "cleared") break;
    if (a.status !== "ready") break;
    if (shot && level.solution.alignPeriod)
      a.time =
        Math.ceil(a.time / level.solution.alignPeriod) *
        level.solution.alignPeriod;
    if (shot && level.solution.waitBetween)
      a.time += level.solution.waitBetween;
    a.fire(d);
    a.settle();
  }
  return a;
}
export function solve(level) {
  const candidates = [];
  for (let i = -160; i <= 160; i++) {
    const offset = i * 0.00075,
      a = attempt(level, offset);
    if (a.status === "cleared")
      candidates.push({ i, offset, a, perfect: rating(a).perfect });
  }
  if (!candidates.length) return null;
  const perfect = candidates.some((c) => c.perfect);
  const minBounces = Math.min(
    ...candidates.filter((c) => c.perfect === perfect).map((c) => c.a.bounces),
  );
  const optimal = candidates.filter(
    (c) => c.perfect === perfect && c.a.bounces === minBounces,
  );
  const groups = [];
  for (const c of optimal) {
    const last = groups.at(-1);
    if (last && last.at(-1).i === c.i - 1) last.push(c);
    else groups.push([c]);
  }
  groups.sort(
    (a, b) =>
      b.length - a.length ||
      Math.abs(a[Math.floor(a.length / 2)].offset) -
        Math.abs(b[Math.floor(b.length / 2)].offset),
  );
  const group = groups[0],
    best = group[Math.floor(group.length / 2)];
  return { ...best, margin: (group.length * 0.00075) / 2 };
}
if (process.argv[1]?.endsWith("verify-campaign.mjs")) {
  const results = [];
  for (const l of ALL_LEVELS) {
    const r = solve(l);
    results.push({
      id: l.id,
      name: l.name,
      solved: !!r,
      offset: r?.offset,
      marginRadians: r?.margin,
      shots: r?.a.shots,
      bounces: r?.a.bounces,
      perfect: r ? rating(r.a).perfect : false,
    });
    console.log(
      `${r ? "PASS" : "FAIL"} ${String(l.id).padStart(2, "0")} ${l.name}${r ? ` · ${r.a.shots} shots · ${r.a.bounces} bounces · offset ${r.offset}` : ""}`,
    );
  }
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(
    "artifacts/solutions.json",
    JSON.stringify(results, null, 2),
  );
  if (results.some((r) => !r.solved)) process.exitCode = 1;
}

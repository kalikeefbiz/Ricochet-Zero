import fs from "node:fs";
import { LEVELS } from "../dist/js/levels.js";
import {
  traceStatic,
  permissive,
  configStates,
  direction,
  minimumSampledShots,
} from "./trace-static.mjs";
const deg = Math.PI / 180;
const results = [];
const fullAngles = Array.from({ length: 1440 }, (_, i) => i * 0.25 * deg);
function scan(level, configs, angles, required = 1) {
  let rays = 0,
    minimum = Infinity,
    zeroHits = 0,
    clear = false;
  const patterns = new Set();
  const targets = new Set(),
    shortcuts = [];
  for (const config of configs)
    for (const theta of angles) {
      const a = traceStatic(level, direction(theta), config);
      rays++;
      const damage = a.targets.map((t) => t.initialHp - t.hp);
      if (damage.some(Boolean)) patterns.add(damage.join(","));
      if (a.status === "cleared") clear = true;
      for (const t of a.targets)
        for (const hit of t.routes || []) {
          targets.add(t.id);
          minimum = Math.min(minimum, hit.mirrors);
          if (hit.mirrors === 0) zeroHits++;
          if (hit.mirrors < required && shortcuts.length < 5)
            shortcuts.push({
              angle: theta / deg,
              target: t.id,
              mirrors: hit.mirrors,
              config,
            });
        }
    }
  return {
    rays,
    patterns: [...patterns].map((s) => s.split(",").map(Number)),
    minimum: Number.isFinite(minimum) ? minimum : null,
    zeroHits,
    clear,
    targets: [...targets],
    shortcuts,
  };
}
if (process.argv.includes("--baseline")) {
  const levels = JSON.parse(
    fs.readFileSync("tests/fixtures/original-campaign.json"),
  ).slice(0, 30);
  const baseline = [];
  for (const l of levels) {
    const p = permissive(l);
    p.mirrors = (p.mirrors || []).filter((m) => m.kind === "wall");
    const result = scan(p, [p.mirrors.map((m) => m.angle)], fullAngles);
    baseline.push({
      id: l.id,
      name: l.name,
      unprotectedTargets: result.targets.length,
      totalTargets: l.targets.length,
      zeroMirrorOneShotClear: result.clear,
    });
    console.log(
      `BASE ${l.id} ${result.targets.length}/${l.targets.length} targets reachable without mirrors`,
    );
  }
  fs.writeFileSync(
    "artifacts/overhaul/baseline-audit.json",
    JSON.stringify(baseline, null, 2),
  );
  process.exit();
}
const solutions = JSON.parse(fs.readFileSync("artifacts/solutions.json"));
for (const l of LEVELS) {
  const p = permissive(l),
    states = configStates(l),
    heading = Math.atan2(l.solution.direction.y, l.solution.direction.x),
    local = Array.from(
      { length: 145 },
      (_, i) => heading + (i - 72) * 0.25 * deg,
    );
  const noMirror = structuredClone(p);
  noMirror.mirrors = p.mirrors.filter((m) => m.kind === "wall");
  const removed = scan(
    noMirror,
    [noMirror.mirrors.map((m) => m.angle)],
    fullAngles,
  );
  const disabled = structuredClone(p);
  disabled.barriers.push(
    ...p.mirrors
      .filter((m) => m.kind !== "wall")
      .map((m) => ({ ...m, halfWidth: 2 })),
  );
  disabled.mirrors = disabled.mirrors.filter((m) => m.kind === "wall");
  const absorbing = scan(
    disabled,
    [disabled.mirrors.map((m) => m.angle)],
    fullAngles,
  );
  const configs = [...states],
    dedup = new Set(configs.map((c) => c.map((a) => a.toFixed(5)).join(",")));
  const put = (c) => {
    const k = c.map((a) => a.toFixed(5)).join(",");
    if (!dedup.has(k)) {
      dedup.add(k);
      configs.push(c);
    }
  };
  for (const base of states.slice(1))
    for (let m = 0; m < p.mirrors.length; m++)
      if (p.mirrors[m].rotatable)
        for (let step = 0; step < 12; step++) {
          const c = [...base];
          c[m] = (p.mirrors[m].angle + (step * Math.PI) / 12) % Math.PI;
          put(c);
        }
  const rot = p.mirrors.flatMap((m, i) => (m.rotatable ? [i] : []));
  for (let code = 0; code < Math.min(128, 4 ** rot.length); code++) {
    const c = [...states[1]];
    rot.forEach(
      (index, j) =>
        (c[index] =
          (p.mirrors[index].angle +
            ((Math.floor(code / 4 ** j) % 4) * Math.PI) / 4) %
          Math.PI),
    );
    put(c);
  }
  let seed = l.id * 7919;
  for (let i = 0; i < (rot.length ? 48 : 0); i++) {
    const c = [...states[1]];
    for (const index of rot) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      c[index] =
        (p.mirrors[index].angle + ((seed % 12) * Math.PI) / 12) % Math.PI;
    }
    put(c);
  }
  const broad = scan(p, states, fullAngles, l.requiredMirrors),
    alternatives = scan(p, configs, local, l.requiredMirrors);
  const essential = [];
  for (let index = 0; index < p.mirrors.length; index++) {
    const omit = structuredClone(p);
    omit.barriers.push({ ...omit.mirrors[index], halfWidth: 2 });
    omit.mirrors.splice(index, 1);
    const changedStates = states
      .slice(1)
      .map((s) => s.filter((_, i) => i !== index));
    const reachable = scan(omit, changedStates, local);
    essential.push({
      mirror: index,
      kind: p.mirrors[index].kind || "mirror",
      essential: reachable.targets.length < l.targets.length,
      unreachableTargets: l.targets.length - reachable.targets.length,
    });
  }
  const defaults = rot.length ? scan(p, [states[0]], fullAngles) : null;
  const solved = solutions.find((s) => s.id === l.id);
  const row = {
    id: l.id,
    name: l.name,
    requiredMirrorsPerTarget: l.requiredMirrors,
    solutionMirrorReflections: solved?.mirrorBounces,
    solutionWallReflections: solved?.wallBounces,
    solutionShots: solved?.shots,
    minimumSampledShots: minimumSampledShots(l.targets, [
      ...broad.patterns,
      ...alternatives.patterns,
    ]),
    shotLimit: l.shots,
    solved: solved?.solved,
    minimumObservedTargetMirrors: Math.min(
      ...[broad.minimum, alternatives.minimum].filter((x) => x !== null),
    ),
    zeroReflectionTargetContacts: broad.zeroHits + alternatives.zeroHits,
    mirrorRemovedTargetContacts: removed.targets.length,
    mirrorAbsorbingTargetContacts: absorbing.targets.length,
    shortcuts: [...broad.shortcuts, ...alternatives.shortcuts],
    essentialMirrors: essential,
    rotationRequired: rot.length
      ? defaults.targets.length < l.targets.length
      : null,
    configurations: configs.length,
    anglesFull: 0.25,
    anglesConfigurations: 0.25,
    sampledRays:
      removed.rays +
      absorbing.rays +
      broad.rays +
      alternatives.rays +
      (defaults?.rays || 0),
  };
  row.passed =
    !!row.solved &&
    row.solutionShots <= row.shotLimit &&
    Number.isFinite(row.minimumSampledShots) &&
    row.minimumSampledShots >= l.par &&
    row.minimumObservedTargetMirrors >= l.requiredMirrors &&
    !row.zeroReflectionTargetContacts &&
    !row.mirrorRemovedTargetContacts &&
    !row.mirrorAbsorbingTargetContacts &&
    !row.shortcuts.length &&
    essential.every((m) => m.essential) &&
    row.rotationRequired !== false;
  results.push(row);
  console.log(
    `${row.passed ? "PASS" : "FAIL"} ${String(l.id).padStart(2, "0")} · ${row.solutionMirrorReflections} mirror · ${row.solutionShots}/${row.shotLimit} shots · cheapest ${row.minimumSampledShots} · min ${row.minimumObservedTargetMirrors} · bypass ${row.mirrorRemovedTargetContacts}/${row.mirrorAbsorbingTargetContacts} · essential ${essential.filter((m) => m.essential).length}/${essential.length} · ${row.sampledRays} rays`,
  );
}
fs.writeFileSync(
  "artifacts/overhaul/campaign-audit.json",
  JSON.stringify(results, null, 2),
);
if (results.some((r) => !r.passed)) process.exitCode = 1;

import { minimumSampledShots } from "./trace-static.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { Arena, rating } from "../dist/js/engine.js";
import { LEVELS } from "../dist/js/levels.js";
import { unit, sub, endpoints, rotate } from "../dist/js/geometry.js";
import { traceStatic, permissive, configStates } from "./trace-static.mjs";
import {
  loadSave,
  persist,
  record,
  unlocked,
  stats,
  SAVE_KEY,
} from "../dist/js/save.js";
const basic = (extra = {}) => ({
  launcher: { x: 180, y: 466 },
  targets: [{ x: 180, y: 110 }],
  shots: 3,
  par: 1,
  ...extra,
});
test("an efficient edge hit earns two stars; central and wasted shots grade differently", () => {
  const center = new Arena(basic());
  center.fire({ x: 0, y: -1 });
  center.settle();
  assert.equal(rating(center).stars, 3);
  const edge = new Arena(basic());
  edge.fire(unit({ x: 0.02, y: -1 }));
  edge.settle();
  assert.equal(edge.status, "cleared");
  assert.equal(edge.shots, 1);
  assert.equal(rating(edge).stars, 2);
  assert.equal(rating(edge).perfect, false);
  assert.ok(rating(edge).accuracy < 0.72);
  const wasted = new Arena(basic());
  wasted.fire({ x: 1, y: 0 });
  wasted.recall();
  wasted.fire({ x: 0, y: -1 });
  wasted.settle();
  assert.equal(rating(wasted).stars, 2);
});
test("reflection mastery counts mirror contacts rather than arena wall bounces", () => {
  const a = new Arena(basic({ requiredMirrors: 1 }));
  a.fire({ x: 0, y: -1 });
  a.settle();
  assert.equal(
    a.status,
    "cleared",
    "target damage is never secretly gated by a mastery flag",
  );
  assert.equal(rating(a).reflectionMastery, false);
  assert.equal(rating(a).stars, 2);
  const b = new Arena(basic({ targets: [{ x: 100, y: 100 }] }));
  b.fire({ x: 1, y: 0 });
  b.settle();
  assert.ok(b.wallBounces > 0);
  assert.equal(b.mirrorBounces, 0);
});
test("all opening ten reject a launcher-to-target shot through actual fixed-step physics", () => {
  for (const l of LEVELS.slice(0, 10)) {
    for (const target of l.targets) {
      const a = new Arena(l);
      a.fire(unit(sub(target, l.launcher)));
      a.settle();
      assert.ok(
        a.targets.every((t, i) => t.hp === (l.targets[i].hp || 1)),
        `Unintended target-directed clear ${l.id}`,
      );
    }
  }
});
test("removing every mirror leaves no target access in any campaign arena", () => {
  for (const l of LEVELS) {
    const p = permissive(l);
    p.mirrors = p.mirrors.filter((m) => m.kind === "wall");
    for (let i = 0; i < 180; i++) {
      const a = traceStatic(p, {
        x: Math.cos((i * Math.PI) / 90),
        y: Math.sin((i * Math.PI) / 90),
      });
      assert.ok(
        a.targets.every((t, j) => t.hp === (l.targets[j].hp || 1)),
        `Mirror bypass ${l.id}`,
      );
    }
  }
});
test("the shortcut detector catches a deliberately reopened direct route", () => {
  const level = structuredClone(LEVELS[0]);
  level.barriers = [];
  level.mirrors = [];
  const a = traceStatic(level, unit(sub(level.targets[0], level.launcher)));
  assert.equal(a.status, "cleared");
  assert.equal(a.targets[0].routes[0].mirrors, 0);
});
test("event-driven tracer matches actual target outcomes for sampled fixed-step shots", () => {
  for (const id of [1, 6, 9, 16, 19, 24, 28, 30]) {
    const l = permissive(LEVELS[id - 1]),
      states = configStates(l),
      heading = Math.atan2(l.solution.direction.y, l.solution.direction.x);
    for (const angles of states.slice(1))
      for (let i = -12; i <= 12; i++) {
        const d = {
            x: Math.cos(heading + i * 0.003),
            y: Math.sin(heading + i * 0.003),
          },
          a = new Arena(l);
        a.mirrors.forEach((m, j) => (m.angle = angles[j]));
        a.fire(d);
        a.settle();
        const b = traceStatic(l, d, angles);
        assert.deepEqual(
          a.targets.map((t) => t.hp),
          b.targets.map((t) => t.hp),
          `Tracer disagreement ${id} offset ${i}`,
        );
      }
  }
});
test("absorbing shells form closed visible boundaries with no unmatched endpoints", () => {
  for (const l of LEVELS) {
    const vertices = new Map();
    for (const wall of l.barriers.filter((b) => b.shell))
      for (const e of endpoints(wall)) {
        const k = `${e.x.toFixed(3)},${e.y.toFixed(3)}`;
        vertices.set(k, (vertices.get(k) || 0) + 1);
      }
    assert.ok(
      [...vertices.values()].every((n) => n === 2),
      `Open shell ${l.id}`,
    );
  }
});
test("old saves retain unlocks and settings, archive old PBs, and roundtrip after replay", () => {
  const legacy = {
    version: 1,
    results: {
      1: { score: 2500, shots: 1, stars: 3, perfect: true },
      15: { score: 2800, shots: 1, stars: 3, perfect: true },
      16: { score: 3100, shots: 1, stars: 3, perfect: true },
      30: { score: 4000, shots: 1, stars: 3, perfect: true },
    },
    settings: { sfx: 0.25, reducedMotion: true, guide: "extended" },
    tutorialSeen: true,
  };
  let raw = JSON.stringify(legacy);
  const storage = {
    getItem: () => raw,
    setItem: (key, v) => {
      assert.equal(key, SAVE_KEY);
      raw = v;
    },
  };
  const save = loadSave(storage);
  assert.equal(save.results[16].shots, 1);
  assert.equal(save.results[16].revision, 1);
  assert.equal(unlocked(save, 16), true);
  assert.equal(unlocked(save, 17), true);
  assert.equal(unlocked(save, 33), true);
  assert.deepEqual(save.settings, legacy.settings);
  record(save, 16, { score: 2800, shots: 2, stars: 2, perfect: false });
  assert.equal(save.results[16].shots, 2);
  assert.equal(save.results[16].revision, 2);
  assert.equal(save.legacyResults[16].shots, 1);
  assert.equal(save.legacyResults[16].score, 3100);
  assert.equal(save.results[30].score, 4000);
  assert.equal(stats(save).cleared, 4);
  assert.equal(persist(save, storage), true);
  assert.deepEqual(loadSave(storage), save);
});

test("shot-cover analysis detects a cheaper plan and handles armored chains optimistically", () => {
  assert.equal(
    minimumSampledShots(
      [{ hp: 1 }, { hp: 2 }],
      [
        [1, 0],
        [0, 1],
      ],
    ),
    3,
  );
  assert.equal(minimumSampledShots([{ hp: 1 }, { hp: 1 }], [[1, 1]]), 1);
  assert.equal(
    minimumSampledShots(
      [
        { x: 0, y: 0, hp: 2, chain: 70 },
        { x: 40, y: 0 },
      ],
      [[1, 0]],
    ),
    2,
  );
});

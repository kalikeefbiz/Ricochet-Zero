import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  reflect,
  unit,
  dot,
  rayCircle,
  raySegment,
  rayCapsule,
  gateOpen,
  endpoints,
} from "../dist/js/geometry.js";
import {
  Arena,
  STEP,
  LIFETIME,
  MAX_BOUNCES,
  preview,
  rating,
} from "../dist/js/engine.js";
import {
  freshSave,
  record,
  persist,
  loadSave,
  unlocked,
  stats,
  SAVE_KEY,
  nextLevel,
} from "../dist/js/save.js";
import { ALL_LEVELS, LEVELS } from "../dist/js/levels.js";
import { solve } from "./verify-campaign.mjs";
const CLASSIC = Object.fromEntries(
  JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/classic-mechanics.json", import.meta.url),
    ),
  ).map((l) => [l.id, l]),
);
const near = (a, b, eps = 1e-8) =>
  assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const basic = (extra = {}) => ({
  launcher: { x: 180, y: 466 },
  targets: [{ x: 180, y: 110 }],
  shots: 3,
  par: 1,
  ...extra,
});
test("reflection preserves energy and reverses only normal velocity", () => {
  for (let i = 0; i < 360; i++) {
    const d = unit({ x: Math.cos(i), y: Math.sin(i) }),
      n = unit({ x: Math.sin(i * 0.37), y: Math.cos(i * 0.37) }),
      r = reflect(d, n);
    near(Math.hypot(r.x, r.y), 1);
    near(dot(r, n), -dot(d, n));
    near(reflect(r, n).x, d.x);
    near(reflect(r, n).y, d.y);
  }
});
test("continuous circle collision catches high speed traversal and tangency", () => {
  near(
    rayCircle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 20, y: 0 }, 2, 100).t,
    18,
  );
  near(
    rayCircle({ x: 0, y: 2 }, { x: 1, y: 0 }, { x: 20, y: 0 }, 2, 100).t,
    20,
  );
  assert.equal(
    rayCircle({ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 20, y: 0 }, 2),
    null,
  );
  assert.equal(
    rayCircle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 20, y: 0 }, 2, 10),
    null,
  );
});
test("segment collision rejects parallel and out-of-range hits", () => {
  const a = { x: 10, y: -5 },
    b = { x: 10, y: 5 };
  near(raySegment({ x: 0, y: 0 }, { x: 1, y: 0 }, a, b).t, 10);
  assert.equal(raySegment({ x: 0, y: 7 }, { x: 1, y: 0 }, a, b), null);
  assert.equal(raySegment({ x: 0, y: 0 }, { x: 0, y: 1 }, a, b), null);
});
test("capsules include mirror thickness and round endpoints", () => {
  near(
    rayCapsule(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 10, y: -5 },
      { x: 10, y: 5 },
      2,
    ).t,
    8,
  );
  assert.ok(
    rayCapsule(
      { x: 0, y: 6 },
      { x: 1, y: 0 },
      { x: 10, y: -5 },
      { x: 10, y: 5 },
      2,
    ),
  );
  assert.equal(
    rayCapsule(
      { x: 0, y: 8 },
      { x: 1, y: 0 },
      { x: 10, y: -5 },
      { x: 10, y: 5 },
      2,
    ),
    null,
  );
});
test("nonreflective barriers absorb instead of reflecting", () => {
  const a = new Arena(
    basic({ barriers: [{ x: 180, y: 300, length: 100, angle: 0 }] }),
  );
  a.fire({ x: 0, y: -1 });
  a.settle();
  assert.equal(a.targets[0].hp, 1);
  assert.equal(a.bounces, 0);
  assert.equal(a.status, "ready");
  assert.ok(a.events.some((e) => e.type === "absorb"));
});
test("target destruction, all-target completion and efficient score", () => {
  const a = new Arena(basic());
  a.fire({ x: 0, y: -1 });
  a.settle();
  assert.equal(a.status, "cleared");
  assert.equal(a.targets[0].hp, 0);
  assert.equal(a.shots, 1);
  assert.equal(rating(a).stars, 3);
  assert.equal(rating(a).perfect, true);
  assert.equal(rating(a).accuracy, 1);
  assert.ok(rating(a).score > 1000);
});
test("armored targets require distinct shots even through a splitter", () => {
  const a = new Arena(CLASSIC[22]);
  for (let i = 0; i < 2; i++) {
    a.fire({ x: 0, y: -1 });
    a.settle();
    assert.ok(a.targets.every((t) => t.hp === 1 - i));
  }
  assert.equal(a.status, "cleared");
  assert.equal(a.shots, 2);
});
test("chain reactions propagate recursively with no duplicate destruction", () => {
  const a = new Arena(CLASSIC[20]);
  a.fire({ x: 0, y: -1 });
  a.settle();
  assert.equal(a.status, "cleared");
  assert.equal(a.events.filter((e) => e.type === "destroy").length, 4);
  assert.equal(a.hits, 4);
});
test("shot limits reject simultaneous fire, fail on empty and reject further shots", () => {
  const a = new Arena(
    basic({ shots: 2, barriers: [{ x: 180, y: 300, length: 100, angle: 0 }] }),
  );
  assert.equal(a.fire({ x: 0, y: -1 }), true);
  assert.equal(a.fire({ x: 0, y: -1 }), false);
  a.settle();
  assert.equal(a.status, "ready");
  a.fire({ x: 0, y: -1 });
  a.settle();
  assert.equal(a.status, "failed");
  assert.equal(a.fire({ x: 0, y: -1 }), false);
  assert.equal(a.shots, 2);
  assert.equal(a.misses, 2);
});
test("projectiles terminate at a lifetime or bounce bound", () => {
  const a = new Arena(basic({ targets: [{ x: 100, y: 100 }] }));
  a.fire({ x: 0, y: -1 });
  a.settle();
  assert.equal(a.status, "ready");
  assert.ok(a.projectiles.every((p) => !p.alive));
  assert.ok(a.projectiles[0].age <= LIFETIME + STEP * 2);
  assert.ok(a.projectiles[0].bounces <= MAX_BOUNCES);
  const b = new Arena(
    basic({
      launcher: { x: 180, y: 470 },
      mirrors: [{ x: 180, y: 450, length: 50, angle: 0 }],
      targets: [{ x: 100, y: 100 }],
    }),
  );
  b.fire({ x: 0, y: -1 });
  b.settle();
  assert.equal(b.projectiles[0].bounces, MAX_BOUNCES);
});
test("mirror rotation is 15 degrees, wraps and is locked during flight", () => {
  const a = new Arena(LEVELS[6]);
  const before = a.mirrors[0].angle;
  a.rotateMirror(0);
  near(a.mirrors[0].angle, (before + Math.PI / 12) % Math.PI);
  for (let i = 0; i < 11; i++) a.rotateMirror(0);
  near(a.mirrors[0].angle, before);
  a.fire({ x: 0, y: -1 });
  assert.equal(a.rotateMirror(0), false);
  assert.equal(new Arena(CLASSIC[3]).rotateMirror(0), false);
});
test("splitter produces symmetric branches with bounded inheritance", () => {
  const a = new Arena(CLASSIC[19]);
  a.fire({ x: 0, y: -1 });
  for (let i = 0; i < 90 && a.projectiles.length === 1; i++) a.step();
  const split = a.projectiles.slice(1);
  assert.equal(split.length, 2);
  near(split[0].d.x, -split[1].d.x);
  near(split[0].d.y, split[1].d.y);
  assert.ok(split.every((p) => p.split.has("s0")));
  a.settle();
  assert.equal(a.status, "cleared");
});
test("moving barriers and gates are deterministic", () => {
  const g = { period: 3, open: 1, phase: 0 };
  assert.equal(gateOpen(g, 0.5), true);
  assert.equal(gateOpen(g, 1.5), false);
  assert.deepEqual(
    endpoints(
      {
        ...g,
        x: 100,
        y: 100,
        angle: 0,
        length: 50,
        motion: { axis: "x", range: 30, speed: 2 },
      },
      0.5,
    ),
    endpoints(
      {
        ...g,
        x: 100,
        y: 100,
        angle: 0,
        length: 50,
        motion: { axis: "x", range: 30, speed: 2 },
      },
      0.5,
    ),
  );
  const a = new Arena(CLASSIC[15]);
  a.fire({ x: 0, y: -1 });
  a.settle();
  assert.equal(a.status, "cleared");
  const b = new Arena(CLASSIC[15]);
  b.time = 1.3;
  b.fire({ x: 0, y: -1 });
  b.settle();
  assert.ok(b.events.some((e) => e.type === "absorb"));
});
test("aim preview agrees with first real collision", () => {
  const a = new Arena(CLASSIC[3]),
    path = preview(a, { x: 0, y: -1 });
  a.fire({ x: 0, y: -1 });
  let event;
  for (let i = 0; i < 100; i++) {
    a.step();
    event = a.events.find((e) => e.type === "reflect");
    if (event) break;
  }
  near(path[0][1].x, event.x);
  near(path[0][1].y, event.y);
});
test("recall consumes its shot and handles the failure state", () => {
  const a = new Arena(basic({ shots: 1 }));
  a.fire({ x: 1, y: 0 });
  assert.equal(a.recall(), true);
  assert.equal(a.status, "failed");
  assert.equal(a.shots, 1);
  assert.equal(a.recall(), false);
});
test("save/load roundtrip, best records and challenge progression", () => {
  const storage = {
    value: null,
    setItem(k, v) {
      assert.equal(k, SAVE_KEY);
      this.value = v;
    },
    getItem() {
      return this.value;
    },
  };
  const s = freshSave();
  assert.equal(unlocked(s, 1), true);
  assert.equal(unlocked(s, 2), false);
  for (let id = 1; id <= 30; id++) {
    record(s, id, { shots: 1, stars: 3, score: 1000, perfect: true });
    assert.ok(unlocked(s, Math.min(30, id + 1)));
  }
  record(s, 1, { shots: 3, stars: 1, score: 500, perfect: false });
  assert.equal(s.results[1].shots, 1);
  assert.equal(s.results[1].stars, 3);
  assert.equal(s.results[1].score, 1000);
  assert.equal(s.results[1].perfect, true);
  assert.equal(persist(s, storage), true);
  assert.deepEqual(loadSave(storage), s);
  assert.deepEqual(stats(s), {
    cleared: 30,
    stars: 90,
    score: 30000,
    perfect: 30,
    shots: 30,
  });
  assert.ok([31, 32, 33].every((id) => unlocked(s, id)));
  assert.equal(nextLevel(s), 30);
});
test("corrupt or blocked storage safely recovers", () => {
  assert.deepEqual(
    loadSave({
      getItem() {
        throw Error("blocked");
      },
    }),
    freshSave(),
  );
  assert.deepEqual(
    loadSave({
      getItem() {
        return "{broken";
      },
    }),
    freshSave(),
  );
  assert.equal(
    persist(freshSave(), {
      setItem() {
        throw Error("full");
      },
    }),
    false,
  );
  const s = loadSave({
    getItem: () =>
      JSON.stringify({
        version: 1,
        results: { 1: { shots: -1, score: 100, stars: 3 } },
        settings: { sfx: Infinity },
      }),
  });
  assert.equal(Object.keys(s.results).length, 0);
  assert.equal(s.settings.sfx, 0.65);
});
test("all 30 campaign levels and all 3 challenges have a simulated solution", () => {
  assert.equal(LEVELS.length, 30);
  for (const level of ALL_LEVELS) {
    const result = solve(level);
    assert.ok(result, `No solution for ${level.id}: ${level.name}`);
    assert.ok(result.a.shots <= level.par);
    assert.equal(result.a.status, "cleared");
  }
});

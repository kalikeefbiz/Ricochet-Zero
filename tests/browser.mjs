import assert from "node:assert/strict";
import fs from "node:fs";
import { ALL_LEVELS } from "../dist/js/levels.js";
import { rotate, unit, sub } from "../dist/js/geometry.js";
import { attempt } from "./verify-campaign.mjs";
import { rating } from "../dist/js/engine.js";
const { chromium, webkit } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
).catch(
  () =>
    import("/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs"),
);
const solutions = JSON.parse(fs.readFileSync("artifacts/solutions.json"));
const base = process.env.TEST_URL || "http://localhost:4173/";
const report = {
  engine: process.env.TEST_ENGINE || "chromium",
  checks: [],
  errors: [],
  cleared: [],
  directAttemptsBlocked: [],
  mobileLevels: [],
};
const browser =
  report.engine === "webkit"
    ? await webkit.launch()
    : await chromium.launch({
        executablePath:
          process.env.CHROMIUM_PATH ||
          (fs.existsSync("/usr/bin/chromium")
            ? "/usr/bin/chromium"
            : undefined),
        args: ["--no-sandbox"],
      });
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
const check = (name) => {
  report.checks.push(name);
  console.log("PASS", name);
};
const snapshot = (p) => p.evaluate(() => window.RicochetZero.snapshot());
async function open(p) {
  p.on("pageerror", (e) => report.errors.push(e.message));
  await p.goto(base + "?qa=1");
  await p.clock.install();
  await p.clock.pauseAt(new Date(Date.now() + 100));
  await p.clock.runFor(32);
}
async function click(s, p = page) {
  await p
    .locator(s)
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      if (
        r.top < 0 ||
        r.bottom > innerHeight ||
        r.left < 0 ||
        r.right > innerWidth
      )
        el.scrollIntoView({
          behavior: "instant",
          block: "center",
          inline: "nearest",
        });
    });
  const r = await p.locator(s).first().boundingBox();
  assert.ok(r, `Missing ${s}`);
  await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
}
async function drag(p, l, d, touch = false) {
  const r = await p.locator("#game-canvas").boundingBox();
  const from = {
      x: r.x + (l.launcher.x * r.width) / 360,
      y: r.y + (l.launcher.y * r.height) / 520,
    },
    to = {
      x: from.x + (d.x * 250 * r.width) / 360,
      y: from.y + (d.y * 250 * r.height) / 520,
    };
  if (touch && report.engine === "chromium") {
    const c = await p.context().newCDPSession(p);
    await c.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...from, id: 1 }],
    });
    for (let i = 1; i <= 8; i++)
      await c.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: from.x + ((to.x - from.x) * i) / 8,
            y: from.y + ((to.y - from.y) * i) / 8,
            id: 1,
          },
        ],
      });
    await c.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await c.detach();
  } else {
    await p.mouse.move(from.x, from.y);
    await p.mouse.down();
    await p.mouse.move(to.x, to.y, { steps: 8 });
    await p.mouse.up();
  }
}
async function until(p, fn, max = 10000) {
  for (let i = 0; i < max / 100; i++) {
    if (await fn(await snapshot(p))) return;
    await p.clock.runFor(100);
  }
  assert.fail("Timed out: " + JSON.stringify(await snapshot(p)));
}
async function rotations(p, list = []) {
  for (const r of list)
    for (let i = 0; i < r.taps; i++)
      await click(`[data-mirror="${r.index}"]`, p);
}
async function play(
  p,
  l,
  {
    touch = false,
    offsets = solutions.find((s) => s.id === l.id).offsets,
  } = {},
) {
  await rotations(p, l.solution.rotations);
  const plan = l.solution.steps || Array.from({ length: l.par }, () => ({}));
  for (let i = 0; i < plan.length; i++) {
    if ((await snapshot(p)).status === "cleared") break;
    await rotations(p, plan[i].rotations);
    if (i && l.solution.alignPeriod) {
      const t = (await snapshot(p)).time,
        period = l.solution.alignPeriod;
      await p.clock.runFor(Math.ceil((period - (t % period) + 0.012) * 1000));
    }
    await drag(
      p,
      l,
      rotate(plan[i].direction || l.solution.direction, offsets[i]),
      touch,
    );
    await until(p, (s) => s.status !== "firing");
  }
  await until(p, (s) => s.modal === "clear");
  const state = await snapshot(p);
  assert.equal(state.status, "cleared");
  assert.ok(
    state.mirrorBounces >= l.requiredMirrors * l.par,
    `Mirrors ${l.id}`,
  );
  return state;
}
try {
  await open(page);
  assert.ok(await page.locator("h1").isVisible());
  await click("#start-button");
  await page.clock.runFor(32);
  assert.equal((await snapshot(page)).level, 1);
  check("Title, start and preserved interface");
  // A direct target drag is an understandable failure in each opening arena.
  await drag(
    page,
    ALL_LEVELS[0],
    unit(sub(ALL_LEVELS[0].targets[0], ALL_LEVELS[0].launcher)),
  );
  await until(page, (s) => s.status !== "firing");
  assert.ok((await snapshot(page)).targets.every((t) => t.hp > 0));
  report.directAttemptsBlocked.push(1);
  await click("#restart-button");
  await page.clock.runFor(32);
  await play(page, ALL_LEVELS[0]);
  assert.ok(
    await page
      .getByText("MIRROR ROUTE CONFIRMED", { exact: false })
      .isVisible(),
  );
  report.cleared.push(1);
  check(
    "Arena 01 teaches reflection through a real blocked direct shot and successful bank",
  );
  await click('[data-modal="levels"]');
  assert.equal(await page.locator('[data-level="2"]').isDisabled(), false);
  assert.equal(await page.locator('[data-level="3"]').isDisabled(), true);
  await page.reload();
  await page.clock.runFor(32);
  assert.ok((await snapshot(page)).progress[1]);
  await click("#start-button");
  await page.clock.runFor(32);
  assert.equal((await snapshot(page)).level, 2);
  check("Unlocks and save restoration");
  const l2 = ALL_LEVELS[1];
  for (let i = 0; i < l2.shots; i++) {
    await drag(page, l2, { x: 1, y: 0 });
    await click("#recall-button");
    await page.clock.runFor(32);
  }
  await until(page, (s) => s.modal === "fail");
  assert.ok(
    await page
      .getByRole("heading", { name: "Recalculate. Then ricochet." })
      .isVisible(),
  );
  await click('[data-modal="restart"]');
  await page.clock.runFor(32);
  assert.equal((await snapshot(page)).shots, 0);
  await page.keyboard.press("Escape");
  const pausedTime = (await snapshot(page)).time;
  await page.clock.runFor(1000);
  assert.equal((await snapshot(page)).time, pausedTime);
  await click('[data-modal="settings"]');
  await page.locator("#sfx-volume").fill("30");
  await page.locator("#motion-toggle").check();
  await click('[data-modal="close"]');
  await click('[data-modal="resume"]');
  await page.keyboard.press("r");
  await page.clock.runFor(32);
  check(
    "Shot limits, recall, understandable failure, quick retry, pause, settings and keyboard restart",
  );
  for (let id = 2; id <= 30; id++) {
    const l = ALL_LEVELS.find((x) => x.id === id);
    assert.equal((await snapshot(page)).level, id);
    if (id <= 10) {
      await drag(page, l, unit(sub(l.targets.at(-1), l.launcher)));
      await until(page, (s) => s.status !== "firing");
      assert.ok(
        (await snapshot(page)).targets.every(
          (t, i) => t.hp === (l.targets[i].hp || 1),
        ),
        `Direct shortcut ${id}`,
      );
      report.directAttemptsBlocked.push(id);
      await click("#restart-button");
      await page.clock.runFor(32);
    }
    const state = await play(page, l);
    assert.ok(state.progress[id].shots <= l.par);
    report.cleared.push(id);
    if ([5, 10, 16, 23, 30].includes(id)) {
      await page.clock.runFor(300);
      await page.screenshot({
        path: `artifacts/overhaul/result-${id}-${report.engine}.png`,
      });
    }
    console.log("CLEARED", id, l.name);
    if (id < 30) {
      await click('[data-modal="next"]');
      await page.clock.runFor(32);
    }
  }
  check(
    "First 10 reject direct shortcuts; actual mouse play clears all 30 with required mirrors",
  );
  await click('[data-modal="complete"]');
  await page.clock.runFor(300);
  assert.equal((await snapshot(page)).modal, "complete");
  assert.ok(
    await page
      .getByRole("heading", { name: "Every angle. Every arena. Yours." })
      .isVisible(),
  );
  await page.screenshot({
    path: `artifacts/overhaul/completion-${report.engine}.png`,
  });
  await click('[data-modal="levels"]');
  check("Full campaign completion and statistics");
  for (let id = 31; id <= 33; id++) {
    assert.equal(
      await page.locator(`[data-level="${id}"]`).isDisabled(),
      false,
    );
    await click(`[data-level="${id}"]`);
    await page.clock.runFor(32);
    await play(
      page,
      ALL_LEVELS.find((l) => l.id === id),
    );
    await click('[data-modal="levels"]');
  }
  check("Optional challenges remain unlocked and playable");
  await click('[data-level="1"]');
  await page.clock.runFor(32);
  const before = (await snapshot(page)).aim;
  await page.keyboard.press("ArrowLeft");
  assert.notEqual((await snapshot(page)).aim.x, before.x);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await until(page, (s) => s.modal === "clear");
  check("Arrow aiming and Space firing preserve keyboard play");
  await click('[data-modal="restart"]');
  await page.clock.runFor(32);
  const l1 = ALL_LEVELS[0];
  let edgeOffset;
  for (let off = -0.09; off < 0.09; off += 0.001) {
    const a = attempt(l1, [off]);
    if (
      a.status === "cleared" &&
      rating(a).stars === 2 &&
      rating(a).accuracy > 0.35 &&
      rating(a).accuracy < 0.6
    ) {
      edgeOffset = off;
      break;
    }
  }
  assert.notEqual(edgeOffset, undefined);
  await play(page, l1, { offsets: [edgeOffset] });
  assert.ok(await page.getByLabel("2 stars", { exact: true }).isVisible());
  check("A successful efficient edge hit earns two stars, not automatic three");
  await click('[data-modal="levels"]');
  await click('[data-level="5"]');
  await page.clock.runFor(32);
  const calibration = ALL_LEVELS[4];
  await drag(page, calibration, calibration.solution.direction);
  await until(page, (s) => s.status !== "firing");
  assert.ok((await snapshot(page)).targets.every((t) => t.hp > 0));
  await play(page, calibration);
  assert.equal((await snapshot(page)).shots, 2);
  await click('[data-modal="levels"]');
  await click('[data-level="16"]');
  await page.clock.runFor(32);
  const hub = ALL_LEVELS[15],
    hubSolution = solutions.find((s) => s.id === 16);
  await rotations(page, hub.solution.rotations);
  await drag(page, hub, rotate(hub.solution.direction, hubSolution.offsets[0]));
  await until(page, (s) => s.status !== "firing");
  const remaining = (await snapshot(page)).targets.map((t) => t.hp);
  await drag(page, hub, rotate(hub.solution.direction, hubSolution.offsets[0]));
  await until(page, (s) => s.status !== "firing");
  assert.deepEqual(
    (await snapshot(page)).targets.map((t) => t.hp),
    remaining,
  );
  await rotations(page, hub.solution.steps[1].rotations);
  await drag(page, hub, rotate(hub.solution.direction, hubSolution.offsets[1]));
  await until(page, (s) => s.modal === "clear");
  assert.equal((await snapshot(page)).shots, 3);
  check(
    "Exploratory failures confirm mirror calibration and between-shot hub sequencing are necessary",
  );
  const earned = await page.evaluate(() =>
    localStorage.getItem("blackhouse.ricochet-zero.v1"),
  );
  await page.reload();
  await page.clock.runFor(32);
  assert.equal(Object.keys((await snapshot(page)).progress).length, 33);
  const settings = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("blackhouse.ricochet-zero.v1")).settings,
  );
  assert.equal(settings.sfx, 0.3);
  assert.equal(settings.reducedMotion, true);
  check("New progression, personal records and settings persist");
  // Compatibility fixture uses records earned in the real run, converted to the
  // previous on-disk schema. This context is solely a migration check.
  const legacy = JSON.parse(earned);
  delete legacy.campaignRevision;
  delete legacy.legacyResults;
  Object.values(legacy.results).forEach((r) => delete r.revision);
  legacy.results[16].shots = 1;
  const old = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    lp = await old.newPage();
  await lp.addInitScript((value) => {
    if (!localStorage.getItem("blackhouse.ricochet-zero.v1"))
      localStorage.setItem(
        "blackhouse.ricochet-zero.v1",
        JSON.stringify(value),
      );
  }, legacy);
  await open(lp);
  await click("#select-button", lp);
  assert.equal(await lp.locator('[data-level="30"]').isDisabled(), false);
  await click('[data-level="16"]', lp);
  await lp.clock.runFor(32);
  assert.ok((await lp.locator("#level-best").textContent()).includes("LEGACY"));
  await play(lp, ALL_LEVELS[15]);
  const migrated = await lp.evaluate(() =>
    JSON.parse(localStorage.getItem("blackhouse.ricochet-zero.v1")),
  );
  assert.equal(migrated.legacyResults[16].shots, 1);
  assert.equal(migrated.results[16].shots, 2);
  assert.equal(migrated.results[16].revision, 2);
  assert.equal(migrated.results[30].score, legacy.results[30].score);
  await old.close();
  check(
    "Legacy saves retain unlocks, settings and records; replay archives the old benchmark",
  );
  const mc = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    }),
    mp = await mc.newPage();
  await open(mp);
  await mp.evaluate(
    (value) => localStorage.setItem("blackhouse.ricochet-zero.v1", value),
    earned,
  );
  await mp.reload();
  await mp.clock.runFor(32);
  await click("#select-button", mp);
  for (const id of [3, 17, 30]) {
    await click(`[data-level="${id}"]`, mp);
    await mp.clock.runFor(32);
    const l = ALL_LEVELS[id - 1];
    await mp.screenshot({
      path: `artifacts/overhaul/mobile-arena-${id}-${report.engine}.png`,
    });
    const scroll = await mp.evaluate(() => scrollY);
    await play(mp, l, { touch: true });
    assert.equal(await mp.evaluate(() => scrollY), scroll);
    report.mobileLevels.push(id);
    await mp.clock.runFor(300);
    await mp.screenshot({
      path: `artifacts/overhaul/mobile-result-${id}-${report.engine}.png`,
    });
    if (id === 30) {
      await click('[data-modal="complete"]', mp);
      await mp.clock.runFor(300);
    }
    await click('[data-modal="levels"]', mp);
  }
  check(
    report.engine === "chromium"
      ? "Native touch drag clears early 03, sequencing 17 and mastery 30 without scrolling"
      : "WebKit mobile layout and mouse drag clear early 03, middle 17 and late 30",
  );
  await click('[data-level="5"]', mp);
  await mp.clock.runFor(32);
  let s = await snapshot(mp);
  const r = await mp.locator("#game-canvas").boundingBox(),
    m = s.mirrors[0];
  await mp.touchscreen.tap(
    r.x + (m.x * r.width) / 360,
    r.y + (m.y * r.height) / 520,
  );
  assert.notEqual((await snapshot(mp)).mirrors[0].angle, m.angle);
  assert.equal((await snapshot(mp)).shots, 0);
  check("Native mirror taps rotate without firing");
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 320, height: 568 },
    { width: 430, height: 932 },
  ]) {
    await mp.setViewportSize(viewport);
    await mp.clock.runFor(64);
    const bounds = await mp.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      restart: document
        .querySelector("#restart-button")
        .getBoundingClientRect()
        .toJSON(),
    }));
    assert.ok(bounds.scroll <= viewport.width);
    assert.ok(bounds.restart.bottom <= viewport.height);
    assert.ok(bounds.restart.height >= 44);
  }
  check(
    "Four mobile sizes retain visible 44px retry controls and no horizontal overflow",
  );
  await mc.close();
  assert.deepEqual(report.errors, []);
  check("No browser JavaScript errors");
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.failure = e.message;
  throw e;
} finally {
  fs.mkdirSync("artifacts/overhaul", { recursive: true });
  fs.writeFileSync(
    `artifacts/overhaul/browser-${report.engine}.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}

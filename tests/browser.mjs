import assert from "node:assert/strict";
import fs from "node:fs";
import { ALL_LEVELS } from "../dist/js/levels.js";
import { rotate } from "../dist/js/geometry.js";
const { chromium, webkit } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
).catch(
  () =>
    import("/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs"),
);
const solutions = JSON.parse(
  fs.readFileSync("artifacts/solutions.json", "utf8"),
);
const base = process.env.TEST_URL || "http://localhost:4173/";
const report = {
  checks: [],
  errors: [],
  engine: process.env.TEST_ENGINE || "chromium",
};
const browser =
  process.env.TEST_ENGINE === "webkit"
    ? await webkit.launch({ headless: true })
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
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.on("pageerror", (e) => report.errors.push(e.message));
const check = (name) => {
  report.checks.push(name);
  console.log("PASS", name);
};
const snapshot = () => page.evaluate(() => window.RicochetZero.snapshot());
async function click(selector, p = page) {
  await p.locator(selector).first().scrollIntoViewIfNeeded();
  const box = await p.locator(selector).first().boundingBox();
  assert.ok(box, `Missing ${selector}`);
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
async function drag(p, l, d, touch = false) {
  const r = await p.locator("#game-canvas").boundingBox();
  const from = {
    x: r.x + (l.launcher.x * r.width) / 360,
    y: r.y + (l.launcher.y * r.height) / 520,
  };
  const to = {
    x: from.x + (d.x * 250 * r.width) / 360,
    y: from.y + (d.y * 250 * r.height) / 520,
  };
  if (touch) {
    if (report.engine === "chromium") {
      const client = await p.context().newCDPSession(p);
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...from, id: 1 }],
      });
      for (let i = 1; i <= 6; i++)
        await client.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: from.x + ((to.x - from.x) * i) / 6,
              y: from.y + ((to.y - from.y) * i) / 6,
              id: 1,
            },
          ],
        });
      await client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await client.detach();
    } else {
      await p.mouse.move(from.x, from.y);
      await p.mouse.down();
      await p.mouse.move(to.x, to.y, { steps: 6 });
      await p.mouse.up();
    }
  } else {
    await p.mouse.move(from.x, from.y);
    await p.mouse.down();
    await p.mouse.move(to.x, to.y, { steps: 6 });
    await p.mouse.up();
  }
}
async function runUntil(p, predicate, max = 10000) {
  for (let i = 0; i < max / 100; i++) {
    if (await predicate()) return;
    await p.clock.runFor(100);
  }
  assert.fail(
    "Timed out: " +
      JSON.stringify(await p.evaluate(() => window.RicochetZero.snapshot())),
  );
}
try {
  await page.goto(base + "?qa=1");
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await page.clock.runFor(32);
  assert.ok(await page.locator("h1").isVisible());
  assert.ok(await page.locator("#start-button").isVisible());
  await page.screenshot({ path: "artifacts/e2e-title.png" });
  check("Title and starting gameplay");
  await click("#start-button");
  await page.clock.runFor(32);
  assert.equal((await snapshot()).level, 1);
  // Aim without firing, cancel, then exercise the real success path.
  const r = await page.locator("#game-canvas").boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height * 0.896);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height * 0.5);
  assert.equal(
    await page.locator("#action-status").textContent(),
    "RELEASE TO FIRE",
  );
  await page.mouse.up();
  await runUntil(page, async () => (await snapshot()).modal === "clear");
  assert.equal((await snapshot()).progress["1"].stars, 3);
  check("Drag aiming, live firing, targets, three-star result and unlocking");
  await click('[data-modal="levels"]');
  assert.equal(await page.locator('[data-level="2"]').isDisabled(), false);
  assert.equal(await page.locator('[data-level="3"]').isDisabled(), true);
  check("Level-select lock state");
  await page.reload();
  await page.clock.runFor(64);
  assert.ok((await snapshot()).progress["1"]);
  await click("#start-button");
  await page.clock.runFor(32);
  assert.equal((await snapshot()).level, 2);
  check("Progress saved and restored after reload");
  // Force a legitimate miss with a horizontal shot, then recall each pulse.
  for (let i = 0; i < 3; i++) {
    await drag(page, ALL_LEVELS[1], { x: -1, y: 0 });
    assert.equal((await snapshot()).status, "firing");
    await click("#recall-button");
    await page.clock.runFor(32);
  }
  await runUntil(page, async () => (await snapshot()).modal === "fail");
  assert.ok(
    await page
      .getByRole("heading", { name: "Recalculate. Then ricochet." })
      .isVisible(),
  );
  check("Misses, exhausted shot budget, and failure screen");
  await click('[data-modal="restart"]');
  await page.clock.runFor(32);
  assert.equal((await snapshot()).shots, 0);
  await page.keyboard.press("r");
  await page.clock.runFor(32);
  assert.equal((await snapshot()).shots, 0);
  check("Retry, restart button and R keyboard shortcut");
  await page.keyboard.press("Escape");
  const time = (await snapshot()).time;
  await page.clock.runFor(1000);
  assert.equal((await snapshot()).time, time);
  await click('[data-modal="settings"]');
  await page.locator("#sfx-volume").fill("30");
  await page.locator("#motion-toggle").check();
  await click('[data-modal="close"]');
  assert.equal((await snapshot()).modal, "pause");
  await click('[data-modal="resume"]');
  check("Pause freezes simulation; settings persist and resume works");
  await click("#restart-button");
  await page.clock.runFor(32);
  // Play every remaining campaign arena via mouse input using simulated solution angles.
  for (let id = 2; id <= 30; id++) {
    const l = ALL_LEVELS.find((x) => x.id === id),
      sol = solutions.find((x) => x.id === id);
    assert.ok(sol.solved);
    assert.equal((await snapshot()).level, id);
    for (const rot of l.solution.rotations || [])
      for (let i = 0; i < rot.taps; i++)
        await click(`[data-mirror="${rot.index}"]`);
    if ([7, 18, 24, 30].includes(id))
      await page.screenshot({ path: `artifacts/arena-${id}.png` });
    if (id === 7) {
      const m = (await snapshot()).mirrors[0];
      assert.ok(m.rotatable);
      check("Player-rotatable mirrors through accessible controls");
    }
    for (let shot = 0; shot < l.par; shot++) {
      let snap = await snapshot();
      if (snap.status === "cleared") break;
      if (shot && l.solution.alignPeriod) {
        const period = l.solution.alignPeriod,
          wait = period - (snap.time % period);
        await page.clock.runFor(Math.ceil(wait * 1000));
      }
      await drag(page, l, rotate(l.solution.direction, sol.offset));
      await runUntil(
        page,
        async () => !["firing"].includes((await snapshot()).status),
      );
    }
    await runUntil(page, async () => (await snapshot()).modal === "clear");
    assert.equal(
      (await snapshot()).progress[id].shots <= l.par,
      true,
      `Par ${id}`,
    );
    if ([7, 18, 24, 30].includes(id))
      await page.screenshot({ path: `artifacts/result-${id}.png` });
    console.log("CLEARED", id, l.name);
    if (id < 30) {
      await click('[data-modal="next"]');
      await page.clock.runFor(32);
    }
  }
  check(
    "All 30 arenas completed through real mouse shots and next-level progression",
  );
  await click('[data-modal="complete"]');
  assert.equal((await snapshot()).modal, "complete");
  assert.equal(Object.keys((await snapshot()).progress).length, 30);
  assert.ok(
    await page
      .getByRole("heading", { name: "Every angle. Every arena. Yours." })
      .isVisible(),
  );
  await page.screenshot({ path: "artifacts/campaign-complete.png" });
  check("Final campaign completion and statistics");
  await click('[data-modal="levels"]');
  for (const id of [31, 32, 33])
    assert.equal(
      await page.locator(`[data-level="${id}"]`).isDisabled(),
      false,
    );
  check("All optional challenges unlock");
  for (let id = 31; id <= 33; id++) {
    await click(`[data-level="${id}"]`);
    await page.clock.runFor(32);
    const l = ALL_LEVELS.find((x) => x.id === id),
      sol = solutions.find((x) => x.id === id);
    for (const rot of l.solution.rotations || [])
      for (let i = 0; i < rot.taps; i++)
        await click(`[data-mirror="${rot.index}"]`);
    await drag(page, l, rotate(l.solution.direction, sol.offset));
    await runUntil(page, async () => (await snapshot()).modal === "clear");
    await click('[data-modal="levels"]');
  }
  check("All three optional challenges cleared through mouse input");
  await page.reload();
  await page.clock.runFor(32);
  assert.equal(Object.keys((await snapshot()).progress).length, 33);
  const settings = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("blackhouse.ricochet-zero.v1")).settings,
  );
  assert.equal(settings.sfx, 0.3);
  assert.equal(settings.reducedMotion, true);
  check("Campaign records and settings survive reload");
  await click("#select-button");
  await click('[data-level="1"]');
  await page.clock.runFor(32);
  const keyboardAim = (await snapshot()).aim;
  await page.keyboard.press("ArrowLeft");
  assert.notEqual((await snapshot()).aim.x, keyboardAim.x);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await runUntil(page, async () => (await snapshot()).modal === "clear");
  check("Arrow-key aiming and Space firing complete a level");
  // A separate clean device exercises actual touch events and responsive layouts.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mp = await mobile.newPage();
  mp.on("pageerror", (e) => report.errors.push(e.message));
  await mp.goto(base + "?qa=1");
  await mp.clock.install();
  await mp.clock.pauseAt(new Date(Date.now() + 100));
  await mp.clock.runFor(32);
  await mp.getByRole("button", { name: "START CAMPAIGN" }).tap();
  await mp.clock.runFor(32);
  await drag(mp, ALL_LEVELS[0], { x: 0, y: -1 }, true);
  await runUntil(
    mp,
    async () =>
      (await mp.evaluate(() => window.RicochetZero.snapshot())).modal ===
      "clear",
  );
  assert.equal(
    (await mp.evaluate(() => window.RicochetZero.snapshot())).progress[1].stars,
    3,
  );
  check(
    report.engine === "chromium"
      ? "Mobile touch drag fires and clears an arena (native CDP touch)"
      : "WebKit mobile viewport aiming and clearing (mouse drag)",
  );
  await click('[data-modal="levels"]', mp);
  await click('[data-level="1"]', mp);
  await mp.clock.runFor(32);
  for (const size of [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 320, height: 568 },
    { width: 430, height: 932 },
  ]) {
    await mp.setViewportSize(size);
    await mp.clock.runFor(64);
    const layout = await mp.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      canvas: document
        .querySelector("#game-canvas")
        .getBoundingClientRect()
        .toJSON(),
      restart: document
        .querySelector("#restart-button")
        .getBoundingClientRect()
        .toJSON(),
    }));
    assert.ok(layout.scroll <= size.width, `overflow at ${size.width}`);
    assert.ok(
      layout.restart.bottom <= size.height,
      `controls below viewport at ${size.width}`,
    );
    assert.ok(layout.canvas.width >= 200);
    assert.ok(layout.restart.height >= 44);
  }
  check(
    "390×844, 375×667, 320×568 and 430×932 mobile layouts and touch target sizes",
  );
  await mp.setViewportSize({ width: 390, height: 844 });
  await mp.clock.runFor(64);
  await mp.screenshot({ path: "artifacts/e2e-mobile.png" });
  // Persisted campaign enables mirror arena on the touch context without mutating gameplay state.
  const completed = await page.evaluate(() =>
    localStorage.getItem("blackhouse.ricochet-zero.v1"),
  );
  await mp.evaluate(
    (value) => localStorage.setItem("blackhouse.ricochet-zero.v1", value),
    completed,
  );
  await mp.reload();
  await mp.clock.runFor(32);
  await click("#select-button", mp);
  await click('[data-level="7"]', mp);
  await mp.clock.runFor(32);
  let before = await mp.evaluate(() => window.RicochetZero.snapshot());
  const cr = await mp.locator("#game-canvas").boundingBox(),
    m = before.mirrors[0];
  await mp.touchscreen.tap(
    cr.x + (m.x * cr.width) / 360,
    cr.y + (m.y * cr.height) / 520,
  );
  const after = await mp.evaluate(() => window.RicochetZero.snapshot());
  assert.ok(Math.abs(before.mirrors[0].angle - after.mirrors[0].angle) > 0.1);
  assert.equal(after.shots, 0);
  check("Direct touch on a mirror rotates it without an accidental shot");
  await mp.screenshot({ path: "artifacts/mirror-mobile.png" });
  assert.deepEqual(report.errors, []);
  check("No browser JavaScript errors");
  await mobile.close();
} finally {
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(
    `artifacts/browser-${report.engine}.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}

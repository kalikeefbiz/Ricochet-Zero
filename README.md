# RICOCHET ZERO

**Every angle matters.** An original mobile precision arcade game developed and published by **BlackHouse Arcade**.

A standalone Canvas game with 30 handcrafted campaign arenas across five sectors, plus three unlockable one-shot challenges. No backend, paid APIs, external artwork, runtime dependencies, or background music.

## Play

```sh
npm run dev
```

Open <http://localhost:4173/>. Serve the `dist/` directory on any static HTTPS host for production. Opening the HTML through `file://` is unsupported because the game uses ES modules.

- **Touch / mouse:** drag from the cyan launcher toward the desired destination, then release to fire. A drag may begin anywhere in the arena except a rotatable mirror.
- **Mirrors:** tap a violet mirror or its lettered control to rotate by 15°. Mirrors lock during flight.
- **Keyboard:** Left / Right aim, Up / Down fine aim, Space fire, M rotate the next adjustable mirror, R restart, Escape pause.
- **Recall:** ends the active pulse and retains its shot cost.
- **Settings:** sound-effect volume, reduced motion, and an extended trajectory guide. Audio activates after a user gesture.

Clear every target before the shot budget runs out. Three stars require par or better; two require par + 1. Perfect clears also require no empty shots and the arena's reflection objective. Scores reward unused shots, target count, reflections, clean shots, and perfect clears. Personal-best scores, minimum shots, stars, perfect clears, settings, and unlocks persist locally on the same browser and origin.

## Campaign

| Sector       | Arenas | Introduced / emphasized                                          |
| ------------ | ------ | ---------------------------------------------------------------- |
| Initiation   | 01–06  | Guided aiming, reflective walls, fixed mirrors, piercing targets |
| Reflection   | 07–12  | Rotatable mirrors, multiple banks, reinforced targets            |
| Interference | 13–18  | Absorbing barriers, moving arms, timed gates                     |
| Cascade      | 19–24  | Splitters, linked chain reactions, branching circuits            |
| Zero Point   | 25–30  | Advanced combinations, reinforced cascades, timing               |

One-shot challenges unlock after arenas 12, 24, and 30. Finishing arena 30 presents campaign statistics and credits. All arenas can be replayed.

## Verification

Node 22 or newer recommended. The core game itself needs no package installation.

```sh
npm test                  # 18 physics / rules / persistence / campaign checks
npm run verify            # solve all 33 arenas; writes artifacts/solutions.json
npm ci                    # test-only Playwright dependency
npx playwright install chromium webkit
npm run dev               # keep this running in another terminal
npm run test:e2e           # complete campaign and challenges through browser input
TEST_ENGINE=webkit node tests/browser.mjs
```

The browser harness uses installed system Chromium when present. Set `CHROMIUM_PATH` to override, `PLAYWRIGHT_MODULE` for an existing Playwright module, or `TEST_URL` for a different local origin. Install browser system dependencies with Playwright's documented setup for your OS.

`QA.md` and `tests/evidence/` record actual release checks. Generated screenshots and detailed run output live in ignored `artifacts/`. The harness exposes **read-only** diagnostics only when the URL contains `?qa=1`; it cannot unlock levels or change engine state. Campaign browser tests use real aim / fire events and mirror controls, not completion cheats. A saved campaign is copied into a second browser context solely to revisit the touch-mirror test after the independent touch firing test.

## Architecture

- `dist/js/geometry.js` — vector math, reflection, swept circle / segment / capsule intersections, deterministic mechanics.
- `dist/js/engine.js` — fixed 120 Hz simulation, projectile bounds, target rules, shared trajectory preview, ratings.
- `dist/js/levels.js` — explicit arena definitions and optical-route authoring helpers; verified solution seeds.
- `dist/js/renderer.js` — procedural Canvas art, trails, sparks, bursts, capped particles and shake.
- `dist/js/audio.js` — original event-driven Web Audio effects; no audio assets.
- `dist/js/save.js` — versioned, validated localStorage records and progression.
- `dist/js/app.js` — screens, touch / mouse / keyboard input, HUD, settings, accessibility, results.

Physics uses continuous collision detection per fixed step. Mirrors are capsules with round endpoints; all surface hits reflect using `v - 2(v·n)n`. Preview and live shots share collision functions. Moving arms and gates depend only on elapsed simulation time and freeze on pause. A prism splits at its center into symmetric ±30° branches. Reinforced targets accept at most one damage per shot. Linked targets propagate once through each destroyed neighbor.

Each projectile has a seven-second lifetime and a sixteen-reflection ceiling. Branches inherit age and hit history, and cannot reuse the same prism. Decorative randomness never affects gameplay. Canvas resolution caps device pixel ratio at 2; particles cap at 150. Essential targets, mirrors, walls, barriers, and beams use no images.

To expand the campaign, add an explicit definition with a unique ID, target positions, shot budget, par, mechanics, and solution seed, then run both the solver and browser harness. The solver searches small angle offsets and verifies clears at the same fixed timestep used in play. Timing-sensitive solution plans can align subsequent shots with a gate's period. Moving barriers in the aiming preview show their **current** positions, not future intercepts.

## Repository and hosting

This checkout is the dedicated `BlackHouse-Ricochet-Zero` Git repository. Its source is synchronized to the dedicated managed Git repository attached to the Ricochet Zero Site; `.openai/hosting.json` stores that separate project identity. No BlackHouse website or other game checkout is used.

The connected GitHub integration denied `createRepository` (`Resource not accessible by integration`), so no GitHub repository was created. The complete named local repository and dedicated managed source remain available, and can be mirrored to GitHub when repository-creation access is granted.

The hosted preview is owner-private under Codex Sites. Public sharing is a separate hosting setting. No change was made to `blackhouse.fun`.

## Known verification limits

Browser automation covers Chromium and Playwright WebKit, including iPhone-sized viewports. Native touch drag was tested through Chromium's touch input protocol; WebKit covers aiming by mouse, mobile layout, and native touch taps on mirrors. Physical iPhone Safari, hardware audio listening, and long-session battery / thermal behavior require device testing. Progress is local to this browser and origin; there is no cloud sync. Clearing browser storage removes it.

© 2026 BlackHouse. Original game, procedural artwork, and synthesized sounds. All rights reserved.

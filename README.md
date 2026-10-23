# RICOCHET ZERO

**Every angle matters.** A mobile precision arcade game developed and published by **BlackHouse Arcade**. Version 1.1 / skill-first campaign revision 2.

30 handcrafted campaign arenas and three one-shot challenges. Standalone Canvas, procedural art, original Web Audio effects, and browser-local saves. No backend, runtime dependencies, external artwork, or music.

## Play

```sh
npm run dev
```

Open <http://localhost:4173/>. Deploy `dist/` to a static HTTPS host. ES modules require HTTP serving; opening `index.html` through `file://` is unsupported.

- Drag from the launcher toward the desired destination; release to fire. A drag can begin anywhere in the arena except an adjustable mirror.
- Tap a violet mirror or its lettered control to rotate 15°. Mirrors lock during flight.
- Left / Right aim; Up / Down fine aim; Space fire; M cycle adjustable mirrors; R retry; Escape pause.
- Recall ends a pulse while retaining its shot cost. Settings provide SFX volume, reduced motion, and an extended aim guide.

## The revised campaign

Mirrors are physically necessary from arena 01 onward. Visible absorbing chamber walls occlude the targets and close the routes around the intended turns. Target damage is **not** conditioned on a hidden mirror-count rule: necessity comes from collision geometry.

| Arenas | Challenge                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------- |
| 01–05  | Actual single-bank execution; diagonal approaches, aligned targets, first calibration                |
| 06–10  | Two- and three-bank planning; connected turns and multiple calibrations                              |
| 11–15  | Constrained optical lanes, reinforced cores, moving arms, broad timed gates                          |
| 16–20  | Between-shot hub retuning, isolated target pockets, repeat pulses, prism and chain feeds             |
| 21–25  | Gate / prism / armor / chain combinations, two-stage splitting, calibrated branch circuits           |
| 26–30  | Required mirror plus wall banks, multiple pocket states, moving mechanisms and advanced combinations |

Challenges unlock after arenas 12, 24, and 30. All three also require mirrors. Arena 30 presents campaign statistics and credits. Every arena has a verified solution; opening stages reject target-directed shortcuts in actual browser input tests.

Three stars require **par or better, no empty shots, at least 72% central accuracy, and the full mirror route on every target hit**. Accuracy measures how centrally a pulse crosses a target, rather than giving chain-propagated damage artificial aim credit. Two stars allow par + 1 or an efficient but less accurate clear. A perfect clear raises central accuracy to 88% and meets the arena's reflection objective. Results display the measured accuracy and requirements. Scores reward unused shots, clean execution, central accuracy, required reflections, and perfect clears.

## Existing saves

The original `blackhouse.ricochet-zero.v1` storage key and version remain supported. Existing unlocks, settings, completion states and records load without resetting progress. Old records are marked **LEGACY BEST / V1** until the corresponding arena is replayed. On replay, the original record is retained in `legacyResults`, and a new revision-2 record establishes the current geometry's benchmark. This avoids comparing a new two-shot puzzle against an old one-shot shortcut. Current-revision personal bests continue to accumulate normally. Progress remains browser/device/origin local.

## Verification

Node 22+ recommended. The game has no runtime dependencies; Playwright is test-only.

```sh
npm test                  # physics, gameplay, grading, legacy save and regression checks
npm run verify            # solvability AND bypass / necessity AND fairness gates
npm ci
npx playwright install chromium webkit
npm run dev               # keep running in another terminal
npm run test:e2e           # real desktop and touch gameplay across the revised campaign
TEST_ENGINE=webkit node tests/browser.mjs
```

`npm run verify` fails if a level is merely solvable but fails its required mirror count, permits a sampled mirror bypass, has a dispensable intended-route mirror, bypasses required rotation, or fails aim / timing tolerance checks. The adversarial pass samples the full 360° circle at 0.25°, alternative mirror configurations, mirror removal, mirror-to-absorber ablations, per-surface ablations, and optimistic combinations of sampled hit patterns to search for cheaper shot plans. Moving obstacles and gates are removed in shortcut searches to conservatively allow favorable timing. This search is broad and deterministic, not a proof over all continuous configurations.

The browser harness plays all campaign levels and challenges through actual inputs. It tries direct target drags in the first ten, verifies understandable failures and quick retries, explores incorrect calibration and repeated wrong-pocket shots, verifies grading, and checks legacy migration. It revisits early 03, middle 17, and late 30 at mobile size with native Chromium touch drags. WebKit covers the campaign, mobile layout and aiming by mouse, plus native mirror taps. Read-only diagnostics exist only with `?qa=1`; they cannot change gameplay or unlock arenas.

Use `CHROMIUM_PATH` to override system Chromium, `PLAYWRIGHT_MODULE` for an installed module, or `TEST_URL` to select a different test origin. Browser dependencies must be installed for the host OS. Detailed evidence and the 30-row report are in [CAMPAIGN_VALIDATION.md](CAMPAIGN_VALIDATION.md) and [QA.md](QA.md).

## Architecture

- `geometry.js`: unchanged reflection and swept circle / segment / capsule calculations.
- `engine.js`: fixed 120 Hz simulation; separate mirror/wall telemetry, target-route history and central-hit grading. Projectile speed, lifetime and bounce limits retain their original values.
- `corridors.js`: authoring helper for visible absorbing boundaries around explicit routes, branch unions, rooms and optical face placement. Mirror placement accounts for the visible surface thickness and projectile radius; collision response itself is unchanged.
- `levels.js`: explicit handcrafted arena paths, target pockets, mechanical components, rotations and multi-shot solution plans.
- `renderer.js`: established procedural neon rendering. Mirror core width matches its physical surface; cyan bank panels are visually distinct from absorbing partitions.
- `audio.js`: original event-driven sound system, unchanged by this overhaul.
- `save.js`: compatible additive revision tracking and legacy-record preservation.
- `app.js`: existing screens, input controls and HUD, with updated grading explanation and legacy record labels.

Projectiles retain a seven-second lifetime, sixteen-reflection ceiling, inherited branch age and bounded splitter reuse. Device pixel ratio caps at 2 and particles at 150. Gameplay randomness is absent. The live pulse and guide share collision queries. Moving mechanisms freeze on pause; the guide shows their current positions.

## Repository and hosting

Dedicated repository: `BlackHouse-Ricochet-Zero`, synchronized to its own managed Git source and private Codex Site. `.openai/hosting.json` retains the existing project identity. No main BlackHouse website or other game repository is used. The connected GitHub integration previously rejected repository creation; the named local and managed repositories remain the delivery source.

The dedicated preview is owner-private. No changes are deployed to `blackhouse.fun`.

## Verification limits

No independent human difficulty study, physical iPhone Safari session, hardware audio listening test, or sustained thermal/battery test has been performed. Difficulty assessment combines geometry review, negative-input exploration, actual browser gameplay, touch checks, visual review, timing sweeps and alternative-route searches; it is not inferred solely from solvability. Subjective tuning still benefits from real player feedback. Browser storage clearing removes local progress.

© 2026 BlackHouse. Original game, procedural visuals and synthesized sounds. All rights reserved.

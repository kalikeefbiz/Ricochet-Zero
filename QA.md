# Ricochet Zero 1.1 — campaign overhaul verification

Performed 2026-10-23. This report replaces the original release's solvability-only campaign assessment. The per-arena counts and bounded shortcut results are in [CAMPAIGN_VALIDATION.md](CAMPAIGN_VALIDATION.md).

## Automated checks

`npm test`: **27 / 27 passed**. Original coverage for reflection, continuous collisions, bounds, hit rules, armor, chains, shot limits, splitters, gates, moving elements, rotation, recall, persistence and progression remains. New checks cover precision-based ratings, wall-versus-mirror mastery, actual blocked target-directed shots in the opening ten, mirror-removed target access, a deliberately reopened shortcut, tracer/fixed-step outcome agreement, closed absorbing shell boundaries, legacy-record migration and optimistic shot-cover analysis.

The campaign solver cleared **all 30 arenas and all three challenges at par with perfect-clear conditions** through the actual 120 Hz engine. Multi-shot plans include deliberate calibration, between-shot hub rotation, different firing angles and gate-cycle alignment.

The adversarial audit passed **30 / 30**. Main sweeps evaluated **357,270 trajectories across 1,014 configurations**, with separate individual reflective-surface ablations. No sampled zero-mirror contact or target access with mirrors removed or changed into absorbers was detected. Every intended reflective surface was necessary in the sampled ablation checks. No sampled route had fewer than its required mirror depth. Incorrect initial rotation states could not cover all targets. Optimistic combinations of sampled hit patterns did not beat the intended shot count in any arena.

Fairness sweeps passed **30 / 30**. Opening clear tolerance is at least ±1.18°; campaign minimum is approximately ±0.62°. Dynamic stages have a sampled contiguous successful start window of at least one second. Aim tolerances are basic-clear tolerances; optional mastery accuracy is stricter. These values describe the selected solution plan and are not universal claims about every possible route or timing choice.

## Browser gameplay

**Chromium and Playwright WebKit 26.0 each passed 16 scenario groups with zero JavaScript errors.** Each played all 30 revised campaign arenas and all three challenges through real aiming/firing inputs and UI mirror controls. No gameplay mutation API or fabricated clears were used for the campaign run.

Verified:

- Title/start, level select, progression locks/unlocks, and restored local progress.
- Target-directed drags fail in every opening arena 01–10; their actual mirror routes then clear.
- Fixed mirrors, calibrated mirrors, multi-bank routes, pocket switching, armor, gates, moving arms, splitting, chains and wall banks in the full campaign.
- Deliberately uncalibrated arena 05 fails; calibration then permits the second shot to clear it.
- Repeating the cleared pocket's aim in arena 16 wastes a pulse; retuning the hub and aiming into the other pocket completes it.
- Efficient edge-hit completion earns two stars rather than automatic three.
- Shot exhaustion, recall, failure messaging, quick retry, keyboard aiming/fire/restart, pause freezing, and settings.
- Final campaign statistics and all optional challenge unlocks.
- Legacy schema import preserves unlocks/settings and other records; replaying the revised arena 16 archives its old one-shot record and establishes a valid new two-shot record.

The legacy compatibility context converts records earned by the actual browser run back into the original schema solely for migration testing. This is separate from the full campaign's input-driven completion.

## Mobile and visual review

Chromium's **native touch start/move/end inputs** completed arena **03**, sequencing arena **17**, and mastery arena **30**, without scrolling the page. WebKit completed the same arenas in a touch-capable mobile viewport using mouse drag. Both engines used native touchscreen taps to rotate a mirror without firing.

Layouts at **390×844, 375×667, 320×568 and 430×932** retain visible retry controls at least 44px high and have no horizontal overflow. Reviewed the revised early, branching and final arenas and mobile results for visual separation of targets, mirrors, bank panels, prisms, machinery and absorbing partitions. The existing title art, typography, HUD structure, menus, controls, effects and audio identity remain.

No independent human difficulty study or physical iPhone Safari session was performed. This assessment combines geometry review, alternate-route search, failed input exploration, complete browser play, native touch checks, visual inspection, timing sweeps and tolerance checks. It is not a claim that solvability alone establishes subjective balance. Real player feedback remains useful for further tuning. Hardware audio listening and sustained thermal/battery behavior were not tested.

## Evidence and delivery boundary

- [Solutions](tests/evidence/solutions.json)
- [Campaign necessity, shortcuts and shot counts](tests/evidence/campaign-audit.json)
- [Fairness sweeps](tests/evidence/fairness.json)
- [Original reachability audit](tests/evidence/baseline-audit.json)
- [Chromium browser run](tests/evidence/browser-chromium.json)
- [WebKit browser run](tests/evidence/browser-webkit.json)

All source remains in the dedicated `BlackHouse-Ricochet-Zero` local/managed Git repository. The existing private Codex Site identity and audience are retained. The original save key and schema version remain supported. No BlackHouse public website or other game repository is modified. The final delivery message records the pushed commit and native preview deployment result.

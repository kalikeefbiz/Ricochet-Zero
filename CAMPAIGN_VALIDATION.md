# Ricochet Zero — skill-first campaign validation

Campaign revision 2 / release 1.1. All 30 campaign arenas passed solvability, intended-mechanic, shortcut and tolerance checks. The 3 bonus challenges also have verified mirror-based solutions.

**Reading the table:** “Min/hit” is the required mirror depth of any damaging pulse, including inherited routes for splitters and chains. “Run mirrors” counts physical mirror contacts across the complete winning run; wall contacts are separate. Shot limits include a retry allowance. “None found” refers to the bounded searches below.

| Arena                | Min/hit | Run mirrors | Wall banks | Solution shots / limit | Shortcuts detected | Clear aim tolerance |
| -------------------- | ------: | ----------: | ---------: | ---------------------: | ------------------ | ------------------: |
| 01 First light       |       1 |           1 |          0 |                  1 / 3 | None found         |              ±1.78° |
| 02 A different angle |       1 |           1 |          0 |                  1 / 2 | None found         |              ±2.04° |
| 03 The turning point |       1 |           1 |          0 |                  1 / 2 | None found         |              ±1.83° |
| 04 Through line      |       1 |           1 |          0 |                  1 / 2 | None found         |              ±1.65° |
| 05 Sidewinder        |       1 |           1 |          0 |                  1 / 2 | None found         |              ±2.34° |
| 06 Double take       |       2 |           2 |          0 |                  1 / 2 | None found         |              ±1.27° |
| 07 Change of mind    |       2 |           2 |          0 |                  1 / 2 | None found         |              ±1.18° |
| 08 Cross current     |       2 |           2 |          0 |                  1 / 2 | None found         |              ±1.40° |
| 09 Switchback        |       3 |           3 |          0 |                  1 / 2 | None found         |              ±1.27° |
| 10 Counterweight     |       3 |           3 |          0 |                  1 / 3 | None found         |              ±1.18° |
| 11 Reinforced        |       2 |           4 |          0 |                  2 / 3 | None found         |              ±1.40° |
| 12 Prism corridor    |       3 |           3 |          0 |                  1 / 3 | None found         |              ±1.18° |
| 13 Dead zone         |       2 |           2 |          0 |                  1 / 3 | None found         |              ±1.27° |
| 14 Open window       |       2 |           2 |          0 |                  1 / 3 | None found         |              ±1.22° |
| 15 Interlock         |       2 |           2 |          0 |                  1 / 3 | None found         |              ±1.31° |
| 16 Switchyard        |       1 |           2 |          0 |                  2 / 3 | None found         |              ±2.17° |
| 17 Twice as bright   |       2 |           6 |          0 |                  3 / 4 | None found         |              ±1.44° |
| 18 Narrow escape     |       2 |           4 |          0 |                  2 / 3 | None found         |              ±1.96° |
| 19 Divide the light  |       2 |           2 |          0 |                  1 / 3 | None found         |              ±1.96° |
| 20 Domino effect     |       2 |           2 |          0 |                  1 / 3 | None found         |              ±1.31° |
| 21 Twin circuit      |       2 |           2 |          0 |                  1 / 3 | None found         |              ±1.96° |
| 22 Resonance         |       2 |           4 |          0 |                  2 / 3 | None found         |              ±1.96° |
| 23 Threefold         |       2 |           4 |          0 |                  2 / 3 | None found         |              ±1.35° |
| 24 Cascade chamber   |       2 |           2 |          0 |                  1 / 3 | None found         |              ±2.38° |
| 25 Fault line        |       3 |           6 |          0 |                  2 / 3 | None found         |              ±1.22° |
| 26 Phase shift       |       2 |           4 |          2 |                  2 / 3 | None found         |              ±1.10° |
| 27 Critical mass     |       3 |           9 |          0 |                  3 / 4 | None found         |              ±1.05° |
| 28 Event horizon     |       2 |           8 |          0 |                  4 / 5 | None found         |              ±0.67° |
| 29 The last angle    |       4 |           8 |          0 |                  2 / 3 | None found         |              ±0.88° |
| 30 Zero point        |       2 |           8 |          4 |                  4 / 5 | None found         |              ±0.62° |

## What was searched

- 357,270 main-sweep trajectories across 1,014 sampled mirror configurations, plus individual mirror-ablation sweeps.
- Full-circle angles every 0.25° for intended states, all mirrors removed, and all mirrors changed into same-thickness absorbers. Configurations are additionally sampled every 0.25° across the launcher aperture.
- Every adjustable mirror's 12 positions in intended neighboring states, coarse joint configurations, and deterministic seeded joint samples. Intended rotations and between-shot switch states are verified by the full fixed-step solver.
- Every intended reflective surface, including the late wall-bank panels, is individually ablated. At least one target becomes unreachable in the sampled neighboring intended states for each such ablation.
- Gate and moving barriers are omitted in bypass searches, allowing favorable timing instead of accidentally hiding an alternative route behind a closed hazard.
- No zero-mirror target contact, mirror-removal target access, absorbing-mirror target access, below-required mirror route, dispensable intended-route mirror, or full initial-state rotation bypass was detected.
- Alternative hit patterns are combined with an optimistic shot-cover search: mirror states may change freely and hit chain cores may detonate immediately even when armored. No sampled combination beats the intended solution shot count in any arena. This is a conservative check within the sampled pattern set, not a continuous global optimum proof.
- The event-driven search shares engine collision queries and target rules. Regression tests compare its target outcomes with actual fixed-step simulation on sampled shots and verify that it detects an intentionally reopened shortcut.

These are sampled searches over continuous geometry and mirror states, not exhaustive mathematical proofs. Exact outcomes are in [campaign-audit.json](tests/evidence/campaign-audit.json) and [solutions.json](tests/evidence/solutions.json).

## Fairness and meaningful execution

The opening ten clear corridors provide at least ±1.18° of sampled aim tolerance around the verified route. The smallest campaign clear tolerance is ±0.62°. Mastery accuracy is intentionally stricter than basic completion. Timed/moving stages were swept across an entire period at intervals of at most 0.1s; each has a contiguous successful start window of at least 1.00s. These measurements describe the selected solution plan and do not replace touch gameplay testing. See [fairness.json](tests/evidence/fairness.json).

Browser tests try target-directed shots in arenas 01–10, then complete their real mirror routes. Additional exploratory runs deliberately use an uncalibrated mirror in 05 and repeat the already-cleared hub direction in 16. Those attempts fail understandably; calibration and retuning then succeed. Efficient edge hits are tested to earn two stars rather than automatic three. Representative mobile tests revisit 03, 17 and 30 through touch input. Full browser outcomes are recorded in QA.md after the runs finish.

## Findings addressed during redesign

The original reachability audit could reach targets without mirror interaction when mirrors were removed and favorable hazard timing was allowed. This was a per-target reachability finding, not a claim that every old arena had a complete ammo-valid direct solution. The revised campaign encloses the actual optical routes with visible absorbing partitions.

A browser trial also exposed a target-directed angle that accidentally matched arena 09's multi-bank route; its final pocket was moved to remove that low-skill coincidence. Late branch feeds were lengthened/widened after tolerance sweeps exposed overly tight touch requirements. Moving arms in the finale were shortened to retain a one-second successful start window while keeping their interference role. Projectile speed and response physics were not changed.

No independent human playtester study or physical iPhone session was performed. This is a geometry, rules, browser-input and visual-review assessment; subjective balance remains open to real player feedback.

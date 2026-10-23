import fs from "node:fs";
import { LEVELS } from "../dist/js/levels.js";
import { attempt } from "./verify-campaign.mjs";
const solutions = JSON.parse(fs.readFileSync("artifacts/solutions.json")),
  results = [];
for (const level of LEVELS) {
  const solution = solutions.find((s) => s.id === level.id);
  const dynamic = level.barriers.filter((b) => b.period || b.motion);
  const period =
    level.solution.alignPeriod ||
    dynamic.find((b) => b.period)?.period ||
    (dynamic[0]?.motion ? (2 * Math.PI) / dynamic[0].motion.speed : 0);
  let widestWindow = null,
    successfulStarts = null,
    totalStarts = 0;
  if (period) {
    const n = Math.ceil(period / 0.1),
      good = [];
    for (let i = 0; i < n; i++) {
      const l = structuredClone(level);
      l.solution.wait = (i * period) / n;
      good.push(attempt(l, solution.offsets).status === "cleared");
    }
    let longest = 0,
      current = 0;
    for (const ok of [...good, ...good]) {
      current = ok ? current + 1 : 0;
      longest = Math.max(longest, current);
    }
    widestWindow = (Math.min(longest, n) * period) / n;
    successfulStarts = good.filter(Boolean).length;
    totalStarts = n;
  }
  const tolerance = (solution.clearMarginRadians * 180) / Math.PI;
  const row = {
    id: level.id,
    clearAimToleranceDegrees: tolerance,
    masteryAimToleranceDegrees: (solution.marginRadians * 180) / Math.PI,
    widestStartWindowSeconds: widestWindow,
    successfulStarts,
    totalStarts,
    passed:
      tolerance >= (level.id <= 10 ? 0.9 : 0.55) &&
      (widestWindow === null || widestWindow >= 1 - 1e-6),
  };
  results.push(row);
  console.log(
    `${row.passed ? "PASS" : "FAIL"} ${String(level.id).padStart(2, "0")} aim ±${tolerance.toFixed(2)}°${period ? ` · widest clear start window ${widestWindow.toFixed(2)}s (${successfulStarts}/${totalStarts} sampled starts)` : ""}`,
  );
}
fs.writeFileSync(
  "artifacts/overhaul/fairness.json",
  JSON.stringify(results, null, 2),
);
if (results.some((r) => !r.passed)) process.exitCode = 1;

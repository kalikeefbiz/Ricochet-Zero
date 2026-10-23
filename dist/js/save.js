export const SAVE_KEY = "blackhouse.ricochet-zero.v1";
export const CAMPAIGN_SAVE_REVISION = 2;
export const freshSave = () => ({
  version: 1,
  campaignRevision: CAMPAIGN_SAVE_REVISION,
  results: {},
  legacyResults: {},
  settings: { sfx: 0.65, reducedMotion: false, guide: "standard" },
  tutorialSeen: false,
});
function readRecords(records, defaultRevision = 1) {
  const clean = {};
  for (const [id, r] of Object.entries(records || {}))
    if (
      +id >= 1 &&
      +id <= 33 &&
      Number.isFinite(r.score) &&
      Number.isInteger(r.shots) &&
      r.shots > 0 &&
      r.stars >= 1 &&
      r.stars <= 3
    )
      clean[id] = {
        score: Math.max(0, r.score),
        shots: r.shots,
        stars: r.stars,
        perfect: !!r.perfect,
        revision: r.revision === 2 ? 2 : defaultRevision,
      };
  return clean;
}
export function loadSave(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage.getItem(SAVE_KEY));
    if (data?.version !== 1) return freshSave();
    const clean = freshSave();
    clean.results = readRecords(data.results);
    clean.legacyResults = readRecords(data.legacyResults);
    clean.settings.sfx = Math.max(
      0,
      Math.min(
        1,
        Number.isFinite(data.settings?.sfx) ? data.settings.sfx : 0.65,
      ),
    );
    clean.settings.reducedMotion = !!data.settings?.reducedMotion;
    clean.settings.guide =
      data.settings?.guide === "extended" ? "extended" : "standard";
    clean.tutorialSeen = !!data.tutorialSeen;
    return clean;
  } catch {
    return freshSave();
  }
}
export function persist(save, storage = globalThis.localStorage) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
export function record(save, id, result) {
  let prev = save.results[id];
  if (prev && (prev.revision || 1) < CAMPAIGN_SAVE_REVISION) {
    (save.legacyResults ??= {})[id] = { ...prev };
    prev = null;
  }
  save.campaignRevision = CAMPAIGN_SAVE_REVISION;
  save.results[id] = {
    shots: Math.min(prev?.shots ?? Infinity, result.shots),
    stars: Math.max(prev?.stars || 0, result.stars),
    score: Math.max(prev?.score || 0, result.score),
    perfect: !!(prev?.perfect || result.perfect),
    revision: CAMPAIGN_SAVE_REVISION,
  };
  return save;
}
export function unlocked(save, id) {
  if (id <= 30) return id === 1 || !!save.results[id - 1];
  return !!save.results[{ 31: 12, 32: 24, 33: 30 }[id]];
}
export function stats(save) {
  const entries = Object.entries(save.results)
    .filter(([id]) => +id <= 30)
    .map(([, r]) => r);
  return {
    cleared: entries.length,
    stars: entries.reduce((s, r) => s + r.stars, 0),
    score: entries.reduce((s, r) => s + r.score, 0),
    perfect: entries.filter((r) => r.perfect).length,
    shots: entries.reduce((s, r) => s + r.shots, 0),
  };
}
export function nextLevel(save) {
  for (let i = 1; i <= 30; i++) if (!save.results[i]) return i;
  return 30;
}

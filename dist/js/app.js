import { Arena, STEP, preview, rating } from "./engine.js";
import { LEVELS, ALL_LEVELS, CHALLENGES, TIERS } from "./levels.js";
import {
  loadSave,
  persist,
  record,
  unlocked,
  stats,
  nextLevel,
} from "./save.js";
import { unit, sub, distance, rotate } from "./geometry.js";
import { Renderer } from "./renderer.js";
import { Sound } from "./audio.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  pad = (n) => String(n).padStart(2, "0"),
  number = (n) => n.toLocaleString("en-US");
let save = loadSave(),
  screen = "title",
  arena = null,
  level = null,
  aim = { x: 0, y: -1 },
  aiming = false,
  pointer = null,
  paused = false,
  modalType = "",
  returnModal = "",
  settled = false,
  resultDelay = 0,
  toastTimer = 0,
  introTimer = 0,
  selectedMirror = 0,
  lastFocus = null,
  previousBest = null;
const sound = new Sound();
sound.volume = save.settings.sfx;
const gameRender = new Renderer($("#game-canvas")),
  heroRender = new Renderer($("#hero-canvas"));
const demo = new Arena({
  id: 0,
  launcher: { x: 105, y: 454 },
  mirrors: [
    { id: "demo0", x: 105, y: 310, angle: -Math.PI / 4, length: 85 },
    { id: "demo1", x: 265, y: 310, angle: -Math.PI / 4, length: 85 },
  ],
  targets: [{ x: 265, y: 117 }],
  shots: 1,
  par: 1,
});
const heroPaths = preview(demo, { x: 0, y: -1 }, 570);
function applySettings() {
  document.body.classList.toggle("reduce-motion", save.settings.reducedMotion);
  gameRender.reduced = heroRender.reduced =
    save.settings.reducedMotion ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  sound.volume = save.settings.sfx;
  $("#sound-button").classList.toggle("muted", sound.volume === 0);
  $("#sound-button").setAttribute(
    "aria-label",
    sound.volume === 0 ? "Unmute sound" : "Mute sound",
  );
}
function storeSave() {
  if (!persist(save))
    toast("Local storage is unavailable. Progress will last for this session.");
}
function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
function changeScreen(name) {
  closeModal(false);
  screen = name;
  for (const s of ["title", "levels", "game"])
    $("#" + s + "-screen").classList.toggle("hidden", s !== name);
  document.body.classList.toggle("game-screen-active", name === "game");
  window.scrollTo(0, 0);
  aiming = false;
  pointer = null;
  if (name === "title") {
    const s = stats(save);
    $("#start-label").textContent = s.cleared
      ? "CONTINUE CAMPAIGN"
      : "START CAMPAIGN";
    $("#hero-progress").textContent = s.cleared
      ? `${pad(s.cleared)} / 30 CLEARED     ·     ${s.stars} / 90 STARS`
      : "";
    requestAnimationFrame(() => heroRender.resize());
  }
  if (name === "levels") renderLevels();
}
function starText(count) {
  return "★".repeat(count) + "☆".repeat(3 - count);
}
function renderLevels() {
  const s = stats(save);
  $("#campaign-summary").innerHTML =
    `<span><strong>${pad(s.cleared)}</strong> / 30 CLEARED</span><span><strong>${s.stars}</strong> / 90 STARS</span><span><strong>${number(s.score)}</strong> POINTS</span>`;
  $("#tier-list").innerHTML = TIERS.map(
    (t, i) =>
      `<section class="tier-section" style="--tier:${t.color}"><div class="tier-heading"><h3><span>${pad(i + 1)}</span>${t.name}</h3><p>${t.focus}</p></div><div class="level-grid">${LEVELS.slice(
        i * 6,
        i * 6 + 6,
      )
        .map((l) => {
          const r = save.results[l.id],
            open = unlocked(save, l.id);
          return `<button class="level-card ${l.id === nextLevel(save) ? "current" : ""}" data-level="${l.id}" ${open ? "" : "disabled"} aria-label="Level ${l.id}: ${l.name}${r ? `, ${r.stars} stars, best ${r.shots} shots` : open ? ", unlocked" : ", locked"}"><span class="card-number">${pad(l.id)}</span>${!open ? '<i class="lock-symbol" aria-hidden="true"></i>' : r?.perfect ? '<span class="card-perfect" title="Perfect clear">✧</span>' : ""}<span class="card-name">${l.name}</span><span class="card-stars ${r ? "earned" : ""}">${r ? starText(r.stars) : "···"}</span></button>`;
        })
        .join("")}</div></section>`,
  ).join("");
  $("#challenge-list").innerHTML = CHALLENGES.map(
    (l, i) =>
      `<button class="challenge-card" data-level="${l.id}" ${unlocked(save, l.id) ? "" : "disabled"}><small>CHALLENGE ${pad(i + 1)} / ${save.results[l.id] ? starText(save.results[l.id].stars) : "ONE SHOT"}</small><strong>${l.name}</strong><small>${unlocked(save, l.id) ? "ENTER ARENA ↗" : `CLEAR LEVEL ${l.unlock} TO UNLOCK`}</small></button>`,
  ).join("");
  $$("[data-level]").forEach((b) =>
    b.addEventListener("click", () => startLevel(+b.dataset.level)),
  );
}
function startLevel(id) {
  const next = ALL_LEVELS.find((l) => l.id === id);
  if (!next || !unlocked(save, id)) return;
  level = next;
  previousBest = save.results[id] ? structuredClone(save.results[id]) : null;
  arena = new Arena(level);
  aim = { x: 0, y: -1 };
  aiming = false;
  paused = false;
  settled = false;
  resultDelay = 0;
  selectedMirror = 0;
  gameRender.particles = [];
  gameRender.rings = [];
  changeScreen("game");
  $("#sector-label").textContent =
    `${pad(id)} / ${TIERS[level.tier].name.toUpperCase()}`;
  $("#large-level").innerHTML =
    `${pad(id)}<span>/${id <= 30 ? "30" : "EX"}</span>`;
  $("#side-name").textContent = level.name;
  $("#side-hint").textContent = level.hint;
  $("#perfect-description").textContent =
    `Clear in ${level.par} shot${level.par === 1 ? "" : "s"}, with no empty shots${level.perfectBounces ? ` and at least ${level.perfectBounces} reflection${level.perfectBounces === 1 ? "" : "s"}` : ""}.`;
  const best = save.results[id];
  $("#level-best").innerHTML = best
    ? `PERSONAL BEST<br><b>${best.shots} SHOT${best.shots === 1 ? "" : "S"} · ${starText(best.stars)}</b><br>${number(best.score)} POINTS ${best.perfect ? "· PERFECT ✧" : ""}`
    : "NO RECORD YET<br><b>MAKE YOUR FIRST MARK.</b>";
  $("#mobile-hint").textContent = `${pad(id)} · ${level.name} — ${level.hint}`;
  $("#mirror-controls").innerHTML = arena.mirrors
    .map((m, i) =>
      m.rotatable
        ? `<button class="mirror-control" data-mirror="${i}" aria-label="Rotate mirror ${String.fromCharCode(65 + i)} by 15 degrees" title="Rotate mirror ${String.fromCharCode(65 + i)}">${String.fromCharCode(65 + i)} ↻</button>`
        : "",
    )
    .join("");
  $$("[data-mirror]").forEach(
    (b) => (b.onclick = () => turnMirror(+b.dataset.mirror)),
  );
  $("#intro-tier").textContent =
    `SECTOR ${pad(level.tier + 1)} / ARENA ${pad(id)}`;
  $("#intro-name").textContent = level.name;
  $("#arena-intro").style.animation = "none";
  void $("#arena-intro").offsetWidth;
  $("#arena-intro").style.animation = "";
  clearTimeout(introTimer);
  introTimer = setTimeout(
    () => $("#arena-intro").classList.add("hidden"),
    2000,
  );
  $("#arena-intro").classList.remove("hidden");
  updateHud();
  requestAnimationFrame(() => gameRender.resize());
  sound.play("menu");
  if (id === 1 && !save.tutorialSeen) {
    statusMessage("DRAG FROM THE CYAN LAUNCHER TO AIM", 6000);
  } else if (level.tutorial === "rotate")
    statusMessage("TAP THE VIOLET MIRROR TO ROTATE", 4500);
}
let statusTimer;
function statusMessage(text, duration = 2200) {
  clearTimeout(statusTimer);
  $("#arena-status").textContent = text;
  $("#arena-status").classList.add("show");
  statusTimer = setTimeout(
    () => $("#arena-status").classList.remove("show"),
    duration,
  );
}
function updateHud() {
  if (!arena) return;
  $("#shot-dots").innerHTML = Array.from(
    { length: level.shots },
    (_, i) => `<i class="shot-dot ${i < arena.shots ? "spent" : ""}"></i>`,
  ).join("");
  const left = arena.targets.filter((t) => t.hp > 0).length;
  $("#targets-counter").innerHTML =
    `${pad(left)}<span>/${pad(arena.targets.length)}</span>`;
  $("#action-status").textContent =
    arena.status === "firing"
      ? "PULSE IN FLIGHT"
      : arena.status === "cleared"
        ? "CIRCUIT COMPLETE"
        : arena.status === "failed"
          ? "ENERGY DEPLETED"
          : aiming
            ? "RELEASE TO FIRE"
            : "LAUNCHER READY";
  $("#recall-button").classList.toggle("hidden", arena.status !== "firing");
  $("#mirror-controls").classList.toggle("hidden", arena.status === "firing");
  $$("[data-mirror]").forEach((b) => (b.disabled = arena.status !== "ready"));
}
function turnMirror(index) {
  if (!arena || paused) return;
  if (arena.rotateMirror(index)) {
    sound.play("rotate");
    statusMessage(`MIRROR ${String.fromCharCode(65 + index)} / +15°`, 1100);
  }
}
function fire() {
  if (!arena || paused || modalType) return;
  aiming = false;
  if (arena.fire(aim)) {
    sound.unlock();
    if (level.id === 1 && !save.tutorialSeen) {
      save.tutorialSeen = true;
      storeSave();
    }
    $("#arena-intro").classList.add("hidden");
    updateHud();
  }
}
function restart() {
  if (!level) return;
  sound.play("retry");
  startLevel(level.id);
}
function consumeEvents() {
  for (const e of arena.drain()) {
    if (e.type === "clear" && !settled) {
      record(save, level.id, rating(arena));
      storeSave();
      settled = true;
    }
    gameRender.effect(e);
    sound.play(e.type);
    if (e.type === "ready") {
      statusMessage(
        arena.shotHits
          ? "HIT CONFIRMED. LINE UP THE NEXT PULSE."
          : "NO CONTACT. ADJUST YOUR ANGLE.",
        1800,
      );
    }
    if (e.type === "absorb") statusMessage("ENERGY ABSORBED", 1300);
  }
  updateHud();
}
function modal(html, type, { close = true } = {}) {
  lastFocus = document.activeElement;
  modalType = type;
  paused = true;
  aiming = false;
  pointer = null;
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal">${close ? '<button class="modal-close" data-modal="close" aria-label="Close">×</button>' : ""}${html}</div>`;
  root.classList.remove("hidden");
  root
    .querySelectorAll("[data-modal]")
    .forEach((b) => (b.onclick = () => modalAction(b.dataset.modal)));
  requestAnimationFrame(() =>
    root.querySelector("button,input")?.focus({ preventScroll: true }),
  );
}
function closeModal(resume = true) {
  $("#modal-root").classList.add("hidden");
  $("#modal-root").innerHTML = "";
  modalType = "";
  if (resume) paused = false;
  lastFocus?.focus?.({ preventScroll: true });
}
function pause() {
  if (
    screen !== "game" ||
    !arena ||
    ["cleared", "failed"].includes(arena.status)
  )
    return;
  modal(
    `<div class="eyebrow">CIRCUIT ON HOLD</div><h2 id="modal-title">Take a breath.</h2><p>Arena ${pad(level.id)} · ${level.name}</p><div class="modal-actions"><button class="button primary" data-modal="resume">RESUME <span>↗</span></button><button class="button secondary" data-modal="restart">RESTART ARENA ↻</button><button class="button secondary" data-modal="settings">SETTINGS</button><button class="text-button" data-modal="levels">RETURN TO ARENAS ←</button></div>`,
    "pause",
  );
}
function settings() {
  returnModal =
    modalType === "pause"
      ? "pause"
      : modalType === "clear"
        ? "clear"
        : modalType === "fail"
          ? "fail"
          : "";
  modal(
    `<div class="eyebrow">TUNE YOUR EXPERIENCE</div><h2 id="modal-title">Settings<span class="accent">.</span></h2><div class="settings-row"><label for="sfx-volume">SOUND EFFECTS <span id="volume-value">${Math.round(save.settings.sfx * 100)}%</span></label><input id="sfx-volume" type="range" min="0" max="100" value="${save.settings.sfx * 100}" aria-label="Sound effects volume"></div><div class="settings-row"><label for="motion-toggle">REDUCED MOTION<input id="motion-toggle" type="checkbox" ${save.settings.reducedMotion ? "checked" : ""}></label><p class="settings-note">Reduces particles, screen shake, and interface animation.</p></div><div class="settings-row"><label for="guide-toggle">EXTENDED AIM GUIDE<input id="guide-toggle" type="checkbox" ${save.settings.guide === "extended" ? "checked" : ""}></label><p class="settings-note">A longer trajectory preview for planning complex routes. Moving barriers are previewed at their current position.</p></div><p class="settings-note">Original reactive sound effects. No background music.<br>Progress saves automatically on this device.</p><div class="modal-actions"><button class="button primary" data-modal="close">DONE ✓</button></div>`,
    "settings",
  );
  $("#sfx-volume").oninput = (e) => {
    save.settings.sfx = +e.target.value / 100;
    $("#volume-value").textContent = `${e.target.value}%`;
    applySettings();
    storeSave();
  };
  $("#sfx-volume").onchange = () => {
    sound.unlock();
    sound.play("menu");
  };
  $("#motion-toggle").onchange = (e) => {
    save.settings.reducedMotion = e.target.checked;
    applySettings();
    storeSave();
  };
  $("#guide-toggle").onchange = (e) => {
    save.settings.guide = e.target.checked ? "extended" : "standard";
    storeSave();
  };
}
function howTo() {
  modal(
    `<div class="eyebrow">FIELD MANUAL / 001</div><h2 id="modal-title">Find the perfect line.</h2><div class="help-steps"><div class="help-step"><span>01</span><div><strong>Drag. Aim. Release.</strong><p>Drag from the cyan launcher toward your destination. The dotted line previews your shot. Release to fire.</p></div></div><div class="help-step"><span>02</span><div><strong>Use every angle.</strong><p>Cyan walls and mirrors reflect. Tap violet mirrors to rotate 15°. Striped barriers absorb energy.</p></div></div><div class="help-step"><span>03</span><div><strong>Clear every core.</strong><p>Amber cores are targets. Numbered cores need multiple pulses. Violet linked cores trigger a chain reaction.</p></div></div><div class="help-step"><span>04</span><div><strong>Make it count.</strong><p>Limited shots. Three stars at par, two at par + 1. A perfect clear also meets the reflection objective with no empty shots.</p></div></div></div><p class="settings-note">Desktop: ← / → aim · ↑ / ↓ fine aim · Space fire<br>M rotate next mirror · R restart · Esc pause<br>Recall ends an active pulse and keeps its shot cost.</p><div class="modal-actions"><button class="button primary" data-modal="tutorial">TRY IT IN ARENA 01 ↗</button><button class="button secondary" data-modal="close">GOT IT</button></div>`,
    "how",
  );
}
function hint() {
  modal(
    `<div class="eyebrow">ARENA ${pad(level.id)} / FIELD NOTE</div><h2 id="modal-title">${level.name}</h2><p>${level.hint}</p><div class="rule"></div><p>${$("#perfect-description").textContent}</p><p class="settings-note">Solid cyan edges reflect. Violet mirrors rotate. Dark striped barriers absorb. Open gates appear dashed. The preview shows moving elements at this instant.</p><div class="modal-actions"><button class="button primary" data-modal="resume">BACK TO THE CIRCUIT ↗</button></div>`,
    "hint",
  );
}
function showResult() {
  const r = rating(arena),
    old = previousBest;
  if (!settled) {
    record(save, level.id, r);
    storeSave();
    settled = true;
  }
  const next = level.id < 30 ? level.id + 1 : 0;
  modal(
    `<div class="eyebrow">ARENA ${pad(level.id)} / CIRCUIT COMPLETE</div><h2 id="modal-title">${r.perfect ? "Perfectly executed." : "Angle secured."}</h2><div class="result-stars" aria-label="${r.stars} stars">${"★".repeat(r.stars)}<span class="empty">${"☆".repeat(3 - r.stars)}</span></div><p>${level.name} · ${TIERS[level.tier].name}</p><div class="result-grid"><div><small>SHOTS / PAR ${level.par}</small><strong>${pad(r.shots)}</strong></div><div><small>ARENA SCORE</small><strong>${number(r.score)}</strong></div><div><small>REFLECTIONS</small><strong>${pad(arena.bounces)}</strong></div><div><small>PERSONAL BEST</small><strong>${pad(save.results[level.id].shots)} <span style="font-size:10px">SHOTS</span></strong></div></div>${r.perfect ? '<span class="result-tag">✧ PERFECT CLEAR</span>' : old && r.score > old.score ? '<span class="result-tag">NEW PERSONAL BEST ↗</span>' : ""}${level.id === 12 || level.id === 24 || level.id === 30 ? '<p class="settings-note">A new one-shot challenge is now unlocked.</p>' : ""}<div class="modal-actions">${next ? '<button class="button primary" data-modal="next">NEXT ARENA <span>↗</span></button>' : level.id === 30 ? '<button class="button primary" data-modal="complete">COMPLETE THE CIRCUIT ↗</button>' : '<button class="button primary" data-modal="levels">BACK TO ARENAS ↗</button>'}<button class="button secondary" data-modal="restart">REPLAY ARENA ↻</button>${next ? '<button class="text-button" data-modal="levels">ALL ARENAS ←</button>' : ""}</div>`,
    "clear",
    { close: false },
  );
}
function showFailure() {
  modal(
    `<div class="eyebrow" style="color:var(--amber)">ENERGY DEPLETED / ARENA ${pad(level.id)}</div><h2 id="modal-title">Recalculate.<br>Then ricochet.</h2><p>${arena.targets.filter((t) => t.hp > 0).length} target${arena.targets.filter((t) => t.hp > 0).length === 1 ? "" : "s"} remaining. Every attempt teaches you a new angle.</p><div class="rule"></div><p>${level.hint}</p><div class="modal-actions"><button class="button primary" data-modal="restart">TRY AGAIN ↻</button><button class="button secondary" data-modal="levels">RETURN TO ARENAS ←</button></div>`,
    "fail",
    { close: false },
  );
}
function completion() {
  const s = stats(save);
  modal(
    `<div class="eyebrow">BLACKHOUSE ARCADE / CAMPAIGN COMPLETE</div><div class="completion-zero">ZERØ.</div><h2 id="modal-title">Every angle.<br>Every arena.<br>Yours.</h2><p>Thirty circuits cleared. The next perfect line is still out there.</p><div class="result-grid"><div><small>CAMPAIGN SCORE</small><strong>${number(s.score)}</strong></div><div><small>STARS COLLECTED</small><strong>${s.stars}<span style="font-size:11px"> / 90</span></strong></div><div><small>PERFECT CLEARS</small><strong>${pad(s.perfect)}<span style="font-size:11px"> / 30</span></strong></div><div><small>BEST SHOTS / TOTAL</small><strong>${pad(s.shots)}</strong></div></div><p class="settings-note">Developed & published by BlackHouse.<br>Thanks for playing Ricochet Zero.</p><div class="modal-actions"><button class="button primary" data-modal="levels">CHASE THE PERFECT CAMPAIGN ↗</button><button class="button secondary" data-modal="credits">ROLL CREDITS</button></div>`,
    "complete",
    { close: false },
  );
  sound.play("clear");
}
function credits() {
  modal(
    `<div class="eyebrow">AN INDEPENDENT ARCADE ORIGINAL</div><h2 id="modal-title">RICOCHET ZERO</h2><p>Every angle matters.</p><div class="rule"></div><p>Developed & published by</p><div class="credit-wordmark">BLACKHOUSE</div><p class="settings-note">ARCADE DIVISION</p><p>Original game design, procedural visuals, handcrafted arenas, and synthesized arcade sound.</p><p class="settings-note">Built with HTML5 Canvas, JavaScript, and Web Audio.<br>No third-party artwork or music.<br>Version 1.0 · © 2026 BlackHouse</p><div class="modal-actions"><button class="button primary" data-modal="close">BACK TO THE LIGHT ↗</button></div>`,
    "credits",
  );
}
function modalAction(action) {
  sound.unlock();
  sound.play("menu");
  if (action === "close") {
    const ret = returnModal;
    returnModal = "";
    closeModal();
    if (ret === "pause") pause();
    else if (ret === "clear") showResult();
    else if (ret === "fail") showFailure();
    return;
  }
  if (action === "resume") {
    closeModal();
    return;
  }
  if (action === "restart") {
    closeModal();
    restart();
    return;
  }
  if (action === "levels") {
    paused = false;
    changeScreen("levels");
    return;
  }
  if (action === "next") {
    closeModal();
    startLevel(level.id + 1);
    return;
  }
  if (action === "settings") {
    settings();
    return;
  }
  if (action === "complete") {
    completion();
    return;
  }
  if (action === "credits") {
    credits();
    return;
  }
  if (action === "tutorial") {
    closeModal();
    startLevel(1);
    return;
  }
}
$("#start-button").onclick = () => {
  sound.unlock();
  startLevel(nextLevel(save));
};
$("#select-button").onclick = () => changeScreen("levels");
$("#game-levels").onclick = () => changeScreen("levels");
$("#home-button").onclick = () => changeScreen("title");
$$('[data-action="home"]').forEach(
  (b) => (b.onclick = () => changeScreen("title")),
);
$("#settings-button").onclick = () => {
  sound.unlock();
  if (modalType === "clear" || modalType === "fail") return;
  settings();
};
$("#sound-button").onclick = () => {
  sound.unlock();
  save.settings.sfx = save.settings.sfx === 0 ? 0.65 : 0;
  applySettings();
  storeSave();
  sound.play("menu");
};
$("#how-button").onclick = howTo;
$("#credits-button").onclick = credits;
$("#pause-button").onclick = pause;
$("#restart-button").onclick = restart;
$("#hint-button").onclick = hint;
$("#recall-button").onclick = () => {
  if (arena?.recall()) {
    consumeEvents();
    statusMessage("PULSE RECALLED / SHOT CONSUMED");
  }
};
const canvas = $("#game-canvas");
function point(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * 360) / r.width,
    y: ((e.clientY - r.top) * 520) / r.height,
  };
}
function updateAim(p) {
  if (distance(p, arena.level.launcher) < 12) return;
  aim = unit(sub(p, arena.level.launcher));
  $("#angle-readout").textContent =
    `${(((Math.atan2(aim.y, aim.x) * 180) / Math.PI + 360) % 360).toFixed(1)}°`;
}
canvas.addEventListener("pointerdown", (e) => {
  if (screen !== "game" || paused || arena.status !== "ready" || !e.isPrimary)
    return;
  e.preventDefault();
  sound.unlock();
  const p = point(e);
  const index = arena.mirrors.findIndex(
    (m) => m.rotatable && distance(p, m) < 28,
  );
  if (index >= 0) {
    turnMirror(index);
    return;
  }
  canvas.setPointerCapture(e.pointerId);
  pointer = { id: e.pointerId, start: p, moved: false };
  aiming = true;
  updateAim(p);
  sound.play("charge");
  statusMessage("DRAG TO REFINE / RELEASE TO FIRE", 2000);
  $("#arena-intro").classList.add("hidden");
  updateHud();
});
canvas.addEventListener("pointermove", (e) => {
  if (!pointer || e.pointerId !== pointer.id || paused) return;
  e.preventDefault();
  const p = point(e);
  if (distance(p, pointer.start) > 5) pointer.moved = true;
  updateAim(p);
});
canvas.addEventListener("pointerup", (e) => {
  if (!pointer || e.pointerId !== pointer.id) return;
  e.preventDefault();
  const moved = pointer.moved;
  pointer = null;
  aiming = false;
  if (moved) fire();
  else statusMessage("DRAG TO AIM. RELEASE TO FIRE.");
  updateHud();
});
canvas.addEventListener("pointercancel", () => {
  pointer = null;
  aiming = false;
  updateHud();
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && modalType) {
    const focusables = [
      ...$("#modal-root").querySelectorAll("button,input"),
    ].filter((el) => !el.disabled);
    if (!focusables.length) return;
    const first = focusables[0],
      last = focusables.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
    return;
  }
  if (e.key === "Escape") {
    if (
      modalType === "clear" ||
      modalType === "fail" ||
      modalType === "complete"
    )
      return;
    if (modalType) modalAction("close");
    else pause();
    return;
  }
  if (screen !== "game" || paused || modalType || e.target.tagName === "INPUT")
    return;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key))
    e.preventDefault();
  if (e.key === "r" || e.key === "R") {
    restart();
    return;
  }
  if (e.key === "m" || e.key === "M") {
    const options = arena.mirrors
      .map((m, i) => (m.rotatable ? i : -1))
      .filter((i) => i >= 0);
    if (options.length) {
      turnMirror(options[selectedMirror % options.length]);
      selectedMirror++;
    }
    return;
  }
  if (arena.status !== "ready") return;
  if (e.key === " ") {
    sound.unlock();
    fire();
    return;
  }
  const delta = {
    ArrowLeft: -0.012,
    ArrowRight: 0.012,
    ArrowUp: -0.002,
    ArrowDown: 0.002,
  }[e.key];
  if (delta) {
    aim = rotate(aim, delta);
    aiming = true;
    updateHud();
    $("#angle-readout").textContent =
      `${(((Math.atan2(aim.y, aim.x) * 180) / Math.PI + 360) % 360).toFixed(1)}°`;
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && screen === "game" && !modalType) pause();
});
window.addEventListener("blur", () => {
  if (screen === "game" && !modalType && pointer) {
    pointer = null;
    aiming = false;
    pause();
  }
});
window.addEventListener("resize", () => {
  gameRender.resize();
  heroRender.resize();
});
let last = performance.now(),
  accumulator = 0,
  visualTime = 0;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  visualTime += dt;
  if (screen === "title") {
    heroRender.draw(demo, {
      paths: heroPaths,
      aim: { x: 0, y: -1 },
      demo: true,
      dt,
      time: visualTime,
    });
  } else if (screen === "game" && arena) {
    if (!paused) {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= STEP && steps++ < 8) {
        arena.step();
        accumulator -= STEP;
      }
      if (arena.events.length) consumeEvents();
      if (["cleared", "failed"].includes(arena.status) && !modalType) {
        resultDelay += dt;
        if (resultDelay > 0.55) {
          arena.status === "cleared" ? showResult() : showFailure();
        }
      }
    }
    gameRender.draw(arena, {
      aim,
      paths:
        aiming && arena.status === "ready"
          ? preview(arena, aim, save.settings.guide === "extended" ? 2200 : 850)
          : [],
      aiming: aiming && arena.status === "ready",
      dt: paused ? 0 : dt,
      time: visualTime,
    });
  }
  requestAnimationFrame(loop);
}
// Read-only diagnostics for reproducible browser verification.
if (new URLSearchParams(location.search).has("qa"))
  window.RicochetZero = Object.freeze({
    snapshot: () => ({
      screen,
      modal: modalType,
      paused,
      level: level?.id,
      time: arena?.time,
      status: arena?.status,
      shots: arena?.shots,
      targets: arena?.targets.map((t) => ({ x: t.x, y: t.y, hp: t.hp })),
      mirrors: arena?.mirrors.map((m) => ({
        x: m.x,
        y: m.y,
        angle: m.angle,
        rotatable: m.rotatable,
      })),
      progress: structuredClone(save.results),
      aim: { ...aim },
    }),
  });
applySettings();
changeScreen("title");
requestAnimationFrame(() => {
  heroRender.resize();
  loop(performance.now());
});

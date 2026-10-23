import { RADIUS, MIRROR_HALF } from "./engine.js";
// Authoring geometry: the visible absorbing shell is the exact boundary of a
// union of optical ducts. Nothing is gated by target metadata or hidden rules.
import { add, sub, mul, unit, dot, cross, distance } from "./geometry.js";
const key = (p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
function tube(points, width, startCap = 32, endCap = 25) {
  const p = points.map((x) => ({ ...x }));
  p[0] = sub(p[0], mul(unit(sub(p[1], p[0])), startCap));
  p[p.length - 1] = add(p.at(-1), mul(unit(sub(p.at(-1), p.at(-2))), endCap));
  const normals = p.slice(1).map((v, i) => {
    const d = unit(sub(v, p[i]));
    return { x: -d.y, y: d.x };
  });
  const left = [],
    right = [];
  for (let i = 0; i < p.length; i++) {
    const a = normals[Math.max(0, i - 1)],
      b = normals[Math.min(i, normals.length - 1)];
    const offset = mul(add(a, b), width / (1 + dot(a, b)));
    left.push(add(p[i], offset));
    right.push(sub(p[i], offset));
  }
  return [...left, ...right.reverse()];
}
function onEdge(p, a, b) {
  const d = sub(b, a),
    v = sub(p, a);
  return (
    Math.abs(cross(d, v)) < 1e-5 &&
    dot(v, d) >= -1e-5 &&
    dot(v, d) <= dot(d, d) + 1e-5
  );
}
function inside(p, poly) {
  for (let i = 0; i < poly.length; i++)
    if (onEdge(p, poly[i], poly[(i + 1) % poly.length])) return false;
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      yes = !yes;
  }
  return yes;
}
export function corridorShell(paths, width = 28, rooms = [], endCap = 25) {
  const polys = paths.map((p) => tube(p, width, 32, endCap));
  for (const r of rooms)
    polys.push([
      { x: r.x, y: r.y },
      { x: r.x + r.w, y: r.y },
      { x: r.x + r.w, y: r.y + r.h },
      { x: r.x, y: r.y + r.h },
    ]);
  const edges = polys.flatMap((poly, owner) =>
    poly.map((a, i) => ({ a, b: poly[(i + 1) % poly.length], owner })),
  );
  const kept = new Map();
  for (const e of edges) {
    const v = sub(e.b, e.a),
      vv = dot(v, v);
    const cuts = [0, 1];
    for (const f of edges) {
      if (f.owner === e.owner) continue;
      const w = sub(f.b, f.a),
        q = sub(f.a, e.a),
        den = cross(v, w);
      if (Math.abs(den) > 1e-8) {
        const t = cross(q, w) / den,
          u = cross(q, v) / den;
        if (t > 1e-6 && t < 1 - 1e-6 && u >= -1e-6 && u <= 1 + 1e-6)
          cuts.push(t);
      } else if (Math.abs(cross(q, v)) < 1e-5) {
        for (const end of [f.a, f.b]) {
          const t = dot(sub(end, e.a), v) / vv;
          if (t > 1e-6 && t < 1 - 1e-6) cuts.push(t);
        }
      }
    }
    cuts.sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      if (cuts[i] - cuts[i - 1] < 1e-6) continue;
      const a = add(e.a, mul(v, cuts[i - 1])),
        b = add(e.a, mul(v, cuts[i])),
        mid = mul(add(a, b), 0.5);
      if (polys.some((p, owner) => owner !== e.owner && inside(mid, p)))
        continue;
      const k = [key(a), key(b)].sort().join("|");
      kept.set(k, {
        x: mid.x,
        y: mid.y,
        length: distance(a, b),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        shell: true,
      });
    }
  }
  return [...kept.values()];
}
export function opticalArena({
  paths,
  targets,
  width = 28,
  mirrorLength = 0,
  rot = {},
  walls = [],
  splitters = [],
  rooms = [],
  endCap = 25,
  steps = 1,
  extras = [],
  ...meta
}) {
  const p = paths.map((path) => path.map((v) => ({ x: v[0], y: v[1] })));
  const mirrors = [],
    seen = new Set(),
    prisms = new Set(splitters.map((s) => key(s)));
  for (const path of p)
    for (let i = 1; i < path.length - 1; i++) {
      const pos = path[i],
        k = key(pos);
      if (seen.has(k) || prisms.has(k)) continue;
      seen.add(k);
      const incoming = unit(sub(pos, path[i - 1])),
        out = unit(sub(path[i + 1], pos));
      if (dot(incoming, out) > 0.9999) continue;
      const normal = unit(sub(incoming, out));
      const angle = (Math.atan2(normal.x, -normal.y) + Math.PI) % Math.PI;
      const mapKey = `${pos.x},${pos.y}`,
        taps = rot[mapKey] || 0;
      mirrors.push({
        id: "m" + mirrors.length,
        ...add(pos, mul(normal, RADIUS + MIRROR_HALF)),
        anchor: pos,
        length: mirrorLength || Math.min(74, width * 2.25),
        angle: (angle - (taps * Math.PI) / 12 + Math.PI) % Math.PI,
        rotatable: !!taps,
        kind: walls.includes(mapKey) ? "wall" : "mirror",
        solutionAngle: angle,
      });
    }
  const rotations = mirrors.flatMap((m, index) => {
    const taps = rot[`${m.anchor.x},${m.anchor.y}`];
    return taps ? [{ index, taps }] : [];
  });
  const solution = {
    direction: unit(sub(p[0][1], p[0][0])),
    rotations,
    steps:
      typeof steps === "number"
        ? Array.from({ length: steps }, () => ({}))
        : steps,
  };
  return {
    launcher: p[0][0],
    mirrors,
    targets: targets.map((t) => ({ r: 11, ...t })),
    barriers: [...corridorShell(p, width, rooms, endCap), ...extras],
    splitters: splitters.map((s, i) => ({ id: "s" + i, ...s })),
    solution,
    shots: 2,
    par: 1,
    starPrecision: 0.72,
    masteryPrecision: 0.88,
    ...meta,
  };
}

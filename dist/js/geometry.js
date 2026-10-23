export const EPS = 1e-6;
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a, s) => ({ x: a.x * s, y: a.y * s });
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const length = (a) => Math.hypot(a.x, a.y);
export const unit = (a) => {
  const l = length(a);
  return l > EPS ? mul(a, 1 / l) : { x: 0, y: -1 };
};
export const distance = (a, b) => length(sub(a, b));
export const rotate = (v, a) => ({
  x: v.x * Math.cos(a) - v.y * Math.sin(a),
  y: v.x * Math.sin(a) + v.y * Math.cos(a),
});
export const reflect = (v, n) => sub(v, mul(n, 2 * dot(v, n)));
export const cross = (a, b) => a.x * b.y - a.y * b.x;
export function rayCircle(p, d, c, r, max = Infinity) {
  const m = sub(p, c),
    b = dot(m, d),
    q = dot(m, m) - r * r,
    disc = b * b - q;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < EPS || t > max) return null;
  return { t, normal: unit(sub(add(p, mul(d, t)), c)) };
}
export function raySegment(p, d, a, b, max = Infinity) {
  const s = sub(b, a),
    den = cross(d, s);
  if (Math.abs(den) < EPS) return null;
  const ap = sub(a, p),
    t = cross(ap, s) / den,
    u = cross(ap, d) / den;
  if (t < EPS || t > max || u < 0 || u > 1) return null;
  let normal = unit({ x: -s.y, y: s.x });
  if (dot(d, normal) > 0) normal = mul(normal, -1);
  return { t, normal };
}
export function rayCapsule(p, d, a, b, r, max = Infinity) {
  if (r === 0) return raySegment(p, d, a, b, max);
  const v = unit(sub(b, a)),
    n = { x: -v.y, y: v.x };
  let best = null;
  for (const sign of [-1, 1]) {
    const hit = raySegment(
      p,
      d,
      add(a, mul(n, r * sign)),
      add(b, mul(n, r * sign)),
      max,
    );
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  for (const c of [a, b]) {
    const hit = rayCircle(p, d, c, r, max);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  return best;
}
export function endpoints(m, time = 0) {
  const offset = m.motion
    ? Math.sin(time * m.motion.speed + (m.motion.phase || 0)) * m.motion.range
    : 0;
  const x = m.x + (m.motion?.axis === "x" ? offset : 0),
    y = m.y + (m.motion?.axis === "y" ? offset : 0);
  const dx = (Math.cos(m.angle) * m.length) / 2,
    dy = (Math.sin(m.angle) * m.length) / 2;
  return [
    { x: x - dx, y: y - dy },
    { x: x + dx, y: y + dy },
  ];
}
export const gateOpen = (g, time) =>
  (time + (g.phase || 0)) % g.period < g.open;

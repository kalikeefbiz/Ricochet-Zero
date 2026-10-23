import { unit, sub, rotate, add, mul } from "./geometry.js";
export const TIERS = [
  {
    name: "Initiation",
    focus: "Learn the language of light",
    color: "#67ebdf",
  },
  { name: "Reflection", focus: "Find another way through", color: "#8fa1ff" },
  {
    name: "Interference",
    focus: "Read the arena. Choose your moment.",
    color: "#ffc46d",
  },
  {
    name: "Cascade",
    focus: "One pulse. A chain of possibilities.",
    color: "#cb9aff",
  },
  { name: "Zero Point", focus: "Make every angle count", color: "#ff8f9f" },
];
const P = (x, y) => ({ x, y });
const T = (x, y, extra = {}) => ({ x, y, ...extra });
const B = (x, y, length, angle = 0, extra = {}) => ({
  x,
  y,
  length,
  angle,
  ...extra,
});
function optical(points, { rot = [], ...extra } = {}) {
  const mirrors = [];
  for (let i = 1; i < points.length - 1; i++) {
    if (points[i].wall) continue;
    const incoming = unit(sub(points[i], points[i - 1])),
      out = unit(sub(points[i + 1], points[i]));
    const normal = unit(sub(incoming, out));
    let angle = Math.atan2(normal.x, -normal.y);
    angle = (angle + Math.PI) % Math.PI;
    const index = mirrors.length,
      rotatable = rot.includes(index);
    mirrors.push({
      id: "m" + index,
      ...points[i],
      angle: rotatable ? (angle - Math.PI / 4 + Math.PI) % Math.PI : angle,
      length: 70,
      rotatable,
    });
  }
  return {
    launcher: points[0],
    mirrors,
    solution: {
      direction: unit(sub(points[1], points[0])),
      rotations: rot.map((index) => ({ index, taps: 3 })),
    },
    ...extra,
  };
}
const L = P(180, 466);
const specs = [
  [
    "First light",
    "Drag from the launcher toward the target. Release to fire.",
    {
      launcher: L,
      targets: [T(180, 130)],
      solution: { direction: P(0, -1) },
      shots: 3,
      par: 1,
      tutorial: "aim",
    },
  ],
  [
    "A different angle",
    "Cyan arena edges reflect. Bank around the dark barrier.",
    optical([L, { ...P(344, 278), wall: true }, P(220, 136)], {
      targets: [T(220, 136)],
      barriers: [B(196, 300, 116, Math.PI / 2)],
      shots: 3,
      par: 1,
      perfectBounces: 1,
    }),
  ],
  [
    "The turning point",
    "A mirror changes your direction, never your speed.",
    optical([L, P(180, 280), P(290, 140)], {
      targets: [T(290, 140)],
      shots: 3,
      par: 1,
      perfectBounces: 1,
      tutorial: "mirror",
    }),
  ],
  [
    "Through line",
    "Targets let energy pass through. Line them up.",
    {
      launcher: P(100, 466),
      targets: [T(100, 300), T(100, 128)],
      solution: { direction: P(0, -1) },
      shots: 3,
      par: 1,
    },
  ],
  [
    "Sidewinder",
    "One bank. Two targets. Trace the return path.",
    optical([P(120, 466), { ...P(344, 240), wall: true }, P(188, 83)], {
      targets: [T(288, 184), T(220, 116)],
      barriers: [B(168, 280, 90, Math.PI / 2)],
      shots: 3,
      par: 1,
      perfectBounces: 1,
    }),
  ],
  [
    "Double take",
    "Follow the light through two changes of direction.",
    optical([L, P(90, 335), P(270, 210), P(120, 85)], {
      targets: [T(156, 289), T(144, 105)],
      shots: 3,
      par: 1,
      perfectBounces: 2,
    }),
  ],
  [
    "Change of mind",
    "Tap the violet mirror to rotate it by 15°. Then take aim.",
    optical([L, P(180, 285), P(290, 110)], {
      rot: [0],
      targets: [T(290, 110)],
      shots: 3,
      par: 1,
      perfectBounces: 1,
      tutorial: "rotate",
    }),
  ],
  [
    "Cross current",
    "Set the upper mirror. Connect both sides of the arena.",
    optical([P(80, 466), P(80, 275), P(280, 185), P(170, 65)], {
      rot: [1],
      targets: [T(180, 230), T(185, 82)],
      shots: 3,
      par: 1,
      perfectBounces: 2,
    }),
  ],
  [
    "Switchback",
    "Three mirrors form a continuous optical circuit.",
    optical([P(82, 466), P(82, 335), P(282, 255), P(100, 160), P(265, 70)], {
      targets: [T(210, 218), T(240, 84)],
      shots: 3,
      par: 1,
      perfectBounces: 3,
    }),
  ],
  [
    "Counterweight",
    "Two adjustable mirrors. Rotate, preview, refine.",
    optical([P(280, 466), P(280, 330), P(85, 240), P(270, 100)], {
      rot: [0, 1],
      targets: [T(180, 286), T(245, 119)],
      shots: 3,
      par: 1,
      perfectBounces: 2,
    }),
  ],
  [
    "Reinforced",
    "Amber rings need two separate pulses. Hits are persistent.",
    optical([L, P(90, 310), P(285, 115)], {
      targets: [T(268, 132, { hp: 2 })],
      shots: 4,
      par: 2,
      perfectBounces: 2,
      tutorial: "armor",
    }),
  ],
  [
    "Prism corridor",
    "The first sector ends with a precise three-mirror route.",
    optical([P(280, 466), P(265, 350), P(90, 245), P(270, 150), P(120, 58)], {
      rot: [1],
      targets: [T(178, 298), T(180, 198), T(150, 76)],
      shots: 3,
      par: 1,
      perfectBounces: 3,
    }),
  ],
  [
    "Dead zone",
    "Striped barriers absorb energy. Find a way around.",
    optical([P(80, 466), P(80, 220), P(280, 110)], {
      targets: [T(275, 113)],
      barriers: [B(180, 280, 155, Math.PI / 2), B(250, 380, 115, 0)],
      shots: 3,
      par: 1,
      perfectBounces: 1,
      tutorial: "barrier",
    }),
  ],
  [
    "Pendulum",
    "Moving barriers repeat their motion. Watch before you fire.",
    optical([P(90, 466), P(90, 250), P(285, 110)], {
      targets: [T(275, 117)],
      barriers: [
        B(180, 340, 78, 0, {
          motion: { axis: "x", range: 60, speed: 1.7, phase: 0 },
        }),
      ],
      shots: 3,
      par: 1,
      perfectBounces: 1,
      tutorial: "moving",
    }),
  ],
  [
    "Open window",
    "A dashed amber gate is open. A solid gate absorbs the pulse.",
    {
      launcher: L,
      targets: [T(180, 110)],
      barriers: [B(180, 290, 160, 0, { period: 2.8, open: 1.35, phase: 0 })],
      solution: { direction: P(0, -1), wait: 0 },
      shots: 3,
      par: 1,
      tutorial: "gate",
    },
  ],
  [
    "Interlock",
    "Route past the moving arm into a long diagonal bank.",
    optical([P(75, 466), P(75, 290), P(280, 200), P(160, 70)], {
      rot: [1],
      targets: [T(178, 245), T(175, 86)],
      barriers: [
        B(200, 370, 70, 0, {
          motion: { axis: "x", range: 65, speed: 1.4, phase: 0 },
        }),
        B(170, 156, 66, Math.PI / 2),
      ],
      shots: 3,
      par: 1,
      perfectBounces: 2,
    }),
  ],
  [
    "Twice as bright",
    "A gate and a reinforced target. Time both pulses.",
    optical([P(275, 466), P(275, 290), P(85, 130)], {
      targets: [T(102, 144, { hp: 2 })],
      barriers: [B(275, 385, 94, 0, { period: 2.5, open: 1.9, phase: 0 })],
      shots: 4,
      par: 2,
      perfectBounces: 2,
    }),
  ],
  [
    "Narrow escape",
    "The machinery moves. The reflection law stays the same.",
    optical([P(75, 466), P(75, 310), P(285, 205), P(110, 70)], {
      rot: [0],
      targets: [T(200, 247), T(132, 87)],
      barriers: [
        B(190, 385, 88, 0, { motion: { axis: "x", range: 55, speed: 1.9 } }),
        B(150, 170, 65, Math.PI / 2, { period: 3, open: 1.5, phase: 0.2 }),
      ],
      shots: 3,
      par: 1,
      perfectBounces: 2,
    }),
  ],
  [
    "Divide the light",
    "A prism splits one pulse into two at ±30°.",
    {
      launcher: L,
      splitters: [{ id: "s0", x: 180, y: 300 }],
      targets: [T(105, 170), T(255, 170)],
      solution: { direction: P(0, -1) },
      shots: 3,
      par: 1,
      tutorial: "split",
    },
  ],
  [
    "Domino effect",
    "Destroy a linked target to burst everything inside its ring.",
    {
      launcher: P(90, 466),
      targets: [
        T(90, 250, { chain: 85 }),
        T(150, 205, { chain: 85 }),
        T(215, 170, { chain: 85 }),
        T(275, 120),
      ],
      barriers: [B(210, 330, 140, 0)],
      solution: { direction: P(0, -1) },
      shots: 3,
      par: 1,
      tutorial: "chain",
    },
  ],
  [
    "Twin circuit",
    "Split the pulse. Both branches have work to do.",
    {
      launcher: L,
      splitters: [{ id: "s0", x: 180, y: 340 }],
      targets: [
        T(100, 201, { chain: 82 }),
        T(70, 125),
        T(260, 201, { chain: 82 }),
        T(290, 125),
      ],
      barriers: [B(180, 210, 100, Math.PI / 2)],
      solution: { direction: P(0, -1) },
      shots: 3,
      par: 1,
    },
  ],
  [
    "Resonance",
    "Reinforced pairs require two perfectly aligned cascades.",
    {
      launcher: L,
      splitters: [{ id: "s0", x: 180, y: 320 }],
      targets: [T(105, 190, { hp: 2 }), T(255, 190, { hp: 2 })],
      solution: { direction: P(0, -1) },
      shots: 4,
      par: 2,
    },
  ],
  [
    "Threefold",
    "A second prism branches again. Let the whole circuit unfold.",
    {
      launcher: L,
      splitters: [
        { id: "s0", x: 180, y: 360 },
        { id: "s1", x: 110, y: 239 },
      ],
      targets: [T(265, 213), T(110, 105), T(35, 196)],
      solution: { direction: P(0, -1) },
      shots: 3,
      par: 1,
    },
  ],
  [
    "Cascade chamber",
    "Set the mirror and send a pulse into the branching circuit.",
    optical([P(80, 466), P(80, 345), P(235, 215)], {
      rot: [0],
      splitters: [{ id: "s0", x: 235, y: 215 }],
      targets: [
        T(270, 95, { chain: 80 }),
        T(215, 60),
        T(310, 195, { chain: 80 }),
        T(285, 245),
      ],
      barriers: [B(175, 380, 105, Math.PI / 2)],
      shots: 3,
      par: 1,
      perfectBounces: 1,
    }),
  ],
  [
    "Fault line",
    "Route around the central spine and trigger the linked array.",
    optical([P(75, 466), P(75, 300), P(285, 200), P(125, 90)], {
      rot: [1],
      targets: [T(150, 107, { chain: 75 }), T(205, 66), T(85, 72)],
      barriers: [
        B(190, 370, 120, Math.PI / 2),
        B(180, 260, 75, Math.PI / 2, { period: 3, open: 1.8 }),
      ],
      shots: 3,
      par: 1,
      perfectBounces: 2,
    }),
  ],
  [
    "Phase shift",
    "A moving arm, a timed gate, and one deliberate bank.",
    optical([P(280, 466), P(280, 270), P(85, 110)], {
      rot: [0],
      targets: [T(110, 131, { hp: 2 })],
      barriers: [
        B(280, 365, 90, 0, { period: 2.5, open: 1.9 }),
        B(160, 310, 65, 0, { motion: { axis: "y", range: 55, speed: 1.6 } }),
      ],
      shots: 4,
      par: 2,
      perfectBounces: 2,
    }),
  ],
  [
    "Critical mass",
    "Feed the prism through the open gate. Collapse both chains.",
    {
      launcher: L,
      splitters: [{ id: "s0", x: 180, y: 320 }],
      targets: [
        T(105, 177, { chain: 85 }),
        T(65, 110),
        T(255, 177, { chain: 85 }),
        T(295, 110),
      ],
      barriers: [
        B(180, 400, 130, 0, { period: 2.6, open: 1.6 }),
        B(180, 190, 110, Math.PI / 2),
      ],
      solution: { direction: P(0, -1) },
      shots: 3,
      par: 1,
    },
  ],
  [
    "Event horizon",
    "Two adjustable mirrors lead to a moving, gated finale.",
    optical([P(80, 466), P(80, 330), P(280, 240), P(100, 120)], {
      rot: [0, 1],
      targets: [T(178, 286), T(125, 137, { hp: 2 })],
      barriers: [
        B(180, 395, 70, 0, { motion: { axis: "x", range: 45, speed: 1.5 } }),
        B(180, 174, 70, Math.PI / 2, { period: 2.8, open: 2.1 }),
      ],
      shots: 4,
      par: 2,
      perfectBounces: 4,
    }),
  ],
  [
    "The last angle",
    "Three turns. A reinforced core. Keep the entire path in mind.",
    optical([P(280, 466), P(280, 350), P(85, 245), P(270, 150), P(115, 60)], {
      rot: [0, 2],
      targets: [T(180, 296), T(180, 196), T(145, 77, { hp: 2 })],
      barriers: [
        B(160, 410, 105, 0, { motion: { axis: "x", range: 40, speed: 1.5 } }),
      ],
      shots: 4,
      par: 2,
      perfectBounces: 6,
    }),
  ],
  [
    "Zero point",
    "One final circuit. Every angle matters.",
    optical([P(75, 466), P(75, 350), P(245, 225)], {
      rot: [0],
      splitters: [{ id: "s0", x: 245, y: 225 }],
      targets: [
        T(280, 100, { chain: 82 }),
        T(225, 65),
        T(315, 217, { chain: 82 }),
        T(290, 220, { hp: 2 }),
      ],
      barriers: [
        B(75, 415, 76, 0, { period: 2.6, open: 1.8 }),
        B(170, 380, 75, Math.PI / 2, {
          motion: { axis: "y", range: 25, speed: 1.4 },
        }),
      ],
      shots: 4,
      par: 2,
      perfectBounces: 2,
    }),
  ],
];
export const LEVELS = specs.map(([name, hint, data], i) => ({
  id: i + 1,
  name,
  hint,
  tier: Math.floor(i / 6),
  shots: 3,
  par: 1,
  perfectBounces: 0,
  ...data,
}));
LEVELS[27].solution.alignPeriod = 2.8;
export const CHALLENGES = [
  {
    id: 31,
    name: "Needlework",
    tier: 1,
    unlock: 12,
    hint: "A smaller target. A single pulse. No second chances.",
    ...optical([P(80, 466), P(80, 300), P(280, 130)], {
      rot: [0],
      targets: [T(280, 130, { r: 7 })],
      shots: 1,
      par: 1,
      perfectBounces: 1,
    }),
  },
  {
    id: 32,
    name: "Chain of command",
    tier: 3,
    unlock: 24,
    hint: "One pulse must trigger both linked arrays.",
    launcher: L,
    splitters: [{ id: "s0", x: 180, y: 350 }],
    targets: [
      T(100, 198, { chain: 77 }),
      T(55, 142),
      T(260, 198, { chain: 77 }),
      T(305, 142),
    ],
    barriers: [B(180, 210, 100, Math.PI / 2)],
    solution: { direction: P(0, -1) },
    shots: 1,
    par: 1,
  },
  {
    id: 33,
    name: "Absolute zero",
    tier: 4,
    unlock: 30,
    hint: "The complete circuit. One chance to get it right.",
    ...optical(
      [P(280, 466), P(280, 345), P(85, 245), P(270, 150), P(120, 62)],
      {
        rot: [0, 1, 2],
        targets: [
          T(180, 294, { r: 9 }),
          T(180, 196, { r: 9 }),
          T(145, 77, { r: 9 }),
        ],
        shots: 1,
        par: 1,
        perfectBounces: 3,
      },
    ),
  },
];
export const ALL_LEVELS = [...LEVELS, ...CHALLENGES];

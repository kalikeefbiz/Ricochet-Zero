import { opticalArena } from "./corridors.js";
export const CAMPAIGN_REVISION = 2;
export const TIERS = [
  { name: "Initiation", focus: "Earn the first reflection", color: "#67ebdf" },
  {
    name: "Reflection",
    focus: "Plan the whole optical circuit",
    color: "#8fa1ff",
  },
  {
    name: "Interference",
    focus: "Read the machinery. Choose your moment.",
    color: "#ffc46d",
  },
  {
    name: "Cascade",
    focus: "Sequence the light. Control the branches.",
    color: "#cb9aff",
  },
  {
    name: "Zero Point",
    focus: "Every angle. Every mechanic.",
    color: "#ff8f9f",
  },
];
const T = (x, y, extra = {}) => ({ x, y, ...extra });
const B = (x, y, length, angle = 0, extra = {}) => ({
  x,
  y,
  length,
  angle,
  ...extra,
});
const gate = (x, y, angle = 0, period = 3.4, open = 2.4) =>
  B(x, y, 58, angle, { period, open });
const moving = (x, y, axis = "x", range = 55, speed = 1.2) =>
  B(x, y, 42, 0, { motion: { axis, range, speed, phase: Math.PI / 2 } });
const single = (path, targets, extra = {}) => ({
  paths: [path],
  targets,
  ...extra,
});
const fork = (root, left, right, targets, extra = {}) => ({
  paths: [
    [...root, ...left],
    [...root, ...right],
  ],
  targets,
  ...extra,
});
const specs = [
  [
    "First light",
    "Aim into the cyan mirror. The striped chamber blocks every direct shot.",
    single(
      [
        [90, 458],
        [90, 210],
        [275, 210],
      ],
      [T(275, 210)],
      { width: 36, shots: 3, requiredMirrors: 1, tutorial: "aim" },
    ),
  ],
  [
    "A different angle",
    "Bank left through the elbow. Firing toward the target hits the partition.",
    single(
      [
        [270, 456],
        [270, 270],
        [80, 270],
      ],
      [T(80, 270)],
      { width: 31, requiredMirrors: 1 },
    ),
  ],
  [
    "The turning point",
    "A diagonal approach, then a vertical exit. Find the mirror’s working angle.",
    single(
      [
        [75, 450],
        [230, 320],
        [230, 100],
      ],
      [T(230, 100)],
      { width: 30, requiredMirrors: 1 },
    ),
  ],
  [
    "Through line",
    "One bank must pierce both cores in the far arm of the chamber.",
    single(
      [
        [280, 450],
        [115, 285],
        [280, 120],
      ],
      [T(235, 165), T(280, 120)],
      { width: 28, requiredMirrors: 1 },
    ),
  ],
  [
    "Sidewinder",
    "Calibrate the violet mirror before committing to the return lane.",
    single(
      [
        [75, 450],
        [200, 340],
        [90, 220],
      ],
      [T(90, 220)],
      {
        width: 28,
        rot: { "200,340": 2 },
        requiredMirrors: 1,
        tutorial: "rotate",
      },
    ),
  ],
  [
    "Double take",
    "Two deliberate turns. A clipped first reflection misses the second mirror.",
    single(
      [
        [70, 458],
        [235, 340],
        [100, 205],
        [280, 90],
      ],
      [T(280, 90)],
      { width: 29, requiredMirrors: 2 },
    ),
  ],
  [
    "Change of mind",
    "Set the first mirror, then trace both reflections to the distant core.",
    single(
      [
        [280, 458],
        [100, 340],
        [260, 210],
        [80, 80],
      ],
      [T(80, 80)],
      { width: 29, rot: { "100,340": 2 }, requiredMirrors: 2 },
    ),
  ],
  [
    "Cross current",
    "Set the upper mirror to send the horizontal pulse into the vertical firing lane.",
    single(
      [
        [75, 456],
        [75, 290],
        [265, 290],
        [265, 90],
      ],
      [T(265, 90)],
      { width: 28, rot: { "265,290": 3 }, requiredMirrors: 2 },
    ),
  ],
  [
    "Switchback",
    "Three changes of direction. Plan all of them before releasing.",
    single(
      [
        [285, 456],
        [285, 350],
        [95, 350],
        [95, 200],
        [235, 100],
      ],
      [T(235, 100)],
      { width: 27, requiredMirrors: 3 },
    ),
  ],
  [
    "Counterweight",
    "Three mirrors, two calibrations. Each exit sets up the next approach.",
    single(
      [
        [280, 458],
        [150, 360],
        [150, 230],
        [285, 130],
        [100, 65],
      ],
      [T(100, 65)],
      {
        width: 26,
        rot: { "150,360": 2, "285,130": 3 },
        requiredMirrors: 3,
        shots: 3,
      },
    ),
  ],
  [
    "Reinforced",
    "Two pulses through the same two-mirror corridor. Read the numbered core.",
    single(
      [
        [75, 458],
        [75, 280],
        [260, 280],
        [260, 90],
      ],
      [T(260, 90, { hp: 2 })],
      {
        width: 26,
        requiredMirrors: 2,
        shots: 3,
        par: 2,
        steps: 2,
        tutorial: "armor",
      },
    ),
  ],
  [
    "Prism corridor",
    "Calibrate both ends of a three-turn firing corridor. The shell offers no bypass.",
    single(
      [
        [285, 458],
        [285, 350],
        [90, 350],
        [90, 200],
        [270, 90],
      ],
      [T(270, 90)],
      {
        width: 25,
        rot: { "285,350": 2, "90,200": 2 },
        requiredMirrors: 3,
        shots: 3,
      },
    ),
  ],
  [
    "Dead zone",
    "Watch the moving arm, then thread both mirrors. The direct diagonal is sealed.",
    single(
      [
        [75, 458],
        [240, 340],
        [95, 210],
        [270, 90],
      ],
      [T(270, 90)],
      {
        width: 27,
        requiredMirrors: 2,
        shots: 3,
        extras: [moving(200, 400)],
        tutorial: "moving",
      },
    ),
  ],
  [
    "Open window",
    "A broad gate window protects a two-mirror route. Fire while the gate is dashed.",
    single(
      [
        [285, 458],
        [120, 315],
        [270, 180],
        [90, 90],
      ],
      [T(90, 90)],
      {
        width: 27,
        requiredMirrors: 2,
        shots: 3,
        extras: [gate(202.5, 386.5, -0.857, 3.4, 2.4)],
        tutorial: "gate",
      },
    ),
  ],
  [
    "Interlock",
    "Set the second mirror, then pass the gate after the first reflection.",
    single(
      [
        [70, 458],
        [220, 350],
        [90, 220],
        [260, 90],
      ],
      [T(260, 90)],
      {
        width: 25,
        rot: { "90,220": 2 },
        requiredMirrors: 2,
        shots: 3,
        extras: [gate(155, 285, -Math.PI / 4, 3.6, 2.6)],
      },
    ),
  ],
  [
    "Switchyard",
    "Clear the left pocket, rotate the hub three taps clockwise, then clear the right.",
    fork(
      [
        [180, 458],
        [180, 260],
      ],
      [[70, 150]],
      [[290, 150]],
      [T(70, 150), T(290, 150)],
      {
        width: 27,
        rot: { "180,260": 2 },
        requiredMirrors: 1,
        shots: 3,
        par: 2,
        steps: [{}, { rotations: [{ point: "180,260", taps: 3 }] }],
      },
    ),
  ],
  [
    "Twice as bright",
    "Clear the left arm. Turn the hub three taps, then send two pulses into the armored right arm.",
    fork(
      [
        [180, 458],
        [180, 290],
      ],
      [
        [80, 190],
        [80, 100],
      ],
      [
        [280, 190],
        [280, 100],
      ],
      [T(80, 100), T(280, 100, { hp: 2 })],
      {
        width: 26,
        rot: { "180,290": 2 },
        requiredMirrors: 2,
        shots: 4,
        par: 3,
        steps: [{}, { rotations: [{ point: "180,290", taps: 3 }] }, {}],
      },
    ),
  ],
  [
    "Narrow escape",
    "Bank into the hub, clear the left core, turn the hub three taps, then clear the right.",
    fork(
      [
        [70, 458],
        [180, 370],
        [180, 270],
      ],
      [[70, 160]],
      [[290, 160]],
      [T(70, 160), T(290, 160)],
      {
        width: 26,
        rot: { "180,370": 2, "180,270": 2 },
        requiredMirrors: 2,
        shots: 3,
        par: 2,
        steps: [{}, { rotations: [{ point: "180,270", taps: 3 }] }],
        extras: [moving(135, 410, "x", 55, (2 * Math.PI) / 3.6)],
        alignPeriod: 3.6,
      },
    ),
  ],
  [
    "Divide the light",
    "Two mirrors feed the prism. Both branches must reach their isolated cores.",
    {
      paths: [
        [
          [70, 458],
          [70, 280],
          [180, 280],
          [180, 170],
          [120, 66],
        ],
        [
          [70, 458],
          [70, 280],
          [180, 280],
          [180, 170],
          [240, 66],
        ],
      ],
      targets: [T(120, 66), T(240, 66)],
      splitters: [{ x: 180, y: 170 }],
      width: 25,
      endCap: 18,
      requiredMirrors: 2,
      shots: 3,
      tutorial: "split",
    },
  ],
  [
    "Domino effect",
    "Reach the linked array through two mirrors. Its burst completes the remote pocket.",
    single(
      [
        [280, 458],
        [100, 330],
        [260, 210],
        [125, 110],
      ],
      [T(125, 110, { chain: 75 }), T(185, 100, { chain: 70 }), T(205, 135)],
      {
        width: 26,
        requiredMirrors: 2,
        shots: 3,
        rooms: [{ x: 105, y: 65, w: 123, h: 110 }],
        tutorial: "chain",
      },
    ),
  ],
  [
    "Twin circuit",
    "Pass the gate and both mirrors, then split the pulse into two independent chains.",
    {
      paths: [
        [
          [285, 458],
          [285, 320],
          [180, 320],
          [180, 170],
          [120, 66],
        ],
        [
          [285, 458],
          [285, 320],
          [180, 320],
          [180, 170],
          [240, 66],
        ],
      ],
      targets: [
        T(120, 66, { chain: 70 }),
        T(70, 90),
        T(240, 66, { chain: 70 }),
        T(290, 90),
      ],
      splitters: [{ x: 180, y: 170 }],
      rooms: [
        { x: 48, y: 46, w: 94, h: 68 },
        { x: 218, y: 46, w: 94, h: 68 },
      ],
      width: 25,
      endCap: 18,
      requiredMirrors: 2,
      shots: 3,
      extras: [gate(285, 390)],
    },
  ],
  [
    "Resonance",
    "Calibrate the feed mirror. Both prism branches need two pulses; use the next gate cycle.",
    {
      paths: [
        [
          [75, 458],
          [75, 280],
          [180, 280],
          [180, 170],
          [120, 66],
        ],
        [
          [75, 458],
          [75, 280],
          [180, 280],
          [180, 170],
          [240, 66],
        ],
      ],
      targets: [T(120, 66, { hp: 2 }), T(240, 66, { hp: 2 })],
      splitters: [{ x: 180, y: 170 }],
      width: 25,
      endCap: 18,
      rot: { "180,280": 2 },
      requiredMirrors: 2,
      shots: 3,
      par: 2,
      steps: 2,
      alignPeriod: 3.4,
      extras: [gate(75, 375)],
    },
  ],
  [
    "Threefold",
    "Align both pocket mirrors. Clear the left chain, switch the hub three taps, clear the right.",
    fork(
      [
        [180, 458],
        [180, 290],
      ],
      [
        [80, 190],
        [80, 100],
      ],
      [
        [280, 190],
        [280, 100],
      ],
      [
        T(80, 100, { chain: 70 }),
        T(120, 65),
        T(280, 100, { chain: 70 }),
        T(240, 65),
      ],
      {
        width: 25,
        rot: { "180,290": 2, "80,190": 2, "280,190": 2 },
        rooms: [
          { x: 52, y: 44, w: 90, h: 78 },
          { x: 218, y: 44, w: 90, h: 78 },
        ],
        requiredMirrors: 2,
        shots: 3,
        par: 2,
        steps: [{}, { rotations: [{ point: "180,290", taps: 3 }] }],
      },
    ),
  ],
  [
    "Cascade chamber",
    "Two banks, then two prism stages. Three branches must survive the full circuit.",
    {
      paths: [
        [
          [75, 458],
          [75, 340],
          [180, 340],
          [180, 250],
          [110, 129],
          [54, 97],
        ],
        [
          [75, 458],
          [75, 340],
          [180, 340],
          [180, 250],
          [110, 129],
          [110, 65],
        ],
        [
          [75, 458],
          [75, 340],
          [180, 340],
          [180, 250],
          [260, 111],
        ],
      ],
      targets: [T(54, 97), T(110, 65), T(260, 111)],
      splitters: [
        { x: 180, y: 250 },
        { x: 110, y: 129 },
      ],
      width: 23,
      endCap: 17,
      rot: { "75,340": 2 },
      requiredMirrors: 2,
      shots: 3,
    },
  ],
  [
    "Fault line",
    "Calibrate a three-bank route. Break the armored linked core with two well-timed pulses.",
    single(
      [
        [285, 458],
        [285, 350],
        [90, 350],
        [90, 200],
        [245, 95],
      ],
      [T(245, 95, { hp: 2, chain: 70 }), T(285, 135), T(195, 90)],
      {
        width: 24,
        rot: { "285,350": 2, "90,200": 2 },
        rooms: [{ x: 174, y: 65, w: 137, h: 91 }],
        requiredMirrors: 3,
        shots: 3,
        par: 2,
        steps: 2,
        alignPeriod: 3.4,
        extras: [gate(90, 275, 0, 3.4, 2.5)],
      },
    ),
  ],
  [
    "Phase shift",
    "Bank into the hub. Each arm adds a cyan wall bank. Clear left, then switch three taps right.",
    fork(
      [
        [70, 458],
        [180, 370],
        [180, 270],
      ],
      [
        [70, 160],
        [70, 65],
      ],
      [
        [290, 160],
        [290, 65],
      ],
      [T(70, 65), T(290, 65)],
      {
        width: 24,
        rot: { "180,270": 2 },
        walls: ["70,160", "290,160"],
        requiredMirrors: 2,
        shots: 3,
        par: 2,
        steps: [{}, { rotations: [{ point: "180,270", taps: 3 }] }],
        extras: [gate(180, 320, 0, 3.6, 2.6)],
      },
    ),
  ],
  [
    "Critical mass",
    "Set all three adjustable mirrors. Two left pulses, three hub taps, one right pulse.",
    fork(
      [
        [285, 458],
        [180, 370],
        [180, 270],
      ],
      [
        [70, 160],
        [70, 65],
      ],
      [
        [290, 160],
        [290, 65],
      ],
      [T(70, 65, { hp: 2 }), T(290, 65)],
      {
        width: 24,
        rot: { "180,270": 2, "70,160": 2, "290,160": 2 },
        requiredMirrors: 3,
        shots: 4,
        par: 3,
        steps: [{}, {}, { rotations: [{ point: "180,270", taps: 3 }] }],
        alignPeriod: 3.8,
        extras: [
          gate(180, 320, 0, 3.8, 2.7),
          { ...moving(250, 420, "x", 40, (2 * Math.PI) / 3.8), length: 36 },
        ],
      },
    ),
  ],
  [
    "Event horizon",
    "Two calibrated paths feed separate prisms. Each pocket needs two pulses; switch the hub after the left.",
    {
      paths: [
        [
          [180, 458],
          [180, 290],
          [80, 190],
          [80, 130],
          [52, 82],
        ],
        [
          [180, 458],
          [180, 290],
          [80, 190],
          [80, 130],
          [108, 82],
        ],
        [
          [180, 458],
          [180, 290],
          [280, 190],
          [280, 130],
          [252, 82],
        ],
        [
          [180, 458],
          [180, 290],
          [280, 190],
          [280, 130],
          [308, 82],
        ],
      ],
      targets: [
        T(52, 82, { hp: 2 }),
        T(108, 82, { chain: 64 }),
        T(252, 82, { hp: 2 }),
        T(308, 82, { chain: 64 }),
      ],
      splitters: [
        { x: 80, y: 130 },
        { x: 280, y: 130 },
      ],
      width: 25,
      mirrorLength: 74,
      endCap: 17,
      rot: { "180,290": 2, "80,190": 2, "280,190": 2 },
      requiredMirrors: 2,
      shots: 5,
      par: 4,
      steps: [{}, {}, { rotations: [{ point: "180,290", taps: 3 }] }, {}],
      extras: [gate(180, 370, 0, 3.8, 2.7)],
      alignPeriod: 3.8,
    },
  ],
  [
    "The last angle",
    "Four banks must reach the armored core. Calibrate every violet mirror before firing.",
    single(
      [
        [75, 458],
        [75, 360],
        [280, 360],
        [280, 230],
        [90, 230],
        [220, 90],
      ],
      [T(220, 90, { hp: 2, r: 10 })],
      {
        width: 24,
        rot: { "75,360": 2, "280,360": 2, "90,230": 2 },
        requiredMirrors: 4,
        shots: 3,
        par: 2,
        steps: 2,
        alignPeriod: 3.8,
        extras: [
          gate(280, 295, 0, 3.8, 2.8),
          moving(120, 410, "x", 50, (2 * Math.PI) / 3.8),
        ],
      },
    ),
  ],
  [
    "Zero point",
    "Calibrate the feed and hub. Bank, split and break the left armor twice; switch the hub three taps and repeat right.",
    {
      paths: [
        [
          [285, 458],
          [180, 370],
          [180, 270],
          [80, 170],
          [80, 130],
          [52, 82],
        ],
        [
          [285, 458],
          [180, 370],
          [180, 270],
          [80, 170],
          [80, 130],
          [108, 82],
        ],
        [
          [285, 458],
          [180, 370],
          [180, 270],
          [280, 170],
          [280, 130],
          [252, 82],
        ],
        [
          [285, 458],
          [180, 370],
          [180, 270],
          [280, 170],
          [280, 130],
          [308, 82],
        ],
      ],
      targets: [
        T(52, 82, { hp: 2 }),
        T(108, 82, { chain: 64 }),
        T(252, 82, { hp: 2 }),
        T(308, 82, { chain: 64 }),
      ],
      splitters: [
        { x: 80, y: 130 },
        { x: 280, y: 130 },
      ],
      walls: ["80,170", "280,170"],
      width: 25,
      mirrorLength: 74,
      endCap: 17,
      rot: { "180,370": 2, "180,270": 2 },
      requiredMirrors: 2,
      shots: 5,
      par: 4,
      steps: [{}, {}, { rotations: [{ point: "180,270", taps: 3 }] }, {}],
      extras: [
        gate(180, 320, 0, 3.6, 2.5),
        { ...moving(250, 420, "x", 40, (2 * Math.PI) / 3.6), length: 30 },
      ],
      alignPeriod: 3.6,
    },
  ],
];
export const LEVELS = specs.map(([name, hint, definition], i) => {
  const level = opticalArena(definition);
  level.id = i + 1;
  level.name = name;
  level.hint = hint;
  level.tier = Math.floor(i / 6);
  level.revision = CAMPAIGN_REVISION;
  level.perfectBounces = level.requiredMirrors * level.par;
  level.solution.steps = level.solution.steps.map((step) => ({
    ...step,
    rotations: (step.rotations || []).map((r) => ({
      index: level.mirrors.findIndex(
        (m) => `${m.anchor.x},${m.anchor.y}` === r.point,
      ),
      taps: r.taps,
    })),
  }));
  level.solution.alignPeriod = definition.alignPeriod;
  return level;
});

export const CHALLENGES = [
  {
    id: 31,
    name: "Needlework",
    tier: 1,
    unlock: 12,
    hint: "One calibrated bank. One small core. One pulse.",
    ...opticalArena(
      single(
        [
          [275, 458],
          [100, 300],
          [275, 120],
        ],
        [T(275, 120, { r: 7 })],
        {
          width: 25,
          rot: { "100,300": 2 },
          requiredMirrors: 1,
          shots: 1,
          par: 1,
          perfectBounces: 1,
        },
      ),
    ),
  },
  {
    id: 32,
    name: "Chain of command",
    tier: 3,
    unlock: 24,
    hint: "Two banks feed a prism. Trigger both arrays with a single pulse.",
    ...opticalArena({
      paths: [
        [
          [75, 458],
          [75, 280],
          [180, 280],
          [180, 170],
          [120, 66],
        ],
        [
          [75, 458],
          [75, 280],
          [180, 280],
          [180, 170],
          [240, 66],
        ],
      ],
      targets: [
        T(120, 66, { chain: 70 }),
        T(70, 90),
        T(240, 66, { chain: 70 }),
        T(290, 90),
      ],
      splitters: [{ x: 180, y: 170 }],
      rooms: [
        { x: 48, y: 46, w: 94, h: 68 },
        { x: 218, y: 46, w: 94, h: 68 },
      ],
      width: 24,
      endCap: 18,
      requiredMirrors: 2,
      shots: 1,
      par: 1,
      perfectBounces: 2,
    }),
  },
  {
    id: 33,
    name: "Absolute zero",
    tier: 4,
    unlock: 30,
    hint: "Four banks. Three calibrations. A single precise pulse.",
    ...opticalArena(
      single(
        [
          [75, 458],
          [75, 360],
          [280, 360],
          [280, 230],
          [90, 230],
          [220, 90],
        ],
        [T(220, 90, { r: 8 })],
        {
          width: 24,
          rot: { "75,360": 2, "280,360": 2, "90,230": 2 },
          requiredMirrors: 4,
          shots: 1,
          par: 1,
          perfectBounces: 4,
        },
      ),
    ),
  },
];
export const ALL_LEVELS = [...LEVELS, ...CHALLENGES];

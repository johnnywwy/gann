"use strict";

/**
 * Reimplementation of the highlight-point rules around:
 *   0x0040F450  distance selector
 *   0x0040F4F0  point classifier
 *   0x00415xxx  result-set insert/delete/dedupe behavior
 *
 * The original program stores results in several intrusive linked lists. This
 * version keeps the same observable behavior with JavaScript Maps/Sets.
 */

const CLASS_TABLE = [0, 0, 0, 1, 2, 3, 3, 4, 4];
const DEFAULT_RING = 9;

function ringAtNumber(n) {
  if (n < 1 || !Number.isInteger(n)) {
    throw new Error("n must be a positive integer");
  }
  return Math.ceil((Math.sqrt(n) - 1) / 2);
}

function originAtRing(ring) {
  return {
    x: ring,
    y: ring,
  };
}

function originAtNumber(n) {
  return originAtRing(ringAtNumber(n));
}

function pointKey(p) {
  return `${p.x},${p.y}`;
}

function gridToMath(point, origin = { x: 5, y: 5 }) {
  return {
    x: point.x - origin.x,
    y: origin.y - point.y,
  };
}

function mathToGrid(point, origin = { x: 5, y: 5 }) {
  return {
    x: point.x + origin.x,
    y: origin.y - point.y,
  };
}

function numberAtGrid(point, origin = { x: 5, y: 5 }) {
  const { x, y } = gridToMath(point, origin);
  if (x === 0 && y === 0) return 1;

  const ring = Math.max(Math.abs(x), Math.abs(y));
  const max = (2 * ring + 1) ** 2;
  const side = 2 * ring;

  if (y === ring) return max - (ring - x);
  if (x === -ring) return max - side - (ring - y);
  if (y === -ring) return max - 2 * side - (x + ring);
  if (x === ring) return max - 3 * side - (y + ring);
  return null;
}

function gridAtNumber(n, origin = { x: 5, y: 5 }) {
  if (n < 1 || !Number.isInteger(n)) {
    throw new Error("n must be a positive integer");
  }
  if (n === 1) return { ...origin };

  const ring = Math.ceil((Math.sqrt(n) - 1) / 2);
  const max = (2 * ring + 1) ** 2;
  const side = 2 * ring;
  const d = max - n;

  let math;
  if (d < side) {
    math = { x: ring - d, y: ring };
  } else if (d < 2 * side) {
    math = { x: -ring, y: ring - (d - side) };
  } else if (d < 3 * side) {
    math = { x: -ring + (d - 2 * side), y: -ring };
  } else {
    math = { x: ring, y: -ring + (d - 3 * side) };
  }

  return mathToGrid(math, origin);
}

function segmentKey(a, b) {
  const ka = pointKey(a);
  const kb = pointKey(b);
  return ka <= kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

function absDelta(point, center) {
  return {
    dx: Math.abs(point.x - center.x),
    dy: Math.abs(point.y - center.y),
  };
}

/**
 * Equivalent to 0x0040F4F0.
 *
 * Return values seen in the exe:
 *   1: one highlight class
 *   2: the other/default highlight class
 *
 * Which one is red/green depends on the drawing code that consumes the set.
 * In the caller at 0x00406A70, type 2 is the one accepted for insertion.
 */
function classifyPoint(point, center) {
  const { dx, dy } = absDelta(point, center);

  if (point.x === center.x || point.y === center.y) {
    return 2;
  }

  if (point.x < center.x && point.y > center.y) {
    if (dx === 3 && dy === 5) return 1;
    if (dx === 4 && dy === 7) return 1;
  }

  const firstGate =
    dx > 8 ? dx - 4 < dy : CLASS_TABLE[dx] < dy;

  if (!firstGate) {
    return 2;
  }

  if (dy > 8) {
    return dy - 4 >= dx ? 2 : 1;
  }

  return CLASS_TABLE[dy] < dx ? 1 : 2;
}

/**
 * Equivalent to 0x0040F610.
 * Writes max(abs(dx), abs(dy)) and min(abs(dx), abs(dy)) in the original.
 */
function majorMinorDistance(point, center) {
  const { dx, dy } = absDelta(point, center);
  return {
    major: Math.max(dx, dy),
    minor: Math.min(dx, dy),
  };
}

/**
 * Equivalent to 0x0040F450 after region classification has already happened.
 *
 * 0x40F450 calls 0x40F360 to get a region id 1..7, then returns:
 *   region 1,3,6,7 -> abs(dx)
 *   region 2,4     -> abs(dy)
 *   region 5/other -> 0
 */
function selectedDistance(point, center, regionId) {
  const { dx, dy } = absDelta(point, center);
  if (regionId === 1 || regionId === 3 || regionId === 6 || regionId === 7) {
    return dx;
  }
  if (regionId === 2 || regionId === 4) {
    return dy;
  }
  return 0;
}

function pointInRect(point, rect) {
  return (
    point.x >= rect.left &&
    point.x < rect.right &&
    point.y >= rect.top &&
    point.y < rect.bottom
  );
}

/**
 * Practical stand-in for 0x0040F360.
 *
 * The exe uses USER32!PtInRect against two transformed rectangles. Exact region
 * rectangles depend on object fields at this+0xC0 and this+0xD0, so this helper
 * accepts them as data. If no region matches, it returns 0.
 */
function classifyRegion(point, regions) {
  for (const region of regions) {
    if (pointInRect(point, region.rect)) {
      return region.id;
    }
  }
  return 0;
}

const MODES = {
  1: 1,
  2: 2,
  up: 1,
  down: 2,
  rise: 1,
  fall: 2,
};

const DIRECTIONS = {
  up: { dx: 0, dy: -1, sideAxis: "x" },
  down: { dx: 0, dy: 1, sideAxis: "x" },
};

function pointOnAxis(center, direction, step, sideOffset = 0) {
  const dir = DIRECTIONS[direction];
  if (!dir) {
    throw new Error(`unknown direction: ${direction}`);
  }

  const point = {
    x: center.x + dir.dx * step,
    y: center.y + dir.dy * step,
  };

  if (dir.sideAxis === "x") {
    point.x += sideOffset;
  } else {
    point.y += sideOffset;
  }

  return point;
}

function generateAxisPoints(center, direction, options = {}) {
  const {
    steps = 18,
    sideOffsets = [-1, 0, 1],
    origin = { x: 5, y: 5 },
  } = options;

  const axes = {};
  for (const sideOffset of sideOffsets) {
    axes[sideOffset] = [];
    for (let step = 1; step <= steps; step += 1) {
      const point = pointOnAxis(center, direction, step, sideOffset);
      axes[sideOffset].push({
        n: numberAtGrid(point, origin),
        coord: [point.x, point.y],
        delta: [point.x - center.x, point.y - center.y],
        mode: classifyPoint(point, center),
      });
    }
  }
  return axes;
}

function generateExeLikeHighlights(center, direction, options = {}) {
  const {
    steps = 12,
    branchSteps = steps,
    origin = { x: 5, y: 5 },
  } = options;

  const requestedMode = MODES[direction];
  if (!requestedMode) {
    throw new Error(`unknown mode: ${direction}`);
  }

  const points = [];
  const add = (point, line) => {
    points.push({
      n: numberAtGrid(point, origin),
      coord: [point.x, point.y],
      delta: [point.x - center.x, point.y - center.y],
      mode: classifyPoint(point, center),
      line,
    });
  };

  const relX = center.x - origin.x;
  const relY = center.y - origin.y;
  const sx = relX === 0 ? 1 : Math.sign(relX);
  const sy = relY === 0 ? 1 : Math.sign(relY);
  const slopeClass = classifyPoint(center, origin);
  const lateral = slopeClass === 1 ? Math.max(0, Math.abs(relX) - 1) : 0;
  const verticalStep = -sy;
  const sideStep = -sx;

  const mainStep = {
    x: sideStep * lateral,
    y: verticalStep,
  };
  const branchStep = {
    x: sideStep,
    y: sy * lateral,
  };

  for (let step = 1; step <= steps; step += 1) {
    add({
      x: center.x + mainStep.x * step,
      y: center.y + mainStep.y * step,
    }, "main");
  }

  if (slopeClass === 1) {
    const branchStart = lateral;
    for (let step = branchStart; step < branchStart + branchSteps; step += 1) {
      add({
        x: origin.x + branchStep.x * step,
        y: origin.y + branchStep.y * step,
      }, "branch");
    }
  } else if (Math.abs(relX) <= 1) {
    for (let step = 0; step < branchSteps; step += 1) {
      add({
        x: origin.x + sideStep * step,
        y: origin.y,
      }, "branch");
    }
  } else {
    const start = Math.abs(relY);
    for (let i = 0; i < branchSteps; i += 1) {
      add({
        x: origin.x + sx * (start - i),
        y: origin.y,
      }, "branch");
    }
  }

  return points;
}

class HighlightSets {
  constructor(center, options = {}) {
    this.center = { ...center };
    this.regions = options.regions || [];
    this.type1Points = new Map();
    this.type2Points = new Map();
    this.segments = new Map();
  }

  analyze(point, regionId = classifyRegion(point, this.regions)) {
    const type = classifyPoint(point, this.center);
    return {
      point: { ...point },
      center: { ...this.center },
      regionId,
      type,
      distance: selectedDistance(point, this.center, regionId),
      ...majorMinorDistance(point, this.center),
    };
  }

  addPoint(point, regionId = classifyRegion(point, this.regions)) {
    const info = this.analyze(point, regionId);
    const key = pointKey(point);
    const target = info.type === 1 ? this.type1Points : this.type2Points;
    target.set(key, info);
    return info;
  }

  /**
   * Mirrors the 0x00415430/0x00415E60 style of segment set:
   * a->b and b->a are treated as the same segment.
   */
  addSegment(a, b, payload = {}) {
    const key = segmentKey(a, b);
    const item = { a: { ...a }, b: { ...b }, ...payload };
    this.segments.set(key, item);
    return item;
  }

  deleteSegment(a, b) {
    return this.segments.delete(segmentKey(a, b));
  }

  clear() {
    this.type1Points.clear();
    this.type2Points.clear();
    this.segments.clear();
  }
}

module.exports = {
  CLASS_TABLE,
  DEFAULT_RING,
  DIRECTIONS,
  HighlightSets,
  absDelta,
  classifyPoint,
  classifyRegion,
  generateAxisPoints,
  generateExeLikeHighlights,
  gridAtNumber,
  gridToMath,
  mathToGrid,
  majorMinorDistance,
  numberAtGrid,
  originAtNumber,
  originAtRing,
  pointInRect,
  pointOnAxis,
  ringAtNumber,
  selectedDistance,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const usage = [
    "Usage:",
    "  node gann_highlight_repro.js <number|x,y> <1|2|up|down> [steps] [branchSteps] [ring]",
    "",
    "Examples:",
    "  node gann_highlight_repro.js 33 up",
    "  node gann_highlight_repro.js 6,8 up 6 4",
    "  node gann_highlight_repro.js 32 up 6 4 9",
  ].join("\n");

  if (args.length < 2 || args.includes("--help") || args.includes("-h")) {
    console.log(usage);
    process.exit(args.length < 2 ? 1 : 0);
  }

  const [pointArg, direction, stepsArg, branchStepsArg, ringArg] = args;
  const ring = ringArg ? Number(ringArg) : DEFAULT_RING;
  if (!Number.isInteger(ring) || ring < 0) {
    throw new Error("ring must be a non-negative integer");
  }

  let origin = originAtRing(ring);
  let center;
  let inputNumber = null;

  if (pointArg.includes(",")) {
    const parts = pointArg.split(",").map((part) => Number(part.trim()));
    if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) {
      throw new Error(`invalid coordinate: ${pointArg}`);
    }
    center = { x: parts[0], y: parts[1] };
    inputNumber = numberAtGrid(center, origin);
  } else {
    inputNumber = Number(pointArg);
    center = gridAtNumber(inputNumber, origin);
  }

  const steps = stepsArg ? Number(stepsArg) : 12;
  const branchSteps = branchStepsArg ? Number(branchStepsArg) : 12;
  if (!Number.isInteger(steps) || steps < 1) {
    throw new Error("steps must be a positive integer");
  }
  if (!Number.isInteger(branchSteps) || branchSteps < 1) {
    throw new Error("branchSteps must be a positive integer");
  }

  const highlights = generateExeLikeHighlights(center, direction, {
    steps,
    branchSteps,
    origin,
  });

  const main = highlights.filter((item) => item.line === "main");
  const branch = highlights.filter((item) => item.line === "branch");

  console.log(`input: ${pointArg}`);
  console.log(`number: ${inputNumber}`);
  console.log(`ring: ${ring}`);
  console.log(`origin: [${origin.x}, ${origin.y}]`);
  console.log(`coord: [${center.x}, ${center.y}]`);
  console.log(`mode: ${MODES[direction] || direction}`);
  console.log("");
  console.log(`main: ${main.map((item) => item.n).join(", ")}`);
  console.log(`branch: ${branch.map((item) => item.n).join(", ")}`);
  console.log(`all: ${highlights.map((item) => item.n).join(", ")}`);
}

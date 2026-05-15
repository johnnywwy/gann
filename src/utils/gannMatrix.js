const CLASS_TABLE = [0, 0, 0, 1, 2, 3, 3, 4, 4];

export function generateGannMatrix(base = 1, step = 1, loop = 9) {
  const radius = Math.max(1, Number(loop) || 1);
  const size = radius * 2 + 1;
  const max = size * size;
  const { numToPos } = buildGannSpiral(max);
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));

  for (let n = 1; n <= max; n += 1) {
    const pos = numToPos.get(n);
    matrix[pos.row + radius][pos.col + radius] = base + (n - 1) * step;
  }

  return matrix;
}

export function findNumberPosition(matrix, target) {
  const value = Number(target);
  if (!Number.isFinite(value)) return { r: -1, c: -1 };

  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = 0; c < matrix[r].length; c += 1) {
      if (Number(matrix[r][c]) === value) return { r, c };
    }
  }

  return { r: -1, c: -1 };
}

export function getLineCoordsBySlope(k, totalSize, centerPx) {
  return clipLineThroughCenter(k, centerPx, totalSize);
}

export function calculateClickTrend(matrix, r, c, trendDirection, options = {}) {
  const clickedValue = matrix[r]?.[c];
  const base = Number(options.base ?? 1);
  const step = Number(options.step ?? 1);
  const loop = Math.max(1, Number(options.loop ?? Math.floor(matrix.length / 2)) || 1);
  const rawIndex = step === 0 ? clickedValue : (clickedValue - base) / step + 1;
  const clickedIndex = Math.round(rawIndex);

  const highlight = calcHighlights(clickedIndex, trendDirection, loop);
  const toValue = n => base + (n - 1) * step;
  const mainValues = highlight.mainHighlight.map(toValue);
  const crossValues = highlight.subHighlight.map(toValue);
  const mainLine = valuesToPoints(matrix, mainValues);
  const crossLine = valuesToPoints(matrix, crossValues);

  return {
    clickedValue,
    clickedIndex,
    trend: trendDirection,
    point: highlight.point,
    absPoint: highlight.absPoint,
    type: highlight.type,
    sector: highlight.sector,
    distance: highlight.distance,
    mainLine,
    crossLine,
    mainLinePoints: mainLine,
    crossLinePoints: crossLine,
    trendMain: mainLine,
    trendCross: crossLine,
    trendCells: [...mainLine, ...crossLine],
    raw: highlight,
  };
}

export function getAllCenterLines(matrix) {
  const size = matrix.length;
  const center = Math.floor(size / 2);
  const lines = { diag1: [], diag2: [], vertical: [], horizontal: [] };

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const item = { r, c, value: matrix[r][c] };
      if (r === c) lines.diag1.push(item);
      if (r + c === center * 2) lines.diag2.push(item);
      if (c === center) lines.vertical.push(item);
      if (r === center) lines.horizontal.push(item);
    }
  }

  return lines;
}

export function findBelongLine(lines, clickedValue) {
  for (const key of Object.keys(lines || {})) {
    if (lines[key].some(item => item.value === clickedValue)) return key;
  }
  return null;
}

export function convertToPointArray(matrix, valueArray) {
  return valuesToPoints(matrix, valueArray);
}

export function getPointsFromMatrix(matrix, values) {
  return valuesToPoints(matrix, values);
}

export function getMainDiagonal(matrix, r, c) {
  return matrix.flatMap((row, rowIndex) =>
    row.map((value, colIndex) => ({ r: rowIndex, c: colIndex, value }))
  ).filter(point => point.r - point.c === r - c);
}

export function getCenterAntiDiagonal(matrix) {
  const center = Math.floor(matrix.length / 2);
  return matrix.flatMap((row, rowIndex) =>
    row.map((value, colIndex) => ({ r: rowIndex, c: colIndex, value }))
  ).filter(point => point.r + point.c === center * 2);
}

export function getMainDiagonalDown(mainLine, clickedValue) {
  return mainLine.filter(item => item.value < clickedValue);
}

export function getAntiDiagonalDown(antiLine, clickedValue) {
  return antiLine.filter(item => item.value < clickedValue);
}

function valuesToPoints(matrix, values) {
  const index = new Map();
  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = 0; c < matrix[r].length; c += 1) {
      index.set(Number(matrix[r][c]), { r, c, value: matrix[r][c] });
    }
  }
  return dedupe(values).map(value => index.get(Number(value))).filter(Boolean);
}

function buildGannSpiral(max) {
  const numToPos = new Map();
  const posToNum = new Map();
  let row = 0;
  let col = 0;
  let n = 1;
  setPoint(n, row, col);

  const dirs = [[0, -1], [-1, 0], [0, 1], [1, 0]];
  let stepLen = 1;
  let dirIndex = 0;

  while (n < max) {
    for (let repeat = 0; repeat < 2 && n < max; repeat += 1) {
      const [dr, dc] = dirs[dirIndex % 4];
      for (let i = 0; i < stepLen && n < max; i += 1) {
        row += dr;
        col += dc;
        n += 1;
        setPoint(n, row, col);
      }
      dirIndex += 1;
    }
    stepLen += 1;
  }

  function setPoint(value, r, c) {
    numToPos.set(value, { row: r, col: c });
    posToNum.set(`${r},${c}`, value);
  }

  return { numToPos, posToNum };
}

function calcHighlights(clickedValue, trend, gridRadius) {
  const maxNumber = (gridRadius * 2 + 1) ** 2;
  const { numToPos, posToNum } = buildGannSpiral(maxNumber);
  const point = numToPos.get(clickedValue);
  const gridSize = gridRadius * 2 + 1;
  const center = Math.floor(gridSize / 2);

  if (!point) {
    return {
      error: `Number ${clickedValue} is outside the current matrix.`,
      clickedValue,
      trend,
      gridRadius,
      maxNumber,
      mainHighlight: [],
      subHighlight: [],
      numToPos,
      posToNum,
    };
  }

  const absPoint = relToAbs(point, center);
  const sector = getSector(absPoint, gridSize);
  const type = getPointType(point);
  const distance = getAxisDistance(absPoint, center, sector);
  const trendMode = trend === "up" ? 1 : 0;
  const ctx = {
    clickedValue,
    trend,
    trendMode,
    gridRadius,
    maxNumber,
    gridSize,
    center,
    posToNum,
    line1: [],
    line2: [],
    drawCalls: [],
    distance,
    debug: {},
  };

  if (type === 2) renderType2(ctx, absPoint, sector, trendMode);
  else renderDiagonal(ctx, absPoint, sector, trendMode);

  return {
    clickedValue,
    trend,
    point,
    absPoint,
    type,
    sector,
    distance,
    trendMode,
    gridRadius,
    maxNumber,
    gridSize,
    center,
    mainHighlight: dedupe(ctx.line1),
    subHighlight: normalizeSegment(dedupe(ctx.line2), point, trend),
    drawCalls: ctx.drawCalls,
    debug: ctx.debug,
    numToPos,
    posToNum,
  };
}

function getValue(posToNum, row, col) {
  return posToNum.get(`${row},${col}`);
}

function trunc(n) {
  return n < 0 ? Math.ceil(n) : Math.floor(n);
}

function dedupe(values) {
  const seen = new Set();
  return values.filter(value => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function ptInRect(rect, p) {
  return p.x >= rect.left && p.x < rect.right && p.y >= rect.top && p.y < rect.bottom;
}

function calcY(line, x) {
  return trunc(x * line.k + line.b);
}

function classifyPointByLine(line, p) {
  const diff = trunc(p.x * line.k + line.b - p.y);
  if (diff === 0) return 0;
  return diff >= 0 ? 2 : 1;
}

function relToAbs(point, center) {
  return { x: point.col + center, y: point.row + center };
}

function absToRel(x, y, center) {
  return { row: y - center, col: x - center };
}

function absValue(ctx, x, y) {
  const rel = absToRel(x, y, ctx.center);
  return getValue(ctx.posToNum, rel.row, rel.col);
}

function getPointType(point) {
  const x = point.col;
  const y = point.row;
  if (x === 0 || y === 0) return 2;

  const dx = Math.abs(x);
  const dy = Math.abs(y);
  if (x < 0 && y > 0 && ((dx === 3 && dy === 5) || (dx === 4 && dy === 7))) return 1;

  const limit = dx > 8 ? dx - 4 : CLASS_TABLE[dx];
  if (dy <= limit) return 2;
  if (dy < 9) return dx <= CLASS_TABLE[dy] ? 2 : 1;
  return dx <= dy - 4 ? 2 : 1;
}

function getSector(absPoint, gridSize) {
  const x = absPoint.x;
  const y = absPoint.y;
  const rect = { left: x * 2, top: y * 2, right: x * 2 + 2, bottom: y * 2 + 2 };
  const testPoint = { x: x * 2 + 1, y: y * 2 + 1 };
  const lineC0 = { k: -1, b: gridSize * 2 };
  const lineD0 = { k: 1, b: 0 };

  if (ptInRect(rect, { x: testPoint.x, y: calcY(lineC0, testPoint.x) })) return 7;
  if (ptInRect(rect, { x: testPoint.x, y: calcY(lineD0, testPoint.x) })) return 6;

  const signC0 = classifyPointByLine(lineC0, testPoint);
  const signD0 = classifyPointByLine(lineD0, testPoint);
  if (signC0 === 2) return signD0 !== 1 ? 2 : 1;
  return signD0 !== 2 ? 4 : 3;
}

function getAxisDistance(absPoint, center, sector) {
  const dx = Math.abs(absPoint.x - center);
  const dy = Math.abs(absPoint.y - center);
  if ([1, 3, 6, 7].includes(sector)) return dx;
  if ([2, 4].includes(sector)) return dy;
  return 0;
}

function getMajorMinor(absPoint, center) {
  const dx = Math.abs(absPoint.x - center);
  const dy = Math.abs(absPoint.y - center);
  return { major: Math.max(dx, dy), minor: Math.min(dx, dy) };
}

function record(ctx, x, y, segment, color) {
  const value = absValue(ctx, x, y);
  if (!value) return false;

  ctx.drawCalls.push({ value, x, y, segment, color });
  if (value === ctx.clickedValue) return true;
  if (segment === "line1") ctx.line1.push(value);
  if (segment === "line2") ctx.line2.push(value);
  return true;
}

function normalizeSegment(values, point, trend) {
  if (trend === "down" && point.row < 0) return values.slice().reverse();
  return values.slice();
}

function renderType2(ctx, absPoint, sector, trendMode) {
  const up = trendMode === 1;
  let x = absPoint.x;
  let y = absPoint.y;
  const d = ctx.distance;
  const c = ctx.center;
  const N = ctx.gridSize;
  const currentColor = up ? "0x99ff33" : "0x9999ff";
  const lineColor = up ? "0x9999ff" : "0x99ff33";

  switch (sector) {
    case 1: {
      const origY = y;
      const targetX = x + d;
      record(ctx, x, y, "current", currentColor);
      if (up) {
        for (let i = 0; i < d * 2; i += 1) record(ctx, ++x, y, "line1", lineColor);
        y = origY - 1;
        x = targetX;
        for (let i = 0, count = origY - c + d; i < count && y >= 0; i += 1, y -= 1) record(ctx, x, y, "line2", lineColor);
      } else {
        for (let i = 0; i < Math.max(0, d * 2 - 1); i += 1) record(ctx, ++x, y, "line1", lineColor);
        y = origY + 1;
        x = targetX;
        for (let i = 0, count = c - origY - 1 + d; i < count && y <= N; i += 1, y += 1) record(ctx, x, y, "line2", lineColor);
      }
      break;
    }
    case 2: {
      const origX = x;
      const targetY = y + d;
      record(ctx, x, y, "current", currentColor);
      if (up) {
        for (let i = 0; i < d * 2; i += 1) record(ctx, x, ++y, "line1", lineColor);
        x = origX;
        y = targetY;
        for (let i = 0, count = d - origX + 1 + c; i < count && x < N; i += 1, x += 1) record(ctx, x, y, "line2", lineColor);
      } else {
        for (let i = 0; i < Math.max(0, d * 2 - 1); i += 1) record(ctx, x, ++y, "line1", lineColor);
        x = origX;
        y = targetY;
        for (let i = 0, count = origX - c + 1 + d; i < count; i += 1, x -= 1) record(ctx, x, y, "line2", lineColor);
      }
      break;
    }
    case 3: {
      const targetX = x - d;
      const origY = y;
      record(ctx, x, y, "current", currentColor);
      if (up) {
        for (let i = 0; i < d * 2 + 1; i += 1) {
          x -= 1;
          if (x < 0) break;
          record(ctx, x, y, "line1", lineColor);
        }
        x = targetX;
        y = origY;
        for (let i = 0, count = c - origY + 1 + d; i < count; i += 1, y += 1) record(ctx, x, y, "line2", lineColor);
      } else {
        for (let i = 0; i < d * 2; i += 1) record(ctx, --x, y, "line1", lineColor);
        x = targetX;
        y = origY;
        for (let i = 0, count = origY - c + 1 + d; i < count; i += 1, y -= 1) record(ctx, x, y, "line2", lineColor);
      }
      break;
    }
    case 4: {
      const targetY = y - d;
      const origX = x;
      record(ctx, x, y, "current", currentColor);
      if (up) {
        for (let i = 0; i < d * 2 + 1; i += 1) {
          y -= 1;
          if (y < 0) break;
          record(ctx, x, y, "line1", lineColor);
        }
        y = targetY;
        x = origX - 1;
        for (let i = 0, count = origX - c + 1 + d; i < count && x >= 0; i += 1, x -= 1) record(ctx, x, y, "line2", lineColor);
      } else {
        for (let i = 0; i < d * 2; i += 1) record(ctx, x, --y, "line1", lineColor);
        x = origX + 1;
        y = targetY;
        for (let i = 0, count = c + d - origX; i < count && x <= N; i += 1, x += 1) record(ctx, x, y, "line2", lineColor);
      }
      break;
    }
    default:
      record(ctx, x, y, "current", currentColor);
  }
}

function renderDiagLabel14614(ctx, absPoint, sector, trendMode, major, minor) {
  const up = trendMode === 1;
  let { x, y } = absPoint;
  let d = ctx.distance;
  const c = ctx.center;
  const N = ctx.gridSize;
  const lineColor = up ? "0x9999ff" : "0x99ff33";
  record(ctx, x, y, "current", up ? "0x99ff33" : "0x9999ff");

  if (up) {
    for (let i = 0, count = major + minor + (sector !== 1 ? 1 : 0); i < count; i += 1) {
      x += 1;
      y -= 1;
      if (N <= x || y < 0) break;
      record(ctx, x, y, "line1", lineColor);
    }
    x = c;
    y = c;
    if (sector === 4) {
      const diff = major - minor;
      x = c + diff;
      y = c + diff;
      d += diff + 1;
    } else if (sector !== 1) d += 1;
    for (let i = 0; i < d; i += 1) record(ctx, --x, --y, "line2", lineColor);
  } else {
    for (let i = 0, count = major - 1 + minor + (sector !== 1 ? 1 : 0); i < count; i += 1) {
      x += 1;
      y -= 1;
      record(ctx, x, y, "line1", lineColor);
    }
    x = c;
    y = c;
    if (sector === 1) {
      const diff = major - minor;
      x = c - diff;
      y = c - diff;
      d += diff - 1;
    }
    for (let i = 0; i < d; i += 1) record(ctx, ++x, ++y, "line2", lineColor);
  }
}

function renderDiagLabel14ba7(ctx, absPoint, sector, trendMode, major, minor) {
  const up = trendMode === 1;
  let { x, y } = absPoint;
  let d = ctx.distance;
  const c = ctx.center;
  const lineColor = up ? "0x9999ff" : "0x99ff33";
  record(ctx, x, y, "current", up ? "0x99ff33" : "0x9999ff");
  for (let i = 0, count = up ? major + 1 + minor : major + minor; i < count; i += 1) record(ctx, --x, --y, "line1", lineColor);

  x = c;
  y = c;
  if (up && sector === 3) {
    const diff = major - minor;
    x = c + diff;
    y = c - diff;
    d += diff;
  }
  if (!up && sector === 4) {
    const diff = major - minor;
    x = c - diff;
    y = c + diff;
    d += diff;
  }
  for (let i = 0; i < d; i += 1) {
    if (up) record(ctx, --x, ++y, "line2", lineColor);
    else record(ctx, ++x, --y, "line2", lineColor);
  }
}

function renderDiagLabel149e7(ctx, absPoint, sector, trendMode, major, minor) {
  const up = trendMode === 1;
  let { x, y } = absPoint;
  let d = ctx.distance;
  const c = ctx.center;
  const lineColor = up ? "0x9999ff" : "0x99ff33";
  record(ctx, x, y, "current", up ? "0x99ff33" : "0x9999ff");

  for (let i = 0, count = (up ? major + minor : major - 1 + minor) + (sector === 2 ? 1 : 0); i < count; i += 1) {
    record(ctx, --x, ++y, "line1", lineColor);
  }
  x = c;
  y = c;
  if (up && sector === 2) {
    const diff = major - minor;
    x = c - diff;
    y = c - diff;
    d += diff;
  }
  if (!up && sector === 3) {
    const diff = major - minor;
    x = c + diff;
    y = c + diff;
    d += diff;
  }
  for (let i = 0; i < d; i += 1) {
    if (up) record(ctx, ++x, ++y, "line2", lineColor);
    else record(ctx, --x, --y, "line2", lineColor);
  }
}

function renderDiagLabel14821(ctx, absPoint, sector, trendMode, major, minor) {
  const up = trendMode === 1;
  let { x, y } = absPoint;
  let d = ctx.distance;
  const c = ctx.center;
  const lineColor = up ? "0x9999ff" : "0x99ff33";
  record(ctx, x, y, "current", up ? "0x99ff33" : "0x9999ff");

  for (let i = 0, count = up ? major + minor : major - 1 + minor; i < count; i += 1) record(ctx, ++x, ++y, "line1", lineColor);
  x = c;
  y = c;
  if (up && sector === 1) {
    const diff = major - minor;
    x = c - diff;
    y = c + diff;
    d += diff;
    for (let i = 0; i < d; i += 1) record(ctx, ++x, --y, "line2", lineColor);
    return;
  }
  if (!up && sector === 2) {
    const diff = major - minor;
    x = c + diff;
    y = c - diff;
    d += diff;
  }
  if (!up) {
    while ((d -= 1) !== 0) record(ctx, --x, ++y, "line2", lineColor);
    return;
  }
  for (let i = 0; i < d; i += 1) record(ctx, ++x, --y, "line2", lineColor);
}

function renderDiagonal(ctx, absPoint, sector, trendMode) {
  const { major, minor } = getMajorMinor(absPoint, ctx.center);
  const { x, y } = absPoint;
  const c = ctx.center;
  ctx.debug.diagonal = { major, minor };

  if (sector === 1) {
    if (c < y) return renderDiagLabel14614(ctx, absPoint, sector, trendMode, major, minor);
    if (y < c) return renderDiagLabel14821(ctx, absPoint, sector, trendMode, major, minor);
  }
  if (sector === 4) {
    if (x < c) return renderDiagLabel14614(ctx, absPoint, sector, trendMode, major, minor);
    if (c < x) return renderDiagLabel14ba7(ctx, absPoint, sector, trendMode, major, minor);
  }
  if (sector === 7) {
    if (x < c) return renderDiagLabel14614(ctx, absPoint, sector, trendMode, major, minor);
    if (c < x) return renderDiagLabel149e7(ctx, absPoint, sector, trendMode, major, minor);
  }
  if (sector === 2) {
    if (c <= x) return renderDiagLabel149e7(ctx, absPoint, sector, trendMode, major, minor);
    return renderDiagLabel14821(ctx, absPoint, sector, trendMode, major, minor);
  }
  if (sector === 6) {
    if (x < c) return renderDiagLabel14821(ctx, absPoint, sector, trendMode, major, minor);
    if (c < x) return renderDiagLabel14ba7(ctx, absPoint, sector, trendMode, major, minor);
  }
  if (sector === 3) {
    if (c <= y) return renderDiagLabel14ba7(ctx, absPoint, sector, trendMode, major, minor);
    return renderDiagLabel149e7(ctx, absPoint, sector, trendMode, major, minor);
  }
  return undefined;
}

function clipLineThroughCenter(slope, center, size) {
  if (!size) return null;
  if (slope === Infinity) return { x1: center, y1: 0, x2: center, y2: size };
  if (slope === 0) return { x1: 0, y1: center, x2: size, y2: center };

  const points = [];
  const pushPoint = (x, y) => {
    const eps = 1e-7;
    if (x < -eps || x > size + eps || y < -eps || y > size + eps) return;
    const px = Math.min(size, Math.max(0, x));
    const py = Math.min(size, Math.max(0, y));
    const key = `${px.toFixed(4)},${py.toFixed(4)}`;
    if (!points.some(p => p.key === key)) points.push({ x: px, y: py, key });
  };

  pushPoint(0, center + slope * (0 - center));
  pushPoint(size, center + slope * (size - center));
  pushPoint(center + (0 - center) / slope, 0);
  pushPoint(center + (size - center) / slope, size);
  if (points.length < 2) return null;

  let best = null;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const dist = (points[i].x - points[j].x) ** 2 + (points[i].y - points[j].y) ** 2;
      if (!best || dist > best.dist) best = { a: points[i], b: points[j], dist };
    }
  }

  return best ? { x1: best.a.x, y1: best.a.y, x2: best.b.x, y2: best.b.y } : null;
}

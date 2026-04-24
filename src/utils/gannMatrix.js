export function generateGannMatrix(base, step, loop) {
  const size = 2 * loop + 1;
  const mat = Array.from({ length: size }, () => Array(size).fill(null));

  const midIndex = Math.floor(size / 2);
  let num = base;
  let x = midIndex;
  let y = midIndex;

  mat[y][x] = num;

  const dirs = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
  ];

  let stepCount = 1;
  let dirIndex = 0;

  while (true) {
    for (let i = 0; i < 2; i++) {
      const [dx, dy] = dirs[dirIndex % 4];

      for (let s = 0; s < stepCount; s++) {
        num += step;
        x += dx;
        y += dy;

        if (x < 0 || y < 0 || x >= size || y >= size) {
          return mat;
        }

        mat[y][x] = num;
      }

      dirIndex++;
    }

    stepCount++;
  }
}

export function getLineCoordsBySlope(k, totalSize, centerPx) {
  if (totalSize === 0) return null;

  const total = totalSize;
  const cp = centerPx;
  const candidates = [
    { x: cp - cp / k, y: 0 },
    { x: cp + (total - cp) / k, y: total },
    { x: 0, y: cp - k * cp },
    { x: total, y: cp + k * (total - cp) },
  ];

  const valid = candidates.filter(p =>
    p.x >= -0.5 && p.x <= total + 0.5 &&
    p.y >= -0.5 && p.y <= total + 0.5
  );

  if (valid.length < 2) return null;

  return {
    x1: valid[0].x,
    y1: valid[0].y,
    x2: valid[valid.length - 1].x,
    y2: valid[valid.length - 1].y,
  };
}

export function findNumberPosition(matrix, target) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      if (matrix[r][c] === target) {
        return { r, c };
      }
    }
  }

  return { r: -1, c: -1 };
}

export function getMainDiagonal(matrix, r, c) {
  const result = [];
  const mainConst = r - c;

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      if (i - j === mainConst) {
        result.push({ r: i, c: j, value: matrix[i][j] });
      }
    }
  }

  return result;
}

export function getCenterAntiDiagonal(matrix) {
  const result = [];
  const center = Math.floor(matrix.length / 2);
  const centerConst = center * 2;

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      if (i + j === centerConst) {
        result.push({ r: i, c: j, value: matrix[i][j] });
      }
    }
  }

  return result;
}

export function getMainDiagonalDown(mainLine, clickedValue) {
  return mainLine.filter(item => item.value < clickedValue);
}

export function getAntiDiagonalDown(antiLine, clickedValue) {
  const result = [];
  const oneIndex = antiLine.findIndex(item => item.value === 1);
  if (oneIndex === -1) return [];

  for (let i = oneIndex - 1; i >= 0; i--) {
    const current = antiLine[i];
    if (current.value < clickedValue) {
      result.push(current);
    } else {
      break;
    }
  }

  return result;
}

export function getAllCenterLines(matrix) {
  const size = matrix.length;
  const center = Math.floor(size / 2);

  const lines = {
    diag1: [],
    diag2: [],
    vertical: [],
    horizontal: [],
    horse21: [],
    horse21_m: [],
    horse12: [],
    horse12_m: [],
  };

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const rowDiff = i - center;
      const colDiff = j - center;

      if (i === j) lines.diag1.push({ r: i, c: j, value: matrix[i][j] });
      if (i + j === center * 2) lines.diag2.push({ r: i, c: j, value: matrix[i][j] });
      if (j === center) lines.vertical.push({ r: i, c: j, value: matrix[i][j] });
      if (i === center) lines.horizontal.push({ r: i, c: j, value: matrix[i][j] });
      if (rowDiff === 2 * colDiff) lines.horse21.push({ r: i, c: j, value: matrix[i][j] });
      if (rowDiff === -2 * colDiff) lines.horse21_m.push({ r: i, c: j, value: matrix[i][j] });
      if (colDiff === 2 * rowDiff) lines.horse12.push({ r: i, c: j, value: matrix[i][j] });
      if (colDiff === -2 * rowDiff) lines.horse12_m.push({ r: i, c: j, value: matrix[i][j] });
    }
  }

  Object.keys(lines).forEach(key => {
    lines[key].sort((a, b) => a.r - b.r || a.c - b.c);
  });

  return lines;
}

export function findBelongLine(lines, clickedValue) {
  for (const key in lines) {
    const exists = lines[key].some(item => item.value === clickedValue);
    if (exists) return key;
  }

  return null;
}

export function getCrossLines(matrix, clickedValue, r, c) {
  const size = matrix.length;
  const center = Math.floor(size / 2);
  const dr = r - center;
  const dc = c - center;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  let mainLine = [];
  let crossLine = [];
  const k = absDc === 0 ? 999 : absDr / absDc;
  const isCoreSpecial = (absDr + absDc <= 4) && (absDr !== 0 && absDc !== 0);

  if (!isCoreSpecial && k >= 1.75) {
    for (let i = 0; i < size; i++) mainLine.push({ r: i, c, value: matrix[i][c] });
    for (let j = 0; j < size; j++) crossLine.push({ r: center, c: j, value: matrix[center][j] });
    console.log("进入垂直主轴逻辑");
  } else if (!isCoreSpecial && k <= 0.57) {
    for (let j = 0; j < size; j++) mainLine.push({ r, c: j, value: matrix[r][j] });
    for (let i = 0; i < size; i++) crossLine.push({ r: i, c: center, value: matrix[i][center] });
    console.log("进入水平主轴逻辑");
  } else {
    console.log("进入对角轴逻辑");
    const isMainDiag = (dr * dc > 0);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (isMainDiag) {
          if (i - j === r - c) mainLine.push({ r: i, c: j, value: matrix[i][j] });
          if (i + j === center * 2) crossLine.push({ r: i, c: j, value: matrix[i][j] });
        } else {
          if (i + j === r + c) mainLine.push({ r: i, c: j, value: matrix[i][j] });
          if (i - j === 0) crossLine.push({ r: i, c: j, value: matrix[i][j] });
        }
      }
    }
  }

  mainLine.sort((a, b) => a.r - b.r || a.c - b.c);
  crossLine.sort((a, b) => a.r - b.r || a.c - b.c);

  return { mainLine, crossLine };
}

export function getCrossLineDown(matrix, crossLinePoints, r, c) {
  const size = matrix.length;
  const center = Math.floor(size / 2);
  const originIdx = crossLinePoints.findIndex(x => x.value === 1);
  if (originIdx === -1) return [];

  const L = Math.max(Math.abs(r - center), Math.abs(c - center));
  if (L === 0) return [];

  const candidates = crossLinePoints.filter(p =>
    Math.max(Math.abs(p.r - center), Math.abs(p.c - center)) === L
  );

  if (candidates.length === 0) return [];

  const clickedValue = matrix[r][c];
  const isHorizontalCross = crossLinePoints.every(point => point.r === center);
  const isVerticalCross = crossLinePoints.every(point => point.c === center);

  if (isHorizontalCross && r !== center) {
    const startCol = center + Math.sign(r - center) * L;
    const endCol = c;
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    console.log(`[下降模式] 点击(${r},${c})[${clickedValue}] -> 横向副线区间:(${center},${minCol}) 到 (${center},${maxCol})`);

    return crossLinePoints.filter(point =>
      point.r === center &&
      point.c >= minCol &&
      point.c <= maxCol
    );
  }

  if (isVerticalCross && c !== center) {
    const startRow = center + Math.sign(c - center) * L;
    const endRow = r;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    console.log(`[下降模式] 点击(${r},${c})[${clickedValue}] -> 纵向副线区间:(${minRow},${center}) 到 (${maxRow},${center})`);

    return crossLinePoints.filter(point =>
      point.c === center &&
      point.r >= minRow &&
      point.r <= maxRow
    );
  }

  let projPoint = candidates.find(p => (p.r === r || p.c === c) && p.value < clickedValue);

  if (!projPoint) projPoint = candidates.find(p => p.r === r || p.c === c);
  if (!projPoint) projPoint = candidates.find(p => p.value < clickedValue);
  if (!projPoint) projPoint = candidates[0];

  const projIdx = crossLinePoints.findIndex(x => x.r === projPoint.r && x.c === projPoint.c);
  if (projIdx === -1) return [];

  let startIdx = Math.min(projIdx, originIdx);
  let endIdx = Math.max(projIdx, originIdx);
  const isBeforeCenter = (r < center || c < center);

  if (isBeforeCenter) {
    if (startIdx === originIdx) startIdx++;
    if (endIdx === originIdx) endIdx--;
  }

  console.log(`[下降模式] 点击(${r},${c})[${clickedValue}] -> 映射副坐标:(${projPoint.r},${projPoint.c})[${projPoint.value}]`);

  return crossLinePoints.slice(
    Math.max(0, startIdx),
    Math.min(crossLinePoints.length, endIdx + 1)
  );
}

export function getMainLineUp(mainLine, clickedValue) {
  const originIndex = mainLine.findIndex(x => x.value === 1);
  const clickIndex = mainLine.findIndex(x => x.value === clickedValue);

  if (originIndex === -1 || clickIndex === -1) return [];

  const distance = Math.abs(clickIndex - originIndex);
  const leftBound = originIndex - distance;
  const rightBound = originIndex + distance;
  let start;
  let end;

  if (clickIndex < originIndex) {
    start = leftBound + 1;
    end = rightBound;
  } else {
    start = leftBound - 1;
    end = rightBound - 1;
  }

  return mainLine.slice(Math.max(0, start), Math.min(mainLine.length, end + 1));
}

export function getCrossLineUp(crossLinePoints, r, c) {
  if (!Array.isArray(crossLinePoints) || crossLinePoints.length === 0) return [];

  const originIndex = crossLinePoints.findIndex(x => x.value === 1);
  if (originIndex === -1) return [];

  let start;
  let end;

  if (r < c) {
    start = originIndex + 1;
    end = c;
    console.log("start end===>", start, end);
  } else if (r > c) {
    const diff = r - originIndex;
    start = originIndex - diff - 1;
    end = originIndex;
  } else if (r < originIndex) {
    start = r;
    end = originIndex - 1;
  } else if (r > originIndex) {
    const diff = r - originIndex;
    start = originIndex;
    end = originIndex + diff;
  } else {
    return [crossLinePoints[originIndex]];
  }

  return crossLinePoints.slice(
    Math.max(0, start),
    Math.min(crossLinePoints.length, end + 1)
  );
}

export function getPointsFromMatrix(matrix, values) {
  const result = [];
  const size = matrix.length;

  values.forEach(val => {
    let found = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c] === val) {
          result.push({ r, c, value: val });
          found = true;
          break;
        }
      }
      if (found) break;
    }
  });

  return result;
}

export function convertToPointArray(matrix, valueArray) {
  const size = matrix.length;
  const valToPos = {};

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      valToPos[matrix[r][c]] = { r, c };
    }
  }

  return valueArray.map(v => {
    const pos = valToPos[v];
    return pos ? { r: pos.r, c: pos.c, value: v } : null;
  }).filter(item => item !== null);
}

export function calculateClickTrend(matrix, r, c, trendDirection) {
  const clickedValue = matrix[r][c];
  const { mainLine, crossLine } = getCrossLines(matrix, clickedValue, r, c);
  const mainLinePoints = convertToPointArray(matrix, mainLine.map(x => x.value || x));
  const crossLinePoints = convertToPointArray(matrix, crossLine.map(x => x.value || x));
  let trendMain = [];
  let trendCross = [];

  if (trendDirection === "down") {
    trendMain = mainLine.filter(x => x.value < clickedValue);
    trendCross = getCrossLineDown(matrix, crossLinePoints, r, c);
  }

  if (trendDirection === "up") {
    trendMain = getMainLineUp(mainLine, clickedValue);
    trendCross = getCrossLineUp(crossLinePoints, r, c);
  }

  return {
    clickedValue,
    mainLine,
    crossLine,
    mainLinePoints,
    crossLinePoints,
    trendMain,
    trendCross,
    trendCells: [...trendMain, ...trendCross],
  };
}

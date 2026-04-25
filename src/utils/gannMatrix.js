/**
 * 以中心点为起点，按螺旋顺序生成 Gann 九方图矩阵。
 */
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

/**
 * 根据斜率计算一条穿过矩阵中心的辅助线在 SVG 画布中的端点。
 */
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

/**
 * 在矩阵中查找某个数值对应的坐标。
 */
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

/**
 * 取出点击点所在的主对角线。
 */
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

/**
 * 取出穿过矩阵中心的副对角线。
 */
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

/**
 * 下降模式下，主对角线只保留比点击值更小的点。
 */
export function getMainDiagonalDown(mainLine, clickedValue) {
  return mainLine.filter(item => item.value < clickedValue);
}

/**
 * 下降模式下，从中心点向外截取副对角线中小于点击值的点。
 */
export function getAntiDiagonalDown(antiLine, clickedValue) {
  const result = [];
  const oneIndex = getLineCenterIndex(antiLine);
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

/**
 * 收集穿过矩阵中心的主要参考线，供调试和归属判断使用。
 */
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

/**
 * 判断某个值落在哪条中心参考线上。
 */
export function findBelongLine(lines, clickedValue) {
  for (const key in lines) {
    const exists = lines[key].some(item => item.value === clickedValue);
    if (exists) return key;
  }

  return null;
}

/**
 * 根据点击点的坐标关系，为当前点选出主线和副线。
 * 这里同时处理普通对角线、十字线以及 2:1 骑士线附近的特殊修正。
 */
export function getCrossLines(matrix, clickedValue, r, c) {
  const size = matrix.length;
  const center = Math.floor(size / 2);
  const dr = r - center;
  const dc = c - center;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  let mainLine = [];
  let crossLine = [];
  const touchesHorseAxis = mainLineTouchesOuterHorse21(matrix, r, c);

  if (touchesHorseAxis && absDr !== absDc) {
    if (absDr > absDc) {
      for (let i = 0; i < size; i++) mainLine.push({ r: i, c, value: matrix[i][c] });
      for (let j = 0; j < size; j++) crossLine.push({ r: center, c: j, value: matrix[center][j] });
      console.log("进入2:1骑士线修正：垂直主轴逻辑");
    } else {
      for (let j = 0; j < size; j++) mainLine.push({ r, c: j, value: matrix[r][j] });
      for (let i = 0; i < size; i++) crossLine.push({ r: i, c: center, value: matrix[i][center] });
      console.log("进入2:1骑士线修正：水平主轴逻辑");
    }

    return { mainLine, crossLine };
  }

  const isCoreSpecial = (absDr + absDc <= 4) && (absDr !== 0 && absDc !== 0);
  const layer = Math.max(absDr, absDc);
  const minorAxis = Math.min(absDr, absDc);
  const isLeftBottom = dr > 0 && dc < 0;
  const isOuterCrossSpecial =
    (layer === 5 && minorAxis === 3 && !isLeftBottom) ||
    (layer === 7 && minorAxis === 4 && !(isLeftBottom && absDr > absDc));

  if (!isCoreSpecial && isOuterCrossSpecial) {
    if (absDr > absDc) {
      for (let i = 0; i < size; i++) mainLine.push({ r: i, c, value: matrix[i][c] });
      for (let j = 0; j < size; j++) crossLine.push({ r: center, c: j, value: matrix[center][j] });
      console.log("进入外圈十字线修正：垂直主轴逻辑");
    } else {
      for (let j = 0; j < size; j++) mainLine.push({ r, c: j, value: matrix[r][j] });
      for (let i = 0; i < size; i++) crossLine.push({ r: i, c: center, value: matrix[i][center] });
      console.log("进入外圈十字线修正：水平主轴逻辑");
    }

    return { mainLine, crossLine };
  }

  const k = absDc === 0 ? 999 : absDr / absDc;

  if (!isCoreSpecial && k > 1.75) {
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

/**
 * 计算一个点位于中心外第几圈。
 */
function getLayer(r, c, center) {
  return Math.max(Math.abs(r - center), Math.abs(c - center));
}

/**
 * 对于穿过矩阵中心且已排序的线，中心点总在中间索引。
 */
function getLineCenterIndex(points) {
  return points.length ? Math.floor(points.length / 2) : -1;
}

/**
 * 判断某个点是否位于 2:1 或 1:2 骑士线族上。
 */
function isHorse21Point(r, c, center) {
  const rowDiff = r - center;
  const colDiff = c - center;

  return (
    rowDiff === 2 * colDiff ||
    rowDiff === -2 * colDiff ||
    colDiff === 2 * rowDiff ||
    colDiff === -2 * rowDiff
  );
}

/**
 * 收集矩阵中所有骑士线上的点，便于做特殊规则修正。
 */
function getHorse21Points(matrix) {
  const center = Math.floor(matrix.length / 2);
  const points = [];

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      if (isHorse21Point(r, c, center)) {
        points.push({ r, c, value: matrix[r][c] });
      }
    }
  }

  return points;
}

/**
 * 判断当前主线在穿过中心前，是否会先碰到内圈骑士线点。
 */
function mainLineTouchesOuterHorse21(matrix, r, c) {
  const center = Math.floor(matrix.length / 2);
  const clickLayer = getLayer(r, c, center);
  const absRowDiff = Math.abs(r - center);
  const absColDiff = Math.abs(c - center);
  const majorDiff = Math.max(absRowDiff, absColDiff);
  const minorDiff = Math.min(absRowDiff, absColDiff);

  if (clickLayer <= 2) return false;
  if (minorDiff === 0 || majorDiff <= minorDiff * 2) return false;

  const horsePointSet = new Set(
    getHorse21Points(matrix)
      .filter(point => getLayer(point.r, point.c, center) <= 2)
      .map(point => `${point.r}:${point.c}`)
  );

  if (r !== center) {
    const rowStep = Math.sign(r - center);
    for (let row = center + rowStep; row !== r + rowStep; row += rowStep) {
      if (horsePointSet.has(`${row}:${c}`)) return true;
    }
  }

  if (c !== center) {
    const colStep = Math.sign(c - center);
    for (let col = center + colStep; col !== c + colStep; col += colStep) {
      if (horsePointSet.has(`${r}:${col}`)) return true;
    }
  }

  return false;
}

/**
 * 下降模式下，如果主线触发了骑士线特例，则优先使用修正后的副线截取结果。
 */
function getAxisHorseAdjustedCrossLine(matrix, crossLinePoints, r, c, clickedValue) {
  const center = Math.floor(matrix.length / 2);
  const L = getLayer(r, c, center);

  if (!mainLineTouchesOuterHorse21(matrix, r, c)) return null;

  const isHorizontalCross = crossLinePoints.every(point => point.r === center);
  const isVerticalCross = crossLinePoints.every(point => point.c === center);

  if (isHorizontalCross && r !== center) {
    const startCol = center + Math.sign(r - center) * L;
    const endCol = c;
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    console.log(`[下降模式] 2:1骑士线修正 -> 横向副线区间:(${center},${minCol}) 到 (${center},${maxCol})`);

    return crossLinePoints.filter(point =>
      point.r === center &&
      point.c >= minCol &&
      point.c <= maxCol &&
      point.value < clickedValue
    );
  }

  if (isVerticalCross && c !== center) {
    const startRow = center - Math.sign(c - center) * L;
    const endRow = r;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    console.log(`[下降模式] 2:1骑士线修正 -> 纵向副线区间:(${minRow},${center}) 到 (${maxRow},${center})`);

    return crossLinePoints.filter(point =>
      point.c === center &&
      point.r >= minRow &&
      point.r <= maxRow &&
      point.value < clickedValue
    );
  }

  return null;
}

/**
 * 给下降模式计算副线的目标方向和目标端点。
 * 返回的是围绕中心点需要截取到哪一侧。
 */
function getCrossLineDirectionTarget(matrix, crossLinePoints, r, c) {
  const center = Math.floor(matrix.length / 2);
  const originIdx = getLineCenterIndex(crossLinePoints);
  const L = getLayer(r, c, center);
  const isHorizontalCross = crossLinePoints.every(point => point.r === center);
  const isVerticalCross = crossLinePoints.every(point => point.c === center);
  const isMainDiagonalCross = crossLinePoints.every(point => point.r - point.c === 0);
  const isAntiDiagonalCross = crossLinePoints.every(point => point.r + point.c === center * 2);

  if (originIdx === -1 || L === 0) return null;

  if (isHorizontalCross && r !== center) {
    const targetCol = c === center
      ? center + Math.sign(r - center) * L
      : c;
    const targetPoint = crossLinePoints.find(point =>
      point.r === center &&
      point.c === targetCol
    );

    return targetPoint
      ? { targetIdx: crossLinePoints.indexOf(targetPoint), shouldExcludeCenter: false }
      : null;
  }

  if (isVerticalCross && c !== center) {
    const targetRow = center - Math.sign(c - center) * L;
    const targetPoint = crossLinePoints.find(point =>
      point.r === targetRow &&
      point.c === center
    );

    return targetPoint
      ? { targetIdx: crossLinePoints.indexOf(targetPoint), shouldExcludeCenter: false }
      : null;
  }

  if ((isMainDiagonalCross || isAntiDiagonalCross) && c !== center) {
    const rowDistance = Math.abs(r - center);
    const colDistance = Math.abs(c - center);
    const distance = Math.max(rowDistance, colDistance);
    const isFlatHorseSide = distance > 2 && colDistance >= rowDistance * 2;
    const direction = isFlatHorseSide
      ? Math.sign(c - center)
      : (isMainDiagonalCross ? Math.sign(r - center) : -Math.sign(c - center));
    const shouldExcludeCenter = isMainDiagonalCross
      ? rowDistance > colDistance
      : colDistance > rowDistance;

    return {
      targetIdx: originIdx + direction * distance,
      shouldExcludeCenter,
    };
  }

  return null;
}

/**
 * 以中心点为基准，从副线上切出一段连续区间。
 */
function sliceCrossLineFromCenter(crossLinePoints, targetIdx, shouldExcludeCenter) {
  const originIdx = getLineCenterIndex(crossLinePoints);
  const startIdx = Math.min(originIdx, targetIdx) + (shouldExcludeCenter && targetIdx > originIdx ? 1 : 0);
  const endIdx = Math.max(originIdx, targetIdx) - (shouldExcludeCenter && targetIdx < originIdx ? 1 : 0);
  const points = crossLinePoints.slice(
    Math.max(0, startIdx),
    Math.min(crossLinePoints.length, endIdx + 1)
  );

  return targetIdx >= originIdx ? points : points.reverse();
}

/**
 * 先把下降模式的副线边界算出来，供上升模式镜像复用。
 */
function getCrossLineDownBounds(matrix, crossLinePoints, r, c) {
  const center = Math.floor(matrix.length / 2);
  const originIdx = getLineCenterIndex(crossLinePoints);
  const L = getLayer(r, c, center);
  const isHorizontalCross = crossLinePoints.every(point => point.r === center);
  const isVerticalCross = crossLinePoints.every(point => point.c === center);
  const directionTarget = getCrossLineDirectionTarget(matrix, crossLinePoints, r, c);

  if (originIdx === -1 || L === 0) return null;

  if (isHorizontalCross && r !== center) {
    const startCol = center + Math.sign(r - center) * L;
    const endCol = c;

    return {
      startIdx: Math.min(startCol, endCol),
      endIdx: Math.max(startCol, endCol),
      excludeOriginOnUp: c !== center,
    };
  }

  if (isVerticalCross && c !== center) {
    const startRow = center - Math.sign(c - center) * L;
    const endRow = r;

    return {
      startIdx: Math.min(startRow, endRow),
      endIdx: Math.max(startRow, endRow),
      excludeOriginOnUp: r !== center,
    };
  }

  if (directionTarget) {
    return {
      startIdx: Math.min(originIdx, directionTarget.targetIdx),
      endIdx: Math.max(originIdx, directionTarget.targetIdx),
      shouldExcludeCenter: directionTarget.shouldExcludeCenter,
    };
  }

  return null;
}

/**
 * 根据下降模式的边界，推导上升模式下镜像后的副线区间。
 */
function getCrossLineUpFromDownBounds(crossLinePoints, downBounds) {
  const originIdx = getLineCenterIndex(crossLinePoints);
  if (originIdx === -1 || !downBounds) return [];

  const leftDistance = Math.max(0, originIdx - downBounds.startIdx);
  const rightDistance = Math.max(0, downBounds.endIdx - originIdx);
  const downSign = leftDistance > rightDistance ? -1 : 1;
  const farDistance = Math.max(leftDistance, rightDistance);
  const nearIdx = originIdx + downSign;
  const mirrorFarIdx = originIdx - downSign * farDistance;
  const startIdx = Math.max(0, Math.min(nearIdx, mirrorFarIdx));
  const endIdx = Math.min(crossLinePoints.length - 1, Math.max(nearIdx, mirrorFarIdx));
  const result = [];

  for (let idx = startIdx; idx <= endIdx; idx++) {
    if (!downBounds.excludeOriginOnUp || idx !== originIdx) {
      result.push(crossLinePoints[idx]);
    }
  }

  return result;
}

/**
 * 把点击点投影到当前副线上，便于处理无法直接落在线上的特殊情况。
 */
function getCrossLineProjectionIndex(matrix, crossLinePoints, r, c) {
  const center = Math.floor(matrix.length / 2);
  const isHorizontalCross = crossLinePoints.every(point => point.r === center);
  const isVerticalCross = crossLinePoints.every(point => point.c === center);
  const isMainDiagonalCross = crossLinePoints.every(point => point.r - point.c === 0);
  const isAntiDiagonalCross = crossLinePoints.every(point => point.r + point.c === center * 2);

  let projectionPoint = null;

  if (isHorizontalCross) {
    projectionPoint = crossLinePoints.find(point => point.c === c);
  } else if (isVerticalCross) {
    projectionPoint = crossLinePoints.find(point => point.r === r);
  } else if (isMainDiagonalCross || isAntiDiagonalCross) {
    const clickIsOnCrossLine = crossLinePoints.some(point => point.r === r && point.c === c);
    if (clickIsOnCrossLine) {
      return getLineCenterIndex(crossLinePoints);
    }

    const targetLayer = getLayer(r, c, center);
    projectionPoint = crossLinePoints.find(point =>
      getLayer(point.r, point.c, center) === targetLayer &&
      (point.r === r || point.c === c)
    );
  }

  return projectionPoint ? crossLinePoints.indexOf(projectionPoint) : -1;
}

/**
 * 计算下降模式的趋势副线。
 * 核心规则是围绕中心向点击点所在方向截取，并保留比点击值更小的点。
 */
export function getCrossLineDown(matrix, crossLinePoints, r, c) {
  const size = matrix.length;
  const center = Math.floor(size / 2);
  const originIdx = getLineCenterIndex(crossLinePoints);
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
  const horseAdjustedCrossLine = getAxisHorseAdjustedCrossLine(matrix, crossLinePoints, r, c, clickedValue);

  if (horseAdjustedCrossLine) {
    return horseAdjustedCrossLine;
  }

  if (isHorizontalCross && r !== center) {
    const startCol = center + Math.sign(r - center) * L;
    const endCol = c;
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    console.log(`[下降模式] 点击(${r},${c})[${clickedValue}] -> 横向副线区间:(${center},${minCol}) 到 (${center},${maxCol})`);

    return crossLinePoints.filter(point =>
      point.r === center &&
      point.c >= minCol &&
      point.c <= maxCol &&
      point.value < clickedValue
    );
  }

  if (isVerticalCross && c !== center) {
    const startRow = center - Math.sign(c - center) * L;
    const endRow = r;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    console.log(`[下降模式] 点击(${r},${c})[${clickedValue}] -> 纵向副线区间:(${minRow},${center}) 到 (${maxRow},${center})`);

    return crossLinePoints.filter(point =>
      point.c === center &&
      point.r >= minRow &&
      point.r <= maxRow &&
      point.value < clickedValue
    );
  }

  const directionTarget = getCrossLineDirectionTarget(matrix, crossLinePoints, r, c);

  if (directionTarget) {
    const orderedPoints = sliceCrossLineFromCenter(
      crossLinePoints,
      directionTarget.targetIdx,
      directionTarget.shouldExcludeCenter
    );

    console.log(`[下降模式] 点击(${r},${c})[${clickedValue}] -> 副线方向: ${originIdx} 到 ${directionTarget.targetIdx}`);

    return orderedPoints.filter(point => point.value < clickedValue);
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

/**
 * 计算上升模式的趋势主线。
 * 从点击点沿主线朝远离中心的一侧截取，直到碰到第一个更大的点。
 */
export function getMainLineUp(matrix, mainLine, clickedValue) {
  const center = Math.floor(matrix.length / 2);
  const clickIndex = mainLine.findIndex(x => x.value === clickedValue);

  if (clickIndex === -1) return [];

  const originIndex = mainLine.reduce((bestIndex, point, index) => {
    const bestPoint = mainLine[bestIndex];
    const pointLayer = getLayer(point.r, point.c, center);
    const bestLayer = getLayer(bestPoint.r, bestPoint.c, center);

    if (pointLayer !== bestLayer) {
      return pointLayer < bestLayer ? index : bestIndex;
    }

    return Math.abs(index - clickIndex) > Math.abs(bestIndex - clickIndex)
      ? index
      : bestIndex;
  }, 0);

  const step = clickIndex < originIndex ? 1 : -1;
  const result = [];

  for (
    let index = clickIndex + step;
    index >= 0 && index < mainLine.length;
    index += step
  ) {
    const point = mainLine[index];
    result.push(point);

    if (point.value > clickedValue) {
      break;
    }
  }

  return result;
}

/**
 * 计算上升模式的趋势副线。
 * 方向完全依赖矩阵坐标关系，遇到横线、竖线和对角线会分别按对应规则截取。
 */
export function getCrossLineUp(matrix, crossLinePoints, r, c) {
  if (!Array.isArray(crossLinePoints) || crossLinePoints.length === 0) return [];

  const originIndex = getLineCenterIndex(crossLinePoints);
  if (originIndex === -1) return [];

  const center = Math.floor(matrix.length / 2);
  const L = getLayer(r, c, center);
  const isHorizontalCross = crossLinePoints.every(point => point.r === center);
  const isVerticalCross = crossLinePoints.every(point => point.c === center);
  const isMainDiagonalCross = crossLinePoints.every(point => point.r - point.c === 0);
  const isAntiDiagonalCross = crossLinePoints.every(point => point.r + point.c === center * 2);

  if ((isMainDiagonalCross || isAntiDiagonalCross) && c !== center) {
    const rowDistance = Math.abs(r - center);
    const colDistance = Math.abs(c - center);
    const clickedValue = matrix[r][c];
    const direction = Math.sign(c - center);
    let targetIdx = originIndex + direction * L;

    targetIdx = Math.max(0, Math.min(crossLinePoints.length - 1, targetIdx));

    while (
      targetIdx + direction >= 0 &&
      targetIdx + direction < crossLinePoints.length &&
      crossLinePoints[targetIdx].value <= clickedValue
    ) {
      targetIdx += direction;
    }

    const shouldExcludeCenter = isMainDiagonalCross
      ? colDistance > rowDistance
      : rowDistance > colDistance;
    const startIdx = Math.min(originIndex, targetIdx) + (shouldExcludeCenter && targetIdx > originIndex ? 1 : 0);
    const endIdx = Math.max(originIndex, targetIdx) - (shouldExcludeCenter && targetIdx < originIndex ? 1 : 0);

    return crossLinePoints.slice(
      Math.max(0, startIdx),
      Math.min(crossLinePoints.length, endIdx + 1)
    );
  }

  if (isHorizontalCross && r !== center) {
    const clickedValue = matrix[r][c];
    const nearIdx = c;
    const direction = -Math.sign(r - center);
    let targetIdx = nearIdx;

    targetIdx = Math.max(0, Math.min(crossLinePoints.length - 1, targetIdx));

    while (
      targetIdx + direction >= 0 &&
      targetIdx + direction < crossLinePoints.length &&
      crossLinePoints[targetIdx].value <= clickedValue
    ) {
      targetIdx += direction;
    }

    const startIdx = Math.min(nearIdx, targetIdx);
    const endIdx = Math.max(nearIdx, targetIdx);

    return crossLinePoints.slice(
      Math.max(0, startIdx),
      Math.min(crossLinePoints.length, endIdx + 1)
    );
  }

  if (isVerticalCross && c !== center) {
    const clickedValue = matrix[r][c];
    const nearIdx = r;
    const direction = Math.sign(c - center);
    let targetIdx = nearIdx;

    targetIdx = Math.max(0, Math.min(crossLinePoints.length - 1, targetIdx));

    while (
      targetIdx + direction >= 0 &&
      targetIdx + direction < crossLinePoints.length &&
      crossLinePoints[targetIdx].value <= clickedValue
    ) {
      targetIdx += direction;
    }

    const startIdx = Math.min(nearIdx, targetIdx);
    const endIdx = Math.max(nearIdx, targetIdx);

    return crossLinePoints.slice(
      Math.max(0, startIdx),
      Math.min(crossLinePoints.length, endIdx + 1)
    );
  }

  const downBounds = getCrossLineDownBounds(matrix, crossLinePoints, r, c);
  const projectionIdx = getCrossLineProjectionIndex(matrix, crossLinePoints, r, c);

  if (projectionIdx !== -1 && downBounds) {
    const leftDistance = Math.max(0, originIndex - downBounds.startIdx);
    const rightDistance = Math.max(0, downBounds.endIdx - originIndex);
    const downSign = leftDistance > rightDistance ? -1 : 1;
    const farDistance = Math.max(leftDistance, rightDistance);
    const targetIdx = originIndex - downSign * farDistance;
    const startIdx = Math.max(0, Math.min(projectionIdx, targetIdx));
    const endIdx = Math.min(crossLinePoints.length - 1, Math.max(projectionIdx, targetIdx));

    return crossLinePoints.slice(startIdx, endIdx + 1);
  }

  const orderedPoints = getCrossLineUpFromDownBounds(crossLinePoints, downBounds);

  console.log(`[上升模式] 点击(${r},${c})[${matrix[r][c]}] -> 反向副线区间`);

  return orderedPoints;
}

/**
 * 把一组数值重新映射回矩阵坐标点。
 */
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

/**
 * 把数值数组转换成带坐标的点数组，方便前端直接高亮。
 */
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

/**
 * 点击矩阵后的统一入口。
 * 返回主线、副线以及最终用于高亮的趋势点集合。
 */
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
    trendMain = getMainLineUp(matrix, mainLine, clickedValue);
    trendCross = getCrossLineUp(matrix, crossLinePoints, r, c);
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

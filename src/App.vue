<template>
  <div class="app-shell">
    <AppHero />

    <div class="workspace-grid">
      <ControlPanel
        :form="form"
        :display-options="displayOptions"
        v-model:search-number="searchNumber"
        :selected-value-label="selectedValueLabel"
        :highlight-label="highlightLabel"
        @generate="generateMatrix"
        @highlight="highlightNumber"
      />

      <MatrixBoard
        :matrix="matrix"
        :form="form"
        :cell-size="cellSize"
        :center-px="centerPx"
        :total-size="totalSize"
        :horse-line-coords="horseLineCoords"
        :horse-line-flat-coords="horseLineFlatCoords"
        :mid="mid"
        :mode-enabled="form.modeEnabled"
        :trend-palette="trendPalette"
        :selected-cell="selectedCell"
        :highlight-pos="highlightPos"
        :trend-cells="trendCells"
        :main-points="lastTrendResult?.trendMain || []"
        :cross-points="lastTrendResult?.trendCross || []"
        :get-cell-style="getCellStyle"
        :get-cell-class="getCellClass"
        @cell-click="handleCellClick"
      />
    </div>

    <BacktestPanel
      :market-form="marketForm"
      :selected-value-label="selectedValueLabel"
      :chart-levels="projectedLevels"
      v-model:market="marketForm.market"
      v-model:stock-symbol="marketForm.symbol"
      v-model:trend-direction="form.trendDirection"
      @price-select="handleMarketPriceSelect"
      @price-project="handleProjectPrice"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import AppHero from "./components/AppHero.vue";
import BacktestPanel from "./components/BacktestPanel.vue";
import ControlPanel from "./components/ControlPanel.vue";
import MatrixBoard from "./components/MatrixBoard.vue";
import { buildBacktestLevels } from "./utils/marketBacktest";
import {
  calculateClickTrend,
  findNumberPosition,
  generateGannMatrix,
  getLineCoordsBySlope,
} from "./utils/gannMatrix";

function getInitialCellScale() {
  return 60;
}

/**
 * 页面上的核心配置项。
 * 统一放在一个 reactive 对象里，便于后续扩展和保存配置。
 */
const form = reactive({
  base: 1,
  step: 1,
  loop: 9,
  cellScale: getInitialCellScale(),
  lineOpacity: 60,
  fontScale: 100,
  showDiagonal: true,
  showCross: true,
  modeEnabled: true,
  trendDirection: "down",
  showHorseLine: true,
  showHorseLineFlat: true,
  showCoords: false,
});

const matrix = ref([]);
const selectedCell = ref(null);
const trendCells = ref([]);
const lastTrendResult = ref(null);
const searchNumber = ref(null);
const highlightPos = ref({ r: -1, c: -1 });
const BOARD_REFERENCE_SIZE = 1040;
const MIN_CELL_SIZE = 20;
const marketForm = reactive({
  market: "us",
  symbol: "AAPL",
  anchorPrice: null,
  priceUnit: 1,
  chartHeight: 1200,
});

const cellSize = computed(() => {
  if (!matrix.value.length) return MIN_CELL_SIZE;

  const autoSize = Math.floor(BOARD_REFERENCE_SIZE / matrix.value.length);
  const baseSize = Math.max(autoSize, MIN_CELL_SIZE);
  const size = Math.floor(baseSize * (form.cellScale / 100));

  return Math.max(MIN_CELL_SIZE, size);
});

/**
 * 图层开关的展示配置。
 * 用配置驱动模板，避免多个重复的表单片段。
 */
const displayOptions = [
  { key: "showDiagonal", label: "角线", description: "显示两条中心对角线。" },
  { key: "showCross", label: "十字线", description: "显示中心横轴与竖轴。" },
  { key: "showHorseLine", label: "2:1 骑士线", description: "显示较陡的骑士辅助线。" },
  { key: "showHorseLineFlat", label: "1:2 骑士线", description: "显示较平的骑士辅助线。" },
  { key: "showCoords", label: "坐标点", description: "显示或隐藏每个格子的坐标文本。" },
];

/**
 * 根据趋势方向切换选中点和趋势点的颜色。
 * 上升沿用当前配色，下降时反转两者的高亮颜色。
 */
const trendPalette = computed(() => {
  if (form.trendDirection === "down") {
    return {
      selected: "#ff8e8e",
      trend: "#2dff8e",
    };
  }

  return {
    selected: "#2dff8e",
    trend: "#ff8e8e",
  };
});

/** 矩阵绘制区域的总像素宽高。 */
const totalSize = computed(() => matrix.value.length * cellSize.value);
/** 矩阵中心点在 SVG 中的像素位置。 */
const centerPx = computed(() => totalSize.value / 2);
/** 当前矩阵中心的行列下标。 */
const mid = computed(() => Math.floor(matrix.value.length / 2));
/** 2:1 骑士线在 SVG 上的坐标。 */
const horseLineCoords = computed(() => getLineCoordsBySlope(2, totalSize.value, centerPx.value));
/** 1:2 骑士线在 SVG 上的坐标。 */
const horseLineFlatCoords = computed(() => getLineCoordsBySlope(0.5, totalSize.value, centerPx.value));
/** 当前选中值的展示文案。 */
const selectedValueLabel = computed(() => {
  if (!selectedCell.value || !matrix.value.length) return "未选择";
  return matrix.value[selectedCell.value.r]?.[selectedCell.value.c] ?? "未选择";
});
/** 当前搜索命中坐标的展示文案。 */
const highlightLabel = computed(() => (
  highlightPos.value.r === -1 ? "未命中" : `${highlightPos.value.r}, ${highlightPos.value.c}`
));

const projectedLevels = computed(() => {
  if (!lastTrendResult.value || !selectedCell.value) return [];

  const anchorPrice = Number(marketForm.anchorPrice);
  if (!Number.isFinite(anchorPrice) || anchorPrice <= 0) return [];

  const chartTrendLines = getChartTrendLines(lastTrendResult.value);
  const levels = buildBacktestLevels({
    clickedValue: lastTrendResult.value.clickedValue,
    trendMain: chartTrendLines.trendMain,
    trendCross: chartTrendLines.trendCross,
    matrixStep: form.step,
    anchorPrice: marketForm.anchorPrice,
    priceUnit: marketForm.priceUnit,
  });

  return sortLevelsByTrendDirection(
    levels.map(item => ({
      ...item,
      price: Math.round(item.price * 10000) / 10000,
    })),
    form.trendDirection
  );
});

/**
 * 为 K 线价格线准备独立的趋势点集合。
 * 九方图高亮继续使用 trendMain/trendCross；上升推演需要把主线和副线上所有更高点位也画到 K 线。
 */
function getChartTrendLines(result) {
  if (!result) {
    return { trendMain: [], trendCross: [] };
  }

  const trendFilter = form.trendDirection === "up" ? isHigherTrendPoint : isLowerTrendPoint;
  const baseMain = filterChartTrendPoints(result.mainLine, result.clickedValue, trendFilter);
  const baseCross = filterChartTrendPoints(result.crossLinePoints, result.clickedValue, trendFilter);
  const mainForwardLine = form.trendDirection === "up"
    ? inferForwardLine(selectedCell.value, baseMain, matrix.value)
    : null;
  const crossForwardLine = form.trendDirection === "up"
    ? inferPerpendicularLine(mainForwardLine, selectedCell.value, baseCross, matrix.value)
    : null;
  const forwardMain = form.trendDirection === "up"
    ? getForwardChartPointsForUptrend(matrix.value, result.clickedValue, mainForwardLine)
    : [];
  const forwardCross = form.trendDirection === "up"
    ? getForwardChartPointsForUptrend(matrix.value, result.clickedValue, crossForwardLine)
    : [];

  return {
    trendMain: mergeTrendPoints(baseMain, forwardMain),
    trendCross: mergeTrendPoints(baseCross, forwardCross),
  };
}

/**
 * K 线推演使用完整主线/副线中符合方向的点，避免九方图高亮截取影响价格线展示。
 */
function filterChartTrendPoints(points, clickedValue, predicate) {
  const anchor = Number(clickedValue);
  return (points || []).filter(point => predicate(Number(point.value ?? point), anchor));
}

/**
 * 上升趋势的 K 线投影需要额外向后找价格级别。
 * 例如点击 41 时，同一横行后续级别为 52、70、85、107。
 * 这些只用于 K 线，不参与九方图本身的高亮渲染。
 */
function getForwardChartPointsForUptrend(sourceMatrix, clickedValue, line) {
  if (!sourceMatrix?.length || !line) return [];

  const anchor = Number(clickedValue);
  return getMatrixLinePoints(sourceMatrix, line)
    .filter(point => Number(point.value) > anchor)
    .sort((a, b) => Number(a.value) - Number(b.value));
}

function inferForwardLine(cell, seedPoints, sourceMatrix) {
  const seed = (seedPoints || []).find(point => Number(point?.value) > Number(sourceMatrix[cell.r]?.[cell.c]));
  if (!seed) return { type: "row", value: cell.r };

  if (seed.r === cell.r) return { type: "row", value: cell.r };
  if (seed.c === cell.c) return { type: "column", value: cell.c };
  if (seed.r - seed.c === cell.r - cell.c) return { type: "mainDiagonal", value: cell.r - cell.c };
  if (seed.r + seed.c === cell.r + cell.c) return { type: "antiDiagonal", value: cell.r + cell.c };

  return { type: "row", value: cell.r };
}

function inferPerpendicularLine(mainLine, cell, seedPoints, sourceMatrix) {
  if (!mainLine || !cell) return null;

  const center = Math.floor((sourceMatrix?.length || 1) / 2);
  const seed = (seedPoints || []).find(point => Number(point?.value) > Number(sourceMatrix[cell.r]?.[cell.c]));

  if (mainLine.type === "row") {
    return { type: "column", value: Number.isInteger(seed?.c) ? seed.c : center };
  }

  if (mainLine.type === "column") {
    return { type: "row", value: Number.isInteger(seed?.r) ? seed.r : center };
  }

  if (mainLine.type === "mainDiagonal") {
    return { type: "antiDiagonal", value: Number.isInteger(seed?.r) && Number.isInteger(seed?.c) ? seed.r + seed.c : center * 2 };
  }

  if (mainLine.type === "antiDiagonal") {
    return { type: "mainDiagonal", value: Number.isInteger(seed?.r) && Number.isInteger(seed?.c) ? seed.r - seed.c : 0 };
  }

  return null;
}

function getMatrixLinePoints(sourceMatrix, line) {
  const points = [];

  for (let r = 0; r < sourceMatrix.length; r++) {
    for (let c = 0; c < sourceMatrix[r].length; c++) {
      if (isPointOnLine(r, c, line)) {
        points.push({ r, c, value: sourceMatrix[r][c] });
      }
    }
  }

  return points;
}

function isPointOnLine(r, c, line) {
  if (line.type === "row") return r === line.value;
  if (line.type === "column") return c === line.value;
  if (line.type === "mainDiagonal") return r - c === line.value;
  if (line.type === "antiDiagonal") return r + c === line.value;
  return false;
}

function mergeTrendPoints(...groups) {
  const seen = new Set();
  const result = [];

  groups.flat().forEach(point => {
    const value = Number(point?.value ?? point);
    if (!Number.isFinite(value) || seen.has(value)) return;
    seen.add(value);
    result.push(point);
  });

  return result.sort((a, b) => Number(a.value ?? a) - Number(b.value ?? b));
}

function isHigherTrendPoint(value, anchor) {
  return Number.isFinite(value) && value > anchor;
}

function isLowerTrendPoint(value, anchor) {
  return Number.isFinite(value) && value < anchor;
}

/**
 * 生成新的 Gann 矩阵，并重置当前选中态与搜索结果。
 */
function generateMatrix() {
  matrix.value = generateGannMatrix(form.base, form.step, form.loop);
  selectedCell.value = null;
  trendCells.value = [];
  lastTrendResult.value = null;
  highlightPos.value = { r: -1, c: -1 };
}

/**
 * 按输入数值在矩阵中定位坐标。
 */
function highlightNumber() {
  highlightPos.value = findNumberPosition(matrix.value, searchNumber.value);
}

/**
 * 点击矩阵单元格后，根据当前模式计算趋势主线和副线。
 */
function handleCellClick(r, c) {
  if (!form.modeEnabled) return;

  selectedCell.value = { r, c };

  const result = calculateClickTrend(matrix.value, r, c, form.trendDirection, form);
  lastTrendResult.value = result;
  trendCells.value = result.trendCells;
}

function calculateTrendFromCell(r, c) {
  if (!form.modeEnabled) return;

  selectedCell.value = { r, c };

  const result = calculateClickTrend(matrix.value, r, c, form.trendDirection, form);
  lastTrendResult.value = result;
  trendCells.value = result.trendCells;
}

/**
 * 计算每个矩阵单元格的视觉样式。
 * 包括默认底色、趋势高亮、选中高亮和搜索边框。
 */
function getCellStyle(r, c) {
  const layer = Math.max(Math.abs(r - mid.value), Math.abs(c - mid.value));
  const baseColor = layer % 3 === 0 ? "#fff6df" : "#e8f3ff";

  let backgroundColor = baseColor;
  let border = "1px solid rgba(34, 44, 74, 0.16)";

  const isTrend = trendCells.value.some(pos => pos.r === r && pos.c === c);
  if (isTrend) {
    backgroundColor = trendPalette.value.trend;
  }

  if (selectedCell.value && selectedCell.value.r === r && selectedCell.value.c === c) {
    backgroundColor = trendPalette.value.selected;
  }

  if (highlightPos.value.r === r && highlightPos.value.c === c) {
    border = "3px solid #ff7a00";
  }

  return {
    width: `${cellSize.value}px`,
    height: `${cellSize.value}px`,
    backgroundColor,
    border,
    "--cell-value-size": `${Math.max(11, Math.round((cellSize.value * 0.3 * form.fontScale) / 100))}px`,
    "--cell-coord-size": `${Math.max(8, Math.round((cellSize.value * 0.18 * form.fontScale) / 100))}px`,
    cursor: form.modeEnabled ? "pointer" : "default",
  };
}

function getCellClass(r, c) {
  return {
    "is-highlight": highlightPos.value.r === r && highlightPos.value.c === c,
    "coords-hidden": !form.showCoords,
  };
}

function handleMarketPriceSelect(point) {
  ensureMatrixCoversPrice(point.price);

  const matrixPoint = findNearestMatrixPoint(point.price);

  marketForm.anchorPrice = point.price;
  searchNumber.value = matrixPoint.value;
  highlightPos.value = { r: matrixPoint.r, c: matrixPoint.c };
  calculateTrendFromCell(matrixPoint.r, matrixPoint.c);
}

function handleProjectPrice(payload, direction) {
  const price = typeof payload === "object" ? payload?.price : payload;
  const nextDirection = typeof payload === "object" ? payload?.direction : direction;

  if (nextDirection === "up" || nextDirection === "down") {
    form.trendDirection = nextDirection;
  }

  handleMarketPriceSelect({ price });
}

function sortLevelsByTrendDirection(levels, direction) {
  return [...(levels || [])].sort((a, b) => {
    const left = Number(a.price);
    const right = Number(b.price);

    if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
    return direction === "down" ? right - left : left - right;
  });
}

function ensureMatrixCoversPrice(price) {
  const target = Number(price);
  if (!Number.isFinite(target) || !matrix.value.length || form.step <= 0) return;

  let values = matrix.value.flat();
  let min = Math.min(...values);
  let max = Math.max(...values);

  while ((target < min || target > max) && form.loop < 100) {
    form.loop += 1;
    matrix.value = generateGannMatrix(form.base, form.step, form.loop);
    values = matrix.value.flat();
    min = Math.min(...values);
    max = Math.max(...values);
  }
}

function findNearestMatrixPoint(price) {
  const target = Number(price);
  let best = { r: 0, c: 0, value: matrix.value[0]?.[0] ?? 0, distance: Infinity };

  for (let r = 0; r < matrix.value.length; r++) {
    for (let c = 0; c < matrix.value[r].length; c++) {
      const value = matrix.value[r][c];
      const distance = Math.abs(value - target);

      if (distance < best.distance) {
        best = { r, c, value, distance };
      }
    }
  }

  return best;
}

generateMatrix();

watch(() => form.trendDirection, () => {
  if (!selectedCell.value) return;
  calculateTrendFromCell(selectedCell.value.r, selectedCell.value.c);
});
</script>

<style scoped>
:global(body) {
  margin: 0;
  font-family: "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  background:
    radial-gradient(circle at top left, rgba(75, 145, 255, 0.15), transparent 28%),
    radial-gradient(circle at bottom right, rgba(255, 122, 0, 0.14), transparent 24%),
    linear-gradient(180deg, #f4f7fb 0%, #eef3f9 100%);
}

.app-shell {
  min-height: 100vh;
  padding: 16px;
  color: #1f2a44;
  box-sizing: border-box;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 308px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 1180px) {
  .workspace-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

@media (max-width: 640px) {
  .app-shell {
    padding: 10px 10px 14px;
  }

  .workspace-grid {
    gap: 12px;
  }
}
</style>

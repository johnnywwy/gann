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
  if (typeof window === "undefined") return 110;

  const width = window.innerWidth;

  if (width >= 1440) return 135;
  if (width >= 1180) return 122;
  if (width >= 900) return 112;
  if (width >= 760) return 102;

  return 92;
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
const BOARD_REFERENCE_SIZE = 680;
const marketForm = reactive({
  market: "us",
  symbol: "AAPL",
  anchorPrice: null,
  priceUnit: 1,
  chartHeight: 1000,
});

const cellSize = computed(() => {
  if (!matrix.value.length) return 40;

  const autoSize = Math.floor(BOARD_REFERENCE_SIZE / matrix.value.length);
  const size = Math.floor(autoSize * (form.cellScale / 100));

  return Math.max(12, size);
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

  const levels = buildBacktestLevels({
    clickedValue: lastTrendResult.value.clickedValue,
    trendMain: lastTrendResult.value.trendMain,
    trendCross: lastTrendResult.value.trendCross,
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

  const result = calculateClickTrend(matrix.value, r, c, form.trendDirection);
  lastTrendResult.value = result;
  trendCells.value = result.trendCells;

  console.log("点击值:", result.clickedValue);
  console.log("主线:", result.mainLine.map(x => x.value));
  console.log("副线:", result.crossLine.map(x => x.value));
  console.log("mainLinePoints", result.mainLinePoints);
  console.log("crossLinePoints", result.crossLinePoints);
  console.log("趋势主线:", result.trendMain.map(x => x.value));
  console.log("趋势副线:", result.trendCross.map(x => x.value));
}

function calculateTrendFromCell(r, c) {
  if (!form.modeEnabled) return;

  selectedCell.value = { r, c };

  const result = calculateClickTrend(matrix.value, r, c, form.trendDirection);
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

function handleProjectPrice(price) {
  handleMarketPriceSelect({ price });
  logProjectedPriceLevels(price);
}

function logProjectedPriceLevels(anchorPrice) {
  const anchor = Number(anchorPrice);
  const levels = rankProjectedLogLevels(projectedLevels.value, anchor);

  console.group("股票走势推演点位");
  console.log("输入价格:", anchor);
  console.log("趋势方向:", form.trendDirection === "up" ? "上升" : "下降");
  console.log("九方图锚点:", selectedValueLabel.value);
  console.log("推演点位数量:", levels.length);

  levels.forEach(level => {
    console.log(
      `${level.label}: ${level.price}`,
      {
        价格: level.price,
        矩阵值: level.matrixValue,
        线类型: level.lineType === "main" ? "趋势主线" : "趋势副线",
        距离输入价: level.distance,
      }
    );
  });

  console.table(levels.map(level => ({
    名称: level.label,
    价格: level.price,
    矩阵值: level.matrixValue,
    线类型: level.lineType === "main" ? "趋势主线" : "趋势副线",
    距离输入价: level.distance,
  })));
  console.groupEnd();
}

function rankProjectedLogLevels(levels, anchorPrice) {
  if (!Number.isFinite(anchorPrice)) return [];

  const deduped = dedupeProjectedLogLevels(levels)
    .map(level => ({
      ...level,
      price: roundMarketPrice(level.price),
      distance: roundMarketPrice(Math.abs(Number(level.price) - anchorPrice)),
      kind: Number(level.price) < anchorPrice ? "support" : "resistance",
    }))
    .filter(level => Number.isFinite(level.price) && level.price >= 10 && level.distance > 0);

  const supports = assignProjectedLogRanks(
    deduped.filter(level => level.kind === "support"),
    "支撑位"
  );
  const resistances = assignProjectedLogRanks(
    deduped.filter(level => level.kind === "resistance"),
    "阻力位"
  );

  return sortLevelsByTrendDirection([...supports, ...resistances], form.trendDirection);
}

function dedupeProjectedLogLevels(levels) {
  const buckets = new Map();

  (levels || []).forEach(level => {
    const price = Number(level.price);
    if (!Number.isFinite(price)) return;

    const key = roundMarketPrice(price);
    const current = buckets.get(key);
    const priority = level.lineType === "main" ? 2 : 1;

    if (!current || priority > current.priority) {
      buckets.set(key, {
        ...level,
        price,
        priority,
      });
    }
  });

  return [...buckets.values()];
}

function assignProjectedLogRanks(levels, label) {
  return levels
    .sort((a, b) => a.distance - b.distance)
    .map((level, index) => ({
      ...level,
      rank: index + 1,
      label: `第${index + 1}${label}`,
    }));
}

function roundMarketPrice(value) {
  return Math.round(Number(value) * 10000) / 10000;
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

  while ((target < min || target > max) && form.loop < 80) {
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

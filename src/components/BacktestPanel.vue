<template>
  <section class="market-panel">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Market Lab</p>
        <h2>股票走势推演</h2>
      </div>
      <div class="anchor-card">
        <span>九方图锚点</span>
        <strong>{{ selectedValueLabel }}</strong>
      </div>
    </div>

    <div class="toolbar-grid">
      <label class="field-card">
        <span class="field-label">标的</span>
        <el-select
          :model-value="marketForm.symbol"
          placeholder="选择标的"
          @update:model-value="$emit('update:stock-symbol', $event)"
        >
          <el-option
            v-for="item in stockCatalog"
            :key="item.symbol"
            :label="item.symbol"
            :value="item.symbol"
          />
        </el-select>
      </label>

      <div class="field-card price-action-card">
        <span class="field-label">价格点位</span>
        <div class="price-action-row">
          <el-input-number v-model="marketForm.anchorPrice" :precision="0" :step="1" :min="0" />
          <el-button type="primary" @click="projectFromInput">推演</el-button>
        </div>
      </div>

      <div class="field-card action-card">
        <span class="field-label">趋势方向</span>
        <div class="action-row">
          <el-segmented
            :model-value="trendDirection"
            :options="trendDirectionOptions"
            @update:model-value="$emit('update:trend-direction', $event)"
          />
        </div>
      </div>

      <label class="field-card">
        <span class="field-label">K线高度</span>
        <el-slider v-model="marketForm.chartHeight" :min="500" :max="3000" :step="20" />
      </label>

      <div class="field-card action-card">
        <div class="switch-title-row">
          <span class="field-label">走势简化</span>
          <el-switch v-model="showSwingLine" />
        </div>
        <div class="simplify-row">
          <el-slider
            v-model="marketForm.swingSmoothDays"
            :min="1"
            :max="60"
            :step="1"
          />
        </div>
      </div>
    </div>

    <div class="chart-shell">
      <div ref="chartRef" class="echart-host" :style="{ height: `${marketForm.chartHeight}px` }"></div>
    </div>
  </section>
</template>

<script setup>
import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  marketForm: {
    type: Object,
    required: true,
  },
  stockCatalog: {
    type: Array,
    required: true,
  },
  candles: {
    type: Array,
    required: true,
  },
  selectedValueLabel: {
    type: [String, Number],
    required: true,
  },
  chartLevels: {
    type: Array,
    required: true,
  },
  trendDirection: {
    type: String,
    required: true,
  },
});

const emit = defineEmits([
  "select-price",
  "project-price",
  "update:stock-symbol",
  "update:trend-direction",
]);

const chartRef = ref(null);
const LATEST_CANDLE_COUNT = 500;
const currentZoom = ref({ start: 0, end: 100 });
const showSwingLine = ref(false);
let chart = null;

const trendDirectionOptions = [
  { label: "上升", value: "up" },
  { label: "下降", value: "down" },
];

const displayCandles = computed(() => props.candles);

const dates = computed(() => displayCandles.value.map(item => item.date));
const ohlc = computed(() => displayCandles.value.map(item => [item.open, item.close, item.low, item.high]));
const swingLineData = computed(() => buildSwingLineData(
  displayCandles.value,
  props.marketForm.swingSmoothDays
));
const yearMarkAreas = computed(() => buildYearMarkAreas(dates.value));
const rankedChartLevels = computed(() => rankProjectedLevels(props.chartLevels, props.marketForm.anchorPrice));
const levelMarkLines = computed(() => rankedChartLevels.value
  .slice(0, 32)
  .map(level => {
    const isSupport = level.kind === "support";
    const color = isSupport ? "#14945f" : "#d9363e";
    const weight = getLevelWeight(level.rank);

    return {
    yAxis: level.price,
    name: level.label,
    lineStyle: {
      color,
      type: "dashed",
      width: weight.width,
      opacity: weight.opacity,
    },
    label: {
      show: true,
      position: "end",
      distance: 8,
      formatter: `${level.label} ${formatPrice(level.price)}`,
      color,
      fontSize: 11,
      fontWeight: weight.fontWeight,
      backgroundColor: "#fff",
      borderColor: color,
      borderWidth: 1,
      borderRadius: 4,
      padding: [2, 5],
    },
  };
}));
const combinedMarkLines = computed(() => [
  ...levelMarkLines.value,
  ...buildExtremesMarkLines(),
]);

onMounted(() => {
  resetZoomToLatest();
  initChart();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeChart);
  chart?.dispose();
  chart = null;
});

watch(
  () => [
    props.candles,
  ],
  () => {
    resetZoomToLatest();
    renderChart();
  },
  { deep: true }
);

watch(
  () => [
    props.marketForm.chartHeight,
    props.marketForm.swingSmoothDays,
    props.chartLevels,
    showSwingLine.value,
  ],
  () => {
    renderChart();
  },
  { deep: true }
);

function initChart() {
  if (!chartRef.value) return;

  chart = echarts.init(chartRef.value);
  chart.on("click", handleChartClick);
  chart.on("datazoom", handleDataZoom);
  window.addEventListener("resize", resizeChart);
  renderChart();
}

function renderChart() {
  nextTick(() => {
    if (!chart) return;

    chart.setOption(buildOption(), true);
    resizeChart();
  });
}

function resetZoomToLatest() {
  const total = displayCandles.value.length;

  currentZoom.value = total > LATEST_CANDLE_COUNT
    ? { startValue: total - LATEST_CANDLE_COUNT, endValue: total - 1 }
    : { start: 0, end: 100 };
}

function buildOption() {
  const zoomRange = getActiveZoomRange();
  const yAxisRange = getPaddedYAxisRange();
  const grids = [
    { left: 68, right: 100, top: 44, bottom: 90 },
  ];
  const xAxis = [createCategoryAxis(0, dates.value, 0)];
  const yAxis = [createValueAxis(0, true, yAxisRange)];
  const series = [
    {
      id: "price-candles",
      name: props.marketForm.symbol,
      type: "candlestick",
      data: ohlc.value,
      itemStyle: {
        color: "#e34848",
        color0: "#16a36a",
        borderColor: "#c93636",
        borderColor0: "#118357",
      },
      markArea: {
        silent: true,
        itemStyle: { opacity: 0.32 },
        data: yearMarkAreas.value,
      },
      markLine: {
        symbol: "none",
        silent: true,
        data: combinedMarkLines.value,
      },
      xAxisIndex: 0,
      yAxisIndex: 0,
    },
  ];

  if (showSwingLine.value) {
    series.push({
      id: "swing-line",
      name: "波段线",
      type: "line",
      data: swingLineData.value,
      connectNulls: true,
      showSymbol: true,
      symbol: "circle",
      symbolSize: 5,
      smooth: false,
      lineStyle: {
        color: "#f5b400",
        width: 2.6,
      },
      itemStyle: {
        color: "#f5b400",
      },
      emphasis: {
        disabled: true,
      },
      xAxisIndex: 0,
      yAxisIndex: 0,
      z: 8,
    });
  }

  return {
    animation: false,
    backgroundColor: "#fbfdff",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      borderWidth: 1,
      textStyle: { fontSize: 12 },
    },
    axisPointer: {
      link: [{ xAxisIndex: "all" }],
    },
    grid: grids,
    xAxis,
    yAxis,
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: [0],
        zoomOnMouseWheel: true,
        moveOnMouseWheel: false,
        moveOnMouseMove: true,
        ...zoomRange,
      },
      {
        type: "slider",
        xAxisIndex: [0],
        height: 26,
        bottom: 40,
        borderColor: "rgba(34,44,74,0.18)",
        fillerColor: "rgba(45,108,223,0.16)",
        handleStyle: { color: "#2d6cdf" },
        textStyle: { color: "#607090", fontSize: 10 },
        ...zoomRange,
      },
    ],
    series,
  };
}

function createCategoryAxis(index, data, gridIndex) {
  return {
    type: "category",
    data,
    gridIndex,
    boundaryGap: false,
    axisLine: { lineStyle: { color: "rgba(34,44,74,0.18)" } },
    axisTick: { show: false },
    axisLabel: {
      show: index === 0,
      color: "#607090",
      fontSize: 10,
    },
    min: "dataMin",
    max: "dataMax",
  };
}

function createValueAxis(index, scale, range = {}) {
  return {
    scale,
    gridIndex: index,
    min: range.min,
    max: range.max,
    splitLine: { lineStyle: { color: "rgba(34,44,74,0.08)" } },
    axisLabel: { color: "#607090", fontSize: 10 },
  };
}

function handleChartClick(params) {
  if (params.seriesType !== "candlestick") return;

  const candle = displayCandles.value[params.dataIndex];
  if (!candle) return;

  const midpoint = (candle.high + candle.low) / 2;
  const closeToHigh = candle.close >= midpoint;
  emit("select-price", {
    price: closeToHigh ? candle.high : candle.low,
    date: candle.date,
    kind: closeToHigh ? "high" : "low",
  });
}

function projectFromInput() {
  const price = Number(props.marketForm.anchorPrice);
  if (!Number.isFinite(price) || price <= 0) return;

  emit("project-price", price);
}

function buildSwingLineData(candles, smoothDays) {
  if (!candles?.length) return [];

  const smoothedCandles = smoothCandles(candles, smoothDays);
  const compressed = buildZigZagPivots(smoothedCandles, candles);
  const data = Array(candles.length).fill(null);

  compressed.forEach(point => {
    data[point.index] = point.value;
  });

  return data;
}

function smoothCandles(candles, smoothDays) {
  const period = Math.max(1, Math.min(60, Number(smoothDays) || 1));
  if (period <= 1) return candles;

  return candles.map((candle, index) => {
    const start = Math.max(0, index - period + 1);
    const window = candles.slice(start, index + 1);
    const divisor = window.length || 1;

    return {
      ...candle,
      high: window.reduce((sum, item) => sum + item.high, 0) / divisor,
      low: window.reduce((sum, item) => sum + item.low, 0) / divisor,
      close: window.reduce((sum, item) => sum + item.close, 0) / divisor,
    };
  });
}

function buildZigZagPivots(candles, rawCandles = candles) {
  if (candles.length < 2) {
    return candles.map((candle, index) => ({ index, value: rawCandles[index]?.close ?? candle.close }));
  }

  const threshold = getSwingReversalThreshold(candles);
  const pivots = [{ index: 0, value: candles[0].close }];
  let direction = 0;
  let extreme = {
    index: 0,
    high: candles[0].high,
    low: candles[0].low,
  };

  for (let index = 1; index < candles.length; index++) {
    const candle = candles[index];

    if (direction === 0) {
      if (candle.high - extreme.low >= threshold) {
        direction = 1;
        extreme = { index, high: candle.high, low: candle.low };
      } else if (extreme.high - candle.low >= threshold) {
        direction = -1;
        extreme = { index, high: candle.high, low: candle.low };
      } else {
        if (candle.high > extreme.high) extreme = { ...extreme, index, high: candle.high };
        if (candle.low < extreme.low) extreme = { ...extreme, index, low: candle.low };
      }
      continue;
    }

    if (direction === 1) {
      if (candle.high >= extreme.high) {
        extreme = { index, high: candle.high, low: candle.low };
      }

      if (extreme.high - candle.low >= threshold) {
        pushPivot(pivots, buildRawPivot(rawCandles, extreme.index, "high", extreme.high));
        direction = -1;
        extreme = { index, high: candle.high, low: candle.low };
      }
      continue;
    }

    if (candle.low <= extreme.low) {
      extreme = { index, high: candle.high, low: candle.low };
    }

    if (candle.high - extreme.low >= threshold) {
      pushPivot(pivots, buildRawPivot(rawCandles, extreme.index, "low", extreme.low));
      direction = 1;
      extreme = { index, high: candle.high, low: candle.low };
    }
  }

  if (direction === 1) {
    pushPivot(pivots, buildRawPivot(rawCandles, extreme.index, "high", extreme.high));
  } else if (direction === -1) {
    pushPivot(pivots, buildRawPivot(rawCandles, extreme.index, "low", extreme.low));
  }

  pushPivot(pivots, { index: candles.length - 1, value: candles[candles.length - 1].close });

  return pivots.sort((a, b) => a.index - b.index);
}

function getSwingReversalThreshold(candles) {
  const ranges = candles.map(candle => Math.abs(candle.high - candle.low));
  const avgRange = ranges.reduce((sum, value) => sum + value, 0) / Math.max(ranges.length, 1);
  const lastClose = candles[candles.length - 1]?.close || 1;

  return Math.max(avgRange * 1.8, lastClose * 0.018);
}

function buildRawPivot(rawCandles, index, type, fallback) {
  const candle = rawCandles[index];

  return {
    index,
    value: type === "high"
      ? candle?.high ?? fallback
      : candle?.low ?? fallback,
  };
}

function pushPivot(pivots, point) {
  const last = pivots[pivots.length - 1];

  if (last?.index === point.index) {
    pivots[pivots.length - 1] = point;
    return;
  }

  pivots.push(point);
}

function rankProjectedLevels(levels, anchorPrice) {
  const anchor = Number(anchorPrice);
  if (!Number.isFinite(anchor)) return [];

  const deduped = dedupeLevels(levels)
    .map(level => ({
      ...level,
      distance: Math.abs(Number(level.price) - anchor),
      kind: Number(level.price) < anchor ? "support" : "resistance",
    }))
    .filter(level => Number.isFinite(level.price) && level.price >= 10 && level.distance > 0);

  const supports = assignLevelRanks(
    deduped.filter(level => level.kind === "support"),
    "支撑位"
  );
  const resistances = assignLevelRanks(
    deduped.filter(level => level.kind === "resistance"),
    "阻力位"
  );

  return [...supports, ...resistances].sort((a, b) => a.distance - b.distance);
}

function dedupeLevels(levels) {
  const buckets = new Map();

  (levels || []).forEach(level => {
    const price = Number(level.price);
    if (!Number.isFinite(price)) return;

    const key = formatPrice(price);
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

function assignLevelRanks(levels, label) {
  return levels
    .sort((a, b) => a.distance - b.distance)
    .map((level, index) => ({
      ...level,
      rank: index + 1,
      label: `第${index + 1}${label}`,
    }));
}

function getLevelWeight(rank) {
  if (rank <= 2) {
    return { width: 2.4, opacity: 0.95, fontWeight: 900 };
  }

  if (rank <= 4) {
    return { width: 1.8, opacity: 0.78, fontWeight: 800 };
  }

  return { width: 1.1, opacity: 0.48, fontWeight: 700 };
}

function resizeChart() {
  chart?.resize();
}

function handleDataZoom(params) {
  const zoom = params.batch?.[0] ?? params;

  const nextZoom = normalizeZoomPayload(zoom);
  if (nextZoom) {
    currentZoom.value = nextZoom;
    updateVisibleChartRange();
  }
}

function getActiveZoomRange() {
  return currentZoom.value;
}

function normalizeZoomPayload(zoom) {
  if (Number.isFinite(zoom.start) && Number.isFinite(zoom.end)) {
    return { start: zoom.start, end: zoom.end };
  }

  if (Number.isFinite(zoom.startValue) && Number.isFinite(zoom.endValue) && dates.value.length > 1) {
    return {
      startValue: Number(zoom.startValue),
      endValue: Number(zoom.endValue),
    };
  }

  return null;
}

function updateVisibleChartRange() {
  const yAxisRange = getPaddedYAxisRange();

  chart?.setOption({
    yAxis: [
      {
        min: yAxisRange.min,
        max: yAxisRange.max,
      },
    ],
    series: [
      {
        id: "price-candles",
        markLine: {
          symbol: "none",
          silent: true,
          data: combinedMarkLines.value,
        },
      },
    ],
  }, { lazyUpdate: true, silent: true });
}

function buildExtremesMarkLines() {
  const extremes = getVisibleExtremes();
  if (!extremes) {
    return [];
  }

  return [
    buildExtremeLine(extremes.high, "high"),
    buildExtremeLine(extremes.low, "low"),
  ];
}

function buildExtremeLine(point, type) {
  const isHigh = type === "high";
  const lineColor = isHigh ? "#d9363e" : "#14945f";
  const indexOffset = point.index > dates.value.length - 5 ? -3 : 3;
  const endIndex = clampIndex(point.index + indexOffset);
  const priceOffset = getVisiblePriceRange() * (isHigh ? 0.035 : -0.035);
  const endPrice = point.price + priceOffset;

  return [
    {
      coord: [point.date, point.price],
      lineStyle: {
        color: lineColor,
        width: 1.4,
      },
    },
    {
      coord: [dates.value[endIndex], endPrice],
      value: formatPrice(point.price),
      lineStyle: {
        color: lineColor,
        width: 1.4,
      },
      label: {
        show: true,
        formatter: () => formatPrice(point.price),
        position: "end",
        distance: 4,
        color: lineColor,
        fontSize: 11,
        fontWeight: 800,
        backgroundColor: "#fff",
        borderColor: lineColor,
        borderWidth: 1,
        borderRadius: 4,
        padding: [2, 6],
      },
    },
  ];
}

function getVisibleExtremes() {
  if (!displayCandles.value.length) return null;

  const { startIndex, endIndex } = getVisibleIndexRange();
  const visibleCandles = displayCandles.value.slice(startIndex, endIndex + 1);

  if (!visibleCandles.length) return null;

  let high = { ...visibleCandles[0], index: startIndex };
  let low = { ...visibleCandles[0], index: startIndex };

  visibleCandles.forEach((candle, offset) => {
    const index = startIndex + offset;
    if (candle.high > high.high) high = { ...candle, index };
    if (candle.low < low.low) low = { ...candle, index };
  });

  return {
    high: { date: high.date, price: high.high, index: high.index },
    low: { date: low.date, price: low.low, index: low.index },
  };
}

function getVisiblePriceRange() {
  const extremes = getVisibleExtremesRaw();
  if (!extremes) return 1;

  return Math.max(extremes.high - extremes.low, 1);
}

function getPaddedYAxisRange() {
  const extremes = getVisibleExtremesRaw();
  if (!extremes) return {};

  const baseRange = Math.max(extremes.high - extremes.low, 1);
  const nearbyLow = extremes.low - baseRange * 0.55;
  const nearbyHigh = extremes.high + baseRange * 0.55;
  const visibleLevels = props.chartLevels
    .map(item => Number(item.price))
    .filter(price => Number.isFinite(price) && price >= nearbyLow && price <= nearbyHigh);
  const high = Math.max(extremes.high, ...visibleLevels);
  const low = Math.min(extremes.low, ...visibleLevels);
  const range = Math.max(high - low, 1);
  const padding = Math.max(range * 0.34, baseRange * 0.18);

  return {
    min: Math.max(0, low - padding),
    max: high + padding,
  };
}

function getVisibleExtremesRaw() {
  if (!displayCandles.value.length) return null;

  const { startIndex, endIndex } = getVisibleIndexRange();
  const visibleCandles = displayCandles.value.slice(startIndex, endIndex + 1);

  if (!visibleCandles.length) return null;

  let high = visibleCandles[0].high;
  let low = visibleCandles[0].low;

  for (const candle of visibleCandles) {
    if (candle.high > high) high = candle.high;
    if (candle.low < low) low = candle.low;
  }

  return {
    high,
    low,
  };
}

function getVisibleIndexRange() {
  const total = displayCandles.value.length;
  const maxIndex = Math.max(0, total - 1);

  if (Number.isFinite(currentZoom.value.startValue) && Number.isFinite(currentZoom.value.endValue)) {
    return {
      startIndex: Math.max(0, Math.min(maxIndex, Math.floor(currentZoom.value.startValue))),
      endIndex: Math.max(0, Math.min(maxIndex, Math.ceil(currentZoom.value.endValue))),
    };
  }

  return {
    startIndex: Math.max(0, Math.floor(((currentZoom.value.start ?? 0) / 100) * maxIndex)),
    endIndex: Math.min(maxIndex, Math.ceil(((currentZoom.value.end ?? 100) / 100) * maxIndex)),
  };
}

function clampIndex(index) {
  return Math.max(0, Math.min(index, dates.value.length - 1));
}

function formatPrice(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : value;
}

function buildYearMarkAreas(dateValues) {
  const ranges = [];
  let startIndex = 0;
  let currentYear = dateValues[0]?.slice(0, 4);

  for (let index = 1; index <= dateValues.length; index++) {
    const year = dateValues[index]?.slice(0, 4);
    if (year === currentYear && index < dateValues.length) continue;

    if (currentYear) {
      const stripeIndex = ranges.length;
      ranges.push([
        {
          name: currentYear,
          xAxis: dateValues[startIndex],
          itemStyle: {
            color: stripeIndex % 2 === 0 ? "rgba(45,108,223,0.095)" : "rgba(255,122,0,0.115)",
          },
          label: {
            color: "rgba(80,96,127,0.5)",
            fontSize: 10,
          },
        },
        { xAxis: dateValues[index - 1] },
      ]);
    }

    startIndex = index;
    currentYear = year;
  }

  return ranges;
}

</script>

<style scoped>
.market-panel {
  display: grid;
  gap: 14px;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 40px rgba(30, 57, 102, 0.08);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.eyebrow {
  margin: 0 0 4px;
  color: #2d6cdf;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h2 {
  margin: 0;
  font-size: 20px;
}

.anchor-card,
.field-card,
.chart-shell {
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 14px;
  background: #fbfdff;
}

.anchor-card {
  min-width: 124px;
  padding: 10px 12px;
  text-align: right;
}

.anchor-card span {
  display: block;
  color: #607090;
  font-size: 12px;
}

.anchor-card strong {
  display: block;
  margin-top: 3px;
  font-size: 18px;
}

.toolbar-grid {
  display: grid;
  gap: 10px;
}

.toolbar-grid {
  grid-template-columns: 1.1fr 1.55fr 1fr 1fr 0.85fr;
}

.field-card {
  display: grid;
  gap: 9px;
  padding: 12px;
}

.field-label {
  font-size: 14px;
  font-weight: 800;
}

.action-card {
  min-width: 0;
}

.price-action-row,
.action-row {
  display: grid;
  gap: 8px;
  align-items: center;
}

.price-action-row {
  grid-template-columns: minmax(120px, 1fr) auto;
}

.action-row {
  grid-template-columns: 1fr;
}

.switch-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.simplify-row {
  display: block;
}

:deep(.el-input-number),
:deep(.el-select),
:deep(.el-segmented),
:deep(.el-slider) {
  width: 100%;
}

:deep(.el-input-number .el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-segmented),
:deep(.el-button) {
  min-height: 44px;
}

:deep(.el-input__inner),
:deep(.el-select__placeholder),
:deep(.el-segmented__item-label),
:deep(.el-button) {
  font-size: 15px;
  font-weight: 700;
}

.chart-shell {
  position: relative;
  padding: 8px;
}

.echart-host {
  width: 100%;
  height: 560px;
}

@media (max-width: 1080px) {
  .toolbar-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .market-panel {
    margin-top: 12px;
    padding: 12px;
    border-radius: 16px;
  }

  .panel-head,
  .toolbar-grid {
    grid-template-columns: 1fr;
  }

  .panel-head {
    display: grid;
  }

  .anchor-card {
    text-align: left;
  }

  .echart-host {
    height: 500px;
  }
}
</style>


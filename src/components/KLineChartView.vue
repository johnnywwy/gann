<template>
  <div ref="chartHost" class="kline-chart-view" :style="{ height: `${height}px` }"></div>
</template>

<script setup>
import { dispose, init } from "klinecharts";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  symbol: {
    type: String,
    required: true,
  },
  candles: {
    type: Array,
    required: true,
  },
  levels: {
    type: Array,
    default: () => [],
  },
  height: {
    type: Number,
    default: 640,
  },
});

const chartHost = ref(null);
let chart = null;

onMounted(() => {
  initChart();
});

onBeforeUnmount(() => {
  if (chartHost.value) {
    dispose(chartHost.value);
  }
  chart = null;
});

watch(
  () => [props.symbol, props.candles],
  () => {
    applyChartData();
  },
  { deep: true }
);

watch(
  () => props.levels,
  () => {
    renderLevelOverlays();
  },
  { deep: true }
);

function initChart() {
  if (!chartHost.value) return;

  chart = init(chartHost.value);
  applyChartData();
}

function applyChartData() {
  nextTick(() => {
    if (!chart) return;

    chart.setSymbol?.({ ticker: props.symbol || "STOCK" });
    chart.setPeriod?.({ span: 1, type: "day" });
    chart.applyNewData?.(toKLineData(props.candles));
    chart.scrollToDataIndex?.(Math.max(0, props.candles.length - 1), 0);
    renderLevelOverlays();
  });
}

function renderLevelOverlays() {
  if (!chart) return;

  chart.removeOverlay?.({ groupId: "gann-levels" });

  const latestTimestamp = toTimestamp(props.candles.at(-1)?.date);
  if (!latestTimestamp) return;

  props.levels.slice(0, 36).forEach(level => {
    const price = Number(level.price);
    if (!Number.isFinite(price)) return;

    chart.createOverlay?.({
      name: "horizontalStraightLine",
      groupId: "gann-levels",
      lock: true,
      points: [{ timestamp: latestTimestamp, value: price }],
      styles: {
        line: {
          color: level.kind === "support" ? "#14945f" : "#d9363e",
          size: level.rank <= 2 ? 2 : 1,
          dashedValue: [4, 4],
        },
      },
    });
  });
}

function toKLineData(candles) {
  return (candles || [])
    .map(candle => ({
      timestamp: toTimestamp(candle.date),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume) || 0,
    }))
    .filter(item => Number.isFinite(item.timestamp));
}

function toTimestamp(date) {
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}
</script>

<style scoped>
.kline-chart-view {
  width: 100%;
  min-height: 420px;
}
</style>

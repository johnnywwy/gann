<template>
  <div class="kline-pro-frame">
    <div ref="chartHost" class="kline-pro-host" :style="{ height: `${height}px` }"></div>
  </div>
</template>

<script setup>
import { KLineChartPro } from "@klinecharts/pro";
import "@klinecharts/pro/dist/klinecharts-pro.css";
import { ActionType, dispose, LineType } from "klinecharts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

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

const emit = defineEmits(["candle-select"]);
const chartHost = ref(null);
let chartPro = null;
let chartApi = null;
let candleClickSubscribed = false;

const chartData = computed(() => toKLineData(props.candles));
const symbolInfo = computed(() => createSymbolInfo(props.symbol));
const datafeed = {
  searchSymbols: async search => {
    const keyword = String(search || "").trim().toUpperCase();
    if (!keyword || symbolInfo.value.ticker.includes(keyword)) {
      return [symbolInfo.value];
    }
    return [];
  },
  getHistoryKLineData: async (symbol, period, from, to) => {
    const periodData = aggregateByPeriod(chartData.value, period);
    const fromTime = normalizeRangeTime(from);
    const toTime = normalizeRangeTime(to);
    const rangedData = periodData.filter(item => item.timestamp >= fromTime && item.timestamp <= toTime);
    return rangedData.length ? rangedData : periodData.slice(-500);
  },
  subscribe: () => {},
  unsubscribe: () => {},
};

const periods = [
  { multiplier: 1, timespan: "day", text: "日线" },
  { multiplier: 1, timespan: "week", text: "周线" },
  { multiplier: 1, timespan: "month", text: "月线" },
  { multiplier: 1, timespan: "year", text: "年线" },
];

onMounted(() => {
  initChart();
});

onBeforeUnmount(() => {
  destroyChart();
});

watch(
  () => [props.symbol, props.candles],
  () => {
    reloadChartData();
  },
  { deep: true }
);

watch(
  () => props.levels,
  () => {
    nextTick(renderLevelOverlays);
  },
  { deep: true }
);

watch(
  () => props.height,
  () => {
    nextTick(() => chartApi?.resize?.());
  }
);

function initChart() {
  if (!chartHost.value) return;

  chartPro = new KLineChartPro({
    container: chartHost.value,
    locale: "zh-CN",
    theme: "light",
    drawingBarVisible: true,
    symbol: symbolInfo.value,
    period: periods[0],
    periods,
    timezone: "Asia/Shanghai",
    mainIndicators: ["MA"],
    subIndicators: ["VOL", "MACD"],
    datafeed,
    styles: buildChartStyles(),
  });
  syncChartApi();
  queuePostRenderSync();
}

function destroyChart() {
  if (candleClickSubscribed) {
    chartApi?.unsubscribeAction?.(ActionType.OnCandleBarClick, handleCandleClick);
  }
  chartApi?.removeOverlay?.({ groupId: "gann-levels" });

  if (chartHost.value) {
    dispose(chartHost.value);
    chartHost.value.innerHTML = "";
  }

  chartApi = null;
  chartPro = null;
  candleClickSubscribed = false;
}

function reloadChartData() {
  if (!chartPro) return;

  chartPro.setSymbol(symbolInfo.value);
  queuePostRenderSync();
}

function queuePostRenderSync() {
  nextTick(() => {
    setTimeout(() => {
      syncChartApi();
      chartApi?.setStyles?.(buildChartStyles());
      chartApi?.scrollToDataIndex?.(Math.max(0, chartData.value.length - 1), 0);
      renderLevelOverlays();
      chartApi?.resize?.();
    }, 0);
  });
}

function syncChartApi() {
  chartApi = chartPro?._chartApi || chartApi;
  if (chartApi && !candleClickSubscribed) {
    chartApi.subscribeAction?.(ActionType.OnCandleBarClick, handleCandleClick);
    candleClickSubscribed = true;
  }
}

function renderLevelOverlays() {
  if (!chartApi) return;

  chartApi.removeOverlay?.({ groupId: "gann-levels" });
  const latestTimestamp = chartApi.getDataList?.().at(-1)?.timestamp || chartData.value.at(-1)?.timestamp;
  if (!latestTimestamp) return;

  const overlays = props.levels
    .slice(0, 36)
    .map(level => createPriceLevelOverlay(level, latestTimestamp))
    .filter(Boolean);

  if (overlays.length) {
    chartApi.createOverlay?.(overlays);
  }
}

function createPriceLevelOverlay(level, timestamp) {
  const price = Number(level.price);
  if (!Number.isFinite(price)) return null;

  const color = level.kind === "support" ? "#0f9f67" : "#d94141";
  const text = `${level.label || "推演位"} ${formatPrice(price)}`;

  return {
    name: "simpleTag",
    groupId: "gann-levels",
    lock: true,
    points: [{ timestamp, value: price }],
    extendData: text,
    needDefaultPointFigure: false,
    needDefaultYAxisFigure: true,
    styles: {
      line: {
        color,
        size: level.rank <= 2 ? 2 : 1,
        style: LineType.Dashed,
        dashedValue: [6, 4],
      },
      text: {
        color: "#ffffff",
        size: level.rank <= 2 ? 12 : 11,
        weight: 700,
        backgroundColor: color,
        borderColor: color,
        borderRadius: 4,
        paddingLeft: 6,
        paddingRight: 6,
        paddingTop: 3,
        paddingBottom: 3,
      },
    },
  };
}

function handleCandleClick(payload) {
  const point = payload?.data || payload?.kLineData || payload?.current || payload;
  const raw = findRawCandle(point?.timestamp);
  const high = Number(point?.high ?? raw?.high);
  const low = Number(point?.low ?? raw?.low);
  const close = Number(point?.close ?? raw?.close);

  if (!Number.isFinite(high) || !Number.isFinite(low)) return;

  const useHigh = Number.isFinite(close) ? close >= (high + low) / 2 : true;
  emit("candle-select", {
    price: useHigh ? high : low,
    date: raw?.date || timestampToDate(point?.timestamp),
    kind: useHigh ? "high" : "low",
  });
}

function findRawCandle(timestamp) {
  if (!timestamp) return null;
  return (props.candles || []).find(candle => toTimestamp(candle.date) === timestamp) || null;
}

function createSymbolInfo(symbol) {
  const ticker = symbol || "STOCK";
  return {
    ticker,
    name: ticker,
    shortName: ticker,
    exchange: "LOCAL",
    market: "stocks",
    pricePrecision: 2,
    volumePrecision: 0,
    priceCurrency: "usd",
    type: "stock",
  };
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
      turnover: Number(candle.turnover) || 0,
    }))
    .filter(item => (
      Number.isFinite(item.timestamp)
      && Number.isFinite(item.open)
      && Number.isFinite(item.high)
      && Number.isFinite(item.low)
      && Number.isFinite(item.close)
    ))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function aggregateByPeriod(data, period) {
  const timespan = period?.timespan || "day";
  if (timespan === "day") return data;

  const buckets = new Map();
  data.forEach(item => {
    const key = getPeriodKey(item.timestamp, timespan);
    const current = buckets.get(key);

    if (!current) {
      buckets.set(key, { ...item });
      return;
    }

    current.high = Math.max(current.high, item.high);
    current.low = Math.min(current.low, item.low);
    current.close = item.close;
    current.volume = (current.volume || 0) + (item.volume || 0);
    current.turnover = (current.turnover || 0) + (item.turnover || 0);
  });

  return [...buckets.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function getPeriodKey(timestamp, timespan) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  if (timespan === "year") return `${year}`;
  if (timespan === "month") return `${year}-${month}`;
  if (timespan === "week") {
    const monday = new Date(date);
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    return monday.toISOString().slice(0, 10);
  }
  return new Date(timestamp).toISOString().slice(0, 10);
}

function normalizeRangeTime(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number < 1e12 ? number * 1000 : number;
}

function toTimestamp(date) {
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function timestampToDate(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatPrice(value) {
  return Number(value.toFixed(2)).toString();
}

function buildChartStyles() {
  return {
    grid: {
      show: true,
      horizontal: {
        show: true,
        color: "rgba(82, 101, 132, 0.14)",
        size: 1,
        style: LineType.Solid,
        dashedValue: [],
      },
      vertical: {
        show: true,
        color: "rgba(82, 101, 132, 0.08)",
        size: 1,
        style: LineType.Solid,
        dashedValue: [],
      },
    },
    candle: {
      type: "candle_solid",
      bar: {
        upColor: "#e34848",
        downColor: "#16a36a",
        noChangeColor: "#8a94a6",
        upBorderColor: "#c93636",
        downBorderColor: "#118357",
        noChangeBorderColor: "#8a94a6",
        upWickColor: "#c93636",
        downWickColor: "#118357",
        noChangeWickColor: "#8a94a6",
      },
      priceMark: {
        high: { show: true, color: "#c93636", textOffset: 6, textSize: 12, textWeight: "700" },
        low: { show: true, color: "#118357", textOffset: 6, textSize: 12, textWeight: "700" },
        last: {
          show: true,
          upColor: "#e34848",
          downColor: "#16a36a",
          noChangeColor: "#8a94a6",
        },
      },
    },
    yAxis: {
      inside: false,
      axisLine: { show: true, color: "#d9e0ec", size: 1 },
      tickText: { show: true, color: "#667085", size: 12, weight: 600 },
    },
  };
}
</script>

<style scoped>
.kline-pro-frame {
  width: 100%;
  min-width: 0;
}

.kline-pro-host {
  width: 100%;
  min-height: 520px;
  overflow: hidden;
}

:deep(.klinecharts-pro) {
  width: 100%;
  height: 100%;
  border-radius: 10px;
}
</style>

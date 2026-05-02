<template>
  <div class="kline-frame">
    <div class="kline-toolbar">
      <button
        class="menu-toggle"
        type="button"
        :title="drawingCollapsed ? '展开画线栏' : '收起画线栏'"
        @click="drawingCollapsed = !drawingCollapsed"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="4" width="17" height="16" rx="2.2" />
          <path d="M8.5 4v16" />
          <path v-if="drawingCollapsed" d="M13 9l3 3-3 3" />
          <path v-else d="M16 9l-3 3 3 3" />
        </svg>
      </button>
      <div class="symbol-title">{{ symbolInfo.name }}</div>
      <button
        v-for="item in periodOptions"
        :key="item.value"
        class="toolbar-button period-button"
        :class="{ active: periodKey === item.value }"
        type="button"
        @click="periodKey = item.value"
      >
        {{ item.label }}
      </button>

      <el-popover placement="bottom-start" trigger="click" width="360">
        <template #reference>
          <button class="toolbar-button tool-entry" type="button">指标</button>
        </template>
        <div class="indicator-panel">
          <div class="panel-title">主图指标</div>
          <el-checkbox-group v-model="activePriceIndicators">
            <el-checkbox-button
              v-for="item in priceIndicatorOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-checkbox-group>
          <div class="panel-title">副图指标</div>
          <el-checkbox-group v-model="activeSubIndicators">
            <el-checkbox-button
              v-for="item in subIndicatorOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-checkbox-group>
        </div>
      </el-popover>

      <el-popover placement="bottom-start" trigger="click" width="380">
        <template #reference>
          <button class="toolbar-button tool-entry" type="button">设置</button>
        </template>
        <div class="settings-panel">
          <label class="setting-row">
            <span>K线间距</span>
            <el-slider v-model="activeChartSettings.barSpace" :min="3" :max="30" :step="1" />
          </label>
          <label class="setting-row">
            <span>右侧留白</span>
            <el-slider v-model="activeChartSettings.rightSpace" :min="20" :max="260" :step="2" />
          </label>
          <label class="setting-row">
            <span>价格精度</span>
            <el-slider v-model="activeChartSettings.pricePrecision" :min="0" :max="6" :step="1" />
          </label>
          <label class="setting-row">
            <span>坐标类型</span>
            <el-select v-model="activeChartSettings.yAxisType">
              <el-option label="普通坐标" value="normal" />
              <el-option label="百分比坐标" value="percentage" />
              <el-option label="对数坐标" value="log" />
            </el-select>
          </label>
          <div class="setting-switches">
            <el-switch v-model="activeChartSettings.zoomEnabled" active-text="缩放" />
            <el-switch v-model="activeChartSettings.scrollEnabled" active-text="拖动" />
            <el-switch v-model="activeChartSettings.yAxisReverse" active-text="反转坐标" />
          </div>
        </div>
      </el-popover>
    </div>

    <div class="kline-body" :style="{ height: `${height}px` }">
      <aside v-if="!drawingCollapsed" class="drawing-bar">
          <el-popover
            v-for="group in drawingGroups"
            :key="group.key"
            placement="right-start"
            trigger="hover"
            width="176"
          >
            <template #reference>
              <button
                class="drawing-button"
                type="button"
                :class="{ active: isDrawingGroupActive(group) }"
                :title="group.label"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" v-html="group.icon"></svg>
              </button>
            </template>
            <div class="drawing-menu">
              <button
                v-for="item in group.children"
                :key="item.name"
                class="drawing-menu-item"
                type="button"
                :class="{ active: activeDrawingTool === item.name }"
                :title="item.label"
                @click="startDrawing(item.name)"
              >
                {{ item.label }}
              </button>
            </div>
          </el-popover>

          <span class="drawing-divider"></span>

          <button
            class="drawing-button"
            type="button"
          :class="{ active: overlayMode === 'weak_magnet' }"
          title="弱磁吸"
          @click="setOverlayMode('weak_magnet')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14" />
              <circle cx="12" cy="12" r="2" />
          </svg>
        </button>
          <button
            class="drawing-button"
            type="button"
            :class="{ active: overlayMode === 'strong_magnet' }"
          title="强磁吸"
          @click="setOverlayMode('strong_magnet')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h16" />
              <circle cx="12" cy="12" r="2.5" />
              <path d="M12 5v3M12 16v3" />
          </svg>
        </button>
          <button
            class="drawing-button"
            type="button"
            :class="{ active: overlaysLocked }"
            title="锁定手动画线"
            @click="toggleOverlayLock"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="10" width="12" height="10" rx="2" />
              <path d="M9 10V7a3 3 0 016 0v3" />
            </svg>
          </button>
          <button
            class="drawing-button"
            type="button"
            :class="{ active: manualOverlaysVisible }"
            title="显示/隐藏手动画线"
            @click="toggleManualOverlayVisible"
          >
            <svg v-if="manualOverlaysVisible" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.5 6.2A10.8 10.8 0 0112 6c6 0 10 6 10 6a17.6 17.6 0 01-3.1 3.5" />
              <path d="M6.6 6.6C3.8 8.3 2 12 2 12s4 6 10 6a9.8 9.8 0 004.1-.9" />
            </svg>
          </button>
          <button class="drawing-button danger" type="button" title="删除所有手动画线" @click="clearManualDrawings">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </button>
      </aside>
      <div ref="chartHost" class="kline-host"></div>
    </div>
  </div>
</template>

<script setup>
import { ActionType, dispose, init, LineType } from "klinecharts";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const props = defineProps({
  symbol: {
    type: String,
    required: true,
  },
  market: {
    type: String,
    default: "us",
  },
  levels: {
    type: Array,
    default: () => [],
  },
  height: {
    type: Number,
    default: 640,
  },
  period: {
    type: Object,
    default: () => ({ multiplier: 1, timespan: "day", text: "日线" }),
  },
  chartSettings: {
    type: Object,
    default: () => ({}),
  },
  priceIndicators: {
    type: Array,
    default: () => ["MA"],
  },
  subIndicators: {
    type: Array,
    default: () => ["VOL", "MACD"],
  },
});

const emit = defineEmits(["candle-select"]);
const chartHost = ref(null);
let chartApi = null;
let overlayRenderTimer = null;
let overlayRetryCount = 0;
let requestSerial = 0;
let indicatorPaneIds = [];

const symbolInfo = computed(() => createSymbolInfo(props.symbol, props.market));
const periodKey = ref(periodToKey(props.period));
const activePriceIndicators = ref([...props.priceIndicators]);
const activeSubIndicators = ref([...props.subIndicators]);
const drawingCollapsed = ref(false);
const activeDrawingTool = ref("");
const overlayMode = ref("normal");
const overlaysLocked = ref(false);
const manualOverlaysVisible = ref(true);
const activeChartSettings = reactive({
  barSpace: props.chartSettings.barSpace ?? 8,
  rightSpace: props.chartSettings.rightSpace ?? 86,
  pricePrecision: props.chartSettings.pricePrecision ?? 2,
  yAxisType: props.chartSettings.yAxisType ?? "normal",
  yAxisPosition: props.chartSettings.yAxisPosition ?? "right",
  yAxisReverse: Boolean(props.chartSettings.yAxisReverse),
  zoomEnabled: props.chartSettings.zoomEnabled !== false,
  scrollEnabled: props.chartSettings.scrollEnabled !== false,
});
const activePeriod = computed(() => parsePeriod(periodKey.value));

const periodOptions = [
  { label: "1", value: "1m" },
  { label: "5", value: "5m" },
  { label: "15", value: "15m" },
  { label: "1小时", value: "1h" },
  { label: "2小时", value: "2h" },
  { label: "4小时", value: "4h" },
  { label: "日", value: "1d" },
  { label: "周", value: "1w" },
  { label: "月", value: "1M" },
  { label: "年", value: "1y" },
];
const priceIndicatorOptions = ["MA", "EMA", "SMA", "BBI", "BOLL", "SAR"];
const subIndicatorOptions = [
  "VOL",
  "MACD",
  "KDJ",
  "RSI",
  "BIAS",
  "BRAR",
  "CCI",
  "DMI",
  "CR",
  "PSY",
  "DMA",
  "TRIX",
  "OBV",
  "VR",
  "WR",
  "MTM",
  "EMV",
  "AO",
  "ROC",
  "PVT",
  "AVP",
];
const drawingGroups = [
  {
    key: "horizontal",
    label: "水平工具",
    icon: '<path d="M4 12h16" /><circle cx="12" cy="12" r="1.8" />',
    children: [
      { name: "horizontalStraightLine", label: "水平直线" },
      { name: "horizontalRayLine", label: "水平射线" },
      { name: "horizontalSegment", label: "水平线段" },
      { name: "priceLine", label: "价格线" },
    ],
  },
  {
    key: "trend",
    label: "趋势工具",
    icon: '<path d="M5 18L18 5" /><path d="M9 19L20 8" /><circle cx="8" cy="15" r="1.5" /><circle cx="16" cy="10" r="1.5" />',
    children: [
      { name: "straightLine", label: "直线" },
      { name: "rayLine", label: "射线" },
      { name: "segment", label: "线段" },
    ],
  },
  {
    key: "fibonacci",
    label: "斐波那契",
    icon: '<path d="M5 5h14" /><path d="M5 9h14" /><path d="M5 13h14" /><path d="M5 17h14" /><circle cx="10" cy="9" r="1.2" /><circle cx="15" cy="13" r="1.2" />',
    children: [
      { name: "fibonacciLine", label: "斐波那契回调" },
    ],
  },
  {
    key: "shape",
    label: "形态工具",
    icon: '<path d="M6 5l12 3-2 11-11-3z" /><path d="M6 5l10 14M18 8L5 16" /><circle cx="6" cy="5" r="1.4" /><circle cx="18" cy="8" r="1.4" /><circle cx="16" cy="19" r="1.4" /><circle cx="5" cy="16" r="1.4" />',
    children: [
      { name: "parallelStraightLine", label: "平行直线" },
      { name: "priceChannelLine", label: "价格通道" },
    ],
  },
];

onMounted(() => {
  initChart();
});

onBeforeUnmount(() => {
  destroyChart();
});

watch(
  () => [props.symbol, props.market],
  () => {
    reloadChartData();
  }
);

watch(
  () => [props.period.multiplier, props.period.timespan],
  () => {
    periodKey.value = periodToKey(props.period);
  }
);

watch(
  activePeriod,
  () => {
    reloadChartData();
  }
);

watch(
  () => props.levels,
  () => {
    overlayRetryCount = 0;
    scheduleLevelOverlayRender();
  },
  { deep: true }
);

watch(
  () => props.height,
  () => {
    nextTick(() => chartApi?.resize?.());
  }
);

watch(
  () => props.chartSettings,
  () => {
    Object.assign(activeChartSettings, {
      barSpace: props.chartSettings.barSpace ?? activeChartSettings.barSpace,
      rightSpace: props.chartSettings.rightSpace ?? activeChartSettings.rightSpace,
      pricePrecision: props.chartSettings.pricePrecision ?? activeChartSettings.pricePrecision,
      yAxisType: props.chartSettings.yAxisType ?? activeChartSettings.yAxisType,
      yAxisPosition: props.chartSettings.yAxisPosition ?? activeChartSettings.yAxisPosition,
      yAxisReverse: Boolean(props.chartSettings.yAxisReverse),
      zoomEnabled: props.chartSettings.zoomEnabled !== false,
      scrollEnabled: props.chartSettings.scrollEnabled !== false,
    });
  },
  { deep: true }
);

watch(
  () => [props.priceIndicators, props.subIndicators],
  () => {
    activePriceIndicators.value = [...props.priceIndicators];
    activeSubIndicators.value = [...props.subIndicators];
  },
  { deep: true }
);

watch(
  activeChartSettings,
  () => {
    applyChartSettings();
  },
  { deep: true }
);

watch(
  () => [activePriceIndicators.value, activeSubIndicators.value],
  () => {
    resetIndicators();
  },
  { deep: true }
);

function initChart() {
  if (!chartHost.value) return;

  chartApi = init(chartHost.value, {
    timezone: "Asia/Shanghai",
    styles: buildChartStyles(),
  });

  if (!chartApi) return;

  chartApi.subscribeAction(ActionType.OnCandleBarClick, handleCandleClick);
  chartApi.subscribeAction(ActionType.OnDataReady, scheduleLevelOverlayRender);
  chartApi.subscribeAction(ActionType.OnVisibleRangeChange, scheduleLevelOverlayRender);
  chartApi.subscribeAction(ActionType.OnScroll, scheduleLevelOverlayRender);
  chartApi.subscribeAction(ActionType.OnZoom, scheduleLevelOverlayRender);
  applyChartSettings();
  reloadChartData();
}

function destroyChart() {
  if (chartApi) {
    chartApi.unsubscribeAction(ActionType.OnCandleBarClick, handleCandleClick);
    chartApi.unsubscribeAction(ActionType.OnDataReady, scheduleLevelOverlayRender);
    chartApi.unsubscribeAction(ActionType.OnVisibleRangeChange, scheduleLevelOverlayRender);
    chartApi.unsubscribeAction(ActionType.OnScroll, scheduleLevelOverlayRender);
    chartApi.unsubscribeAction(ActionType.OnZoom, scheduleLevelOverlayRender);
    chartApi.removeOverlay({ groupId: "gann-levels" });
  }

  clearTimeout(overlayRenderTimer);
  overlayRetryCount = 0;

  if (chartHost.value) {
    dispose(chartHost.value);
    chartHost.value.innerHTML = "";
  }

  chartApi = null;
}

async function reloadChartData() {
  if (!chartApi) return;

  const currentRequest = ++requestSerial;
  chartApi.removeOverlay({ groupId: "gann-levels" });
  chartApi.clearData?.();

  const range = getInitialRange(activePeriod.value);
  const data = await fetchCloudKLineData(symbolInfo.value, activePeriod.value, range.from, range.to);
  if (currentRequest !== requestSerial || !chartApi) return;

  chartApi.applyNewData(data, false);
  resetIndicators();
  chartApi.scrollToRealTime?.(0);
  chartApi.resize?.();
  scheduleLevelOverlayRender();
}

function applyChartSettings() {
  if (!chartApi) return;

  const settings = activeChartSettings;
  chartApi.setStyles(buildChartStyles(settings));
  chartApi.setPriceVolumePrecision?.(settings.pricePrecision ?? 2, 0);
  chartApi.setOffsetRightDistance?.(settings.rightSpace ?? 86);
  chartApi.setMaxOffsetLeftDistance?.(settings.maxLeftSpace ?? 12000);
  chartApi.setMaxOffsetRightDistance?.(settings.maxRightSpace ?? 420);
  chartApi.setBarSpace?.(settings.barSpace ?? 8);
  chartApi.setScrollEnabled?.(settings.scrollEnabled !== false);
  chartApi.setZoomEnabled?.(settings.zoomEnabled !== false);
  chartApi.resize?.();
  scheduleLevelOverlayRender();
}

function resetIndicators() {
  if (!chartApi) return;

  removeIndicators();

  activePriceIndicators.value
    .map(name => createIndicatorPayload(name))
    .filter(Boolean)
    .forEach(indicator => {
      chartApi.createIndicator(indicator, true, { id: "candle_pane" });
    });

  indicatorPaneIds = activeSubIndicators.value
    .map(name => createIndicatorPayload(name))
    .filter(Boolean)
    .map(indicator => chartApi.createIndicator(indicator, false, { height: 110 }))
    .filter(Boolean);
}

function removeIndicators() {
  priceIndicatorOptions.forEach(name => {
    chartApi?.removeIndicator?.("candle_pane", name);
  });
  indicatorPaneIds.forEach(paneId => {
    chartApi?.removeIndicator?.(paneId);
  });
  indicatorPaneIds = [];
}

function startDrawing(name) {
  activeDrawingTool.value = name;
  chartApi?.createOverlay?.({
    name,
    groupId: "manual-drawings",
    lock: overlaysLocked.value,
    visible: manualOverlaysVisible.value,
    mode: overlayMode.value,
  });
}

function isDrawingGroupActive(group) {
  return group.children.some(item => item.name === activeDrawingTool.value);
}

function setOverlayMode(mode) {
  overlayMode.value = overlayMode.value === mode ? "normal" : mode;
  chartApi?.overrideOverlay?.({
    groupId: "manual-drawings",
    mode: overlayMode.value,
  });
}

function toggleOverlayLock() {
  overlaysLocked.value = !overlaysLocked.value;
  chartApi?.overrideOverlay?.({
    groupId: "manual-drawings",
    lock: overlaysLocked.value,
  });
}

function toggleManualOverlayVisible() {
  manualOverlaysVisible.value = !manualOverlaysVisible.value;
  chartApi?.overrideOverlay?.({
    groupId: "manual-drawings",
    visible: manualOverlaysVisible.value,
  });
}

function clearManualDrawings() {
  activeDrawingTool.value = "";
  chartApi?.removeOverlay?.({ groupId: "manual-drawings" });
}

function scheduleLevelOverlayRender() {
  clearTimeout(overlayRenderTimer);
  overlayRenderTimer = setTimeout(renderLevelOverlays, 120);
}

function renderLevelOverlays() {
  if (!chartApi) return;

  chartApi.removeOverlay({ groupId: "gann-levels" });
  if (!props.levels.length) return;

  const anchorPoint = getRightAnchorPoint(chartApi.getDataList() || []);
  if (!anchorPoint) {
    if (overlayRetryCount < 20) {
      overlayRetryCount += 1;
      scheduleLevelOverlayRender();
    }
    return;
  }
  overlayRetryCount = 0;

  const overlays = props.levels
    .slice(0, 60)
    .map(level => createPriceLineOverlay(level, anchorPoint))
    .filter(Boolean);

  const ids = overlays.length ? chartApi.createOverlay(overlays, "candle_pane") : [];
  console.log("九方图推演价格线:", overlays.map(item => item.extendData), ids);
}

const PRICE_LINE_LABEL_POSITION = 0.05; // 你现在想放在左侧 15%
const PRICE_AXIS_WIDTH = 64; // 右侧价格轴宽度，按你的 UI 可以微调 56~72

function getRightAnchorPoint(chartList) {
  if (!chartList.length || !chartApi || !chartHost.value) return null;

  const hostRect = chartHost.value.getBoundingClientRect();

  // 右侧价格轴不属于 K 线绘图区
  const yAxisWidth = activeChartSettings.yAxisPosition === "right"
    ? PRICE_AXIS_WIDTH
    : 0;

  // 右侧留白是你希望保留的空白区域，但它没有真实 K 线
  const rightBlankWidth = Number(activeChartSettings.rightSpace ?? 86);

  // 真正有 K 线的可视绘图区宽度
  const realKLineWidth = Math.max(
    0,
    hostRect.width - yAxisWidth - rightBlankWidth
  );

  if (!realKLineWidth) return null;

  // 在“真实 K 线区域”里取 15%，不要把右侧空白算进去
  const targetX = Math.round(realKLineWidth * PRICE_LINE_LABEL_POSITION);

  // 把像素 x 转成图表数据位置
  const point = chartApi.convertFromPixel?.(
    { x: targetX },
    { paneId: "candle_pane" }
  );

  let index = Math.round(Number(point?.dataIndex));

  if (!Number.isFinite(index)) {
    // 兜底：convertFromPixel 不可用时，才退回 visibleRange
    const visibleRange = chartApi?.getVisibleRange?.();
    const from = Math.max(0, Math.floor(visibleRange?.from ?? 0));
    const to = Math.min(
      chartList.length - 1,
      Math.ceil(visibleRange?.to ?? chartList.length - 1)
    );

    index = from + Math.floor((to - from) * PRICE_LINE_LABEL_POSITION);
  }

  index = Math.min(Math.max(0, index), chartList.length - 1);

  const candle = chartList[index];

  return candle?.timestamp
    ? {
        dataIndex: index,
        timestamp: candle.timestamp,
      }
    : null;
}

function createPriceLineOverlay(level, anchorPoint) {
  const price = Number(level.price);
  if (!Number.isFinite(price)) return null;

  return {
    name: "priceLine",
    groupId: "gann-levels",
    lock: true,
    visible: true,
    extendData: {
      price,
      rank: level.rank,
      kind: level.kind,
      label: `${level.label || "推演位"} ${formatPrice(price)}`,
    },
    points: [{ ...anchorPoint, value: price }],
    styles: {
      line: {
        color: "#2563eb",
        size: level.rank <= 2 ? 2 : 1,
        style: LineType.Solid,
        dashedValue: [],
      },
      text: {
        color: "#ffffff",
        size: level.rank <= 2 ? 12 : 11,
        weight: 800,
      },
    },
  };
}

function handleCandleClick(payload) {
  const point = payload?.data || payload?.kLineData || payload?.current || payload;
  const high = Number(point?.high);
  const low = Number(point?.low);
  const close = Number(point?.close);

  if (!Number.isFinite(high) || !Number.isFinite(low)) return;

  const useHigh = Number.isFinite(close) ? close >= (high + low) / 2 : true;
  emit("candle-select", {
    price: useHigh ? high : low,
    date: timestampToDate(point?.timestamp),
    kind: useHigh ? "high" : "low",
  });
}

function createSymbolInfo(symbol, market) {
  const rawSymbol = normalizeInputSymbol(symbol, market);
  const ticker = toYahooSymbol(rawSymbol, market);
  return {
    ticker,
    name: rawSymbol,
    market,
  };
}

async function fetchCloudKLineData(symbol, period, from, to) {
  try {
    const customData = await fetchCustomCloudData(symbol, period, from, to);
    if (customData.length) return customData;
  } catch (error) {
    console.warn("自定义行情源请求失败，尝试 Yahoo Finance。", error);
  }

  try {
    return await fetchYahooKLineData(symbol, period, from, to);
  } catch (error) {
    console.warn("Yahoo Finance 行情请求失败。", error);
    return [];
  }
}

async function fetchCustomCloudData(symbol, period, from, to) {
  const apiBase = import.meta.env.VITE_MARKET_API_BASE;
  if (!apiBase) return [];

  const range = normalizeQueryRange(from, to);
  const origin = globalThis.location?.origin || "http://localhost";
  const url = new URL(apiBase, origin);
  url.searchParams.set("symbol", symbol.name || symbol.ticker);
  url.searchParams.set("ticker", symbol.ticker);
  url.searchParams.set("market", props.market);
  url.searchParams.set("period", period.timespan);
  url.searchParams.set("multiplier", period.multiplier);
  url.searchParams.set("from", range.from);
  url.searchParams.set("to", range.to);

  const response = await fetch(url.toString());
  if (!response.ok) return [];

  const json = await response.json();
  return normalizeCloudRows(json?.data || json?.items || json?.candles || json);
}

async function fetchYahooKLineData(symbol, period, from, to) {
  const interval = getYahooInterval(period);
  const { from: period1, to: period2 } = normalizeQueryRange(from, to);
  const url = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol.ticker)}?period1=${period1}&period2=${period2}&interval=${interval}&events=history`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  return normalizeYahooChart(result);
}

function normalizeYahooChart(result) {
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};

  return timestamps
    .map((time, index) => ({
      timestamp: Number(time) * 1000,
      open: Number(quote.open?.[index]),
      high: Number(quote.high?.[index]),
      low: Number(quote.low?.[index]),
      close: Number(quote.close?.[index]),
      volume: Number(quote.volume?.[index]) || 0,
    }))
    .filter(isValidKLineData);
}

function normalizeCloudRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(item => ({
      timestamp: normalizeTimestamp(item.timestamp ?? item.time ?? item.date),
      open: Number(item.open ?? item.o),
      high: Number(item.high ?? item.h),
      low: Number(item.low ?? item.l),
      close: Number(item.close ?? item.c),
      volume: Number(item.volume ?? item.vol ?? item.v) || 0,
      turnover: Number(item.turnover ?? item.amount) || 0,
    }))
    .filter(isValidKLineData)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function isValidKLineData(item) {
  return Number.isFinite(item.timestamp)
    && Number.isFinite(item.open)
    && Number.isFinite(item.high)
    && Number.isFinite(item.low)
    && Number.isFinite(item.close);
}

function getInitialRange(period) {
  const to = Date.now();
  const isMinute = period?.timespan === "minute";
  const isHour = period?.timespan === "hour";
  const isYear = period?.timespan === "year";
  const from = to - 86400 * 1000 * (isMinute ? 60 : isHour ? 365 : isYear ? 365 * 12 : 365 * 5);
  return { from, to };
}

function normalizeRangeTime(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return number < 1e12 ? number * 1000 : number;
}

function normalizeRangeSeconds(value) {
  return Math.floor(normalizeRangeTime(value) / 1000);
}

function normalizeQueryRange(from, to) {
  const now = Math.floor(Date.now() / 1000);
  const end = normalizeRangeSeconds(to) || now;
  const start = normalizeRangeSeconds(from) || end - 86400 * 365 * 5;

  return {
    from: Math.max(0, start),
    to: Math.max(end, start + 86400),
  };
}

function normalizeTimestamp(value) {
  if (Number.isFinite(Number(value))) {
    const number = Number(value);
    return number < 1e12 ? number * 1000 : number;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : NaN;
}

function getYahooInterval(period) {
  if (period?.timespan === "minute") return `${period.multiplier || 1}m`;
  if (period?.timespan === "hour") return `${period.multiplier || 1}h`;
  if (period?.timespan === "year") return "3mo";
  if (period?.timespan === "week") return "1wk";
  if (period?.timespan === "month") return "1mo";
  return "1d";
}

function parsePeriod(value) {
  const periodMap = {
    "1m": { multiplier: 1, timespan: "minute", text: "1分钟" },
    "5m": { multiplier: 5, timespan: "minute", text: "5分钟" },
    "15m": { multiplier: 15, timespan: "minute", text: "15分钟" },
    "1h": { multiplier: 1, timespan: "hour", text: "1小时" },
    "2h": { multiplier: 2, timespan: "hour", text: "2小时" },
    "4h": { multiplier: 4, timespan: "hour", text: "4小时" },
    "1w": { multiplier: 1, timespan: "week", text: "周线" },
    "1M": { multiplier: 1, timespan: "month", text: "月线" },
    "1y": { multiplier: 1, timespan: "year", text: "年线" },
  };
  return periodMap[value] || { multiplier: 1, timespan: "day", text: "日线" };
}

function periodToKey(period) {
  if (period?.timespan === "minute") return `${period.multiplier || 1}m`;
  if (period?.timespan === "hour") return `${period.multiplier || 1}h`;
  if (period?.timespan === "week") return "1w";
  if (period?.timespan === "month") return "1M";
  if (period?.timespan === "year") return "1y";
  return "1d";
}

function createIndicatorPayload(name) {
  const calcParams = indicatorParams[name];
  if (calcParams === undefined) return null;
  return Array.isArray(calcParams) ? { name, calcParams } : { name };
}

function normalizeInputSymbol(symbol, market) {
  const raw = String(symbol || "").trim().toUpperCase();
  if (raw) return raw;
  if (market === "cn") return "600519";
  if (market === "hk") return "00700";
  return "AAPL";
}

function toYahooSymbol(symbol, market) {
  if (market === "hk") {
    const digits = symbol.replace(/\D/g, "");
    const code = String(Number(digits || 0)).padStart(4, "0");
    return `${code}.HK`;
  }

  if (market === "cn") {
    if (symbol.includes(".")) {
      return symbol
        .replace(/\.SH$/i, ".SS")
        .replace(/\.SSE$/i, ".SS")
        .replace(/\.SZSE$/i, ".SZ");
    }
    const exchange = symbol.startsWith("6") ? "SS" : "SZ";
    return `${symbol}.${exchange}`;
  }

  return symbol;
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number >= 100 ? number.toFixed(2) : number.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function timestampToDate(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toISOString().slice(0, 10);
}

function buildChartStyles(settings = props.chartSettings || {}) {
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
    indicator: {
      tooltip: { showName: true, showParams: false },
      lastValueMark: { show: false },
    },
    yAxis: {
      inside: false,
      type: settings.yAxisType || "normal",
      position: settings.yAxisPosition || "right",
      reverse: Boolean(settings.yAxisReverse),
      axisLine: { show: true, color: "#d9e0ec", size: 1 },
      tickText: { show: true, color: "#667085", size: 12, weight: 600 },
    },
  };
}

const indicatorParams = {
  MA: [5, 10, 30, 60],
  EMA: [6, 12, 20],
  SMA: [12, 2],
  BBI: [3, 6, 12, 24],
  VOL: [5, 10, 20],
  MACD: [12, 26, 9],
  BOLL: [20, 2],
  KDJ: [9, 3, 3],
  RSI: [6, 12, 24],
  BIAS: [6, 12, 24],
  BRAR: [26],
  CCI: [20],
  DMI: [14, 6],
  CR: [26, 10, 20, 40, 60],
  PSY: [12, 6],
  DMA: [10, 50, 10],
  TRIX: [12, 9],
  OBV: [30],
  VR: [26, 6],
  WR: [6, 10, 14],
  MTM: [12, 6],
  EMV: [14, 9],
  SAR: [2, 2, 20],
  AO: [5, 34],
  ROC: [12, 6],
  PVT: null,
  AVP: null,
};
</script>

<style scoped>
.kline-frame {
  width: 100%;
  min-width: 0;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
}

.kline-toolbar {
  display: flex;
  align-items: center;
  min-height: 38px;
  border-bottom: 1px solid #ebedf1;
  background: #ffffff;
  overflow-x: auto;
}

.menu-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  width: 53px;
  border: 0;
  border-right: 1px solid #ebedf1;
  background: transparent;
  color: #667085;
  cursor: pointer;
}

.menu-toggle:hover {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.12);
}

.menu-toggle svg,
.drawing-button svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.symbol-title {
  display: flex;
  align-items: center;
  align-self: stretch;
  padding: 0 14px;
  border-right: 1px solid #ebedf1;
  color: #051441;
  font-size: 18px;
  font-weight: 800;
  white-space: nowrap;
}

.toolbar-button {
  height: 30px;
  margin: 0 3px;
  padding: 0 9px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.toolbar-button:hover,
.toolbar-button.active {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.14);
}

.period-button:first-of-type {
  margin-left: 10px;
}

.tool-entry {
  margin-left: 8px;
  border-left: 1px solid #ebedf1;
  border-radius: 0;
}

.kline-body {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  min-height: 520px;
}

.drawing-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  width: 52px;
  padding-top: 8px;
  border-right: 1px solid #ebedf1;
  background: #ffffff;
  transition: width 0.18s ease;
}

.drawing-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #667085;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.drawing-button svg {
  width: 23px;
  height: 23px;
}

.drawing-button:hover {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.14);
}

.drawing-button.active,
.drawing-button.primary {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.14);
}

.drawing-button.danger:hover {
  color: #d94141;
  background: rgba(217, 65, 65, 0.12);
}

.drawing-divider {
  display: block;
  width: 100%;
  height: 1px;
  background: #ebedf1;
}

.drawing-menu {
  display: grid;
  gap: 4px;
}

.drawing-menu-item {
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.drawing-menu-item:hover {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.14);
}

.indicator-panel,
.settings-panel {
  display: grid;
  gap: 12px;
}

.panel-title {
  color: #344054;
  font-size: 14px;
  font-weight: 800;
}

.setting-row {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.setting-switches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
}

.kline-host {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

:deep(.el-checkbox-button__inner) {
  margin: 0 6px 6px 0;
  border-left: 1px solid var(--el-border-color);
  border-radius: 8px;
  font-weight: 700;
}

@media (max-width: 700px) {
  .menu-toggle {
    width: 38px;
  }

  .symbol-title {
    font-size: 15px;
  }

  .drawing-button {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
}
</style>

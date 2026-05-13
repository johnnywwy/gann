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
      <div class="symbol-title">{{ chartTitle }}</div>
      <button
        v-for="item in availablePeriodOptions"
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

      <el-popover placement="bottom-start" trigger="click" width="420">
        <template #reference>
          <button class="toolbar-button tool-entry range-entry" type="button">{{ selectedRangeLabel }}</button>
        </template>
        <div class="range-panel">
          <div class="panel-title">K 线时间范围</div>
          <el-date-picker
            v-model="rangePickerValue"
            type="datetimerange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="x"
            unlink-panels
            @change="reloadChartData"
          />
          <div class="range-actions">
            <button class="range-action" type="button" @click="setQuickRange(365)">近 1 年</button>
            <button class="range-action" type="button" @click="setQuickRange(365 * 3)">近 3 年</button>
            <button class="range-action" type="button" @click="clearTimeRange">实时</button>
          </div>
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

    <div class="kline-body" :class="{ collapsed: drawingCollapsed }" :style="{ height: `${height}px` }">
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
      <div class="kline-chart-stage">
        <div ref="chartHost" class="kline-host"></div>
        <div v-if="hoverCandleInfo" class="candle-hover-card">
          <span class="date">{{ hoverCandleInfo.date }}</span>
          <strong class="open">开盘 {{ hoverCandleInfo.open }}</strong>
          <strong class="close">收盘 {{ hoverCandleInfo.close }}</strong>
          <strong class="high">最高 {{ hoverCandleInfo.high }}</strong>
          <strong class="low">最低 {{ hoverCandleInfo.low }}</strong>
        </div>
        <div class="major-turn-html-layer">
          <button
            v-for="label in majorTurnLabels"
            :key="`${label.timestamp}-${label.type}`"
            class="major-turn-label"
            :class="label.type"
            :style="{ left: `${label.x}px`, top: `${label.y}px` }"
            type="button"
            @pointerdown.stop
            @mousedown.stop
            @click.stop="selectMajorTurn(label.turn)"
          >
            {{ label.text }}
          </button>
        </div>
        <transition name="chart-loading-fade">
          <div v-if="isChartLoading" class="chart-loading-mask">
            <span class="chart-loading-spinner"></span>
            <span class="chart-loading-text">加载 K 线中</span>
          </div>
        </transition>
      </div>
    </div>

    <section v-if="false && selectedTurnStats" class="turn-stat-panel">
      <div class="turn-stat-head">
        <div>
          <strong>{{ selectedTurnStats.title }}</strong>
          <span>{{ selectedTurnStats.subtitle }}</span>
        </div>
        <button type="button" class="turn-stat-close" @click="clearSelectedTurnStats">关闭</button>
      </div>

      <div class="turn-stat-table-wrap">
        <table class="turn-stat-table">
          <thead>
            <tr>
              <th>江恩位</th>
              <th>线型</th>
              <th>接近</th>
              <th>受压</th>
              <th>支撑</th>
              <th>跌破/突破</th>
              <th>最近信号</th>
              <th>最近日期</th>
              <th>后续幅度</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in selectedTurnStats.rows" :key="`${row.price}-${row.lineType}-${row.rank}`">
              <td class="price-cell">{{ row.price }}</td>
              <td>{{ row.lineLabel }}</td>
              <td>{{ row.tests }}</td>
              <td>{{ row.rejections }}</td>
              <td>{{ row.supports }}</td>
              <td>{{ row.breaks }}</td>
              <td>{{ row.latestSignal }}</td>
              <td>{{ row.latestDate || "--" }}</td>
              <td>{{ row.latestMove || "--" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ActionType, dispose, init, LineType, LoadDataType, registerOverlay } from "klinecharts";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { buildBacktestLevels } from "../utils/marketBacktest";
import {
  calculateClickTrend,
  findNumberPosition,
  generateGannMatrix,
} from "../utils/gannMatrix";

const props = defineProps({
  symbol: {
    type: String,
    required: true,
  },
  market: {
    type: String,
    default: "us",
  },
  displayName: {
    type: String,
    default: "",
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
  showCrossTrendLevels: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["candle-select", "major-turn-select"]);
let majorTurnMarkerRegistered = false;
const chartHost = ref(null);
let chartApi = null;
let overlayRenderTimer = null;
let majorTurnRenderTimer = null;
let overlayRetryCount = 0;
let requestSerial = 0;
let indicatorPaneIds = [];
let loadedTimestampSet = new Set();
let canLoadMoreHistory = false;
let chartResizeObserver = null;
let resizeFrame = 0;

const MARKET_API_BASE = (
  import.meta.env.VITE_MARKET_API_BASE
  || import.meta.env.VITE_MARKET_PROXY_PREFIX
  || "/api/n1-market"
).replace(/\/$/, "");
const MARKET_KLINE_COUNT = Number(import.meta.env.VITE_MARKET_KLINE_COUNT) || 1000;
const YAHOO_PROXY_PREFIX = (import.meta.env.VITE_YAHOO_PROXY_PREFIX || "/api/yahoo").replace(/\/$/, "");
const KLINE_PAGE_SIZE = Math.min(Math.max(MARKET_KLINE_COUNT, 1), 1000);

const symbolInfo = computed(() => createSymbolInfo(props.symbol, props.market));
const chartTitle = computed(() => props.displayName || symbolInfo.value.name);
const selectedRangeLabel = computed(() => {
  const [from, to] = rangePickerValue.value || [];
  if (!from || !to) return "实时区间";
  return `${formatRangeDate(from)} - ${formatRangeDate(to)}`;
});
const periodKey = ref(periodToKey(props.period));
const activePriceIndicators = ref([...props.priceIndicators]);
const activeSubIndicators = ref([...props.subIndicators]);
const majorTurnList = ref([]);
const majorTurnLabels = ref([]);
const selectedTurnStats = ref(null);
const hoverCandleInfo = ref(null);
const rangePickerValue = ref([]);
const drawingCollapsed = ref(false);
const activeDrawingTool = ref("");
const overlayMode = ref("normal");
const overlaysLocked = ref(false);
const manualOverlaysVisible = ref(true);
const isChartLoading = ref(false);
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
  { label: "1分", value: "1m" },
  { label: "3分", value: "3m" },
  { label: "5分", value: "5m" },
  { label: "15分", value: "15m" },
  { label: "1小时", value: "1h" },
  { label: "3小时", value: "3h" },
  { label: "4小时", value: "4h" },
  { label: "日", value: "day" },
  { label: "周", value: "week" },
  { label: "月", value: "month" },
  { label: "季", value: "quarter" },
  { label: "年", value: "year" },
];
const availablePeriodOptions = [
  { label: "1分", value: "1m" },
  { label: "3分", value: "3m" },
  { label: "5分", value: "5m" },
  { label: "15分", value: "15m" },
  { label: "1小时", value: "1h" },
  { label: "3小时", value: "3h" },
  { label: "4小时", value: "4h" },
  { label: "日", value: "day" },
  { label: "周", value: "week" },
  { label: "月", value: "month" },
  { label: "季", value: "quarter" },
  { label: "年", value: "year" },
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
  () => props.showCrossTrendLevels,
  () => {
    overlayRetryCount = 0;
    scheduleLevelOverlayRender();
  }
);

watch(
  () => props.height,
  () => {
    nextTick(scheduleChartResize);
  }
);

watch(drawingCollapsed, () => {
  nextTick(scheduleChartResize);
});

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

  registerMajorTurnMarker();

  chartApi = init(chartHost.value, {
    timezone: "Asia/Shanghai",
    styles: buildChartStyles(),
  });

  if (!chartApi) return;

  chartApi.subscribeAction(ActionType.OnCandleBarClick, handleCandleClick);
  chartApi.subscribeAction(ActionType.OnDataReady, handleChartDataReady);
  chartApi.subscribeAction(ActionType.OnVisibleRangeChange, handleChartViewportChange);
  chartApi.subscribeAction(ActionType.OnScroll, handleChartViewportChange);
  chartApi.subscribeAction(ActionType.OnZoom, handleChartViewportChange);
  chartApi.setLoadDataCallback?.(handleLoadData);
  chartHost.value.addEventListener("click", handleChartHostClick);
  chartHost.value.addEventListener("mousemove", handleChartMouseMove);
  chartHost.value.addEventListener("mouseleave", clearHoverCandleInfo);
  observeChartResize();
  applyChartSettings();
  reloadChartData();
}

function destroyChart() {
  stopObserveChartResize();

  if (chartApi) {
    chartApi.setLoadDataCallback?.(null);
    chartApi.unsubscribeAction(ActionType.OnCandleBarClick, handleCandleClick);
    chartApi.unsubscribeAction(ActionType.OnDataReady, handleChartDataReady);
    chartApi.unsubscribeAction(ActionType.OnVisibleRangeChange, handleChartViewportChange);
    chartApi.unsubscribeAction(ActionType.OnScroll, handleChartViewportChange);
    chartApi.unsubscribeAction(ActionType.OnZoom, handleChartViewportChange);
    chartHost.value?.removeEventListener("click", handleChartHostClick);
    chartHost.value?.removeEventListener("mousemove", handleChartMouseMove);
    chartHost.value?.removeEventListener("mouseleave", clearHoverCandleInfo);
    chartApi.removeOverlay({ groupId: "gann-levels" });
    chartApi.removeOverlay({ groupId: "major-turns" });
  }

  clearTimeout(overlayRenderTimer);
  clearTimeout(majorTurnRenderTimer);
  overlayRetryCount = 0;

  if (chartHost.value) {
    dispose(chartHost.value);
    chartHost.value.innerHTML = "";
  }

  chartApi = null;
}

function observeChartResize() {
  stopObserveChartResize();

  window.addEventListener("resize", scheduleChartResize);

  if (typeof ResizeObserver === "undefined" || !chartHost.value) {
    return;
  }

  chartResizeObserver = new ResizeObserver(scheduleChartResize);
  chartResizeObserver.observe(chartHost.value);
  if (chartHost.value.parentElement) {
    chartResizeObserver.observe(chartHost.value.parentElement);
  }
}

function stopObserveChartResize() {
  window.removeEventListener("resize", scheduleChartResize);
  chartResizeObserver?.disconnect?.();
  chartResizeObserver = null;

  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
  }
}

function scheduleChartResize() {
  if (resizeFrame) return;

  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0;
    chartApi?.resize?.();
    scheduleLevelOverlayRender();
    scheduleMajorTurnRender();
  });
}

async function reloadChartData() {
  if (!chartApi) return;

  const currentRequest = ++requestSerial;
  canLoadMoreHistory = false;
  isChartLoading.value = true;
  chartApi.setLoadDataCallback?.(null);
  chartApi.removeOverlay({ groupId: "gann-levels" });
  chartApi.removeOverlay({ groupId: "major-turns" });
  selectedTurnStats.value = null;
  clearHoverCandleInfo();
  majorTurnList.value = [];
  majorTurnLabels.value = [];
  chartApi.clearData?.();

  try {
    const range = getInitialLoadRange(activePeriod.value);
    const data = await fetchCloudKLineData(
      symbolInfo.value,
      activePeriod.value,
      range.from,
      range.to,
      KLINE_PAGE_SIZE
    );
    if (currentRequest !== requestSerial || !chartApi) return;

    loadedTimestampSet = new Set(data.map(item => item.timestamp));
    chartApi.applyNewData(data, hasMoreBefore(data[0]?.timestamp, activePeriod.value));
    resetIndicators();
    chartApi.scrollToRealTime?.(0);
    chartApi.resize?.();
    scheduleLevelOverlayRender();
    scheduleMajorTurnRender();
    window.setTimeout(() => {
      if (currentRequest === requestSerial) {
        canLoadMoreHistory = true;
        chartApi?.setLoadDataCallback?.(handleLoadData);
      }
    }, 300);
  } catch (error) {
    if (currentRequest === requestSerial) {
      console.error("K 线数据加载失败:", error);
    }
  } finally {
    if (currentRequest === requestSerial) {
      isChartLoading.value = false;
    }
  }
}

async function handleLoadData(params) {
  if (!chartApi || !params?.callback) return;

  if (!canLoadMoreHistory) {
    params.callback([], false);
    return;
  }

  const edgeTimestamp = Number(params.data?.timestamp);
  if (!Number.isFinite(edgeTimestamp)) {
    params.callback([], false);
    return;
  }

  const pageRange = getPageQueryRange(activePeriod.value, params.type, edgeTimestamp);
  if (!pageRange) {
    params.callback([], false);
    return;
  }

  isChartLoading.value = true;
  try {
    const rows = await fetchCloudKLineData(
      symbolInfo.value,
      activePeriod.value,
      pageRange.from,
      pageRange.to,
      KLINE_PAGE_SIZE
    );
    const uniqueRows = rows.filter(item => !loadedTimestampSet.has(item.timestamp));
    uniqueRows.forEach(item => loadedTimestampSet.add(item.timestamp));

    const more = uniqueRows.length > 0 && (
      params.type === LoadDataType.Forward
        ? hasMoreBefore(uniqueRows[0]?.timestamp, activePeriod.value)
        : hasMoreAfter(uniqueRows.at(-1)?.timestamp, activePeriod.value)
    );

    params.callback(uniqueRows, more);
    scheduleLevelOverlayRender();
    scheduleMajorTurnRender();
  } catch (error) {
    console.warn("分页 K 线加载失败:", error);
    params.callback([], false);
  } finally {
    isChartLoading.value = false;
  }
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

function handleChartDataReady() {
  scheduleLevelOverlayRender();
  scheduleMajorTurnRender();
}

function handleChartViewportChange() {
  scheduleLevelOverlayRender();
  scheduleMajorTurnRender();
}

function scheduleLevelOverlayRender() {
  clearTimeout(overlayRenderTimer);
  overlayRenderTimer = setTimeout(renderLevelOverlays, 120);
}

function scheduleMajorTurnRender() {
  clearTimeout(majorTurnRenderTimer);
  majorTurnRenderTimer = setTimeout(renderMajorTurnOverlays, 160);
}

function renderMajorTurnOverlays() {
  if (!chartApi) return;

  chartApi.removeOverlay({ groupId: "major-turns" });

  const chartList = chartApi.getDataList?.() || [];
  const turns = detectMajorTurns(chartList, activePeriod.value);
  majorTurnList.value = turns;
  updateMajorTurnLabels(turns);
  if (!turns.length) return;

  console.log("大级别转折:", turns.map(turn => ({
    date: timestampToDate(turn.timestamp),
    type: turn.type === "high" ? "顶" : "底",
    price: turn.price,
  })));
}

function updateMajorTurnLabels(turns) {
  if (!chartApi || !chartHost.value || !Array.isArray(turns)) {
    majorTurnLabels.value = [];
    return;
  }

  const hostRect = chartHost.value.getBoundingClientRect();
  const visibleRange = chartApi.getVisibleRange?.();
  const visibleFrom = Number.isFinite(visibleRange?.from) ? Math.floor(visibleRange.from) : -Infinity;
  const visibleTo = Number.isFinite(visibleRange?.to) ? Math.ceil(visibleRange.to) : Infinity;

  majorTurnLabels.value = turns
    .filter(turn => turn.index >= visibleFrom - 1 && turn.index <= visibleTo + 1)
    .map(turn => {
      const point = chartApi.convertToPixel?.({
        dataIndex: turn.index,
        timestamp: turn.timestamp,
        value: turn.price,
      }, { paneId: "candle_pane" });
      const x = Number(point?.x);
      const y = Number(point?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      if (x < 0 || x > hostRect.width || y < 0 || y > hostRect.height) return null;

      const isHigh = turn.type === "high";
      const rawLabelY = isHigh ? y - 42 : y + 18;
      const labelY = Math.max(4, Math.min(hostRect.height - 30, rawLabelY));

      return {
        turn,
        type: turn.type,
        timestamp: turn.timestamp,
        text: `${isHigh ? "顶" : "底"} ${Math.round(turn.price)}`,
        x,
        y: labelY,
      };
    })
    .filter(Boolean);
}

function detectMajorTurns(candles, period) {
  if (!Array.isArray(candles) || candles.length < 80) return [];
  if (period?.timespan === "minute" || period?.timespan === "hour") return [];

  const windowSize = getMajorTurnWindow(period);
  const minMovePct = getMajorTurnMinMove(period, candles);
  const candidates = [];

  for (let index = windowSize; index < candles.length - windowSize; index++) {
    const candle = candles[index];
    const range = candles.slice(index - windowSize, index + windowSize + 1);
    const isHigh = range.every(item => candle.high >= item.high);
    const isLow = range.every(item => candle.low <= item.low);

    if (isHigh) {
      candidates.push({
        type: "high",
        index,
        timestamp: candle.timestamp,
        price: candle.high,
      });
    }

    if (isLow) {
      candidates.push({
        type: "low",
        index,
        timestamp: candle.timestamp,
        price: candle.low,
      });
    }
  }

  return compressMajorTurns(candidates, minMovePct);
}

function compressMajorTurns(candidates, minMovePct) {
  const turns = [];

  candidates.forEach(candidate => {
    const last = turns.at(-1);

    if (!last) {
      turns.push(candidate);
      return;
    }

    if (candidate.type === last.type) {
      const shouldReplace = candidate.type === "high"
        ? candidate.price > last.price
        : candidate.price < last.price;
      if (shouldReplace) {
        turns[turns.length - 1] = candidate;
      }
      return;
    }

    const movePct = Math.abs(candidate.price - last.price) / Math.max(last.price, 1);
    if (movePct >= minMovePct) {
      turns.push(candidate);
    }
  });

  return turns;
}

function getMajorTurnWindow(period) {
  if (period?.timespan === "week") return 5;
  if (period?.timespan === "month" || period?.timespan === "quarter" || period?.timespan === "year") return 3;
  return 10;
}

function getMajorTurnMinMove(period, candles) {
  if (period?.timespan === "week") return 0.12;
  if (period?.timespan === "month" || period?.timespan === "quarter" || period?.timespan === "year") return 0.18;

  const recent = candles.slice(-160);
  const averageRangePct = recent.reduce((total, candle) => {
    const close = Number(candle.close) || 1;
    return total + ((Number(candle.high) - Number(candle.low)) / close);
  }, 0) / Math.max(recent.length, 1);

  return Math.max(0.08, Math.min(0.18, averageRangePct * 4));
}

function createMajorTurnOverlay(turn) {
  const isHigh = turn.type === "high";
  const label = `${isHigh ? "顶" : "底"} ${Math.round(turn.price)}`;
  const tagColor = isHigh ? "#d94141" : "#12875a";

  return {
    name: "majorTurnMarker",
    groupId: "major-turns",
    lock: true,
    visible: true,
    extendData: {
      label,
      type: turn.type,
    },
    points: [{
      dataIndex: turn.index,
      timestamp: turn.timestamp,
      value: turn.price,
    }],
    styles: {
      line: {
        color: tagColor,
        size: 1,
        style: LineType.Dashed,
        dashedValue: [4, 2],
      },
      polygon: {
        color: tagColor,
      },
      text: {
        color: "#ffffff",
        backgroundColor: tagColor,
        borderColor: tagColor,
        borderSize: 1,
        borderRadius: 3,
        paddingLeft: 5,
        paddingRight: 5,
        paddingTop: 3,
        paddingBottom: 3,
        size: 12,
        weight: 800,
      },
    },
    onClick: () => {
      selectMajorTurn(turn);
      return true;
    },
  };
}

function selectMajorTurn(turn) {
  const chartList = chartApi?.getDataList?.() || [];
  const stats = buildMajorTurnStats(turn, chartList);
  const anchorPrice = Math.round(turn.price);
  const direction = turn.type === "low" ? "up" : "down";
  selectedTurnStats.value = stats;
  emit("major-turn-select", {
    turn,
    stats,
    price: anchorPrice,
    direction,
  });
}

function clearSelectedTurnStats() {
  selectedTurnStats.value = null;
}

function buildMajorTurnStats(turn, candles) {
  const direction = turn.type === "high" ? "down" : "up";
  const anchorValue = Math.round(turn.price);
  const levels = buildTurnGannLevels(anchorValue, direction, candles);
  const afterTurnCandles = candles.slice(turn.index + 1);
  const rows = levels.slice(0, 12).map(level => analyzeProjectedLevel(level, afterTurnCandles));

  return {
    title: `${turn.type === "high" ? "顶点" : "底点"} ${anchorValue} 的江恩推演统计`,
    subtitle: `${timestampToDate(turn.timestamp)} · ${direction === "down" ? "向下推演" : "向上推演"} · 容差 0.5% · 后续 5 根K线判断反应`,
    rows,
  };
}

function buildTurnGannLevels(anchorValue, direction, candles) {
  const maxPrice = Math.max(anchorValue, ...candles.map(candle => Number(candle.high) || 0));
  const matrix = generateGannMatrix(1, 1, getGannLoopForPrice(maxPrice));
  const position = findNumberPosition(matrix, anchorValue);
  if (position.r === -1) return [];

  const result = calculateClickTrend(matrix, position.r, position.c, direction);
  const trendFilter = direction === "up"
    ? value => value > result.clickedValue
    : value => value < result.clickedValue;
  const levels = buildBacktestLevels({
    clickedValue: result.clickedValue,
    trendMain: (result.mainLine || []).filter(point => trendFilter(Number(point.value))),
    trendCross: (result.crossLinePoints || []).filter(point => trendFilter(Number(point.value))),
    matrixStep: 1,
    anchorPrice: result.clickedValue,
    priceUnit: 1,
  });

  return rankProjectedTurnLevels(levels, anchorValue, direction);
}

function rankProjectedTurnLevels(levels, anchorValue, direction) {
  const buckets = new Map();

  levels.forEach(level => {
    const price = Math.round(Number(level.price));
    if (!Number.isFinite(price) || price <= 0 || price === anchorValue) return;
    if (direction === "down" && price >= anchorValue) return;
    if (direction === "up" && price <= anchorValue) return;

    const current = buckets.get(price);
    const priority = level.lineType === "main" ? 2 : 1;
    if (!current || priority > current.priority) {
      buckets.set(price, {
        ...level,
        price,
        priority,
        distance: Math.abs(price - anchorValue),
      });
    }
  });

  const lineRank = { main: 0, cross: 0 };
  return [...buckets.values()]
    .sort((a, b) => a.distance - b.distance)
    .map(level => {
      lineRank[level.lineType] += 1;
      return {
        ...level,
        rank: lineRank[level.lineType],
      };
    });
}

function analyzeProjectedLevel(level, candles) {
  const events = findLevelReactionEvents(candles, Number(level.price));
  const latest = events.at(-1);

  return {
    price: Math.round(Number(level.price)),
    lineType: level.lineType,
    lineLabel: `${level.lineType === "main" ? "主线" : "副线"} ${level.rank}`,
    rank: level.rank,
    tests: events.length,
    rejections: events.filter(event => event.kind === "resistance").length,
    supports: events.filter(event => event.kind === "support").length,
    breaks: events.filter(event => event.kind === "break").length,
    latestSignal: latest?.label || "--",
    latestDate: latest?.date || "",
    latestMove: latest ? formatSignedPercent(latest.movePct) : "",
  };
}

function findLevelReactionEvents(candles, price) {
  const tolerancePct = 0.005;
  const reactionBars = 5;
  const reactionPct = 0.03;
  const breakPct = 0.015;
  const contacts = [];

  candles.forEach((candle, index) => {
    const contact = getLevelContact(candle, price, tolerancePct);
    if (contact) {
      contacts.push({ candle, index, contact });
    }
  });

  const events = [];
  for (let index = 0; index < contacts.length; index++) {
    const cluster = [contacts[index]];
    while (index + 1 < contacts.length && contacts[index + 1].index - contacts[index].index <= 2) {
      index += 1;
      cluster.push(contacts[index]);
    }

    const lastContact = cluster.at(-1);
    const future = candles.slice(lastContact.index + 1, lastContact.index + 1 + reactionBars);
    const event = classifyLevelReaction(cluster, future, price, reactionPct, breakPct);
    if (event) events.push(event);
  }

  return events;
}

function getLevelContact(candle, price, tolerancePct) {
  const lower = price * (1 - tolerancePct);
  const upper = price * (1 + tolerancePct);
  const bodyLow = Math.min(Number(candle.open), Number(candle.close));
  const bodyHigh = Math.max(Number(candle.open), Number(candle.close));

  if (bodyLow <= upper && bodyHigh >= lower) return "实体";
  if (Number(candle.high) >= lower && Number(candle.high) <= upper) return "上影";
  if (Number(candle.low) >= lower && Number(candle.low) <= upper) return "下影";
  if (Number(candle.low) <= upper && Number(candle.high) >= lower) return "穿越";
  return "";
}

function classifyLevelReaction(cluster, future, price, reactionPct, breakPct) {
  if (!future.length) return null;

  const first = cluster[0].candle;
  const last = cluster.at(-1).candle;
  const date = first.timestamp === last.timestamp
    ? timestampToDate(first.timestamp)
    : `${timestampToDate(first.timestamp)}~${timestampToDate(last.timestamp)}`;
  const minLow = Math.min(...future.map(candle => Number(candle.low)));
  const maxHigh = Math.max(...future.map(candle => Number(candle.high)));
  const minClose = Math.min(...future.map(candle => Number(candle.close)));
  const maxClose = Math.max(...future.map(candle => Number(candle.close)));
  const downMove = (price - minLow) / price;
  const upMove = (maxHigh - price) / price;
  const closesBelow = minClose < price * (1 - breakPct);
  const closesAbove = maxClose > price * (1 + breakPct);

  if (downMove >= reactionPct && !closesAbove) {
    return {
      date,
      kind: "resistance",
      label: `受压回落（${getClusterContact(cluster)}）`,
      movePct: -downMove,
    };
  }

  if (upMove >= reactionPct && !closesBelow) {
    return {
      date,
      kind: "support",
      label: `支撑拉回（${getClusterContact(cluster)}）`,
      movePct: upMove,
    };
  }

  if (closesBelow || closesAbove) {
    return {
      date,
      kind: "break",
      label: closesBelow ? "收盘跌破" : "收盘突破",
      movePct: closesBelow ? -downMove : upMove,
    };
  }

  return null;
}

function getClusterContact(cluster) {
  if (cluster.some(item => item.contact === "实体")) return "实体";
  if (cluster.some(item => item.contact === "穿越")) return "穿越";
  if (cluster.some(item => item.contact === "上影")) return "上影";
  if (cluster.some(item => item.contact === "下影")) return "下影";
  return cluster[0]?.contact || "";
}

function getGannLoopForPrice(price) {
  return Math.max(80, Math.ceil((Math.sqrt(Math.max(1, price)) - 1) / 2) + 4);
}

function formatSignedPercent(value) {
  const percent = Number(value || 0) * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function registerMajorTurnMarker() {
  if (majorTurnMarkerRegistered) return;
  majorTurnMarkerRegistered = true;

  registerOverlay({
    name: "majorTurnMarker",
    totalStep: 2,
    createPointFigures: ({ overlay, coordinates }) => {
      const point = coordinates[0];
      const isHigh = overlay.extendData?.type === "high";
      const label = overlay.extendData?.label || "";
      const color = isHigh ? "#d94141" : "#12875a";
      const direction = isHigh ? -1 : 1;
      const startY = point.y + direction * 7;
      const lineEndY = startY + direction * 28;
      const labelY = lineEndY + direction * 6;

      return [
        {
          type: "line",
          attrs: { coordinates: [{ x: point.x, y: startY }, { x: point.x, y: lineEndY }] },
          styles: {
            color,
            size: 1,
            style: LineType.Dashed,
            dashedValue: [4, 2],
          },
          ignoreEvent: true,
        },
        {
          type: "polygon",
          attrs: {
            coordinates: isHigh
              ? [
                  { x: point.x, y: lineEndY },
                  { x: point.x - 4, y: lineEndY - 6 },
                  { x: point.x + 4, y: lineEndY - 6 },
                ]
              : [
                  { x: point.x, y: lineEndY },
                  { x: point.x - 4, y: lineEndY + 6 },
                  { x: point.x + 4, y: lineEndY + 6 },
                ],
          },
          styles: { color },
          ignoreEvent: true,
        },
        {
          type: "text",
          attrs: {
            x: point.x,
            y: labelY,
            text: label,
            align: "center",
            baseline: isHigh ? "bottom" : "top",
          },
          styles: {
            color: "#ffffff",
            backgroundColor: color,
            borderColor: color,
            borderSize: 1,
            borderRadius: 3,
            paddingLeft: 5,
            paddingRight: 5,
            paddingTop: 3,
            paddingBottom: 3,
            size: 12,
            weight: 800,
          },
          ignoreEvent: false,
        },
      ];
    },
  });
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

  const overlays = getVisibleGannLevels()
    .slice(0, 60)
    .map(level => createPriceLineOverlay(level, anchorPoint))
    .filter(Boolean);

  const ids = overlays.length ? chartApi.createOverlay(overlays, "candle_pane") : [];
  console.log("九方图推演价格线:", overlays.map(item => item.extendData), ids);
}

const PRICE_LINE_LABEL_POSITION = 0.05; // 你现在想放在左侧 15%
const PRICE_AXIS_WIDTH = 64; // 右侧价格轴宽度，按你的 UI 可以微调 56~72

function getVisibleGannLevels() {
  return (props.levels || []).filter(level => (
    props.showCrossTrendLevels || level.lineType !== "cross"
  ));
}

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

  const isCrossLine = level.lineType === "cross";

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
        size: 2,
        style: isCrossLine ? LineType.Dashed : LineType.Solid,
        dashedValue: isCrossLine ? [6, 4] : [],
      },
      text: {
        color: "#ffffff",
        size: isCrossLine ? 11 : (level.rank <= 2 ? 12 : 11),
        weight: 800,
      },
    },
  };
}

function handleCandleClick(payload) {
  const point = payload?.data || payload?.kLineData || payload?.current || payload;

  const turn = findMajorTurnFromKLinePoint(point);
  if (turn) {
    selectMajorTurn(turn);
  }
}

function handleChartMouseMove(event) {
  if (!chartApi || !chartHost.value) {
    clearHoverCandleInfo();
    return;
  }

  const rect = chartHost.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
    clearHoverCandleInfo();
    return;
  }

  const pixelPoint = chartApi.convertFromPixel?.({ x, y }, { paneId: "candle_pane" })
    || chartApi.convertFromPixel?.({ x }, { paneId: "candle_pane" });
  const dataIndex = Math.round(Number(pixelPoint?.dataIndex));
  const chartList = chartApi.getDataList?.() || [];
  const candle = Number.isFinite(dataIndex) ? chartList[dataIndex] : null;

  if (!candle || !isValidKLineData(candle)) {
    clearHoverCandleInfo();
    return;
  }

  hoverCandleInfo.value = {
    date: timestampToDate(candle.timestamp),
    open: formatPrice(candle.open),
    close: formatPrice(candle.close),
    high: formatPrice(candle.high),
    low: formatPrice(candle.low),
  };
}

function clearHoverCandleInfo() {
  hoverCandleInfo.value = null;
}

function handleChartHostClick(event) {
  if (!chartApi || !chartHost.value || !majorTurnList.value.length) return;

  const rect = chartHost.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const point = chartApi.convertFromPixel?.({ x }, { paneId: "candle_pane" });
  const dataIndex = Math.round(Number(point?.dataIndex));

  if (!Number.isFinite(dataIndex)) return;

  const turn = findNearestMajorTurnByIndex(dataIndex, 2);
  if (turn) {
    selectMajorTurn(turn);
  }
}

function findMajorTurnFromKLinePoint(point) {
  const timestamp = Number(point?.timestamp);
  if (Number.isFinite(timestamp)) {
    const exact = majorTurnList.value.find(item => Number(item.timestamp) === timestamp);
    if (exact) return exact;
  }

  const chartList = chartApi?.getDataList?.() || [];
  const dataIndex = chartList.findIndex(item => Number(item.timestamp) === timestamp);
  return dataIndex >= 0 ? findNearestMajorTurnByIndex(dataIndex, 1) : null;
}

function findNearestMajorTurnByIndex(dataIndex, tolerance) {
  return majorTurnList.value.reduce((best, turn) => {
    const distance = Math.abs(Number(turn.index) - dataIndex);
    if (distance > tolerance) return best;
    if (!best || distance < best.distance) {
      return { turn, distance };
    }
    return best;
  }, null)?.turn || null;
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

async function fetchCloudKLineData(symbol, period, from, to, count = KLINE_PAGE_SIZE) {
  try {
    const customData = await fetchCustomCloudData(symbol, period, from, to, count);
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

async function fetchCustomCloudData(symbol, period, from, to, count = KLINE_PAGE_SIZE) {
  const origin = globalThis.location?.origin || "http://localhost";
  const url = new URL(
    `${MARKET_API_BASE}/api/kline/${getMarketPeriodPath(period)}/${encodeURIComponent(toMarketDataSymbol(symbol))}`,
    origin
  );
  url.searchParams.set("count", String(count));
  url.searchParams.set("refresh", "1");
  url.searchParams.set("from", String(Math.floor(normalizeRangeTime(from))));
  url.searchParams.set("to", String(Math.floor(normalizeRangeTime(to))));

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) return [];

  const json = await response.json();
  return filterRowsByRange(normalizeCloudRows(getCloudKLineRows(json)), from, to);
}

async function fetchYahooKLineData(symbol, period, from, to) {
  const interval = getYahooInterval(period);
  const { from: period1, to: period2 } = normalizeQueryRange(from, to);
  const url = `${YAHOO_PROXY_PREFIX}/v8/finance/chart/${encodeURIComponent(symbol.ticker)}?period1=${period1}&period2=${period2}&interval=${interval}&events=history`;
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

function getCloudKLineRows(json) {
  return json?.data?.klines
    || json?.data?.items
    || json?.data?.candles
    || json?.klines
    || json?.items
    || json?.candles
    || json?.data
    || json;
}

function normalizeCloudRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(normalizeCloudRow)
    .filter(isValidKLineData)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function normalizeCloudRow(item) {
  if (typeof item === "string") {
    const fields = item.split(",");
    return normalizeCloudArrayRow(fields);
  }

  if (Array.isArray(item)) {
    return normalizeCloudArrayRow(item);
  }

  return {
    timestamp: normalizeTimestamp(item.timestamp ?? item.time ?? item.date ?? item.day),
    open: Number(item.open ?? item.o),
    high: Number(item.high ?? item.h),
    low: Number(item.low ?? item.l),
    close: Number(item.close ?? item.c),
    volume: Number(item.volume ?? item.vol ?? item.v) || 0,
    turnover: Number(item.turnover ?? item.amount ?? item.amt) || 0,
  };
}

function normalizeCloudArrayRow(fields) {
  const [date, open, close, high, low, volume, turnover] = fields;
  return {
    timestamp: normalizeTimestamp(date),
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume) || 0,
    turnover: Number(turnover) || 0,
  };
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
  const isQuarter = period?.timespan === "quarter";
  const from = to - 86400 * 1000 * (isMinute ? 60 : isHour ? 365 : isYear || isQuarter ? 365 * 12 : 365 * 5);
  return { from, to };
}

function getActiveQueryRange(period) {
  return getManualQueryRange() || getInitialRange(period);
}

function getInitialLoadRange(period) {
  const activeRange = getManualQueryRange() || { from: 0, to: Date.now() };
  const pageSpan = getPageSpanMs(period);
  const to = activeRange.to;
  const from = Math.max(activeRange.from, to - pageSpan);
  return { from, to };
}

function getManualQueryRange() {
  const [from, to] = rangePickerValue.value || [];
  const normalizedFrom = normalizeRangeTime(from);
  const normalizedTo = normalizeRangeTime(to);

  if (normalizedFrom && normalizedTo && normalizedTo > normalizedFrom) {
    return { from: normalizedFrom, to: normalizedTo };
  }

  return null;
}

function getPageQueryRange(period, type, edgeTimestamp) {
  const activeRange = getManualQueryRange() || { from: 0, to: Date.now() };
  const pageSpan = getPageSpanMs(period);
  const periodMs = getPeriodDurationMs(period);

  if (type === LoadDataType.Forward) {
    const to = Math.min(edgeTimestamp - periodMs, activeRange.to);
    const from = Math.max(activeRange.from, to - pageSpan);
    return to > activeRange.from ? { from, to } : null;
  }

  if (type === LoadDataType.Backward) {
    const from = Math.max(edgeTimestamp + periodMs, activeRange.from);
    const to = Math.min(activeRange.to, from + pageSpan);
    return from < activeRange.to ? { from, to } : null;
  }

  return null;
}

function getPageSpanMs(period) {
  return getPeriodDurationMs(period) * KLINE_PAGE_SIZE * 1.35;
}

function getPeriodDurationMs(period) {
  const multiplier = Number(period?.multiplier) || 1;
  if (period?.timespan === "minute") return multiplier * 60 * 1000;
  if (period?.timespan === "hour") return multiplier * 60 * 60 * 1000;
  if (period?.timespan === "week") return 7 * 86400 * 1000;
  if (period?.timespan === "month") return 31 * 86400 * 1000;
  if (period?.timespan === "quarter") return 92 * 86400 * 1000;
  if (period?.timespan === "year") return 366 * 86400 * 1000;
  return 86400 * 1000;
}

function hasMoreBefore(timestamp, period) {
  const first = normalizeRangeTime(timestamp);
  if (!first) return false;
  const activeRange = getManualQueryRange() || { from: 0 };
  return first - getPeriodDurationMs(period) > activeRange.from;
}

function hasMoreAfter(timestamp, period) {
  const last = normalizeRangeTime(timestamp);
  if (!last) return false;
  const activeRange = getManualQueryRange() || { to: Date.now() };
  return last + getPeriodDurationMs(period) < activeRange.to;
}

function filterRowsByRange(rows, from, to) {
  const start = normalizeRangeTime(from);
  const end = normalizeRangeTime(to);
  return (rows || []).filter(item => item.timestamp >= start && item.timestamp <= end);
}

function setQuickRange(days) {
  const to = Date.now();
  const from = to - Number(days) * 86400 * 1000;
  rangePickerValue.value = [String(from), String(to)];
  reloadChartData();
}

function clearTimeRange() {
  rangePickerValue.value = [];
  reloadChartData();
}

function formatRangeDate(value) {
  const timestamp = normalizeRangeTime(value);
  if (!timestamp) return "";
  return new Date(timestamp).toISOString().slice(0, 10);
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
  if (period?.timespan === "year" || period?.timespan === "quarter") return "3mo";
  if (period?.timespan === "week") return "1wk";
  if (period?.timespan === "month") return "1mo";
  return "1d";
}

function getMarketPeriodPath(period) {
  return period?.apiPeriod || "day";
}

function parsePeriod(value) {
  const periodMap = {
    "1m": { multiplier: 1, timespan: "minute", text: "1分钟", apiPeriod: "1m" },
    "2m": { multiplier: 2, timespan: "minute", text: "2分钟", apiPeriod: "2m" },
    "3m": { multiplier: 3, timespan: "minute", text: "3分钟", apiPeriod: "3m" },
    "5m": { multiplier: 5, timespan: "minute", text: "5分钟", apiPeriod: "5m" },
    "10m": { multiplier: 10, timespan: "minute", text: "10分钟", apiPeriod: "10m" },
    "15m": { multiplier: 15, timespan: "minute", text: "15分钟", apiPeriod: "15m" },
    "20m": { multiplier: 20, timespan: "minute", text: "20分钟", apiPeriod: "20m" },
    "30m": { multiplier: 30, timespan: "minute", text: "30分钟", apiPeriod: "30m" },
    "45m": { multiplier: 45, timespan: "minute", text: "45分钟", apiPeriod: "45m" },
    "1h": { multiplier: 1, timespan: "hour", text: "1小时", apiPeriod: "1h" },
    "2h": { multiplier: 2, timespan: "hour", text: "2小时", apiPeriod: "2h" },
    "3h": { multiplier: 3, timespan: "hour", text: "3小时", apiPeriod: "3h" },
    "4h": { multiplier: 4, timespan: "hour", text: "4小时", apiPeriod: "4h" },
    "day": { multiplier: 1, timespan: "day", text: "日线", apiPeriod: "day" },
    "1d": { multiplier: 1, timespan: "day", text: "日线", apiPeriod: "day" },
    "week": { multiplier: 1, timespan: "week", text: "周线", apiPeriod: "week" },
    "1w": { multiplier: 1, timespan: "week", text: "周线", apiPeriod: "week" },
    "month": { multiplier: 1, timespan: "month", text: "月线", apiPeriod: "month" },
    "1M": { multiplier: 1, timespan: "month", text: "月线", apiPeriod: "month" },
    "quarter": { multiplier: 1, timespan: "quarter", text: "季线", apiPeriod: "quarter" },
    "year": { multiplier: 1, timespan: "year", text: "年线", apiPeriod: "year" },
    "1y": { multiplier: 1, timespan: "year", text: "年线", apiPeriod: "year" },
  };
  return periodMap[value] || periodMap.day;
}

function periodToKey(period) {
  if (period?.apiPeriod) return period.apiPeriod;
  if (period?.timespan === "minute") return `${period.multiplier || 1}m`;
  if (period?.timespan === "hour") return `${period.multiplier || 1}h`;
  if (period?.timespan === "week") return "week";
  if (period?.timespan === "month") return "month";
  if (period?.timespan === "quarter") return "quarter";
  if (period?.timespan === "year") return "year";
  return "day";
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

function toMarketDataSymbol(symbol) {
  const raw = String(symbol.name || symbol.ticker || "").trim().toUpperCase();
  if (raw.includes(".")) return raw;

  if (symbol.market === "hk") {
    const digits = raw.replace(/\D/g, "");
    return `${String(Number(digits || 0)).padStart(4, "0")}.HK`;
  }

  if (symbol.market === "cn") {
    return `${raw}.${raw.startsWith("6") ? "SH" : "SZ"}`;
  }

  return `${raw}.US`;
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
        high: { show: true, color: "#c93636", textOffset: 8, textSize: 15, textWeight: "800" },
        low: { show: true, color: "#118357", textOffset: 8, textSize: 15, textWeight: "800" },
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  margin: 0 3px;
  padding: 0 9px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
  line-height: 30px;
  white-space: nowrap;
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

.period-button {
  min-width: 30px;
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

.kline-body.collapsed {
  grid-template-columns: minmax(0, 1fr);
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

.range-entry {
  min-width: 92px;
}

.range-panel {
  display: grid;
  gap: 12px;
}

.range-panel :deep(.el-date-editor) {
  width: 100%;
}

.range-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.range-action {
  height: 30px;
  padding: 0 11px;
  border: 1px solid #d9e2f0;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.range-action:hover {
  border-color: #2f5bff;
  color: #2f5bff;
}

.kline-host {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.kline-chart-stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.candle-hover-card {
  position: absolute;
  top: 10px;
  right: 65px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  max-width: min(620px, calc(100% - 120px));
  padding: 7px;
  border: 1px solid rgba(34, 44, 74, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  color: #344054;
  font-size: 12px;
  line-height: 1.2;
  pointer-events: none;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(4px);
}

.candle-hover-card span,
.candle-hover-card strong {
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  padding: 0 7px;
  border-radius: 5px;
  white-space: nowrap;
}

.candle-hover-card .date {
  background: #f2f4f7;
  color: #667085;
  font-weight: 800;
}

.candle-hover-card strong {
  font-weight: 900;
}

.candle-hover-card .open {
  background: #eef4ff;
  color: #2d5bce;
}

.candle-hover-card .close {
  background: #fff1f3;
  color: #c93636;
}

.candle-hover-card .high {
  background: #fef6e7;
  color: #b85d00;
}

.candle-hover-card .low {
  background: #eaf8f1;
  color: #12875a;
}

.major-turn-html-layer {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

.major-turn-label {
  position: absolute;
  min-width: 42px;
  min-height: 24px;
  padding: 3px 6px;
  border: 0;
  border-radius: 4px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
  transform: translateX(-50%);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
}

.major-turn-label.high {
  background: #d94141;
}

.major-turn-label.low {
  background: #12875a;
}

.major-turn-label::before,
.major-turn-label::after {
  position: absolute;
  left: 50%;
  content: "";
  pointer-events: none;
  transform: translateX(-50%);
}

.major-turn-label::before {
  width: 2px;
  height: 18px;
  border-radius: 999px;
}

.major-turn-label.high::before {
  top: 100%;
  background: #d94141;
}

.major-turn-label.low::before {
  bottom: 100%;
  background: #12875a;
}

.major-turn-label.high::after {
  top: calc(100% + 16px);
  border-right: 5px solid transparent;
  border-left: 5px solid transparent;
  border-top: 6px solid #d94141;
}

.major-turn-label.low::after {
  bottom: calc(100% + 16px);
  border-right: 5px solid transparent;
  border-left: 5px solid transparent;
  border-bottom: 6px solid #12875a;
}

.major-turn-label:hover {
  filter: brightness(1.06);
}

.chart-loading-mask {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.66);
  color: #1f2a44;
  font-size: 14px;
  font-weight: 700;
  pointer-events: none;
  backdrop-filter: blur(2px);
}

.chart-loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(47, 91, 255, 0.18);
  border-top-color: #2f5bff;
  border-radius: 999px;
  animation: chart-spin 0.8s linear infinite;
}

.chart-loading-text {
  line-height: 1;
}

.turn-stat-panel {
  border-top: 1px solid #ebedf1;
  background: #ffffff;
}

.turn-stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #ebedf1;
}

.turn-stat-head strong {
  display: block;
  color: #101828;
  font-size: 14px;
}

.turn-stat-head span {
  display: block;
  margin-top: 2px;
  color: #667085;
  font-size: 12px;
}

.turn-stat-close {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d9e2f0;
  border-radius: 6px;
  background: #ffffff;
  color: #344054;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.turn-stat-close:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.turn-stat-table-wrap {
  overflow-x: auto;
}

.turn-stat-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
  font-size: 12px;
}

.turn-stat-table th,
.turn-stat-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #eef1f5;
  color: #344054;
  text-align: left;
  white-space: nowrap;
}

.turn-stat-table th {
  background: #f8fafc;
  color: #667085;
  font-weight: 800;
}

.turn-stat-table .price-cell {
  color: #101828;
  font-size: 13px;
  font-weight: 900;
}

.chart-loading-fade-enter-active,
.chart-loading-fade-leave-active {
  transition: opacity 0.16s ease;
}

.chart-loading-fade-enter-from,
.chart-loading-fade-leave-to {
  opacity: 0;
}

@keyframes chart-spin {
  to {
    transform: rotate(360deg);
  }
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

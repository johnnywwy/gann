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
      <div class="field-card price-action-card">
        <span class="field-label">价格点位</span>
        <div class="price-action-row">
          <el-input-number v-model="marketForm.anchorPrice" :precision="0" :step="1" :min="0" size="large" />
          <el-button type="primary" size="large" @click="projectFromInput">推演</el-button>
        </div>
      </div>

      <div class="field-card action-card">
        <span class="field-label">趋势方向</span>
        <el-segmented v-model="trendDirectionModel" :options="trendDirectionOptions" size="large" />
      </div>
    </div>

    <div
      class="chart-workspace"
      :style="{
        '--watchlist-width': `${watchlistWidth}px`,
        '--chart-workspace-height': `${marketForm.chartHeight + 56}px`,
      }"
    >
      <aside class="watchlist-panel">
        <div class="watchlist-search">
          <el-input
            v-model.trim="stockSearch"
            placeholder="搜索中文名 / 代码"
            clearable
            size="large"
          />
        </div>

        <div class="watchlist-tabs">
          <button
            v-for="group in stockGroups"
            :key="group.key"
            class="watchlist-tab"
            :class="{ active: activeStockGroup === group.key }"
            type="button"
            @click="activeStockGroup = group.key"
          >
            <span>{{ group.label }}</span>
            <em>{{ stockGroupCounts[group.key] || 0 }}</em>
          </button>
        </div>

        <div class="watchlist-body">
          <button
            v-for="stock in activeStockList"
            :key="`${stock.market}:${stock.symbol}`"
            class="stock-row"
            :class="{ active: isActiveStock(stock) }"
            type="button"
            @click="selectStock(stock)"
          >
            <span class="stock-info">
              <strong>{{ stock.displayName || stock.name || stock.symbol }}</strong>
              <small>{{ stock.symbol }}</small>
            </span>
            <span class="stock-price">{{ stock.latestPrice || "--" }}</span>
          </button>

          <div v-if="!activeStockList.length" class="stock-empty">
            {{ stocksLoading ? "加载中..." : "暂无自选股" }}
          </div>
        </div>

        <button
          class="watchlist-resizer"
          type="button"
          title="拖动调整自选股宽度"
          @pointerdown="startResizeWatchlist"
        ></button>
      </aside>

      <KLineChartView
        class="chart-shell"
        :symbol="marketForm.symbol || 'STOCK'"
        :market="marketModel"
        :levels="rankedChartLevels"
        :height="marketForm.chartHeight"
        :period="activePeriod"
        :chart-settings="chartSettings"
        :price-indicators="priceIndicators"
        :sub-indicators="subIndicators"
        :display-name="selectedStockDisplayName"
        @candle-select="handleCandleSelect"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import KLineChartView from "./KLineChartView.vue";

const props = defineProps({
  marketForm: {
    type: Object,
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
});

const emit = defineEmits(["price-select", "price-project"]);
const marketModel = defineModel("market", {
  type: String,
  default: "us",
});
const stockSymbolModel = defineModel("stockSymbol", {
  type: String,
  default: "AAPL",
});
const trendDirectionModel = defineModel("trendDirection", {
  type: String,
  default: "down",
});

const marketOptions = [
  { label: "美股", value: "us" },
  { label: "A股", value: "cn" },
  { label: "港股", value: "hk" },
];
const stockGroups = marketOptions.map(item => ({
  label: item.label,
  key: item.value,
}));
const trendDirectionOptions = [
  { label: "上升", value: "up" },
  { label: "下降", value: "down" },
];
const MARKET_API_BASE = (import.meta.env.VITE_MARKET_API_BASE || "").replace(/\/$/, "");
const STOCK_LIST_PATH = import.meta.env.VITE_STOCK_LIST_PATH || "/api/stocks";
const periodKey = ref("day");
const priceIndicators = ref(["MA"]);
const subIndicators = ref(["VOL", "MACD"]);
const chartSettings = reactive({
  barSpace: 8,
  rightSpace: 86,
  pricePrecision: 2,
  yAxisType: "normal",
  yAxisPosition: "right",
  yAxisReverse: false,
  zoomEnabled: true,
  scrollEnabled: true,
});

const activeStockGroup = ref("us");
const stocksLoading = ref(false);
const stockSearch = ref("");
const selectedStockDisplayName = ref("");
const watchlistWidth = ref(340);
const resizeState = reactive({
  active: false,
  startX: 0,
  startWidth: 340,
});
const stockLists = reactive({
  us: [],
  cn: [],
  hk: [],
  usOptions: [],
  other: [],
});
const stockGroupCounts = reactive({
  us: 0,
  cn: 0,
  hk: 0,
  usOptions: 0,
  other: 0,
});
const activePeriod = computed(() => parsePeriod(periodKey.value));
const activeStockList = computed(() => {
  const rows = stockLists[activeStockGroup.value] || [];
  const keyword = stockSearch.value.trim().toLowerCase();
  if (!keyword) return rows;

  return rows.filter(stock => {
    const text = [
      stock.symbol,
      stock.name,
      stock.displayName,
    ].join(" ").toLowerCase();
    return text.includes(keyword);
  });
});
const rankedChartLevels = computed(() => (
  rankProjectedLevels(props.chartLevels, props.marketForm.anchorPrice)
));

onMounted(() => {
  loadWatchlist();
});

onBeforeUnmount(() => {
  stopResizeWatchlist();
});

async function loadWatchlist() {
  stocksLoading.value = true;

  try {
    const origin = globalThis.location?.origin || "http://localhost";
    const url = new URL(`${MARKET_API_BASE}${STOCK_LIST_PATH}`, origin);
    const response = await fetch(url.toString());
    if (!response.ok) return;

    const json = await response.json();
    applyStockPayload(json?.data ?? json);
  } catch (error) {
    console.warn("自选股列表获取失败。", error);
  } finally {
    stocksLoading.value = false;
  }
}

function applyStockPayload(payload) {
  const categories = payload?.categories && typeof payload.categories === "object"
    ? payload.categories
    : payload;
  const counts = payload?.counts && typeof payload.counts === "object"
    ? payload.counts
    : payload;

  stockGroups.forEach(group => {
    const source = categories?.[group.key] ?? categories?.[toBackendStockGroupKey(group.key)];
    const rows = normalizeStockRows(source, group.key);

    stockLists[group.key] = rows;
    stockGroupCounts[group.key] = rows.length || Number(counts?.[group.key]) || 0;
  });

  if (Array.isArray(payload?.stocks)) {
    payload.stocks.forEach(item => {
      const stock = normalizeStockItem(item);
      if (!stock.symbol || !stockLists[stock.market]) return;

      stockLists[stock.market].push(stock);
      stockGroupCounts[stock.market] = stockLists[stock.market].length;
    });
  } else if (payload?.stocks && typeof payload.stocks === "object") {
    applyStockPayload(payload.stocks);
  }
}

function normalizeStockRows(source, market) {
  if (!Array.isArray(source)) return [];
  return source
    .map(item => normalizeStockItem(item, market))
    .filter(item => isVisibleStock(item, market))
    .filter(item => item.symbol);
}

function normalizeStockItem(item, fallbackMarket = "us") {
  if (typeof item === "string") {
    return {
      symbol: item.toUpperCase(),
      name: "",
      market: fallbackMarket,
    };
  }

  const rawMarket = item.market ?? item.type ?? item.category ?? fallbackMarket;
  return {
    symbol: String(item.symbol ?? item.code ?? item.ticker ?? item.name ?? "").trim().toUpperCase(),
    name: item.name ?? item.title ?? item.label ?? "",
    displayName: item.nameCn || item.nameHk || item.nameEn || item.name || item.title || item.label || "",
    market: normalizeStockMarket(rawMarket),
    board: item.board || "",
    exchange: item.exchange || "",
    latestPrice: item.lastPrice ?? item.latestPrice ?? item.price ?? item.watchedPrice ?? "",
    changePercent: item.changePercent ?? item.changeRate ?? item.pctChange ?? item.chgPct ?? item.percent ?? null,
  };
}

function isVisibleStock(stock, groupMarket) {
  if (!["us", "cn", "hk"].includes(groupMarket)) return false;
  if (groupMarket !== "us") return true;

  return !String(stock.board || "").toLowerCase().includes("option");
}

function normalizeStockMarket(value) {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (["cn", "a", "ashare", "a股"].includes(lower)) return "cn";
  if (["hk", "港股"].includes(lower)) return "hk";
  if (["usoptions", "option", "options", "期权"].includes(lower)) return "usOptions";
  if (["other", "其他"].includes(lower)) return "other";
  return "us";
}

function toBackendStockGroupKey(value) {
  if (value === "usOptions") return "options";
  return value;
}

function selectStock(stock) {
  const nextMarket = stock.market;
  const nextSymbol = stock.symbol;
  const isSameStock = (
    nextMarket === marketModel.value &&
    String(nextSymbol || "").toUpperCase() === String(stockSymbolModel.value || "").toUpperCase()
  );

  if (!isSameStock) {
    props.marketForm.anchorPrice = null;
  }

  marketModel.value = nextMarket;
  stockSymbolModel.value = nextSymbol;
  selectedStockDisplayName.value = stock.displayName || stock.name || stock.symbol;
}

function isActiveStock(stock) {
  return stock.market === marketModel.value && stock.symbol === String(stockSymbolModel.value || "").toUpperCase();
}

function startResizeWatchlist(event) {
  resizeState.active = true;
  resizeState.startX = event.clientX;
  resizeState.startWidth = watchlistWidth.value;
  event.currentTarget?.setPointerCapture?.(event.pointerId);
  window.addEventListener("pointermove", resizeWatchlist);
  window.addEventListener("pointerup", stopResizeWatchlist);
}

function resizeWatchlist(event) {
  if (!resizeState.active) return;

  const nextWidth = resizeState.startWidth + event.clientX - resizeState.startX;
  watchlistWidth.value = Math.min(600, Math.max(260, nextWidth));
}

function stopResizeWatchlist() {
  resizeState.active = false;
  window.removeEventListener("pointermove", resizeWatchlist);
  window.removeEventListener("pointerup", stopResizeWatchlist);
}

function projectFromInput() {
  const price = Number(props.marketForm.anchorPrice);
  if (!Number.isFinite(price) || price <= 0) return;

  emit("price-project", price);
}

function handleCandleSelect(point) {
  emit("price-select", point);
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
    "week": { multiplier: 1, timespan: "week", text: "周线", apiPeriod: "week" },
    "month": { multiplier: 1, timespan: "month", text: "月线", apiPeriod: "month" },
    "quarter": { multiplier: 1, timespan: "quarter", text: "季线", apiPeriod: "quarter" },
    "year": { multiplier: 1, timespan: "year", text: "年线", apiPeriod: "year" },
  };
  return periodMap[value] || periodMap.day;
}

function rankProjectedLevels(levels, anchorPrice) {
  if (anchorPrice === null || anchorPrice === undefined || anchorPrice === "") return [];

  const anchor = Number(anchorPrice);
  if (!Number.isFinite(anchor) || anchor <= 0) return [];

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

function formatPrice(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : value;
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
.watchlist-panel,
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
  grid-template-columns: minmax(260px, 1.2fr) minmax(220px, 0.8fr);
  gap: 10px;
}

.field-card,
.control-block {
  display: grid;
  gap: 9px;
  padding: 12px;
}

.field-label {
  font-size: 14px;
  font-weight: 800;
}

.price-action-row {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) auto;
  gap: 8px;
  align-items: center;
}

:deep(.el-input-number),
:deep(.el-select),
:deep(.el-segmented),
:deep(.el-slider) {
  width: 100%;
}

.chart-workspace {
  display: grid;
  grid-template-columns: var(--watchlist-width, 340px) minmax(0, 1fr);
  gap: 10px;
  height: var(--chart-workspace-height);
  align-items: stretch;
}

.watchlist-panel {
  position: relative;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  min-height: 0;
  height: 100%;
  overflow: visible;
}

.watchlist-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid rgba(34, 44, 74, 0.08);
  overflow: hidden;
}

.watchlist-search {
  padding: 8px;
  border-bottom: 1px solid rgba(34, 44, 74, 0.08);
}

.watchlist-tab {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  min-height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #475467;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.watchlist-resizer {
  position: absolute;
  top: 0;
  right: -7px;
  z-index: 2;
  width: 12px;
  height: 100%;
  border: 0;
  background: transparent;
  cursor: col-resize;
}

.watchlist-resizer::after {
  position: absolute;
  top: 50%;
  left: 5px;
  width: 2px;
  height: 46px;
  border-radius: 999px;
  background: rgba(22, 119, 255, 0.24);
  content: "";
  transform: translateY(-50%);
}

.watchlist-resizer:hover::after {
  background: rgba(22, 119, 255, 0.55);
}

.watchlist-tab em {
  color: #98a2b3;
  font-style: normal;
  font-size: 11px;
}

.watchlist-tab:hover,
.watchlist-tab.active {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.12);
}

.watchlist-tab.active em {
  color: #1677ff;
}

.watchlist-body {
  display: grid;
  align-content: start;
  gap: 4px;
  min-height: 0;
  padding: 8px;
  overflow-y: auto;
  scrollbar-color: rgba(102, 112, 133, 0.32) transparent;
  scrollbar-width: thin;
}

.watchlist-body::-webkit-scrollbar {
  width: 6px;
}

.watchlist-body::-webkit-scrollbar-track {
  background: transparent;
}

.watchlist-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(102, 112, 133, 0.28);
}

.watchlist-body::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 112, 133, 0.42);
}

.stock-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(68px, auto);
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #1d2939;
  text-align: left;
  cursor: pointer;
}

.stock-row:nth-child(even) {
  background: rgba(20, 34, 60, 0.035);
}

.stock-info {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.stock-info strong {
  overflow: hidden;
  font-size: 13px;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-info small {
  overflow: hidden;
  color: #667085;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-price {
  justify-self: end;
  color: #344054;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.stock-row:hover,
.stock-row.active {
  background: rgba(22, 119, 255, 0.12);
}

.stock-row.active strong {
  color: #1677ff;
}

.stock-empty {
  padding: 18px 8px;
  color: #98a2b3;
  font-size: 13px;
  text-align: center;
}

.chart-shell {
  padding: 8px;
  overflow: hidden;
}

@media (max-width: 1180px) {
  .toolbar-grid {
    grid-template-columns: 1fr 1fr;
  }

  .chart-workspace {
    grid-template-columns: minmax(260px, var(--watchlist-width, 340px)) minmax(0, 1fr);
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

  .price-action-row {
    grid-template-columns: 1fr;
  }

  .chart-workspace {
    grid-template-columns: 1fr;
    height: auto;
  }

  .watchlist-panel {
    min-height: 0;
    overflow: hidden;
  }

  .watchlist-tabs {
    grid-template-columns: repeat(3, minmax(62px, 1fr));
    overflow-x: auto;
  }

  .watchlist-resizer {
    display: none;
  }

  .watchlist-body {
    grid-auto-flow: column;
    grid-auto-columns: minmax(116px, 1fr);
    overflow-x: auto;
    overflow-y: hidden;
  }
}
</style>

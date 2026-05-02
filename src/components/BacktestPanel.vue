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
        <span class="field-label">市场</span>
        <el-select v-model="marketModel" placeholder="选择市场" size="large">
          <el-option
            v-for="option in marketOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </label>

      <label class="field-card symbol-card">
        <span class="field-label">股票代码</span>
        <el-input
          v-model.trim="stockSymbolModel"
          placeholder="AAPL / 600519 / 00700"
          clearable
          size="large"
        />
      </label>

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
      @candle-select="handleCandleSelect"
    />
  </section>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
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
const trendDirectionOptions = [
  { label: "上升", value: "up" },
  { label: "下降", value: "down" },
];
const periodKey = ref("1d");
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

const activePeriod = computed(() => parsePeriod(periodKey.value));
const rankedChartLevels = computed(() => (
  rankProjectedLevels(props.chartLevels, props.marketForm.anchorPrice)
));

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
    "1m": { multiplier: 1, timespan: "minute", text: "1分钟" },
    "3m": { multiplier: 3, timespan: "minute", text: "3分钟" },
    "5m": { multiplier: 5, timespan: "minute", text: "5分钟" },
    "10m": { multiplier: 10, timespan: "minute", text: "10分钟" },
    "15m": { multiplier: 15, timespan: "minute", text: "15分钟" },
    "1w": { multiplier: 1, timespan: "week", text: "周线" },
    "1M": { multiplier: 1, timespan: "month", text: "月线" },
  };
  return periodMap[value] || { multiplier: 1, timespan: "day", text: "日线" };
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
  grid-template-columns: 0.78fr 1.12fr 1.35fr 0.88fr;
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

.chart-shell {
  padding: 8px;
  overflow: hidden;
}

@media (max-width: 1180px) {
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

  .price-action-row {
    grid-template-columns: 1fr;
  }
}
</style>

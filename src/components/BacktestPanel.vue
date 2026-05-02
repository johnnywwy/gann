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
        <el-cascader
          v-model="stockPathModel"
          :options="stockCatalog"
          placeholder="选择行业 / 标的"
          clearable
          filterable
          style="width: 100%;"
        />
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
        <el-segmented v-model="trendDirectionModel" :options="trendDirectionOptions" />
      </div>

      <label class="field-card">
        <span class="field-label">K线高度</span>
        <el-slider v-model="marketForm.chartHeight" :min="500" :max="3000" :step="20" />
      </label>
    </div>

    <KLineChartView
      class="chart-shell"
      :symbol="marketForm.symbol || 'STOCK'"
      :candles="candles"
      :levels="rankedChartLevels"
      :height="marketForm.chartHeight"
      @candle-select="handleCandleSelect"
    />
  </section>
</template>

<script setup>
import { computed } from "vue";
import KLineChartView from "./KLineChartView.vue";

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
});

const emit = defineEmits(["price-select", "price-project"]);
const stockPathModel = defineModel("stockPath", {
  type: Array,
  default: () => [],
});
const trendDirectionModel = defineModel("trendDirection", {
  type: String,
  default: "down",
});

const trendDirectionOptions = [
  { label: "上升", value: "up" },
  { label: "下降", value: "down" },
];

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
  grid-template-columns: 1.1fr 1.55fr 1fr 1fr;
  gap: 10px;
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

.price-action-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto;
  gap: 8px;
  align-items: center;
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
  padding: 8px;
  overflow: hidden;
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
}
</style>

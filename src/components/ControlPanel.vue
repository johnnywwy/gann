<template>
  <aside class="control-panel">
    <section class="panel-block">
      <div class="section-heading">
        <h2>基础参数</h2>
        <p>控制中心点、步进与矩阵圈数。</p>
      </div>

      <div class="field-grid">
        <label class="field-card">
          <span class="field-label">中心基数</span>
          <el-input-number v-model="form.base" :min="1" class="field-control" />
        </label>

        <label class="field-card">
          <span class="field-label">步进</span>
          <el-input-number v-model="form.step" class="field-control" />
        </label>

        <label class="field-card">
          <span class="field-label">循环次数</span>
          <el-input-number v-model="form.loop" :min="1" class="field-control" />
        </label>

        <div class="field-card slider-card">
          <div class="slider-head">
            <span class="field-label">格子大小</span>
            <strong>{{ form.cellScale }}%</strong>
          </div>
          <el-slider v-model="form.cellScale" :min="80" :max="120" :step="5" />
        </div>
      </div>

      <el-button type="primary" class="primary-action" @click="$emit('generate')">
        生成九方图
      </el-button>
    </section>

    <section class="panel-block">
      <div class="section-heading">
        <h2>显示图层</h2>
        <p>决定矩阵上叠加哪些辅助线。</p>
      </div>

      <div class="toggle-grid">
        <div
          v-for="item in displayOptions"
          :key="item.key"
          class="toggle-card"
        >
          <div>
            <strong>{{ item.label }}</strong>
            <p>{{ item.description }}</p>
          </div>
          <el-switch v-model="form[item.key]" />
        </div>
      </div>
    </section>

    <section class="panel-block">
      <div class="section-heading">
        <h2>趋势模式</h2>
        <p>切换点击后的分析方向与高亮颜色。</p>
      </div>

      <div class="toggle-card mode-card">
        <div>
          <strong>启用点击计算</strong>
          <p>关闭后矩阵只展示，不计算趋势主副线。</p>
        </div>
        <el-switch v-model="form.modeEnabled" />
      </div>

      <div v-if="form.modeEnabled" class="trend-switcher">
        <button
          type="button"
          class="trend-button"
          :class="{ active: form.trendDirection === 'up', up: true }"
          @click="form.trendDirection = 'up'"
        >
          ↑ 上升
        </button>
        <button
          type="button"
          class="trend-button"
          :class="{ active: form.trendDirection === 'down', down: true }"
          @click="form.trendDirection = 'down'"
        >
          ↓ 下降
        </button>
      </div>

      <div class="legend-grid">
        <div class="legend-item">
          <span class="legend-dot selected-dot"></span>
          <span>选中点</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot trend-dot"></span>
          <span>趋势点</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot search-dot"></span>
          <span>搜索命中</span>
        </div>
      </div>
    </section>

    <section class="panel-block">
      <div class="section-heading">
        <h2>搜索定位</h2>
        <p>快速定位矩阵中的数值坐标。</p>
      </div>

      <div class="search-row">
        <el-input-number
          :model-value="searchNumber"
          :min="1"
          class="search-input"
          @update:model-value="$emit('update:search-number', $event)"
        />
        <el-button small class="search-button" @click="$emit('highlight')">搜索</el-button>
      </div>

      <div class="status-strip">
        <span>选中值: {{ selectedValueLabel }}</span>
        <span>高亮坐标: {{ highlightLabel }}</span>
      </div>
    </section>
  </aside>
</template>

<script setup>
defineProps({
  form: {
    type: Object,
    required: true,
  },
  displayOptions: {
    type: Array,
    required: true,
  },
  searchNumber: {
    type: Number,
    default: null,
  },
  selectedValueLabel: {
    type: [String, Number],
    required: true,
  },
  highlightLabel: {
    type: String,
    required: true,
  },
  trendPalette: {
    type: Object,
    required: true,
  },
});

defineEmits(["generate", "highlight", "update:search-number"]);
</script>

<style scoped>
.control-panel {
  display: grid;
  gap: 14px;
}

.panel-block {
  padding: 16px;
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 14px 36px rgba(30, 57, 102, 0.07);
}

.section-heading {
  margin-bottom: 12px;
}

.section-heading h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

.section-heading p {
  margin: 0;
  color: #607090;
  font-size: 13px;
  line-height: 1.5;
}

.field-grid,
.toggle-grid {
  display: grid;
  gap: 12px;
}

.field-card,
.toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 68px;
  padding: 12px 14px;
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 16px;
  background: #f9fbff;
  box-sizing: border-box;
}

.field-card {
  flex-direction: column;
  align-items: stretch;
}

.slider-card {
  min-height: auto;
}

.slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field-label {
  font-size: 13px;
  font-weight: 700;
  color: #42506a;
}

.field-control,
.search-input {
  width: 100%;
}

.primary-action,
.search-button {
  min-height: 40px;
}

.primary-action {
  width: 100%;
  margin-top: 12px;
}

.search-button {
  width: 100%;
  margin-top: 0;
}

.toggle-card strong {
  display: block;
  margin-bottom: 4px;
}

.toggle-card p {
  margin: 0;
  color: #607090;
  font-size: 13px;
  line-height: 1.5;
}

.mode-card {
  margin-bottom: 12px;
}

.trend-switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.trend-button {
  min-height: 48px;
  border: 1px solid rgba(34, 44, 74, 0.12);
  border-radius: 14px;
  background: #f4f7fb;
  color: #42506a;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.trend-button.active.up {
  border-color: rgba(24, 163, 110, 0.22);
  background: rgba(45, 255, 142, 0.18);
  color: #0f7c56;
}

.trend-button.active.down {
  border-color: rgba(217, 72, 95, 0.22);
  background: rgba(255, 142, 142, 0.2);
  color: #b0293d;
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 14px;
  background: #f6f9fd;
  font-size: 13px;
  font-weight: 600;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.selected-dot {
  background: v-bind('trendPalette.selected');
}

.trend-dot {
  background: v-bind('trendPalette.trend');
}

.search-dot {
  background: #ff7a00;
}

.search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 6px;
}

.search-input {
  width: 100%;
}

.status-strip {
  display: grid;
  gap: 8px;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f7faff;
  color: #50607f;
  font-size: 13px;
}

@media (max-width: 860px) {
  .panel-block {
    padding: 16px;
    border-radius: 18px;
  }

  .field-grid,
  .legend-grid {
    grid-template-columns: 1fr;
  }

  .search-row {
    align-items: stretch;
    flex-direction: column;
  }

  .search-input,
  .search-button {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .trend-switcher,
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>

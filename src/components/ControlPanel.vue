<template>
  <aside class="control-panel">
    <section class="panel-block">
      <div class="section-heading">
        <h2>基础参数</h2>
        <p>控制中心点、步进与矩阵圈数。</p>
      </div>

      <div class="field-grid">
        <label class="field-card basic-field">
          <span class="field-label">中心基数</span>
          <el-input-number v-model="form.base" :min="1" class="field-control" />
        </label>

        <label class="field-card basic-field">
          <span class="field-label">步进</span>
          <el-input-number v-model="form.step" class="field-control" />
        </label>

        <label class="field-card basic-field">
          <span class="field-label">循环次数</span>
          <el-input-number v-model="form.loop" :min="1" class="field-control" />
        </label>

        <div class="field-card slider-card">
          <div class="slider-head">
            <span class="field-label">格子大小</span>
            <strong>{{ form.cellScale }}%</strong>
          </div>
          <el-slider v-model="form.cellScale" :min="60" :max="180" :step="5" />
        </div>

        <div class="field-card slider-card">
          <div class="slider-head">
            <span class="field-label">线条透明度</span>
            <strong>{{ form.lineOpacity }}%</strong>
          </div>
          <el-slider v-model="form.lineOpacity" :min="10" :max="85" :step="5" />
        </div>

        <div class="field-card slider-card">
          <div class="slider-head">
            <span class="field-label">字体大小</span>
            <strong>{{ form.fontScale }}%</strong>
          </div>
          <el-slider v-model="form.fontScale" :min="70" :max="160" :step="5" />
        </div>
      </div>

      <el-button type="primary" class="primary-action" @click="$emit('generate')">
        生成九方图
      </el-button>
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
        <el-button class="search-button" @click="$emit('highlight')">搜索</el-button>
      </div>

      <div class="status-strip">
        <span>选中值: {{ selectedValueLabel }}</span>
        <span>高亮坐标: {{ highlightLabel }}</span>
      </div>
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

.basic-field {
  flex-direction: row;
  align-items: center;
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
  font-size: 16px;
  font-weight: 900;
}

.field-control,
.search-input {
  width: 100%;
}

.basic-field .field-control {
  width: 132px;
  flex: 0 0 auto;
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

.search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
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

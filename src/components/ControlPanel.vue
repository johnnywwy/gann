<template>
  <aside class="control-panel">
    <section class="panel-block">
      <div class="section-bar">
        <div class="section-heading">
          <h2>基础参数</h2>
          <p>控制中心点、步进与矩阵圈数。</p>
        </div>
        <button type="button" class="section-toggle" @click="basicExpanded = !basicExpanded">
          {{ basicExpanded ? "收起" : "展开" }}
        </button>
      </div>

      <label class="field-card basic-field">
        <span class="field-label">循环次数</span>
        <el-input-number v-model="form.loop" :min="1" class="field-control" />
      </label>

      <div class="field-card slider-card visible-slider-card">
        <div class="slider-head">
          <span class="field-label">格子大小</span>
          <strong>{{ form.cellScale }}%</strong>
        </div>
        <el-slider v-model="form.cellScale" :min="60" :max="240" :step="5" />
      </div>

      <transition name="panel-collapse">
        <div v-if="basicExpanded" class="field-grid collapsible-block">
          <label class="field-card basic-field">
            <span class="field-label">中心基数</span>
            <el-input-number v-model="form.base" :min="1" class="field-control" />
          </label>

          <label class="field-card basic-field">
            <span class="field-label">步进</span>
            <el-input-number v-model="form.step" class="field-control" />
          </label>

          <div class="field-card slider-card">
            <div class="slider-head">
              <span class="field-label">线条透明度</span>
              <strong>{{ form.lineOpacity }}%</strong>
            </div>
            <el-slider v-model="form.lineOpacity" :min="20" :max="100" :step="10" />
          </div>

          <div class="field-card slider-card">
            <div class="slider-head">
              <span class="field-label">字体大小</span>
              <strong>{{ form.fontScale }}%</strong>
            </div>
            <el-slider v-model="form.fontScale" :min="70" :max="160" :step="5" />
          </div>
        </div>
      </transition>

      <el-button type="primary" class="primary-action" @click="handleGenerate">
        生成九方图
      </el-button>
    </section>

    <section class="panel-block">
      <div class="section-heading search-heading">
        <h2>搜索定位</h2>
        <p>快速定位矩阵中的数值坐标。</p>
      </div>

      <div class="search-row">
        <el-input-number
          v-model="searchNumberModel"
          :min="1"
          class="search-input"
        />
        <el-button class="search-button" @click="handleHighlight">搜索</el-button>
      </div>

      <div class="status-strip">
        <span>选中值: {{ selectedValueLabel }}</span>
        <span>高亮坐标: {{ highlightLabel }}</span>
      </div>
    </section>

    <section class="panel-block">
      <div class="section-bar">
        <div class="section-heading">
          <h2>显示图层</h2>
          <p>决定矩阵上叠加哪些辅助线。</p>
        </div>
        <button type="button" class="section-toggle" @click="displayExpanded = !displayExpanded">
          {{ displayExpanded ? "收起" : "展开" }}
        </button>
      </div>

      <transition name="panel-collapse">
        <div v-if="displayExpanded" class="toggle-grid collapsible-block">
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
      </transition>
    </section>
  </aside>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  form: {
    type: Object,
    required: true,
  },
  displayOptions: {
    type: Array,
    required: true,
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

const searchNumberModel = defineModel("searchNumber", {
  type: Number,
  default: null,
});
const emit = defineEmits(["generate", "highlight"]);

const basicExpanded = ref(false);
const displayExpanded = ref(false);

function handleGenerate() {
  emit("generate");
}

function handleHighlight() {
  emit("highlight");
}

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

.section-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-heading {
  margin-bottom: 0;
}

.search-heading {
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

.section-toggle {
  min-width: 60px;
  padding: 8px 12px;
  border: 1px solid rgba(34, 44, 74, 0.12);
  border-radius: 12px;
  background: #f4f7fb;
  color: #42506a;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.section-toggle:hover {
  border-color: rgba(45, 108, 223, 0.22);
  background: #edf4ff;
  color: #2d6cdf;
}

.field-grid,
.toggle-grid {
  display: grid;
  gap: 12px;
}

.collapsible-block {
  margin-top: 12px;
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

.visible-slider-card {
  margin-top: 12px;
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

.panel-collapse-enter-active,
.panel-collapse-leave-active {
  overflow: hidden;
  transition: max-height 0.32s ease, opacity 0.24s ease, transform 0.24s ease;
  transform-origin: top;
}

.panel-collapse-enter-to,
.panel-collapse-leave-from {
  max-height: 520px;
  opacity: 1;
  transform: translateY(0);
}

.panel-collapse-enter-from,
.panel-collapse-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 860px) {
  .panel-block {
    padding: 16px;
    border-radius: 18px;
  }

  .toggle-grid {
    grid-template-columns: 1fr;
  }

  .field-card,
  .toggle-card {
    border-radius: 14px;
  }
}

@media (max-width: 640px) {
  .control-panel {
    gap: 12px;
  }

  .panel-block {
    padding: 14px;
    border-radius: 16px;
  }

  .section-bar {
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .section-heading h2 {
    font-size: 16px;
  }

  .section-heading p,
  .toggle-card p,
  .status-strip {
    font-size: 12px;
    line-height: 1.45;
  }

  .section-toggle {
    min-width: 54px;
    padding: 7px 11px;
    border-radius: 10px;
    font-size: 12px;
  }

  .field-grid,
  .toggle-grid {
    gap: 10px;
  }

  .field-card,
  .toggle-card {
    gap: 10px;
    min-height: 60px;
    padding: 11px 12px;
    border-radius: 14px;
  }

  .field-label {
    font-size: 15px;
  }

  .basic-field {
    gap: 10px;
  }

  .basic-field .field-control {
    width: 112px;
  }

  .search-row {
    grid-template-columns: minmax(0, 1fr) 76px;
    gap: 8px;
  }

  .primary-action,
  .search-button {
    min-height: 42px;
  }

  .status-strip {
    gap: 6px;
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 14px;
  }
}
</style>

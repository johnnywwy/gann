<template>
  <main class="board-panel">
    <section class="trend-panel">
      <div class="section-heading">
        <h2>趋势模式</h2>
        <p>切换点击后的分析方向与高亮颜色。</p>
      </div>

      <div class="trend-layout">
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
      </div>
    </section>

    <section class="matrix-panel">
      <div class="matrix-scroll">
        <div class="matrix-wrapper" v-if="matrix.length">
          <svg class="matrix-overlay" :width="matrix.length * cellSize" :height="matrix.length * cellSize">
            <line
              v-if="form.showCross"
              :x1="centerPx"
              y1="0"
              :x2="centerPx"
              :y2="totalSize"
              stroke="#2d6cdf"
              stroke-width="2"
              :stroke-opacity="form.lineOpacity / 100"
            />
            <line
              v-if="form.showCross"
              x1="0"
              :y1="centerPx"
              :x2="totalSize"
              :y2="centerPx"
              stroke="#2d6cdf"
              stroke-width="2"
              :stroke-opacity="form.lineOpacity / 100"
            />

            <line
              v-if="form.showDiagonal"
              x1="0"
              y1="0"
              :x2="totalSize"
              :y2="totalSize"
              stroke="#d9485f"
              stroke-width="2"
              :stroke-opacity="form.lineOpacity / 100"
            />
            <line
              v-if="form.showDiagonal"
              :x1="totalSize"
              y1="0"
              x2="0"
              :y2="totalSize"
              stroke="#d9485f"
              stroke-width="2"
              :stroke-opacity="form.lineOpacity / 100"
            />

            <g v-if="form.showHorseLine && horseLineCoords" :opacity="form.lineOpacity / 100">
              <line
                :x1="horseLineCoords.x1"
                :y1="horseLineCoords.y1"
                :x2="horseLineCoords.x2"
                :y2="horseLineCoords.y2"
                stroke="#7f56d9"
                stroke-width="2"
                stroke-dasharray="8,4"
              />
              <line
                :x1="totalSize - horseLineCoords.x1"
                :y1="horseLineCoords.y1"
                :x2="totalSize - horseLineCoords.x2"
                :y2="horseLineCoords.y2"
                stroke="#7f56d9"
                stroke-width="2"
                stroke-dasharray="8,4"
              />
            </g>

            <g v-if="form.showHorseLineFlat && horseLineFlatCoords" :opacity="form.lineOpacity / 100">
              <line
                :x1="horseLineFlatCoords.x1"
                :y1="horseLineFlatCoords.y1"
                :x2="horseLineFlatCoords.x2"
                :y2="horseLineFlatCoords.y2"
                stroke="#159f7b"
                stroke-width="2"
                stroke-dasharray="8,4"
              />
              <line
                :x1="horseLineFlatCoords.x1"
                :y1="totalSize - horseLineFlatCoords.y1"
                :x2="horseLineFlatCoords.x2"
                :y2="totalSize - horseLineFlatCoords.y2"
                stroke="#159f7b"
                stroke-width="2"
                stroke-dasharray="8,4"
              />
            </g>
          </svg>

          <div class="matrix">
            <div v-for="(row, rIndex) in matrix" :key="rIndex" class="row">
              <div
                v-for="(cell, cIndex) in row"
                :key="cIndex"
                class="cell"
                :class="getCellClass(rIndex, cIndex)"
                :style="getCellStyle(rIndex, cIndex)"
                @click="$emit('cell-click', rIndex, cIndex)"
              >
                <div class="cell-value">{{ cell }}</div>
                <div v-if="form.showCoords" class="cell-coord">{{ `${rIndex}:${cIndex}` }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
defineProps({
  matrix: {
    type: Array,
    required: true,
  },
  form: {
    type: Object,
    required: true,
  },
  cellSize: {
    type: Number,
    required: true,
  },
  centerPx: {
    type: Number,
    required: true,
  },
  totalSize: {
    type: Number,
    required: true,
  },
  horseLineCoords: {
    type: Object,
    default: null,
  },
  horseLineFlatCoords: {
    type: Object,
    default: null,
  },
  mid: {
    type: Number,
    required: true,
  },
  modeEnabled: {
    type: Boolean,
    required: true,
  },
  trendPalette: {
    type: Object,
    required: true,
  },
  getCellStyle: {
    type: Function,
    required: true,
  },
  getCellClass: {
    type: Function,
    required: true,
  },
});

defineEmits(["cell-click"]);
</script>

<style scoped>
.board-panel {
  display: grid;
  gap: 16px;
}

.trend-panel,
.matrix-panel {
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 40px rgba(30, 57, 102, 0.08);
}

.trend-panel {
  padding: 14px 16px;
}

.section-heading {
  margin-bottom: 10px;
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

.trend-layout {
  display: grid;
  grid-template-columns: minmax(220px, 1.1fr) minmax(180px, 0.9fr) minmax(220px, 1fr);
  gap: 10px;
  align-items: stretch;
}

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

.trend-switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.trend-button {
  min-height: 68px;
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

.matrix-panel {
  padding: 14px;
}

.matrix-scroll {
  overflow: hidden;
  border-radius: 18px;
}

.matrix-wrapper {
  position: relative;
  display: inline-block;
  margin: 0;
  padding: 6px;
}

.matrix-overlay {
  position: absolute;
  top: 6px;
  left: 6px;
  pointer-events: none;
  z-index: 10;
}

.matrix {
  position: relative;
  z-index: 1;
  width: max-content;
}

.row {
  display: flex;
}

.cell {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.cell:hover {
  transform: scale(0.98);
}

.cell.is-highlight {
  z-index: 2;
  animation: breathe 1.6s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(255, 122, 0, 0.48);
}

.cell-value {
  font-size: var(--cell-value-size, 15px);
  font-weight: 700;
  line-height: 1;
}

.cell-coord {
  font-size: var(--cell-coord-size, 10px);
  color: #42506a;
  line-height: 1;
}

.cell.coords-hidden {
  gap: 0;
}

@keyframes breathe {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 122, 0, 0.42);
  }

  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 10px rgba(255, 122, 0, 0);
  }

  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 122, 0, 0);
  }
}

@media (max-width: 860px) {
  .board-panel {
    gap: 12px;
  }

  .trend-layout {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .trend-switcher {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .legend-grid {
    grid-template-columns: 1fr;
  }

  .trend-panel,
  .matrix-panel {
    padding: 12px;
    border-radius: 18px;
  }
}

@media (max-width: 560px) {
  .trend-panel {
    padding: 12px;
    border-radius: 16px;
  }

  .matrix-panel {
    padding: 10px;
    border-radius: 16px;
  }

  .section-heading {
    margin-bottom: 8px;
  }

  .section-heading h2 {
    font-size: 16px;
  }

  .section-heading p,
  .toggle-card p,
  .legend-item {
    font-size: 12px;
  }

  .toggle-card {
    align-items: flex-start;
    min-height: auto;
    padding: 12px;
    border-radius: 14px;
  }

  .trend-switcher {
    gap: 8px;
  }

  .trend-button {
    min-height: 52px;
    border-radius: 12px;
    font-size: 14px;
  }

  .legend-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .legend-item {
    min-height: 40px;
    padding: 8px 10px;
    border-radius: 12px;
  }

  .matrix-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    padding-bottom: 2px;
  }

  .matrix-wrapper {
    padding: 4px;
  }

  .matrix-overlay {
    top: 4px;
    left: 4px;
  }
}
</style>

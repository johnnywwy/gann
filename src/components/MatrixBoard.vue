<template>
  <main class="board-panel">
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
            />
            <line
              v-if="form.showCross"
              x1="0"
              :y1="centerPx"
              :x2="totalSize"
              :y2="centerPx"
              stroke="#2d6cdf"
              stroke-width="2"
            />

            <line
              v-if="form.showDiagonal"
              x1="0"
              y1="0"
              :x2="totalSize"
              :y2="totalSize"
              stroke="#d9485f"
              stroke-width="2"
            />
            <line
              v-if="form.showDiagonal"
              :x1="totalSize"
              y1="0"
              x2="0"
              :y2="totalSize"
              stroke="#d9485f"
              stroke-width="2"
            />

            <g v-if="form.showHorseLine && horseLineCoords">
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

            <g v-if="form.showHorseLineFlat && horseLineFlatCoords">
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
  display: block;
}

.matrix-panel {
  padding: 14px;
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 40px rgba(30, 57, 102, 0.08);
}

.matrix-scroll {
  overflow: hidden;
  border-radius: 18px;
}

.matrix-wrapper {
  position: relative;
  display: table;
  margin: 0 auto;
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
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
}

.cell-coord {
  font-size: 10px;
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
  .matrix-panel {
    padding: 12px;
    border-radius: 18px;
  }
}

@media (max-width: 560px) {
  .cell-value {
    font-size: 13px;
  }
}
</style>

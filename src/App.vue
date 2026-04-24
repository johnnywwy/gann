<template>
  <el-card class="box-card">
    <el-form :model="form" label-width="100px" class="form">
      <el-form-item label="中心基数">
        <el-input-number v-model="form.base" :min="1" />
      </el-form-item>

      <el-form-item label="步进">
        <el-input-number v-model="form.step" />
      </el-form-item>

      <el-form-item label="循环次数">
        <el-input-number v-model="form.loop" :min="1" />
      </el-form-item>

      <el-form-item label="画角线">
        <el-switch v-model="form.showDiagonal" />
      </el-form-item>

      <el-form-item label="画十字线">
        <el-switch v-model="form.showCross" />
      </el-form-item>

      <el-form-item label="2:1 骑士线">
        <el-switch v-model="form.showHorseLine" />
      </el-form-item>

      <el-form-item label="1:2 骑士线">
        <el-switch v-model="form.showHorseLineFlat" />
      </el-form-item>

      <el-form-item label="搜索数字">
        <el-input-number v-model="searchNumber" :min="1" />
        <el-button type="primary" @click="highlightNumber">搜索</el-button>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="generateMatrix">
          生成九方图
        </el-button>
      </el-form-item>

      <el-form-item label="模式">
        <el-switch v-model="form.modeEnabled" />
      </el-form-item>

      <!-- 只有模式开启才显示 -->
      <el-form-item v-if="form.modeEnabled" label="方向">
        <el-button-group>
          <el-button :type="form.trendDirection === 'up' ? 'primary' : 'default'" @click="form.trendDirection = 'up'">
            ↑ 上升
          </el-button>

          <el-button :type="form.trendDirection === 'down' ? 'primary' : 'default'"
            @click="form.trendDirection = 'down'">
            ↓ 下降
          </el-button>
        </el-button-group>
      </el-form-item>
    </el-form>

    <div class="matrix-wrapper" v-if="matrix.length">
      <!-- 整体SVG覆盖整个矩阵 -->
      <svg class="matrix-overlay" :width="matrix.length * cellSize" :height="matrix.length * cellSize">
        <!-- 十字线 -->
        <line v-if="form.showCross" :x1="centerPx" y1="0" :x2="centerPx" :y2="totalSize" stroke="#00BFFF"
          stroke-width="2" />
        <line v-if="form.showCross" x1="0" :y1="centerPx" :x2="totalSize" :y2="centerPx" stroke="#00BFFF"
          stroke-width="2" />

        <!-- 对角线 -->
        <line v-if="form.showDiagonal" x1="0" y1="0" :x2="totalSize" :y2="totalSize" stroke="#FF5252"
          stroke-width="2" />
        <line v-if="form.showDiagonal" :x1="totalSize" y1="0" x2="0" :y2="totalSize" stroke="#FF5252"
          stroke-width="2" />

        <g v-if="form.showHorseLine && horseLineCoords">
          <line :x1="horseLineCoords.x1" :y1="horseLineCoords.y1" :x2="horseLineCoords.x2" :y2="horseLineCoords.y2"
            stroke="#9C27B0" stroke-width="2" stroke-dasharray="8,4" />
          <line :x1="totalSize - horseLineCoords.x1" :y1="horseLineCoords.y1" :x2="totalSize - horseLineCoords.x2"
            :y2="horseLineCoords.y2" stroke="#9C27B0" stroke-width="2" stroke-dasharray="8,4" />
        </g>

        <g v-if="form.showHorseLineFlat && horseLineFlatCoords">
          <line :x1="horseLineFlatCoords.x1" :y1="horseLineFlatCoords.y1" :x2="horseLineFlatCoords.x2"
            :y2="horseLineFlatCoords.y2" stroke="#2E7D32" stroke-width="2" stroke-dasharray="8,4" />
          <line :x1="horseLineFlatCoords.x1" :y1="totalSize - horseLineFlatCoords.y1" :x2="horseLineFlatCoords.x2"
            :y2="totalSize - horseLineFlatCoords.y2" stroke="#2E7D32" stroke-width="2" stroke-dasharray="8,4" />
        </g>
      </svg>

      <!-- 矩阵 -->
      <div class="matrix">
        <div v-for="(row, rIndex) in matrix" :key="rIndex" class="row">
          <div v-for="(cell, cIndex) in row" :key="cIndex" class="cell" :style="getCellStyle(rIndex, cIndex)"
            @click="handleCellClick(rIndex, cIndex)">
            <div>{{ cell }}</div>
            <div style="font-size: 10px;">{{ (rIndex) + ':' + (cIndex) }}</div>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { reactive, ref, computed } from "vue";
import {
  calculateClickTrend,
  findNumberPosition,
  generateGannMatrix,
  getLineCoordsBySlope,
} from "./utils/gannMatrix";

const form = reactive({
  base: 1,
  step: 1,
  loop: 9,
  showDiagonal: true,
  showCross: true,
  modeEnabled: true,
  trendDirection: "down", // up / down
  showHorseLine: true, // 骑士线开关
  showHorseLineFlat: true, // 扁平骑士线
});

const matrix = ref([]);
const selectedCell = ref(null);
const trendCells = ref([]);
const searchNumber = ref(null);
const highlightPos = ref({ r: -1, c: -1 });

const cellSize = 50;
const totalSize = computed(() => matrix.value.length * cellSize);
const centerPx = computed(() => totalSize.value / 2);
const mid = computed(() => Math.floor(matrix.value.length / 2));
const horseLineCoords = computed(() => getLineCoordsBySlope(2, totalSize.value, centerPx.value));
const horseLineFlatCoords = computed(() => getLineCoordsBySlope(0.5, totalSize.value, centerPx.value));

function generateMatrix() {
  matrix.value = generateGannMatrix(form.base, form.step, form.loop);
  selectedCell.value = null;
  trendCells.value = [];
  highlightPos.value = { r: -1, c: -1 };
}

function highlightNumber() {
  highlightPos.value = findNumberPosition(matrix.value, searchNumber.value);
}

function handleCellClick(r, c) {
  console.log("坐标 r:" + r, "坐标 c:" + c);

  if (!form.modeEnabled) return;

  selectedCell.value = { r, c };

  const result = calculateClickTrend(matrix.value, r, c, form.trendDirection);

  console.log("点击值:", result.clickedValue);
  console.log("主线:", result.mainLine.map(x => x.value));
  console.log("副线:", result.crossLine.map(x => x.value));
  console.log("mainLinePoints", result.mainLinePoints);
  console.log("crossLinePoints", result.crossLinePoints);

  trendCells.value = result.trendCells;

  console.log("趋势主线:", result.trendMain.map(x => x.value));
  console.log("趋势副线:", result.trendCross.map(x => x.value));
}

function getCellStyle(r, c) {
  const layer = Math.max(
    Math.abs(r - mid.value),
    Math.abs(c - mid.value)
  );

  const colorA = "#FFF8E1";
  const colorB = "#E1F5FE";
  const bg = layer % 3 === 0 ? colorA : colorB;

  let backgroundColor = bg;
  let border = "1px solid #333";

  const isTrend = trendCells.value.some(
    pos => pos.r === r && pos.c === c
  );

  if (isTrend) {
    backgroundColor = "#FF8E8E";
  }

  if (
    selectedCell.value &&
    selectedCell.value.r === r &&
    selectedCell.value.c === c
  ) {
    backgroundColor = "#2DFF8E";
  }

  if (
    highlightPos.value.r === r &&
    highlightPos.value.c === c
  ) {
    border = "4px solid #FF5722";
  }

  return {
    width: cellSize + "px",
    height: cellSize + "px",
    backgroundColor,
    border,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxSizing: "border-box",
    cursor: form.modeEnabled ? "pointer" : "default",
    transition: "all 0.2s ease",
  };
}

generateMatrix();
</script>

<style scoped>
.form {
  margin-bottom: 20px;
}

.matrix-wrapper {
  position: relative;
  display: inline-block;
}

.matrix-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
}

.matrix {
  position: relative;
  z-index: 1;
}

.row {
  display: flex;
}

.cell {
  flex-direction: column;
  flex-wrap: wrap;
}
</style>

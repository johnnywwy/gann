<template>
  <main class="board-panel">
    <section class="trend-panel">
      <div class="section-heading trend-heading">
        <div>
          <h2>趋势模式</h2>
          <p>点击格子后，新算法会输出主线与副线；画布使用固定网格与原生滚动。</p>
        </div>
        <div v-if="form.modeEnabled" class="trend-switcher">
          <button type="button" class="trend-button up" :class="{ active: form.trendDirection === 'up' }" @click="form.trendDirection = 'up'">
            上升
          </button>
          <button type="button" class="trend-button down" :class="{ active: form.trendDirection === 'down' }" @click="form.trendDirection = 'down'">
            下降
          </button>
        </div>
      </div>

      <div class="point-lists">
        <div class="point-list">
          <strong>主线</strong>
          <span v-if="!mainPointValues.length" class="point-empty">未生成</span>
          <span v-else class="tag-row">
            <el-tag v-for="value in mainPointValues" :key="`main-${value}`" effect="plain" size="small">
              {{ value }}
            </el-tag>
          </span>
        </div>
        <div class="point-list">
          <strong>副线</strong>
          <span v-if="!crossPointValues.length" class="point-empty">未生成</span>
          <span v-else class="tag-row">
            <el-tag v-for="value in crossPointValues" :key="`cross-${value}`" effect="plain" size="small">
              {{ value }}
            </el-tag>
          </span>
        </div>
      </div>
    </section>

    <section class="matrix-panel">
      <div ref="viewportRef" class="matrix-viewport" @wheel="handleWheel">
        <canvas ref="canvasRef" class="matrix-canvas" @click="handleCanvasClick"></canvas>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  matrix: { type: Array, required: true },
  form: { type: Object, required: true },
  cellSize: { type: Number, required: true },
  centerPx: { type: Number, required: true },
  totalSize: { type: Number, required: true },
  horseLineCoords: { type: Object, default: null },
  horseLineFlatCoords: { type: Object, default: null },
  mid: { type: Number, required: true },
  modeEnabled: { type: Boolean, required: true },
  trendPalette: { type: Object, required: true },
  selectedCell: { type: Object, default: null },
  highlightPos: { type: Object, default: () => ({ r: -1, c: -1 }) },
  trendCells: { type: Array, default: () => [] },
  mainPoints: { type: Array, default: () => [] },
  crossPoints: { type: Array, default: () => [] },
});

const emit = defineEmits(["cell-click"]);
const viewportRef = ref(null);
const canvasRef = ref(null);
const zoom = ref(1);

let resizeObserver = null;
let frameId = 0;

const trendCellSet = computed(() => new Set(props.trendCells.map(point => `${point.r}:${point.c}`)));
const drawCellSize = computed(() => Math.max(8, props.cellSize * zoom.value));
const boardSize = computed(() => props.matrix.length * drawCellSize.value);
const mainPointValues = computed(() => formatPointValues(props.mainPoints));
const crossPointValues = computed(() => formatPointValues(props.crossPoints));

function formatPointValues(points) {
  const values = (points || [])
    .map(point => point?.value ?? point)
    .filter(value => value !== null && value !== undefined && value !== "");

  return values.sort((a, b) => (
    props.form.trendDirection === "down"
      ? Number(b) - Number(a)
      : Number(a) - Number(b)
  ));
}

function scheduleRender() {
  if (frameId) return;
  frameId = requestAnimationFrame(() => {
    frameId = 0;
    renderCanvas();
  });
}

function updateCanvasSize() {
  const canvas = canvasRef.value;
  if (!canvas || !props.matrix.length) return;

  const dpr = window.devicePixelRatio || 1;
  const size = Math.max(1, Math.ceil(boardSize.value));
  canvas.width = Math.ceil(size * dpr);
  canvas.height = Math.ceil(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  scheduleRender();
}

function resetScrollToTopLeft() {
  const viewport = viewportRef.value;
  if (!viewport) return;
  viewport.scrollLeft = 0;
  viewport.scrollTop = 0;
}

function getCellFill(row, col) {
  if (props.selectedCell?.r === row && props.selectedCell?.c === col) return props.trendPalette.selected;
  if (trendCellSet.value.has(`${row}:${col}`)) return props.trendPalette.trend;
  const layer = Math.max(Math.abs(row - props.mid), Math.abs(col - props.mid));
  return layer % 3 === 0 ? "#fff6df" : "#e8f3ff";
}

function renderCanvas() {
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx || !props.matrix.length) return;

  const dpr = window.devicePixelRatio || 1;
  const size = boardSize.value;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#f8fbff";
  ctx.fillRect(0, 0, size, size);
  drawCells(ctx);
  drawGuideLines(ctx);
}

function drawCells(ctx) {
  const size = drawCellSize.value;
  const valueFontSize = Math.max(10, Math.round((size * 0.3 * props.form.fontScale) / 100));
  const coordFontSize = Math.max(7, Math.round((size * 0.18 * props.form.fontScale) / 100));
  const textMaxWidth = Math.max(10, size - 8);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let row = 0; row < props.matrix.length; row += 1) {
    const y = row * size;
    const matrixRow = props.matrix[row];
    for (let col = 0; col < matrixRow.length; col += 1) {
      const x = col * size;
      const isHighlight = props.highlightPos?.r === row && props.highlightPos?.c === col;

      ctx.fillStyle = getCellFill(row, col);
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = "rgba(34, 44, 74, 0.16)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

      if (isHighlight) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ff7a00";
        ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
        ctx.lineWidth = 1;
      }

      ctx.fillStyle = "#0f172a";
      ctx.font = `800 ${valueFontSize}px "Segoe UI", "Microsoft YaHei", sans-serif`;
      ctx.fillText(String(matrixRow[col]), x + size / 2, y + (props.form.showCoords ? size * 0.42 : size / 2), textMaxWidth);

      if (props.form.showCoords) {
        ctx.fillStyle = "#64748b";
        ctx.font = `700 ${coordFontSize}px "Segoe UI", "Microsoft YaHei", sans-serif`;
        ctx.fillText(`${row}:${col}`, x + size / 2, y + size * 0.68, textMaxWidth);
      }
    }
  }
}

function drawGuideLines(ctx) {
  const opacity = props.form.lineOpacity / 100;
  const total = boardSize.value;
  const center = props.centerPx * zoom.value;

  if (props.form.showCross) {
    drawBoardLine(ctx, center, 0, center, total, "#2d6cdf", opacity);
    drawBoardLine(ctx, 0, center, total, center, "#2d6cdf", opacity);
  }
  if (props.form.showDiagonal) {
    drawBoardLine(ctx, 0, 0, total, total, "#d9485f", opacity);
    drawBoardLine(ctx, total, 0, 0, total, "#d9485f", opacity);
  }
  if (props.form.showHorseLine && props.horseLineCoords) {
    const line = scaleLine(props.horseLineCoords);
    drawBoardLine(ctx, line.x1, line.y1, line.x2, line.y2, "#7f56d9", opacity, [8, 4]);
    drawBoardLine(ctx, total - line.x1, line.y1, total - line.x2, line.y2, "#7f56d9", opacity, [8, 4]);
  }
  if (props.form.showHorseLineFlat && props.horseLineFlatCoords) {
    const line = scaleLine(props.horseLineFlatCoords);
    drawBoardLine(ctx, line.x1, line.y1, line.x2, line.y2, "#159f7b", opacity, [8, 4]);
    drawBoardLine(ctx, line.x1, total - line.y1, line.x2, total - line.y2, "#159f7b", opacity, [8, 4]);
  }
}

function scaleLine(line) {
  return {
    x1: line.x1 * zoom.value,
    y1: line.y1 * zoom.value,
    x2: line.x2 * zoom.value,
    y2: line.y2 * zoom.value,
  };
}

function drawBoardLine(ctx, x1, y1, x2, y2, color, opacity, dash = []) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function handleCanvasClick(event) {
  if (!props.modeEnabled) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const col = Math.floor((event.clientX - rect.left) / drawCellSize.value);
  const row = Math.floor((event.clientY - rect.top) / drawCellSize.value);

  if (row < 0 || col < 0 || row >= props.matrix.length || col >= (props.matrix[row]?.length || 0)) return;
  emit("cell-click", row, col);
}

function handleWheel(event) {
  if (!event.ctrlKey) return;

  event.preventDefault();
  const viewport = viewportRef.value;
  if (!viewport) return;

  const rect = viewport.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const oldZoom = zoom.value;
  const boardX = (viewport.scrollLeft + mouseX) / oldZoom;
  const boardY = (viewport.scrollTop + mouseY) / oldZoom;
  const nextZoom = clamp(oldZoom * (event.deltaY > 0 ? 0.9 : 1.1), 0.45, 3.2);

  if (nextZoom === oldZoom) return;
  zoom.value = nextZoom;

  nextTick(() => {
    updateCanvasSize();
    viewport.scrollLeft = boardX * nextZoom - mouseX;
    viewport.scrollTop = boardY * nextZoom - mouseY;
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

onMounted(() => {
  updateCanvasSize();
  resizeObserver = new ResizeObserver(() => {
    updateCanvasSize();
  });
  if (viewportRef.value) resizeObserver.observe(viewportRef.value);
  nextTick(resetScrollToTopLeft);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (frameId) cancelAnimationFrame(frameId);
});

watch(() => props.matrix.length, () => nextTick(() => {
  updateCanvasSize();
  resetScrollToTopLeft();
}));
watch([drawCellSize, () => props.form.fontScale], () => {
  updateCanvasSize();
});
watch(() => props.form, scheduleRender, { deep: true });
watch(() => [props.selectedCell, props.highlightPos, props.trendCells, props.trendPalette], scheduleRender, { deep: true });
</script>

<style scoped>
.board-panel {
  display: grid;
  gap: 12px;
}

.trend-panel,
.matrix-panel {
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 24px 70px rgba(42, 54, 77, 0.12);
  backdrop-filter: blur(28px) saturate(1.25);
}

.trend-panel {
  padding: 14px;
}

.section-heading {
  margin-bottom: 10px;
}

.trend-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-heading h2 {
  margin: 0 0 4px;
  color: #0f172a;
  font-size: 18px;
}

.section-heading p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.trend-button {
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 8px;
  background: rgba(248, 251, 255, 0.82);
}

.trend-switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  min-width: 132px;
}

.trend-button {
  min-height: 32px;
  padding: 0 12px;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
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

.point-lists {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.point-list {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 8px;
  background: rgba(248, 251, 255, 0.82);
  color: #42506a;
  font-size: 13px;
  line-height: 1.55;
  transition: none;
}

.point-list strong {
  color: #0f172a;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 22px;
}

.tag-row :deep(.el-tag) {
  transition: none;
  animation: none;
}

.point-empty {
  color: #8a97ad;
}

.matrix-panel {
  padding: 10px;
}

.matrix-viewport {
  width: 100%;
  height: min(76vh, 900px);
  min-height: 560px;
  overflow: auto;
  border-radius: 8px;
  background: #f8fbff;
  overscroll-behavior: contain;
}

.matrix-canvas {
  display: block;
  margin: 0;
  cursor: crosshair;
}

@media (max-width: 560px) {
  .trend-panel,
  .matrix-panel {
    padding: 10px;
  }

  .trend-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .trend-switcher {
    width: 100%;
  }

  .point-list {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .matrix-viewport {
    height: 68vh;
    min-height: 380px;
  }
}
</style>

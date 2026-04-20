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

/* =============================
   生成九宫螺旋矩阵
============================= */
function generateGannMatrix(base, step, loop) {
  const size = 2 * loop + 1;
  const mat = Array.from({ length: size }, () => Array(size).fill(null));

  const midIndex = Math.floor(size / 2);
  let num = base;
  let x = midIndex;
  let y = midIndex;

  mat[y][x] = num;

  const dirs = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
  ];

  let stepCount = 1;
  let dirIndex = 0;

  while (true) {
    for (let i = 0; i < 2; i++) {
      const [dx, dy] = dirs[dirIndex % 4];

      for (let s = 0; s < stepCount; s++) {
        num += step;
        x += dx;
        y += dy;

        if (x < 0 || y < 0 || x >= size || y >= size) {
          return mat;
        }

        mat[y][x] = num;
      }

      dirIndex++;
    }

    stepCount++;
  }
}

function generateMatrix() {
  matrix.value = generateGannMatrix(
    form.base,
    form.step,
    form.loop
  );
  selectedCell.value = null;
  trendCells.value = [];
  highlightPos.value = { r: -1, c: -1 };
}

/**
 * 彻底撑满版：直接计算直线与 SVG 物理边界 (0 到 totalSize) 的交点
 * 方程: (y - centerPx) = k * (x - centerPx)
 */
function getLineCoordsBySlope(k) {
  const size = matrix.value.length;
  if (size === 0) return null;

  const total = totalSize.value; // SVG 的总宽度/高度 (例如 1140px)
  const cp = centerPx.value;     // SVG 的中心像素点 (例如 570px)

  // 这里的 k 是物理斜率。
  // 注意：在屏幕坐标系中，y轴向下，所以逻辑上的 r 减少对应 y 减小，斜率符号一致。

  const candidates = [];

  // 1. 撞击 SVG 顶边 (y = 0)
  // 0 - cp = k * (x - cp) => x = cp - cp/k
  candidates.push({ x: cp - cp / k, y: 0 });

  // 2. 撞击 SVG 底边 (y = total)
  // total - cp = k * (x - cp) => x = cp + (total - cp)/k
  candidates.push({ x: cp + (total - cp) / k, y: total });

  // 3. 撞击 SVG 左边 (x = 0)
  // y - cp = k * (0 - cp) => y = cp - k * cp
  candidates.push({ x: 0, y: cp - k * cp });

  // 4. 撞击 SVG 右边 (x = total)
  // y - cp = k * (total - cp) => y = cp + k * (total - cp)
  candidates.push({ x: total, y: cp + k * (total - cp) });

  // 关键：允许极小的误差 (0.5像素)，确保撞在边框上的点能被选出来
  const valid = candidates.filter(p =>
    p.x >= -0.5 && p.x <= total + 0.5 &&
    p.y >= -0.5 && p.y <= total + 0.5
  );

  if (valid.length < 2) return null;

  // 排序：取距离最远的两个点，确保线条贯穿
  return {
    x1: valid[0].x,
    y1: valid[0].y,
    x2: valid[valid.length - 1].x,
    y2: valid[valid.length - 1].y
  };
}

const horseLineCoords = computed(() => getLineCoordsBySlope(2));    // 2:1 线
const horseLineFlatCoords = computed(() => getLineCoordsBySlope(0.5)); // 1:2 线

/* =============================
   搜索
============================= */
function highlightNumber() {
  highlightPos.value = { r: -1, c: -1 };

  for (let r = 0; r < matrix.value.length; r++) {
    for (let c = 0; c < matrix.value.length; c++) {
      if (matrix.value[r][c] === searchNumber.value) {
        highlightPos.value = { r, c };
        return;
      }
    }
  }
}



/**
 * 获取经过指定坐标 (r, c) 的完整主对角线
 * 主对角线公式：i - j = r - c
 *
 * @param {Array<Array<number>>} matrix - 九方图矩阵
 * @param {number} r - 点击的行
 * @param {number} c - 点击的列
 * @returns {Array<{r:number,c:number,value:number}>}
 */
function getMainDiagonal(matrix, r, c) {
  const size = matrix.length;   // 矩阵大小（例如 7x7）
  const result = [];            // 存放结果

  // 主对角线的固定常量
  const mainConst = r - c;

  // 遍历整个矩阵
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {

      // 满足主对角线公式的点
      if (i - j === mainConst) {
        result.push({
          r: i,                 // 行坐标
          c: j,                 // 列坐标
          value: matrix[i][j]   // 对应数字
        });
      }

    }
  }

  return result; // 返回整条主对角线
}


/**
 * 获取穿过中心点（数字1）的固定副对角线
 * 副对角线公式：i + j = centerIndex * 2
 *
 * @param {Array<Array<number>>} matrix - 九方图矩阵
 * @returns {Array<{r:number,c:number,value:number}>}
 */
function getCenterAntiDiagonal(matrix) {
  const size = matrix.length;            // 矩阵大小
  const result = [];

  // 中心点坐标
  const center = Math.floor(size / 2);

  // 副对角线固定常量
  const centerConst = center * 2;

  // 遍历矩阵
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {

      // 满足副对角线公式
      if (i + j === centerConst) {
        result.push({
          r: i,
          c: j,
          value: matrix[i][j]
        });
      }

    }
  }

  return result; // 返回固定副对角线
}

/**
 * 获取主对角线中 小于点击值 的数字（下降模式）
 */
function getMainDiagonalDown(mainLine, clickedValue) {
  return mainLine.filter(item => item.value < clickedValue);
}

/**
 * 获取副对角线下降趋势
 * 规则：
 * 1️⃣ 只取 1 那一侧
 * 2️⃣ 只取 小于 点击值 的数字
 */
function getAntiDiagonalDown(antiLine, clickedValue) {

  const result = [];

  // 找到数字 1 的索引
  const oneIndex = antiLine.findIndex(item => item.value === 1);
  if (oneIndex === -1) return [];

  // 从 1 的左边开始遍历（不包含 1）
  for (let i = oneIndex - 1; i >= 0; i--) {

    const current = antiLine[i];

    // 只要小于点击值
    if (current.value < clickedValue) {
      result.push(current);
    } else {
      // 一旦 >= 点击值就停止
      break;
    }
  }

  return result;
}

/**
 * 获取以中心点（数字1）为交叉点的四条射线
 *
 * 四条线分别是：
 * 1️⃣ 左上 ↘ 右下（主对角线1）
 * 2️⃣ 右上 ↙ 左下（主对角线2）
 * 3️⃣ 垂直线（上 ↕ 下）
 * 4️⃣ 水平线（左 ↔ 右）
 *
 * @param {Array<Array<number>>} matrix 九方图矩阵
 * @returns {Object} 包含四条线的对象
 */
function getAllCenterLines(matrix) {
  const size = matrix.length;
  const center = Math.floor(size / 2);

  const lines = {
    diag1: [],      // 1:1 线 (r-c=0)
    diag2: [],      // 1:1 镜像 (r+c=center*2)
    vertical: [],   // 垂直
    horizontal: [], // 水平
    horse21: [],    // 2:1 线 (r-center = 2*(c-center))
    horse21_m: [],  // 2:1 镜像
    horse12: [],    // 1:2 线 (c-center = 2*(r-center))
    horse12_m: []   // 1:2 镜像
  };

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const rowDiff = i - center;
      const colDiff = j - center;

      // --- 原有逻辑 ---
      if (i === j) lines.diag1.push({ r: i, c: j, value: matrix[i][j] });
      if (i + j === center * 2) lines.diag2.push({ r: i, c: j, value: matrix[i][j] });
      if (j === center) lines.vertical.push({ r: i, c: j, value: matrix[i][j] });
      if (i === center) lines.horizontal.push({ r: i, c: j, value: matrix[i][j] });

      // --- 骑士线 2:1 ---
      if (rowDiff === 2 * colDiff) lines.horse21.push({ r: i, c: j, value: matrix[i][j] });
      if (rowDiff === -2 * colDiff) lines.horse21_m.push({ r: i, c: j, value: matrix[i][j] });

      // --- 骑士线 1:2 ---
      if (colDiff === 2 * rowDiff) lines.horse12.push({ r: i, c: j, value: matrix[i][j] });
      if (colDiff === -2 * rowDiff) lines.horse12_m.push({ r: i, c: j, value: matrix[i][j] });
    }
  }

  // 排序确保从外向内或从一端到另一端（SVG渲染需要顺序）
  Object.keys(lines).forEach(key => {
    lines[key].sort((a, b) => a.r - b.r || a.c - b.c);
  });

  return lines;
}


/**
 * 判断点击的数字属于哪条中心射线
 *
 * @param {Object} lines 四条射线集合
 * @param {number} clickedValue 点击的数字
 * @returns {string|null} 返回射线key
 */
function findBelongLine(lines, clickedValue) {

  // 遍历四条线
  for (const key in lines) {

    // 判断当前射线中是否包含点击数字
    const exists = lines[key].some(item => item.value === clickedValue);

    if (exists) {
      return key;   // 找到就返回
    }
  }

  return null;      // 不在四条射线中
}

/**
 * 获取点击数字所在射线 + 与之垂直的射线
 *
 * 例如：
 * 点击43 → 属于 diag1
 * 那副线就是 diag2
 *
 * 点击49 → 属于 diag2
 * 那副线就是 diag1
 *
 * @param {Array<Array<number>>} matrix
 * @param {number} clickedValue
 * @returns {Object} { mainLine, crossLine }
 */
function getCrossLines(matrix, clickedValue, r, c) {
  const size = matrix.length;
  const center = Math.floor(size / 2);

  const dr = r - center; // 纵向位移
  const dc = c - center; // 横向位移
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  let mainLine = [];
  let crossLine = [];

  // 计算斜率
  const k = absDc === 0 ? 999 : absDr / absDc;

  /**
   * 【神级判定逻辑】
   * 我们要区分：
   * 1. 真正的垂直势力 (如 311, 93, 99) -> 走垂直
   * 2. 核心区特殊点 (如 32, 30, 26, 44 等) -> 走对角
   * * 规则：
   * 如果点在中心 4 步范围内 (absDr + absDc <= 4)，且不是正十字线，
   * 这种“短位骑士线”一律强制视为对角线。
   */
  const isCoreSpecial = (absDr + absDc <= 4) && (absDr !== 0 && absDc !== 0);

  // 判定开始
  if (!isCoreSpecial && k >= 1.75) {
    // 【垂直主轴】 捕获 311, 93, 99 等远端高位
    for (let i = 0; i < size; i++) mainLine.push({ r: i, c: c, value: matrix[i][c] });
    for (let j = 0; j < size; j++) crossLine.push({ r: center, c: j, value: matrix[center][j] });
    console.log("进入垂直主轴逻辑");
  }
  else if (!isCoreSpecial && k <= 0.57) {
    // 【水平主轴】
    for (let j = 0; j < size; j++) mainLine.push({ r: r, c: j, value: matrix[r][j] });
    for (let i = 0; i < size; i++) crossLine.push({ r: i, c: center, value: matrix[i][center] });
    console.log("进入水平主轴逻辑");
  }
  else {
    // 【对角轴逻辑】 32, 30, 26, 48, 44... 统统被赶到这里！
    console.log("进入对角轴逻辑");
    const isMainDiag = (dr * dc > 0);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (isMainDiag) {
          if (i - j === r - c) mainLine.push({ r: i, c: j, value: matrix[i][j] });
          if (i + j === center * 2) crossLine.push({ r: i, c: j, value: matrix[i][j] });
        } else {
          if (i + j === r + c) mainLine.push({ r: i, c: j, value: matrix[i][j] });
          if (i - j === 0) crossLine.push({ r: i, c: j, value: matrix[i][j] });
        }
      }
    }
  }

  mainLine.sort((a, b) => a.r - b.r || a.c - b.c);
  crossLine.sort((a, b) => a.r - b.r || a.c - b.c);

  return { mainLine, crossLine };
}


/**
 * 副线“下降模式” - 纯坐标判断
 * 逻辑：点击左/上侧去1，点击右/下侧带1
 */
/**
 * 副线“下降模式” - 纯坐标判断
 * 逻辑：找到同层且同行/列的参考点，向中心收敛。左/上侧去1，右/下侧带1
 */
function getCrossLineDown(crossLinePoints, r, c) {
  const size = matrix.value.length;
  const center = Math.floor(size / 2);

  const originIdx = crossLinePoints.findIndex(x => x.value === 1);
  if (originIdx === -1) return [];

  // 1. 获取点击点到中心的距离 L
  const L = Math.max(Math.abs(r - center), Math.abs(c - center));
  if (L === 0) return [];

  // 2. 筛选出副线上，距离中心同为 L 的候选点
  const candidates = crossLinePoints.filter(p =>
    Math.max(Math.abs(p.r - center), Math.abs(p.c - center)) === L
  );

  if (candidates.length === 0) return [];

  const clickedValue = matrix.value[r][c];

  // 3. 寻找投影点：同样位于 r 或 c 的上面 (比如点击 5,13 找 5,5) 并且值小于点击值
  let projPoint = candidates.find(p => (p.r === r || p.c === c) && p.value < clickedValue);

  // 兜底：如果没有符合小于点击值的（比如点到某些特定轴），优先保同行/列，再保更小值
  if (!projPoint) projPoint = candidates.find(p => p.r === r || p.c === c);
  if (!projPoint) projPoint = candidates.find(p => p.value < clickedValue);
  if (!projPoint) projPoint = candidates[0];

  const projIdx = crossLinePoints.findIndex(x => x.r === projPoint.r && x.c === projPoint.c);
  if (projIdx === -1) return [];

  // 4. 修正截取方向：下降趋势代表从外向中心 (originIdx) 收敛
  let startIdx = Math.min(projIdx, originIdx);
  let endIdx = Math.max(projIdx, originIdx);

  // 5. 应用边界规则：点击左/上侧去1，点击右/下侧带1
  const isBeforeCenter = (r < center || c < center);
  if (isBeforeCenter) {
    if (startIdx === originIdx) startIdx++;
    if (endIdx === originIdx) endIdx--;
  }

  // 调试信息，你可以保留用来观察坐标映射是否正确
  console.log(`[下降模式] 点击(${r},${c})[${clickedValue}] -> 映射副坐标:(${projPoint.r},${projPoint.c})[${projPoint.value}]`);

  return crossLinePoints.slice(
    Math.max(0, startIdx),
    Math.min(crossLinePoints.length, endIdx + 1)
  );
}
/**
 * 主线“上升模式”
 * 规则：
 * 1️⃣ 找到点击值位置
 * 2️⃣ 找到 1 的位置
 * 3️⃣ 向“远离 1 的方向”遍历
 * 4️⃣ 只取 > clickedValue
 * 5️⃣ 连续区间
 */
function getMainLineUp(mainLine, clickedValue) {
  const originIndex = mainLine.findIndex(x => x.value === 1);
  const clickIndex = mainLine.findIndex(x => x.value === clickedValue);

  if (originIndex === -1 || clickIndex === -1) return [];

  const distance = Math.abs(clickIndex - originIndex);

  // 无论点击在哪，两端的索引分别是：
  const leftBound = originIndex - distance;
  const rightBound = originIndex + distance;

  let start, end;

  if (clickIndex < originIndex) {
    // 情况 A: 点击在左边 (如 57)
    // 排除左端的 57 (start = 5 + 1)，保留右端的 73 (end = 13)
    start = leftBound + 1;
    end = rightBound;
  } else {
    // 情况 B: 点击在右边 (如 73)
    // 保留左端的 91 (start = 5)，排除右端的 73 (end = 13 - 1)
    start = leftBound - 1;
    end = rightBound - 1;
  }
  // slice 是左闭右开，所以 end + 1
  return mainLine.slice(Math.max(0, start), Math.min(mainLine.length, end + 1));
}

/**
 * 副线“上升模式” - 基于坐标物理位置判定
 * @param {Array} crossLinePoints - 副线对象数组 [{r, c, value}, ...]
 * @param {number} clickR - 点击点的行坐标
 * @param {number} clickC - 点击点的列坐标
 */
/**
 * 副线“上升模式” - 坐标置换逻辑
 * @param {Array} crossLinePoints - 副线对象数组
 * @param {number} r - 点击点的行坐标
 * @param {number} c - 点击点的列坐标
 */
function getCrossLineUp(crossLinePoints, r, c) {
  if (!Array.isArray(crossLinePoints) || crossLinePoints.length === 0) return [];

  const originIndex = crossLinePoints.findIndex(x => x.value === 1); // 假设是 9
  if (originIndex === -1) return [];

  let start, end;

  if (r < c) {
    /**
     * 【情况：r < c】 (如点击 17, 坐标 7, 11)
     * 1. 目标索引直接等于 c (即 11)
     * 2. 截取区间：从 1 的后面开始，到索引 c 为止
     * 结果：[origin + 1, c] -> 不包含 1
     */
    start = originIndex + 1;
    end = c;
    console.log('start end===>', start, end);
  } else if (r > c) {
    /**
     * 【情况：r > c】 (如点击 25, 坐标 11, 7)
     * 1. 目标索引直接等于 r (即 11)
     * 2. 截取区间：从索引 r 对应的镜像位，到 1 为止
     * 结果：[origin - (r - origin), origin] -> 包含 1
     */
    const diff = r - originIndex;
    start = originIndex - diff - 1;
    end = originIndex;
  } else {
    /**
     * 【情况 3：r === c】 (点击点就在副轴上)
     * 逻辑：直接比较 r 和原点坐标 originIndex
     */
    if (r < originIndex) {
      // 在 1 的左上方 (如点击 13, 坐标 7, 7)
      // 规则：获取从该点到 1 之前的，不包含 1
      // 区间：[r, originIndex - 1]
      start = r;
      end = originIndex - 1;
    } else if (r > originIndex) {
      // 在 1 的右下方
      // 规则：包含 1，通常取到镜像位
      const diff = r - originIndex;
      start = originIndex;
      end = originIndex + diff;
    } else {
      // 点击的就是 1 本身
      return [crossLinePoints[originIndex]];
    }
  }

  // 执行截取
  return crossLinePoints.slice(
    Math.max(0, start),
    Math.min(crossLinePoints.length, end + 1)
  );
}

/**
 * 根据数值数组，从矩阵中提取对应的坐标点
 * @param {Array<Array<number>>} matrix - 你的九方图二维数组
 * @param {Array<number>} values - [307, 241, 183, ...]
 * @returns {Array<{r:number, c:number, value:number}>}
 */
function getPointsFromMatrix(matrix, values) {
  const result = [];
  const size = matrix.length;

  // 遍历传入的数值数组
  values.forEach(val => {
    // 在矩阵中搜索该数值
    let found = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c] === val) {
          result.push({ r, c, value: val });
          found = true;
          break;
        }
      }
      if (found) break;
    }
  });

  return result;
}

function convertToPointArray(matrix, valueArray) {
  const size = matrix.length;
  const valToPos = {};

  // 建立临时索引提升速度
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      valToPos[matrix[r][c]] = { r, c };
    }
  }

  return valueArray.map(v => {
    const pos = valToPos[v];
    return pos ? { r: pos.r, c: pos.c, value: v } : null;
  }).filter(item => item !== null);
}

/* =======点击逻辑 =====*/
function handleCellClick(r, c) {
  console.log('坐标 r:' + r, '坐标 c:' + c);

  if (!form.modeEnabled) return;
  // 1️⃣ 获取点击数字
  const clickedValue = matrix.value[r][c];
  console.log("点击值:", clickedValue);

  // 2️⃣ 保存选中格子
  selectedCell.value = { r, c };

  // 3️⃣ 获取主线 + 副线
  const { mainLine, crossLine } = getCrossLines(matrix.value, clickedValue, r, c);
  console.log("主线:", mainLine.map(x => x.value));
  console.log("副线:", crossLine.map(x => x.value));

  const mainLinePoints = convertToPointArray(matrix.value, mainLine.map(x => x.value || x));
  const crossLinePoints = convertToPointArray(matrix.value, crossLine.map(x => x.value || x));
  console.log('mainLinePoints', mainLinePoints);
  console.log('crossLinePoints', crossLinePoints);

  // 4️⃣ 根据趋势筛选
  let trendMain = [];
  let trendCross = [];

  if (form.trendDirection === "down") {
    trendMain = mainLine.filter(x => x.value < clickedValue);
    trendCross = getCrossLineDown(crossLinePoints, r, c);
  }

  if (form.trendDirection === "up") {
    trendMain = getMainLineUp(mainLine, clickedValue);
    trendCross = getCrossLineUp(crossLinePoints, r, c);
  }

  trendCells.value = [...trendMain, ...trendCross];

  console.log("趋势主线:", trendMain.map(x => x.value));
  console.log("趋势副线:", trendCross.map(x => x.value));
}



/* =============================
   样式控制
============================= */
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

  // 点击格子（绿色）
  if (
    selectedCell.value &&
    selectedCell.value.r === r &&
    selectedCell.value.c === c
  ) {
    backgroundColor = "#2DFF8E";
  }

  // 趋势格子（红色）
  const isTrend = trendCells.value.some(
    pos => pos.r === r && pos.c === c
  );

  if (isTrend) {
    backgroundColor = "#FF8E8E";
  }

  // 搜索高亮
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
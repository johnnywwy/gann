<template>
  <section class="time-cycle-panel">
    <div class="time-cycle-head">
      <div>
        <p class="eyebrow">Gann Time</p>
        <h2>江恩时间窗口</h2>
      </div>
      <div class="formula-card">
        <span>公式</span>
        <strong>起始时间 + 周期 x 角度 / 360</strong>
      </div>
    </div>

    <div class="time-cycle-controls">
      <label class="time-field">
        <span>起始时间</span>
        <el-date-picker
          v-model="timeForm.startAt"
          type="date"
          value-format="YYYY-MM-DD"
          format="YYYY年MM月DD日"
          size="large"
        />
      </label>

      <label class="time-field">
        <span>周期类型</span>
        <el-segmented v-model="timeForm.cycleGroup" :options="cycleGroupOptions" size="large" />
      </label>

      <label class="time-field">
        <span>推断周期</span>
        <el-select v-model="timeForm.cycleKey" size="large" @change="syncCycleGroupByKey">
          <el-option
            v-for="cycle in activeCycleOptions"
            :key="cycle.key"
            :label="cycle.label"
            :value="cycle.key"
          />
        </el-select>
      </label>

    </div>

    <div class="time-cycle-summary">
      <el-tag type="info" effect="plain">{{ activeCycle.label }}</el-tag>
      <el-tag type="warning" effect="plain">重点角度: 90 / 180 / 270 / 360</el-tag>
    </div>

    <div class="time-cycle-table-wrap">
      <table class="time-cycle-table">
        <thead>
          <tr>
            <th>角度</th>
            <th>级别</th>
            <th>增加时间</th>
            <th>潜在转折时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in projectedRows" :key="row.angle" :class="{ important: row.important }">
            <td class="angle-cell">{{ row.angle }}°</td>
            <td>
              <el-tag :type="row.important ? 'danger' : 'info'" effect="plain" size="small">
                {{ row.important ? "重点" : "次级" }}
              </el-tag>
            </td>
            <td>{{ row.offsetLabel }}</td>
            <td>{{ row.dateLabel }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, watch } from "vue";

const props = defineProps({
  startDate: {
    type: String,
    default: "",
  },
});
const IMPORTANT_ANGLES = new Set([90, 180, 270, 360]);
const GANN_ANGLES = [30, 45, 60, 90, 120, 135, 180, 210, 225, 240, 270, 300, 315, 330, 360];
const cycleGroupOptions = [
  { label: "短周期", value: "short" },
  { label: "中周期", value: "middle" },
  { label: "年周期", value: "year" },
];
const cycleOptions = [
  { key: "7d", label: "7 天周期", group: "short", unit: "day", length: 7 },
  { key: "14d", label: "14 天周期", group: "short", unit: "day", length: 14 },
  { key: "21d", label: "21 天周期", group: "short", unit: "day", length: 21 },
  { key: "30d", label: "30 天周期", group: "short", unit: "day", length: 30 },
  { key: "45d", label: "45 天周期", group: "short", unit: "day", length: 45 },
  { key: "49d", label: "49 天周期", group: "short", unit: "day", length: 49 },
  { key: "60d", label: "60 天周期", group: "short", unit: "day", length: 60 },
  { key: "90d", label: "90 天周期", group: "short", unit: "day", length: 90 },
  { key: "120d", label: "120 天周期", group: "middle", unit: "day", length: 120 },
  { key: "144d", label: "144 天周期", group: "middle", unit: "day", length: 144 },
  { key: "180d", label: "180 天周期", group: "middle", unit: "day", length: 180 },
  { key: "270d", label: "270 天周期", group: "middle", unit: "day", length: 270 },
  { key: "360d", label: "360 天周期", group: "middle", unit: "day", length: 360 },
  { key: "1y", label: "1 年周期", group: "year", unit: "month", length: 12 },
  { key: "3y", label: "3 年周期", group: "year", unit: "month", length: 36 },
  { key: "5y", label: "5 年周期", group: "year", unit: "month", length: 60 },
  { key: "7y", label: "7 年周期", group: "year", unit: "month", length: 84 },
  { key: "10y", label: "10 年周期", group: "year", unit: "month", length: 120 },
  { key: "20y", label: "20 年周期", group: "year", unit: "month", length: 240 },
  { key: "30y", label: "30 年周期", group: "year", unit: "month", length: 360 },
  { key: "60y", label: "60 年周期", group: "year", unit: "month", length: 720 },
];

const timeForm = reactive({
  startAt: "2026-03-30",
  cycleGroup: "short",
  cycleKey: "60d",
});

const activeCycleOptions = computed(() => (
  cycleOptions.filter(item => item.group === timeForm.cycleGroup)
));
const activeCycle = computed(() => (
  cycleOptions.find(item => item.key === timeForm.cycleKey) || cycleOptions[0]
));

const projectedRows = computed(() => {
  const start = parseDateTime(timeForm.startAt);
  if (!start) return [];

  return GANN_ANGLES.map(angle => {
    const offset = activeCycle.value.length * angle / 360;
    const projectedDate = activeCycle.value.unit === "month"
      ? addMonthsByExcelStyle(start, offset)
      : addDaysByDayPrecision(start, offset);
    const important = IMPORTANT_ANGLES.has(angle);

    return {
      angle,
      important,
      offsetLabel: formatOffset(offset, activeCycle.value.unit),
      dateLabel: formatChineseDate(projectedDate),
      date: formatIsoDate(projectedDate),
      timestamp: projectedDate.getTime(),
    };
  });
});
watch(
  () => timeForm.cycleGroup,
  () => {
    if (activeCycleOptions.value.some(item => item.key === timeForm.cycleKey)) return;
    timeForm.cycleKey = activeCycleOptions.value[0]?.key || cycleOptions[0].key;
  }
);

watch(
  () => props.startDate,
  value => {
    if (!value) return;
    timeForm.startAt = value;
  },
  { immediate: true }
);

function addMonthsByExcelStyle(date, months) {
  const wholeMonths = Math.trunc(Number(months) || 0);
  const next = new Date(date);
  next.setMonth(next.getMonth() + wholeMonths);
  return next;
}

function syncCycleGroupByKey(value) {
  const matched = cycleOptions.find(item => item.key === value);
  if (matched) {
    timeForm.cycleGroup = matched.group;
  }
}

function addDays(date, days) {
  const next = new Date(date);
  next.setTime(next.getTime() + (Number(days) || 0) * 86400 * 1000);
  return next;
}

function addDaysByDayPrecision(date, days) {
  return addDays(date, Math.trunc(Number(days) || 0));
}

function parseDateTime(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatOffset(value, unit) {
  if (unit === "month") {
    return `${Number(value).toFixed(2).replace(/\.?0+$/, "")}个月`;
  }

  return `${Math.trunc(Number(value) || 0)}天`;
}

function formatChineseDate(date) {
  if (!date || !Number.isFinite(date.getTime())) return "--";

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatIsoDate(date) {
  if (!date || !Number.isFinite(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
</script>

<style scoped>
.time-cycle-panel {
  display: grid;
  gap: 14px;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 40px rgba(30, 57, 102, 0.08);
}

.time-cycle-head {
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

.formula-card {
  min-width: 238px;
  padding: 10px 12px;
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 14px;
  background: #fbfdff;
  text-align: right;
}

.formula-card span {
  display: block;
  color: #607090;
  font-size: 12px;
}

.formula-card strong {
  display: block;
  margin-top: 3px;
  color: #101828;
  font-size: 14px;
}

.time-cycle-controls {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(220px, 0.85fr) minmax(180px, 0.7fr);
  gap: 10px;
}

.time-field {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 14px;
  background: #fbfdff;
}

.time-field span {
  font-size: 14px;
  font-weight: 800;
}

:deep(.el-date-editor),
:deep(.el-segmented),
:deep(.el-select),
:deep(.el-input-number) {
  width: 100%;
}

.time-cycle-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.time-cycle-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 14px;
  background: #ffffff;
}

.time-cycle-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: 12px;
}

.time-cycle-table th,
.time-cycle-table td {
  padding: 9px 10px;
  border-bottom: 1px solid #eef1f5;
  color: #344054;
  text-align: left;
  white-space: nowrap;
}

.time-cycle-table th {
  background: #f8fafc;
  color: #667085;
  font-weight: 800;
}

.time-cycle-table tr:last-child td {
  border-bottom: 0;
}

.time-cycle-table tr.important {
  background: #fff7f7;
}

.angle-cell {
  color: #101828;
  font-size: 13px;
  font-weight: 900;
}

@media (max-width: 860px) {
  .time-cycle-head,
  .time-cycle-controls {
    grid-template-columns: 1fr;
  }

  .time-cycle-head {
    display: grid;
  }

  .formula-card {
    min-width: 0;
    text-align: left;
  }
}

@media (max-width: 640px) {
  .time-cycle-panel {
    margin-top: 12px;
    padding: 12px;
    border-radius: 16px;
  }
}
</style>

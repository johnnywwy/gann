<template>
  <section v-if="stats" class="projection-stat-panel">
    <div class="projection-stat-head">
      <div>
        <p>股票推演统计</p>
        <strong>{{ stats.title }}</strong>
        <span>{{ stats.subtitle }}</span>
      </div>
      <button type="button" class="projection-stat-close" @click="$emit('close')">关闭</button>
    </div>

    <div class="projection-stat-summary">
      <div class="summary-card">
        <span>触发次数</span>
        <strong>{{ stats.totalEvents || 0 }}</strong>
      </div>
      <div class="summary-card">
        <span>转折命中</span>
        <strong>{{ stats.hitCount || 0 }} / {{ formatPercent(stats.hitRate) }}</strong>
      </div>
      <div class="summary-card">
        <span>总收益</span>
        <strong :class="profitClass(stats.totalPnl)">{{ formatMoney(stats.totalPnl) }}</strong>
      </div>
      <div class="summary-card">
        <span>平均收益</span>
        <strong :class="profitClass(stats.averagePnl)">{{ formatMoney(stats.averagePnl) }}</strong>
      </div>
      <div class="summary-card">
        <span>胜率</span>
        <strong>{{ formatPercent(stats.winRate) }}</strong>
      </div>
    </div>

    <div class="projection-stat-table-wrap">
      <table class="projection-stat-table">
        <thead>
          <tr>
            <th>江恩位</th>
            <th>线型</th>
            <th>触发</th>
            <th>转折</th>
            <th>命中率</th>
            <th>胜率</th>
            <th>平均P&L</th>
            <th>最大浮盈</th>
            <th>最大回撤</th>
            <th>最近触发</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in stats.rows" :key="`${row.price}-${row.lineType}`">
            <td class="price-cell">{{ row.price }}</td>
            <td>{{ row.lineLabel }}</td>
            <td>{{ row.tests }}</td>
            <td>{{ row.hits }}</td>
            <td>{{ formatPercent(row.hitRate) }}</td>
            <td>{{ formatPercent(row.winRate) }}</td>
            <td :class="profitClass(row.averagePnl)">{{ formatMoney(row.averagePnl) }}</td>
            <td :class="profitClass(row.maxRunup)">{{ formatMoney(row.maxRunup) }}</td>
            <td :class="profitClass(row.maxDrawdown)">{{ formatMoney(row.maxDrawdown) }}</td>
            <td>{{ row.latestDate || "--" }}</td>
          </tr>
          <tr v-if="!stats.rows?.length">
            <td class="empty-cell" colspan="10">暂无触发记录</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    default: null,
  },
});

defineEmits(["close"]);

function formatMoney(value) {
  const number = Number(value) || 0;
  const sign = number >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(number).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value) {
  return `${((Number(value) || 0) * 100).toFixed(2)}%`;
}

function profitClass(value) {
  return Number(value) >= 0 ? "profit positive" : "profit negative";
}
</script>

<style scoped>
.projection-stat-panel {
  border: 1px solid rgba(34, 44, 74, 0.08);
  border-radius: 14px;
  background: #fbfdff;
  overflow: hidden;
}

.projection-stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(34, 44, 74, 0.08);
  background: #ffffff;
}

.projection-stat-head p {
  margin: 0 0 4px;
  color: #2d6cdf;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.projection-stat-head strong {
  display: block;
  color: #101828;
  font-size: 15px;
}

.projection-stat-head span {
  display: block;
  margin-top: 3px;
  color: #667085;
  font-size: 12px;
}

.projection-stat-close {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #d9e2f0;
  border-radius: 6px;
  background: #ffffff;
  color: #344054;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.projection-stat-close:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.projection-stat-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(34, 44, 74, 0.08);
}

.summary-card {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 10px;
  border: 1px solid #eef1f5;
  border-radius: 8px;
  background: #ffffff;
}

.summary-card span {
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.summary-card strong {
  color: #101828;
  font-size: 16px;
  font-weight: 900;
}

.projection-stat-table-wrap {
  overflow-x: auto;
}

.projection-stat-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  font-size: 12px;
}

.projection-stat-table th,
.projection-stat-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #eef1f5;
  color: #344054;
  text-align: left;
  white-space: nowrap;
}

.projection-stat-table th {
  background: #f8fafc;
  color: #667085;
  font-weight: 800;
}

.projection-stat-table .price-cell {
  color: #101828;
  font-size: 13px;
  font-weight: 900;
}

.projection-stat-table .empty-cell {
  padding: 18px 10px;
  color: #98a2b3;
  text-align: center;
}

.profit.positive {
  color: #12875a;
  font-weight: 900;
}

.profit.negative {
  color: #d94141;
  font-weight: 900;
}

@media (max-width: 860px) {
  .projection-stat-head {
    align-items: flex-start;
  }

  .projection-stat-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .projection-stat-head {
    display: grid;
  }

  .projection-stat-close {
    justify-self: start;
  }

  .projection-stat-summary {
    grid-template-columns: 1fr;
  }
}
</style>

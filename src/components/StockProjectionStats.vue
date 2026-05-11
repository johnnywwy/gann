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

    <div class="projection-stat-table-wrap">
      <table class="projection-stat-table">
        <thead>
          <tr>
            <th>江恩位</th>
            <th>线型</th>
            <th>接近</th>
            <th>受压</th>
            <th>支撑</th>
            <th>跌破/突破</th>
            <th>最近信号</th>
            <th>最近日期</th>
            <th>后续幅度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in stats.rows" :key="`${row.price}-${row.lineType}-${row.rank}`">
            <td class="price-cell">{{ row.price }}</td>
            <td>{{ row.lineLabel }}</td>
            <td>{{ row.tests }}</td>
            <td>{{ row.rejections }}</td>
            <td>{{ row.supports }}</td>
            <td>{{ row.breaks }}</td>
            <td>{{ row.latestSignal }}</td>
            <td>{{ row.latestDate || "--" }}</td>
            <td>{{ row.latestMove || "--" }}</td>
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

.projection-stat-table-wrap {
  overflow-x: auto;
}

.projection-stat-table {
  width: 100%;
  min-width: 920px;
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
</style>

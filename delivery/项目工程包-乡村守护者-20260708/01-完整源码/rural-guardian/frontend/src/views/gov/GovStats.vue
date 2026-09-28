<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import StatCard from '../../components/StatCard.vue'
import { getDashboardStats } from '../../api/dashboard'

const alertPieRef = ref(null)
const orderBarRef = ref(null)
const trendLineRef = ref(null)

const stats = ref({
  elderlyCount: 0, alertPending: 0, orderPending: 0,
  deviceOnline: 0, deviceOffline: 0, villageCount: 0,
  providerCount: 0, livingAloneCount: 0,
})

const alertByType = ref([])
const orderByType = ref([])
const alertTrend = ref([])

let charts = []

function initChart(dom, option) {
  const chart = echarts.init(dom)
  chart.setOption(option)
  charts.push(chart)
}

async function fetchData() {
  try {
    const res = await getDashboardStats()
    if (res.code === 200) {
      const d = res.data
      stats.value = d.overview
      alertByType.value = d.alertByType || []
      orderByType.value = d.orderByType || []
      alertTrend.value = d.alertTrend || []

      await nextTick()
      renderCharts()
    }
  } catch (err) {
    console.error(err)
  }
}

function renderCharts() {
  // 预警类型饼图
  if (alertPieRef.value) {
    const typeMap = { FALL: '跌倒', HEALTH_ABNORMAL: '健康异常', SOS: 'SOS求助', GEO_FENCE: '越界', DEVICE_OFFLINE: '设备离线' }
    const data = alertByType.value.map((i) => ({ name: typeMap[i.type] || i.type, value: i.count }))
    initChart(alertPieRef.value, {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', textStyle: { fontSize: 12 } },
      legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
      series: [{
        type: 'pie', radius: ['35%', '65%'], center: ['50%', '45%'],
        data, label: { color: '#e2e8f0' },
        itemStyle: { borderColor: '#1e293b', borderWidth: 2 },
      }],
      color: ['#f87171', '#fbbf24', '#60a5fa', '#a78bfa', '#64748b'],
    })
  }

  // 工单类型柱状图
  if (orderBarRef.value) {
    const typeMap = { MEDICAL: '医疗', LIFE_CARE: '生活照料', EMERGENCY: '紧急救援', COMPANION: '陪护', OTHER: '其他' }
    const names = orderByType.value.map((i) => typeMap[i.type] || i.type)
    const values = orderByType.value.map((i) => i.count)
    initChart(orderBarRef.value, {
      tooltip: { trigger: 'axis', textStyle: { fontSize: 12 } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: names, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
      series: [{
        type: 'bar', data: values, barWidth: '40%',
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#60a5fa' }, { offset: 1, color: '#3b82f6' }]), borderRadius: [4, 4, 0, 0] },
      }],
    })
  }

  // 趋势折线图
  if (trendLineRef.value) {
    const dates = alertTrend.value.map((i) => i.date)
    const counts = alertTrend.value.map((i) => i.count)
    initChart(trendLineRef.value, {
      tooltip: { trigger: 'axis', textStyle: { fontSize: 12 } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
      series: [{
        name: '预警数量', type: 'line', data: counts, smooth: true,
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(251, 191, 36, 0.3)' }, { offset: 1, color: 'rgba(251, 191, 36, 0.02)' }]) },
        lineStyle: { color: '#fbbf24', width: 2 }, itemStyle: { color: '#fbbf24' },
      }],
    })
  }
}

function handleResize() { charts.forEach((c) => c.resize()) }

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  charts.forEach((c) => c.dispose())
  charts = []
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2>数据统计</h2>
    </div>

    <!-- 统计概览 -->
    <div class="stat-cards">
      <StatCard
        title="老人总数"
        :value="stats.elderlyCount"
        icon="User"
        color="#34d399"
      />
      <StatCard
        title="独居老人"
        :value="stats.livingAloneCount"
        icon="House"
        color="#f472b6"
      />
      <StatCard
        title="预警总数(待处理)"
        :value="stats.alertPending"
        icon="Bell"
        color="#f87171"
      />
      <StatCard
        title="工单总数(进行中)"
        :value="stats.orderPending"
        icon="Document"
        color="#60a5fa"
      />
    </div>

    <!-- 图表 -->
    <div class="charts-row">
      <div class="chart-container">
        <h3>预警类型分布</h3>
        <div
          ref="alertPieRef"
          style="height: 360px"
        />
      </div>
      <div class="chart-container">
        <h3>工单类型分布</h3>
        <div
          ref="orderBarRef"
          style="height: 360px"
        />
      </div>
    </div>

    <div class="charts-row">
      <div
        class="chart-container"
        style="grid-column: 1 / -1"
      >
        <h3>近7天预警趋势</h3>
        <div
          ref="trendLineRef"
          style="height: 360px"
        />
      </div>
    </div>

    <!-- 设备统计 -->
    <div class="stat-cards">
      <StatCard
        title="在线设备"
        :value="stats.deviceOnline"
        icon="Monitor"
        color="#a78bfa"
      />
      <StatCard
        title="离线设备"
        :value="stats.deviceOffline"
        icon="Monitor"
        color="#64748b"
      />
      <StatCard
        title="村庄数量"
        :value="stats.villageCount"
        icon="OfficeBuilding"
        color="#fbbf24"
      />
      <StatCard
        title="服务商数量"
        :value="stats.providerCount"
        icon="Shop"
        color="#fb923c"
      />
    </div>
  </div>
</template>

<style scoped>
.chart-container h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}
</style>

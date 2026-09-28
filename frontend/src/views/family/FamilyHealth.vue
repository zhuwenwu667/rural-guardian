<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { getHealthList } from '../../api/health'
import { getFamilyList } from '../../api/family'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const loading = ref(false)
const tableData = ref([])
const chartData = ref([])
const familyMembers = ref([])
const dateRange = ref(null)
const heartRateRef = ref(null)
const bloodPressureRef = ref(null)

const filters = reactive({ elderlyId: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

let charts = []

async function fetchFamily() {
  try {
    const res = await getFamilyList({ userId: userStore.userInfo?.id, page: 1, pageSize: 50 })
    if (res.code === 200) {
      familyMembers.value = res.data.list
      if (res.data.list.length > 0 && !filters.elderlyId) {
        filters.elderlyId = res.data.list[0].elderlyId
      }
    }
  } catch (err) {
    console.error(err)
  }
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.elderlyId) params.elderlyId = filters.elderlyId
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getHealthList(params)
    if (res.code === 200) {
      tableData.value = res.data.list
      pagination.total = res.data.total
    }
    // 独立获取图表完整数据（不分页）
    await fetchChartData()
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function fetchChartData() {
  try {
    const params = { pageSize: 100 }
    if (filters.elderlyId) params.elderlyId = filters.elderlyId
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getHealthList(params)
    if (res.code === 200) {
      chartData.value = res.data.list || []
      await nextTick()
      renderCharts()
    }
  } catch (err) {
    console.error(err)
  }
}

function renderCharts() {
  charts.forEach((c) => c.dispose())
  charts = []

  const records = [...chartData.value].reverse()

  if (heartRateRef.value && records.length > 0) {
    const chart = echarts.init(heartRateRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis', textStyle: { fontSize: 12 } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: records.map((r) => r.recordDate), axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
      series: [{ name: '心率', type: 'line', data: records.map((r) => r.heartRate), smooth: true, lineStyle: { color: '#f87171' }, itemStyle: { color: '#f87171' } }],
    })
    charts.push(chart)
  }

  if (bloodPressureRef.value && records.length > 0) {
    const chart = echarts.init(bloodPressureRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis', textStyle: { fontSize: 12 } },
      legend: { data: ['收缩压', '舒张压'], textStyle: { color: '#94a3b8' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: records.map((r) => r.recordDate), axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
      series: [
        { name: '收缩压', type: 'line', data: records.map((r) => r.bloodPressureSystolic), smooth: true, lineStyle: { color: '#60a5fa' }, itemStyle: { color: '#60a5fa' } },
        { name: '舒张压', type: 'line', data: records.map((r) => r.bloodPressureDiastolic), smooth: true, lineStyle: { color: '#34d399' }, itemStyle: { color: '#34d399' } },
      ],
    })
    charts.push(chart)
  }
}

function handleResize() { charts.forEach((c) => c.resize()) }

onMounted(() => {
  fetchFamily().then(() => fetchData())
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
      <h2>健康监测</h2>
    </div>

    <div class="filter-bar">
      <el-select
        v-model="filters.elderlyId"
        placeholder="选择老人"
        clearable
        style="width: 180px"
        @change="fetchData"
      >
        <el-option
          v-for="item in familyMembers"
          :key="item.id"
          :label="item.elderlyName"
          :value="item.elderlyId"
        />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 280px"
        @change="fetchData"
      />
      <el-button
        type="primary"
        @click="fetchData"
      >
        查询
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="tableData"
      stripe
      border
    >
      <el-table-column
        prop="id"
        label="ID"
        width="70"
      />
      <el-table-column
        prop="elderlyName"
        label="老人"
        width="100"
      />
      <el-table-column
        prop="heartRate"
        label="心率(bpm)"
        width="110"
      />
      <el-table-column
        prop="bloodPressureSystolic"
        label="收缩压"
        width="90"
      />
      <el-table-column
        prop="bloodPressureDiastolic"
        label="舒张压"
        width="90"
      />
      <el-table-column
        prop="bloodOxygen"
        label="血氧(%)"
        width="90"
      />
      <el-table-column
        prop="temperature"
        label="体温(C)"
        width="90"
      />
      <el-table-column
        prop="sleepHours"
        label="睡眠(小时)"
        width="100"
      />
      <el-table-column
        prop="steps"
        label="步数"
        width="80"
      />
      <el-table-column
        prop="recordDate"
        label="记录日期"
        width="120"
      />
      <el-table-column
        prop="notes"
        label="备注"
        show-overflow-tooltip
      />
    </el-table>

    <div style="display: flex; justify-content: flex-end; margin-top: 16px">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </div>

    <!-- 健康趋势图表 -->
    <div
      v-if="chartData.length > 0"
      class="charts-row"
    >
      <div class="chart-container">
        <h3>心率趋势</h3>
        <div
          ref="heartRateRef"
          style="height: 280px"
        />
      </div>
      <div class="chart-container">
        <h3>血压趋势</h3>
        <div
          ref="bloodPressureRef"
          style="height: 280px"
        />
      </div>
    </div>
    <el-empty
      v-if="!loading && tableData.length === 0"
      description="暂无数据"
    />
  </div>
</template>

<style scoped>
.chart-container h3 {
  font-size: var(--font-size-h3);
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}
</style>

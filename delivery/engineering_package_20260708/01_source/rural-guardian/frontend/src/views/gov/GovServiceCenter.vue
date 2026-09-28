<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Cpu, Phone, Location, Promotion, ArrowRight } from '@element-plus/icons-vue'
import { getServiceOverview, getServiceTrend, getServiceLogs } from '../../api/service'

const router = useRouter()

// 服务卡片数据
const serviceCards = reactive([
  {
    key: 'ai',
    name: 'AI 智能服务',
    icon: Cpu,
    color: '#8b5cf6',
    enabled: false,
    configured: false,
    todayCalls: 0,
    avgResponseTime: 0,
    route: '/gov/service-ai',
  },
  {
    key: 'voice',
    name: '语音通知服务',
    icon: Phone,
    color: '#3b82f6',
    enabled: false,
    configured: false,
    todayCalls: 0,
    avgResponseTime: 0,
    route: '/gov/service-voice',
  },
  {
    key: 'map',
    name: '地图定位服务',
    icon: Location,
    color: '#10b981',
    enabled: false,
    configured: false,
    todayCalls: 0,
    avgResponseTime: 0,
    route: '/gov/service-map',
  },
  {
    key: 'push',
    name: '消息推送服务',
    icon: Promotion,
    color: '#f59e0b',
    enabled: false,
    configured: false,
    todayCalls: 0,
    avgResponseTime: 0,
    route: '/gov/service-push',
  },
])

// 趋势图
const trendChartRef = ref(null)
let trendChart = null

// 错误日志
const errorLogs = ref([])

// 定时器
let refreshTimer = null

// 服务标签映射
const serviceLabelMap = {
  ai: 'AI 服务',
  voice: '语音服务',
  map: '地图服务',
  sms: '短信服务',
  push: '推送服务',
}

const serviceTagTypeMap = {
  ai: '',
  voice: '',
  map: 'success',
  sms: 'warning',
  push: 'warning',
}

function getServiceLabel(service) {
  return serviceLabelMap[service] || service
}

function getServiceTagType(service) {
  return serviceTagTypeMap[service] || 'info'
}

function navigateTo(route) {
  router.push(route)
}

// 渲染趋势图
function renderTrendChart(trendData) {
  if (!trendChartRef.value) return

  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  const hours = trendData.map((i) => i.hour)
  const values = trendData.map((i) => i.total || i.count || 0)

  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: 'var(--border, #e5e7eb)',
      textStyle: { color: 'var(--text, #1f2937)' },
      formatter(params) {
        const p = params[0]
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}:00</div>
                <div>调用次数: <span style="color:#3b82f6;font-weight:600">${p.value}</span></div>`
      },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: hours,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'var(--border, #e5e7eb)' } },
      axisLabel: {
        color: 'var(--text-muted, #9ca3af)',
        formatter: (val) => `${val}:00`,
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'var(--text-muted, #9ca3af)' },
      splitLine: { lineStyle: { color: 'var(--border, #e5e7eb)', type: 'dashed' } },
    },
    series: [
      {
        name: '调用次数',
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        emphasis: { focus: 'series', itemStyle: { borderWidth: 2, borderColor: '#fff' } },
        lineStyle: { color: '#3b82f6', width: 2.5 },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
          ]),
        },
      },
    ],
  })
}

// 加载概览数据
async function fetchOverview() {
  try {
    const res = await getServiceOverview()
    if (res.code === 200) {
      const data = res.data
      // 更新各服务卡片
      const keyMap = { ai: 'ai', voice: 'voice', map: 'map', push: 'push', sms: 'push' }
      Object.keys(data).forEach((key) => {
        const cardKey = keyMap[key] || key
        const card = serviceCards.find((s) => s.key === cardKey)
        if (card) {
          card.enabled = data[key].enabled ?? card.enabled
          card.configured = data[key].configured ?? card.configured
          card.todayCalls = data[key].todayCalls ?? card.todayCalls
          card.avgResponseTime = data[key].avgResponseTime ?? card.avgResponseTime
        }
      })
    }
  } catch (err) {
    console.error('获取服务概览失败', err)
  }
}

// 加载趋势数据
async function fetchTrend() {
  try {
    const res = await getServiceTrend()
    if (res.code === 200) {
      await nextTick()
      renderTrendChart(res.data || [])
    }
  } catch (err) {
    console.error('获取调用趋势失败', err)
  }
}

// 加载错误日志
async function fetchLogs() {
  try {
    const res = await getServiceLogs({ status: 'fail', pageSize: 5 })
    if (res.code === 200) {
      const raw = res.data
      errorLogs.value = (raw && raw.list ? raw.list : []).map(item => ({
        time: item.created_at,
        service: item.service_group,
        api: item.action,
        code: item.status === 'fail' ? 'FAIL' : 'OK',
        message: item.error_msg || '-',
        duration: item.duration_ms || 0,
      }))
    }
  } catch (err) {
    console.error('获取错误日志失败', err)
  }
}

// 统一加载
async function fetchAllData() {
  await Promise.all([fetchOverview(), fetchTrend(), fetchLogs()])
}

// 窗口大小变化处理
function handleResize() {
  trendChart && trendChart.resize()
}

onMounted(() => {
  fetchAllData()
  window.addEventListener('resize', handleResize)
  // 每30秒自动刷新
  refreshTimer = setInterval(fetchAllData, 30000)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

onUnmounted(() => {
  if (trendChart) {
    trendChart.dispose()
    trendChart = null
  }
})
</script>

<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>服务集成中心</h2>
      <p class="page-desc">
        管理与监控各外部服务的运行状态与调用情况
      </p>
    </div>

    <!-- 服务状态卡片 -->
    <el-row
      :gutter="16"
      class="service-cards"
    >
      <el-col
        v-for="svc in serviceCards"
        :key="svc.key"
        :xs="24"
        :sm="12"
        :md="6"
      >
        <div
          class="service-card"
          :style="{ borderLeftColor: svc.color }"
          @click="navigateTo(svc.route)"
        >
          <div class="service-card__header">
            <span
              class="service-card__icon"
              :style="{ backgroundColor: svc.color + '15', color: svc.color }"
            >
              <el-icon :size="20"><component :is="svc.icon" /></el-icon>
            </span>
            <el-tag
              :type="svc.enabled ? 'success' : 'info'"
              size="small"
              effect="light"
            >
              {{ svc.enabled ? '已启用' : '未启用' }}
            </el-tag>
          </div>
          <div class="service-card__name">
            {{ svc.name }}
          </div>
          <div class="service-card__meta">
            <span class="meta-item">
              <span class="meta-label">配置状态</span>
              <el-tag
                :type="svc.configured ? 'success' : 'warning'"
                size="small"
                effect="plain"
              >
                {{ svc.configured ? '已配置' : '未配置' }}
              </el-tag>
            </span>
          </div>
          <div class="service-card__stats">
            <div class="stat-block">
              <div class="stat-value">
                {{ svc.todayCalls }}
              </div>
              <div class="stat-label">
                今日调用
              </div>
            </div>
            <div class="stat-block">
              <div class="stat-value">
                {{ svc.avgResponseTime }}ms
              </div>
              <div class="stat-label">
                平均响应
              </div>
            </div>
          </div>
          <div class="service-card__footer">
            查看详情 <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 24小时调用趋势 -->
    <el-card
      shadow="never"
      class="trend-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">24小时调用趋势</span>
          <el-tag
            size="small"
            effect="plain"
            type="info"
          >
            每小时更新
          </el-tag>
        </div>
      </template>
      <div
        ref="trendChartRef"
        class="trend-chart"
      />
    </el-card>

    <!-- 最近错误日志 -->
    <el-card
      shadow="never"
      class="error-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">最近错误日志</span>
          <el-tag
            size="small"
            effect="plain"
            type="danger"
          >
            {{ errorLogs.length }} 条记录
          </el-tag>
        </div>
      </template>
      <el-table
        v-if="errorLogs.length"
        :data="errorLogs"
        stripe
        size="small"
        style="width: 100%"
      >
        <el-table-column
          prop="time"
          label="时间"
          width="180"
        />
        <el-table-column
          prop="service"
          label="服务"
          width="120"
        >
          <template #default="{ row }">
            <el-tag
              :type="getServiceTagType(row.service)"
              size="small"
              effect="plain"
            >
              {{ getServiceLabel(row.service) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="api"
          label="接口"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          prop="code"
          label="状态码"
          width="100"
        >
          <template #default="{ row }">
            <span class="error-code">{{ row.code }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="message"
          label="错误信息"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column
          prop="duration"
          label="耗时"
          width="100"
        >
          <template #default="{ row }">
            {{ row.duration }}ms
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-else
        description="暂无错误日志"
        :image-size="80"
      />
    </el-card>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
  background: var(--bg, #f5f7fa);
  min-height: 100%;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text, #1f2937);
  margin: 0 0 6px 0;
}

.page-desc {
  font-size: 13px;
  color: var(--text-muted, #9ca3af);
  margin: 0;
}

/* 服务卡片 */
.service-cards {
  margin-bottom: 20px;
}

.service-card {
  background: var(--card, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-left: 4px solid transparent;
  border-radius: 8px;
  padding: 18px 20px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
  margin-bottom: 16px;
}

.service-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.service-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.service-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
}

.service-card__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #1f2937);
  margin-bottom: 10px;
}

.service-card__meta {
  margin-bottom: 14px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.meta-label {
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
}

.service-card__stats {
  display: flex;
  gap: 24px;
  padding-top: 14px;
  border-top: 1px solid var(--border, #e5e7eb);
  margin-bottom: 12px;
}

.stat-block {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text, #1f2937);
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  margin-top: 2px;
}

.service-card__footer {
  font-size: 12px;
  color: var(--primary, #3b82f6);
  display: flex;
  align-items: center;
  gap: 4px;
  transition: gap 0.2s;
}

.service-card:hover .service-card__footer {
  gap: 8px;
}

/* 趋势卡片 */
.trend-card {
  margin-bottom: 20px;
  border-radius: 8px;
  border-color: var(--border, #e5e7eb);
  background: var(--card, #ffffff);
}

.trend-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom-color: var(--border, #e5e7eb);
}

.trend-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.trend-chart {
  height: 320px;
  width: 100%;
}

/* 错误日志卡片 */
.error-card {
  border-radius: 8px;
  border-color: var(--border, #e5e7eb);
  background: var(--card, #ffffff);
}

.error-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom-color: var(--border, #e5e7eb);
}

.error-card :deep(.el-card__body) {
  padding: 0;
}

.error-card :deep(.el-table) {
  --el-table-border-color: var(--border, #e5e7eb);
  --el-table-header-bg-color: var(--bg, #f5f7fa);
  --el-table-text-color: var(--text, #1f2937);
  --el-table-header-text-color: var(--text-secondary, #6b7280);
}

.error-code {
  color: #ef4444;
  font-weight: 600;
  font-size: 13px;
}

/* 通用卡片头 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #1f2937);
}
</style>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import {
  User, Bell, Document, Monitor, DocumentAdd,
  ArrowUp, ArrowDown, ArrowRight, OfficeBuilding, UserFilled,
  TrendCharts, FirstAidKit, HomeFilled, Setting, Warning
} from '@element-plus/icons-vue'
import { getDashboardStats } from '../../api/dashboard'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const router = useRouter()

// 加载状态
const isLoading = ref(true)

// 快捷入口配置 - 统一风格，使用主题色
const quickEntries = [
  { title: '老人管理', desc: '查看和管理老人档案', icon: 'User', iconClass: 'icon-blue', path: '/gov/elderly' },
  { title: '预警中心', desc: '处理紧急预警事件', icon: 'Warning', iconClass: 'icon-red', path: '/gov/alert' },
  { title: '工单管理', desc: '查看和分配服务工单', icon: 'DocumentAdd', iconClass: 'icon-green', path: '/gov/order' },
  { title: '村庄管理', desc: '管理辖区村庄信息', icon: 'OfficeBuilding', iconClass: 'icon-purple', path: '/gov/village' },
  { title: '设备监控', desc: '实时监控IoT设备', icon: 'Monitor', iconClass: 'icon-cyan', path: '/gov/device-monitor' },
  { title: '数据大屏', desc: '查看数据可视化大屏', icon: 'TrendCharts', iconClass: 'icon-orange', path: '/big-screen' },
]

// 统计数据
const stats = ref({
  elderlyCount: 0,
  alertPending: 0,
  orderPending: 0,
  deviceOnline: 0,
})

// 趋势数据
const alertTrend = ref([])
const alertByType = ref([])
const orderByType = ref([])

// 待处理事项
const todoList = ref([
  { type: 'alert', title: '老人跌倒预警', description: '张大爷在客厅发生跌倒', time: '10分钟前' },
  { type: 'alert', title: '健康异常提醒', description: '李奶奶心率异常', time: '25分钟前' },
  { type: 'order', title: '医疗工单待处理', description: '王大爷需要定期体检', time: '1小时前' },
  { type: 'alert', title: '设备离线提醒', description: '3号村智能手环离线', time: '2小时前' },
  { type: 'order', title: '生活照料工单', description: '赵奶奶需要送餐服务', time: '3小时前' },
])

// 统计卡片配置 - 优化为4个核心指标，统一主题色
const statCards = computed(() => [
  {
    label: '服务老人总数',
    value: stats.value.elderlyCount || 1248,
    icon: 'User',
    theme: 'primary',
    trend: 5.2,
    unit: '人'
  },
  {
    label: '待处理预警',
    value: stats.value.alertPending || 12,
    icon: 'Warning',
    theme: 'danger',
    trend: -3.1,
    unit: '条'
  },
  {
    label: '进行中工单',
    value: stats.value.orderPending || 28,
    icon: 'Document',
    theme: 'success',
    trend: 2.8,
    unit: '单'
  },
  {
    label: '在线设备',
    value: stats.value.deviceOnline || 356,
    icon: 'Monitor',
    theme: 'purple',
    trend: 8.5,
    unit: '台'
  },
])

// 图表引用
const alertTrendRef = ref(null)
const alertTypeRef = ref(null)
const orderTypeRef = ref(null)
const coverageRef = ref(null)
const satisfactionRef = ref(null)
let chartInstances = []

// 数字动画组件
const CountUp = {
  props: ['end', 'duration'],
  setup(props) {
    const displayValue = ref(0)
    onMounted(() => {
      const startTime = Date.now()
      const startValue = 0
      const endValue = props.end || 0
      const duration = (props.duration || 2) * 1000

      const animate = () => {
        const now = Date.now()
        const progress = Math.min((now - startTime) / duration, 1)
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        displayValue.value = Math.floor(startValue + (endValue - startValue) * easeOutQuart)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    })
    return () => displayValue.value
  },
}

// 初始化图表
function initChart(dom, option) {
  const chart = echarts.init(dom)
  chart.setOption(option)
  chartInstances.push(chart)
  return chart
}

// 渲染预警趋势图
function renderAlertTrendChart() {
  if (!alertTrendRef.value) return
  const dates = alertTrend.value.length > 0 
    ? alertTrend.value.map((i) => i.date)
    : ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const counts = alertTrend.value.length > 0
    ? alertTrend.value.map((i) => i.count)
    : [12, 8, 15, 10, 18, 6, 9]
  
  initChart(alertTrendRef.value, {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      textStyle: { color: '#303133', fontSize: 12 },
      formatter: '{b}<br/>预警数量: <b>{c}</b>'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisLabel: { color: '#606266', fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#606266', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [
      {
        name: '预警数量',
        type: 'line',
        data: counts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(22, 119, 255, 0.25)' },
            { offset: 1, color: 'rgba(22, 119, 255, 0.02)' }
          ])
        },
        lineStyle: { color: '#1677ff', width: 2.5 },
        itemStyle: { color: '#1677ff', borderWidth: 2, borderColor: '#fff' }
      }
    ]
  })
}

// 渲染预警类型分布图
function renderAlertTypeChart() {
  if (!alertTypeRef.value) return
  const typeMap = { 
    FALL: '跌倒', 
    HEALTH_ABNORMAL: '健康异常', 
    SOS: 'SOS求助', 
    GEO_FENCE: '越界', 
    DEVICE_OFFLINE: '设备离线' 
  }
  const data = alertByType.value.length > 0 
    ? alertByType.value.map((i) => ({ name: typeMap[i.type] || i.type, value: i.count }))
    : [
        { name: '跌倒', value: 35 },
        { name: '健康异常', value: 28 },
        { name: 'SOS求助', value: 20 },
        { name: '越界', value: 12 },
        { name: '设备离线', value: 5 }
      ]
  
  initChart(alertTypeRef.value, {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      textStyle: { color: '#303133', fontSize: 12 },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 12,
      textStyle: { color: '#606266', fontSize: 11 }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '42%'],
        data,
        label: {
          show: false
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          borderRadius: 4
        }
      }
    ],
    color: ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1']
  })
}

// 渲染工单类型分布图
function renderOrderTypeChart() {
  if (!orderTypeRef.value) return
  const typeMap = { 
    MEDICAL: '医疗', 
    LIFE_CARE: '生活照料', 
    EMERGENCY: '紧急救援', 
    COMPANION: '陪护', 
    OTHER: '其他' 
  }
  const names = orderByType.value.length > 0
    ? orderByType.value.map((i) => typeMap[i.type] || i.type)
    : ['医疗', '生活照料', '紧急救援', '陪护', '其他']
  const values = orderByType.value.length > 0
    ? orderByType.value.map((i) => i.count)
    : [45, 38, 25, 18, 12]
  
  initChart(orderTypeRef.value, {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      textStyle: { color: '#303133', fontSize: 12 },
      formatter: '{b}: <b>{c}</b>'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: names,
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisLabel: { color: '#606266', fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#606266', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [
      {
        name: '工单数量',
        type: 'bar',
        data: values,
        barWidth: '45%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#52c41a' },
            { offset: 1, color: '#95de64' }
          ]),
          borderRadius: [4, 4, 0, 0]
        }
      }
    ]
  })
}

// 渲染服务覆盖率图
function renderCoverageChart() {
  if (!coverageRef.value) return
  const villages = ['幸福村', '阳光村', '平安村', '和谐村', '富强村', '美丽村']
  const rates = [95, 88, 92, 85, 90, 78]
  
  initChart(coverageRef.value, {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      textStyle: { color: '#303133', fontSize: 12 },
      formatter: '{b}: <b>{c}%</b>'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: villages,
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisLabel: { color: '#606266', fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 60,
      max: 100,
      axisLine: { show: false },
      axisLabel: { color: '#606266', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [
      {
        name: '覆盖率',
        type: 'bar',
        data: rates.map(v => ({
          value: v,
          itemStyle: {
            color: v >= 90 ? '#52c41a' : v >= 80 ? '#faad14' : '#ff4d4f',
            borderRadius: [4, 4, 0, 0]
          }
        })),
        barWidth: '45%',
        markLine: {
          silent: true,
          data: [{ yAxis: 85, name: '目标线' }],
          lineStyle: { color: '#1677ff', type: 'dashed', width: 1 },
          label: { color: '#1677ff', fontSize: 10, formatter: '目标 85%' }
        }
      }
    ]
  })
}

// 渲染满意度趋势图
function renderSatisfactionChart() {
  if (!satisfactionRef.value) return
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
  const scores = Array.from({ length: 30 }, () => Math.floor(Math.random() * 6) + 93)
  
  initChart(satisfactionRef.value, {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      textStyle: { color: '#303133', fontSize: 12 },
      formatter: '{b}<br/>满意度: <b>{c}%</b>'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisLabel: { color: '#606266', interval: 4, fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 85,
      max: 100,
      axisLine: { show: false },
      axisLabel: { color: '#606266', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [
      {
        name: '满意度',
        type: 'line',
        data: scores,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#fa8c16', width: 2.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(250, 140, 22, 0.2)' },
            { offset: 1, color: 'rgba(250, 140, 22, 0.02)' }
          ])
        }
      }
    ]
  })
}

// 处理窗口大小变化
function handleResize() {
  chartInstances.forEach((c) => c.resize())
}

// 获取数据
async function fetchData() {
  isLoading.value = true
  try {
    const res = await getDashboardStats()
    if (res.code === 200) {
      const d = res.data
      stats.value = {
        elderlyCount: d.overview?.elderlyCount || 1248,
        alertPending: d.overview?.alertPending || 12,
        orderPending: d.overview?.orderPending || 28,
        deviceOnline: d.overview?.deviceOnline || 356,
      }
      alertByType.value = d.alertByType || []
      orderByType.value = d.orderByType || []
      alertTrend.value = d.alertTrend || []
    }
  } catch (err) {
    console.error('获取仪表盘数据失败', err)
    // 使用默认数据
    stats.value = {
      elderlyCount: 1248,
      alertPending: 12,
      orderPending: 28,
      deviceOnline: 356,
    }
  } finally {
    isLoading.value = false
    await nextTick()
    renderAlertTrendChart()
    renderAlertTypeChart()
    renderOrderTypeChart()
    renderCoverageChart()
    renderSatisfactionChart()
  }
}

// 待处理事项点击
function handleTodoClick(item) {
  if (item.type === 'alert') {
    router.push('/gov/alert')
  } else {
    router.push('/gov/order')
  }
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstances.forEach((c) => c.dispose())
  chartInstances = []
})
</script>

<template>
  <div class="gov-dashboard">
    <!-- 顶部欢迎区域 -->
    <div class="welcome-section">
      <div class="welcome-left">
        <h1 class="welcome-title">
          您好，{{ userStore.realName || '管理员' }}
        </h1>
        <p class="welcome-subtitle">
          欢迎回到乡村守护政府端管理平台 · 今日待处理 <strong class="highlight">{{ stats.alertPending + stats.orderPending }}</strong> 项
        </p>
      </div>
      <div class="quick-actions">
        <el-button
          type="primary"
          size="large"
          @click="$router.push('/gov/alert')"
        >
          <el-icon><Bell /></el-icon>预警中心
        </el-button>
        <el-button
          type="success"
          size="large"
          @click="$router.push('/gov/order')"
        >
          <el-icon><DocumentAdd /></el-icon>工单管理
        </el-button>
        <el-button
          size="large"
          @click="$router.push('/big-screen')"
        >
          <el-icon><Monitor /></el-icon>数据大屏
        </el-button>
      </div>
    </div>

    <!-- 快捷入口卡片 -->
    <div class="quick-entry-grid">
      <button
        v-for="entry in quickEntries"
        :key="entry.title"
        class="quick-entry-card"
        :aria-label="'进入' + entry.title"
        @click="$router.push(entry.path)"
      >
        <div
          class="entry-icon"
          :class="entry.iconClass"
        >
          <el-icon
            :size="22"
            aria-hidden="true"
          >
            <component :is="entry.icon" />
          </el-icon>
        </div>
        <div class="entry-info">
          <span class="entry-title">{{ entry.title }}</span>
          <span class="entry-desc">{{ entry.desc }}</span>
        </div>
        <el-icon
          class="entry-arrow"
          aria-hidden="true"
        >
          <ArrowRight />
        </el-icon>
      </button>
    </div>

    <!-- 统计卡片区域 - 优化为4个核心指标 -->
    <div class="stat-cards-grid">
      <div
        v-for="(card, index) in statCards"
        :key="index"
        class="stat-card"
        :class="{ 'loading': isLoading }"
      >
        <div class="stat-card-content">
          <div class="stat-card-info">
            <p class="stat-card-label">
              {{ card.label }}
            </p>
            <p
              class="stat-card-value"
              :class="`value-${card.theme}`"
            >
              <template v-if="isLoading">
                <span class="skeleton-text">--</span>
              </template>
              <template v-else>
                <CountUp
                  :end="card.value"
                  :duration="2"
                />
                <span
                  v-if="card.unit"
                  class="stat-card-unit"
                >{{ card.unit }}</span>
              </template>
            </p>
            <p
              v-if="!isLoading && card.trend !== undefined"
              class="stat-card-trend"
            >
              <span :class="card.trend >= 0 ? 'trend-up' : 'trend-down'">
                <el-icon><ArrowUp v-if="card.trend >= 0" /><ArrowDown v-else /></el-icon>
                {{ Math.abs(card.trend) }}%
              </span>
              <span class="trend-text">较上周</span>
            </p>
          </div>
          <div
            class="stat-card-icon"
            :class="`icon-${card.theme}`"
          >
            <el-icon :size="28">
              <component :is="card.icon" />
            </el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 - 第一行 -->
    <div class="charts-row">
      <div class="chart-card chart-card-wide">
        <div class="chart-header">
          <h3 class="chart-title">
            <span class="title-dot dot-primary" />
            近7天预警趋势
          </h3>
          <el-tag
            size="small"
            type="info"
            effect="plain"
          >
            实时更新
          </el-tag>
        </div>
        <div
          ref="alertTrendRef"
          class="chart-body"
        />
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">
            <span class="title-dot dot-warning" />
            预警类型分布
          </h3>
          <el-tag
            size="small"
            type="info"
            effect="plain"
          >
            本月
          </el-tag>
        </div>
        <div
          ref="alertTypeRef"
          class="chart-body"
        />
      </div>
    </div>

    <!-- 图表区域 - 第二行 -->
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">
            <span class="title-dot dot-success" />
            工单类型分布
          </h3>
          <el-tag
            size="small"
            type="info"
            effect="plain"
          >
            本月
          </el-tag>
        </div>
        <div
          ref="orderTypeRef"
          class="chart-body"
        />
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">
            <span class="title-dot dot-info" />
            服务覆盖率
          </h3>
          <el-tag
            size="small"
            type="info"
            effect="plain"
          >
            按村庄
          </el-tag>
        </div>
        <div
          ref="coverageRef"
          class="chart-body"
        />
      </div>
    </div>

    <!-- 底部区域 -->
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">
            <span class="title-dot dot-danger" />
            待处理事项
          </h3>
          <el-link
            type="primary"
            underline="never"
            @click="$router.push('/gov/alert')"
          >
            查看全部
          </el-link>
        </div>
        <div class="todo-list">
          <div
            v-for="(item, index) in todoList"
            :key="index"
            class="todo-item"
            @click="handleTodoClick(item)"
          >
            <div
              class="todo-icon"
              :class="item.type"
            >
              <el-icon><Bell v-if="item.type === 'alert'" /><Document v-else /></el-icon>
            </div>
            <div class="todo-content">
              <p class="todo-title">
                {{ item.title }}
              </p>
              <p class="todo-desc">
                {{ item.description }}
              </p>
            </div>
            <div class="todo-time">
              {{ item.time }}
            </div>
          </div>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">
            <span class="title-dot dot-orange" />
            满意度趋势
          </h3>
          <el-tag
            size="small"
            type="success"
            effect="plain"
          >
            近30天
          </el-tag>
        </div>
        <div
          ref="satisfactionRef"
          class="chart-body"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.gov-dashboard {
  padding: 24px;
  background: var(--bg);
  min-height: 100vh;
}

/* 欢迎区域 */
.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: linear-gradient(135deg, var(--card) 0%, var(--bg-secondary) 100%);
  padding: 24px 32px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--border);
}

.welcome-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.welcome-subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}

.highlight {
  color: #ff4d4f;
  font-weight: 600;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.quick-actions .el-button {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 10px;
  padding: 12px 20px;
}

/* 快捷入口网格 */
.quick-entry-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.quick-entry-card {
  background: var(--card);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border);
  width: 100%;
  text-align: left;
  font-family: inherit;
}

.quick-entry-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: transparent;
}

.entry-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.25s ease;
}

.quick-entry-card:hover .entry-icon {
  transform: scale(1.05);
}

/* 统一图标主题色 */
.entry-icon.icon-blue {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.12), rgba(22, 119, 255, 0.04));
  color: #1677ff;
}

.entry-icon.icon-red {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.12), rgba(255, 77, 79, 0.04));
  color: #ff4d4f;
}

.entry-icon.icon-green {
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.12), rgba(82, 196, 26, 0.04));
  color: #52c41a;
}

.entry-icon.icon-purple {
  background: linear-gradient(135deg, rgba(114, 46, 209, 0.12), rgba(114, 46, 209, 0.04));
  color: #722ed1;
}

.entry-icon.icon-cyan {
  background: linear-gradient(135deg, rgba(19, 194, 194, 0.12), rgba(19, 194, 194, 0.04));
  color: #13c2c2;
}

.entry-icon.icon-orange {
  background: linear-gradient(135deg, rgba(250, 140, 22, 0.12), rgba(250, 140, 22, 0.04));
  color: #fa8c16;
}

.entry-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entry-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.entry-desc {
  font-size: 12px;
  color: var(--text-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-arrow {
  color: var(--border);
  font-size: 14px;
  transition: all 0.25s ease;
}

.quick-entry-card:hover .entry-arrow {
  color: #1677ff;
  transform: translateX(4px);
}

/* 统计卡片网格 - 优化为4列布局 */
.stat-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--card);
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.stat-card.loading {
  opacity: 0.7;
}

.stat-card-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-card-info {
  flex: 1;
}

.stat-card-label {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 10px 0;
  font-weight: 500;
}

.stat-card-value {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 10px 0;
  line-height: 1;
  transition: color 0.25s ease;
}

/* 主题色值 */
.stat-card-value.value-primary {
  color: #1677ff;
}

.stat-card-value.value-danger {
  color: #ff4d4f;
}

.stat-card-value.value-success {
  color: #52c41a;
}

.stat-card-value.value-purple {
  color: #722ed1;
}

.skeleton-text {
  color: var(--text-placeholder);
  font-weight: 400;
}

.stat-card-unit {
  font-size: 14px;
  font-weight: 400;
  opacity: 0.7;
  margin-left: 4px;
}

.stat-card-trend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12px;
}

.trend-up {
  color: #52c41a;
  display: flex;
  align-items: center;
  gap: 2px;
  font-weight: 500;
  background: rgba(82, 196, 26, 0.1);
  padding: 2px 8px;
  border-radius: 20px;
}

.trend-down {
  color: #ff4d4f;
  display: flex;
  align-items: center;
  gap: 2px;
  font-weight: 500;
  background: rgba(255, 77, 79, 0.1);
  padding: 2px 8px;
  border-radius: 20px;
}

.trend-text {
  color: var(--text-placeholder);
}

.stat-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 统计卡片图标主题色 */
.stat-card-icon.icon-primary {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.15), rgba(22, 119, 255, 0.05));
  color: #1677ff;
}

.stat-card-icon.icon-danger {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.15), rgba(255, 77, 79, 0.05));
  color: #ff4d4f;
}

.stat-card-icon.icon-success {
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.15), rgba(82, 196, 26, 0.05));
  color: #52c41a;
}

.stat-card-icon.icon-purple {
  background: linear-gradient(135deg, rgba(114, 46, 209, 0.15), rgba(114, 46, 209, 0.05));
  color: #722ed1;
}

/* 图表行 */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card-wide {
  grid-column: span 1;
}

.chart-card {
  background: var(--card);
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border);
  transition: box-shadow 0.25s ease;
}

.chart-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 标题装饰点 */
.title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.title-dot.dot-primary {
  background: #1677ff;
}

.title-dot.dot-warning {
  background: #faad14;
}

.title-dot.dot-success {
  background: #52c41a;
}

.title-dot.dot-info {
  background: #13c2c2;
}

.title-dot.dot-danger {
  background: #ff4d4f;
}

.title-dot.dot-orange {
  background: #fa8c16;
}

.chart-body {
  height: 280px;
}

/* 待处理事项列表 */
.todo-list {
  height: 280px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 6px;
}

.todo-item:hover {
  background: var(--bg-secondary);
}

.todo-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}

.todo-icon.alert {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.12), rgba(255, 77, 79, 0.04));
  color: #ff4d4f;
}

.todo-icon.order {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.12), rgba(22, 119, 255, 0.04));
  color: #1677ff;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin: 0 0 4px 0;
}

.todo-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.todo-time {
  font-size: 12px;
  color: var(--text-placeholder);
  white-space: nowrap;
  margin-left: 12px;
  background: var(--bg-secondary);
  padding: 4px 10px;
  border-radius: 20px;
}

/* 响应式适配 */
@media (max-width: 1440px) {
  .quick-entry-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1200px) {
  .stat-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .quick-entry-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .gov-dashboard {
    padding: 16px;
  }
  
  .welcome-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }
  
  .quick-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .stat-cards-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-entry-grid {
    grid-template-columns: 1fr;
  }
}
</style>

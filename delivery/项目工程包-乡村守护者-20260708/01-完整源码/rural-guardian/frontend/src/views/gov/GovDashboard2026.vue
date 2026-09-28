<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import {
  User, Bell, Document, Monitor, Warning, ArrowRight
} from '@element-plus/icons-vue'
import { getDashboardStats } from '../../api/dashboard'
const router = useRouter()

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

const priorityMetrics = computed(() => [
  {
    key: 'elderly',
    label: '服务老人',
    value: stats.value.elderlyCount || 1248,
    suffix: '人',
    tone: 'primary',
    hint: '在档服务对象',
  },
  {
    key: 'alert',
    label: '待处理预警',
    value: stats.value.alertPending || 12,
    suffix: '条',
    tone: 'danger',
    hint: '高优先级风险',
  },
  {
    key: 'order',
    label: '进行中工单',
    value: stats.value.orderPending || 28,
    suffix: '单',
    tone: 'success',
    hint: '跨角色协同事项',
  },
  {
    key: 'device',
    label: '在线设备',
    value: stats.value.deviceOnline || 356,
    suffix: '台',
    tone: 'secondary',
    hint: '设备运行状态',
  },
])

const quickActions = [
  { title: '预警中心', description: '按严重程度进入处置流程', path: '/gov/alert', icon: Warning, tone: 'danger' },
  { title: '工单管理', description: '查看分派、执行与回访进度', path: '/gov/order', icon: Document, tone: 'success' },
  { title: '老人管理', description: '维护服务对象档案与分布', path: '/gov/elderly', icon: User, tone: 'primary' },
  { title: '设备监控', description: '定位离线设备与异常链路', path: '/gov/device-monitor', icon: Monitor, tone: 'accent' },
]

const serviceCoverage = computed(() => [
  { name: '幸福村', rate: 95, level: '优' },
  { name: '阳光村', rate: 88, level: '稳' },
  { name: '平安村', rate: 92, level: '优' },
  { name: '和谐村', rate: 85, level: '关注' },
])

const focusList = computed(() => todoList.value.slice(0, 4))

const operationalHighlights = computed(() => [
  {
    label: '重点处置',
    value: `${(stats.value.alertPending || 12) + (stats.value.orderPending || 28)} 项`,
    description: '今日优先任务池',
  },
  {
    label: '服务质量',
    value: '96.4%',
    description: '近 30 天满意度',
  },
  {
    label: '覆盖进度',
    value: '89.7%',
    description: '行政村服务覆盖率',
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
  if (!dom) return null
  // 检查 DOM 是否有有效尺寸，避免在隐藏/未渲染时初始化
  if (dom.clientWidth === 0 || dom.clientHeight === 0) return null
  const chart = echarts.init(dom)
  chart.setOption(option)
  chartInstances.push(chart)
  return chart
}

// 渲染预警趋势图 - 2026 美化版
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
      borderColor: 'rgba(59, 130, 246, 0.2)',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: '{b}<br/>预警数量: <b>{c}</b>',
      extraCssText: 'backdrop-filter: blur(20px); border-radius: 12px; box-shadow: 0 8px 32px rgba(59,130,246,0.2); padding: 12px 16px;'
    },
    grid: {
      left: '2%',
      right: '4%',
      bottom: '2%',
      top: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { show: false },
      axisLabel: { 
        color: '#64748b', 
        fontSize: 11,
        margin: 12
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { 
        color: '#94a3b8', 
        fontSize: 10,
        formatter: '{value}'
      },
      splitLine: { 
        lineStyle: { 
          color: 'rgba(148, 163, 184, 0.1)', 
          type: 'dashed' 
        } 
      }
    },
    series: [
      {
        name: '预警数量',
        type: 'line',
        data: counts,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 10,
        showSymbol: false,
        animationDuration: 2000,
        animationEasing: 'cubicOut',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
            { offset: 0.5, color: 'rgba(59, 130, 246, 0.1)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0)' }
          ])
        },
        lineStyle: { 
          color: '#3B82F6', 
          width: 4,
          shadowColor: 'rgba(59, 130, 246, 0.5)',
          shadowBlur: 10,
          shadowOffsetY: 5
        },
        itemStyle: { 
          color: '#3B82F6', 
          borderWidth: 3, 
          borderColor: '#fff',
          shadowColor: 'rgba(59, 130, 246, 0.5)',
          shadowBlur: 10
        },
        emphasis: {
          scale: 1.5,
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(59, 130, 246, 0.8)'
          }
        }
      }
    ]
  })
}

// 渲染预警类型分布图 - 2026 美化版（甜甜圈图）
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
      borderColor: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: '{b}: <b>{c}</b> ({d}%)',
      extraCssText: 'backdrop-filter: blur(20px); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); padding: 12px 16px;'
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { color: '#64748b', fontSize: 11 }
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '40%'],
        data,
        label: { show: false },
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: function () {
          return Math.random() * 200
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 3,
          borderRadius: 8,
          shadowColor: 'rgba(0, 0, 0, 0.1)',
          shadowBlur: 10,
          shadowOffsetY: 5
        },
        emphasis: {
          scale: true,
          scaleSize: 10,
          itemStyle: {
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowOffsetY: 10,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          }
        }
      }
    ],
    color: ['#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6']
  })
}

// 渲染工单类型分布图 - 2026 美化版（圆角柱状图）
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
      borderColor: 'rgba(16, 185, 129, 0.2)',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: '{b}: <b>{c}</b> 单',
      extraCssText: 'backdrop-filter: blur(20px); border-radius: 12px; box-shadow: 0 8px 32px rgba(16,185,129,0.2); padding: 12px 16px;'
    },
    grid: {
      left: '2%',
      right: '4%',
      bottom: '2%',
      top: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: names,
      axisLine: { show: false },
      axisLabel: { 
        color: '#64748b', 
        fontSize: 11,
        margin: 12
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { 
        color: '#94a3b8', 
        fontSize: 10 
      },
      splitLine: { 
        lineStyle: { 
          color: 'rgba(148, 163, 184, 0.1)', 
          type: 'dashed' 
        } 
      }
    },
    series: [
      {
        name: '工单数量',
        type: 'bar',
        data: values,
        barWidth: '40%',
        animationDuration: 1500,
        animationEasing: 'elasticOut',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#10B981' },
            { offset: 1, color: '#6EE7B7' }
          ]),
          borderRadius: [8, 8, 0, 0],
          shadowColor: 'rgba(16, 185, 129, 0.3)',
          shadowBlur: 8,
          shadowOffsetY: 4
        },
        emphasis: {
          itemStyle: {
            shadowColor: 'rgba(16, 185, 129, 0.5)',
            shadowBlur: 16,
            shadowOffsetY: 8
          }
        }
      }
    ]
  })
}

// 渲染服务覆盖率图 - 2026 美化版（渐变色柱状图）
function renderCoverageChart() {
  if (!coverageRef.value) return
  const villages = ['幸福村', '阳光村', '平安村', '和谐村', '富强村', '美丽村']
  const rates = [95, 88, 92, 85, 90, 78]
  
  const getGradientColor = (value) => {
    if (value >= 90) {
      return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#10B981' },
        { offset: 1, color: '#34D399' }
      ])
    } else if (value >= 80) {
      return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#F59E0B' },
        { offset: 1, color: '#FBBF24' }
      ])
    } 
      return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#F43F5E' },
        { offset: 1, color: '#FB7185' }
      ])
    
  }
  
  initChart(coverageRef.value, {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(139, 92, 246, 0.2)',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: '{b}: <b>{c}%</b>',
      extraCssText: 'backdrop-filter: blur(20px); border-radius: 12px; box-shadow: 0 8px 32px rgba(139,92,246,0.2); padding: 12px 16px;'
    },
    grid: {
      left: '2%',
      right: '4%',
      bottom: '2%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: villages,
      axisLine: { show: false },
      axisLabel: { 
        color: '#64748b', 
        fontSize: 11,
        margin: 12
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 60,
      max: 100,
      axisLine: { show: false },
      axisLabel: { 
        color: '#94a3b8', 
        fontSize: 10, 
        formatter: '{value}%' 
      },
      splitLine: { 
        lineStyle: { 
          color: 'rgba(148, 163, 184, 0.1)', 
          type: 'dashed' 
        } 
      }
    },
    series: [
      {
        name: '覆盖率',
        type: 'bar',
        data: rates.map(v => ({
          value: v,
          itemStyle: {
            color: getGradientColor(v),
            borderRadius: [8, 8, 0, 0],
            shadowColor: v >= 90 ? 'rgba(16, 185, 129, 0.3)' : v >= 80 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(244, 63, 94, 0.3)',
            shadowBlur: 8,
            shadowOffsetY: 4
          }
        })),
        barWidth: '40%',
        animationDuration: 1500,
        animationEasing: 'elasticOut',
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: 85, name: '目标线' }],
          lineStyle: { 
            color: '#8B5CF6', 
            type: 'dashed', 
            width: 2,
            shadowColor: 'rgba(139, 92, 246, 0.3)',
            shadowBlur: 4
          },
          label: { 
            color: '#8B5CF6', 
            fontSize: 10, 
            formatter: '目标 85%',
            position: 'insideEndTop'
          }
        }
      }
    ]
  })
}

// 渲染满意度趋势图 - 2026 美化版（平滑曲线+发光效果）
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
      borderColor: 'rgba(245, 158, 11, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: '{b}<br/>满意度: <b>{c}%</b>',
      extraCssText: 'backdrop-filter: blur(20px); border-radius: 12px; box-shadow: 0 8px 32px rgba(245,158,11,0.25); padding: 12px 16px;'
    },
    grid: {
      left: '2%',
      right: '4%',
      bottom: '2%',
      top: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { show: false },
      axisLabel: { 
        color: '#64748b', 
        interval: 4, 
        fontSize: 10,
        margin: 12
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 85,
      max: 100,
      axisLine: { show: false },
      axisLabel: { 
        color: '#94a3b8', 
        fontSize: 10, 
        formatter: '{value}%' 
      },
      splitLine: { 
        lineStyle: { 
          color: 'rgba(148, 163, 184, 0.1)', 
          type: 'dashed' 
        } 
      }
    },
    series: [
      {
        name: '满意度',
        type: 'line',
        data: scores,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        animationDuration: 2000,
        animationEasing: 'cubicOut',
        lineStyle: { 
          color: '#F59E0B', 
          width: 4,
          shadowColor: 'rgba(245, 158, 11, 0.5)',
          shadowBlur: 10,
          shadowOffsetY: 5
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.35)' },
            { offset: 0.5, color: 'rgba(245, 158, 11, 0.1)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0)' }
          ])
        },
        itemStyle: {
          color: '#F59E0B',
          borderWidth: 2,
          borderColor: '#fff'
        },
        emphasis: {
          scale: 1.5,
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(245, 158, 11, 0.8)'
          }
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
    stats.value = {
      elderlyCount: 1248,
      alertPending: 12,
      orderPending: 28,
      deviceOnline: 356,
    }
  } finally {
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
  <div class="gov-dashboard-2026">
    <div class="dashboard-backdrop" />

    <section class="hero-section surface-panel">
      <div class="hero-copy">
        <span class="section-eyebrow">Government Operations</span>
        <h2 class="hero-title">
          乡村养老运营总览
        </h2>
        <p class="hero-description">
          面向监管侧的统一运营视图，优先呈现风险处置、协同工单与设备状态，帮助你先做判断，再做派单与跟进。
        </p>
        <div class="hero-actions">
          <button
            class="hero-btn hero-btn-primary"
            @click="router.push('/gov/alert')"
          >
            <el-icon><Bell /></el-icon>
            进入预警中心
          </button>
          <button
            class="hero-btn hero-btn-secondary"
            @click="router.push('/big-screen')"
          >
            <el-icon><Monitor /></el-icon>
            打开数据大屏
          </button>
        </div>
        <div class="hero-highlights">
          <div
            v-for="item in operationalHighlights"
            :key="item.label"
            class="hero-highlight"
          >
            <span class="hero-highlight-label">{{ item.label }}</span>
            <strong class="hero-highlight-value">{{ item.value }}</strong>
            <span class="hero-highlight-desc">{{ item.description }}</span>
          </div>
        </div>
      </div>

      <div class="hero-focus surface-subpanel">
        <div class="panel-heading">
          <div>
            <span class="panel-eyebrow">今日重点</span>
            <h3 class="panel-title">
              优先处理事项
            </h3>
          </div>
          <el-link
            type="primary"
            underline="never"
            @click="router.push('/gov/alert')"
          >
            查看全部
          </el-link>
        </div>
        <div class="focus-list">
          <button
            v-for="item in focusList"
            :key="item.title"
            type="button"
            class="focus-item"
            @click="handleTodoClick(item)"
          >
            <span
              class="focus-icon"
              :class="`is-${item.type}`"
            >
              <el-icon><Bell v-if="item.type === 'alert'" /><Document v-else /></el-icon>
            </span>
            <span class="focus-copy">
              <strong>{{ item.title }}</strong>
              <small>{{ item.description }}</small>
            </span>
            <span class="focus-time">{{ item.time }}</span>
          </button>
        </div>
      </div>
    </section>

    <section class="metric-grid">
      <article
        v-for="metric in priorityMetrics"
        :key="metric.key"
        class="metric-card surface-panel"
        :class="`is-${metric.tone}`"
      >
        <span class="metric-label">{{ metric.label }}</span>
        <div class="metric-value-line">
          <strong class="metric-value">
            <CountUp
              :end="metric.value"
              :duration="2"
            />
          </strong>
          <span class="metric-suffix">{{ metric.suffix }}</span>
        </div>
        <p class="metric-hint">
          {{ metric.hint }}
        </p>
      </article>
    </section>

    <section class="workspace-grid">
      <article class="surface-panel action-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-eyebrow">Workflows</span>
            <h3 class="panel-title">
              高频操作
            </h3>
          </div>
        </div>
        <div class="action-list">
          <button
            v-for="action in quickActions"
            :key="action.path"
            type="button"
            class="action-card"
            :class="`is-${action.tone}`"
            @click="router.push(action.path)"
          >
            <span class="action-icon">
              <el-icon><component :is="action.icon" /></el-icon>
            </span>
            <span class="action-copy">
              <strong>{{ action.title }}</strong>
              <small>{{ action.description }}</small>
            </span>
            <el-icon class="action-arrow">
              <ArrowRight />
            </el-icon>
          </button>
        </div>
      </article>

      <article class="surface-panel chart-panel chart-wide">
        <div class="panel-heading">
          <div>
            <span class="panel-eyebrow">Trend</span>
            <h3 class="panel-title">
              近 7 天预警趋势
            </h3>
          </div>
          <el-tag
            size="small"
            effect="plain"
          >
            实时
          </el-tag>
        </div>
        <div
          ref="alertTrendRef"
          class="chart-canvas"
        />
      </article>

      <article class="surface-panel coverage-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-eyebrow">Coverage</span>
            <h3 class="panel-title">
              重点村覆盖进度
            </h3>
          </div>
        </div>
        <div class="coverage-list">
          <div
            v-for="item in serviceCoverage"
            :key="item.name"
            class="coverage-row"
          >
            <div class="coverage-meta">
              <strong>{{ item.name }}</strong>
              <span>{{ item.level }}</span>
            </div>
            <div class="coverage-bar">
              <span
                class="coverage-fill"
                :style="{ width: `${item.rate}%` }"
              />
            </div>
            <span class="coverage-rate">{{ item.rate }}%</span>
          </div>
        </div>
      </article>
    </section>

    <section class="analytics-grid">
      <article class="surface-panel chart-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-eyebrow">Alert Mix</span>
            <h3 class="panel-title">
              预警类型分布
            </h3>
          </div>
          <el-tag
            size="small"
            effect="plain"
          >
            本月
          </el-tag>
        </div>
        <div
          ref="alertTypeRef"
          class="chart-canvas"
        />
      </article>

      <article class="surface-panel chart-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-eyebrow">Order Mix</span>
            <h3 class="panel-title">
              工单类型分布
            </h3>
          </div>
          <el-tag
            size="small"
            effect="plain"
          >
            本月
          </el-tag>
        </div>
        <div
          ref="orderTypeRef"
          class="chart-canvas"
        />
      </article>

      <article class="surface-panel chart-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-eyebrow">Village Coverage</span>
            <h3 class="panel-title">
              服务覆盖率
            </h3>
          </div>
          <el-tag
            size="small"
            effect="plain"
          >
            按村庄
          </el-tag>
        </div>
        <div
          ref="coverageRef"
          class="chart-canvas"
        />
      </article>

      <article class="surface-panel chart-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-eyebrow">Service Quality</span>
            <h3 class="panel-title">
              满意度趋势
            </h3>
          </div>
          <el-tag
            size="small"
            effect="plain"
            type="success"
          >
            近 30 天
          </el-tag>
        </div>
        <div
          ref="satisfactionRef"
          class="chart-canvas"
        />
      </article>
    </section>
  </div>
</template>

<style scoped>
@import '../../styles/design-system-2026.css';

.gov-dashboard-2026 {
  position: relative;
  min-height: 100%;
  padding: 24px;
  background: transparent;
}

.dashboard-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 28%),
    radial-gradient(circle at top right, rgba(139, 92, 246, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.45), transparent 40%);
}

.gov-dashboard-2026 > * {
  position: relative;
  z-index: 1;
}

.surface-panel,
.surface-subpanel {
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.surface-panel {
  border-radius: 28px;
  padding: 24px;
}

.surface-subpanel {
  border-radius: 24px;
  padding: 20px;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.95fr);
  gap: 20px;
  margin-bottom: 20px;
}

.section-eyebrow,
.panel-eyebrow {
  display: inline-block;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hero-title {
  margin: 0;
  font-size: clamp(32px, 5vw, 46px);
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--color-text);
}

.hero-description {
  max-width: 54ch;
  margin: 16px 0 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.hero-btn {
  height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.hero-btn:hover {
  transform: translateY(-1px);
}

.hero-btn-primary {
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary), #1d4ed8);
  box-shadow: 0 14px 28px rgba(59, 130, 246, 0.22);
}

.hero-btn-secondary {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--color-border);
}

.hero-highlights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 28px;
}

.hero-highlight {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.hero-highlight-label,
.hero-highlight-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.hero-highlight-value {
  font-size: 22px;
  line-height: 1;
  color: var(--color-text);
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-title {
  margin: 0;
  font-size: 20px;
  color: var(--color-text);
}

.focus-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.focus-item {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px 0;
  border: none;
  border-top: 1px solid var(--color-border-subtle);
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.focus-item:first-of-type {
  border-top: none;
  padding-top: 0;
}

.focus-icon {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 18px;
}

.focus-icon.is-alert {
  color: var(--color-danger);
  background: rgba(244, 63, 94, 0.12);
}

.focus-icon.is-order {
  color: var(--color-primary);
  background: rgba(59, 130, 246, 0.12);
}

.focus-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.focus-copy strong {
  font-size: 14px;
  color: var(--color-text);
}

.focus-copy small,
.focus-time {
  font-size: 12px;
  color: var(--color-text-muted);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 160px;
}

.metric-card::before {
  content: '';
  width: 42px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.26;
}

.metric-card.is-primary {
  color: var(--color-primary);
}

.metric-card.is-danger {
  color: var(--color-danger);
}

.metric-card.is-success {
  color: var(--color-success);
}

.metric-card.is-secondary {
  color: var(--color-secondary);
}

.metric-label,
.metric-hint {
  color: var(--color-text-muted);
}

.metric-label {
  font-size: 13px;
}

.metric-value-line {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  color: var(--color-text);
}

.metric-value {
  font-size: 42px;
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.metric-suffix {
  margin-bottom: 6px;
  font-size: 16px;
  color: var(--color-text-secondary);
}

.metric-hint {
  margin: 0;
  font-size: 13px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.25fr) minmax(280px, 0.8fr);
  gap: 16px;
  margin-bottom: 20px;
}

.action-list {
  display: grid;
  gap: 12px;
}

.action-card {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.64);
  cursor: pointer;
  text-align: left;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 26px rgba(15, 23, 42, 0.08);
}

.action-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  font-size: 20px;
}

.action-card.is-primary .action-icon {
  color: var(--color-primary);
  background: rgba(59, 130, 246, 0.12);
}

.action-card.is-danger .action-icon {
  color: var(--color-danger);
  background: rgba(244, 63, 94, 0.12);
}

.action-card.is-success .action-icon {
  color: var(--color-success);
  background: rgba(16, 185, 129, 0.12);
}

.action-card.is-accent .action-icon {
  color: var(--color-accent);
  background: rgba(6, 182, 212, 0.12);
}

.action-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.action-copy strong {
  font-size: 15px;
  color: var(--color-text);
}

.action-copy small,
.action-arrow {
  color: var(--color-text-muted);
}

.chart-panel {
  min-height: 340px;
}

.chart-wide {
  min-height: 360px;
}

.chart-canvas {
  width: 100%;
  height: 250px;
}

.coverage-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.coverage-row {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.coverage-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 82px;
}

.coverage-meta strong {
  font-size: 14px;
  color: var(--color-text);
}

.coverage-meta span,
.coverage-rate {
  font-size: 12px;
  color: var(--color-text-muted);
}

.coverage-bar {
  position: relative;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--color-border-subtle);
}

.coverage-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary), #34d399);
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

:deep(.echarts) {
  width: 100% !important;
  height: 100% !important;
}

@media (max-width: 1200px) {
  .hero-section,
  .workspace-grid,
  .metric-grid,
  .analytics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-highlights {
    grid-template-columns: 1fr;
  }

  .coverage-panel,
  .chart-wide {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .gov-dashboard-2026 {
    padding: 16px;
  }

  .hero-section,
  .workspace-grid,
  .metric-grid,
  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .coverage-panel,
  .chart-wide {
    grid-column: span 1;
  }

  .surface-panel,
  .surface-subpanel {
    padding: 18px;
    border-radius: 22px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-btn {
    width: 100%;
    justify-content: center;
  }

  .focus-item,
  .action-card,
  .coverage-row {
    grid-template-columns: 1fr;
  }

  .focus-time,
  .action-arrow {
    display: none;
  }
}
</style>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, defineAsyncComponent } from 'vue'
import * as echarts from 'echarts'
import { useRouter } from 'vue-router'
import { ArrowLeft, FullScreen, RefreshRight, Bell } from '@element-plus/icons-vue'
// 3D 地图按需懒加载，减少首屏体积
const Tianjin3DMap = defineAsyncComponent(() => import('@/components/Tianjin3DMap/index.vue'))

const router = useRouter()

// ===== Refs =====
const bigScreenRef = ref(null)
const alertTrendChart = ref(null)
const alertTypeChart = ref(null)
const responseTimeChart = ref(null)
const heatmapChart = ref(null)
const deviceGaugeChart = ref(null)
const orderBarChart = ref(null)
const healthPieChart = ref(null)
const deviceTrendChart = ref(null)
const alertScrollRef = ref(null)
const footerScrollRef = ref(null)

const currentTime = ref('')
const weatherText = ref('☀️ 晴 26°C')
const lastUpdated = ref('')
const isRefreshing = ref(false)
const alertList = ref([])
const footerAlerts = ref([])
const show3DMap = ref(false)  // 3D 地图默认关闭，按需开启

const kpi = reactive({
  elderlyCount: 0,
  todayAlerts: 0,
  deviceOnline: 0,
  orderCompletionRate: 0,
})

// KPI 配置 - 使用SVG图标
const kpiItems = computed(() => [
  {
    icon: 'elderly', label: '服务老人总数', value: kpi.elderlyCount, unit: '人',
    color: '#5b8ff9', iconBg: 'rgba(91,143,249,0.15)',
  },
  {
    icon: 'alert', label: '今日告警', value: kpi.todayAlerts, unit: '条',
    color: '#ff6b6b', iconBg: 'rgba(255,107,107,0.15)',
  },
  {
    icon: 'device', label: '在线设备', value: kpi.deviceOnline, unit: '台',
    color: '#5ad8a6', iconBg: 'rgba(90,216,166,0.15)',
  },
  {
    icon: 'check', label: '工单完成率', value: kpi.orderCompletionRate, unit: '%',
    color: '#f6bd16', iconBg: 'rgba(246,189,22,0.15)',
  },
])

let chartInstances = []
let refreshTimer = null
let fullRefreshTimer = null
let clockTimer = null
let scrollTimer = null
let resizeRaf = null

// 性能优化：节流函数
function throttle(fn, limit) {
  let inThrottle = false
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// ===== 模拟数据 =====
const mockData = {
  kpi: { elderlyCount: 1286, todayAlerts: 23, deviceOnline: 856, orderCompletionRate: 94.5 },
  alertTrend24h: [
    { hour: '00:00', count: 3 }, { hour: '01:00', count: 2 }, { hour: '02:00', count: 1 },
    { hour: '03:00', count: 1 }, { hour: '04:00', count: 2 }, { hour: '05:00', count: 4 },
    { hour: '06:00', count: 8 }, { hour: '07:00', count: 12 }, { hour: '08:00', count: 15 },
    { hour: '09:00', count: 11 }, { hour: '10:00', count: 9 }, { hour: '11:00', count: 7 },
    { hour: '12:00', count: 6 }, { hour: '13:00', count: 8 }, { hour: '14:00', count: 10 },
    { hour: '15:00', count: 13 }, { hour: '16:00', count: 9 }, { hour: '17:00', count: 7 },
    { hour: '18:00', count: 11 }, { hour: '19:00', count: 14 }, { hour: '20:00', count: 10 },
    { hour: '21:00', count: 6 }, { hour: '22:00', count: 4 }, { hour: '23:00', count: 3 },
  ],
  alertByType: [
    { type: 'FALL', count: 12 },
    { type: 'HEALTH_ABNORMAL', count: 28 },
    { type: 'DEVICE_OFFLINE', count: 8 },
    { type: 'SOS', count: 5 },
    { type: 'GEO_FENCE', count: 3 },
  ],
  orderByStatus: [
    { status: 'COMPLETED', count: 156 },
    { status: 'IN_PROGRESS', count: 32 },
    { status: 'CREATED', count: 18 },
    { status: 'CANCELLED', count: 5 },
  ],
  healthByStatus: [
    { status: 'GOOD', count: 856 },
    { status: 'WARNING', count: 312 },
    { status: 'DANGER', count: 78 },
    { status: 'NORMAL', count: 40 },
  ],
  villageHeatmap: [
    { villageName: '幸福村', totalAlerts: 15, criticalCount: 2, highCount: 5, mediumCount: 6, lowCount: 2 },
    { villageName: '阳光村', totalAlerts: 12, criticalCount: 1, highCount: 4, mediumCount: 5, lowCount: 2 },
    { villageName: '平安村', totalAlerts: 8, criticalCount: 0, highCount: 3, mediumCount: 4, lowCount: 1 },
    { villageName: '和谐村', totalAlerts: 6, criticalCount: 1, highCount: 2, mediumCount: 2, lowCount: 1 },
    { villageName: '富强村', totalAlerts: 4, criticalCount: 0, highCount: 1, mediumCount: 2, lowCount: 1 },
    { villageName: '美丽村', totalAlerts: 3, criticalCount: 0, highCount: 1, mediumCount: 1, lowCount: 1 },
    { villageName: '团结村', totalAlerts: 9, criticalCount: 1, highCount: 3, mediumCount: 4, lowCount: 1 },
    { villageName: '友谊村', totalAlerts: 5, criticalCount: 0, highCount: 2, mediumCount: 2, lowCount: 1 },
    { villageName: '进步村', totalAlerts: 7, criticalCount: 1, highCount: 2, mediumCount: 3, lowCount: 1 },
    { villageName: '文明村', totalAlerts: 11, criticalCount: 1, highCount: 4, mediumCount: 4, lowCount: 2 },
  ],
  dailyResponse: [
    { date: '5/5', avgMinutes: 32 },
    { date: '5/6', avgMinutes: 28 },
    { date: '5/7', avgMinutes: 45 },
    { date: '5/8', avgMinutes: 22 },
    { date: '5/9', avgMinutes: 38 },
    { date: '5/10', avgMinutes: 25 },
    { date: '5/11', avgMinutes: 30 },
  ],
  deviceOnlineRate: 87.5,
  alerts: Array.from({ length: 20 }, () => ({
    type: ['FALL', 'HEALTH_ABNORMAL', 'DEVICE_OFFLINE', 'SOS', 'GEO_FENCE'][Math.floor(Math.random() * 5)],
    level: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 4)],
    description: ['张大爷血压异常', '李奶奶跌倒预警', '王大爷设备离线', '赵奶奶紧急求助', '刘大爷离开安全区域', '陈奶奶心率过快', '周大爷用药提醒'][Math.floor(Math.random() * 7)],
    elderlyName: ['张大爷', '李奶奶', '王大爷', '赵奶奶', '刘大爷', '陈奶奶', '周大爷'][Math.floor(Math.random() * 7)],
    created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  })),
  deviceTrend: Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    rate: Math.floor(Math.random() * 12) + 82,
  })),
}

// ===== 工具函数 =====
function formatAlertType(type) {
  const map = {
    FALL: '跌倒预警', HEALTH_ABNORMAL: '健康异常', HEALTH: '健康预警',
    DEVICE_OFFLINE: '设备离线', SOS: '紧急求助', GEO_FENCE: '越界预警', ABNORMAL: '行为异常',
  }
  return map[type] || type || '未知'
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function updateLastUpdated() {
  const now = new Date()
  lastUpdated.value = now.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function initWeather() {
  const icons = ['☀️', '⛅', '☁️', '🌧️']
  const texts = ['晴', '多云', '阴', '小雨']
  const idx = new Date().getDay() % icons.length
  const temp = 22 + Math.floor(Math.random() * 10)
  weatherText.value = `${icons[idx]} ${texts[idx]} ${temp}°C`
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

async function refreshAll() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  await Promise.allSettled([fetchOverviewData(), fetchAlerts(), fetchDeviceTrend()])
  updateLastUpdated()
  isRefreshing.value = false
}

// ===== ECharts =====
function initChart(domRef) {
  if (!domRef) return null
  if (domRef.clientWidth === 0 || domRef.clientHeight === 0) return null
  const existing = echarts.getInstanceByDom(domRef)
  if (existing) return existing
  const chart = echarts.init(domRef, null, {
    renderer: 'canvas',
    backgroundColor: 'transparent',
    // 性能优化配置
    useDirtyRect: true,       // 局部重绘
    width: 'auto',
    height: 'auto',
  })
  chartInstances.push(chart)
  return chart
}

// 高性能 setOption 封装：增量更新 + 懒更新 + 不合并旧动画
function fastSetOption(chart, option) {
  if (!chart || chart.isDisposed()) return
  chart.setOption(option, { notMerge: false, lazyUpdate: true, replaceMerge: [] })
}

// 性能优化：使用 requestAnimationFrame 节流 resize
const resizeCharts = throttle(() => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    chartInstances.forEach(c => {
      if (c && !c.isDisposed()) {
        c.resize({ animation: { duration: 0 } })
      }
    })
  })
}, 200)

// 配色方案
const C = {
  blue: '#5b8ff9',
  cyan: '#5ad8a6',
  yellow: '#f6bd16',
  red: '#ff6b6b',
  purple: '#9270ca',
  orange: '#ff9845',
  pink: '#f7668a',
  teal: '#6dc8ec',
  bg: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text1: 'rgba(255,255,255,0.85)',
  text2: 'rgba(255,255,255,0.55)',
  text3: 'rgba(255,255,255,0.3)',
}

function setAlertTrendChart(data) {
  const chart = initChart(alertTrendChart.value)
  if (!chart) return
  fastSetOption(chart, {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#fff', fontSize: 12 },
      axisPointer: { lineStyle: { color: 'rgba(91,143,249,0.4)' } },
    },
    grid: { top: 20, right: 12, bottom: 24, left: 40 },
    xAxis: {
      type: 'category', data: data.map(d => d.hour),
      axisLine: { lineStyle: { color: C.border } },
      axisLabel: { color: C.text3, fontSize: 10 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: C.text3, fontSize: 10 },
      splitLine: { lineStyle: { color: C.border, type: 'dashed' } },
    },
    series: [{
      type: 'line', data: data.map(d => d.count), smooth: true,
      symbol: 'none', lineStyle: { color: C.blue, width: 2.5 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(91,143,249,0.35)' },
          { offset: 1, color: 'rgba(91,143,249,0.02)' },
        ]),
      },
    }],
  })
}

function setAlertTypeChart(data) {
  const chart = initChart(alertTypeChart.value)
  if (!chart) return
  const colors = [C.red, C.yellow, C.teal, C.pink, C.cyan]
  fastSetOption(chart, {
    tooltip: {
      trigger: 'item', backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontSize: 12 },
      formatter: '{b}: {c}次 ({d}%)',
    },
    legend: {
      bottom: 0, textStyle: { color: C.text2, fontSize: 11 },
      itemWidth: 8, itemHeight: 8, itemGap: 12,
    },
    series: [{
      type: 'pie', radius: ['42%', '68%'], center: ['50%', '40%'],
      avoidLabelOverlap: true, label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 12, fontWeight: 500, color: '#fff' },
        scaleSize: 6,
      },
      itemStyle: { borderColor: 'rgba(11,15,25,0.8)', borderWidth: 2, borderRadius: 4 },
      data: data.map((d, i) => ({
        name: formatAlertType(d.type), value: d.count,
        itemStyle: { color: colors[i % colors.length] },
      })),
    }],
  })
}

function setResponseTimeChart(data) {
  const chart = initChart(responseTimeChart.value)
  if (!chart) return
  fastSetOption(chart, {
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontSize: 12 },
    },
    grid: { top: 20, right: 12, bottom: 24, left: 40 },
    xAxis: {
      type: 'category', data: data.map(d => d.date),
      axisLine: { lineStyle: { color: C.border } },
      axisLabel: { color: C.text3, fontSize: 10 }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value', name: 'min', nameTextStyle: { color: C.text3, fontSize: 10 },
      axisLine: { show: false },
      axisLabel: { color: C.text3, fontSize: 10 },
      splitLine: { lineStyle: { color: C.border, type: 'dashed' } },
    },
    series: [{
      type: 'bar', barWidth: '45%',
      data: data.map(d => ({
        value: d.avgMinutes,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: C.orange },
            { offset: 1, color: 'rgba(255,152,69,0.15)' },
          ]),
          borderRadius: [3, 3, 0, 0],
        },
      })),
    }],
  })
}

// 加载地图数据
let mapLoaded = false
async function loadMapData() {
  if (mapLoaded) return
  try {
    const res = await fetch('/map/china.json')
    const geoJson = await res.json()
    echarts.registerMap('china', geoJson)
    mapLoaded = true
  } catch (err) {
    console.warn('地图数据加载失败，使用散点图替代', err)
  }
}

function setHeatmapChart(data) {
  const chart = initChart(heatmapChart.value)
  if (!chart) return

  // 如果地图加载成功，使用地图；否则使用散点图
  if (!mapLoaded) {
    // 散点图 fallback
    const positions = [
      [25, 65], [50, 80], [72, 58], [40, 38], [62, 28],
      [18, 45], [82, 72], [32, 82], [58, 48], [48, 68],
    ]
    const scatterData = data.map((v, i) => {
      const pos = positions[i % positions.length]
      return { name: v.villageName, value: [pos[0], pos[1], v.totalAlerts, v.criticalCount, v.highCount] }
    })
    fastSetOption(chart, {
      tooltip: {
        trigger: 'item', backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontSize: 12 },
        formatter: (p) => {
          const d = p.value
          return `<b style="font-size:13px">${p.name}</b><br/>
            <span style="color:${C.blue}">●</span> 总告警: <b>${d[2]}</b><br/>
            <span style="color:${C.red}">●</span> 紧急: ${d[3]} &nbsp;
            <span style="color:${C.yellow}">●</span> 高级: ${d[4]}`
        },
      },
      grid: { top: 10, right: 10, bottom: 10, left: 10 },
      xAxis: { type: 'value', min: 0, max: 100, show: false },
      yAxis: { type: 'value', min: 0, max: 100, show: false },
      series: [{
        type: 'scatter',
        symbolSize: (val) => Math.max(val[2] * 6, 18),
        data: scatterData,
        itemStyle: {
          color: (params) => {
            const t = params.value[2]
            if (t >= 12) return new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
              { offset: 0, color: 'rgba(255,107,107,0.9)' },
              { offset: 1, color: 'rgba(255,107,107,0.15)' },
            ])
            if (t >= 6) return new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
              { offset: 0, color: 'rgba(246,189,22,0.9)' },
              { offset: 1, color: 'rgba(246,189,22,0.15)' },
            ])
            return new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
              { offset: 0, color: 'rgba(91,143,249,0.9)' },
              { offset: 1, color: 'rgba(91,143,249,0.15)' },
            ])
          },
          shadowBlur: 16,
          shadowColor: 'rgba(91,143,249,0.4)',
        },
        label: {
          show: true, formatter: '{b}', position: 'bottom',
          color: C.text1, fontSize: 11, fontWeight: 500,
          textShadowColor: 'rgba(0,0,0,0.8)', textShadowBlur: 4,
        },
      }],
    })
    return
  }

  // 使用散点图模式显示村庄分布（更稳定，不依赖地图数据）
  // 为村庄生成网格状分布坐标
  const positions = [
    [20, 75], [45, 80], [70, 70], [35, 55], [60, 50],
    [15, 40], [80, 60], [40, 30], [65, 35], [50, 45],
  ]
  
  const scatterData = data.map((v, i) => {
    const pos = positions[i % positions.length]
    return {
      name: v.villageName,
      value: [pos[0], pos[1], v.totalAlerts, v.criticalCount, v.highCount],
    }
  })

  fastSetOption(chart, {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(10,15,25,0.95)',
      borderColor: 'rgba(91,143,249,0.3)',
      borderWidth: 1,
      textStyle: { color: '#fff', fontSize: 12 },
      padding: [12, 16],
      formatter: (p) => {
        const d = p.value
        return `
          <div style="font-weight:600;margin-bottom:8px;color:#5b8ff9">${p.name}</div>
          <div style="display:flex;align-items:center;gap:8px;margin:4px 0">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${C.blue}"></span>
            <span style="color:rgba(255,255,255,0.6)">总告警:</span>
            <span style="font-weight:600;color:#fff">${d[2]}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin:4px 0">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${C.red}"></span>
            <span style="color:rgba(255,255,255,0.6)">紧急:</span>
            <span style="font-weight:600;color:#ff6b6b">${d[3]}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin:4px 0">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${C.yellow}"></span>
            <span style="color:rgba(255,255,255,0.6)">高级:</span>
            <span style="font-weight:600;color:#f6bd16">${d[4]}</span>
          </div>
        `
      },
    },
    grid: { top: 10, right: 10, bottom: 10, left: 10 },
    xAxis: { type: 'value', min: 0, max: 100, show: false },
    yAxis: { type: 'value', min: 0, max: 100, show: false },
    series: [
      {
        type: 'scatter',
        data: scatterData,
        symbolSize: (val) => Math.max(val[2] * 2.5, 16),
        label: {
          show: true,
          formatter: '{b}',
          position: 'right',
          color: 'rgba(255,255,255,0.8)',
          fontSize: 11,
          fontWeight: 500,
          backgroundColor: 'rgba(10,15,25,0.7)',
          padding: [3, 8],
          borderRadius: 4,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          distance: 10,
        },
        itemStyle: {
          color: (params) => {
            const val = params.value[2]
            if (val >= 12) {
              return new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
                { offset: 0, color: '#ff6b6b' },
                { offset: 1, color: 'rgba(255,107,107,0.3)' },
              ])
            }
            if (val >= 6) {
              return new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
                { offset: 0, color: '#f6bd16' },
                { offset: 1, color: 'rgba(246,189,22,0.3)' },
              ])
            }
            return new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
              { offset: 0, color: '#5b8ff9' },
              { offset: 1, color: 'rgba(91,143,249,0.3)' },
            ])
          },
          shadowBlur: 15,
          shadowColor: (params) => {
            const val = params.value[2]
            if (val >= 12) return 'rgba(255,107,107,0.4)'
            if (val >= 6) return 'rgba(246,189,22,0.4)'
            return 'rgba(91,143,249,0.4)'
          },
        },
        zlevel: 1,
      },
    ],
  })
}

function setDeviceGaugeChart(rate) {
  const chart = initChart(deviceGaugeChart.value)
  if (!chart) return
  fastSetOption(chart, {
    series: [{
      type: 'gauge', startAngle: 220, endAngle: -40,
      min: 0, max: 100, radius: '88%', center: ['50%', '55%'],
      progress: {
        show: true, width: 10, roundCap: true,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: C.teal },
            { offset: 1, color: C.cyan },
          ]),
        },
      },
      axisLine: { lineStyle: { width: 10, color: [[1, 'rgba(255,255,255,0.06)']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: false },
      anchor: { show: false },
      title: { show: true, offsetCenter: [0, '72%'], fontSize: 11, color: C.text2 },
      detail: {
        valueAnimation: true, fontSize: 26, fontWeight: 700,
        offsetCenter: [0, '8%'], color: C.cyan,
        formatter: '{value}%',
      },
      data: [{ value: rate, name: '在线率' }],
    }],
  })
}

function setOrderBarChart(data) {
  const chart = initChart(orderBarChart.value)
  if (!chart) return
  const statusMap = { COMPLETED: '已完成', IN_PROGRESS: '进行中', CREATED: '待派单', ASSIGNED: '已派单', CANCELLED: '已取消' }
  const colorMap = { COMPLETED: C.cyan, IN_PROGRESS: C.blue, CREATED: C.yellow, ASSIGNED: C.teal, CANCELLED: C.red }
  fastSetOption(chart, {
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontSize: 12 },
    },
    grid: { top: 12, right: 8, bottom: 28, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: data.map(d => statusMap[d.status] || d.status),
      axisLine: { lineStyle: { color: C.border } },
      axisLabel: { color: C.text2, fontSize: 11, interval: 0 }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value', axisLine: { show: false },
      axisLabel: { color: C.text3, fontSize: 10 },
      splitLine: { lineStyle: { color: C.border, type: 'dashed' } },
    },
    series: [{
      type: 'bar', barWidth: '48%',
      data: data.map(d => ({
        value: d.count,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colorMap[d.status] || C.blue },
            { offset: 1, color: 'rgba(91,143,249,0.08)' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      })),
    }],
  })
}

function setHealthPieChart(data) {
  const chart = initChart(healthPieChart.value)
  if (!chart) return
  const statusMap = { GOOD: '良好', WARNING: '一般', DANGER: '需关注', NORMAL: '正常' }
  const colorMap = { GOOD: C.cyan, WARNING: C.yellow, DANGER: C.red, NORMAL: C.blue }
  fastSetOption(chart, {
    tooltip: {
      trigger: 'item', backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontSize: 12 },
      formatter: '{b}: {c}人 ({d}%)',
    },
    legend: {
      orient: 'vertical', right: 4, top: 'center',
      textStyle: { color: C.text2, fontSize: 11 },
      itemWidth: 8, itemHeight: 8, itemGap: 12,
    },
    series: [{
      type: 'pie', radius: ['42%', '66%'], center: ['36%', '50%'],
      avoidLabelOverlap: false, label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 12, fontWeight: 500, color: '#fff', formatter: '{b}\n{d}%' },
        scaleSize: 6,
      },
      itemStyle: { borderColor: 'rgba(11,15,25,0.8)', borderWidth: 2, borderRadius: 4 },
      labelLine: { show: false },
      data: data.map(d => ({
        name: statusMap[d.status] || d.status, value: d.count,
        itemStyle: { color: colorMap[d.status] || C.blue },
      })),
    }],
  })
}

function setDeviceTrendChart(data) {
  const chart = initChart(deviceTrendChart.value)
  if (!chart) return
  fastSetOption(chart, {
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontSize: 12 },
    },
    grid: { top: 20, right: 12, bottom: 24, left: 40 },
    xAxis: {
      type: 'category', data: data.map(d => d.hour),
      axisLine: { lineStyle: { color: C.border } },
      axisLabel: { color: C.text3, fontSize: 10, interval: 3 }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value', min: 60, max: 100,
      axisLine: { show: false },
      axisLabel: { color: C.text3, fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: C.border, type: 'dashed' } },
    },
    series: [{
      type: 'line', data: data.map(d => d.rate), smooth: true,
      symbol: 'none', lineStyle: { color: C.teal, width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(109,200,236,0.3)' },
          { offset: 1, color: 'rgba(109,200,236,0.02)' },
        ]),
      },
    }],
  })
}

// ===== 数据获取 =====
async function fetchOverviewData() {
  try {
    const resp = await fetch('/api/big-screen/overview')
    const json = await resp.json()
    if (json.code === 200 && json.data) {
      const d = json.data
      kpi.elderlyCount = d.kpi.elderlyCount
      kpi.todayAlerts = d.kpi.todayAlerts
      kpi.deviceOnline = d.kpi.deviceOnline
      kpi.orderCompletionRate = d.kpi.orderCompletionRate
      setAlertTrendChart(d.alertTrend24h || mockData.alertTrend24h)
      setAlertTypeChart(d.alertByType || mockData.alertByType)
      setResponseTimeChart(d.dailyResponse || mockData.dailyResponse)
      setHeatmapChart(d.villageHeatmap || mockData.villageHeatmap)
      setDeviceGaugeChart(d.kpi.deviceOnlineRate || mockData.deviceOnlineRate)
      setOrderBarChart(d.orderByStatus || mockData.orderByStatus)
      setHealthPieChart(d.healthByStatus || mockData.healthByStatus)
      return
    }
  } catch (err) {
    console.warn('获取大屏数据失败，使用模拟数据', err)
  }
  kpi.elderlyCount = mockData.kpi.elderlyCount
  kpi.todayAlerts = mockData.kpi.todayAlerts
  kpi.deviceOnline = mockData.kpi.deviceOnline
  kpi.orderCompletionRate = mockData.kpi.orderCompletionRate
  setAlertTrendChart(mockData.alertTrend24h)
  setAlertTypeChart(mockData.alertByType)
  setResponseTimeChart(mockData.dailyResponse)
  setHeatmapChart(mockData.villageHeatmap)
  setDeviceGaugeChart(mockData.deviceOnlineRate)
  setOrderBarChart(mockData.orderByStatus)
  setHealthPieChart(mockData.healthByStatus)
}

async function fetchAlerts() {
  try {
    const resp = await fetch('/api/big-screen/alerts?limit=20')
    const json = await resp.json()
    if (json.code === 200 && json.data) {
      alertList.value = json.data
      footerAlerts.value = json.data
      return
    }
  } catch (err) {
    console.warn('获取告警列表失败，使用模拟数据', err)
  }
  alertList.value = mockData.alerts
  footerAlerts.value = mockData.alerts
}

async function fetchDeviceTrend() {
  try {
    const resp = await fetch('/api/big-screen/devices')
    const json = await resp.json()
    if (json.code === 200 && json.data && json.data.hourlyData) {
      setDeviceTrendChart(json.data.hourlyData)
      return
    }
  } catch (err) {
    console.warn('获取设备趋势失败，使用模拟数据', err)
  }
  setDeviceTrendChart(mockData.deviceTrend)
}

const alertLoopList = computed(() => {
  if (!alertList.value || alertList.value.length === 0) return []
  return [...alertList.value, ...alertList.value]
})

const footerLoopList = computed(() => {
  if (!footerAlerts.value || footerAlerts.value.length === 0) return []
  return [...footerAlerts.value, ...footerAlerts.value]
})

// 性能优化：使用 CSS transform 代替 scrollTop，使用 requestAnimationFrame
function startAlertScroll() {
  const el = alertScrollRef.value
  if (!el) return
  let offset = 0
  let lastTime = performance.now()
  const speed = 0.03 // 像素/毫秒
  
  function scrollStep(currentTime) {
    if (!el || !scrollTimer) return
    const deltaTime = currentTime - lastTime
    lastTime = currentTime
    
    offset += speed * deltaTime
    const maxOffset = el.scrollHeight / 2
    if (offset >= maxOffset) offset = 0
    
    // 使用 transform 代替 scrollTop，触发 GPU 加速
    el.style.transform = `translateY(-${offset}px)`
    
    scrollTimer = requestAnimationFrame(scrollStep)
  }
  
  scrollTimer = requestAnimationFrame(scrollStep)
}

// ===== 生命周期 =====
onMounted(async () => {
  updateClock()
  initWeather()
  updateLastUpdated()
  clockTimer = setInterval(updateClock, 1000)
  await nextTick()
  // 先加载地图数据
  await loadMapData()
  // 再获取业务数据
  await refreshAll()
  setTimeout(() => startAlertScroll(), 500)
  refreshTimer = setInterval(() => {
    fetchAlerts()  // 仅告警列表需要高频刷新
  }, 15000)
  // 全量数据刷新间隔拉长到 60 秒
  fullRefreshTimer = setInterval(() => {
    fetchOverviewData()
    fetchDeviceTrend()
    updateLastUpdated()
  }, 60000)
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (fullRefreshTimer) clearInterval(fullRefreshTimer)
  if (clockTimer) clearInterval(clockTimer)
  if (scrollTimer) cancelAnimationFrame(scrollTimer)
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  chartInstances.forEach(c => {
    if (c && !c.isDisposed()) c.dispose()
  })
  chartInstances = []
  window.removeEventListener('resize', resizeCharts)
})
</script>

<template>
  <div
    ref="bigScreenRef"
    class="big-screen"
  >
    <!-- 顶部标题栏 -->
    <header class="screen-header">
      <div class="header-left">
        <button
          class="back-btn"
          @click="router.push('/gov/dashboard')"
        >
          <el-icon aria-hidden="true">
            <ArrowLeft />
          </el-icon>
          <span>返回后台</span>
        </button>
      </div>
      <div class="header-center">
        <h1 class="header-title">
          乡村守护者 · 智慧养老数据中心
        </h1>
        <div class="header-meta">
          <span class="meta-weather">{{ weatherText }}</span>
          <span class="meta-divider">|</span>
          <span class="meta-time">{{ currentTime }}</span>
          <span class="meta-divider">|</span>
          <span class="meta-time">更新 {{ lastUpdated }}</span>
        </div>
      </div>
      <div class="header-right">
        <button
          class="icon-btn"
          title="刷新数据"
          aria-label="刷新数据"
          :disabled="isRefreshing"
          @click="refreshAll"
        >
          <el-icon aria-hidden="true">
            <RefreshRight />
          </el-icon>
        </button>
        <button
          class="icon-btn"
          title="预警中心"
          aria-label="进入预警中心"
          @click="router.push('/gov/alert')"
        >
          <el-icon aria-hidden="true">
            <Bell />
          </el-icon>
        </button>
        <button
          class="icon-btn"
          title="全屏"
          aria-label="切换全屏模式"
          @click="toggleFullscreen"
        >
          <el-icon aria-hidden="true">
            <FullScreen />
          </el-icon>
        </button>
      </div>
    </header>

    <!-- 主体内容 -->
    <div class="screen-body">
      <!-- 左侧面板 -->
      <aside class="panel-left">
        <div
          class="panel-card"
          style="flex: 1.1"
        >
          <div class="card-header">
            <div class="card-indicator" />
            <span class="card-title">24小时告警趋势</span>
          </div>
          <div
            ref="alertTrendChart"
            class="card-body"
          />
        </div>

        <div
          class="panel-card"
          style="flex: 1"
        >
          <div class="card-header">
            <div class="card-indicator warn" />
            <span class="card-title">告警类型分布</span>
          </div>
          <div
            ref="alertTypeChart"
            class="card-body"
          />
        </div>

        <div
          class="panel-card"
          style="flex: 1.3"
        >
          <div class="card-header">
            <div class="card-indicator danger" />
            <span class="card-title">实时告警</span>
            <span class="live-badge">LIVE</span>
          </div>
          <div class="alert-scroll-area">
            <div
              ref="alertScrollRef"
              class="alert-scroll-inner"
            >
              <div
                v-for="(alert, idx) in alertLoopList"
                :key="idx"
                class="alert-row"
                :class="'level-' + (alert.level || 'MEDIUM').toLowerCase()"
              >
                <span class="alert-dot" />
                <span class="alert-tag">{{ formatAlertType(alert.type) }}</span>
                <span class="alert-msg">{{ alert.description || alert.elderlyName || '告警信息' }}</span>
                <span class="alert-ts">{{ formatTime(alert.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          class="panel-card"
          style="flex: 0.9"
        >
          <div class="card-header">
            <div class="card-indicator info" />
            <span class="card-title">服务响应时效</span>
          </div>
          <div
            ref="responseTimeChart"
            class="card-body"
          />
        </div>
      </aside>

      <!-- 中央区域 -->
      <main class="panel-center">
        <!-- KPI 卡片 -->
        <div class="kpi-strip">
          <div
            v-for="(item, idx) in kpiItems"
            :key="idx"
            class="kpi-item"
          >
            <div
              class="kpi-icon-wrap"
              :style="{ background: item.iconBg }"
            >
              <!-- 老人图标 -->
              <svg
                v-if="item.icon === 'elderly'"
                class="kpi-svg"
                viewBox="0 0 48 48"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="24"
                  cy="14"
                  r="8"
                  stroke="currentColor"
                  stroke-width="2.5"
                />
                <path
                  d="M12 42c0-6.627 5.373-12 12-12s12 5.373 12 12"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                />
                <path
                  d="M18 26l-4-6M30 26l4-6"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                />
              </svg>
              <!-- 告警图标 -->
              <svg
                v-else-if="item.icon === 'alert'"
                class="kpi-svg"
                viewBox="0 0 48 48"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M24 8L6 40h36L24 8z"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linejoin="round"
                />
                <path
                  d="M24 18v10M24 32h.01"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                />
              </svg>
              <!-- 设备图标 -->
              <svg
                v-else-if="item.icon === 'device'"
                class="kpi-svg"
                viewBox="0 0 48 48"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="8"
                  y="12"
                  width="32"
                  height="24"
                  rx="4"
                  stroke="currentColor"
                  stroke-width="2.5"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="6"
                  stroke="currentColor"
                  stroke-width="2.5"
                />
                <path
                  d="M20 44h8M24 36v8"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                />
                <circle
                  cx="36"
                  cy="18"
                  r="2"
                  fill="currentColor"
                />
              </svg>
              <!-- 完成图标 -->
              <svg
                v-else-if="item.icon === 'check'"
                class="kpi-svg"
                viewBox="0 0 48 48"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  stroke="currentColor"
                  stroke-width="2.5"
                />
                <path
                  d="M14 24l6 6 12-12"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div class="kpi-info">
              <div
                class="kpi-num"
                :style="{ color: item.color }"
              >
                {{ item.value }}<span
                  v-if="item.unit"
                  class="kpi-unit"
                >{{ item.unit }}</span>
              </div>
              <div class="kpi-name">
                {{ item.label }}
              </div>
            </div>
          </div>
        </div>

        <!-- 天津市3D数据可视化 -->
        <div class="map-section map-china-section">
          <div
            class="card-header"
            style="padding: 0 4px 12px;"
          >
            <div class="card-indicator" />
            <span class="card-title">天津市 · 数据可视化</span>
            <button
              class="map-toggle-btn"
              :class="{ active: show3DMap }"
              @click="show3DMap = !show3DMap"
            >
              {{ show3DMap ? '3D ON' : '3D OFF' }}
            </button>
          </div>
          <div class="map-body map-china-body">
            <Tianjin3DMap v-if="show3DMap" />
            <div
              v-else
              class="map-placeholder"
            >
              <div class="map-placeholder-text">
                天津市数据概览
              </div>
              <div class="map-placeholder-hint">
                点击 "3D ON" 开启 3D 地图
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 右侧面板 -->
      <aside class="panel-right">
        <div
          class="panel-card"
          style="flex: 1"
        >
          <div class="card-header">
            <div class="card-indicator success" />
            <span class="card-title">设备在线率</span>
          </div>
          <div
            ref="deviceGaugeChart"
            class="card-body"
          />
        </div>

        <div
          class="panel-card"
          style="flex: 1"
        >
          <div class="card-header">
            <div class="card-indicator" />
            <span class="card-title">服务工单统计</span>
          </div>
          <div
            ref="orderBarChart"
            class="card-body"
          />
        </div>

        <div
          class="panel-card"
          style="flex: 1"
        >
          <div class="card-header">
            <div class="card-indicator warn" />
            <span class="card-title">老人健康状况分布</span>
          </div>
          <div
            ref="healthPieChart"
            class="card-body"
          />
        </div>

        <div
          class="panel-card"
          style="flex: 1"
        >
          <div class="card-header">
            <div class="card-indicator info" />
            <span class="card-title">设备在线趋势</span>
          </div>
          <div
            ref="deviceTrendChart"
            class="card-body"
          />
        </div>
      </aside>
    </div>

    <!-- 底部滚动告警 -->
    <footer class="screen-footer">
      <div class="footer-badge">
        <span class="pulse-dot" />
        <span>实时告警</span>
      </div>
      <div class="footer-ticker">
        <div
          ref="footerScrollRef"
          class="ticker-track"
        >
          <span
            v-for="(alert, idx) in footerLoopList"
            :key="idx"
            class="ticker-item"
          >
            <span
              class="ticker-tag"
              :class="'tag-' + (alert.level || 'MEDIUM').toLowerCase()"
            >{{ formatAlertType(alert.type) }}</span>
            <span class="ticker-text">{{ alert.description || alert.elderlyName || '告警' }}</span>
            <span class="ticker-time">{{ formatTime(alert.created_at) }}</span>
          </span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ===== 响应式基准变量 ===== */
:root {
  --base-unit: min(1vw, 1vh);
  --header-h: clamp(48px, 6vh, 64px);
  --panel-gap: clamp(8px, 1.2vmin, 14px);
  --card-pad: clamp(10px, 1.5vmin, 16px);
  --font-xs: clamp(10px, 1vmin, 12px);
  --font-sm: clamp(11px, 1.2vmin, 13px);
  --font-base: clamp(12px, 1.4vmin, 14px);
  --font-lg: clamp(16px, 2vmin, 20px);
  --font-xl: clamp(22px, 3vmin, 28px);
  --font-xxl: clamp(28px, 4vmin, 36px);
}

/* ===== 全屏容器 ===== */
.big-screen {
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at 20% -10%, rgba(124, 58, 237, 0.22) 0%, transparent 42%),
    radial-gradient(circle at 90% 0%, rgba(14, 165, 233, 0.22) 0%, transparent 40%),
    radial-gradient(circle at 75% 90%, rgba(16, 185, 129, 0.14) 0%, transparent 48%),
    #060914;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  position: relative;
  font-size: var(--font-base);
}

.big-screen::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 42% at 50% 0%, rgba(148, 163, 184, 0.08) 0%, transparent 70%),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.035) 0px,
      rgba(255, 255, 255, 0.035) 1px,
      transparent 1px,
      transparent 120px
    ),
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.028) 0px,
      rgba(255, 255, 255, 0.028) 1px,
      transparent 1px,
      transparent 120px
    );
  pointer-events: none;
  z-index: 0;
}

/* ===== 顶部标题栏 ===== */
.screen-header {
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(16px, 2vw, 24px);
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  background: rgba(6, 9, 20, 0.7);
  /* backdrop-filter 已移除，减少 GPU 合成成本 */
}

.header-left, .header-right {
  flex-shrink: 0;
  width: clamp(100px, 12vw, 120px);
}

.header-right {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: clamp(4px, 0.6vw, 8px);
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.55);
  padding: clamp(6px, 1vh, 8px) clamp(12px, 1.5vw, 16px);
  border-radius: clamp(8px, 1vw, 10px);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.back-btn:hover {
  color: #fff;
  border-color: rgba(91,143,249,0.4);
  background: rgba(91,143,249,0.1);
  transform: translateX(-2px);
}
.back-btn:active {
  transform: translateX(0);
}
.back-btn span {
  white-space: nowrap;
}

.icon-btn {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.55);
  width: clamp(32px, 4vh, 38px);
  height: clamp(32px, 4vh, 38px);
  border-radius: clamp(8px, 1vw, 10px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: clamp(14px, 1.8vmin, 16px);
}
.icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.icon-btn:hover {
  color: #fff;
  border-color: rgba(91,143,249,0.4);
  background: rgba(91,143,249,0.1);
  transform: scale(1.05);
}
.icon-btn:active {
  transform: scale(1);
}

.header-center {
  text-align: center;
  flex: 1;
}

.header-title {
  font-size: clamp(18px, 2.8vmin, 24px);
  font-weight: 700;
  letter-spacing: clamp(2px, 0.5vw, 4px);
  margin: 0;
  color: rgba(255, 255, 255, 0.92);
}

.header-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 2px;
}

.meta-weather, .meta-time {
  font-size: var(--font-xs);
  color: rgba(255,255,255,0.35);
  letter-spacing: 1px;
}

.meta-divider {
  color: rgba(255,255,255,0.15);
}

/* ===== 主体布局 ===== */
.screen-body {
  flex: 1;
  display: flex;
  gap: var(--panel-gap);
  padding: var(--panel-gap);
  min-height: 0;
  position: relative;
  z-index: 1;
}

.panel-left, .panel-right {
  width: clamp(200px, 21vw, 280px);
  min-width: clamp(180px, 18vw, 220px);
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1vmin, 10px);
}

.panel-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--panel-gap);
  min-width: 0;
}

/* ===== 面板卡片 ===== */
.panel-card {
  background: rgba(255, 255, 255, 0.028);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: clamp(10px, 1.5vmin, 14px);
  padding: var(--card-pad);
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
  /* backdrop-filter 已移除 */
  will-change: transform;
  transform: translateZ(0);
}

.panel-card:hover {
  border-color: rgba(148, 163, 184, 0.22);
  box-shadow: 0 22px 40px rgba(0, 0, 0, 0.35);
  transform: translateY(-2px) translateZ(0);
}

.panel-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 55%),
    radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.08), transparent 60%);
  opacity: 0;
  pointer-events: none;
}

.panel-card:hover::before {
  opacity: 1;
}

.panel-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.06);
  pointer-events: none;
}

.card-header {
  display: flex;
  align-items: center;
  gap: clamp(6px, 0.8vmin, 8px);
  margin-bottom: clamp(8px, 1.2vmin, 10px);
  flex-shrink: 0;
}

.card-indicator {
  width: clamp(2px, 0.4vmin, 3px);
  height: clamp(10px, 1.8vmin, 14px);
  border-radius: 2px;
  background: linear-gradient(180deg, #818cf8, #5b8ff9);
}
.card-indicator.warn { background: linear-gradient(180deg, #fbbf24, #f59e0b); }
.card-indicator.danger { background: linear-gradient(180deg, #f87171, #ef4444); }
.card-indicator.info { background: linear-gradient(180deg, #67e8f9, #22d3ee); }
.card-indicator.success { background: linear-gradient(180deg, #6ee7b7, #34d399); }

.card-title {
  font-size: var(--font-sm);
  font-weight: 600;
  color: rgba(255,255,255,0.8);
  letter-spacing: 0.5px;
}

.live-badge {
  margin-left: auto;
  font-size: clamp(8px, 1vmin, 10px);
  font-weight: 700;
  color: #f87171;
  background: rgba(248,113,113,0.12);
  padding: clamp(1px, 0.3vmin, 2px) clamp(4px, 0.8vmin, 8px);
  border-radius: 4px;
  letter-spacing: 1px;
  animation: livePulse 2s ease-in-out infinite;
}

@keyframes livePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.card-body {
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
}

.card-body canvas {
  background: transparent !important;
}

/* ===== 告警列表 ===== */
.alert-scroll-area {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.alert-scroll-inner {
  height: 100%;
  overflow: hidden;
}

.alert-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.2s;
}
.alert-row:last-child { border-bottom: none; }
.alert-row:hover { background: rgba(255,255,255,0.03); }

.alert-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.level-critical .alert-dot { background: #ff6b6b; box-shadow: 0 0 8px rgba(255,107,107,0.5); }
.level-high .alert-dot { background: #f6bd16; box-shadow: 0 0 8px rgba(246,189,22,0.5); }
.level-medium .alert-dot { background: #5b8ff9; box-shadow: 0 0 8px rgba(91,143,249,0.5); }
.level-low .alert-dot { background: #5ad8a6; box-shadow: 0 0 8px rgba(90,216,166,0.5); }

.alert-tag {
  font-size: 11px;
  color: rgba(255,255,255,0.65);
  flex-shrink: 0;
  width: 56px;
}

.alert-msg {
  flex: 1;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-ts {
  font-size: 10px;
  color: rgba(255,255,255,0.25);
  font-family: 'SF Mono', 'Menlo', monospace;
  flex-shrink: 0;
}

/* ===== KPI 卡片 ===== */
.kpi-strip {
  display: flex;
  gap: clamp(10px, 1.5vw, 14px);
  flex-shrink: 0;
}

.kpi-item {
  flex: 1;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: clamp(12px, 2vmin, 16px);
  padding: clamp(14px, 2.2vmin, 20px) clamp(12px, 2vmin, 18px);
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.5vmin, 16px);
  transition: border-color 0.35s, box-shadow 0.35s, transform 0.35s;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  /* backdrop-filter 已移除 */
  position: relative;
  overflow: hidden;
  will-change: transform;
  transform: translateZ(0);
}
.kpi-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
}
.kpi-item:hover {
  border-color: rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  transform: translateY(-3px) translateZ(0);
  box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset;
}

.kpi-icon-wrap {
  width: clamp(40px, 6vmin, 52px);
  height: clamp(40px, 6vmin, 52px);
  border-radius: clamp(10px, 1.5vmin, 14px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  transition: transform 0.3s ease;
}
.kpi-item:hover .kpi-icon-wrap {
  transform: scale(1.05);
}
.kpi-icon-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: clamp(10px, 1.5vmin, 14px);
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
  pointer-events: none;
}

.kpi-svg {
  width: clamp(20px, 3vmin, 26px);
  height: clamp(20px, 3vmin, 26px);
  color: inherit;
  transition: transform 0.3s ease;
}
.kpi-item:hover .kpi-svg {
  transform: scale(1.1);
}

.kpi-info {
  flex: 1;
  min-width: 0;
}

.kpi-num {
  font-size: var(--font-xxl);
  font-weight: 700;
  font-family: 'DIN Alternate', 'SF Pro Display', -apple-system, sans-serif;
  line-height: 1.1;
  letter-spacing: -0.5px;
  background: linear-gradient(180deg, currentColor 0%, rgba(255,255,255,0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.kpi-unit {
  font-size: var(--font-sm);
  font-weight: 500;
  opacity: 0.8;
  margin-left: 2px;
  -webkit-text-fill-color: currentColor;
}

.kpi-name {
  font-size: var(--font-xs);
  color: rgba(255,255,255,0.35);
  margin-top: clamp(4px, 0.8vmin, 6px);
  letter-spacing: 0.8px;
  font-weight: 500;
  text-transform: uppercase;
}

/* ===== 中央地图 ===== */
.map-section {
  flex: 1;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  overflow: hidden;
  /* backdrop-filter 已移除 */
}

.map-body {
  flex: 1;
  min-height: 0;
}

/* 3D 开关按钮 */
.map-toggle-btn {
  margin-left: auto;
  padding: 2px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.5);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  letter-spacing: 0.5px;
}
.map-toggle-btn:hover { border-color: rgba(91,143,249,0.4); background: rgba(91,143,249,0.1); color: #fff; }
.map-toggle-btn.active { background: rgba(79,195,247,0.15); border-color: rgba(79,195,247,0.4); color: #4fc3f7; }

/* 3D 地图占位符 */
.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
}
.map-placeholder-text { font-size: 18px; color: rgba(255,255,255,0.72); margin-bottom: 10px; letter-spacing: 0.08em; }
.map-placeholder-hint { font-size: 12px; color: rgba(255,255,255,0.32); }

/* 3D地图样式 */
.map-3d-section {
  background: linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(26, 35, 126, 0.2) 100%);
  border: 1px solid rgba(79, 195, 247, 0.2);
  box-shadow: 
    0 0 20px rgba(79, 195, 247, 0.1),
    inset 0 0 30px rgba(79, 195, 247, 0.05);
}

.map-3d-body {
  position: relative;
  overflow: hidden;
}

.map-3d-body::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0, 188, 212, 0.1) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

.map-body canvas {
  background: transparent !important;
}

/* Leaflet卫星地图样式 */
.map-leaflet-section {
  background: linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(26, 35, 126, 0.2) 100%);
  border: 1px solid rgba(79, 195, 247, 0.2);
  box-shadow: 
    0 0 20px rgba(79, 195, 247, 0.1),
    inset 0 0 30px rgba(79, 195, 247, 0.05);
}

.map-leaflet-body {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

/* 3D地球样式 */
.map-earth-section {
  background: linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(26, 35, 126, 0.2) 100%);
  border: 1px solid rgba(79, 195, 247, 0.2);
  box-shadow: 
    0 0 20px rgba(79, 195, 247, 0.1),
    inset 0 0 30px rgba(79, 195, 247, 0.05);
}

.map-earth-body {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  height: 100%;
}

/* 中国地图3D样式 */
.map-china-section {
  background: linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(26, 35, 126, 0.2) 100%);
  border: 1px solid rgba(79, 195, 247, 0.2);
  box-shadow: 
    0 0 20px rgba(79, 195, 247, 0.1),
    inset 0 0 30px rgba(79, 195, 247, 0.05);
}

.map-china-body {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  height: 100%;
}

/* ===== 底部滚动条 ===== */
.screen-footer {
  height: clamp(32px, 5vh, 38px);
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.5vw, 14px);
  padding: 0 clamp(16px, 2vw, 20px);
  border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(11,15,25,0.8);
  /* backdrop-filter 已移除，减少 GPU 合成成本 */
  flex-shrink: 0;
  z-index: 1;
}

.footer-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255,255,255,0.45);
  flex-shrink: 0;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff6b6b;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

.footer-ticker {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
}

.ticker-track {
  display: inline-block;
  animation: scroll 40s linear infinite;
  white-space: nowrap;
  will-change: transform;
  transform: translateZ(0);
}

@keyframes scroll {
  0% { transform: translateX(0) translateZ(0); }
  100% { transform: translateX(-50%) translateZ(0); }
}

.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 36px;
  font-size: 12px;
}

.ticker-tag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  flex-shrink: 0;
}

.tag-critical { background: rgba(255,107,107,0.15); color: #ff6b6b; }
.tag-high { background: rgba(246,189,22,0.15); color: #f6bd16; }
.tag-medium { background: rgba(91,143,249,0.15); color: #5b8ff9; }
.tag-low { background: rgba(90,216,166,0.15); color: #5ad8a6; }

.ticker-text { color: rgba(255,255,255,0.5); }
.ticker-time { color: rgba(255,255,255,0.25); font-family: 'SF Mono', monospace; font-size: 11px; }

/* ===== 入场动画 ===== */
.panel-card, .kpi-item, .map-section {
  animation: fadeUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  will-change: transform, opacity;
}
.panel-left .panel-card:nth-child(1) { animation-delay: 0.05s; }
.panel-left .panel-card:nth-child(2) { animation-delay: 0.1s; }
.panel-left .panel-card:nth-child(3) { animation-delay: 0.15s; }
.panel-left .panel-card:nth-child(4) { animation-delay: 0.2s; }
.kpi-item:nth-child(1) { animation-delay: 0.08s; }
.kpi-item:nth-child(2) { animation-delay: 0.14s; }
.kpi-item:nth-child(3) { animation-delay: 0.2s; }
.kpi-item:nth-child(4) { animation-delay: 0.26s; }
.map-section { animation-delay: 0.3s; }
.panel-right .panel-card:nth-child(1) { animation-delay: 0.12s; }
.panel-right .panel-card:nth-child(2) { animation-delay: 0.18s; }
.panel-right .panel-card:nth-child(3) { animation-delay: 0.24s; }
.panel-right .panel-card:nth-child(4) { animation-delay: 0.3s; }

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== 尊重用户动画偏好 ===== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .header-title {
    animation: none !important;
  }
  
  .panel-card::before {
    animation: none !important;
  }
  
  .live-badge {
    animation: none !important;
  }
  
  .pulse-dot {
    animation: none !important;
  }
  
  .ticker-track {
    animation: none !important;
  }
  
  .panel-card,
  .kpi-item,
  .map-section {
    animation: none !important;
  }
}
</style>

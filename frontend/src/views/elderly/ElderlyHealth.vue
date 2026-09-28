<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import {
  ArrowLeft, Monitor, Odometer, WindPower, Sunny, Moon, Position,
  BellFilled, Timer, DataAnalysis, Iphone,
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import request from '../../api/request'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const realtime = ref(null)
const trendData = ref(null)
const alerts = ref([])
const loading = ref(true)
const chartRef = ref(null)
let chartInstance = null
let refreshTimer = null

const elderlyId = computed(() => userStore.userInfo?.id || 1)

// ===== 获取手环实时数据 =====
async function fetchRealtime() {
  try {
    const res = await request.get(`/bracelet/realtime/${elderlyId}`)
    if (res.code === 200 && res.data) {
      realtime.value = res.data
    }
  } catch (err) {
    console.warn('获取实时数据失败', err)
  }
}

// ===== 获取手环历史趋势 =====
async function fetchTrend() {
  try {
    const res = await request.get(`/bracelet/trend/${elderlyId}?hours=24`)
    if (res.code === 200 && res.data) {
      trendData.value = res.data
      await nextTick()
      renderChart()
    }
  } catch (err) {
    console.warn('获取趋势数据失败', err)
  }
}

// ===== 获取手环告警 =====
async function fetchAlerts() {
  try {
    const res = await request.get(`/bracelet/alerts/${elderlyId}?limit=5`)
    if (res.code === 200) {
      alerts.value = res.data
    }
  } catch (err) {
    console.warn('获取告警失败', err)
  }
}

// ===== ECharts 趋势图 =====
function renderChart() {
  if (!chartRef.value || !trendData.value) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)
  chartInstance.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(30,41,59,0.95)', borderColor: '#334155', textStyle: { color: '#e2e8f0', fontSize: 14 } },
    legend: { data: ['心率', '血氧'], textStyle: { color: '#94a3b8' }, top: 5 },
    grid: { top: 40, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category', data: trendData.value.heartRate?.map(d => d.time) || [],
      axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontSize: 12, interval: 'auto' },
    },
    yAxis: [
      {
        type: 'value', name: 'bpm', nameTextStyle: { color: '#ef4444' },
        axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(51,65,85,0.3)' } },
      },
      {
        type: 'value', name: '%', nameTextStyle: { color: '#0d9488' },
        axisLabel: { color: '#94a3b8' },
      },
    ],
    series: [
      {
        name: '心率', type: 'line', yAxisIndex: 0,
        data: trendData.value.heartRate?.map(d => d.value) || [],
        smooth: true, symbol: 'none',
        lineStyle: { color: '#ef4444', width: 2.5 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(239,68,68,0.3)' }, { offset: 1, color: 'rgba(239,68,68,0.02)' }]) },
      },
      {
        name: '血氧', type: 'line', yAxisIndex: 1,
        data: trendData.value.spo2?.map(d => d.value) || [],
        smooth: true, symbol: 'none',
        lineStyle: { color: '#0d9488', width: 2.5 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(13,148,136,0.3)' }, { offset: 1, color: 'rgba(13,148,136,0.02)' }]) },
      },
    ],
  })
}

// ===== 生命周期 =====
onMounted(async () => {
  loading.value = true
  await Promise.all([fetchRealtime(), fetchTrend(), fetchAlerts()])
  loading.value = false

  // 每 10 秒刷新实时数据
  refreshTimer = setInterval(fetchRealtime, 10000)
})

onUnmounted(() => {
  if (chartInstance) chartInstance.dispose()
  if (refreshTimer) clearInterval(refreshTimer)
})

// ===== 工具函数 =====
function heartRateStatus(hr) {
  if (!hr) return 'normal'
  if (hr < 50 || hr > 110) return 'danger'
  if (hr < 60 || hr > 100) return 'warn'
  return 'normal'
}

function spo2Status(spo2) {
  if (!spo2) return 'normal'
  if (spo2 < 90) return 'danger'
  if (spo2 < 95) return 'warn'
  return 'normal'
}

function formatTime(ts) {
  if (!ts) return '--'
  return new Date(ts).toLocaleTimeString('zh-CN')
}

const levelColors = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#10b981' }
const levelLabels = { CRITICAL: '紧急', HIGH: '高级', MEDIUM: '中级', LOW: '低级' }
const typeLabels = { FALL: '跌倒', SOS: '紧急求助', FALL_DETECTED: '跌倒检测', HEART_RATE: '心率异常', BLOOD_PRESSURE: '血压异常', FENCE: '越界' }
</script>

<template>
  <div class="elderly-health">
    <!-- 顶部导航 -->
    <div class="health-header">
      <button
        class="back-btn"
        @click="$router.back()"
      >
        <el-icon><ArrowLeft /></el-icon>
        <span>返回</span>
      </button>
      <h1 class="health-title">
        🩺 我的健康
      </h1>
      <div class="header-status">
        <span
          v-if="realtime?.isOnline"
          class="online-badge"
        >● 在线</span>
        <span
          v-else
          class="offline-badge"
        >● 离线</span>
      </div>
    </div>

    <!-- 实时体征卡片 -->
    <div
      v-loading="loading"
      class="vitals-grid"
    >
      <!-- 心率 -->
      <div
        class="vital-card"
        :class="heartRateStatus(realtime?.heartRate)"
      >
        <div class="vital-icon">
          <Monitor />
        </div>
        <div class="vital-info">
          <div class="vital-value">
            {{ realtime?.heartRate || '--' }} <span class="vital-unit">bpm</span>
          </div>
          <div class="vital-label">
            心率
          </div>
          <div class="vital-status">
            {{ realtime?.heartRate > 100 ? '偏高' : realtime?.heartRate < 60 ? '偏低' : '正常' }}
          </div>
        </div>
      </div>

      <!-- 血氧 -->
      <div
        class="vital-card"
        :class="spo2Status(realtime?.spo2)"
      >
        <div class="vital-icon">
          <WindPower />
        </div>
        <div class="vital-info">
          <div class="vital-value">
            {{ realtime?.spo2 || '--' }} <span class="vital-unit">%</span>
          </div>
          <div class="vital-label">
            血氧饱和度
          </div>
          <div class="vital-status">
            {{ realtime?.spo2 < 95 ? '偏低' : '正常' }}
          </div>
        </div>
      </div>

      <!-- 体温 -->
      <div class="vital-card">
        <div class="vital-icon">
          <Sunny />
        </div>
        <div class="vital-info">
          <div class="vital-value">
            {{ realtime?.temperature || '--' }} <span class="vital-unit">°C</span>
          </div>
          <div class="vital-label">
            体温
          </div>
          <div class="vital-status">
            {{ realtime?.temperature > 37.3 ? '发热' : realtime?.temperature > 37 ? '偏高' : '正常' }}
          </div>
        </div>
      </div>

      <!-- 步数 -->
      <div class="vital-card">
        <div class="vital-icon">
          <Odometer />
        </div>
        <div class="vital-info">
          <div class="vital-value">
            {{ realtime?.steps || '--' }} <span class="vital-unit">步</span>
          </div>
          <div class="vital-label">
            今日步数
          </div>
          <div class="vital-status">
            目标 8000
          </div>
        </div>
      </div>

      <!-- 电池 -->
      <div class="vital-card">
        <div class="vital-icon">
          <Iphone />
        </div>
        <div class="vital-info">
          <div class="vital-value">
            {{ realtime?.battery || '--' }} <span class="vital-unit">%</span>
          </div>
          <div class="vital-label">
            手环电量
          </div>
          <div class="vital-status">
            {{ realtime?.battery < 20 ? '需充电' : '正常' }}
          </div>
        </div>
      </div>

      <!-- 定位 -->
      <div class="vital-card">
        <div class="vital-icon">
          <Position />
        </div>
        <div class="vital-info">
          <div class="vital-value-small">
            {{ realtime?.latitude?.toFixed(4) || '--' }}, {{ realtime?.longitude?.toFixed(4) || '--' }}
          </div>
          <div class="vital-label">
            当前位置
          </div>
          <div class="vital-status">
            <span v-if="realtime?.isOnline"><Timer /></span>
            {{ realtime?.lastReportAt ? formatTime(realtime.lastReportAt) : '--' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 24小时趋势图 -->
    <div class="chart-section">
      <h3><DataAnalysis /> 24小时趋势</h3>
      <div
        ref="chartRef"
        class="trend-chart"
      />
    </div>

    <!-- 最近告警 -->
    <div
      v-if="alerts.length > 0"
      class="alerts-section"
    >
      <h3><BellFilled /> 最近告警</h3>
      <div
        v-for="alert in alerts"
        :key="alert.id"
        class="alert-item"
        :style="{ borderLeftColor: levelColors[alert.level] }"
      >
        <div class="alert-top">
          <span class="alert-type">{{ typeLabels[alert.type] || alert.type }}</span>
          <span
            class="alert-level"
            :style="{ color: levelColors[alert.level] }"
          >{{ levelLabels[alert.level] || alert.level }}</span>
          <span
            class="alert-status"
            :class="alert.status"
          >{{ alert.status === 'PENDING' ? '待处理' : alert.status === 'RESOLVED' ? '已处理' : alert.status === 'CANCELLED' ? '已取消' : alert.status }}</span>
        </div>
        <div class="alert-desc">
          {{ alert.description }}
        </div>
        <div class="alert-time">
          {{ formatTime(alert.createdAt) }}
        </div>
      </div>
    </div>

    <!-- 无数据提示 -->
    <div
      v-if="!loading && !realtime"
      class="empty-state"
    >
      <p>暂未绑定额环设备</p>
      <p class="hint">
        请联系村级专员为您绑定智能手环
      </p>
    </div>
  </div>
</template>

<style scoped>
.elderly-health {
  min-height: 100vh;
  background: #f0fdfa;
  padding: 16px;
  font-size: 18px; /* 适老化大字体 */
}
.health-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 12px 0;
  border-bottom: 1px solid #ccfbf1;
}
.health-title { font-size: 28px; font-weight: 700; color: #0d9488; margin: 0; }
.back-btn {
  display: flex; align-items: center; gap: 8px; background: none; border: none; color: #0d9488;
  font-size: 18px; cursor: pointer; padding: 8px 12px; border-radius: 8px;
}
.back-btn:hover { background: rgba(13,148,136,0.08); }
.online-badge { color: #10b981; font-weight: 600; font-size: 16px; }
.offline-badge { color: #f59e0b; font-weight: 600; font-size: 16px; }

/* 体征卡片网格 */
.vitals-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;
}
.vital-card {
  background: #fff; border-radius: 16px; padding: 20px; display: flex; gap: 16px; align-items: center;
  box-shadow: 0 2px 12px rgba(13,148,136,0.06); border: 2px solid #f0fdfa; transition: all 0.3s;
}
.vital-card.danger { border-color: #fecaca; background: #fef2f2; }
.vital-card.warn { border-color: #fef08a; background: #fefce8; }
.vital-icon {
  width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: #0d9488; background: #f0fdfa; flex-shrink: 0;
}
.vital-info { flex: 1; }
.vital-value { font-size: 40px; font-weight: 700; color: #0f172a; line-height: 1.1; }
.vital-value-small { font-size: 18px; font-weight: 600; color: #0f172a; line-height: 1.2; word-break: break-all; }
.vital-unit { font-size: 20px; font-weight: 500; color: #94a3b8; }
.vital-label { font-size: 18px; color: #64748b; margin-top: 4px; }
.vital-status { font-size: 16px; color: #94a3b8; margin-top: 2px; display: flex; align-items: center; gap: 4px; }

/* 图表 */
.chart-section {
  background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(13,148,136,0.06);
}
.chart-section h3 { font-size: 22px; color: #0d9488; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px; }
.trend-chart { width: 100%; height: 320px; }

/* 告警列表 */
.alerts-section {
  background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(13,148,136,0.06);
}
.alerts-section h3 { font-size: 22px; color: #ef4444; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px; }
.alert-item {
  background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 12px 16px; margin-bottom: 8px;
}
.alert-top { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.alert-type { font-weight: 600; font-size: 17px; color: #1e293b; }
.alert-level { font-weight: 600; font-size: 15px; }
.alert-status { font-size: 14px; padding: 2px 8px; border-radius: 4px; }
.alert-status.PENDING { background: #fef3c7; color: #92400e; }
.alert-status.RESOLVED { background: #d1fae5; color: #065f46; }
.alert-status.CANCELLED { background: #e2e8f0; color: #64748b; }
.alert-desc { font-size: 16px; color: #475569; margin-bottom: 4px; }
.alert-time { font-size: 14px; color: #94a3b8; }

.empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
.empty-state p { font-size: 22px; margin: 0; }
.empty-state .hint { font-size: 18px; margin-top: 8px; }
</style>

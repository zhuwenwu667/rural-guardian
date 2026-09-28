<script setup>
import { ref, reactive, computed, h, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

// ---- Mock Data ----
const providerName = ref('张师傅')

const stats = reactive({
  total: 156,
  pending: 12,
  completed: 128,
  monthlyIncome: 23860,
})

const orders = ref([
  { id: 'WO-20260501', type: 'MEDICAL', elderlyName: '王奶奶', address: '幸福村3组12号', description: '定期血压测量与用药指导', status: 'CREATED', createdAt: '2026-05-13 09:30' },
  { id: 'WO-20260502', type: 'LIFE_CARE', elderlyName: '李大爷', address: '阳光社区B栋501', description: '协助日常起居及送餐服务', status: 'CREATED', createdAt: '2026-05-13 08:15' },
  { id: 'WO-20260503', type: 'COMPANION', elderlyName: '赵阿姨', address: '和谐家园2单元302', description: '陪同前往医院复查', status: 'CREATED', createdAt: '2026-05-12 16:45' },
  { id: 'WO-20260504', type: 'EMERGENCY', elderlyName: '孙爷爷', address: '青山村5组8号', description: '家中跌倒需紧急救助', status: 'IN_PROGRESS', createdAt: '2026-05-13 10:00' },
  { id: 'WO-20260505', type: 'MEDICAL', elderlyName: '周奶奶', address: '绿野花园A栋201', description: '更换胃管及健康评估', status: 'IN_PROGRESS', createdAt: '2026-05-13 07:50' },
  { id: 'WO-20260506', type: 'LIFE_CARE', elderlyName: '吴大爷', address: '康乐社区6栋103', description: '居家清洁与衣物换洗', status: 'IN_PROGRESS', createdAt: '2026-05-12 14:20' },
  { id: 'WO-20260507', type: 'COMPANION', elderlyName: '郑阿姨', address: '和平路88号', description: '陪诊及代购药品', status: 'COMPLETED', createdAt: '2026-05-11 09:00' },
  { id: 'WO-20260508', type: 'MEDICAL', elderlyName: '陈爷爷', address: '幸福村1组5号', description: '康复理疗及功能训练', status: 'COMPLETED', createdAt: '2026-05-11 08:30' },
  { id: 'WO-20260509', type: 'LIFE_CARE', elderlyName: '黄奶奶', address: '阳光社区C栋602', description: '助浴及个人护理', status: 'COMPLETED', createdAt: '2026-05-10 15:00' },
])

const typeMap = { MEDICAL: '医疗服务', LIFE_CARE: '生活照料', EMERGENCY: '紧急救援', COMPANION: '陪护服务', OTHER: '其他' }

const incomeData = ref([
  { month: '12月', value: 18200, percent: 76 },
  { month: '1月', value: 21500, percent: 90 },
  { month: '2月', value: 16800, percent: 70 },
  { month: '3月', value: 24300, percent: 100 },
  { month: '4月', value: 22100, percent: 91 },
  { month: '5月', value: 23860, percent: 98 },
])

const chartTicks = ['0', '6k', '12k', '18k', '24k']

const ratingInfo = reactive({
  score: 4.8,
  totalReviews: 326,
  breakdown: [
    { star: 5, count: 256, percent: 78 },
    { star: 4, count: 48, percent: 15 },
    { star: 3, count: 14, percent: 4 },
    { star: 2, count: 5, percent: 2 },
    { star: 1, count: 3, percent: 1 },
  ],
})

// ---- Stat Cards Config ----
const StatIconTotal = {
  render() {
    return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
      h('polyline', { points: '14 2 14 8 20 8' }),
      h('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
      h('line', { x1: '16', y1: '17', x2: '8', y2: '17' }),
    ])
  }
}
const StatIconPending = {
  render() {
    return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('polyline', { points: '12 6 12 12 16 14' }),
    ])
  }
}
const StatIconCompleted = {
  render() {
    return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      h('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
      h('polyline', { points: '22 4 12 14.01 9 11.01' }),
    ])
  }
}
const StatIconIncome = {
  render() {
    return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      h('line', { x1: '12', y1: '1', x2: '12', y2: '23' }),
      h('path', { d: 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' }),
    ])
  }
}

const statCards = computed(() => [
  {
    label: '总工单',
    value: stats.total,
    iconComponent: StatIconTotal,
    iconBg: 'linear-gradient(135deg, rgba(13,148,136,0.2), rgba(20,184,166,0.1))',
    glowColor: 'radial-gradient(circle at 80% 80%, rgba(13,148,136,0.15), transparent 70%)',
    trend: '+12%',
    trendDir: 'up',
  },
  {
    label: '进行中',
    value: stats.pending,
    iconComponent: StatIconPending,
    iconBg: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.1))',
    glowColor: 'radial-gradient(circle at 80% 80%, rgba(245,158,11,0.12), transparent 70%)',
    trend: '+3',
    trendDir: 'up',
  },
  {
    label: '已完成',
    value: stats.completed,
    iconComponent: StatIconCompleted,
    iconBg: 'linear-gradient(135deg, rgba(94,234,212,0.2), rgba(20,184,166,0.1))',
    glowColor: 'radial-gradient(circle at 80% 80%, rgba(94,234,212,0.12), transparent 70%)',
    trend: '+8%',
    trendDir: 'up',
  },
  {
    label: '本月收入',
    value: `¥${  stats.monthlyIncome.toLocaleString()}`,
    iconComponent: StatIconIncome,
    iconBg: 'linear-gradient(135deg, rgba(13,148,136,0.25), rgba(94,234,212,0.15))',
    glowColor: 'radial-gradient(circle at 80% 80%, rgba(13,148,136,0.18), transparent 70%)',
    trend: '+15%',
    trendDir: 'up',
  },
])

// ---- 初始加载 ----
onMounted(async () => {
  const res = await request.get('/orders/available?pageSize=5')
  if (res.code === 200) {

  }
})

// ---- Kanban ----
const kanbanColumns = [
  { key: 'CREATED', label: '待接单', color: '#0d9488', colorBg: 'rgba(13,148,136,0.1)' },
  { key: 'IN_PROGRESS', label: '进行中', color: '#f59e0b', colorBg: 'rgba(245,158,11,0.1)' },
  { key: 'COMPLETED', label: '已完成', color: '#5eead4', colorBg: 'rgba(94,234,212,0.1)' },
]

const draggedOrder = ref(null)
const dragOverKey = ref('')
const actionLoading = reactive({})

function getColumnOrders(key) {
  return orders.value.filter((o) => o.status === key)
}

function onDragStart(event, order) {
  draggedOrder.value = order
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', order.id)
}

function onDragEnd() {
  draggedOrder.value = null
  dragOverKey.value = ''
}

function onDragOver(event, key) {
  dragOverKey.value = key
  event.dataTransfer.dropEffect = 'move'
}

function onDragLeave(key) {
  if (dragOverKey.value === key) dragOverKey.value = ''
}

function onDrop(event, newStatus) {
  event.preventDefault()
  dragOverKey.value = ''
  if (!draggedOrder.value) return
  const order = draggedOrder.value
  if (order.status === newStatus) return

  const statusMap = { CREATED: '待接单', IN_PROGRESS: '进行中', COMPLETED: '已完成' }
  order.status = newStatus
  ElMessage.success(`工单 #${order.id} 已更新为「${statusMap[newStatus]}」`)
  draggedOrder.value = null
}

function handleAccept(order) {
  actionLoading[order.id] = true
  setTimeout(() => {
    order.status = 'IN_PROGRESS'
    actionLoading[order.id] = false
    ElMessage.success(`已接受工单 #${order.id}`)
  }, 600)
}

function handleComplete(order) {
  actionLoading[order.id] = true
  setTimeout(() => {
    order.status = 'COMPLETED'
    actionLoading[order.id] = false
    ElMessage.success(`工单 #${order.id} 已完成`)
  }, 600)
}
</script>

<template>
  <div class="provider-dashboard">
    <!-- Background decoration -->
    <div class="bg-orb bg-orb--1" />
    <div class="bg-orb bg-orb--2" />
    <div class="bg-orb bg-orb--3" />

    <!-- Page Header -->
    <header
      class="page-header animate-in"
      style="--delay: 0"
    >
      <div class="header-content">
        <div class="header-left">
          <div class="header-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <h1 class="header-title">
              服务商工作台
            </h1>
            <p class="header-subtitle">
              欢迎回来，{{ providerName }}。今日有 {{ stats.pending }} 个工单待处理。
            </p>
          </div>
        </div>
        <div class="header-right">
          <div class="header-badge">
            <span class="badge-dot" />
            在线服务中
          </div>
        </div>
      </div>
    </header>

    <!-- Bento Grid Layout -->
    <div class="bento-grid">
      <!-- Stat Cards -->
      <div
        v-for="(card, index) in statCards"
        :key="card.label"
        class="bento-cell bento-cell--stat animate-in"
        :style="{ '--delay': `${(index + 1) * 0.08}s` }"
      >
        <div class="glass-card glass-card--stat">
          <div class="stat-card-inner">
            <div
              class="stat-icon-wrap"
              :style="{ background: card.iconBg }"
            >
              <component :is="card.iconComponent" />
            </div>
            <div class="stat-info">
              <span class="stat-label">{{ card.label }}</span>
              <span class="stat-value">{{ card.value }}</span>
              <span
                class="stat-trend"
                :class="card.trendDir"
              >
                <svg
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  width="10"
                  height="10"
                >
                  <path
                    v-if="card.trendDir === 'up'"
                    d="M6 2l4 5H2z"
                  />
                  <path
                    v-else
                    d="M6 10l4-5H2z"
                  />
                </svg>
                {{ card.trend }}
              </span>
            </div>
          </div>
          <div
            class="stat-glow"
            :style="{ background: card.glowColor }"
          />
        </div>
      </div>

      <!-- Kanban Board - spans 3 columns -->
      <div
        class="bento-cell bento-cell--kanban animate-in"
        style="--delay: 0.35s"
      >
        <div class="glass-card glass-card--kanban">
          <div class="section-header">
            <h2 class="section-title">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="18"
                height="18"
              >
                <rect
                  x="3"
                  y="3"
                  width="7"
                  height="7"
                /><rect
                  x="14"
                  y="3"
                  width="7"
                  height="7"
                /><rect
                  x="3"
                  y="14"
                  width="7"
                  height="7"
                /><rect
                  x="14"
                  y="14"
                  width="7"
                  height="7"
                />
              </svg>
              工单看板
            </h2>
            <span class="section-badge">{{ orders.length }} 个工单</span>
          </div>
          <div class="kanban-board">
            <div
              v-for="col in kanbanColumns"
              :key="col.key"
              class="kanban-column"
              :class="{ 'drag-over': dragOverKey === col.key }"
              @dragover.prevent="onDragOver($event, col.key)"
              @dragleave="onDragLeave(col.key)"
              @drop="onDrop($event, col.key)"
            >
              <div class="column-header">
                <span
                  class="column-indicator"
                  :style="{ background: col.color }"
                />
                <span class="column-title">{{ col.label }}</span>
                <span
                  class="column-count"
                  :style="{ color: col.color, background: col.colorBg }"
                >{{ getColumnOrders(col.key).length }}</span>
              </div>
              <div class="column-body">
                <div
                  v-for="order in getColumnOrders(col.key)"
                  :key="order.id"
                  class="order-card"
                  :class="{ 'is-dragging': draggedOrder?.id === order.id }"
                  :style="{ '--accent': col.color }"
                  draggable="true"
                  @dragstart="onDragStart($event, order)"
                  @dragend="onDragEnd"
                >
                  <div class="order-card-top">
                    <span class="order-id">#{{ order.id }}</span>
                    <span
                      class="order-type-tag"
                      :style="{ background: col.colorBg, color: col.color }"
                    >{{ typeMap[order.type] || order.type }}</span>
                  </div>
                  <div class="order-card-body">
                    <div class="order-field">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        width="13"
                        height="13"
                      ><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
                        cx="12"
                        cy="7"
                        r="4"
                      /></svg>
                      <span>{{ order.elderlyName }}</span>
                    </div>
                    <div class="order-field">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        width="13"
                        height="13"
                      ><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle
                        cx="12"
                        cy="10"
                        r="3"
                      /></svg>
                      <span>{{ order.address }}</span>
                    </div>
                    <p class="order-desc">
                      {{ order.description }}
                    </p>
                  </div>
                  <div class="order-card-bottom">
                    <span class="order-time">{{ order.createdAt }}</span>
                    <div class="order-actions">
                      <el-button
                        v-if="order.status === 'CREATED'"
                        type="primary"
                        size="small"
                        round
                        :loading="actionLoading[order.id]"
                        @click.stop="handleAccept(order)"
                      >
                        接受工单
                      </el-button>
                      <el-button
                        v-if="order.status === 'IN_PROGRESS'"
                        type="success"
                        size="small"
                        round
                        :loading="actionLoading[order.id]"
                        @click.stop="handleComplete(order)"
                      >
                        完成工单
                      </el-button>
                    </div>
                  </div>
                </div>
                <div
                  v-if="getColumnOrders(col.key).length === 0"
                  class="column-empty"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    width="32"
                    height="32"
                    opacity="0.3"
                  ><rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                  /><line
                    x1="9"
                    y1="9"
                    x2="15"
                    y2="15"
                  /><line
                    x1="15"
                    y1="9"
                    x2="9"
                    y2="15"
                  /></svg>
                  <span>暂无工单</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Income Chart - spans 2 columns -->
      <div
        class="bento-cell bento-cell--chart animate-in"
        style="--delay: 0.45s"
      >
        <div class="glass-card glass-card--chart">
          <div class="section-header">
            <h2 class="section-title">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="18"
                height="18"
              >
                <line
                  x1="12"
                  y1="1"
                  x2="12"
                  y2="23"
                /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              收入趋势
            </h2>
            <span class="section-subtitle">近 6 个月</span>
          </div>
          <div class="css-chart">
            <div class="chart-y-axis">
              <span
                v-for="tick in chartTicks"
                :key="tick"
              >{{ tick }}</span>
            </div>
            <div class="chart-bars-wrap">
              <div class="chart-grid-lines">
                <div
                  v-for="i in 5"
                  :key="i"
                  class="chart-grid-line"
                />
              </div>
              <div class="chart-bars">
                <div
                  v-for="(bar, idx) in incomeData"
                  :key="idx"
                  class="chart-bar-group"
                >
                  <div class="chart-bar-tooltip">
                    {{ bar.value }} 元
                  </div>
                  <div class="chart-bar-track">
                    <div
                      class="chart-bar-fill"
                      :style="{ height: bar.percent + '%', '--bar-delay': idx * 0.1 + 's' }"
                    />
                  </div>
                  <span class="chart-bar-label">{{ bar.month }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Service Rating -->
      <div
        class="bento-cell bento-cell--rating animate-in"
        style="--delay: 0.55s"
      >
        <div class="glass-card glass-card--rating">
          <div class="section-header">
            <h2 class="section-title">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="18"
                height="18"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              服务评分
            </h2>
          </div>
          <div class="rating-main">
            <div class="rating-score-circle">
              <svg
                viewBox="0 0 120 120"
                class="score-ring"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="rgba(13,148,136,0.1)"
                  stroke-width="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="`${ratingInfo.score / 5 * 326.7} 326.7`"
                  class="score-ring-fill"
                />
                <defs>
                  <linearGradient
                    id="scoreGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      stop-color="#0d9488"
                    />
                    <stop
                      offset="100%"
                      stop-color="#5eead4"
                    />
                  </linearGradient>
                </defs>
              </svg>
              <div class="score-number">
                {{ ratingInfo.score }}
              </div>
            </div>
            <div class="rating-details">
              <div class="rating-stars">
                <svg
                  v-for="i in 5"
                  :key="i"
                  viewBox="0 0 20 20"
                  width="20"
                  height="20"
                  class="star-icon"
                  :class="{ 'star-filled': i <= Math.round(ratingInfo.score) }"
                >
                  <polygon points="10 1 12.5 7 19 7.5 14 12 15.5 19 10 15.5 4.5 19 6 12 1 7.5 7.5 7" />
                </svg>
              </div>
              <span class="rating-count">共 {{ ratingInfo.totalReviews }} 条评价</span>
            </div>
          </div>
          <div class="rating-breakdown">
            <div
              v-for="item in ratingInfo.breakdown"
              :key="item.star"
              class="rating-row"
            >
              <span class="rating-row-label">{{ item.star }} 星</span>
              <div class="rating-row-bar">
                <div
                  class="rating-row-fill"
                  :style="{ width: item.percent + '%' }"
                />
              </div>
              <span class="rating-row-count">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========================================
   CSS Variables & Reset
   ======================================== */
.provider-dashboard {
  --teal-600: #0d9488;
  --teal-500: #14b8a6;
  --teal-300: #5eead4;
  --teal-100: #ccfbf1;
  --teal-50: #f0fdfa;
  --bg-base: #f0fdfa;
  --bg-card: rgba(255, 255, 255, 0.55);
  --bg-card-hover: rgba(255, 255, 255, 0.7);
  --border-glass: rgba(13, 148, 136, 0.12);
  --text-primary: #134e4a;
  --text-secondary: #5f7a78;
  --text-muted: #94a3b8;
  --shadow-sm: 0 1px 3px rgba(13, 148, 136, 0.06);
  --shadow-md: 0 4px 16px rgba(13, 148, 136, 0.08);
  --shadow-lg: 0 8px 32px rgba(13, 148, 136, 0.1);
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;

  position: relative;
  min-height: 100vh;
  padding: 24px 32px 48px;
  overflow-x: hidden;
  background: var(--bg-base);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* ========================================
   Background Orbs
   ======================================== */
.bg-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}
.bg-orb--1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(13,148,136,0.3), transparent 70%);
  top: -120px; right: -100px;
}
.bg-orb--2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(94,234,212,0.25), transparent 70%);
  bottom: -80px; left: -60px;
}
.bg-orb--3 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(20,184,166,0.2), transparent 70%);
  top: 40%; left: 50%;
  transform: translate(-50%, -50%);
}

/* ========================================
   Animations
   ======================================== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  opacity: 0;
  animation: fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--delay, 0s);
}

/* ========================================
   Page Header
   ======================================== */
.page-header {
  position: relative;
  z-index: 1;
  margin-bottom: 28px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--teal-600), var(--teal-500));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.3);
}

.header-icon svg {
  width: 24px;
  height: 24px;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.5px;
}

.header-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 4px 0 0;
}

.header-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.15);
  font-size: 13px;
  font-weight: 500;
  color: var(--teal-600);
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--teal-500);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* ========================================
   Glass Card Base
   ======================================== */
.glass-card {
  position: relative;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: background 0.3s, box-shadow 0.3s;
}

.glass-card:hover {
  background: var(--bg-card-hover);
  box-shadow: var(--shadow-lg);
}

/* ========================================
   Bento Grid
   ======================================== */
.bento-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(0, auto);
  gap: 20px;
}

.bento-cell--stat:nth-child(1) { grid-column: span 1; }
.bento-cell--stat:nth-child(2) { grid-column: span 1; }
.bento-cell--stat:nth-child(3) { grid-column: span 1; }
.bento-cell--stat:nth-child(4) { grid-column: span 1; }
.bento-cell--kanban { grid-column: span 4; }
.bento-cell--chart { grid-column: span 2; }
.bento-cell--rating { grid-column: span 2; }

/* ========================================
   Stat Cards
   ======================================== */
.glass-card--stat {
  padding: 24px;
}

.stat-card-inner {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--teal-600);
}

.stat-icon-wrap svg {
  width: 22px;
  height: 22px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -1px;
  line-height: 1.1;
}

.stat-trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 600;
  color: var(--teal-600);
  background: rgba(13, 148, 136, 0.08);
  padding: 2px 8px;
  border-radius: 999px;
  width: fit-content;
}

.stat-trend.down {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.stat-glow {
  position: absolute;
  bottom: -20px;
  right: -20px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

/* ========================================
   Section Header
   ======================================== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.section-title svg {
  color: var(--teal-600);
}

.section-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--teal-600);
  background: rgba(13, 148, 136, 0.08);
  padding: 4px 12px;
  border-radius: 999px;
}

.section-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

/* ========================================
   Kanban Board
   ======================================== */
.glass-card--kanban {
  padding-bottom: 20px;
}

.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 20px 24px;
}

.kanban-column {
  background: rgba(255, 255, 255, 0.35);
  border-radius: var(--radius-md);
  border: 1px solid rgba(13, 148, 136, 0.06);
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s, background 0.2s;
  min-height: 360px;
}

.kanban-column.drag-over {
  border-color: var(--teal-500);
  border-style: dashed;
  background: rgba(13, 148, 136, 0.04);
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(13, 148, 136, 0.06);
}

.column-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.column-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
}

.column-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 0;
  color: var(--text-muted);
  font-size: 13px;
}

/* ========================================
   Order Card
   ======================================== */
.order-card {
  background: rgba(255, 255, 255, 0.75);
  border-radius: var(--radius-sm);
  padding: 14px;
  border: 1px solid rgba(13, 148, 136, 0.08);
  border-left: 3px solid var(--accent, var(--teal-500));
  cursor: grab;
  transition: box-shadow 0.2s, transform 0.2s, opacity 0.2s;
}

.order-card:hover {
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.1);
  transform: translateY(-1px);
}

.order-card.is-dragging {
  opacity: 0.4;
  transform: rotate(2deg);
}

.order-card:active {
  cursor: grabbing;
}

.order-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.order-id {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.order-type-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}

.order-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.order-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.order-field svg {
  color: var(--text-muted);
  flex-shrink: 0;
}

.order-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 2px 0 0;
}

.order-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid rgba(13, 148, 136, 0.06);
}

.order-time {
  font-size: 11px;
  color: var(--text-muted);
}

.order-actions :deep(.el-button) {
  font-size: 12px;
  padding: 5px 14px;
}

/* ========================================
   Income Chart (Pure CSS)
   ======================================== */
.glass-card--chart {
  padding-bottom: 24px;
}

.css-chart {
  display: flex;
  gap: 0;
  padding: 20px 24px 0;
  height: 260px;
}

.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 28px;
  padding-right: 12px;
  flex-shrink: 0;
}

.chart-y-axis span {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
  min-width: 32px;
}

.chart-bars-wrap {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.chart-grid-lines {
  position: absolute;
  inset: 0;
  bottom: 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.chart-grid-line {
  height: 1px;
  background: rgba(13, 148, 136, 0.06);
}

.chart-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding-bottom: 28px;
  position: relative;
  z-index: 1;
}

.chart-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  position: relative;
}

.chart-bar-tooltip {
  position: absolute;
  top: -8px;
  transform: translateY(-100%);
  font-size: 11px;
  font-weight: 700;
  color: var(--teal-600);
  background: rgba(13, 148, 136, 0.08);
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.chart-bar-group:hover .chart-bar-tooltip {
  opacity: 1;
}

.chart-bar-track {
  width: 100%;
  max-width: 48px;
  height: calc(100% - 28px);
  background: rgba(13, 148, 136, 0.06);
  border-radius: 8px 8px 4px 4px;
  overflow: hidden;
  position: relative;
}

.chart-bar-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, var(--teal-500), var(--teal-600));
  border-radius: 8px 8px 4px 4px;
  animation: barGrow 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--bar-delay, 0s);
  transform-origin: bottom;
  transform: scaleY(0);
}

@keyframes barGrow {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

.chart-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.25), transparent);
  border-radius: 8px 8px 0 0;
}

.chart-bar-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
  font-weight: 500;
}

/* ========================================
   Service Rating
   ======================================== */
.glass-card--rating {
  padding-bottom: 24px;
}

.rating-main {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 24px;
}

.rating-score-circle {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.score-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-ring-fill {
  transition: stroke-dasharray 1s cubic-bezier(0.22, 1, 0.36, 1);
}

.score-number {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -1px;
}

.rating-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rating-stars {
  display: flex;
  gap: 3px;
}

.star-icon {
  color: #e2e8f0;
  transition: color 0.2s;
}

.star-filled {
  color: #f59e0b;
  fill: #f59e0b;
}

.rating-count {
  font-size: 13px;
  color: var(--text-muted);
}

.rating-breakdown {
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rating-row-label {
  font-size: 12px;
  color: var(--text-secondary);
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.rating-row-bar {
  flex: 1;
  height: 6px;
  background: rgba(13, 148, 136, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.rating-row-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--teal-600), var(--teal-300));
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

.rating-row-count {
  font-size: 12px;
  color: var(--text-muted);
  width: 28px;
  text-align: right;
  flex-shrink: 0;
}

/* ========================================
   Responsive
   ======================================== */
@media (max-width: 1200px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .bento-cell--stat:nth-child(4) { grid-column: span 2; }
  .bento-cell--kanban { grid-column: span 2; }
  .bento-cell--chart { grid-column: span 2; }
  .bento-cell--rating { grid-column: span 2; }
}

@media (max-width: 768px) {
  .provider-dashboard {
    padding: 16px;
  }
  .bento-grid {
    grid-template-columns: 1fr;
  }
  .bento-cell--stat:nth-child(4) { grid-column: span 1; }
  .bento-cell--kanban { grid-column: span 1; }
  .bento-cell--chart { grid-column: span 1; }
  .bento-cell--rating { grid-column: span 1; }
  .kanban-board {
    grid-template-columns: 1fr;
  }
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import {
  User, Bell, Warning, Document, List, Clock,
  Operation, Top, Bottom, TrendCharts,
  Plus, Phone, Location, ChatDotRound, Setting
} from '@element-plus/icons-vue'
import request from '../../api/request'

const router = useRouter()

// ==================== Refs ====================
const trendRef = ref(null)

// ==================== Loading ====================
const alertsLoading = ref(false)
const ordersLoading = ref(false)
const processLoading = ref(false)

// ==================== 当前日期 ====================
const currentDate = computed(() => {
  const now = new Date()
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${days[now.getDay()]}`
})

// ==================== 统计卡片 Mock 数据 ====================
const statCards = ref([
  {
    key: 'elderly',
    label: '本村老人总数',
    value: 186,
    icon: 'User',
    trend: '+3',
    trendDir: 'up',
    action: () => router.push('/village/elderly')
  },
  {
    key: 'alert',
    label: '今日预警',
    value: 7,
    icon: 'Bell',
    trend: '-2',
    trendDir: 'down',
    action: () => {}
  },
  {
    key: 'order',
    label: '待处理工单',
    value: 12,
    icon: 'Document',
    trend: '+5',
    trendDir: 'up',
    action: () => {}
  },
  {
    key: 'service',
    label: '本月服务次数',
    value: 89,
    icon: 'Warning',
    trend: '+15%',
    trendDir: 'up',
    action: () => {}
  }
])

// ==================== 看板数据 ====================
const kanbanColumns = ref([
  {
    key: 'pending',
    title: '待处理',
    color: '#f59e0b',
    items: [
      { id: 1, elderlyName: '王大爷', typeLabel: '跌倒预警', tagType: 'danger', priority: 'critical', description: '设备检测到跌倒，已自动触发SOS', time: '5分钟前' },
      { id: 2, elderlyName: '李奶奶', typeLabel: '健康异常', tagType: 'warning', priority: 'high', description: '心率异常偏高，持续30分钟', time: '23分钟前' },
      { id: 3, elderlyName: '张爷爷', typeLabel: '设备离线', tagType: 'info', priority: 'medium', description: '智能手环超过2小时未上报数据', time: '1小时前' },
      { id: 4, elderlyName: '赵阿姨', typeLabel: '越界提醒', tagType: 'warning', priority: 'high', description: '超出安全活动范围500米', time: '2小时前' }
    ]
  },
  {
    key: 'processing',
    title: '进行中',
    color: '#0d9488',
    items: [
      { id: 5, elderlyName: '陈奶奶', typeLabel: '生活照料', tagType: '', priority: 'medium', description: '上门送药服务已安排志愿者', time: '30分钟前' },
      { id: 6, elderlyName: '刘爷爷', typeLabel: '陪护服务', tagType: '', priority: 'low', description: '每周例行健康检查陪护', time: '1小时前' }
    ]
  },
  {
    key: 'completed',
    title: '已完成',
    color: '#10b981',
    items: [
      { id: 7, elderlyName: '孙大爷', typeLabel: '医疗救助', tagType: 'success', priority: 'critical', description: '突发高血压已送医，目前稳定', time: '昨天 14:30' },
      { id: 8, elderlyName: '周奶奶', typeLabel: '设备维修', tagType: 'success', priority: 'low', description: '烟雾报警器已更换电池', time: '昨天 10:15' },
      { id: 9, elderlyName: '吴爷爷', typeLabel: '紧急救援', tagType: 'success', priority: 'high', description: '家中摔倒已协助就医', time: '前天 09:00' }
    ]
  }
])

const totalTasks = computed(() => kanbanColumns.value.reduce((sum, col) => sum + col.items.length, 0))

// ==================== 最近预警 Mock 数据 ====================
const recentAlerts = ref([
  { id: 1, elderlyName: '王大爷', level: 'CRITICAL', levelLabel: '紧急', description: '设备检测到跌倒，已自动触发SOS', time: '5分钟前' },
  { id: 2, elderlyName: '李奶奶', level: 'HIGH', levelLabel: '高', description: '心率异常偏高，持续30分钟', time: '23分钟前' },
  { id: 3, elderlyName: '赵阿姨', level: 'HIGH', levelLabel: '高', description: '超出安全活动范围500米', time: '2小时前' },
  { id: 4, elderlyName: '张爷爷', level: 'MEDIUM', levelLabel: '中', description: '智能手环超过2小时未上报数据', time: '3小时前' },
  { id: 5, elderlyName: '钱奶奶', level: 'LOW', levelLabel: '低', description: '每日健康数据未按时上传', time: '5小时前' }
])

// ==================== 快捷操作 ====================
const quickActions = ref([
  { label: '新增工单', icon: 'Plus', bg: 'rgba(13,148,136,0.15)', iconColor: '#0d9488', handler: () => ElMessage.info('新增工单功能开发中') },
  { label: '紧急呼叫', icon: 'Phone', bg: 'rgba(239,68,68,0.15)', iconColor: '#ef4444', handler: () => ElMessage.info('紧急呼叫功能开发中') },
  { label: '位置查询', icon: 'Location', bg: 'rgba(59,130,246,0.15)', iconColor: '#3b82f6', handler: () => ElMessage.info('位置查询功能开发中') },
  { label: '消息通知', icon: 'ChatDotRound', bg: 'rgba(168,85,247,0.15)', iconColor: '#a855f7', handler: () => ElMessage.info('消息通知功能开发中') },
  { label: '系统设置', icon: 'Setting', bg: 'rgba(107,114,128,0.15)', iconColor: '#6b7280', handler: () => ElMessage.info('系统设置功能开发中') }
])

// ==================== 预警趋势 ====================
const trendPeriod = ref('week')

// ==================== 处理对话框 ====================
const processDialogVisible = ref(false)
const processForm = reactive({ id: null, status: 'PROCESSING', description: '' })

function openProcessDialog(task) {
  processForm.id = task.id
  processForm.status = 'PROCESSING'
  processForm.description = ''
  processDialogVisible.value = true
}

function completeTask(task) {
  ElMessage.success(`任务 ${task.id} 已标记完成`)
}

async function submitProcess() {
  processLoading.value = true
  try {
    const res = await request.get('/dashboard/village-stats')
    if (res.code === 200) {

    }
    ElMessage.success('处理成功')
    processDialogVisible.value = false
  } catch (err) {
    console.error(err)
  } finally {
    processLoading.value = false
  }
}

function alertLevelTagType(level) {
  const map = { LOW: 'info', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger' }
  return map[level] || 'info'
}

// ==================== 图表 ====================
let trendChart = null

function renderTrendChart() {
  if (!trendRef.value) return
  if (trendChart) trendChart.dispose()

  trendChart = echarts.init(trendRef.value)
  const days = trendPeriod.value === 'week'
    ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    : ['第1周', '第2周', '第3周', '第4周']
  const data = trendPeriod.value === 'week'
    ? [3, 5, 2, 7, 4, 6, 3]
    : [18, 25, 22, 15]

  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: 'rgba(13,148,136,0.2)',
      textStyle: { color: '#334155', fontSize: 13 },
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(13,148,136,0.06)' } }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#94a3b8', fontSize: 12 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 12 },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
    },
    series: [{
      name: '预警次数',
      type: 'bar',
      data: data,
      barWidth: trendPeriod.value === 'week' ? 24 : 36,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#14b8a6' },
          { offset: 1, color: '#5eead4' }
        ])
      },
      emphasis: {
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#0d9488' },
            { offset: 1, color: '#14b8a6' }
          ])
        }
      }
    }]
  })
}

function handleResize() {
  trendChart && trendChart.resize()
}

// ==================== 生命周期 ====================
onMounted(() => {
  nextTick(() => {
    renderTrendChart()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (trendChart) {
    trendChart.dispose()
    trendChart = null
  }
})
</script>

<template>
  <div class="dashboard-page">
    <!-- 背景装饰 -->
    <div class="bg-decor">
      <div class="bg-blob bg-blob-1" />
      <div class="bg-blob bg-blob-2" />
      <div class="bg-blob bg-blob-3" />
    </div>

    <!-- 页面标题 -->
    <div class="page-header animate-fade-in-up">
      <div class="page-header-left">
        <h1 class="page-title">
          村级专员工作台
        </h1>
        <p class="page-subtitle">
          {{ currentDate }}
        </p>
      </div>
      <div class="page-header-right">
        <el-avatar
          :size="40"
          class="header-avatar"
        >
          <el-icon :size="20">
            <User />
          </el-icon>
        </el-avatar>
        <span class="header-username">张专员</span>
      </div>
    </div>

    <!-- Bento Grid 主布局 -->
    <div class="bento-grid">
      <!-- 统计卡片区域 - 跨4列 -->
      <div
        v-for="(card, index) in statCards"
        :key="card.key"
        class="bento-item bento-stat"
        :style="{ '--delay': index * 0.08 + 's' }"
        @click="card.action"
      >
        <div
          class="glass-card stat-card"
          :class="'stat-card--' + card.key"
        >
          <div class="stat-card__icon-wrap">
            <el-icon :size="28">
              <component :is="card.icon" />
            </el-icon>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ card.value }}</span>
            <span class="stat-card__label">{{ card.label }}</span>
          </div>
          <div
            class="stat-card__trend"
            :class="card.trendDir"
          >
            <el-icon :size="14">
              <component :is="card.trendDir === 'up' ? 'Top' : 'Bottom'" />
            </el-icon>
            <span>{{ card.trend }}</span>
          </div>
        </div>
      </div>

      <!-- 待办任务看板 - 跨3列 -->
      <div
        class="bento-item bento-kanban"
        style="--delay: 0.32s"
      >
        <div class="glass-card kanban-card">
          <div class="card-section-header">
            <h3 class="card-section-title">
              <el-icon><List /></el-icon>
              待办任务看板
            </h3>
            <el-tag
              effect="dark"
              round
              size="small"
              class="teal-tag"
            >
              {{ totalTasks }} 项
            </el-tag>
          </div>
          <div class="kanban-board">
            <div
              v-for="col in kanbanColumns"
              :key="col.key"
              class="kanban-column"
            >
              <div class="kanban-column__header">
                <span
                  class="kanban-column__dot"
                  :style="{ background: col.color }"
                />
                <span class="kanban-column__title">{{ col.title }}</span>
                <span class="kanban-column__count">{{ col.items.length }}</span>
              </div>
              <div class="kanban-column__body">
                <div
                  v-for="task in col.items"
                  :key="task.id"
                  class="kanban-task glass-card-inner"
                  :class="'priority-' + task.priority"
                >
                  <div class="kanban-task__header">
                    <span class="kanban-task__name">{{ task.elderlyName }}</span>
                    <el-tag
                      size="small"
                      :type="task.tagType"
                      effect="plain"
                      round
                    >
                      {{ task.typeLabel }}
                    </el-tag>
                  </div>
                  <p class="kanban-task__desc">
                    {{ task.description }}
                  </p>
                  <div class="kanban-task__footer">
                    <span class="kanban-task__time">
                      <el-icon :size="12"><Clock /></el-icon>
                      {{ task.time }}
                    </span>
                    <el-button
                      v-if="col.key === 'pending'"
                      type="primary"
                      size="small"
                      round
                      @click="openProcessDialog(task)"
                    >
                      处理
                    </el-button>
                    <el-button
                      v-else-if="col.key === 'processing'"
                      type="success"
                      size="small"
                      round
                      plain
                      @click="completeTask(task)"
                    >
                      完成
                    </el-button>
                    <el-button
                      v-else
                      type="info"
                      size="small"
                      round
                      text
                    >
                      详情
                    </el-button>
                  </div>
                </div>
                <div
                  v-if="col.items.length === 0"
                  class="kanban-column__empty"
                >
                  暂无任务
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 - 跨1列 -->
      <div
        class="bento-item bento-actions"
        style="--delay: 0.40s"
      >
        <div class="glass-card actions-card">
          <div class="card-section-header">
            <h3 class="card-section-title">
              <el-icon><Operation /></el-icon>
              快捷操作
            </h3>
          </div>
          <div class="action-buttons">
            <div
              v-for="action in quickActions"
              :key="action.label"
              class="action-btn glass-card-inner"
              @click="action.handler"
            >
              <div
                class="action-btn__icon"
                :style="{ background: action.bg }"
              >
                <el-icon
                  :size="22"
                  :style="{ color: action.iconColor }"
                >
                  <component :is="action.icon" />
                </el-icon>
              </div>
              <span class="action-btn__label">{{ action.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近预警列表 - 跨2列 -->
      <div
        class="bento-item bento-alerts"
        style="--delay: 0.48s"
      >
        <div class="glass-card alerts-card">
          <div class="card-section-header">
            <h3 class="card-section-title">
              <el-icon><Bell /></el-icon>
              最近预警
            </h3>
            <el-button
              type="primary"
              text
              size="small"
              round
            >
              查看全部
            </el-button>
          </div>
          <div class="alerts-list">
            <div
              v-for="alert in recentAlerts"
              :key="alert.id"
              class="alert-item"
              :class="'alert-level--' + alert.level.toLowerCase()"
            >
              <div class="alert-item__indicator" />
              <div class="alert-item__content">
                <div class="alert-item__top">
                  <span class="alert-item__name">{{ alert.elderlyName }}</span>
                  <el-tag
                    :type="alertLevelTagType(alert.level)"
                    size="small"
                    effect="dark"
                    round
                  >
                    {{ alert.levelLabel }}
                  </el-tag>
                </div>
                <p class="alert-item__desc">
                  {{ alert.description }}
                </p>
                <span class="alert-item__time">{{ alert.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 预警趋势图表 - 跨2列 -->
      <div
        class="bento-item bento-trend"
        style="--delay: 0.56s"
      >
        <div class="glass-card trend-card">
          <div class="card-section-header">
            <h3 class="card-section-title">
              <el-icon><TrendCharts /></el-icon>
              预警趋势
            </h3>
            <div class="trend-tabs">
              <el-radio-group
                v-model="trendPeriod"
                size="small"
              >
                <el-radio-button value="week">
                  本周
                </el-radio-button>
                <el-radio-button value="month">
                  本月
                </el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div class="trend-chart-wrap">
            <div
              ref="trendRef"
              class="trend-chart"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 处理预警对话框 -->
    <el-dialog
      v-model="processDialogVisible"
      title="处理预警"
      width="520px"
      destroy-on-close
      class="process-dialog"
      align-center
    >
      <el-form
        :model="processForm"
        label-width="100px"
        label-position="top"
      >
        <el-form-item label="处理状态">
          <el-select
            v-model="processForm.status"
            style="width: 100%"
            placeholder="请选择处理状态"
          >
            <el-option
              label="处理中"
              value="PROCESSING"
            />
            <el-option
              label="已解决"
              value="RESOLVED"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="处理说明">
          <el-input
            v-model="processForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入处理说明..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button
          round
          @click="processDialogVisible = false"
        >
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="processLoading"
          round
          @click="submitProcess"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* ==================== 基础变量 ==================== */
:root {
  --teal-600: #0d9488;
  --teal-500: #14b8a6;
  --teal-400: #2dd4bf;
  --teal-300: #5eead4;
  --teal-100: #ccfbf1;
  --teal-50: #f0fdfa;
}

/* ==================== 页面容器 ==================== */
.dashboard-page {
  position: relative;
  min-height: 100vh;
  padding: 28px 32px 40px;
  overflow-x: hidden;
  background: linear-gradient(160deg, #f0fdfa 0%, #f8fafc 40%, #f0f9ff 100%);
}

/* ==================== 背景装饰 ==================== */
.bg-decor {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
}

.bg-blob-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(13,148,136,0.3), transparent 70%);
  top: -120px;
  right: -80px;
}

.bg-blob-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(94,234,212,0.25), transparent 70%);
  bottom: -100px;
  left: -60px;
}

.bg-blob-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(20,184,166,0.2), transparent 70%);
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
}

/* ==================== 入场动画 ==================== */
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

.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.bento-item {
  opacity: 0;
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--delay, 0s);
}

/* ==================== 页面标题 ==================== */
.page-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.page-title {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
  font-weight: 400;
}

.page-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-avatar {
  background: linear-gradient(135deg, var(--teal-500), var(--teal-300));
  color: #fff;
}

.header-username {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

/* ==================== Glass Card 毛玻璃效果 ==================== */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 18px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}

.glass-card:hover {
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.06),
    0 2px 4px rgba(0, 0, 0, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.glass-card-inner {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.glass-card-inner:hover {
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

/* ==================== Bento Grid 布局 ==================== */
.bento-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: auto;
  gap: 20px;
}

.bento-stat {
  grid-column: span 1;
}

.bento-kanban {
  grid-column: span 3;
}

.bento-actions {
  grid-column: span 1;
}

.bento-alerts {
  grid-column: span 2;
}

.bento-trend {
  grid-column: span 2;
}

/* ==================== 统计卡片 ==================== */
.stat-card {
  padding: 22px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-3px);
}

.stat-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  opacity: 0.08;
  pointer-events: none;
}

.stat-card--elderly::after { background: var(--teal-500); }
.stat-card--alert::after { background: #f59e0b; }
.stat-card--order::after { background: #3b82f6; }
.stat-card--service::after { background: #a855f7; }

.stat-card__icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card--elderly .stat-card__icon-wrap {
  background: linear-gradient(135deg, rgba(13,148,136,0.15), rgba(94,234,212,0.15));
  color: var(--teal-600);
}

.stat-card--alert .stat-card__icon-wrap {
  background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.15));
  color: #d97706;
}

.stat-card--order .stat-card__icon-wrap {
  background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(96,165,250,0.15));
  color: #2563eb;
}

.stat-card--service .stat-card__icon-wrap {
  background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(192,132,252,0.15));
  color: #9333ea;
}

.stat-card__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
  letter-spacing: -0.5px;
}

.stat-card__label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.stat-card__trend {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  flex-shrink: 0;
}

.stat-card__trend.up {
  color: #059669;
  background: rgba(16,185,129,0.1);
}

.stat-card__trend.down {
  color: #dc2626;
  background: rgba(239,68,68,0.1);
}

/* ==================== 通用 Section Header ==================== */
.card-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.card-section-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-section-title .el-icon {
  color: var(--teal-500);
}

.teal-tag {
  background: linear-gradient(135deg, var(--teal-600), var(--teal-400)) !important;
  border: none !important;
}

/* ==================== 看板 ==================== */
.kanban-card {
  padding: 22px;
}

.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.kanban-column__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}

.kanban-column__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.kanban-column__title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.kanban-column__count {
  font-size: 12px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 500;
  margin-left: auto;
}

.kanban-column__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 80px;
}

.kanban-column__empty {
  text-align: center;
  color: #cbd5e1;
  font-size: 13px;
  padding: 24px 0;
}

/* ==================== 看板任务卡片 ==================== */
.kanban-task {
  padding: 14px;
  border-left: 3px solid transparent;
}

.kanban-task.priority-critical {
  border-left-color: #ef4444;
}

.kanban-task.priority-high {
  border-left-color: #f59e0b;
}

.kanban-task.priority-medium {
  border-left-color: var(--teal-500);
}

.kanban-task.priority-low {
  border-left-color: #94a3b8;
}

.kanban-task__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.kanban-task__name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.kanban-task__desc {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.kanban-task__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kanban-task__time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
}

/* ==================== 快捷操作 ==================== */
.actions-card {
  padding: 22px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.action-btn:hover {
  transform: translateX(4px);
}

.action-btn__icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-btn__label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

/* ==================== 预警列表 ==================== */
.alerts-card {
  padding: 22px;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  display: flex;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.4);
  border: 1px solid rgba(0,0,0,0.03);
  transition: background 0.2s ease, transform 0.2s ease;
  cursor: pointer;
}

.alert-item:hover {
  background: rgba(255,255,255,0.7);
  transform: translateX(3px);
}

.alert-item__indicator {
  width: 4px;
  border-radius: 4px;
  flex-shrink: 0;
}

.alert-level--critical .alert-item__indicator { background: #ef4444; }
.alert-level--high .alert-item__indicator { background: #f59e0b; }
.alert-level--medium .alert-item__indicator { background: var(--teal-500); }
.alert-level--low .alert-item__indicator { background: #94a3b8; }

.alert-item__content {
  flex: 1;
  min-width: 0;
}

.alert-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.alert-item__name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.alert-item__desc {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-item__time {
  font-size: 11px;
  color: #94a3b8;
}

/* ==================== 趋势图表 ==================== */
.trend-card {
  padding: 22px;
}

.trend-tabs :deep(.el-radio-button__inner) {
  font-size: 12px;
}

.trend-chart-wrap {
  height: 240px;
}

.trend-chart {
  width: 100%;
  height: 100%;
}

/* ==================== 对话框样式 ==================== */
.process-dialog :deep(.el-dialog) {
  border-radius: 18px;
  overflow: hidden;
}

.process-dialog :deep(.el-dialog__header) {
  padding: 20px 24px 0;
  margin-right: 0;
}

.process-dialog :deep(.el-dialog__title) {
  font-weight: 700;
  font-size: 16px;
  color: #0f172a;
}

.process-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
}

.process-dialog :deep(.el-dialog__footer) {
  padding: 0 24px 20px;
}

/* ==================== Element Plus 覆盖 ==================== */
:deep(.el-button--primary) {
  --el-button-bg-color: var(--teal-600);
  --el-button-border-color: var(--teal-600);
  --el-button-hover-bg-color: var(--teal-500);
  --el-button-hover-border-color: var(--teal-500);
  --el-button-active-bg-color: #0f766e;
  --el-button-active-border-color: #0f766e;
}

:deep(.el-tag--dark) {
  border: none;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: var(--teal-600);
  border-color: var(--teal-600);
  box-shadow: -1px 0 0 0 var(--teal-600);
}

/* ==================== 响应式 ==================== */
@media (max-width: 1200px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .bento-stat:nth-child(1) { grid-column: span 1; }
  .bento-stat:nth-child(2) { grid-column: span 1; }
  .bento-stat:nth-child(3) { grid-column: span 1; }
  .bento-stat:nth-child(4) { grid-column: span 1; }
  .bento-kanban { grid-column: span 2; }
  .bento-actions { grid-column: span 2; }
  .bento-alerts { grid-column: span 2; }
  .bento-trend { grid-column: span 2; }
}

@media (max-width: 900px) {
  .dashboard-page {
    padding: 20px 16px 32px;
  }

  .bento-grid {
    grid-template-columns: 1fr;
  }

  .bento-stat,
  .bento-kanban,
  .bento-actions,
  .bento-alerts,
  .bento-trend {
    grid-column: span 1;
  }

  .kanban-board {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 18px 16px;
  }

  .stat-card__value {
    font-size: 24px;
  }

  .page-title {
    font-size: 22px;
  }
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .action-buttons {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .action-btn {
    flex: 1;
    min-width: calc(50% - 5px);
  }
}
</style>

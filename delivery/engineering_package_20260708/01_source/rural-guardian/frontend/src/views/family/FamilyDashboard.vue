<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()

// ---- 对话框状态 ----
const bindDialogVisible = ref(false)
const sosDialogVisible = ref(false)
const bindLoading = ref(false)
const bindFormRef = ref(null)
const elderlyOptions = ref([])

const bindForm = reactive({ elderlyId: null, relationship: '', phone: '' })
const bindFormRules = {
  elderlyId: [{ required: true, message: '请选择老人', trigger: 'change' }],
  relationship: [{ required: true, message: '请选择与老人的关系', trigger: 'change' }],
}

// ---- 当前日期 ----
const currentDate = computed(() => {
  const d = new Date()
  const weekMap = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekMap[d.getDay()]}`
})

// ==================== Mock 数据 ====================

const elderlyList = ref([
  {
    id: 1,
    name: '王秀兰',
    age: 78,
    gender: '女',
    phone: '138****6721',
    relationship: '母亲',
    address: '幸福村 3组 12号',
    healthStatus: 'good',
    healthLabel: '健康状况良好',
    deviceOnline: true,
    avatarBg: 'linear-gradient(135deg, #0d9488, #14b8a6)',
  },
  {
    id: 2,
    name: '李建国',
    age: 82,
    gender: '男',
    phone: '139****3345',
    relationship: '父亲',
    address: '和平村 1组 8号',
    healthStatus: 'warning',
    healthLabel: '血压偏高，需关注',
    deviceOnline: true,
    avatarBg: 'linear-gradient(135deg, #0891b2, #06b6d4)',
  },
])

const healthMetrics = ref([
  {
    label: '心率',
    value: '72',
    unit: 'bpm',
    percent: 72,
    color: '#ef4444',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    status: '正常',
    statusClass: 'normal',
    iconPath: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  },
  {
    label: '血压',
    value: '135/86',
    unit: 'mmHg',
    percent: 68,
    color: '#f59e0b',
    iconBg: 'rgba(245, 158, 11, 0.12)',
    status: '偏高',
    statusClass: 'warning',
    iconPath: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  },
  {
    label: '今日步数',
    value: '3,286',
    unit: '步',
    percent: 55,
    color: '#0d9488',
    iconBg: 'rgba(13, 148, 136, 0.12)',
    status: '达标',
    statusClass: 'normal',
    iconPath: '<circle cx="12" cy="5" r="1"/><path d="M9 20h6"/><path d="M12 6v14"/>',
  },
  {
    label: '睡眠时长',
    value: '6.5',
    unit: '小时',
    percent: 81,
    color: '#8b5cf6',
    iconBg: 'rgba(139, 92, 246, 0.12)',
    status: '偏少',
    statusClass: 'warning',
    iconPath: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  },
])

const heartRateTrend = ref([45, 52, 68, 75, 80, 72, 65, 70, 78, 82, 74, 68, 60, 55, 50, 48, 52, 58, 62, 70, 76, 80, 72, 65])

const alerts = ref([
  {
    elderlyName: '李建国',
    typeLabel: '血压异常',
    levelClass: 'level-warning',
    description: '收缩压持续高于 140mmHg，建议尽快就医检查',
    time: '10 分钟前',
    statusClass: 'status-pending',
    statusLabel: '待处理',
  },
  {
    elderlyName: '王秀兰',
    typeLabel: '跌倒预警',
    levelClass: 'level-danger',
    description: '检测到疑似跌倒动作，已自动通知村服务站',
    time: '1 小时前',
    statusClass: 'status-processing',
    statusLabel: '处理中',
  },
  {
    elderlyName: '李建国',
    typeLabel: '设备低电',
    levelClass: 'level-info',
    description: '智能手环电量低于 15%，请提醒老人充电',
    time: '3 小时前',
    statusClass: 'status-resolved',
    statusLabel: '已解决',
  },
  {
    elderlyName: '王秀兰',
    typeLabel: '越界提醒',
    levelClass: 'level-warning',
    description: '老人离开安全区域范围约 200 米',
    time: '昨天 16:30',
    statusClass: 'status-resolved',
    statusLabel: '已解决',
  },
])

const services = ref([
  {
    name: '上门体检',
    bg: 'linear-gradient(135deg, rgba(13,148,136,0.15), rgba(20,184,166,0.08))',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  },
  {
    name: '送药上门',
    bg: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(96,165,250,0.08))',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
  },
  {
    name: '助餐服务',
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.08))',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
  },
  {
    name: '家政保洁',
    bg: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(167,139,250,0.08))',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  },
  {
    name: '康复理疗',
    bg: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(244,114,182,0.08))',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
  },
  {
    name: '心理关怀',
    bg: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.08))',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  },
])

// ==================== 方法 ====================

function openBindDialog() {
  bindForm.elderlyId = null
  bindForm.relationship = ''
  bindForm.phone = ''
  bindDialogVisible.value = true
}

async function handleBindSubmit() {
  const valid = await bindFormRef.value.validate().catch(() => false)
  if (!valid) return
  bindLoading.value = true
  try {
    // 实际项目中调用 API
    // await createFamily({ ... })
    ElMessage.success('绑定成功')
    bindDialogVisible.value = false
  } catch (err) {
    console.error(err)
  } finally {
    bindLoading.value = false
  }
}

function handleSOS() {
  sosDialogVisible.value = true
}

function confirmSOS() {
  sosDialogVisible.value = false
  ElMessage.success('紧急呼叫已发出，请保持电话畅通')
}

function handleServiceClick(svc) {
  ElMessage.info(`正在跳转到「${svc.name}」预约页面...`)
  // router.push('/family/order')
}

onMounted(() => {
  // 实际项目中在此获取数据
  // fetchDashboard()
  // fetchFamily()
  // fetchAlerts()
})
</script>

<template>
  <div class="family-dashboard-2026">
    <!-- 渐变背景 -->
    <div class="gradient-mesh-teal" />

    <!-- 页面头部 -->
    <header class="page-header animate-fade-in-up">
      <div class="header-left">
        <h1 class="page-title">
          <span class="title-icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </span>
          家属看护中心
        </h1>
        <p class="page-subtitle">
          {{ currentDate }} &middot; 守护家人健康，从了解开始
        </p>
      </div>
      <div class="header-right">
        <button
          class="btn-bind"
          @click="openBindDialog"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
            cx="8.5"
            cy="7"
            r="4"
          /><line
            x1="20"
            y1="8"
            x2="20"
            y2="14"
          /><line
            x1="23"
            y1="11"
            x2="17"
            y2="11"
          /></svg>
          绑定老人
        </button>
      </div>
    </header>

    <!-- Bento Grid 主布局 -->
    <div class="bento-grid">
      <!-- ========== 关联老人信息卡片 (大卡) ========== -->
      <div
        v-for="(elder, idx) in elderlyList"
        :key="elder.id"
        class="bento-item bento-col-2 animate-fade-in-up"
        :style="{ animationDelay: `${0.05 + idx * 0.08}s` }"
      >
        <div class="glass-card elder-card">
          <div class="elder-card-top">
            <div
              class="elder-avatar"
              :style="{ background: elder.avatarBg }"
            >
              {{ elder.name.charAt(0) }}
            </div>
            <div class="elder-meta">
              <div class="elder-name-row">
                <span class="elder-name">{{ elder.name }}</span>
                <span class="elder-relation-tag">{{ elder.relationship }}</span>
              </div>
              <div class="elder-sub-info">
                <span>{{ elder.age }}岁</span>
                <span class="dot-sep" />
                <span>{{ elder.gender }}</span>
                <span class="dot-sep" />
                <span>{{ elder.phone }}</span>
              </div>
            </div>
            <div
              class="elder-device-status"
              :class="elder.deviceOnline ? 'online' : 'offline'"
            >
              <span class="status-dot" />
              {{ elder.deviceOnline ? '设备在线' : '设备离线' }}
            </div>
          </div>
          <div class="elder-health-brief">
            <div
              class="health-tag"
              :class="elder.healthStatus"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              {{ elder.healthLabel }}
            </div>
            <span class="elder-address">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle
                cx="12"
                cy="10"
                r="3"
              /></svg>
              {{ elder.address }}
            </span>
          </div>
        </div>
      </div>

      <!-- ========== 一键呼叫 SOS ========== -->
      <div
        class="bento-item bento-col-1 animate-fade-in-up"
        style="animation-delay: 0.2s"
      >
        <div
          class="glass-card sos-card"
          @click="handleSOS"
        >
          <div class="sos-pulse-ring" />
          <div class="sos-pulse-ring delay" />
          <div class="sos-icon-wrap">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
          </div>
          <span class="sos-text">一键呼叫</span>
          <span class="sos-sub">紧急求助 SOS</span>
        </div>
      </div>

      <!-- ========== 健康数据概览 ========== -->
      <div
        class="bento-item bento-col-2 bento-row-2 animate-fade-in-up"
        style="animation-delay: 0.25s"
      >
        <div class="glass-card health-overview-card">
          <div class="card-section-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            健康数据概览
          </div>
          <div class="health-metrics-grid">
            <!-- 心率 -->
            <div
              v-for="(m, i) in healthMetrics"
              :key="m.label"
              class="metric-card"
              :style="{ animationDelay: `${0.3 + i * 0.08}s` }"
            >
              <div
                class="metric-icon"
                :style="{ background: m.iconBg }"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  :stroke="m.color"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  v-html="m.iconPath"
                />
              </div>
              <div class="metric-body">
                <span class="metric-label">{{ m.label }}</span>
                <div class="metric-value-row">
                  <span
                    class="metric-value"
                    :style="{ color: m.color }"
                  >{{ m.value }}</span>
                  <span class="metric-unit">{{ m.unit }}</span>
                </div>
                <div class="metric-bar-wrap">
                  <div
                    class="metric-bar"
                    :style="{ width: m.percent + '%', background: m.color }"
                  />
                </div>
              </div>
              <span
                class="metric-status"
                :class="m.statusClass"
              >{{ m.status }}</span>
            </div>
          </div>
          <!-- 迷你趋势图 (纯 CSS) -->
          <div class="mini-trend">
            <div class="trend-label">
              今日心率趋势
            </div>
            <div class="trend-chart">
              <div
                v-for="(v, i) in heartRateTrend"
                :key="i"
                class="trend-bar"
                :style="{ height: v + '%', animationDelay: `${0.5 + i * 0.05}s` }"
              />
            </div>
            <div class="trend-time">
              <span>6:00</span><span>9:00</span><span>12:00</span><span>15:00</span><span>18:00</span><span>21:00</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== 最近预警通知 ========== -->
      <div
        class="bento-item bento-col-2 animate-fade-in-up"
        style="animation-delay: 0.3s"
      >
        <div class="glass-card alert-card">
          <div class="card-section-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            最近预警通知
            <span
              v-if="alerts.length > 0"
              class="alert-badge"
            >{{ alerts.length }}</span>
          </div>
          <div class="alert-list">
            <div
              v-for="(alert, i) in alerts"
              :key="i"
              class="alert-item"
              :class="alert.levelClass"
            >
              <div class="alert-level-indicator" />
              <div class="alert-content">
                <div class="alert-top-row">
                  <span class="alert-elder">{{ alert.elderlyName }}</span>
                  <span
                    class="alert-type-tag"
                    :class="alert.levelClass"
                  >{{ alert.typeLabel }}</span>
                </div>
                <p class="alert-desc">
                  {{ alert.description }}
                </p>
                <span class="alert-time">{{ alert.time }}</span>
              </div>
              <div
                class="alert-status-dot"
                :class="alert.statusClass"
                :title="alert.statusLabel"
              />
            </div>
          </div>
          <div
            v-if="alerts.length === 0"
            class="alert-empty"
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="opacity:.3"
            ><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            <p>暂无预警，一切正常</p>
          </div>
        </div>
      </div>

      <!-- ========== 服务预约快捷入口 ========== -->
      <div
        class="bento-item bento-col-2 animate-fade-in-up"
        style="animation-delay: 0.35s"
      >
        <div class="glass-card service-card">
          <div class="card-section-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><rect
              x="3"
              y="4"
              width="18"
              height="18"
              rx="2"
              ry="2"
            /><line
              x1="16"
              y1="2"
              x2="16"
              y2="6"
            /><line
              x1="8"
              y1="2"
              x2="8"
              y2="6"
            /><line
              x1="3"
              y1="10"
              x2="21"
              y2="10"
            /></svg>
            服务预约
          </div>
          <div class="service-grid">
            <div
              v-for="(svc, i) in services"
              :key="i"
              class="service-entry"
              :style="{ animationDelay: `${0.4 + i * 0.06}s` }"
              @click="handleServiceClick(svc)"
            >
              <div
                class="service-icon"
                :style="{ background: svc.bg }"
              >
                <span v-html="svc.icon" />
              </div>
              <span class="service-name">{{ svc.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- /Bento Grid -->

    <!-- ========== 绑定老人对话框 ========== -->
    <el-dialog
      v-model="bindDialogVisible"
      title="绑定老人"
      width="480px"
      destroy-on-close
      class="bind-dialog-2026"
    >
      <el-form
        ref="bindFormRef"
        :model="bindForm"
        :rules="bindFormRules"
        label-width="100px"
      >
        <el-form-item
          label="选择老人"
          prop="elderlyId"
        >
          <el-select
            v-model="bindForm.elderlyId"
            placeholder="请选择老人"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="e in elderlyOptions"
              :key="e.id"
              :label="`${e.name} (${e.phone || '无电话'})`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="与老人关系"
          prop="relationship"
        >
          <el-select
            v-model="bindForm.relationship"
            placeholder="请选择关系"
            style="width: 100%"
          >
            <el-option
              label="配偶"
              value="配偶"
            />
            <el-option
              label="子女"
              value="子女"
            />
            <el-option
              label="孙子女"
              value="孙子女"
            />
            <el-option
              label="其他亲属"
              value="其他亲属"
            />
            <el-option
              label="朋友"
              value="朋友"
            />
            <el-option
              label="邻居"
              value="邻居"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="联系电话"
          prop="phone"
        >
          <el-input
            v-model="bindForm.phone"
            placeholder="请输入联系电话"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="bindLoading"
          @click="handleBindSubmit"
        >
          确定绑定
        </el-button>
      </template>
    </el-dialog>

    <!-- ========== SOS 确认对话框 ========== -->
    <el-dialog
      v-model="sosDialogVisible"
      width="400px"
      class="sos-dialog-2026"
      :show-close="false"
      align-center
    >
      <div class="sos-confirm-content">
        <div class="sos-confirm-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line
            x1="12"
            y1="9"
            x2="12"
            y2="13"
          /><line
            x1="12"
            y1="17"
            x2="12.01"
            y2="17"
          /></svg>
        </div>
        <h3>确认发起紧急呼叫？</h3>
        <p>系统将立即通知关联老人所在村的服务站及紧急联系人</p>
      </div>
      <template #footer>
        <el-button @click="sosDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="danger"
          style="background:#ef4444;border-color:#ef4444;"
          @click="confirmSOS"
        >
          确认呼叫
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* ============================================
   青绿色系 2026 设计 - 家属端首页
   ============================================ */

/* ---- 渐变背景 ---- */
.family-dashboard-2026 {
  position: relative;
  min-height: 100vh;
  padding: 0;
  overflow-x: hidden;
}

.gradient-mesh-teal {
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(at 20% 10%, rgba(13, 148, 136, 0.18) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(20, 184, 166, 0.12) 0px, transparent 50%),
    radial-gradient(at 0% 60%, rgba(94, 234, 212, 0.10) 0px, transparent 50%),
    radial-gradient(at 90% 70%, rgba(13, 148, 136, 0.08) 0px, transparent 50%),
    radial-gradient(at 50% 100%, rgba(20, 184, 166, 0.06) 0px, transparent 50%);
  background-color: #f0fdfa;
}

/* ---- 页面头部 ---- */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 32px 8px;
}

.page-title {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  letter-spacing: -0.5px;
}

.title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #fff;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.35);
}

.page-subtitle {
  margin: 6px 0 0 54px;
  font-size: 13px;
  color: #64748b;
}

.btn-bind {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: 1px solid rgba(13, 148, 136, 0.3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  color: #0d9488;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-bind:hover {
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.35);
  transform: translateY(-2px);
}

/* ---- Bento Grid ---- */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(100px, auto);
  gap: 20px;
  padding: 20px 32px 40px;
}

.bento-item {
  opacity: 0;
  animation: fadeInUp 0.5s ease forwards;
}

.bento-col-1 { grid-column: span 1; }
.bento-col-2 { grid-column: span 2; }
.bento-col-3 { grid-column: span 3; }
.bento-col-4 { grid-column: span 4; }
.bento-row-1 { grid-row: span 1; }
.bento-row-2 { grid-row: span 2; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- Glass Card 通用 ---- */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(13, 148, 136, 0.12);
}

.glass-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
}

/* ---- Card Section Title ---- */
.card-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 20px;
}

.card-section-title svg {
  color: #0d9488;
}

/* ============================================
   关联老人信息卡片
   ============================================ */
.elder-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.elder-card-top {
  display: flex;
  align-items: center;
  gap: 14px;
}

.elder-avatar {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
}

.elder-meta {
  flex: 1;
  min-width: 0;
}

.elder-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.elder-name {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.elder-relation-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(13, 148, 136, 0.12);
  color: #0d9488;
}

.elder-sub-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}

.dot-sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #cbd5e1;
}

.elder-device-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.elder-device-status.online {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.elder-device-status.offline {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.online .status-dot {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
  animation: pulse 2s infinite;
}

.offline .status-dot {
  background: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.elder-health-brief {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.health-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}

.health-tag.good {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.health-tag.warning {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.health-tag.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.elder-address {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94a3b8;
}

/* ============================================
   SOS 一键呼叫
   ============================================ */
.sos-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  min-height: 240px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(239, 68, 68, 0.02));
  border: 1px solid rgba(239, 68, 68, 0.15);
}

.sos-card:hover {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.04));
  box-shadow: 0 16px 48px rgba(239, 68, 68, 0.18);
}

.sos-card::before {
  background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.3), transparent);
}

.sos-pulse-ring {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 2px solid rgba(239, 68, 68, 0.2);
  animation: sosPulse 2.5s ease-out infinite;
}

.sos-pulse-ring.delay {
  animation-delay: 1.25s;
}

@keyframes sosPulse {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}

.sos-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 28px rgba(239, 68, 68, 0.45);
  position: relative;
  z-index: 1;
}

.sos-text {
  font-size: 18px;
  font-weight: 800;
  color: #dc2626;
  position: relative;
  z-index: 1;
}

.sos-sub {
  font-size: 12px;
  font-weight: 600;
  color: #f87171;
  letter-spacing: 2px;
  position: relative;
  z-index: 1;
}

/* ============================================
   健康数据概览
   ============================================ */
.health-overview-card {
  display: flex;
  flex-direction: column;
}

.health-metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
}

.metric-card:hover {
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.metric-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-body {
  flex: 1;
  min-width: 0;
}

.metric-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.metric-value-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin: 2px 0;
}

.metric-value {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}

.metric-unit {
  font-size: 11px;
  color: #94a3b8;
}

.metric-bar-wrap {
  height: 4px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.metric-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 1s ease;
}

.metric-status {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
  flex-shrink: 0;
}

.metric-status.normal {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.metric-status.warning {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.metric-status.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* ---- 迷你趋势图 ---- */
.mini-trend {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.trend-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 60px;
}

.trend-bar {
  flex: 1;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(to top, #0d9488, #5eead4);
  opacity: 0;
  animation: barGrow 0.6s ease forwards;
  min-height: 4px;
  transition: height 0.3s ease;
}

.trend-bar:hover {
  background: linear-gradient(to top, #0f766e, #14b8a6);
}

@keyframes barGrow {
  from { opacity: 0; transform: scaleY(0); }
  to   { opacity: 1; transform: scaleY(1); }
}

.trend-time {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10px;
  color: #94a3b8;
}

/* ============================================
   预警通知列表
   ============================================ */
.alert-card {
  display: flex;
  flex-direction: column;
}

.alert-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 100px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 340px;
  overflow-y: auto;
}

.alert-list::-webkit-scrollbar {
  width: 4px;
}

.alert-list::-webkit-scrollbar-thumb {
  background: rgba(13, 148, 136, 0.2);
  border-radius: 4px;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
}

.alert-item:hover {
  background: rgba(255, 255, 255, 0.75);
}

.alert-level-indicator {
  width: 4px;
  border-radius: 4px;
  min-height: 40px;
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-item.level-danger .alert-level-indicator {
  background: #ef4444;
}

.alert-item.level-warning .alert-level-indicator {
  background: #f59e0b;
}

.alert-item.level-info .alert-level-indicator {
  background: #3b82f6;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.alert-elder {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.alert-type-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
}

.alert-type-tag.level-danger {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.alert-type-tag.level-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.alert-type-tag.level-info {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.alert-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 6px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.alert-time {
  font-size: 11px;
  color: #94a3b8;
}

.alert-status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.alert-status-dot.status-pending {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}

.alert-status-dot.status-processing {
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
  animation: pulse 2s infinite;
}

.alert-status-dot.status-resolved {
  background: #10b981;
}

.alert-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 8px;
}

.alert-empty p {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

/* ============================================
   服务预约快捷入口
   ============================================ */
.service-card {
  display: flex;
  flex-direction: column;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.service-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 10px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  opacity: 0;
  animation: fadeInUp 0.4s ease forwards;
}

.service-entry:hover {
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.6);
}

.service-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s ease;
}

.service-entry:hover .service-icon {
  transform: scale(1.1);
}

.service-name {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

/* ============================================
   SOS 确认对话框
   ============================================ */
.sos-confirm-content {
  text-align: center;
  padding: 10px 0;
}

.sos-confirm-icon {
  margin-bottom: 16px;
}

.sos-confirm-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
}

.sos-confirm-content p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* ============================================
   响应式布局
   ============================================ */
@media (max-width: 1200px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .bento-col-3,
  .bento-col-4 {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .bento-grid {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 16px;
  }
  .bento-col-1,
  .bento-col-2,
  .bento-col-3,
  .bento-col-4 {
    grid-column: span 1;
  }
  .bento-row-2 {
    grid-row: span 1;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 20px 16px 8px;
  }

  .page-subtitle {
    margin-left: 0;
  }

  .health-metrics-grid {
    grid-template-columns: 1fr;
  }

  .service-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ============================================
   Element Plus 对话框覆盖
   ============================================ */
:deep(.bind-dialog-2026 .el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}

:deep(.sos-dialog-2026 .el-dialog) {
  border-radius: 20px;
}
</style>

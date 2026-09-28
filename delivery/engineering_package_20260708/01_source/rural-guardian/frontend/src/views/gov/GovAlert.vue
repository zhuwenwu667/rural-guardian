<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Plus, Bell, Search, UserFilled, Loading, QuestionFilled, CircleCheck, CircleClose, Document, Clock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAlertFlowList, getAlertFlowDetail, acceptAlert, processAlert, escalateAlert, closeAlert } from '../../api/alert-flow'
import { createAlert } from '../../api/alert'
import { getElderlyList } from '../../api/elderly'
import { voiceService, buildAlertVoiceText } from '../../services/voice'

const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref([])
const pendingCount = ref(0)
const elderlyOptions = ref([])
const villageOptions = ref([])
const knownAlertIds = ref(new Set()) // 已知告警ID集合，用于检测新告警

const createDialogVisible = ref(false)
const processDialogVisible = ref(false)
const escalateDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const detailData = ref(null)

const createFormRef = ref(null)
const processFormRef = ref(null)

const filters = reactive({ type: '', level: '', status: '', keyword: '', villageId: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const stats = reactive({
  pending: 0,
  processing: 0,
  confirming: 0,
  resolved: 0,
  closed: 0
})

const createForm = reactive({ elderlyId: '', type: 'FALL', level: 'P2', description: '' })
const processForm = reactive({ id: null, result: 'RESOLVED', remark: '' })
const escalateForm = reactive({ id: null, reason: '', remark: '' })

const createRules = {
  elderlyId: [{ required: true, message: '请选择老人', trigger: 'change' }],
  type: [{ required: true, message: '请选择预警类型', trigger: 'change' }],
  level: [{ required: true, message: '请选择预警级别', trigger: 'change' }]
}

const processRules = {
  result: [{ required: true, message: '请选择处置结果', trigger: 'change' }],
  remark: [{ required: true, message: '请输入处置说明', trigger: 'blur' }]
}

// 映射表
const typeMap = { FALL: '跌倒', HEALTH: '健康异常', SOS: 'SOS求助', DEVICE: '设备异常', ABNORMAL: '行为异常', HEALTH_ABNORMAL: '健康异常', GEO_FENCE: '越界', DEVICE_OFFLINE: '设备离线' }
const levelMap = { LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '紧急', P0: 'P0-紧急', P1: 'P1-高', P2: 'P2-中' }
const statusMap = { PENDING: '待接单', ACCEPTED: '已接单', PROCESSING: '处理中', CONFIRMING: '待确认', RESOLVED: '已解决', CLOSED: '已关闭' }

function typeTagClass(type) {
  const map = { 
    FALL: 'type-danger', 
    HEALTH: 'type-danger', 
    SOS: 'type-danger', 
    DEVICE: 'type-warning', 
    ABNORMAL: 'type-warning', 
    HEALTH_ABNORMAL: 'type-danger', 
    GEO_FENCE: 'type-warning', 
    DEVICE_OFFLINE: 'type-info' 
  }
  return map[type] || 'type-info'
}

function levelTagClass(level) {
  const map = { 
    LOW: 'level-info', 
    MEDIUM: 'level-warning', 
    HIGH: 'level-danger', 
    CRITICAL: 'level-danger', 
    P0: 'level-p0', 
    P1: 'level-p1', 
    P2: 'level-p2' 
  }
  return map[level] || 'level-info'
}

function statusTagClass(status) {
  const map = { 
    PENDING: 'status-pending', 
    ACCEPTED: 'status-accepted', 
    PROCESSING: 'status-processing', 
    CONFIRMING: 'status-confirming', 
    RESOLVED: 'status-resolved', 
    CLOSED: 'status-closed' 
  }
  return map[status] || 'status-closed'
}

function flowRecordType(action) {
  const map = { ACCEPT: 'warning', PROCESS: '', CONFIRM: 'success', ESCALATE: 'danger', CLOSE: 'info', CREATE: 'primary' }
  return map[action] || 'primary'
}

function flowActionText(action) {
  const map = { ACCEPT: '接单', PROCESS: '处置完成', CONFIRM: '确认', ESCALATE: '升级', CLOSE: '关闭', CREATE: '创建告警', REJECT: '申诉驳回' }
  return map[action] || action
}

function resetFilters() {
  filters.type = ''
  filters.level = ''
  filters.status = ''
  filters.keyword = ''
  filters.villageId = ''
  pagination.page = 1
  fetchData()
}

function quickFilter(status) {
  filters.status = filters.status === status ? '' : status
  pagination.page = 1
  fetchData()
}

async function fetchElderlyOptions() {
  try {
    const res = await getElderlyList({ page: 1, pageSize: 1000 })
    if (res.code === 200) {
      elderlyOptions.value = res.data.list || res.data || []
      // 提取村庄列表（去重）
      const villageMap = new Map()
      const list = res.data.list || res.data || []
      list.forEach(e => {
        if (e.village_id && e.village_name) {
          villageMap.set(e.village_id, { id: e.village_id, name: e.village_name })
        }
      })
      villageOptions.value = Array.from(villageMap.values())
    }
  } catch (err) {
    console.error('获取老人列表失败', err)
  }
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.type) params.type = filters.type
    if (filters.level) params.level = filters.level
    if (filters.status) params.status = filters.status
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.villageId) params.villageId = filters.villageId
    const res = await getAlertFlowList(params)
    if (res.code === 200) {
      tableData.value = res.data?.list || res.data?.records || []
      pagination.total = res.data?.total || 0
      // 统计各状态数量
      const all = res.data?.allRecords || tableData.value
      stats.pending = all.filter(a => a.status === 'PENDING').length
      stats.processing = all.filter(a => a.status === 'ACCEPTED' || a.status === 'PROCESSING').length
      stats.confirming = all.filter(a => a.status === 'CONFIRMING').length
      stats.resolved = all.filter(a => a.status === 'RESOLVED').length
      stats.closed = all.filter(a => a.status === 'CLOSED').length
      pendingCount.value = stats.pending

      // 语音播报新告警
      broadcastNewAlerts(tableData.value)
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('加载告警列表失败')
  } finally {
    loading.value = false
  }
}

// 新增预警
function openCreateDialog() {
  createForm.elderlyId = ''
  createForm.type = 'FALL'
  createForm.level = 'P2'
  createForm.description = ''
  createDialogVisible.value = true
}

async function submitCreate() {
  try {
    await createFormRef.value.validate()
  } catch { return }

  submitLoading.value = true
  try {
    const res = await createAlert(createForm)
    if (res.code === 200) {
      ElMessage.success('预警创建成功')
      createDialogVisible.value = false
      fetchData()
    }
  } catch (err) {
    ElMessage.error('创建失败')
  } finally {
    submitLoading.value = false
  }
}

// 接单
async function handleAccept(row) {
  try {
    await ElMessageBox.confirm(`确认接单告警 #${row.id}？`, '接单确认', { type: 'info' })
    const res = await acceptAlert(row.id)
    if (res.code === 200) {
      ElMessage.success('接单成功')
      fetchData()
    }
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('接单失败')
  }
}

// 打开处置弹窗
function openProcessDialog(row) {
  processForm.id = row.id
  processForm.result = 'RESOLVED'
  processForm.remark = ''
  processDialogVisible.value = true
}

// 提交处置
async function submitProcess() {
  try {
    await processFormRef.value.validate()
  } catch { return }

  submitLoading.value = true
  try {
    const res = await processAlert(processForm.id, {
      result: processForm.result,
      remark: processForm.remark
    })
    if (res.code === 200) {
      ElMessage.success('处置提交成功')
      processDialogVisible.value = false
      fetchData()
    }
  } catch (err) {
    ElMessage.error('处置提交失败')
  } finally {
    submitLoading.value = false
  }
}

// 打开升级弹窗
function openEscalateDialog(row) {
  escalateForm.id = row.id
  escalateForm.reason = ''
  escalateForm.remark = ''
  escalateDialogVisible.value = true
}

// 提交升级
async function submitEscalate() {
  if (!escalateForm.reason) {
    ElMessage.warning('请选择升级原因')
    return
  }
  submitLoading.value = true
  try {
    const res = await escalateAlert(escalateForm.id, {
      reason: escalateForm.reason,
      remark: escalateForm.remark
    })
    if (res.code === 200) {
      ElMessage.success('告警已升级')
      escalateDialogVisible.value = false
      fetchData()
    }
  } catch (err) {
    ElMessage.error('升级失败')
  } finally {
    submitLoading.value = false
  }
}

// 关闭告警
async function handleClose(row) {
  try {
    await ElMessageBox.confirm('确认关闭该告警？', '关闭确认', { type: 'warning' })
    const res = await closeAlert(row.id, { remark: '管理员手动关闭' })
    if (res.code === 200) {
      ElMessage.success('告警已关闭')
      fetchData()
    }
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('关闭失败')
  }
}

// 查看详情
async function viewDetail(row) {
  try {
    const res = await getAlertFlowDetail(row.id)
    if (res.code === 200) {
      detailData.value = res.data
      detailDialogVisible.value = true
    }
  } catch (err) {
    detailData.value = row
    detailDialogVisible.value = true
  }
}

// ===== 语音播报 =====
function toggleVoice() {
  voiceService.setEnabled(!voiceService.enabled)
}

/**
 * 检测新告警并语音播报
 * @param {Array} alerts - 当前告警列表
 */
function broadcastNewAlerts(alerts) {
  if (!voiceService.enabled || !alerts || alerts.length === 0) return

  // 按时间倒序，只播报最新的3条未处理告警
  const newAlerts = alerts
    .filter(a => !knownAlertIds.value.has(a.id) && a.status === 'PENDING')
    .slice(0, 3)

  newAlerts.forEach((alert, index) => {
    // 标记为已知
    knownAlertIds.value.add(alert.id)

    // 延迟播报，避免同时播报多条时重叠
    setTimeout(() => {
      const text = buildAlertVoiceText(alert)
      // 紧急告警（跌倒、SOS）使用高优先级
      const isUrgent = alert.type === 'FALL' || alert.type === 'SOS'
      voiceService.speak(text, {
        priority: isUrgent ? 'high' : 'normal',
        rate: isUrgent ? 0.9 : 0.8,
      })
    }, index * 3000) // 每条间隔3秒
  })

  // 将所有已加载的告警标记为已知（非PENDING的也标记，避免重复）
  alerts.forEach(a => knownAlertIds.value.add(a.id))
}

onMounted(() => {
  fetchData()
  fetchElderlyOptions()
})

onUnmounted(() => {
  // 组件卸载时停止语音播报
  voiceService.stop()
})
</script>

<template>
  <div class="page-container">
    <!-- 顶部标题区 -->
    <div class="page-header">
      <h2 class="page-title">
        预警管理
      </h2>
      <div class="header-actions">
        <!-- 语音播报开关 -->
        <el-tooltip
          :content="voiceService.enabled ? '关闭语音播报' : '开启语音播报'"
          placement="bottom"
        >
          <el-button
            :type="voiceService.enabled ? 'primary' : 'default'"
            plain
            class="voice-toggle-btn"
            @click="toggleVoice"
          >
            <el-icon :size="16">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 3C10.34 3 9 4.37 9 6v6c0 1.63 1.34 3 3 3s3-1.37 3-3V6c0-1.63-1.34-3-3-3z"
                  fill="currentColor"
                  opacity="0.9"
                />
                <path
                  d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"
                  fill="currentColor"
                />
                <line
                  v-if="!voiceService.enabled"
                  x1="4"
                  y1="4"
                  x2="20"
                  y2="20"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </el-icon>
            <span>{{ voiceService.enabled ? '语音已开启' : '语音已关闭' }}</span>
          </el-button>
        </el-tooltip>
        <el-button
          type="primary"
          class="btn-primary"
          @click="openCreateDialog()"
        >
          <el-icon><Plus /></el-icon> 新增预警
        </el-button>
      </div>
    </div>

    <!-- 统计卡片行 -->
    <div
      class="stats-cards"
      role="group"
      aria-label="预警状态筛选"
    >
      <button
        class="stat-card"
        :class="{ active: filters.status === 'PENDING' }"
        :aria-pressed="filters.status === 'PENDING'"
        @click="quickFilter('PENDING')"
      >
        <div class="stat-icon pending">
          <el-icon aria-hidden="true">
            <Bell />
          </el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-num">
            {{ stats.pending }}
          </div>
          <div class="stat-text">
            待接单
          </div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ active: filters.status === 'PROCESSING' }"
        :aria-pressed="filters.status === 'PROCESSING'"
        @click="quickFilter('PROCESSING')"
      >
        <div class="stat-icon processing">
          <el-icon aria-hidden="true">
            <Loading />
          </el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-num">
            {{ stats.processing }}
          </div>
          <div class="stat-text">
            处理中
          </div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ active: filters.status === 'CONFIRMING' }"
        :aria-pressed="filters.status === 'CONFIRMING'"
        @click="quickFilter('CONFIRMING')"
      >
        <div class="stat-icon confirming">
          <el-icon aria-hidden="true">
            <QuestionFilled />
          </el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-num">
            {{ stats.confirming }}
          </div>
          <div class="stat-text">
            待确认
          </div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ active: filters.status === 'RESOLVED' }"
        :aria-pressed="filters.status === 'RESOLVED'"
        @click="quickFilter('RESOLVED')"
      >
        <div class="stat-icon resolved">
          <el-icon aria-hidden="true">
            <CircleCheck />
          </el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-num">
            {{ stats.resolved }}
          </div>
          <div class="stat-text">
            已解决
          </div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ active: filters.status === 'CLOSED' }"
        :aria-pressed="filters.status === 'CLOSED'"
        @click="quickFilter('CLOSED')"
      >
        <div class="stat-icon closed">
          <el-icon aria-hidden="true">
            <CircleClose />
          </el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-num">
            {{ stats.closed }}
          </div>
          <div class="stat-text">
            已关闭
          </div>
        </div>
      </button>
    </div>

    <!-- 筛选栏卡片 -->
    <div class="filter-card">
      <div class="filter-bar">
        <el-select
          v-model="filters.type"
          placeholder="预警类型"
          clearable
          style="width: 140px"
          @change="fetchData"
        >
          <el-option
            label="跌倒"
            value="FALL"
          />
          <el-option
            label="健康异常"
            value="HEALTH"
          />
          <el-option
            label="健康异常"
            value="HEALTH_ABNORMAL"
          />
          <el-option
            label="SOS求助"
            value="SOS"
          />
          <el-option
            label="设备异常"
            value="DEVICE"
          />
          <el-option
            label="行为异常"
            value="ABNORMAL"
          />
          <el-option
            label="越界"
            value="GEO_FENCE"
          />
          <el-option
            label="设备离线"
            value="DEVICE_OFFLINE"
          />
        </el-select>
        <el-select
          v-model="filters.level"
          placeholder="预警级别"
          clearable
          style="width: 130px"
          @change="fetchData"
        >
          <el-option
            label="P0-紧急"
            value="P0"
          />
          <el-option
            label="P1-高"
            value="P1"
          />
          <el-option
            label="P2-中"
            value="P2"
          />
          <el-option
            label="低"
            value="LOW"
          />
          <el-option
            label="中"
            value="MEDIUM"
          />
          <el-option
            label="高"
            value="HIGH"
          />
          <el-option
            label="紧急"
            value="CRITICAL"
          />
        </el-select>
        <el-select
          v-model="filters.status"
          placeholder="处理状态"
          clearable
          style="width: 130px"
          @change="fetchData"
        >
          <el-option
            label="待接单"
            value="PENDING"
          />
          <el-option
            label="已接单"
            value="ACCEPTED"
          />
          <el-option
            label="处理中"
            value="PROCESSING"
          />
          <el-option
            label="待确认"
            value="CONFIRMING"
          />
          <el-option
            label="已解决"
            value="RESOLVED"
          />
          <el-option
            label="已关闭"
            value="CLOSED"
          />
        </el-select>
        <el-select
          v-model="filters.villageId"
          placeholder="所属村庄"
          clearable
          style="width: 150px"
          @change="fetchData"
        >
          <el-option
            v-for="v in villageOptions"
            :key="v.id"
            :label="v.name"
            :value="v.id"
          />
        </el-select>
        <el-input
          v-model="filters.keyword"
          placeholder="搜索老人姓名/地址"
          clearable
          style="width: 180px"
          @keyup.enter="fetchData"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button
          type="primary"
          class="btn-primary"
          @click="fetchData"
        >
          查询
        </el-button>
        <el-button
          class="btn-default"
          @click="resetFilters"
        >
          重置
        </el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-card">
      <el-table 
        v-loading="loading" 
        :data="tableData" 
        row-key="id"
        class="alert-table"
        :header-cell-style="{ background: '#fafafa', fontWeight: 600 }"
      >
        <el-table-column
          type="expand"
          width="40"
        >
          <template #default="{ row }">
            <div class="expand-content">
              <div class="expand-section">
                <div class="section-title">
                  <el-icon><Document /></el-icon>
                  告警详情
                </div>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">老人姓名</span>
                    <span class="detail-value">{{ row.elderly_name || row.elderlyName }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">联系电话</span>
                    <span class="detail-value">{{ row.elderly_phone || row.elderlyPhone }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">所属村庄</span>
                    <span class="detail-value">{{ row.village_name || row.villageName || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">详细地址</span>
                    <span class="detail-value">{{ row.elderly_address || row.elderlyAddress || '-' }}</span>
                  </div>
                  <div class="detail-item full-width">
                    <span class="detail-label">告警内容</span>
                    <span class="detail-value">{{ row.description || row.content }}</span>
                  </div>
                </div>
              </div>
              <div class="expand-section">
                <div class="section-title">
                  <el-icon><Clock /></el-icon>
                  流转记录
                </div>
                <el-timeline v-if="row.flowRecords && row.flowRecords.length > 0">
                  <el-timeline-item
                    v-for="record in row.flowRecords"
                    :key="record.id"
                    :type="flowRecordType(record.action)"
                    :timestamp="record.created_at || record.createdAt"
                    placement="top"
                  >
                    <div class="flow-record">
                      <span class="flow-action">{{ flowActionText(record.action) }}</span>
                      <span class="flow-operator">操作人: {{ record.operator_name || record.operatorName }}</span>
                      <div
                        v-if="record.remark"
                        class="flow-remark"
                      >
                        {{ record.remark }}
                      </div>
                    </div>
                  </el-timeline-item>
                </el-timeline>
                <el-empty
                  v-else
                  description="暂无流转记录"
                  :image-size="40"
                />
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="id"
          label="ID"
          width="70"
        />
        <el-table-column
          label="老人信息"
          min-width="160"
        >
          <template #default="{ row }">
            <div class="elderly-cell">
              <el-avatar
                :size="36"
                :icon="UserFilled"
                class="elderly-avatar"
              />
              <div class="elderly-info">
                <div class="elderly-name">
                  {{ row.elderly_name || row.elderlyName }}
                </div>
                <div class="elderly-phone">
                  {{ row.elderly_phone || row.elderlyPhone }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="type"
          label="类型"
          width="100"
        >
          <template #default="{ row }">
            <span
              class="type-tag"
              :class="typeTagClass(row.type)"
            >{{ typeMap[row.type] || row.type }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="level"
          label="级别"
          width="90"
        >
          <template #default="{ row }">
            <span
              class="level-tag"
              :class="levelTagClass(row.level)"
            >{{ levelMap[row.level] || row.level }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="状态"
          width="110"
        >
          <template #default="{ row }">
            <span
              class="status-tag"
              :class="statusTagClass(row.status)"
            >
              <span class="status-dot" />
              {{ statusMap[row.status] || row.status }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="处理人"
          width="100"
        >
          <template #default="{ row }">
            <span class="handler-text">{{ row.handler_name || row.handlerName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="created_at"
          label="告警时间"
          width="170"
        />
        <el-table-column
          label="操作"
          width="280"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="action-btns">
              <el-button 
                v-if="row.status === 'PENDING'" 
                type="primary" 
                size="small" 
                class="action-btn btn-accept"
                @click="handleAccept(row)"
              >
                接单
              </el-button>
              <el-button 
                v-if="row.status === 'ACCEPTED' || row.status === 'PROCESSING'" 
                type="warning" 
                size="small" 
                class="action-btn btn-process"
                @click="openProcessDialog(row)"
              >
                处置
              </el-button>
              <el-button 
                v-if="row.status === 'ACCEPTED' || row.status === 'PROCESSING'" 
                type="danger" 
                size="small" 
                class="action-btn btn-escalate"
                @click="openEscalateDialog(row)"
              >
                升级
              </el-button>
              <el-button 
                v-if="row.status === 'RESOLVED'" 
                type="success" 
                size="small" 
                class="action-btn btn-close"
                @click="handleClose(row)"
              >
                关闭
              </el-button>
              <el-button 
                v-if="row.status !== 'PENDING' && row.status !== 'ACCEPTED' && row.status !== 'PROCESSING' && row.status !== 'RESOLVED'" 
                type="primary" 
                size="small" 
                plain
                class="action-btn"
                @click="viewDetail(row)"
              >
                详情
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && tableData.length === 0"
        description="暂无数据"
      />

      <!-- 分页 -->
      <div class="pagination-wrapper">
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
    </div>

    <!-- 新增预警对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新增预警"
      width="500px"
      destroy-on-close
      class="custom-dialog"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item
          label="老人"
          prop="elderlyId"
        >
          <el-select
            v-model="createForm.elderlyId"
            placeholder="请选择老人"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="item in elderlyOptions"
              :key="item.id"
              :label="`${item.name} (${item.phone || '无电话'})`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="预警类型"
          prop="type"
        >
          <el-select
            v-model="createForm.type"
            style="width: 100%"
          >
            <el-option
              label="跌倒"
              value="FALL"
            />
            <el-option
              label="健康异常"
              value="HEALTH_ABNORMAL"
            />
            <el-option
              label="SOS求助"
              value="SOS"
            />
            <el-option
              label="越界"
              value="GEO_FENCE"
            />
            <el-option
              label="设备离线"
              value="DEVICE_OFFLINE"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="预警级别"
          prop="level"
        >
          <el-select
            v-model="createForm.level"
            style="width: 100%"
          >
            <el-option
              label="P0-紧急"
              value="P0"
            />
            <el-option
              label="P1-高"
              value="P1"
            />
            <el-option
              label="P2-中"
              value="P2"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="描述"
          prop="description"
        >
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          class="btn-primary"
          :loading="submitLoading"
          @click="submitCreate"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 处置对话框 -->
    <el-dialog
      v-model="processDialogVisible"
      title="告警处置"
      width="560px"
      destroy-on-close
      class="custom-dialog"
    >
      <el-form
        ref="processFormRef"
        :model="processForm"
        label-width="100px"
        :rules="processRules"
      >
        <el-form-item
          label="处置结果"
          prop="result"
        >
          <el-radio-group v-model="processForm.result">
            <el-radio label="RESOLVED">
              已解决
            </el-radio>
            <el-radio label="CONFIRMING">
              需家属确认
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          label="处置说明"
          prop="remark"
        >
          <el-input
            v-model="processForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请详细描述处置过程和结果"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          class="btn-primary"
          :loading="submitLoading"
          @click="submitProcess"
        >
          提交处置
        </el-button>
      </template>
    </el-dialog>

    <!-- 升级对话框 -->
    <el-dialog
      v-model="escalateDialogVisible"
      title="升级告警"
      width="500px"
      destroy-on-close
      class="custom-dialog"
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #title>
          升级后告警将转交上级处理，请确认升级原因
        </template>
      </el-alert>
      <el-form
        :model="escalateForm"
        label-width="100px"
      >
        <el-form-item
          label="升级原因"
          required
        >
          <el-select
            v-model="escalateForm.reason"
            placeholder="请选择升级原因"
            style="width: 100%"
          >
            <el-option
              label="超出处理能力"
              value="EXCEED_CAPACITY"
            />
            <el-option
              label="需要更多资源"
              value="NEED_RESOURCES"
            />
            <el-option
              label="涉及多方协调"
              value="MULTI_PARTY"
            />
            <el-option
              label="其他原因"
              value="OTHER"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="详细说明">
          <el-input
            v-model="escalateForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请描述升级原因和处理建议"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="escalateDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="warning"
          :loading="submitLoading"
          @click="submitEscalate"
        >
          确认升级
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="告警详情"
      width="650px"
      destroy-on-close
      class="custom-dialog"
    >
      <div
        v-if="detailData"
        class="detail-content"
      >
        <el-descriptions
          :column="2"
          border
        >
          <el-descriptions-item label="告警ID">
            {{ detailData.id }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <span
              class="status-tag"
              :class="statusTagClass(detailData.status)"
            >
              <span class="status-dot" />
              {{ statusMap[detailData.status] }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="老人姓名">
            {{ detailData.elderly_name || detailData.elderlyName }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ detailData.elderly_phone || detailData.elderlyPhone }}
          </el-descriptions-item>
          <el-descriptions-item label="所属村庄">
            {{ detailData.village_name || detailData.villageName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="告警类型">
            {{ typeMap[detailData.type] }}
          </el-descriptions-item>
          <el-descriptions-item label="告警级别">
            <span
              class="level-tag"
              :class="levelTagClass(detailData.level)"
            >{{ levelMap[detailData.level] }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="处理人">
            {{ detailData.handler_name || detailData.handlerName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="告警时间">
            {{ detailData.createdAt }}
          </el-descriptions-item>
          <el-descriptions-item label="地址">
            {{ detailData.elderly_address || detailData.elderlyAddress || '-' }}
          </el-descriptions-item>
          <el-descriptions-item
            label="告警内容"
            :span="2"
          >
            {{ detailData.description || detailData.content }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-timeline">
          <div class="section-title">
            <el-icon><Clock /></el-icon>
            流转记录
          </div>
          <el-timeline v-if="detailData.flowRecords && detailData.flowRecords.length > 0">
            <el-timeline-item
              v-for="record in detailData.flowRecords"
              :key="record.id"
              :type="flowRecordType(record.action)"
              :timestamp="record.created_at || record.createdAt"
              placement="top"
            >
              <div class="flow-record">
                <span class="flow-action">{{ flowActionText(record.action) }}</span>
                <span class="flow-operator">操作人: {{ record.operator_name || record.operatorName }}</span>
                <div
                  v-if="record.remark"
                  class="flow-remark"
                >
                  {{ record.remark }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty
            v-else
            description="暂无流转记录"
            :image-size="40"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 页面容器 */
.page-container { 
  padding: 24px; 
  background: #f5f7fa;
  min-height: 100vh;
}

/* 顶部标题区 */
.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 24px; 
}
.page-title { 
  margin: 0; 
  font-size: 24px; 
  font-weight: 600;
  color: #1f2937;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.voice-toggle-btn {
  border-radius: 6px;
  font-weight: 500;
}
.voice-toggle-btn span {
  margin-left: 4px;
}

/* 按钮样式 */
.btn-primary {
  background: #1677ff;
  border-color: #1677ff;
  border-radius: 6px;
  font-weight: 500;
}
.btn-primary:hover {
  background: #4096ff;
  border-color: #4096ff;
}
.btn-default {
  border-radius: 6px;
}

/* 统计卡片 */
.stats-cards { 
  display: flex; 
  gap: 16px; 
  margin-bottom: 24px; 
}
.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  font-family: inherit;
  text-align: left;
}
.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}
.stat-card.active {
  box-shadow: 0 0 0 2px #1677ff, 0 4px 16px rgba(22,119,255,0.2);
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.stat-icon.pending {
  background: rgba(255,77,79,0.1);
  color: #ff4d4f;
}
.stat-icon.processing {
  background: rgba(22,119,255,0.1);
  color: #1677ff;
}
.stat-icon.confirming {
  background: rgba(250,173,20,0.1);
  color: #faad14;
}
.stat-icon.resolved {
  background: rgba(82,196,26,0.1);
  color: #52c41a;
}
.stat-icon.closed {
  background: rgba(140,140,140,0.1);
  color: #8c8c8c;
}
.stat-info {
  display: flex;
  flex-direction: column;
}
.stat-num { 
  font-size: 28px; 
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}
.stat-text { 
  font-size: 14px; 
  color: #6b7280;
}

/* 筛选卡片 */
.filter-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 20px;
  margin-bottom: 24px;
}
.filter-bar { 
  display: flex; 
  gap: 12px; 
  flex-wrap: wrap; 
  align-items: center; 
}

/* 表格卡片 */
.table-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 20px;
}

/* 表格样式 */
.alert-table {
  --el-table-row-hover-bg-color: #fafafa;
}
.alert-table :deep(.el-table__row) {
  height: 48px;
  transition: all 0.2s ease;
}
.alert-table :deep(.el-table__header th) {
  font-weight: 600;
  color: #374151;
  background: #fafafa;
}

/* 老人信息单元格 */
.elderly-cell { 
  display: flex; 
  align-items: center;
  gap: 12px;
}
.elderly-avatar {
  background: #e6f4ff;
  color: #1677ff;
}
.elderly-info {
  display: flex;
  flex-direction: column;
}
.elderly-name { 
  font-weight: 500; 
  color: #1f2937;
  font-size: 14px;
}
.elderly-phone { 
  font-size: 12px; 
  color: #6b7280;
  margin-top: 2px;
}

/* 类型标签 */
.type-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.type-danger {
  background: rgba(255,77,79,0.1);
  color: #ff4d4f;
}
.type-warning {
  background: rgba(250,173,20,0.1);
  color: #faad14;
}
.type-info {
  background: rgba(140,140,140,0.1);
  color: #8c8c8c;
}

/* 级别标签 */
.level-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}
.level-p0 {
  background: rgba(255,77,79,0.1);
  color: #ff4d4f;
}
.level-p1 {
  background: rgba(250,173,20,0.1);
  color: #faad14;
}
.level-p2 {
  background: rgba(22,119,255,0.1);
  color: #1677ff;
}
.level-danger {
  background: rgba(255,77,79,0.1);
  color: #ff4d4f;
}
.level-warning {
  background: rgba(250,173,20,0.1);
  color: #faad14;
}
.level-info {
  background: rgba(140,140,140,0.1);
  color: #8c8c8c;
}

/* 状态标签 */
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status-pending {
  background: rgba(255,77,79,0.1);
  color: #ff4d4f;
}
.status-pending .status-dot {
  background: #ff4d4f;
}
.status-accepted {
  background: rgba(22,119,255,0.1);
  color: #1677ff;
}
.status-accepted .status-dot {
  background: #1677ff;
}
.status-processing {
  background: rgba(22,119,255,0.1);
  color: #1677ff;
}
.status-processing .status-dot {
  background: #1677ff;
}
.status-confirming {
  background: rgba(250,173,20,0.1);
  color: #faad14;
}
.status-confirming .status-dot {
  background: #faad14;
}
.status-resolved {
  background: rgba(82,196,26,0.1);
  color: #52c41a;
}
.status-resolved .status-dot {
  background: #52c41a;
}
.status-closed {
  background: rgba(140,140,140,0.1);
  color: #8c8c8c;
}
.status-closed .status-dot {
  background: #8c8c8c;
}

/* 处理人文本 */
.handler-text {
  color: #374151;
  font-size: 14px;
}

/* 操作按钮 */
.action-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.action-btn {
  border-radius: 6px;
  font-weight: 500;
  padding: 5px 12px;
}
.btn-accept {
  background: #1677ff;
  border-color: #1677ff;
}
.btn-accept:hover {
  background: #4096ff;
  border-color: #4096ff;
}
.btn-process {
  background: #faad14;
  border-color: #faad14;
}
.btn-process:hover {
  background: #ffc53d;
  border-color: #ffc53d;
}
.btn-escalate {
  background: #ff4d4f;
  border-color: #ff4d4f;
}
.btn-escalate:hover {
  background: #ff7875;
  border-color: #ff7875;
}
.btn-close {
  background: #52c41a;
  border-color: #52c41a;
}
.btn-close:hover {
  background: #73d13d;
  border-color: #73d13d;
}

/* 展开行内容 */
.expand-content { 
  padding: 24px 32px;
  background: #fafafa;
  margin: 0 -12px;
}
.expand-section { 
  margin-bottom: 24px; 
}
.expand-section:last-child {
  margin-bottom: 0;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.section-title .el-icon {
  color: #1677ff;
  font-size: 18px;
}

/* 详情网格 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 32px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-item.full-width {
  grid-column: span 2;
}
.detail-label {
  font-size: 12px;
  color: #6b7280;
}
.detail-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

/* 流转记录 */
.flow-record { 
  display: flex; 
  flex-direction: column; 
  gap: 4px; 
}
.flow-action { 
  font-weight: 600; 
  color: #1f2937;
}
.flow-operator { 
  font-size: 12px; 
  color: #6b7280; 
}
.flow-remark { 
  font-size: 13px; 
  color: #374151; 
  margin-top: 4px; 
  padding: 8px 12px; 
  background: #fff; 
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

/* 详情对话框内容 */
.detail-content { 
  max-height: 600px; 
  overflow-y: auto; 
}
.detail-timeline { 
  margin-top: 24px; 
}

/* 对话框样式 */
:deep(.custom-dialog .el-dialog__header) {
  border-bottom: 1px solid #e5e7eb;
  padding: 20px 24px;
  margin-right: 0;
}
:deep(.custom-dialog .el-dialog__title) {
  font-weight: 600;
  font-size: 16px;
}
:deep(.custom-dialog .el-dialog__body) {
  padding: 24px;
}
:deep(.custom-dialog .el-dialog__footer) {
  border-top: 1px solid #e5e7eb;
  padding: 16px 24px;
}
</style>
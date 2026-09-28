<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import {
  Plus, Search, Document, User, Loading, CircleCheck, Star,
  RefreshRight, Pointer, CircleClose, View, MapLocation,
  Check, WarningFilled, InfoFilled, UserFilled, Timer, Location, Phone
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderFlowList, getOrderFlowDetail } from '../../api/order-flow'
import { createOrder, updateOrder, deleteOrder, assignOrder, cancelOrder } from '../../api/order'
import { getElderlyList } from '../../api/elderly'
import { getProviderList } from '../../api/provider'

const loading = ref(false)
const submitLoading = ref(false)
const createDialogVisible = ref(false)
const assignDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const trackDialogVisible = ref(false)
const createStep = ref(0)
const createFormRef = ref(null)
const tableData = ref([])
const elderlyOptions = ref([])
const providerOptions = ref([])
const detailData = ref(null)
const currentOrder = ref(null)
const selectedProviderId = ref(null)
const elderlySearch = ref('')
const providerSearch = ref('')

const filters = reactive({ type: '', status: '', priority: '', keyword: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const stats = reactive({
  created: 0, assigned: 0, inProgress: 0, completed: 0, reviewed: 0
})

// 映射表
const typeMap = { MEDICAL: '医疗', LIFE_CARE: '生活照料', EMERGENCY: '紧急救援', COMPANION: '陪护', OTHER: '其他' }
const statusMap = { CREATED: '待派单', ASSIGNED: '已派单', IN_PROGRESS: '进行中', COMPLETED: '待验收', REVIEWED: '已评价', CANCELLED: '已取消' }
const priorityMap = { URGENT: '紧急', HIGH: '高', NORMAL: '普通', LOW: '低' }

const createForm = reactive({
  elderlyId: '', type: 'MEDICAL', priority: 'NORMAL',
  appointmentTime: '', serviceAddress: '', description: ''
})

const createFormRules = {
  type: [{ required: true, message: '请选择工单类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  description: [{ required: true, message: '请输入工单描述', trigger: 'blur' }]
}

// 计算属性：过滤后的老人列表
const filteredElderlyOptions = computed(() => {
  if (!elderlySearch.value) return elderlyOptions.value
  const keyword = elderlySearch.value.toLowerCase()
  return elderlyOptions.value.filter(item =>
    item.name?.toLowerCase().includes(keyword) ||
    item.phone?.includes(keyword)
  )
})

// 计算属性：过滤后的服务商列表
const filteredProviderOptions = computed(() => {
  if (!providerSearch.value) return providerOptions.value
  const keyword = providerSearch.value.toLowerCase()
  return providerOptions.value.filter(item =>
    (item.companyName || item.realName || item.name || '').toLowerCase().includes(keyword)
  )
})

function typeTagType(type) {
  const map = { MEDICAL: 'primary', LIFE_CARE: 'success', EMERGENCY: 'danger', COMPANION: 'warning', OTHER: 'info' }
  return map[type] || 'info'
}

function statusTagType(status) {
  const map = { CREATED: 'info', ASSIGNED: 'primary', IN_PROGRESS: 'warning', COMPLETED: 'success', REVIEWED: 'success', CANCELLED: 'danger' }
  return map[status] || 'info'
}

function flowRecordType(action) {
  const map = { CREATE: 'primary', ASSIGN: 'primary', ACCEPT: 'success', REJECT: 'danger', START: 'warning', COMPLETE: 'success', CANCEL: 'danger', REVIEW: 'warning' }
  return map[action] || 'primary'
}

function flowActionText(action) {
  const map = { CREATE: '创建工单', ASSIGN: '派单', ACCEPT: '接单', REJECT: '拒单', START: '开始服务', COMPLETE: '完成服务', CANCEL: '取消工单', REVIEW: '评价' }
  return map[action] || action
}

function setStatusFilter(status) {
  filters.status = filters.status === status ? '' : status
  fetchData()
}

function selectElderly(item) {
  createForm.elderlyId = item.id
  createForm.serviceAddress = item.address || ''
}

function getSelectedElderlyName() {
  const elderly = elderlyOptions.value.find(e => e.id === createForm.elderlyId)
  return elderly ? `${elderly.name} (${elderly.phone || '无电话'})` : '未选择'
}

async function nextStep() {
  if (createStep.value === 0) {
    if (!createForm.elderlyId) {
      ElMessage.warning('请选择老人')
      return
    }
    createStep.value++
  } else if (createStep.value === 1) {
    const valid = await createFormRef.value.validate().catch(() => false)
    if (!valid) return
    createStep.value++
  }
}

async function fetchElderlyOptions() {
  try {
    const res = await getElderlyList({ page: 1, pageSize: 1000 })
    if (res.code === 200) {
      elderlyOptions.value = res.data.list || []
    }
  } catch (err) {
    console.error(err)
  }
}

async function fetchProviderOptions() {
  try {
    const res = await getProviderList({ page: 1, pageSize: 1000 })
    if (res.code === 200) {
      providerOptions.value = res.data.list || []
    }
  } catch (err) {
    console.error(err)
  }
}

function resetFilters() {
  filters.type = ''
  filters.status = ''
  filters.priority = ''
  filters.keyword = ''
  pagination.page = 1
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.type) params.type = filters.type
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.keyword) params.keyword = filters.keyword
    const res = await getOrderFlowList(params)
    if (res.code === 200) {
      tableData.value = res.data?.list || res.data?.records || []
      pagination.total = res.data?.total || 0
      // 统计各状态数量
      const all = res.data?.allRecords || tableData.value
      stats.created = all.filter(o => o.status === 'CREATED').length
      stats.assigned = all.filter(o => o.status === 'ASSIGNED').length
      stats.inProgress = all.filter(o => o.status === 'IN_PROGRESS').length
      stats.completed = all.filter(o => o.status === 'COMPLETED').length
      stats.reviewed = all.filter(o => o.status === 'REVIEWED').length
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('加载工单列表失败')
  } finally {
    loading.value = false
  }
}

// 打开创建工单弹窗
function openCreateDialog() {
  createStep.value = 0
  createForm.elderlyId = ''
  createForm.type = 'MEDICAL'
  createForm.priority = 'NORMAL'
  createForm.appointmentTime = ''
  createForm.serviceAddress = ''
  createForm.description = ''
  elderlySearch.value = ''
  createDialogVisible.value = true
}

// 提交创建工单
async function handleCreateSubmit() {
  submitLoading.value = true
  try {
    await createOrder(createForm)
    ElMessage.success('工单创建成功')
    createDialogVisible.value = false
    fetchData()
  } catch (err) {
    console.error(err)
    ElMessage.error('创建失败')
  } finally {
    submitLoading.value = false
  }
}

// 打开派单弹窗
function openAssignDialog(row) {
  currentOrder.value = row
  selectedProviderId.value = null
  providerSearch.value = ''
  assignDialogVisible.value = true
}

// 确认派单
async function handleAssign() {
  if (!selectedProviderId.value) {
    ElMessage.warning('请选择服务商')
    return
  }
  submitLoading.value = true
  try {
    await assignOrder(currentOrder.value.id, { providerId: selectedProviderId.value })
    ElMessage.success('派单成功')
    assignDialogVisible.value = false
    fetchData()
  } catch (err) {
    console.error(err)
    ElMessage.error('派单失败')
  } finally {
    submitLoading.value = false
  }
}

// 取消工单
async function handleCancel(row) {
  try {
    await ElMessageBox.confirm('确定要取消该工单吗？', '确认取消', { type: 'warning' })
    await cancelOrder(row.id)
    ElMessage.success('取消成功')
    fetchData()
  } catch (err) {
    if (err !== 'cancel') {
      console.error(err)
      ElMessage.error('取消失败')
    }
  }
}

// 查看详情
async function viewDetail(row) {
  try {
    const res = await getOrderFlowDetail(row.id)
    if (res.code === 200) {
      detailData.value = res.data
    } else {
      detailData.value = row
    }
  } catch {
    detailData.value = row
  }
  detailDialogVisible.value = true
}

// 打开跟踪弹窗
function openTrackDialog(row) {
  currentOrder.value = row
  trackDialogVisible.value = true
}

onMounted(() => {
  fetchData()
  fetchElderlyOptions()
  fetchProviderOptions()
})
</script>

<template>
  <div class="page-container">
    <!-- 顶部标题区 -->
    <div class="page-header">
      <div class="header-title">
        <h2>工单管理</h2>
        <span class="header-subtitle">政府端工单全流程管理</span>
      </div>
      <div class="header-actions">
        <el-button
          type="primary"
          size="large"
          @click="openCreateDialog()"
        >
          <el-icon><Plus /></el-icon> 新增工单
        </el-button>
      </div>
    </div>

    <!-- 统计卡片行 -->
    <div
      class="stats-cards"
      role="group"
      aria-label="工单状态筛选"
    >
      <button
        class="stat-card"
        :class="{ active: filters.status === 'CREATED' }"
        :aria-pressed="filters.status === 'CREATED'"
        @click="setStatusFilter('CREATED')"
      >
        <div class="stat-icon created">
          <el-icon aria-hidden="true">
            <Document />
          </el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-num">
            {{ stats.created }}
          </div>
          <div class="stat-text">
            待派单
          </div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ active: filters.status === 'ASSIGNED' }"
        :aria-pressed="filters.status === 'ASSIGNED'"
        @click="setStatusFilter('ASSIGNED')"
      >
        <div class="stat-icon assigned">
          <el-icon aria-hidden="true">
            <User />
          </el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-num">
            {{ stats.assigned }}
          </div>
          <div class="stat-text">
            已派单
          </div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ active: filters.status === 'IN_PROGRESS' }"
        :aria-pressed="filters.status === 'IN_PROGRESS'"
        @click="setStatusFilter('IN_PROGRESS')"
      >
        <div class="stat-icon in-progress">
          <el-icon aria-hidden="true">
            <Loading />
          </el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-num">
            {{ stats.inProgress }}
          </div>
          <div class="stat-text">
            进行中
          </div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ active: filters.status === 'COMPLETED' }"
        :aria-pressed="filters.status === 'COMPLETED'"
        @click="setStatusFilter('COMPLETED')"
      >
        <div class="stat-icon completed">
          <el-icon aria-hidden="true">
            <CircleCheck />
          </el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-num">
            {{ stats.completed }}
          </div>
          <div class="stat-text">
            已完成
          </div>
        </div>
      </button>
      <button
        class="stat-card"
        :class="{ active: filters.status === 'REVIEWED' }"
        :aria-pressed="filters.status === 'REVIEWED'"
        @click="setStatusFilter('REVIEWED')"
      >
        <div class="stat-icon reviewed">
          <el-icon aria-hidden="true">
            <Star />
          </el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-num">
            {{ stats.reviewed }}
          </div>
          <div class="stat-text">
            已评价
          </div>
        </div>
      </button>
    </div>

    <!-- 筛选栏卡片 -->
    <div class="filter-card">
      <div class="filter-bar">
        <div class="filter-item">
          <span class="filter-label">工单类型</span>
          <el-select
            v-model="filters.type"
            placeholder="全部类型"
            clearable
            @change="fetchData"
          >
            <el-option
              label="医疗"
              value="MEDICAL"
            />
            <el-option
              label="生活照料"
              value="LIFE_CARE"
            />
            <el-option
              label="紧急救援"
              value="EMERGENCY"
            />
            <el-option
              label="陪护"
              value="COMPANION"
            />
            <el-option
              label="其他"
              value="OTHER"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">工单状态</span>
          <el-select
            v-model="filters.status"
            placeholder="全部状态"
            clearable
            @change="fetchData"
          >
            <el-option
              label="待派单"
              value="CREATED"
            />
            <el-option
              label="已派单"
              value="ASSIGNED"
            />
            <el-option
              label="进行中"
              value="IN_PROGRESS"
            />
            <el-option
              label="待验收"
              value="COMPLETED"
            />
            <el-option
              label="已评价"
              value="REVIEWED"
            />
            <el-option
              label="已取消"
              value="CANCELLED"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">优先级</span>
          <el-select
            v-model="filters.priority"
            placeholder="全部优先级"
            clearable
            @change="fetchData"
          >
            <el-option
              label="紧急"
              value="URGENT"
            />
            <el-option
              label="高"
              value="HIGH"
            />
            <el-option
              label="普通"
              value="NORMAL"
            />
            <el-option
              label="低"
              value="LOW"
            />
          </el-select>
        </div>
        <div class="filter-item filter-item-grow">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索老人姓名、手机号或服务商"
            clearable
            @keyup.enter="fetchData"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="filter-actions">
          <el-button
            type="primary"
            @click="fetchData"
          >
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetFilters">
            <el-icon><RefreshRight /></el-icon> 重置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        row-key="id"
        class="order-table"
      >
        <el-table-column
          type="expand"
          width="40"
        >
          <template #default="{ row }">
            <div class="expand-content">
              <div class="expand-grid">
                <!-- 工单详情 -->
                <div class="expand-section">
                  <div class="section-title">
                    <el-icon><Document /></el-icon>
                    工单详情
                  </div>
                  <div class="detail-grid">
                    <div class="detail-item">
                      <span class="detail-label">服务地址</span>
                      <span class="detail-value">{{ row.service_address || row.elderlyAddress || '-' }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">预约时间</span>
                      <span class="detail-value">{{ row.appointment_time || row.appointmentTime || '-' }}</span>
                    </div>
                    <div class="detail-item full-width">
                      <span class="detail-label">工单描述</span>
                      <span class="detail-value">{{ row.description || '-' }}</span>
                    </div>
                  </div>
                </div>
                <!-- 流转记录时间线 -->
                <div class="expand-section">
                  <div class="section-title">
                    <el-icon><Timer /></el-icon>
                    流转记录
                  </div>
                  <el-timeline
                    v-if="row.flowRecords && row.flowRecords.length > 0"
                    class="flow-timeline"
                  >
                    <el-timeline-item
                      v-for="record in row.flowRecords"
                      :key="record.id"
                      :type="flowRecordType(record.action)"
                      :timestamp="record.created_at || record.createdAt"
                      placement="top"
                    >
                      <div class="flow-record">
                        <span class="flow-action">{{ flowActionText(record.action) }}</span>
                        <span class="flow-operator">{{ record.operator_name || record.operatorName }}</span>
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
                    :image-size="60"
                  />
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="id"
          label="ID"
          width="60"
        />
        <el-table-column
          label="老人信息"
          min-width="140"
        >
          <template #default="{ row }">
            <div class="elderly-info">
              <div class="elderly-name">
                {{ row.elderly_name || row.elderlyName }}
              </div>
              <div class="elderly-phone">
                {{ row.elderly_phone || row.elderlyPhone }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="类型"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="typeTagType(row.type)"
              size="small"
              effect="light"
              class="type-tag"
            >
              {{ typeMap[row.type] || row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="优先级"
          width="90"
        >
          <template #default="{ row }">
            <div
              class="priority-tag"
              :class="`priority-${row.priority?.toLowerCase()}`"
            >
              <span class="priority-dot" />
              {{ priorityMap[row.priority] || row.priority || '-' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <div
              class="status-tag"
              :class="`status-${row.status?.toLowerCase()}`"
            >
              {{ statusMap[row.status] || row.status }}
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="服务商"
          min-width="120"
        >
          <template #default="{ row }">
            <span class="provider-name">{{ row.provider_name || row.providerName || '未分配' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="created_at"
          label="创建时间"
          width="160"
        />
        <el-table-column
          label="操作"
          width="220"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="action-btns">
              <el-button
                v-if="row.status === 'CREATED'"
                type="primary"
                text
                size="small"
                @click="openAssignDialog(row)"
              >
                <el-icon><Pointer /></el-icon>派单
              </el-button>
              <el-button
                v-if="['CREATED', 'ASSIGNED'].includes(row.status)"
                type="danger"
                text
                size="small"
                @click="handleCancel(row)"
              >
                <el-icon><CircleClose /></el-icon>取消
              </el-button>
              <el-button
                type="info"
                text
                size="small"
                @click="viewDetail(row)"
              >
                <el-icon><View /></el-icon>详情
              </el-button>
              <el-button
                type="warning"
                text
                size="small"
                @click="openTrackDialog(row)"
              >
                <el-icon><MapLocation /></el-icon>跟踪
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && tableData.length === 0"
        description="暂无工单数据"
        :image-size="120"
      />

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </div>

    <!-- 创建工单弹窗 - 分步骤表单 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新增工单"
      width="700px"
      destroy-on-close
      class="step-dialog"
    >
      <el-steps
        :active="createStep"
        finish-status="success"
        simple
      >
        <el-step title="选择老人" />
        <el-step title="服务信息" />
        <el-step title="确认提交" />
      </el-steps>

      <div class="step-content">
        <!-- 步骤1：选择老人 -->
        <div
          v-if="createStep === 0"
          class="step-panel"
        >
          <div class="step-search">
            <el-input
              v-model="elderlySearch"
              placeholder="搜索老人姓名或手机号"
              clearable
              @input="filterElderly"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="elderly-list">
            <div
              v-for="item in filteredElderlyOptions"
              :key="item.id"
              class="elderly-item"
              :class="{ selected: createForm.elderlyId === item.id }"
              @click="selectElderly(item)"
            >
              <div class="elderly-avatar">
                <el-avatar
                  :size="48"
                  :icon="UserFilled"
                />
              </div>
              <div class="elderly-info-select">
                <div class="elderly-name">
                  {{ item.name }}
                </div>
                <div class="elderly-meta">
                  {{ item.phone || '无电话' }} · {{ item.address || '无地址' }}
                </div>
              </div>
              <el-icon
                v-if="createForm.elderlyId === item.id"
                class="selected-icon"
              >
                <Check />
              </el-icon>
            </div>
            <el-empty
              v-if="filteredElderlyOptions.length === 0"
              description="未找到匹配的老人"
              :image-size="80"
            />
          </div>
        </div>

        <!-- 步骤2：服务信息 -->
        <div
          v-if="createStep === 1"
          class="step-panel"
        >
          <el-form
            ref="createFormRef"
            :model="createForm"
            :rules="createFormRules"
            label-width="100px"
          >
            <el-form-item
              label="工单类型"
              prop="type"
            >
              <el-radio-group v-model="createForm.type">
                <el-radio-button label="MEDICAL">
                  医疗
                </el-radio-button>
                <el-radio-button label="LIFE_CARE">
                  生活照料
                </el-radio-button>
                <el-radio-button label="EMERGENCY">
                  紧急救援
                </el-radio-button>
                <el-radio-button label="COMPANION">
                  陪护
                </el-radio-button>
                <el-radio-button label="OTHER">
                  其他
                </el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item
              label="优先级"
              prop="priority"
            >
              <el-radio-group v-model="createForm.priority">
                <el-radio-button label="URGENT">
                  <el-icon><WarningFilled /></el-icon> 紧急
                </el-radio-button>
                <el-radio-button label="HIGH">
                  高
                </el-radio-button>
                <el-radio-button label="NORMAL">
                  普通
                </el-radio-button>
                <el-radio-button label="LOW">
                  低
                </el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item
              label="预约时间"
              prop="appointmentTime"
            >
              <el-date-picker
                v-model="createForm.appointmentTime"
                type="datetime"
                placeholder="选择预约时间"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item
              label="服务地址"
              prop="serviceAddress"
            >
              <el-input
                v-model="createForm.serviceAddress"
                placeholder="请输入服务地址"
              />
            </el-form-item>
            <el-form-item
              label="工单描述"
              prop="description"
            >
              <el-input
                v-model="createForm.description"
                type="textarea"
                :rows="4"
                placeholder="请详细描述服务需求"
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤3：确认提交 -->
        <div
          v-if="createStep === 2"
          class="step-panel"
        >
          <div class="confirm-section">
            <div class="confirm-title">
              <el-icon><InfoFilled /></el-icon>
              请确认工单信息
            </div>
            <div class="confirm-content">
              <div class="confirm-item">
                <span class="confirm-label">服务对象</span>
                <span class="confirm-value">{{ getSelectedElderlyName() }}</span>
              </div>
              <div class="confirm-item">
                <span class="confirm-label">工单类型</span>
                <span class="confirm-value">{{ typeMap[createForm.type] }}</span>
              </div>
              <div class="confirm-item">
                <span class="confirm-label">优先级</span>
                <span class="confirm-value">
                  <span :class="`priority-text-${createForm.priority?.toLowerCase()}`">{{ priorityMap[createForm.priority] }}</span>
                </span>
              </div>
              <div class="confirm-item">
                <span class="confirm-label">预约时间</span>
                <span class="confirm-value">{{ createForm.appointmentTime || '未设置' }}</span>
              </div>
              <div class="confirm-item">
                <span class="confirm-label">服务地址</span>
                <span class="confirm-value">{{ createForm.serviceAddress || '未设置' }}</span>
              </div>
              <div class="confirm-item full">
                <span class="confirm-label">工单描述</span>
                <span class="confirm-value">{{ createForm.description || '无' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button
          v-if="createStep > 0"
          @click="createStep--"
        >
          上一步
        </el-button>
        <el-button
          v-if="createStep < 2"
          type="primary"
          @click="nextStep"
        >
          下一步
        </el-button>
        <el-button
          v-if="createStep === 2"
          type="primary"
          :loading="submitLoading"
          @click="handleCreateSubmit"
        >
          提交工单
        </el-button>
      </template>
    </el-dialog>

    <!-- 派单弹窗 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="选择服务商"
      width="600px"
      destroy-on-close
    >
      <div class="assign-dialog-content">
        <div class="assign-order-info">
          <div class="assign-info-item">
            <span class="assign-label">工单类型</span>
            <span class="assign-value">{{ typeMap[currentOrder?.type] }}</span>
          </div>
          <div class="assign-info-item">
            <span class="assign-label">服务地址</span>
            <span class="assign-value">{{ currentOrder?.service_address || currentOrder?.elderlyAddress || '-' }}</span>
          </div>
        </div>
        <div class="provider-search">
          <el-input
            v-model="providerSearch"
            placeholder="搜索服务商名称"
            clearable
            @input="filterProvider"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="provider-list">
          <div
            v-for="item in filteredProviderOptions"
            :key="item.id"
            class="provider-item"
            :class="{ selected: selectedProviderId === item.id }"
            @click="selectedProviderId = item.id"
          >
            <div class="provider-header">
              <div class="provider-name">
                {{ item.companyName || item.realName || item.name || `服务商#${item.id}` }}
              </div>
              <div class="provider-rating">
                <el-rate
                  :model-value="item.rating || 4.5"
                  disabled
                  size="small"
                />
                <span class="rating-score">{{ item.rating || 4.5 }}</span>
              </div>
            </div>
            <div class="provider-meta">
              <span><el-icon><Location /></el-icon> {{ item.address || '暂无地址' }}</span>
              <span><el-icon><Phone /></el-icon> {{ item.phone || '暂无电话' }}</span>
            </div>
            <div class="provider-tags">
              <el-tag
                v-if="item.isCertified"
                size="small"
                type="success"
              >
                已认证
              </el-tag>
              <el-tag
                v-if="item.serviceCount"
                size="small"
                type="info"
              >
                服务{{ item.serviceCount }}次
              </el-tag>
            </div>
            <el-icon
              v-if="selectedProviderId === item.id"
              class="provider-selected-icon"
            >
              <Check />
            </el-icon>
          </div>
          <el-empty
            v-if="filteredProviderOptions.length === 0"
            description="未找到匹配的服务商"
            :image-size="80"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="assignDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          :disabled="!selectedProviderId"
          @click="handleAssign"
        >
          确认派单
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="工单详情"
      width="800px"
      destroy-on-close
      class="detail-dialog"
    >
      <div
        v-if="detailData"
        class="detail-wrapper"
      >
        <!-- 状态栏 -->
        <div class="detail-status-bar">
          <div class="status-left">
            <div
              class="status-tag-large"
              :class="`status-${detailData.status?.toLowerCase()}`"
            >
              {{ statusMap[detailData.status] }}
            </div>
            <div
              class="priority-tag-large"
              :class="`priority-${detailData.priority?.toLowerCase()}`"
            >
              <span class="priority-dot" />
              {{ priorityMap[detailData.priority] }}优先级
            </div>
          </div>
          <div class="status-right">
            <span class="order-no">工单编号：{{ detailData.order_no || detailData.id }}</span>
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="detail-section">
          <div class="section-header">
            <el-icon><User /></el-icon>
            基本信息
          </div>
          <div class="detail-grid">
            <div class="detail-info-item">
              <span class="detail-info-label">老人姓名</span>
              <span class="detail-info-value">{{ detailData.elderly_name || detailData.elderlyName }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">联系电话</span>
              <span class="detail-info-value">{{ detailData.elderly_phone || detailData.elderlyPhone }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">服务类型</span>
              <span class="detail-info-value">
                <el-tag
                  :type="typeTagType(detailData.type)"
                  size="small"
                >{{ typeMap[detailData.type] }}</el-tag>
              </span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">服务商</span>
              <span class="detail-info-value">{{ detailData.provider_name || detailData.providerName || '未分配' }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">服务地址</span>
              <span class="detail-info-value">{{ detailData.service_address || detailData.elderlyAddress || '-' }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">预约时间</span>
              <span class="detail-info-value">{{ detailData.appointment_time || detailData.appointmentTime || '-' }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">创建时间</span>
              <span class="detail-info-value">{{ detailData.createdAt }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">村级专员</span>
              <span class="detail-info-value">{{ detailData.staff_name || detailData.staffName || '-' }}</span>
            </div>
            <div class="detail-info-item full-width">
              <span class="detail-info-label">工单描述</span>
              <span class="detail-info-value description">{{ detailData.description || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 评价信息 -->
        <div
          v-if="detailData.review"
          class="detail-section"
        >
          <div class="section-header">
            <el-icon><Star /></el-icon>
            服务评价
          </div>
          <div class="review-content">
            <div class="review-rating">
              <el-rate
                :model-value="detailData.review.rating"
                disabled
              />
              <span class="review-score">{{ detailData.review.rating }}分</span>
            </div>
            <div class="review-text">
              {{ detailData.review.content }}
            </div>
            <div class="review-time">
              评价时间：{{ detailData.review.created_at || detailData.review.createdAt }}
            </div>
          </div>
        </div>

        <!-- 流转记录 -->
        <div class="detail-section">
          <div class="section-header">
            <el-icon><Timer /></el-icon>
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
              <div class="flow-record-detail">
                <div class="flow-record-header">
                  <span class="flow-action">{{ flowActionText(record.action) }}</span>
                  <span class="flow-operator">{{ record.operator_name || record.operatorName }}</span>
                </div>
                <div
                  v-if="record.remark"
                  class="flow-remark-detail"
                >
                  {{ record.remark }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty
            v-else
            description="暂无流转记录"
            :image-size="60"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 跟踪弹窗 -->
    <el-dialog
      v-model="trackDialogVisible"
      title="工单跟踪"
      width="600px"
      destroy-on-close
    >
      <div
        v-if="currentOrder"
        class="track-content"
      >
        <div class="track-status-flow">
          <div
            class="flow-step"
            :class="{ active: ['CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'].includes(currentOrder.status) }"
          >
            <div class="step-dot" />
            <div class="step-label">
              创建
            </div>
          </div>
          <div
            class="flow-line"
            :class="{ active: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'].includes(currentOrder.status) }"
          />
          <div
            class="flow-step"
            :class="{ active: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'].includes(currentOrder.status) }"
          >
            <div class="step-dot" />
            <div class="step-label">
              派单
            </div>
          </div>
          <div
            class="flow-line"
            :class="{ active: ['IN_PROGRESS', 'COMPLETED', 'REVIEWED'].includes(currentOrder.status) }"
          />
          <div
            class="flow-step"
            :class="{ active: ['IN_PROGRESS', 'COMPLETED', 'REVIEWED'].includes(currentOrder.status) }"
          >
            <div class="step-dot" />
            <div class="step-label">
              服务中
            </div>
          </div>
          <div
            class="flow-line"
            :class="{ active: ['COMPLETED', 'REVIEWED'].includes(currentOrder.status) }"
          />
          <div
            class="flow-step"
            :class="{ active: ['COMPLETED', 'REVIEWED'].includes(currentOrder.status) }"
          >
            <div class="step-dot" />
            <div class="step-label">
              已完成
            </div>
          </div>
          <div
            class="flow-line"
            :class="{ active: currentOrder.status === 'REVIEWED' }"
          />
          <div
            class="flow-step"
            :class="{ active: currentOrder.status === 'REVIEWED' }"
          >
            <div class="step-dot" />
            <div class="step-label">
              已评价
            </div>
          </div>
        </div>
        <div class="track-info">
          <div class="track-info-title">
            当前状态
          </div>
          <div
            class="track-info-value"
            :class="`status-${currentOrder.status?.toLowerCase()}`"
          >
            {{ statusMap[currentOrder.status] }}
          </div>
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

.header-title h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.header-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
  display: block;
}

.header-actions .el-button {
  font-size: 14px;
  padding: 12px 24px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  font-family: inherit;
  text-align: left;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.stat-card.active {
  box-shadow: 0 0 0 2px #1677ff, 0 4px 16px rgba(22, 119, 255, 0.2);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.created {
  background: #f3f4f6;
  color: #6b7280;
}

.stat-icon.assigned {
  background: #e6f4ff;
  color: #1677ff;
}

.stat-icon.in-progress {
  background: #fff7e6;
  color: #faad14;
}

.stat-icon.completed {
  background: #f6ffed;
  color: #52c41a;
}

.stat-icon.reviewed {
  background: #f6ffed;
  color: #52c41a;
}

.stat-content {
  flex: 1;
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
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item-grow {
  flex: 1;
  min-width: 200px;
}

.filter-label {
  font-size: 14px;
  color: #374151;
  white-space: nowrap;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

/* 表格卡片 */
.table-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.order-table {
  margin-bottom: 16px;
}

/* 老人信息 */
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
  border-radius: 4px;
}

/* 优先级标签 */
.priority-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.priority-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.priority-urgent {
  background: #fff1f0;
  color: #ff4d4f;
}

.priority-urgent .priority-dot {
  background: #ff4d4f;
}

.priority-high {
  background: #fff7e6;
  color: #faad14;
}

.priority-high .priority-dot {
  background: #faad14;
}

.priority-normal {
  background: #e6f4ff;
  color: #1677ff;
}

.priority-normal .priority-dot {
  background: #1677ff;
}

.priority-low {
  background: #f3f4f6;
  color: #6b7280;
}

.priority-low .priority-dot {
  background: #6b7280;
}

/* 状态标签 */
.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.status-created {
  background: #f3f4f6;
  color: #6b7280;
}

.status-assigned {
  background: #e6f4ff;
  color: #1677ff;
}

.status-in_progress {
  background: #fff7e6;
  color: #faad14;
}

.status-completed {
  background: #f6ffed;
  color: #52c41a;
}

.status-reviewed {
  background: #f6ffed;
  color: #52c41a;
}

.status-cancelled {
  background: #fff1f0;
  color: #ff4d4f;
}

/* 服务商名称 */
.provider-name {
  color: #374151;
}

/* 操作按钮 */
.action-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.action-btns .el-button {
  padding: 4px 8px;
}

/* 展开行内容 */
.expand-content {
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  margin: 8px 0;
}

.expand-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.expand-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
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
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 12px;
  color: #6b7280;
}

.detail-value {
  font-size: 14px;
  color: #1f2937;
}

.flow-timeline {
  padding-left: 8px;
}

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
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 6px;
  margin-top: 4px;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

/* 步骤弹窗 */
.step-dialog :deep(.el-dialog__body) {
  padding: 0 20px;
}

.step-content {
  padding: 24px 0;
  min-height: 300px;
}

.step-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-search {
  margin-bottom: 16px;
}

.elderly-list {
  max-height: 360px;
  overflow-y: auto;
}

.elderly-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  margin-bottom: 8px;
}

.elderly-item:hover {
  background: #f5f7fa;
}

.elderly-item.selected {
  background: #e6f4ff;
  border-color: #1677ff;
}

.elderly-info-select {
  flex: 1;
}

.elderly-name {
  font-weight: 500;
  color: #1f2937;
}

.elderly-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.selected-icon {
  color: #1677ff;
  font-size: 20px;
}

/* 确认区域 */
.confirm-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
}

.confirm-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.confirm-title .el-icon {
  color: #1677ff;
}

.confirm-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.confirm-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.confirm-item.full {
  grid-column: 1 / -1;
}

.confirm-label {
  font-size: 12px;
  color: #6b7280;
}

.confirm-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.priority-text-urgent { color: #ff4d4f; }
.priority-text-high { color: #faad14; }
.priority-text-normal { color: #1677ff; }
.priority-text-low { color: #6b7280; }

/* 派单弹窗 */
.assign-dialog-content {
  max-height: 500px;
  overflow-y: auto;
}

.assign-order-info {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.assign-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.assign-label {
  font-size: 12px;
  color: #6b7280;
}

.assign-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.provider-search {
  margin-bottom: 12px;
}

.provider-list {
  max-height: 320px;
  overflow-y: auto;
}

.provider-item {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.provider-item:hover {
  border-color: #1677ff;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.1);
}

.provider-item.selected {
  border-color: #1677ff;
  background: #e6f4ff;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.provider-name {
  font-weight: 600;
  color: #1f2937;
}

.provider-rating {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rating-score {
  font-size: 14px;
  font-weight: 600;
  color: #faad14;
}

.provider-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.provider-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.provider-tags {
  display: flex;
  gap: 8px;
}

.provider-selected-icon {
  position: absolute;
  top: 16px;
  right: 16px;
  color: #1677ff;
  font-size: 20px;
}

/* 详情弹窗 */
.detail-dialog :deep(.el-dialog__body) {
  padding: 0 20px 20px;
}

.detail-wrapper {
  max-height: 600px;
  overflow-y: auto;
}

.detail-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 20px;
}

.status-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.status-tag-large,
.priority-tag-large {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.status-tag-large.status-created { background: #f3f4f6; color: #6b7280; }
.status-tag-large.status-assigned { background: #e6f4ff; color: #1677ff; }
.status-tag-large.status-in_progress { background: #fff7e6; color: #faad14; }
.status-tag-large.status-completed { background: #f6ffed; color: #52c41a; }
.status-tag-large.status-reviewed { background: #f6ffed; color: #52c41a; }
.status-tag-large.status-cancelled { background: #fff1f0; color: #ff4d4f; }

.priority-tag-large {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.priority-tag-large.priority-urgent { background: #fff1f0; color: #ff4d4f; }
.priority-tag-large.priority-high { background: #fff7e6; color: #faad14; }
.priority-tag-large.priority-normal { background: #e6f4ff; color: #1677ff; }
.priority-tag-large.priority-low { background: #f3f4f6; color: #6b7280; }

.order-no {
  font-size: 13px;
  color: #6b7280;
}

.detail-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.section-header .el-icon {
  color: #1677ff;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-info-item.full-width {
  grid-column: 1 / -1;
}

.detail-info-label {
  font-size: 13px;
  color: #6b7280;
}

.detail-info-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.detail-info-value.description {
  font-weight: normal;
  line-height: 1.6;
  color: #374151;
}

/* 评价内容 */
.review-content {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
}

.review-rating {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.review-score {
  font-size: 18px;
  font-weight: 700;
  color: #faad14;
}

.review-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
  margin-bottom: 12px;
}

.review-time {
  font-size: 12px;
  color: #6b7280;
}

/* 流转记录详情 */
.flow-record-detail {
  background: #f9fafb;
  border-radius: 8px;
  padding: 12px;
}

.flow-record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.flow-record-header .flow-action {
  font-weight: 600;
  color: #1f2937;
}

.flow-record-header .flow-operator {
  font-size: 12px;
  color: #6b7280;
}

.flow-remark-detail {
  font-size: 13px;
  color: #374151;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  border-left: 3px solid #1677ff;
}

/* 跟踪弹窗 */
.track-content {
  padding: 20px;
}

.track-status-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding: 0 20px;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e5e7eb;
  border: 3px solid #f3f4f6;
  transition: all 0.3s;
}

.flow-step.active .step-dot {
  background: #1677ff;
  border-color: #e6f4ff;
}

.step-label {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

.flow-step.active .step-label {
  color: #1677ff;
}

.flow-line {
  flex: 1;
  height: 2px;
  background: #e5e7eb;
  margin: 0 8px;
  margin-bottom: 24px;
  transition: all 0.3s;
}

.flow-line.active {
  background: #1677ff;
}

.track-info {
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.track-info-title {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.track-info-value {
  font-size: 20px;
  font-weight: 700;
}

.track-info-value.status-created { color: #6b7280; }
.track-info-value.status-assigned { color: #1677ff; }
.track-info-value.status-in_progress { color: #faad14; }
.track-info-value.status-completed { color: #52c41a; }
.track-info-value.status-reviewed { color: #52c41a; }
.track-info-value.status-cancelled { color: #ff4d4f; }

/* 响应式 */
@media (max-width: 1200px) {
  .stats-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .expand-grid {
    grid-template-columns: 1fr;
  }

  .confirm-content {
    grid-template-columns: 1fr;
  }
}
</style>

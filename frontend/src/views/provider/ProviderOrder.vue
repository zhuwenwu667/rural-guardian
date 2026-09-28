<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document, Loading, CircleCheck, Star, Search, Refresh,
  View, Check, Close, Plus, User
} from '@element-plus/icons-vue'
import {
  getOrderFlowList,
  acceptOrder,
  rejectOrder,
  startOrder,
  completeOrder,
  getOrderFlowDetail
} from '../../api/order-flow'

// ==================== 映射表 ====================
const typeMap = {
  MEDICAL: '医疗',
  LIFE_CARE: '生活照料',
  EMERGENCY: '紧急救援',
  COMPANION: '陪护',
  OTHER: '其他'
}

const statusMap = {
  CREATED: '待派单',
  ASSIGNED: '已派单',
  IN_PROGRESS: '进行中',
  PENDING_REVIEW: '待评价',
  COMPLETED: '已完成'
}

const priorityMap = {
  URGENT: '紧急',
  HIGH: '高',
  NORMAL: '普通',
  LOW: '低'
}

// ==================== 状态标签类型 ====================
function statusTagType(status) {
  const map = {
    CREATED: 'info',
    ASSIGNED: '',
    IN_PROGRESS: 'warning',
    PENDING_REVIEW: 'warning',
    COMPLETED: 'success'
  }
  return map[status] || 'info'
}

function priorityTagType(priority) {
  const map = {
    URGENT: 'danger',
    HIGH: 'warning',
    NORMAL: '',
    LOW: 'info'
  }
  return map[priority] || 'info'
}

function flowTimelineType(action) {
  if (!action) return 'primary'
  const actionStr = action.toLowerCase()
  if (actionStr.includes('accept') || actionStr.includes('接单') || actionStr.includes('start') || actionStr.includes('开始')) {
    return 'primary'
  }
  if (actionStr.includes('complete') || actionStr.includes('完成') || actionStr.includes('review') || actionStr.includes('评价')) {
    return 'success'
  }
  if (actionStr.includes('reject') || actionStr.includes('reject') || actionStr.includes('cancel') || actionStr.includes('取消') || actionStr.includes('拒')) {
    return 'danger'
  }
  if (actionStr.includes('assign') || actionStr.includes('派单') || actionStr.includes('create') || actionStr.includes('创建')) {
    return 'warning'
  }
  return 'primary'
}

// ==================== 数据状态 ====================
const loading = ref(false)
const submitting = ref(false)
const detailLoading = ref(false)
const tableData = ref([])

// 统计数据
const stats = reactive({
  assigned: 0,
  inProgress: 0,
  completed: 0,
  pendingReview: 0
})

// 筛选条件
const filters = reactive({
  type: '',
  status: '',
  priority: '',
  keyword: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 完成服务弹窗
const completeDialogVisible = ref(false)
const completeFormRef = ref(null)
const currentOrder = ref(null)
const completeForm = reactive({
  serviceDescription: '',
  serviceDuration: 60,
  photos: []
})

const completeRules = {
  serviceDescription: [
    { required: true, message: '请填写服务说明', trigger: 'blur' },
    { min: 10, message: '服务说明至少10个字符', trigger: 'blur' }
  ],
  serviceDuration: [
    { required: true, message: '请填写服务时长', trigger: 'change' }
  ]
}

// 详情弹窗
const detailDialogVisible = ref(false)
const orderDetail = ref(null)

// ==================== 数据获取 ====================
async function fetchData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filters.type) params.type = filters.type
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.keyword) params.keyword = filters.keyword

    const res = await getOrderFlowList(params)
    if (res.code === 200) {
      tableData.value = res.data.list || res.data.records || []
      pagination.total = res.data.total || 0
      // 更新统计
      updateStats(res.data.list || res.data.records || [])
    } else {
      ElMessage.error(res.message || '获取工单列表失败')
    }
  } catch (err) {
    console.error('获取工单列表失败:', err)
    ElMessage.error('获取工单列表失败')
  } finally {
    loading.value = false
  }
}

function updateStats(list) {
  stats.assigned = list.filter(item => item.status === 'ASSIGNED').length
  stats.inProgress = list.filter(item => item.status === 'IN_PROGRESS').length
  stats.completed = list.filter(item => item.status === 'COMPLETED').length
  stats.pendingReview = list.filter(item => item.status === 'PENDING_REVIEW').length
}

// ==================== 筛选操作 ====================
function handleFilterChange() {
  pagination.page = 1
  fetchData()
}

function resetFilters() {
  filters.type = ''
  filters.status = ''
  filters.priority = ''
  filters.keyword = ''
  pagination.page = 1
  fetchData()
}

// ==================== 接单操作 ====================
async function handleAccept(row) {
  try {
    await ElMessageBox.confirm(
      `确定接受工单【${row.orderNo || row.id}】吗？接单后请尽快为老人提供服务。`,
      '确认接单',
      {
        confirmButtonText: '确认接单',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    const res = await acceptOrder(row.id)
    if (res.code === 200) {
      ElMessage.success('接单成功')
      fetchData()
      // 如果详情弹窗打开，刷新详情
      if (detailDialogVisible.value && orderDetail.value?.id === row.id) {
        fetchOrderDetail(row.id)
      }
    } else {
      ElMessage.error(res.message || '接单失败')
    }
  } catch (err) {
    if (err !== 'cancel' && err?.message !== 'cancel') {
      console.error('接单失败:', err)
      ElMessage.error('接单失败')
    }
  }
}

// ==================== 拒单操作 ====================
async function handleReject(row) {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      `请输入拒单原因（工单【${row.orderNo || row.id}】）：`,
      '确认拒单',
      {
        confirmButtonText: '确认拒单',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '请说明拒单原因...',
        inputValidator: (val) => {
          if (!val || val.trim().length < 2) return '请输入至少2个字符的拒单原因'
          return true
        }
      }
    )
    const res = await rejectOrder(row.id, { reason: reason })
    if (res.code === 200) {
      ElMessage.success('已拒绝该工单')
      fetchData()
      if (detailDialogVisible.value) {
        detailDialogVisible.value = false
      }
    } else {
      ElMessage.error(res.message || '拒单失败')
    }
  } catch (err) {
    if (err !== 'cancel' && err?.message !== 'cancel') {
      console.error('拒单失败:', err)
      ElMessage.error('拒单失败')
    }
  }
}

// ==================== 完成服务弹窗 ====================
function openCompleteDialog(row) {
  currentOrder.value = row
  completeForm.serviceDescription = ''
  completeForm.serviceDuration = 60
  completeForm.photos = []
  completeDialogVisible.value = true
}

function handlePhotoChange(file, fileList) {
  completeForm.photos = fileList
}

function handlePhotoRemove(file, fileList) {
  completeForm.photos = fileList
}

async function handleComplete() {
  if (!completeFormRef.value) return
  try {
    await completeFormRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const params = {
      serviceDescription: completeForm.serviceDescription,
      serviceDuration: completeForm.serviceDuration
    }
    const res = await completeOrder(currentOrder.value.id, params)
    if (res.code === 200) {
      ElMessage.success('服务已完成')
      completeDialogVisible.value = false
      fetchData()
      if (detailDialogVisible.value && orderDetail.value?.id === currentOrder.value?.id) {
        fetchOrderDetail(currentOrder.value.id)
      }
    } else {
      ElMessage.error(res.message || '完成服务失败')
    }
  } catch (err) {
    console.error('完成服务失败:', err)
    ElMessage.error('完成服务失败')
  } finally {
    submitting.value = false
  }
}

// ==================== 详情弹窗 ====================
async function openDetail(row) {
  detailDialogVisible.value = true
  detailLoading.value = true
  orderDetail.value = null
  try {
    const res = await getOrderFlowDetail(row.id)
    if (res.code === 200) {
      orderDetail.value = res.data
    } else {
      ElMessage.error(res.message || '获取工单详情失败')
      orderDetail.value = row
    }
  } catch (err) {
    console.error('获取工单详情失败:', err)
    ElMessage.error('获取工单详情失败')
    orderDetail.value = row
  } finally {
    detailLoading.value = false
  }
}

function fetchOrderDetail(id) {
  detailLoading.value = true
  getOrderFlowDetail(id)
    .then(res => {
      if (res.code === 200) {
        orderDetail.value = res.data
      }
    })
    .catch(err => {
      console.error('刷新详情失败:', err)
    })
    .finally(() => {
      detailLoading.value = false
    })
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="provider-order-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>工单管理</h2>
      <p class="page-desc">
        管理分配给您的服务工单，及时处理每一个服务请求
      </p>
    </div>

    <!-- 顶部统计卡片 -->
    <el-row
      :gutter="16"
      class="stat-cards"
    >
      <el-col
        :xs="12"
        :sm="6"
      >
        <div class="stat-card stat-assigned">
          <div class="stat-icon">
            <el-icon :size="28">
              <Document />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">
              {{ stats.assigned }}
            </div>
            <div class="stat-label">
              待接单
            </div>
          </div>
        </div>
      </el-col>
      <el-col
        :xs="12"
        :sm="6"
      >
        <div class="stat-card stat-progress">
          <div class="stat-icon">
            <el-icon :size="28">
              <Loading />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">
              {{ stats.inProgress }}
            </div>
            <div class="stat-label">
              进行中
            </div>
          </div>
        </div>
      </el-col>
      <el-col
        :xs="12"
        :sm="6"
      >
        <div class="stat-card stat-completed">
          <div class="stat-icon">
            <el-icon :size="28">
              <CircleCheck />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">
              {{ stats.completed }}
            </div>
            <div class="stat-label">
              已完成
            </div>
          </div>
        </div>
      </el-col>
      <el-col
        :xs="12"
        :sm="6"
      >
        <div class="stat-card stat-reviewed">
          <div class="stat-icon">
            <el-icon :size="28">
              <Star />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">
              {{ stats.pendingReview }}
            </div>
            <div class="stat-label">
              待评价
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select
        v-model="filters.type"
        placeholder="工单类型"
        clearable
        style="width: 150px"
        @change="handleFilterChange"
      >
        <el-option
          v-for="(label, key) in typeMap"
          :key="key"
          :label="label"
          :value="key"
        />
      </el-select>
      <el-select
        v-model="filters.status"
        placeholder="工单状态"
        clearable
        style="width: 150px"
        @change="handleFilterChange"
      >
        <el-option
          v-for="(label, key) in statusMap"
          :key="key"
          :label="label"
          :value="key"
        />
      </el-select>
      <el-select
        v-model="filters.priority"
        placeholder="优先级"
        clearable
        style="width: 130px"
        @change="handleFilterChange"
      >
        <el-option
          v-for="(label, key) in priorityMap"
          :key="key"
          :label="label"
          :value="key"
        />
      </el-select>
      <el-input
        v-model="filters.keyword"
        placeholder="搜索老人姓名/工单号"
        clearable
        style="width: 200px"
        @keyup.enter="handleFilterChange"
        @clear="handleFilterChange"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button
        type="primary"
        @click="fetchData"
      >
        <el-icon><Search /></el-icon>查询
      </el-button>
      <el-button @click="resetFilters">
        <el-icon><Refresh /></el-icon>重置
      </el-button>
    </div>

    <!-- 工单列表 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      stripe
      border
      row-key="id"
      style="width: 100%"
    >
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="expand-content">
            <el-descriptions
              :column="3"
              border
              size="small"
            >
              <el-descriptions-item label="工单编号">
                {{ row.orderNo || row.id }}
              </el-descriptions-item>
              <el-descriptions-item label="工单类型">
                <el-tag size="small">
                  {{ typeMap[row.type] || row.type }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="优先级">
                <el-tag
                  :type="priorityTagType(row.priority)"
                  size="small"
                >
                  {{ priorityMap[row.priority] || row.priority }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="老人姓名">
                {{ row.elderlyName }}
              </el-descriptions-item>
              <el-descriptions-item label="联系电话">
                {{ row.elderlyPhone }}
              </el-descriptions-item>
              <el-descriptions-item
                label="服务地址"
                :span="3"
              >
                {{ row.elderlyAddress }}
              </el-descriptions-item>
              <el-descriptions-item
                label="服务描述"
                :span="3"
              >
                {{ row.description || '暂无描述' }}
              </el-descriptions-item>
              <el-descriptions-item label="预约时间">
                {{ row.scheduledTime || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ row.createdAt }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ row.updatedAt || '-' }}
              </el-descriptions-item>
            </el-descriptions>

            <!-- 流转记录 -->
            <div
              v-if="row.flowRecords && row.flowRecords.length > 0"
              class="flow-record"
            >
              <h4 class="flow-title">
                流转记录
              </h4>
              <el-timeline>
                <el-timeline-item
                  v-for="(record, index) in row.flowRecords"
                  :key="index"
                  :timestamp="record.createdAt || record.time"
                  placement="top"
                  :type="flowTimelineType(record.action || record.status)"
                >
                  <div class="flow-item">
                    <span class="flow-action">{{ record.action || record.statusName || statusMap[record.status] || record.status }}</span>
                    <span
                      v-if="record.operatorName"
                      class="flow-operator"
                    >操作人：{{ record.operatorName }}</span>
                    <span
                      v-if="record.remark"
                      class="flow-remark"
                    >备注：{{ record.remark }}</span>
                  </div>
                </el-timeline-item>
              </el-timeline>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column
        prop="orderNo"
        label="工单编号"
        width="150"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span
            class="order-no-link"
            @click="openDetail(row)"
          >{{ row.orderNo || row.id }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="elderlyName"
        label="老人姓名"
        width="100"
      />
      <el-table-column
        prop="elderlyPhone"
        label="联系电话"
        width="130"
      />
      <el-table-column
        prop="type"
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag size="small">
            {{ typeMap[row.type] || row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="priority"
        label="优先级"
        width="80"
        align="center"
      >
        <template #default="{ row }">
          <el-tag
            :type="priorityTagType(row.priority)"
            size="small"
            effect="dark"
          >
            {{ priorityMap[row.priority] || row.priority }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="status"
        label="状态"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusTagType(row.status)"
            size="small"
          >
            {{ statusMap[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="description"
        label="描述"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="createdAt"
        label="创建时间"
        width="170"
      />
      <el-table-column
        label="操作"
        width="240"
        fixed="right"
        align="center"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            text
            size="small"
            @click="openDetail(row)"
          >
            <el-icon><View /></el-icon>详情
          </el-button>
          <!-- 待接单状态：接单 + 拒单 -->
          <template v-if="row.status === 'ASSIGNED'">
            <el-button
              type="success"
              text
              size="small"
              @click="handleAccept(row)"
            >
              <el-icon><Check /></el-icon>接单
            </el-button>
            <el-button
              type="danger"
              text
              size="small"
              @click="handleReject(row)"
            >
              <el-icon><Close /></el-icon>拒单
            </el-button>
          </template>
          <!-- 进行中状态：完成服务 -->
          <template v-if="row.status === 'IN_PROGRESS'">
            <el-button
              type="warning"
              text
              size="small"
              @click="openCompleteDialog(row)"
            >
              <el-icon><CircleCheck /></el-icon>完成服务
            </el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && tableData.length === 0"
      description="暂无工单数据"
    />

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </div>

    <!-- 完成服务弹窗 -->
    <el-dialog
      v-model="completeDialogVisible"
      title="完成服务"
      width="520px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form
        ref="completeFormRef"
        :model="completeForm"
        :rules="completeRules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="工单编号">
          <span class="form-text">{{ currentOrder?.orderNo || currentOrder?.id }}</span>
        </el-form-item>
        <el-form-item label="老人姓名">
          <span class="form-text">{{ currentOrder?.elderlyName }}</span>
        </el-form-item>
        <el-form-item
          label="服务说明"
          prop="serviceDescription"
        >
          <el-input
            v-model="completeForm.serviceDescription"
            type="textarea"
            :rows="4"
            placeholder="请详细描述本次服务内容和结果"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item
          label="服务时长"
          prop="serviceDuration"
        >
          <el-input-number
            v-model="completeForm.serviceDuration"
            :min="1"
            :max="720"
            :step="30"
            controls-position="right"
          />
          <span class="form-unit">分钟</span>
        </el-form-item>
        <el-form-item label="服务照片">
          <el-upload
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            :limit="4"
            accept="image/*"
            :on-change="handlePhotoChange"
            :on-remove="handlePhotoRemove"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="form-tip">
            最多上传4张照片，支持jpg/png格式
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">
          取 消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleComplete"
        >
          确认完成
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="工单详情"
      width="700px"
      destroy-on-close
    >
      <div
        v-loading="detailLoading"
        class="detail-content"
      >
        <template v-if="orderDetail">
          <!-- 基本信息 -->
          <h3 class="detail-section-title">
            基本信息
          </h3>
          <el-descriptions
            :column="2"
            border
            size="default"
          >
            <el-descriptions-item label="工单编号">
              {{ orderDetail.orderNo || orderDetail.id }}
            </el-descriptions-item>
            <el-descriptions-item label="工单状态">
              <el-tag :type="statusTagType(orderDetail.status)">
                {{ statusMap[orderDetail.status] || orderDetail.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="工单类型">
              <el-tag size="small">
                {{ typeMap[orderDetail.type] || orderDetail.type }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="优先级">
              <el-tag
                :type="priorityTagType(orderDetail.priority)"
                size="small"
                effect="dark"
              >
                {{ priorityMap[orderDetail.priority] || orderDetail.priority }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="老人姓名">
              {{ orderDetail.elderlyName }}
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              {{ orderDetail.elderlyPhone }}
            </el-descriptions-item>
            <el-descriptions-item
              label="服务地址"
              :span="2"
            >
              {{ orderDetail.elderlyAddress }}
            </el-descriptions-item>
            <el-descriptions-item
              label="服务描述"
              :span="2"
            >
              {{ orderDetail.description || '暂无描述' }}
            </el-descriptions-item>
            <el-descriptions-item label="预约时间">
              {{ orderDetail.scheduledTime || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ orderDetail.createdAt }}
            </el-descriptions-item>
          </el-descriptions>

          <!-- 服务信息（进行中/已完成时显示） -->
          <template v-if="orderDetail.serviceDescription || orderDetail.serviceDuration">
            <h3 class="detail-section-title">
              服务信息
            </h3>
            <el-descriptions
              :column="2"
              border
              size="default"
            >
              <el-descriptions-item
                label="服务说明"
                :span="2"
              >
                {{ orderDetail.serviceDescription }}
              </el-descriptions-item>
              <el-descriptions-item label="服务时长">
                {{ orderDetail.serviceDuration ? orderDetail.serviceDuration + ' 分钟' : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="完成时间">
                {{ orderDetail.completedAt || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </template>

          <!-- 流转记录时间线 -->
          <template v-if="orderDetail.flowRecords && orderDetail.flowRecords.length > 0">
            <h3 class="detail-section-title">
              流转记录
            </h3>
            <el-timeline>
              <el-timeline-item
                v-for="(record, index) in orderDetail.flowRecords"
                :key="index"
                :timestamp="record.createdAt || record.time"
                placement="top"
                :type="flowTimelineType(record.action || record.status)"
                :hollow="index < orderDetail.flowRecords.length - 1"
              >
                <el-card
                  shadow="never"
                  class="flow-card"
                >
                  <div class="flow-card-header">
                    <span class="flow-action-tag">{{ record.action || record.statusName || statusMap[record.status] || record.status }}</span>
                    <span
                      v-if="record.operatorName"
                      class="flow-operator"
                    >
                      <el-icon><User /></el-icon>{{ record.operatorName }}
                    </span>
                  </div>
                  <div class="flow-card-body">
                    <span
                      v-if="record.remark"
                      class="flow-remark"
                    >{{ record.remark }}</span>
                  </div>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </template>

          <!-- 操作按钮 -->
          <div
            v-if="orderDetail.status === 'ASSIGNED' || orderDetail.status === 'IN_PROGRESS'"
            class="detail-actions"
          >
            <el-divider />
            <el-button
              v-if="orderDetail.status === 'ASSIGNED'"
              type="success"
              @click="handleAccept(orderDetail)"
            >
              <el-icon><Check /></el-icon>接单
            </el-button>
            <el-button
              v-if="orderDetail.status === 'ASSIGNED'"
              type="danger"
              plain
              @click="handleReject(orderDetail)"
            >
              <el-icon><Close /></el-icon>拒单
            </el-button>
            <el-button
              v-if="orderDetail.status === 'IN_PROGRESS'"
              type="warning"
              @click="detailDialogVisible = false; openCompleteDialog(orderDetail)"
            >
              <el-icon><CircleCheck /></el-icon>完成服务
            </el-button>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">
          关 闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.provider-order-page {
  padding: 20px;
  background: var(--bg-tertiary);
  min-height: calc(100vh - 120px);
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: var(--font-size-h2);
  font-weight: 600;
  color: var(--text);
  margin: 0 0 6px 0;
}

.page-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}

/* ==================== 统计卡片 ==================== */
.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  background: var(--card);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: default;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
}

.stat-assigned .stat-icon {
  background: linear-gradient(135deg, #e6f4ff, #bae0ff);
  color: var(--primary);
}

.stat-progress .stat-icon {
  background: linear-gradient(135deg, #fff7e6, #ffe7ba);
  color: var(--warning);
}

.stat-completed .stat-icon {
  background: linear-gradient(135deg, #f6ffed, #d9f7be);
  color: var(--success);
}

.stat-reviewed .stat-icon {
  background: linear-gradient(135deg, #fff0f6, #ffccc7);
  color: var(--danger);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* ==================== 筛选栏 ==================== */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 16px 20px;
  background: var(--card);
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

/* ==================== 展开行 ==================== */
.expand-content {
  padding: 16px 24px;
}

.flow-record {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-light);
}

.flow-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px 0;
}

.flow-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flow-action {
  font-weight: 500;
  color: var(--text);
}

.flow-operator {
  font-size: 12px;
  color: var(--text-muted);
}

.flow-remark {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ==================== 工单编号链接 ==================== */
.order-no-link {
  color: var(--primary);
  cursor: pointer;
  font-weight: 500;
}

.order-no-link:hover {
  text-decoration: underline;
}

/* ==================== 分页 ==================== */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 8px 0;
}

/* ==================== 完成服务弹窗 ==================== */
.form-text {
  color: var(--text-secondary);
  font-size: 14px;
}

.form-unit {
  margin-left: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.form-tip {
  font-size: 12px;
  color: var(--text-placeholder);
  margin-top: 4px;
}

/* ==================== 详情弹窗 ==================== */
.detail-content {
  max-height: 65vh;
  overflow-y: auto;
}

.detail-section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 20px 0 12px 0;
  padding-left: 10px;
  border-left: 3px solid var(--primary);
}

.detail-section-title:first-child {
  margin-top: 0;
}

.flow-card {
  padding: 4px 0;
}

.flow-card :deep(.el-card__body) {
  padding: 8px 12px;
}

.flow-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.flow-action-tag {
  font-weight: 500;
  color: var(--text);
}

.flow-operator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-muted);
}

.flow-card-body {
  margin-top: 4px;
}

.flow-remark {
  font-size: 13px;
  color: var(--text-secondary);
}

.detail-actions {
  margin-top: 16px;
  text-align: center;
}

.detail-actions .el-divider {
  margin: 12px 0 16px 0;
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .provider-order-page {
    padding: 12px;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-bar .el-select,
  .filter-bar .el-input {
    width: 100%;
  }

  .stat-card {
    padding: 14px;
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 22px;
  }
}
</style>

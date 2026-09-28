<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Loading,
  Star,
  CircleCheck,
  Search,
  Refresh,
  Plus
} from '@element-plus/icons-vue'
import {
  getOrderFlowList,
  createOrder,
  reviewOrder,
  getOrderFlowDetail
} from '@/api/order-flow'
import { getElderlyList } from '@/api/elderly'

// ==================== 映射表 ====================
const typeMap = {
  FALL: '跌倒',
  HEALTH: '健康异常',
  SOS: 'SOS求助',
  DEVICE: '设备异常',
  ABNORMAL: '行为异常'
}

const statusMap = {
  PENDING: '待接单',
  ACCEPTED: '已接单',
  PROCESSING: '处理中',
  CONFIRMING: '待确认',
  COMPLETED: '待验收',
  RESOLVED: '已解决',
  CLOSED: '已关闭'
}

const levelMap = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '紧急',
  P0: 'P0-紧急',
  P1: 'P1-高',
  P2: 'P2-中'
}

// ==================== 数据状态 ====================
const loading = ref(false)
const orderList = ref([])
const total = ref(0)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  serviceType: '',
  status: ''
})

const stats = reactive({
  processing: 0,
  pendingReview: 0,
  reviewed: 0
})

// 老人列表（创建预约用）
const elderlyList = ref([])

// 创建预约弹窗
const createDialogVisible = ref(false)
const submitLoading = ref(false)
const createFormRef = ref(null)
const createForm = reactive({
  elderlyId: '',
  serviceType: '',
  priority: 'MEDIUM',
  appointmentTime: '',
  description: ''
})

const createRules = {
  elderlyId: [{ required: true, message: '请选择老人', trigger: 'change' }],
  serviceType: [{ required: true, message: '请选择服务类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  appointmentTime: [{ required: true, message: '请选择预约时间', trigger: 'change' }],
  description: [{ required: true, message: '请输入服务描述', trigger: 'blur' }]
}

// 评价弹窗
const reviewDialogVisible = ref(false)
const reviewFormRef = ref(null)
const currentOrder = ref({})
const reviewForm = reactive({
  orderId: null,
  rating: 5,
  content: ''
})

const reviewRules = {
  rating: [{ required: true, message: '请选择评分', trigger: 'change' }],
  content: [{ required: true, message: '请输入评价内容', trigger: 'blur' }]
}

// 详情弹窗
const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const orderDetail = ref({})

// ==================== 标签样式 ====================
function getTypeTagType(type) {
  const map = {
    FALL: 'danger',
    HEALTH: 'warning',
    SOS: 'danger',
    DEVICE: 'info',
    ABNORMAL: 'warning'
  }
  return map[type] || ''
}

function getLevelTagType(level) {
  const map = {
    LOW: 'info',
    MEDIUM: '',
    HIGH: 'warning',
    CRITICAL: 'danger',
    P0: 'danger',
    P1: 'warning',
    P2: ''
  }
  return map[level] || ''
}

function getStatusTagType(status) {
  const map = {
    PENDING: 'info',
    ACCEPTED: '',
    PROCESSING: 'warning',
    CONFIRMING: 'warning',
    COMPLETED: 'success',
    RESOLVED: 'success',
    CLOSED: 'info'
  }
  return map[status] || ''
}

function getTimelineType(action) {
  const map = {
    CREATE: 'primary',
    ACCEPT: 'primary',
    PROCESS: 'warning',
    COMPLETE: 'success',
    REVIEW: 'success',
    RESOLVE: 'success',
    CLOSE: 'info'
  }
  return map[action] || 'primary'
}

// ==================== 数据加载 ====================
async function fetchOrderList() {
  loading.value = true
  try {
    const params = { ...queryParams }
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })
    const res = await getOrderFlowList(params)
    orderList.value = res.data?.records || res.data?.list || res.rows || []
    total.value = res.data?.total || res.total || 0
    updateStats()
  } catch (error) {
    console.error('获取工单列表失败:', error)
    ElMessage.error('获取工单列表失败')
  } finally {
    loading.value = false
  }
}

function updateStats() {
  stats.processing = orderList.value.filter(
    item => item.status === 'PENDING' || item.status === 'ACCEPTED' || item.status === 'PROCESSING'
  ).length
  stats.pendingReview = orderList.value.filter(item => item.status === 'COMPLETED').length
  stats.reviewed = orderList.value.filter(
    item => item.status === 'RESOLVED' || item.status === 'CLOSED'
  ).length
}

async function fetchElderlyList() {
  try {
    const res = await getElderlyList()
    elderlyList.value = res.data?.records || res.data?.list || res.data || []
  } catch (error) {
    console.error('获取老人列表失败:', error)
  }
}

// ==================== 搜索与重置 ====================
function handleSearch() {
  queryParams.pageNum = 1
  fetchOrderList()
}

function handleReset() {
  queryParams.serviceType = ''
  queryParams.status = ''
  queryParams.pageNum = 1
  fetchOrderList()
}

// ==================== 创建预约 ====================
function handleCreateOrder() {
  createForm.elderlyId = ''
  createForm.serviceType = ''
  createForm.priority = 'MEDIUM'
  createForm.appointmentTime = ''
  createForm.description = ''
  createDialogVisible.value = true
}

function disablePastDate(date) {
  return date.getTime() < Date.now() - 86400000
}

async function submitCreateOrder() {
  if (!createFormRef.value) return
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      await createOrder({ ...createForm })
      ElMessage.success('预约创建成功')
      createDialogVisible.value = false
      fetchOrderList()
    } catch (error) {
      console.error('创建预约失败:', error)
      ElMessage.error('创建预约失败，请重试')
    } finally {
      submitLoading.value = false
    }
  })
}

// ==================== 评价 ====================
function handleReview(row) {
  currentOrder.value = row
  reviewForm.orderId = row.id
  reviewForm.rating = 5
  reviewForm.content = ''
  reviewDialogVisible.value = true
}

async function submitReview() {
  if (!reviewFormRef.value) return
  await reviewFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      await reviewOrder({
        orderId: reviewForm.orderId,
        rating: reviewForm.rating,
        content: reviewForm.content
      })
      ElMessage.success('评价提交成功')
      reviewDialogVisible.value = false
      fetchOrderList()
    } catch (error) {
      console.error('评价提交失败:', error)
      ElMessage.error('评价提交失败，请重试')
    } finally {
      submitLoading.value = false
    }
  })
}

// ==================== 查看详情 ====================
async function handleViewDetail(row) {
  detailDialogVisible.value = true
  detailLoading.value = true
  orderDetail.value = {}
  try {
    const res = await getOrderFlowDetail(row.id)
    orderDetail.value = res.data || res || {}
  } catch (error) {
    console.error('获取工单详情失败:', error)
    ElMessage.error('获取工单详情失败')
  } finally {
    detailLoading.value = false
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchOrderList()
  fetchElderlyList()
})
</script>

<template>
  <div class="family-order-container">
    <!-- 顶部统计卡片 -->
    <el-row
      :gutter="16"
      class="stat-row"
    >
      <el-col :span="8">
        <el-card
          shadow="hover"
          class="stat-card stat-processing"
        >
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">
                进行中
              </div>
              <div class="stat-value">
                {{ stats.processing }}
              </div>
            </div>
            <el-icon
              class="stat-icon"
              :size="48"
            >
              <Loading />
            </el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card
          shadow="hover"
          class="stat-card stat-review"
        >
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">
                待评价
              </div>
              <div class="stat-value">
                {{ stats.pendingReview }}
              </div>
            </div>
            <el-icon
              class="stat-icon"
              :size="48"
            >
              <Star />
            </el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card
          shadow="hover"
          class="stat-card stat-reviewed"
        >
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">
                已评价
              </div>
              <div class="stat-value">
                {{ stats.reviewed }}
              </div>
            </div>
            <el-icon
              class="stat-icon"
              :size="48"
            >
              <CircleCheck />
            </el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选栏 -->
    <el-card
      shadow="never"
      class="filter-card"
    >
      <el-form
        :model="queryParams"
        inline
      >
        <el-form-item label="服务类型">
          <el-select
            v-model="queryParams.serviceType"
            placeholder="全部类型"
            clearable
            style="width: 160px"
          >
            <el-option
              v-for="(label, key) in typeMap"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="queryParams.status"
            placeholder="全部状态"
            clearable
            style="width: 160px"
          >
            <el-option
              v-for="(label, key) in statusMap"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="handleSearch"
          >
            <el-icon><Search /></el-icon>查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>重置
          </el-button>
          <el-button
            type="success"
            @click="handleCreateOrder"
          >
            <el-icon><Plus /></el-icon>创建预约
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 工单列表（展开行显示详情和流转记录） -->
    <el-card
      shadow="never"
      class="table-card"
    >
      <el-table
        v-loading="loading"
        :data="orderList"
        border
        stripe
        row-key="id"
        style="width: 100%"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-content">
              <el-row :gutter="24">
                <el-col :span="12">
                  <h4 class="expand-title">
                    工单详情
                  </h4>
                  <el-descriptions
                    :column="1"
                    border
                    size="small"
                  >
                    <el-descriptions-item label="工单编号">
                      {{ row.orderNo || row.id }}
                    </el-descriptions-item>
                    <el-descriptions-item label="老人姓名">
                      {{ row.elderlyName }}
                    </el-descriptions-item>
                    <el-descriptions-item label="服务类型">
                      <el-tag :type="getTypeTagType(row.serviceType)">
                        {{ typeMap[row.serviceType] || row.serviceType }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="优先级">
                      <el-tag
                        :type="getLevelTagType(row.priority)"
                        effect="dark"
                      >
                        {{ levelMap[row.priority] || row.priority }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="预约时间">
                      {{ row.appointmentTime || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="服务描述">
                      {{ row.description || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="处理人">
                      {{ row.handlerName || '-' }}
                    </el-descriptions-item>
                  </el-descriptions>
                </el-col>
                <el-col :span="12">
                  <h4 class="expand-title">
                    流转记录
                  </h4>
                  <div v-if="row.flowRecords && row.flowRecords.length">
                    <el-timeline>
                      <el-timeline-item
                        v-for="(record, index) in row.flowRecords"
                        :key="index"
                        :timestamp="record.time"
                        placement="top"
                        :type="getTimelineType(record.action)"
                        :hollow="true"
                        size="small"
                      >
                        <div class="expand-timeline-content">
                          <div class="timeline-action">
                            {{ record.actionName || record.action }}
                          </div>
                          <div class="timeline-operator">
                            操作人：{{ record.operator || '-' }}
                          </div>
                          <div
                            v-if="record.remark"
                            class="timeline-remark"
                          >
                            {{ record.remark }}
                          </div>
                        </div>
                      </el-timeline-item>
                    </el-timeline>
                  </div>
                  <el-empty
                    v-else
                    description="暂无流转记录"
                    :image-size="50"
                  />
                </el-col>
              </el-row>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="elderlyName"
          label="老人姓名"
          width="120"
          align="center"
        />
        <el-table-column
          prop="serviceType"
          label="服务类型"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.serviceType)">
              {{ typeMap[row.serviceType] || row.serviceType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="priority"
          label="优先级"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="getLevelTagType(row.priority)"
              effect="dark"
            >
              {{ levelMap[row.priority] || row.priority }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="状态"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ statusMap[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="description"
          label="服务描述"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="appointmentTime"
          label="预约时间"
          width="170"
          align="center"
        />
        <el-table-column
          prop="createTime"
          label="创建时间"
          width="170"
          align="center"
        />
        <el-table-column
          label="操作"
          width="160"
          align="center"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'COMPLETED'"
              link
              type="warning"
              size="small"
              @click="handleReview(row)"
            >
              评价
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchOrderList"
          @current-change="fetchOrderList"
        />
      </div>
    </el-card>

    <!-- 创建预约弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建服务预约"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item
          label="选择老人"
          prop="elderlyId"
        >
          <el-select
            v-model="createForm.elderlyId"
            placeholder="请选择老人"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="item in elderlyList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="服务类型"
          prop="serviceType"
        >
          <el-select
            v-model="createForm.serviceType"
            placeholder="请选择服务类型"
            style="width: 100%"
          >
            <el-option
              v-for="(label, key) in typeMap"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="优先级"
          prop="priority"
        >
          <el-radio-group v-model="createForm.priority">
            <el-radio value="LOW">
              低
            </el-radio>
            <el-radio value="MEDIUM">
              中
            </el-radio>
            <el-radio value="HIGH">
              高
            </el-radio>
            <el-radio value="CRITICAL">
              紧急
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          label="预约时间"
          prop="appointmentTime"
        >
          <el-date-picker
            v-model="createForm.appointmentTime"
            type="datetime"
            placeholder="请选择预约时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
            :disabled-date="disablePastDate"
          />
        </el-form-item>
        <el-form-item
          label="服务描述"
          prop="description"
        >
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="4"
            placeholder="请描述服务需求"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitCreateOrder"
        >
          提交预约
        </el-button>
      </template>
    </el-dialog>

    <!-- 评价弹窗 -->
    <el-dialog
      v-model="reviewDialogVisible"
      title="服务评价"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="reviewFormRef"
        :model="reviewForm"
        :rules="reviewRules"
        label-width="80px"
      >
        <el-form-item label="工单信息">
          <el-descriptions
            :column="1"
            border
            size="small"
          >
            <el-descriptions-item label="老人姓名">
              {{ currentOrder.elderlyName }}
            </el-descriptions-item>
            <el-descriptions-item label="服务类型">
              {{ typeMap[currentOrder.serviceType] || currentOrder.serviceType }}
            </el-descriptions-item>
            <el-descriptions-item label="服务描述">
              {{ currentOrder.description || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-form-item>
        <el-form-item
          label="服务评分"
          prop="rating"
        >
          <el-rate
            v-model="reviewForm.rating"
            :texts="['很差', '较差', '一般', '满意', '非常满意']"
            show-text
            :colors="['#F7BA2A', '#F7BA2A', '#F7BA2A']"
          />
        </el-form-item>
        <el-form-item
          label="评价内容"
          prop="content"
        >
          <el-input
            v-model="reviewForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入评价内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitReview"
        >
          提交评价
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="工单详情"
      width="700px"
    >
      <div v-loading="detailLoading">
        <el-descriptions
          :column="2"
          border
          class="detail-desc"
        >
          <el-descriptions-item label="工单编号">
            {{ orderDetail.orderNo || orderDetail.id }}
          </el-descriptions-item>
          <el-descriptions-item label="老人姓名">
            {{ orderDetail.elderlyName }}
          </el-descriptions-item>
          <el-descriptions-item label="服务类型">
            <el-tag :type="getTypeTagType(orderDetail.serviceType)">
              {{ typeMap[orderDetail.serviceType] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag
              :type="getLevelTagType(orderDetail.priority)"
              effect="dark"
            >
              {{ levelMap[orderDetail.priority] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusTagType(orderDetail.status)">
              {{ statusMap[orderDetail.status] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="预约时间">
            {{ orderDetail.appointmentTime || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="处理人">
            {{ orderDetail.handlerName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ orderDetail.createTime }}
          </el-descriptions-item>
          <el-descriptions-item
            label="服务描述"
            :span="2"
          >
            {{ orderDetail.description || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 评价信息 -->
        <div
          v-if="orderDetail.review"
          class="review-section"
        >
          <h4 class="section-title">
            评价信息
          </h4>
          <el-descriptions
            :column="2"
            border
            size="small"
          >
            <el-descriptions-item label="评分">
              <el-rate
                v-model="orderDetail.review.rating"
                disabled
              />
            </el-descriptions-item>
            <el-descriptions-item label="评价时间">
              {{ orderDetail.review.reviewTime }}
            </el-descriptions-item>
            <el-descriptions-item
              label="评价内容"
              :span="2"
            >
              {{ orderDetail.review.content }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 流转记录时间线 -->
        <div class="timeline-section">
          <h4 class="timeline-title">
            流转记录
          </h4>
          <el-timeline v-if="orderDetail.flowRecords && orderDetail.flowRecords.length">
            <el-timeline-item
              v-for="(record, index) in orderDetail.flowRecords"
              :key="index"
              :timestamp="record.time"
              placement="top"
              :type="getTimelineType(record.action)"
            >
              <div class="timeline-content">
                <div class="timeline-action">
                  {{ record.actionName || record.action }}
                </div>
                <div class="timeline-operator">
                  操作人：{{ record.operator || '-' }}
                </div>
                <div
                  v-if="record.remark"
                  class="timeline-remark"
                >
                  备注：{{ record.remark }}
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
      <template #footer>
        <el-button @click="detailDialogVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.family-order-container {
  padding: 20px;
}

.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  border-radius: 8px;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
}

.stat-processing .stat-value {
  color: var(--primary);
}

.stat-processing .stat-icon {
  color: var(--primary);
  opacity: 0.2;
}

.stat-review .stat-value {
  color: var(--warning);
}

.stat-review .stat-icon {
  color: var(--warning);
  opacity: 0.2;
}

.stat-reviewed .stat-value {
  color: var(--success);
}

.stat-reviewed .stat-icon {
  color: var(--success);
  opacity: 0.2;
}

.filter-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.table-card {
  border-radius: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 展开行样式 */
.expand-content {
  padding: 16px 24px;
}

.expand-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--primary);
}

.expand-timeline-content {
  padding: 2px 0;
}

.expand-timeline-content .timeline-action {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 2px;
}

.expand-timeline-content .timeline-operator {
  font-size: 12px;
  color: var(--text-muted);
}

.expand-timeline-content .timeline-remark {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

/* 详情弹窗 */
.detail-desc {
  margin-bottom: 24px;
}

.review-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--success);
}

.timeline-section {
  margin-top: 8px;
}

.timeline-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 3px solid var(--primary);
}

.timeline-content {
  padding: 4px 0;
}

.timeline-action {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.timeline-operator {
  font-size: 12px;
  color: var(--text-muted);
}

.timeline-remark {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}
</style>

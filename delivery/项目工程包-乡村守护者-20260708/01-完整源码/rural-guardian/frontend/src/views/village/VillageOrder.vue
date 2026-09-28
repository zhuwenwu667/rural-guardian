<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { getOrderFlowList, createOrder, assignOrder, cancelOrder, getOrderFlowDetail } from '../../api/order-flow'
import { getProviderList } from '../../api/provider'
import { getElderlyList } from '../../api/elderly'

const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref([])
const createDialogVisible = ref(false)
const assignDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const detailData = ref(null)
const createFormRef = ref(null)
const providerOptions = ref([])
const elderlyOptions = ref([])

const filters = reactive({ type: '', status: '', priority: '', keyword: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const stats = reactive({
  created: 0, assigned: 0, inProgress: 0, completed: 0, reviewed: 0
})

const createForm = reactive({ elderlyId: null, type: '', priority: 'NORMAL', appointmentTime: '', description: '' })
const assignForm = reactive({ id: null, elderlyName: '', providerId: null, assignType: 'MANUAL', remark: '' })

const createRules = {
  elderlyId: [{ required: true, message: '请选择老人', trigger: 'change' }],
  type: [{ required: true, message: '请选择服务类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  description: [{ required: true, message: '请输入工单描述', trigger: 'blur' }]
}

// 映射表
const typeMap = { MEDICAL: '医疗', LIFE_CARE: '生活照料', EMERGENCY: '紧急救援', COMPANION: '陪护', OTHER: '其他' }
const statusMap = { CREATED: '待派单', ASSIGNED: '已派单', IN_PROGRESS: '进行中', COMPLETED: '待验收', REVIEWED: '已评价', CANCELLED: '已取消' }
const priorityMap = { URGENT: '紧急', HIGH: '高', NORMAL: '普通', LOW: '低' }

function statusTagType(status) {
  const map = { CREATED: 'info', ASSIGNED: '', IN_PROGRESS: 'warning', COMPLETED: 'success', REVIEWED: 'success', CANCELLED: 'danger' }
  return map[status] || 'info'
}

function priorityTagType(priority) {
  const map = { URGENT: 'danger', HIGH: 'warning', NORMAL: '', LOW: 'info' }
  return map[priority] || 'info'
}

function flowRecordType(action) {
  const map = { CREATE: 'primary', ASSIGN: '', ACCEPT: 'warning', REJECT: 'danger', START: 'warning', COMPLETE: 'success', CANCEL: 'danger', REVIEW: 'success' }
  return map[action] || 'primary'
}

function flowActionText(action) {
  const map = { CREATE: '创建工单', ASSIGN: '派单', ACCEPT: '接单', REJECT: '拒单', START: '开始服务', COMPLETE: '完成服务', CANCEL: '取消工单', REVIEW: '评价' }
  return map[action] || action
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

async function fetchProviders() {
  try {
    const res = await getProviderList({ page: 1, pageSize: 200, status: 'ACTIVE' })
    if (res.code === 200) providerOptions.value = res.data.list || []
  } catch (err) { console.error(err) }
}

async function fetchElderly() {
  try {
    const res = await getElderlyList({ page: 1, pageSize: 200 })
    if (res.code === 200) elderlyOptions.value = res.data.list || []
  } catch (err) { console.error(err) }
}

// 创建工单
function openCreateDialog() {
  createForm.elderlyId = null
  createForm.type = ''
  createForm.priority = 'NORMAL'
  createForm.appointmentTime = ''
  createForm.description = ''
  createDialogVisible.value = true
}

async function submitCreate() {
  try { await createFormRef.value.validate() } catch { return }
  submitLoading.value = true
  try {
    const res = await createOrder(createForm)
    if (res.code === 200) {
      ElMessage.success('工单创建成功')
      createDialogVisible.value = false
      fetchData()
    }
  } catch (err) {
    ElMessage.error('创建失败')
  } finally {
    submitLoading.value = false
  }
}

// 派单
function openAssignDialog(row) {
  assignForm.id = row.id
  assignForm.elderlyName = row.elderly_name || row.elderlyName
  assignForm.providerId = null
  assignForm.assignType = 'MANUAL'
  assignForm.remark = ''
  assignDialogVisible.value = true
}

async function submitAssign() {
  if (assignForm.assignType === 'MANUAL' && !assignForm.providerId) {
    ElMessage.warning('请选择服务商')
    return
  }
  submitLoading.value = true
  try {
    const data = { assignType: assignForm.assignType, remark: assignForm.remark }
    if (assignForm.assignType === 'MANUAL') data.providerId = assignForm.providerId
    const res = await assignOrder(assignForm.id, data)
    if (res.code === 200) {
      ElMessage.success('派单成功')
      assignDialogVisible.value = false
      fetchData()
    }
  } catch (err) {
    ElMessage.error('派单失败')
  } finally {
    submitLoading.value = false
  }
}

// 取消工单
async function handleCancel(row) {
  try {
    await ElMessageBox.confirm('确认取消该工单？', '取消确认', { type: 'warning' })
    const { value: reason } = await ElMessageBox.prompt('请输入取消原因', '取消原因', { inputPlaceholder: '请输入取消原因' })
    const res = await cancelOrder(row.id, { reason })
    if (res.code === 200) {
      ElMessage.success('工单已取消')
      fetchData()
    }
  } catch (err) {
    if (err !== 'cancel' && err?.action !== 'cancel') ElMessage.error('操作失败')
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

onMounted(() => {
  fetchData()
  fetchProviders()
  fetchElderly()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2>工单处理</h2>
      <div class="header-actions">
        <el-button
          type="primary"
          @click="openCreateDialog"
        >
          <el-icon><Plus /></el-icon> 创建工单
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card created">
        <div class="stat-num">
          {{ stats.created }}
        </div>
        <div class="stat-text">
          待派单
        </div>
      </div>
      <div class="stat-card assigned">
        <div class="stat-num">
          {{ stats.assigned }}
        </div>
        <div class="stat-text">
          待接单
        </div>
      </div>
      <div class="stat-card in-progress">
        <div class="stat-num">
          {{ stats.inProgress }}
        </div>
        <div class="stat-text">
          进行中
        </div>
      </div>
      <div class="stat-card completed">
        <div class="stat-num">
          {{ stats.completed }}
        </div>
        <div class="stat-text">
          已完成
        </div>
      </div>
      <div class="stat-card reviewed">
        <div class="stat-num">
          {{ stats.reviewed }}
        </div>
        <div class="stat-text">
          已评价
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select
        v-model="filters.type"
        placeholder="工单类型"
        clearable
        style="width: 130px"
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
      <el-select
        v-model="filters.status"
        placeholder="工单状态"
        clearable
        style="width: 130px"
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
      <el-select
        v-model="filters.priority"
        placeholder="优先级"
        clearable
        style="width: 110px"
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
      <el-input
        v-model="filters.keyword"
        placeholder="搜索老人/服务商"
        clearable
        style="width: 160px"
        @keyup.enter="fetchData"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button
        type="primary"
        @click="fetchData"
      >
        查询
      </el-button>
      <el-button @click="resetFilters">
        重置
      </el-button>
    </div>

    <!-- 工单列表 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      stripe
      border
      row-key="id"
    >
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="expand-content">
            <div class="expand-section">
              <h4>工单详情</h4>
              <el-descriptions
                :column="2"
                border
                size="small"
              >
                <el-descriptions-item label="工单编号">
                  {{ row.order_no || row.id }}
                </el-descriptions-item>
                <el-descriptions-item label="服务类型">
                  {{ typeMap[row.type] || row.type }}
                </el-descriptions-item>
                <el-descriptions-item label="老人姓名">
                  {{ row.elderly_name || row.elderlyName }}
                </el-descriptions-item>
                <el-descriptions-item label="联系电话">
                  {{ row.elderly_phone || row.elderlyPhone }}
                </el-descriptions-item>
                <el-descriptions-item label="服务地址">
                  {{ row.service_address || row.elderlyAddress }}
                </el-descriptions-item>
                <el-descriptions-item label="预约时间">
                  {{ row.appointment_time || '-' }}
                </el-descriptions-item>
                <el-descriptions-item
                  label="工单描述"
                  :span="2"
                >
                  {{ row.description }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
            <div class="expand-section">
              <h4>流转记录</h4>
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
        min-width="130"
      >
        <template #default="{ row }">
          <div class="info-cell">
            <div class="info-name">
              {{ row.elderly_name || row.elderlyName }}
            </div>
            <div class="info-sub">
              {{ row.elderly_phone || row.elderlyPhone }}
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="type"
        label="类型"
        width="90"
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
        label="服务商"
        width="120"
      >
        <template #default="{ row }">
          {{ row.provider_name || row.providerName || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        label="创建时间"
        width="170"
      />
      <el-table-column
        label="操作"
        width="240"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'CREATED'"
            type="primary"
            size="small"
            @click="openAssignDialog(row)"
          >
            派单
          </el-button>
          <el-button
            v-if="row.status === 'CREATED'"
            type="success"
            size="small"
            @click="handleCancel(row)"
          >
            取消
          </el-button>
          <el-button
            v-if="row.status === 'ASSIGNED' || row.status === 'IN_PROGRESS'"
            type="warning"
            size="small"
            @click="viewDetail(row)"
          >
            跟踪
          </el-button>
          <el-button
            v-if="row.status === 'COMPLETED' || row.status === 'REVIEWED' || row.status === 'CANCELLED'"
            type="info"
            size="small"
            @click="viewDetail(row)"
          >
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && tableData.length === 0"
      description="暂无数据"
    />

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

    <!-- 创建工单对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建工单"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        label-width="100px"
        :rules="createRules"
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
              v-for="e in elderlyOptions"
              :key="e.id"
              :label="`${e.name} (${e.phone || e.id_card})`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="服务类型"
          prop="type"
        >
          <el-select
            v-model="createForm.type"
            placeholder="请选择服务类型"
            style="width: 100%"
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
        </el-form-item>
        <el-form-item
          label="优先级"
          prop="priority"
        >
          <el-radio-group v-model="createForm.priority">
            <el-radio label="URGENT">
              紧急
            </el-radio>
            <el-radio label="HIGH">
              高
            </el-radio>
            <el-radio label="NORMAL">
              普通
            </el-radio>
            <el-radio label="LOW">
              低
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="预约时间">
          <el-date-picker
            v-model="createForm.appointmentTime"
            type="datetime"
            placeholder="选择预约时间"
            style="width: 100%"
            value-format="YYYY-MM-DD HH:mm:ss"
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
            placeholder="请描述服务需求"
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
          @click="submitCreate"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 派单对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="派单"
      width="550px"
      destroy-on-close
    >
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #title>
          工单 #{{ assignForm.id }} - {{ assignForm.elderlyName }}
        </template>
      </el-alert>
      <el-form
        :model="assignForm"
        label-width="100px"
      >
        <el-form-item label="派单方式">
          <el-radio-group v-model="assignForm.assignType">
            <el-radio label="MANUAL">
              手动派单
            </el-radio>
            <el-radio label="AUTO">
              智能派单
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="assignForm.assignType === 'MANUAL'"
          label="选择服务商"
          required
        >
          <el-select
            v-model="assignForm.providerId"
            placeholder="请选择服务商"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="p in providerOptions"
              :key="p.id"
              :label="`${p.name} (评分: ${p.rating || '-'})`"
              :value="p.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>{{ p.name }}</span>
                <el-tag
                  size="small"
                  type="success"
                >
                  {{ p.rating || '暂无评分' }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="派单说明">
          <el-input
            v-model="assignForm.remark"
            type="textarea"
            :rows="2"
            placeholder="可选：备注派单要求"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitAssign"
        >
          确认派单
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="工单详情"
      width="650px"
      destroy-on-close
    >
      <div
        v-if="detailData"
        class="detail-content"
      >
        <el-descriptions
          :column="2"
          border
        >
          <el-descriptions-item label="工单ID">
            {{ detailData.id }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag
              :type="statusTagType(detailData.status)"
              size="small"
            >
              {{ statusMap[detailData.status] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="老人姓名">
            {{ detailData.elderly_name || detailData.elderlyName }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ detailData.elderly_phone || detailData.elderlyPhone }}
          </el-descriptions-item>
          <el-descriptions-item label="服务类型">
            {{ typeMap[detailData.type] }}
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag
              :type="priorityTagType(detailData.priority)"
              size="small"
              effect="dark"
            >
              {{ priorityMap[detailData.priority] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="服务商">
            {{ detailData.provider_name || detailData.providerName || '未分配' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ detailData.createdAt }}
          </el-descriptions-item>
          <el-descriptions-item
            label="工单描述"
            :span="2"
          >
            {{ detailData.description }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 评价信息 -->
        <template v-if="detailData.review">
          <div class="review-section">
            <h4>服务评价</h4>
            <el-descriptions
              :column="1"
              border
              size="small"
            >
              <el-descriptions-item label="评分">
                <el-rate
                  v-model="detailData.review.rating"
                  disabled
                />
              </el-descriptions-item>
              <el-descriptions-item label="评价内容">
                {{ detailData.review.content }}
              </el-descriptions-item>
              <el-descriptions-item label="评价时间">
                {{ detailData.review.created_at }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </template>

        <div class="detail-timeline">
          <h4>流转记录</h4>
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
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0; font-size: 20px; }

.stats-cards { display: flex; gap: 16px; margin-bottom: 20px; }
.stat-card {
  flex: 1; padding: 16px; border-radius: 8px; text-align: center;
  background: var(--bg-secondary); border: 1px solid var(--border);
}
.stat-num { font-size: 32px; font-weight: bold; margin-bottom: 4px; }
.stat-text { font-size: 13px; color: var(--text-muted); }
.stat-card.created .stat-num { color: var(--text-muted); }
.stat-card.assigned .stat-num { color: var(--primary); }
.stat-card.in-progress .stat-num { color: var(--warning); }
.stat-card.completed .stat-num { color: var(--success); }
.stat-card.reviewed .stat-num { color: var(--success); }

.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }

.info-cell { display: flex; flex-direction: column; }
.info-name { font-weight: 500; }
.info-sub { font-size: 12px; color: var(--text-muted); }

.expand-content { padding: 16px 24px; }
.expand-section { margin-bottom: 20px; }
.expand-section h4 { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); font-size: 14px; }

.flow-record { display: flex; flex-direction: column; gap: 4px; }
.flow-action { font-weight: 600; }
.flow-operator { font-size: 12px; color: var(--text-muted); }
.flow-remark { font-size: 13px; color: var(--text-secondary); margin-top: 4px; padding: 6px 10px; background: var(--bg-tertiary); border-radius: 4px; }

.detail-content { max-height: 600px; overflow-y: auto; }
.review-section { margin-top: 16px; }
.review-section h4 { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); font-size: 14px; }
.detail-timeline { margin-top: 20px; }
.detail-timeline h4 { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); font-size: 14px; }
</style>

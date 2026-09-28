<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Clock,
  CircleCheck,
  Warning,
  Search,
  Refresh
} from '@element-plus/icons-vue'
import {
  getAlertFlowList,
  confirmAlert,
  getAlertFlowDetail
} from '@/api/alert-flow'

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
const alertList = ref([])
const total = ref(0)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  type: '',
  status: ''
})

const stats = reactive({
  confirming: 0,
  confirmed: 0,
  appealed: 0
})

// 确认/申诉弹窗
const confirmDialogVisible = ref(false)
const submitLoading = ref(false)
const confirmFormRef = ref(null)
const currentAlert = ref({})
const confirmForm = reactive({
  action: 'confirm', // 'confirm' | 'appeal'
  alertId: null,
  remark: ''
})

const confirmRules = computed(() => ({
  remark: confirmForm.action === 'appeal'
    ? [{ required: true, message: '请输入申诉原因', trigger: 'blur' }]
    : []
}))

// 详情弹窗
const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const alertDetail = ref({})

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
    CONFIRM: 'success',
    APPEAL: 'danger',
    RESOLVE: 'success',
    CLOSE: 'info'
  }
  return map[action] || 'primary'
}

// ==================== 数据加载 ====================
async function fetchAlertList() {
  loading.value = true
  try {
    const params = { ...queryParams }
    // 清除空值
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })
    const res = await getAlertFlowList(params)
    alertList.value = res.data?.records || res.data?.list || res.rows || []
    total.value = res.data?.total || res.total || 0
    // 更新统计
    updateStats()
  } catch (error) {
    console.error('获取告警列表失败:', error)
    ElMessage.error('获取告警列表失败')
  } finally {
    loading.value = false
  }
}

function updateStats() {
  stats.confirming = alertList.value.filter(item => item.status === 'CONFIRMING').length
  stats.confirmed = alertList.value.filter(
    item => item.status === 'RESOLVED' || item.status === 'CLOSED'
  ).length
  stats.appealed = alertList.value.filter(
    item => item.status === 'APPEALING' || item.familyAction === 'APPEAL'
  ).length
}

// ==================== 搜索与重置 ====================
function handleSearch() {
  queryParams.pageNum = 1
  fetchAlertList()
}

function handleReset() {
  queryParams.type = ''
  queryParams.status = ''
  queryParams.pageNum = 1
  fetchAlertList()
}

// ==================== 确认通过 ====================
function handleConfirm(row) {
  currentAlert.value = row
  confirmForm.action = 'confirm'
  confirmForm.alertId = row.id
  confirmForm.remark = ''
  confirmDialogVisible.value = true
}

// ==================== 申诉 ====================
function handleAppeal(row) {
  currentAlert.value = row
  confirmForm.action = 'appeal'
  confirmForm.alertId = row.id
  confirmForm.remark = ''
  confirmDialogVisible.value = true
}

// ==================== 提交确认/申诉 ====================
async function submitConfirm() {
  if (!confirmFormRef.value) return
  await confirmFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      const params = {
        alertId: confirmForm.alertId,
        action: confirmForm.action === 'confirm' ? 'CONFIRM' : 'APPEAL',
        remark: confirmForm.remark
      }
      await confirmAlert(params)
      ElMessage.success(confirmForm.action === 'confirm' ? '确认通过成功' : '申诉提交成功')
      confirmDialogVisible.value = false
      fetchAlertList()
    } catch (error) {
      console.error('操作失败:', error)
      ElMessage.error('操作失败，请重试')
    } finally {
      submitLoading.value = false
    }
  })
}

// ==================== 查看详情 ====================
async function handleDetail(row) {
  detailDialogVisible.value = true
  detailLoading.value = true
  alertDetail.value = {}
  try {
    const res = await getAlertFlowDetail(row.id)
    alertDetail.value = res.data || res || {}
  } catch (error) {
    console.error('获取告警详情失败:', error)
    ElMessage.error('获取告警详情失败')
  } finally {
    detailLoading.value = false
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchAlertList()
})
</script>

<template>
  <div class="family-alert-container">
    <!-- 顶部统计卡片 -->
    <el-row
      :gutter="16"
      class="stat-row"
    >
      <el-col :span="8">
        <el-card
          shadow="hover"
          class="stat-card stat-confirming"
        >
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">
                待确认
              </div>
              <div class="stat-value">
                {{ stats.confirming }}
              </div>
            </div>
            <el-icon
              class="stat-icon"
              :size="48"
            >
              <Clock />
            </el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card
          shadow="hover"
          class="stat-card stat-confirmed"
        >
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">
                已确认
              </div>
              <div class="stat-value">
                {{ stats.confirmed }}
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
      <el-col :span="8">
        <el-card
          shadow="hover"
          class="stat-card stat-appealed"
        >
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">
                已申诉
              </div>
              <div class="stat-value">
                {{ stats.appealed }}
              </div>
            </div>
            <el-icon
              class="stat-icon"
              :size="48"
            >
              <Warning />
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
        <el-form-item label="告警类型">
          <el-select
            v-model="queryParams.type"
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
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 告警列表 -->
    <el-card
      shadow="never"
      class="table-card"
    >
      <el-table
        v-loading="loading"
        :data="alertList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column
          prop="elderlyName"
          label="老人姓名"
          width="120"
          align="center"
        />
        <el-table-column
          prop="type"
          label="告警类型"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ typeMap[row.type] || row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="level"
          label="级别"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="getLevelTagType(row.level)"
              effect="dark"
            >
              {{ levelMap[row.level] || row.level }}
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
          label="告警描述"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="createTime"
          label="告警时间"
          width="170"
          align="center"
        />
        <el-table-column
          label="操作"
          width="220"
          align="center"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="handleDetail(row)"
            >
              详情
            </el-button>
            <template v-if="row.status === 'CONFIRMING'">
              <el-button
                link
                type="success"
                size="small"
                @click="handleConfirm(row)"
              >
                确认通过
              </el-button>
              <el-button
                link
                type="warning"
                size="small"
                @click="handleAppeal(row)"
              >
                申诉
              </el-button>
            </template>
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
          @size-change="fetchAlertList"
          @current-change="fetchAlertList"
        />
      </div>
    </el-card>

    <!-- 确认/申诉弹窗 -->
    <el-dialog
      v-model="confirmDialogVisible"
      :title="confirmForm.action === 'confirm' ? '确认通过' : '申诉'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="confirmFormRef"
        :model="confirmForm"
        :rules="confirmRules"
        label-width="80px"
      >
        <el-form-item label="告警信息">
          <el-descriptions
            :column="1"
            border
            size="small"
          >
            <el-descriptions-item label="老人姓名">
              {{ currentAlert.elderlyName }}
            </el-descriptions-item>
            <el-descriptions-item label="告警类型">
              {{ typeMap[currentAlert.type] }}
            </el-descriptions-item>
            <el-descriptions-item label="告警级别">
              <el-tag
                :type="getLevelTagType(currentAlert.level)"
                effect="dark"
                size="small"
              >
                {{ levelMap[currentAlert.level] }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-form-item>
        <el-form-item
          label="说明"
          prop="remark"
        >
          <el-input
            v-model="confirmForm.remark"
            type="textarea"
            :rows="4"
            :placeholder="
              confirmForm.action === 'confirm'
                ? '请输入确认说明（选填）'
                : '请输入申诉原因（必填）'
            "
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="confirmDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitConfirm"
        >
          {{ confirmForm.action === 'confirm' ? '确认通过' : '提交申诉' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="告警详情"
      width="700px"
    >
      <div v-loading="detailLoading">
        <el-descriptions
          :column="2"
          border
          class="detail-desc"
        >
          <el-descriptions-item label="老人姓名">
            {{ alertDetail.elderlyName }}
          </el-descriptions-item>
          <el-descriptions-item label="告警类型">
            <el-tag :type="getTypeTagType(alertDetail.type)">
              {{ typeMap[alertDetail.type] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="告警级别">
            <el-tag
              :type="getLevelTagType(alertDetail.level)"
              effect="dark"
            >
              {{ levelMap[alertDetail.level] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusTagType(alertDetail.status)">
              {{ statusMap[alertDetail.status] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="告警时间">
            {{ alertDetail.createTime }}
          </el-descriptions-item>
          <el-descriptions-item label="告警位置">
            {{ alertDetail.location || '-' }}
          </el-descriptions-item>
          <el-descriptions-item
            label="告警描述"
            :span="2"
          >
            {{ alertDetail.description || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 流转记录时间线 -->
        <div class="timeline-section">
          <h4 class="timeline-title">
            流转记录
          </h4>
          <el-timeline v-if="alertDetail.flowRecords && alertDetail.flowRecords.length">
            <el-timeline-item
              v-for="(record, index) in alertDetail.flowRecords"
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
.family-alert-container {
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

.stat-confirming .stat-value {
  color: var(--warning);
}

.stat-confirming .stat-icon {
  color: var(--warning);
  opacity: 0.2;
}

.stat-confirmed .stat-value {
  color: var(--success);
}

.stat-confirmed .stat-icon {
  color: var(--success);
  opacity: 0.2;
}

.stat-appealed .stat-value {
  color: var(--danger);
}

.stat-appealed .stat-icon {
  color: var(--danger);
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

.detail-desc {
  margin-bottom: 24px;
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

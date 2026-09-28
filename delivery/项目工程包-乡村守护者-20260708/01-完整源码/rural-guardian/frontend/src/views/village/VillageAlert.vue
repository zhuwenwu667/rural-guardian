<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Search, Upload } from '@element-plus/icons-vue'
import { getAlertFlowList, acceptAlert, processAlert, escalateAlert, closeAlert, getAlertFlowDetail } from '../../api/alert-flow'

const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref([])
const pendingCount = ref(0)
const processDialogVisible = ref(false)
const escalateDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const detailData = ref(null)
const processFormRef = ref(null)

const filters = reactive({ level: '', type: '', status: '', keyword: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const stats = reactive({
  pending: 0,
  processing: 0,
  confirming: 0,
  resolved: 0,
  closed: 0
})

const processForm = reactive({ id: null, result: 'RESOLVED', remark: '' })
const escalateForm = reactive({ id: null, reason: '', remark: '' })

const processRules = {
  result: [{ required: true, message: '请选择处置结果', trigger: 'change' }],
  remark: [{ required: true, message: '请输入处置说明', trigger: 'blur' }]
}

// 映射表
const typeMap = { FALL: '跌倒', HEALTH: '健康异常', SOS: 'SOS求助', DEVICE: '设备异常', ABNORMAL: '行为异常', HEALTH_ABNORMAL: '健康异常', GEO_FENCE: '越界', DEVICE_OFFLINE: '设备离线' }
const levelMap = { LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '紧急', P0: 'P0-紧急', P1: 'P1-高', P2: 'P2-中' }
const statusMap = { PENDING: '待接单', ACCEPTED: '已接单', PROCESSING: '处理中', CONFIRMING: '待确认', RESOLVED: '已解决', CLOSED: '已关闭' }

function typeTagType(type) {
  const map = { FALL: 'danger', HEALTH: 'danger', SOS: 'danger', DEVICE: 'warning', ABNORMAL: 'warning', HEALTH_ABNORMAL: 'danger', GEO_FENCE: 'warning', DEVICE_OFFLINE: 'info' }
  return map[type] || 'info'
}

function levelTagType(level) {
  const map = { LOW: 'info', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger', P0: 'danger', P1: 'warning', P2: '' }
  return map[level] || 'info'
}

function statusTagType(status) {
  const map = { PENDING: 'danger', ACCEPTED: 'warning', PROCESSING: '', CONFIRMING: 'warning', RESOLVED: 'success', CLOSED: 'info' }
  return map[status] || 'info'
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
  filters.level = ''
  filters.type = ''
  filters.status = ''
  filters.keyword = ''
  pagination.page = 1
  fetchData()
}

function quickFilter(status) {
  filters.status = filters.status === status ? '' : status
  pagination.page = 1
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.level) params.level = filters.level
    if (filters.type) params.type = filters.type
    if (filters.status) params.status = filters.status
    if (filters.keyword) params.keyword = filters.keyword
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
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('加载告警列表失败')
  } finally {
    loading.value = false
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

onMounted(() => { fetchData() })
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2>预警处理</h2>
      <div class="header-actions">
        <el-badge
          :value="pendingCount"
          :hidden="pendingCount === 0"
          :max="99"
        >
          <el-button
            type="warning"
            @click="quickFilter('PENDING')"
          >
            <el-icon><Bell /></el-icon> 待处理
          </el-button>
        </el-badge>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card pending">
        <div class="stat-num">
          {{ stats.pending }}
        </div>
        <div class="stat-text">
          待接单
        </div>
      </div>
      <div class="stat-card processing">
        <div class="stat-num">
          {{ stats.processing }}
        </div>
        <div class="stat-text">
          处理中
        </div>
      </div>
      <div class="stat-card confirming">
        <div class="stat-num">
          {{ stats.confirming }}
        </div>
        <div class="stat-text">
          待确认
        </div>
      </div>
      <div class="stat-card resolved">
        <div class="stat-num">
          {{ stats.resolved }}
        </div>
        <div class="stat-text">
          已解决
        </div>
      </div>
      <div class="stat-card closed">
        <div class="stat-num">
          {{ stats.closed }}
        </div>
        <div class="stat-text">
          已关闭
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
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
      </el-select>
      <el-select
        v-model="filters.type"
        placeholder="预警类型"
        clearable
        style="width: 130px"
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
        @click="fetchData"
      >
        查询
      </el-button>
      <el-button @click="resetFilters">
        重置
      </el-button>
    </div>

    <!-- 告警列表 -->
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
              <h4>告警详情</h4>
              <el-descriptions
                :column="2"
                border
                size="small"
              >
                <el-descriptions-item label="老人姓名">
                  {{ row.elderly_name || row.elderlyName }}
                </el-descriptions-item>
                <el-descriptions-item label="联系电话">
                  {{ row.elderly_phone || row.elderlyPhone }}
                </el-descriptions-item>
                <el-descriptions-item label="地址">
                  {{ row.elderly_address || row.elderlyAddress }}
                </el-descriptions-item>
                <el-descriptions-item label="所属村庄">
                  {{ row.village_name }}
                </el-descriptions-item>
                <el-descriptions-item
                  label="告警内容"
                  :span="2"
                >
                  {{ row.description || row.content }}
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
        min-width="140"
      >
        <template #default="{ row }">
          <div class="elderly-cell">
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
        prop="type"
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="typeTagType(row.type)"
            size="small"
          >
            {{ typeMap[row.type] || row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="level"
        label="级别"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="levelTagType(row.level)"
            size="small"
            effect="dark"
          >
            {{ levelMap[row.level] || row.level }}
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
        label="处理人"
        width="100"
      >
        <template #default="{ row }">
          {{ row.handler_name || row.handlerName || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="createdAt"
        label="告警时间"
        width="170"
      />
      <el-table-column
        label="操作"
        width="220"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'PENDING'"
            type="primary"
            size="small"
            @click="handleAccept(row)"
          >
            接单
          </el-button>
          <el-button
            v-if="row.status === 'ACCEPTED' || row.status === 'PROCESSING'"
            type="warning"
            size="small"
            @click="openProcessDialog(row)"
          >
            处置
          </el-button>
          <el-button
            v-if="row.status === 'ACCEPTED' || row.status === 'PROCESSING'"
            type="info"
            size="small"
            @click="openEscalateDialog(row)"
          >
            升级
          </el-button>
          <el-button
            v-if="row.status === 'RESOLVED'"
            type="success"
            size="small"
            @click="handleClose(row)"
          >
            关闭
          </el-button>
          <el-button
            v-if="row.status === 'CONFIRMING' || row.status === 'CLOSED'"
            type="primary"
            size="small"
            text
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

    <!-- 处置对话框 -->
    <el-dialog
      v-model="processDialogVisible"
      title="告警处置"
      width="560px"
      destroy-on-close
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
        <el-form-item label="附件">
          <el-button size="small">
            <el-icon><Upload /></el-icon>上传图片
          </el-button>
          <span class="form-tip">支持现场照片等凭证</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
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
          <el-descriptions-item label="告警类型">
            {{ typeMap[detailData.type] }}
          </el-descriptions-item>
          <el-descriptions-item label="告警级别">
            <el-tag
              :type="levelTagType(detailData.level)"
              size="small"
              effect="dark"
            >
              {{ levelMap[detailData.level] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="告警时间">
            {{ detailData.createdAt }}
          </el-descriptions-item>
          <el-descriptions-item label="处理人">
            {{ detailData.handler_name || detailData.handlerName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item
            label="告警内容"
            :span="2"
          >
            {{ detailData.description || detailData.content }}
          </el-descriptions-item>
        </el-descriptions>

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
.stat-card.pending .stat-num { color: var(--danger); }
.stat-card.processing .stat-num { color: var(--warning); }
.stat-card.confirming .stat-num { color: var(--warning); }
.stat-card.resolved .stat-num { color: var(--success); }
.stat-card.closed .stat-num { color: var(--text-muted); }

.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }

.elderly-cell { display: flex; flex-direction: column; }
.elderly-name { font-weight: 500; }
.elderly-phone { font-size: 12px; color: var(--text-muted); }

.expand-content { padding: 16px 24px; }
.expand-section { margin-bottom: 20px; }
.expand-section h4 { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); font-size: 14px; }

.flow-record { display: flex; flex-direction: column; gap: 4px; }
.flow-action { font-weight: 600; }
.flow-operator { font-size: 12px; color: var(--text-muted); }
.flow-remark { font-size: 13px; color: var(--text-secondary); margin-top: 4px; padding: 6px 10px; background: var(--bg-tertiary); border-radius: 4px; }

.detail-content { max-height: 600px; overflow-y: auto; }
.detail-timeline { margin-top: 20px; }
.detail-timeline h4 { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); font-size: 14px; }

.form-tip { font-size: 12px; color: var(--text-muted); margin-left: 8px; }
</style>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { 
  getFamilyBindingList, 
  approveFamilyBinding,
  getDeviceBindingList,
  approveDeviceBinding,
  getApprovalStats 
} from '../../api/approval-center'

const activeTab = ref('family')
const loading = ref(false)
const dialogVisible = ref(false)
const currentItem = ref(null)
const dialogTitle = ref('')
const approvalForm = reactive({
  remark: ''
})

// 统计数据
const stats = reactive({
  pending: 0,
  approved: 0,
  rejected: 0
})

// 家属绑定筛选
const familyFilter = reactive({
  status: '',
  keyword: ''
})

// 设备绑定筛选
const deviceFilter = reactive({
  status: '',
  keyword: ''
})

// 分页
const familyPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const devicePagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const familyList = ref([])
const deviceList = ref([])

// 状态映射
const getStatusType = (status) => {
  const map = {
    'PENDING': 'warning',
    'APPROVED': 'success',
    'REJECTED': 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    'PENDING': '待审批',
    'APPROVED': '已通过',
    'REJECTED': '已拒绝'
  }
  return map[status] || status
}

// 格式化日期时间
const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await getApprovalStats()
    if (res.code === 200) {
      const data = res.data || {}
      if (activeTab.value === 'family') {
        stats.pending = data.family_pending || 0
        stats.approved = data.family_approved || 0
        stats.rejected = data.family_rejected || 0
      } else {
        stats.pending = data.device_pending || 0
        stats.approved = data.device_approved || 0
        stats.rejected = data.device_rejected || 0
      }
    }
  } catch (error) {
    console.error('加载统计失败', error)
  }
}

// 加载家属绑定列表
const loadFamilyBindings = async () => {
  loading.value = true
  try {
    const res = await getFamilyBindingList({
      page: familyPagination.page,
      pageSize: familyPagination.pageSize,
      status: familyFilter.status,
      keyword: familyFilter.keyword
    })
    if (res.code === 200) {
      familyList.value = res.data?.list || []
      familyPagination.total = res.data?.total || 0
    }
  } catch (error) {
    ElMessage.error('加载家属绑定列表失败')
  } finally {
    loading.value = false
  }
}

// 加载设备绑定列表
const loadDeviceBindings = async () => {
  loading.value = true
  try {
    const res = await getDeviceBindingList({
      page: devicePagination.page,
      pageSize: devicePagination.pageSize,
      status: deviceFilter.status,
      keyword: deviceFilter.keyword
    })
    if (res.code === 200) {
      deviceList.value = res.data?.list || []
      devicePagination.total = res.data?.total || 0
    }
  } catch (error) {
    ElMessage.error('加载设备绑定列表失败')
  } finally {
    loading.value = false
  }
}

// 显示详情
const showDetail = (row) => {
  currentItem.value = row
  dialogTitle.value = '家属绑定详情'
  approvalForm.remark = ''
  dialogVisible.value = true
}

const showDeviceDetail = (row) => {
  currentItem.value = row
  dialogTitle.value = '设备绑定详情'
  approvalForm.remark = ''
  dialogVisible.value = true
}

// 审批家属绑定
const handleApproveFamily = (row) => {
  currentItem.value = row
  dialogTitle.value = '审批家属绑定'
  approvalForm.remark = ''
  dialogVisible.value = true
}

const handleRejectFamily = (row) => {
  currentItem.value = row
  dialogTitle.value = '拒绝家属绑定'
  approvalForm.remark = ''
  dialogVisible.value = true
}

// 审批设备绑定
const handleApproveDevice = (row) => {
  currentItem.value = row
  dialogTitle.value = '审批设备绑定'
  approvalForm.remark = ''
  dialogVisible.value = true
}

const handleRejectDevice = (row) => {
  currentItem.value = row
  dialogTitle.value = '拒绝设备绑定'
  approvalForm.remark = ''
  dialogVisible.value = true
}

// 提交审批
const submitApprove = async () => {
  try {
    const api = activeTab.value === 'family' ? approveFamilyBinding : approveDeviceBinding
    const res = await api(currentItem.value.id, {
      approved: true,
      remark: approvalForm.remark
    })
    if (res.code === 200) {
      ElMessage.success('审批通过')
      dialogVisible.value = false
      loadStats()
      if (activeTab.value === 'family') {
        loadFamilyBindings()
      } else {
        loadDeviceBindings()
      }
    }
  } catch (error) {
    ElMessage.error('审批失败')
  }
}

const submitReject = async () => {
  try {
    await ElMessageBox.confirm('确定要拒绝该申请吗？', '确认', {
      type: 'warning'
    })
    const api = activeTab.value === 'family' ? approveFamilyBinding : approveDeviceBinding
    const res = await api(currentItem.value.id, {
      approved: false,
      remark: approvalForm.remark
    })
    if (res.code === 200) {
      ElMessage.success('已拒绝')
      dialogVisible.value = false
      loadStats()
      if (activeTab.value === 'family') {
        loadFamilyBindings()
      } else {
        loadDeviceBindings()
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

onMounted(() => {
  loadStats()
  loadFamilyBindings()
})
</script>

<template>
  <div class="village-approval">
    <el-card class="approval-header">
      <template #header>
        <div class="card-header">
          <span>审批中心</span>
          <el-radio-group
            v-model="activeTab"
            size="small"
          >
            <el-radio-button label="family">
              家属绑定
            </el-radio-button>
            <el-radio-button label="device">
              设备绑定
            </el-radio-button>
          </el-radio-group>
        </div>
      </template>
      
      <!-- 统计卡片 -->
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-value pending">
            {{ stats.pending }}
          </div>
          <div class="stat-label">
            待审批
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-value approved">
            {{ stats.approved }}
          </div>
          <div class="stat-label">
            已通过
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-value rejected">
            {{ stats.rejected }}
          </div>
          <div class="stat-label">
            已拒绝
          </div>
        </div>
      </div>
    </el-card>

    <!-- 家属绑定审批 -->
    <template v-if="activeTab === 'family'">
      <el-card class="approval-list">
        <template #header>
          <div class="list-header">
            <span>家属绑定申请</span>
            <div class="filter-bar">
              <el-select
                v-model="familyFilter.status"
                placeholder="审批状态"
                clearable
                size="small"
                style="width: 120px"
              >
                <el-option
                  label="待审批"
                  value="PENDING"
                />
                <el-option
                  label="已通过"
                  value="APPROVED"
                />
                <el-option
                  label="已拒绝"
                  value="REJECTED"
                />
              </el-select>
              <el-input
                v-model="familyFilter.keyword"
                placeholder="搜索申请人/老人姓名"
                size="small"
                style="width: 200px"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button
                type="primary"
                size="small"
                @click="loadFamilyBindings"
              >
                <el-icon><Refresh /></el-icon>刷新
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          v-loading="loading"
          :data="familyList"
          stripe
        >
          <el-table-column
            type="index"
            width="50"
          />
          <el-table-column
            label="申请人"
            min-width="120"
          >
            <template #default="{ row }">
              <div class="user-info">
                <el-avatar
                  :size="32"
                  :src="row.applicant_avatar"
                >
                  {{ row.applicant_name?.charAt(0) }}
                </el-avatar>
                <div class="user-detail">
                  <div class="user-name">
                    {{ row.applicant_name }}
                  </div>
                  <div class="user-phone">
                    {{ row.applicant_phone }}
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="申请绑定老人"
            min-width="120"
          >
            <template #default="{ row }">
              <div class="elderly-info">
                <div class="elderly-name">
                  {{ row.elderly_name }}
                </div>
                <el-tag
                  size="small"
                  type="info"
                >
                  {{ row.elderly_id_card }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="关系"
            width="100"
          >
            <template #default="{ row }">
              <el-tag
                size="small"
                type="primary"
              >
                {{ row.relationship }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="申请时间"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="100"
          >
            <template #default="{ row }">
              <el-tag
                :type="getStatusType(row.status)"
                size="small"
              >
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="150"
            fixed="right"
          >
            <template #default="{ row }">
              <template v-if="row.status === 'PENDING'">
                <el-button
                  type="success"
                  size="small"
                  @click="handleApproveFamily(row)"
                >
                  通过
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="handleRejectFamily(row)"
                >
                  拒绝
                </el-button>
              </template>
              <el-button
                v-else
                type="primary"
                size="small"
                text
                @click="showDetail(row)"
              >
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="familyPagination.page"
            v-model:page-size="familyPagination.pageSize"
            :total="familyPagination.total"
            layout="total, prev, pager, next"
            @current-change="loadFamilyBindings"
          />
        </div>
      </el-card>
    </template>

    <!-- 设备绑定审批 -->
    <template v-else>
      <el-card class="approval-list">
        <template #header>
          <div class="list-header">
            <span>设备绑定申请</span>
            <div class="filter-bar">
              <el-select
                v-model="deviceFilter.status"
                placeholder="审批状态"
                clearable
                size="small"
                style="width: 120px"
              >
                <el-option
                  label="待审批"
                  value="PENDING"
                />
                <el-option
                  label="已通过"
                  value="APPROVED"
                />
                <el-option
                  label="已拒绝"
                  value="REJECTED"
                />
              </el-select>
              <el-input
                v-model="deviceFilter.keyword"
                placeholder="搜索设备编号/老人姓名"
                size="small"
                style="width: 200px"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button
                type="primary"
                size="small"
                @click="loadDeviceBindings"
              >
                <el-icon><Refresh /></el-icon>刷新
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          v-loading="loading"
          :data="deviceList"
          stripe
        >
          <el-table-column
            type="index"
            width="50"
          />
          <el-table-column
            label="设备信息"
            min-width="150"
          >
            <template #default="{ row }">
              <div class="device-info">
                <div class="device-name">
                  {{ row.device_name }}
                </div>
                <div class="device-no">
                  {{ row.device_no }}
                </div>
                <el-tag
                  size="small"
                  type="info"
                >
                  {{ row.device_type }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="绑定老人"
            min-width="120"
          >
            <template #default="{ row }">
              <div class="elderly-info">
                <div class="elderly-name">
                  {{ row.elderly_name }}
                </div>
                <el-tag
                  size="small"
                  type="info"
                >
                  {{ row.elderly_id_card }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="安装地址"
            min-width="150"
          >
            <template #default="{ row }">
              {{ row.install_address }}
            </template>
          </el-table-column>
          <el-table-column
            label="申请时间"
            width="160"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            width="100"
          >
            <template #default="{ row }">
              <el-tag
                :type="getStatusType(row.status)"
                size="small"
              >
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="150"
            fixed="right"
          >
            <template #default="{ row }">
              <template v-if="row.status === 'PENDING'">
                <el-button
                  type="success"
                  size="small"
                  @click="handleApproveDevice(row)"
                >
                  通过
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="handleRejectDevice(row)"
                >
                  拒绝
                </el-button>
              </template>
              <el-button
                v-else
                type="primary"
                size="small"
                text
                @click="showDeviceDetail(row)"
              >
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="devicePagination.page"
            v-model:page-size="devicePagination.pageSize"
            :total="devicePagination.total"
            layout="total, prev, pager, next"
            @current-change="loadDeviceBindings"
          />
        </div>
      </el-card>
    </template>

    <!-- 审批弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <div
        v-if="currentItem"
        class="detail-content"
      >
        <div class="detail-section">
          <h4>申请信息</h4>
          <el-descriptions
            :column="1"
            border
          >
            <el-descriptions-item label="申请人">
              {{ currentItem.applicant_name }}
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              {{ currentItem.applicant_phone }}
            </el-descriptions-item>
            <el-descriptions-item label="申请时间">
              {{ formatDateTime(currentItem.created_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div class="detail-section">
          <h4>老人信息</h4>
          <el-descriptions
            :column="1"
            border
          >
            <el-descriptions-item label="姓名">
              {{ currentItem.elderly_name }}
            </el-descriptions-item>
            <el-descriptions-item label="身份证号">
              {{ currentItem.elderly_id_card }}
            </el-descriptions-item>
            <el-descriptions-item label="所属村庄">
              {{ currentItem.village_name }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div
          v-if="activeTab === 'family'"
          class="detail-section"
        >
          <h4>关系信息</h4>
          <el-descriptions
            :column="1"
            border
          >
            <el-descriptions-item label="与老人关系">
              {{ currentItem.relationship }}
            </el-descriptions-item>
            <el-descriptions-item label="是否主要联系人">
              <el-tag :type="currentItem.is_primary ? 'success' : 'info'">
                {{ currentItem.is_primary ? '是' : '否' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div
          v-else
          class="detail-section"
        >
          <h4>设备信息</h4>
          <el-descriptions
            :column="1"
            border
          >
            <el-descriptions-item label="设备名称">
              {{ currentItem.device_name }}
            </el-descriptions-item>
            <el-descriptions-item label="设备编号">
              {{ currentItem.device_no }}
            </el-descriptions-item>
            <el-descriptions-item label="设备类型">
              {{ currentItem.device_type }}
            </el-descriptions-item>
            <el-descriptions-item label="安装地址">
              {{ currentItem.install_address }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div
          v-if="currentItem.status === 'PENDING'"
          class="detail-section"
        >
          <h4>审批意见</h4>
          <el-input
            v-model="approvalForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入审批意见（选填）"
          />
        </div>

        <div
          v-if="currentItem.status !== 'PENDING'"
          class="detail-section"
        >
          <h4>审批记录</h4>
          <el-descriptions
            :column="1"
            border
          >
            <el-descriptions-item label="审批人">
              {{ currentItem.approver_name }}
            </el-descriptions-item>
            <el-descriptions-item label="审批时间">
              {{ formatDateTime(currentItem.approved_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="审批意见">
              {{ currentItem.approval_remark || '无' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      
      <template #footer>
        <div v-if="currentItem?.status === 'PENDING'">
          <el-button @click="dialogVisible = false">
            取消
          </el-button>
          <el-button
            type="danger"
            @click="submitReject"
          >
            拒绝
          </el-button>
          <el-button
            type="success"
            @click="submitApprove"
          >
            通过
          </el-button>
        </div>
        <el-button
          v-else
          @click="dialogVisible = false"
        >
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.village-approval {
  padding: 24px;
}

.approval-header {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-row {
  display: flex;
  gap: 40px;
  padding: 10px 0;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-value.pending {
  color: var(--warning);
}

.stat-value.approved {
  color: var(--success);
}

.stat-value.rejected {
  color: var(--danger);
}

.stat-label {
  font-size: 14px;
  color: var(--text-muted);
}

.approval-list {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-detail {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
}

.user-phone {
  font-size: 12px;
  color: var(--text-muted);
}

.elderly-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.elderly-name {
  font-weight: 500;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-name {
  font-weight: 500;
}

.device-no {
  font-size: 12px;
  color: var(--text-muted);
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.detail-content {
  max-height: 500px;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
}
</style>

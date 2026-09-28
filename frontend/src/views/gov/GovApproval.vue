<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  RefreshLeft,
  Clock,
  CircleCheck,
  CircleClose,
  Document,
  User,
  Monitor,
  Check,
  Close,
  View,
  Avatar,
  Connection,
  EditPen,
  DocumentChecked
} from '@element-plus/icons-vue'
import {
  getFamilyBindingList,
  approveFamilyBinding,
  getDeviceBindingList,
  approveDeviceBinding,
  getApprovalStats
} from '../../api/approval-center'

// ==================== 状态定义 ====================

const activeTab = ref('family')
const loading = ref(false)
const dialogVisible = ref(false)
const currentItem = ref(null)
const dialogTitle = ref('')
const dialogType = ref('family')

const approvalForm = reactive({
  remark: ''
})

// 统计数据
const stats = reactive({
  pending: 0,
  approved: 0,
  rejected: 0,
  total: 0,
  familyPending: 0,
  devicePending: 0
})

// 村庄列表（政府端可按村庄筛选）
const villageList = ref([])

// 家属绑定筛选
const familyFilter = reactive({
  status: '',
  villageId: '',
  keyword: ''
})

// 设备绑定筛选
const deviceFilter = reactive({
  status: '',
  villageId: '',
  keyword: ''
})

// 家属绑定分页
const familyPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 设备绑定分页
const devicePagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const familyList = ref([])
const deviceList = ref([])

// ==================== 计算属性 ====================

// 当前激活的筛选条件
const currentFilter = computed(() => {
  return activeTab.value === 'family' ? familyFilter : deviceFilter
})

// 当前激活的分页
const currentPagination = computed(() => {
  return activeTab.value === 'family' ? familyPagination : devicePagination
})

// ==================== 工具方法 ====================

const getStatusType = (status) => {
  const map = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger'
  }
  return map[status] || 'info'
}

const getStatusClass = (status) => {
  const map = {
    PENDING: 'status-pending',
    APPROVED: 'status-approved',
    REJECTED: 'status-rejected'
  }
  return map[status] || ''
}

const getStatusText = (status) => {
  const map = {
    PENDING: '待审批',
    APPROVED: '已通过',
    REJECTED: '已拒绝'
  }
  return map[status] || status
}

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

// ==================== 数据加载 ====================

// 加载审批统计
const loadStats = async () => {
  try {
    const res = await getApprovalStats()
    if (res.code === 200) {
      const data = res.data || {}
      stats.familyPending = data.family_pending || 0
      stats.devicePending = data.device_pending || 0
      if (activeTab.value === 'family') {
        stats.pending = data.family_pending || 0
        stats.approved = data.family_approved || 0
        stats.rejected = data.family_rejected || 0
        stats.total = (data.family_pending || 0) + (data.family_approved || 0) + (data.family_rejected || 0)
      } else {
        stats.pending = data.device_pending || 0
        stats.approved = data.device_approved || 0
        stats.rejected = data.device_rejected || 0
        stats.total = (data.device_pending || 0) + (data.device_approved || 0) + (data.device_rejected || 0)
      }
    }
  } catch (error) {
    console.error('加载统计数据失败', error)
  }
}

// 加载家属绑定列表
const loadFamilyBindings = async () => {
  loading.value = true
  try {
    const res = await getFamilyBindingList({
      page: familyPagination.page,
      pageSize: familyPagination.pageSize,
      status: familyFilter.status || undefined,
      villageId: familyFilter.villageId || undefined,
      keyword: familyFilter.keyword || undefined
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
      status: deviceFilter.status || undefined,
      villageId: deviceFilter.villageId || undefined,
      keyword: deviceFilter.keyword || undefined
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

// ==================== 交互处理 ====================

// Tab 切换
const handleTabChange = (tab) => {
  activeTab.value = tab
  loadStats()
  if (activeTab.value === 'family') {
    loadFamilyBindings()
  } else {
    loadDeviceBindings()
  }
}

// 筛选变更
const handleFilterChange = () => {
  if (activeTab.value === 'family') {
    familyPagination.page = 1
    loadFamilyBindings()
  } else {
    devicePagination.page = 1
    loadDeviceBindings()
  }
}

// 重置筛选
const resetFilter = () => {
  if (activeTab.value === 'family') {
    familyFilter.status = ''
    familyFilter.villageId = ''
    familyFilter.keyword = ''
    familyPagination.page = 1
    loadFamilyBindings()
  } else {
    deviceFilter.status = ''
    deviceFilter.villageId = ''
    deviceFilter.keyword = ''
    devicePagination.page = 1
    loadDeviceBindings()
  }
}

// 分页大小变更
const handleSizeChange = () => {
  if (activeTab.value === 'family') {
    familyPagination.page = 1
    loadFamilyBindings()
  } else {
    devicePagination.page = 1
    loadDeviceBindings()
  }
}

// 页码变更
const handlePageChange = () => {
  if (activeTab.value === 'family') {
    loadFamilyBindings()
  } else {
    loadDeviceBindings()
  }
}

// 刷新全部
const refreshAll = () => {
  loadStats()
  if (activeTab.value === 'family') {
    loadFamilyBindings()
  } else {
    loadDeviceBindings()
  }
}

// ==================== 审批操作 ====================

// 显示详情弹窗
const showDetail = (row, type) => {
  currentItem.value = row
  dialogType.value = type
  dialogTitle.value = type === 'family' ? '家属绑定详情' : '设备绑定详情'
  approvalForm.remark = ''
  dialogVisible.value = true
}

// 家属绑定 - 通过
const handleApproveFamily = (row) => {
  currentItem.value = row
  dialogType.value = 'family'
  dialogTitle.value = '审批家属绑定'
  approvalForm.remark = ''
  dialogVisible.value = true
}

// 家属绑定 - 拒绝
const handleRejectFamily = (row) => {
  currentItem.value = row
  dialogType.value = 'family'
  dialogTitle.value = '审批家属绑定'
  approvalForm.remark = ''
  dialogVisible.value = true
}

// 设备绑定 - 通过
const handleApproveDevice = (row) => {
  currentItem.value = row
  dialogType.value = 'device'
  dialogTitle.value = '审批设备绑定'
  approvalForm.remark = ''
  dialogVisible.value = true
}

// 设备绑定 - 拒绝
const handleRejectDevice = (row) => {
  currentItem.value = row
  dialogType.value = 'device'
  dialogTitle.value = '审批设备绑定'
  approvalForm.remark = ''
  dialogVisible.value = true
}

// 提交通过
const submitApprove = async () => {
  if (!currentItem.value) return
  try {
    const api = dialogType.value === 'family' ? approveFamilyBinding : approveDeviceBinding
    const res = await api(currentItem.value.id, {
      approved: true,
      remark: approvalForm.remark
    })
    if (res.code === 200) {
      ElMessage.success('审批通过')
      dialogVisible.value = false
      loadStats()
      if (dialogType.value === 'family') {
        loadFamilyBindings()
      } else {
        loadDeviceBindings()
      }
    } else {
      ElMessage.error(res.message || '审批失败')
    }
  } catch (error) {
    ElMessage.error('审批操作失败')
  }
}

// 提交拒绝
const submitReject = async () => {
  if (!currentItem.value) return
  try {
    await ElMessageBox.confirm('确定要拒绝该申请吗？此操作不可撤销。', '确认拒绝', {
      confirmButtonText: '确定拒绝',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const api = dialogType.value === 'family' ? approveFamilyBinding : approveDeviceBinding
    const res = await api(currentItem.value.id, {
      approved: false,
      remark: approvalForm.remark
    })
    if (res.code === 200) {
      ElMessage.success('已拒绝该申请')
      dialogVisible.value = false
      loadStats()
      if (dialogType.value === 'family') {
        loadFamilyBindings()
      } else {
        loadDeviceBindings()
      }
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadStats()
  loadFamilyBindings()
})
</script>

<template>
  <div class="gov-approval">
    <!-- 顶部标题区 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          审批管理
        </h1>
        <span class="page-subtitle">高效处理家属绑定与设备绑定申请，保障养老服务安全</span>
      </div>
      <el-button
        type="primary"
        class="refresh-btn"
        @click="refreshAll"
      >
        <el-icon><Refresh /></el-icon>
        <span>刷新数据</span>
      </el-button>
    </div>

    <!-- 统计卡片行 -->
    <div class="stats-cards">
      <div class="stat-card pending-card">
        <div class="stat-icon">
          <el-icon :size="24">
            <Clock />
          </el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">
            {{ stats.pending }}
          </div>
          <div class="stat-label">
            待审批
          </div>
        </div>
      </div>
      <div class="stat-card approved-card">
        <div class="stat-icon">
          <el-icon :size="24">
            <CircleCheck />
          </el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">
            {{ stats.approved }}
          </div>
          <div class="stat-label">
            已通过
          </div>
        </div>
      </div>
      <div class="stat-card rejected-card">
        <div class="stat-icon">
          <el-icon :size="24">
            <CircleClose />
          </el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">
            {{ stats.rejected }}
          </div>
          <div class="stat-label">
            已拒绝
          </div>
        </div>
      </div>
      <div class="stat-card total-card">
        <div class="stat-icon">
          <el-icon :size="24">
            <Document />
          </el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">
            {{ stats.total }}
          </div>
          <div class="stat-label">
            全部
          </div>
        </div>
      </div>
    </div>

    <!-- Tab切换栏 + 筛选栏 + 数据表格 -->
    <div class="main-card">
      <!-- Tab切换栏 -->
      <div class="tab-bar">
        <div class="tab-items">
          <div
            class="tab-item"
            :class="{ active: activeTab === 'family' }"
            @click="handleTabChange('family')"
          >
            <el-icon><User /></el-icon>
            <span>家属绑定</span>
            <el-badge
              v-if="stats.familyPending > 0"
              :value="stats.familyPending"
              class="tab-badge"
            />
          </div>
          <div
            class="tab-item"
            :class="{ active: activeTab === 'device' }"
            @click="handleTabChange('device')"
          >
            <el-icon><Monitor /></el-icon>
            <span>设备绑定</span>
            <el-badge
              v-if="stats.devicePending > 0"
              :value="stats.devicePending"
              class="tab-badge"
            />
          </div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-select
          v-model="currentFilter.status"
          placeholder="审批状态"
          clearable
          size="default"
          class="filter-select"
          @change="handleFilterChange"
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
        <el-select
          v-model="currentFilter.villageId"
          placeholder="所属村庄"
          clearable
          size="default"
          class="filter-select"
          @change="handleFilterChange"
        >
          <el-option
            v-for="v in villageList"
            :key="v.id"
            :label="v.name"
            :value="v.id"
          />
        </el-select>
        <el-input
          v-model="currentFilter.keyword"
          :placeholder="activeTab === 'family' ? '搜索申请人/老人姓名' : '搜索设备编号/老人姓名'"
          size="default"
          class="filter-input"
          clearable
          @keyup.enter="handleFilterChange"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button
          type="primary"
          size="default"
          @click="handleFilterChange"
        >
          <el-icon><Search /></el-icon>查询
        </el-button>
        <el-button
          size="default"
          @click="resetFilter"
        >
          <el-icon><RefreshLeft /></el-icon>重置
        </el-button>
      </div>

      <!-- 家属绑定审批列表 -->
      <el-table
        v-if="activeTab === 'family'"
        v-loading="loading"
        :data="familyList"
        class="data-table"
        style="width: 100%"
      >
        <el-table-column
          type="index"
          label="序号"
          width="60"
          align="center"
        />
        <el-table-column
          label="申请人"
          min-width="160"
        >
          <template #default="{ row }">
            <div class="applicant-cell">
              <el-avatar
                :size="40"
                :src="row.applicant_avatar"
                class="applicant-avatar"
              >
                {{ row.applicant_name?.charAt(0) }}
              </el-avatar>
              <div class="applicant-info">
                <div class="applicant-name">
                  {{ row.applicant_name }}
                </div>
                <div class="applicant-phone">
                  {{ row.applicant_phone }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="绑定老人"
          min-width="140"
        >
          <template #default="{ row }">
            <div class="elderly-cell">
              <div class="elderly-name">
                {{ row.elderly_name }}
              </div>
              <div class="elderly-idcard">
                {{ row.elderly_id_card }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="关系"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <span class="relation-tag">{{ row.relationship }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="所属村庄"
          width="140"
          align="center"
        >
          <template #default="{ row }">
            <span class="village-text">{{ row.village_name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="申请时间"
          width="160"
          align="center"
        >
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <span
              class="status-tag"
              :class="getStatusClass(row.status)"
            >
              {{ getStatusText(row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <div class="action-btns">
              <template v-if="row.status === 'PENDING'">
                <el-button
                  type="success"
                  size="small"
                  class="action-btn approve-btn"
                  @click="handleApproveFamily(row)"
                >
                  <el-icon><Check /></el-icon>通过
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  class="action-btn reject-btn"
                  @click="handleRejectFamily(row)"
                >
                  <el-icon><Close /></el-icon>拒绝
                </el-button>
              </template>
              <el-button
                type="primary"
                size="small"
                text
                class="detail-btn"
                @click="showDetail(row, 'family')"
              >
                <el-icon><View /></el-icon>详情
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 设备绑定审批列表 -->
      <el-table
        v-else
        v-loading="loading"
        :data="deviceList"
        class="data-table"
        style="width: 100%"
      >
        <el-table-column
          type="index"
          label="序号"
          width="60"
          align="center"
        />
        <el-table-column
          label="设备信息"
          min-width="180"
        >
          <template #default="{ row }">
            <div class="device-cell">
              <div class="device-name">
                {{ row.device_name }}
              </div>
              <div class="device-no">
                {{ row.device_no }}
              </div>
              <span class="device-type">{{ row.device_type }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="绑定老人"
          min-width="140"
        >
          <template #default="{ row }">
            <div class="elderly-cell">
              <div class="elderly-name">
                {{ row.elderly_name }}
              </div>
              <div class="elderly-idcard">
                {{ row.elderly_id_card }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="安装地址"
          min-width="160"
        >
          <template #default="{ row }">
            <span class="address-text">{{ row.install_address || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="所属村庄"
          width="140"
          align="center"
        >
          <template #default="{ row }">
            <span class="village-text">{{ row.village_name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="申请时间"
          width="160"
          align="center"
        >
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <span
              class="status-tag"
              :class="getStatusClass(row.status)"
            >
              {{ getStatusText(row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <div class="action-btns">
              <template v-if="row.status === 'PENDING'">
                <el-button
                  type="success"
                  size="small"
                  class="action-btn approve-btn"
                  @click="handleApproveDevice(row)"
                >
                  <el-icon><Check /></el-icon>通过
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  class="action-btn reject-btn"
                  @click="handleRejectDevice(row)"
                >
                  <el-icon><Close /></el-icon>拒绝
                </el-button>
              </template>
              <el-button
                type="primary"
                size="small"
                text
                class="detail-btn"
                @click="showDetail(row, 'device')"
              >
                <el-icon><View /></el-icon>详情
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPagination.page"
          v-model:page-size="currentPagination.pageSize"
          :total="currentPagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 审批弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      destroy-on-close
      class="approval-dialog"
    >
      <div
        v-if="currentItem"
        class="detail-content"
      >
        <!-- 申请信息区块 -->
        <div class="detail-block">
          <div class="block-header">
            <div class="block-icon blue">
              <el-icon><User /></el-icon>
            </div>
            <span class="block-title">申请信息</span>
          </div>
          <div class="block-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">申请人</span>
                <span class="info-value">{{ currentItem.applicant_name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">联系电话</span>
                <span class="info-value">{{ currentItem.applicant_phone }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">所属村庄</span>
                <span class="info-value">{{ currentItem.village_name || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">申请时间</span>
                <span class="info-value">{{ formatDateTime(currentItem.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 老人信息区块 -->
        <div class="detail-block">
          <div class="block-header">
            <div class="block-icon green">
              <el-icon><Avatar /></el-icon>
            </div>
            <span class="block-title">老人信息</span>
          </div>
          <div class="block-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">姓名</span>
                <span class="info-value">{{ currentItem.elderly_name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">身份证号</span>
                <span class="info-value">{{ currentItem.elderly_id_card }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 关系信息区块（家属绑定） -->
        <div
          v-if="dialogType === 'family'"
          class="detail-block"
        >
          <div class="block-header">
            <div class="block-icon orange">
              <el-icon><Connection /></el-icon>
            </div>
            <span class="block-title">关系信息</span>
          </div>
          <div class="block-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">与老人关系</span>
                <span class="info-value">{{ currentItem.relationship }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">主要联系人</span>
                <span class="info-value">
                  <span
                    class="primary-tag"
                    :class="{ 'is-primary': currentItem.is_primary }"
                  >
                    {{ currentItem.is_primary ? '是' : '否' }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 设备信息区块（设备绑定） -->
        <div
          v-if="dialogType === 'device'"
          class="detail-block"
        >
          <div class="block-header">
            <div class="block-icon purple">
              <el-icon><Monitor /></el-icon>
            </div>
            <span class="block-title">设备信息</span>
          </div>
          <div class="block-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">设备名称</span>
                <span class="info-value">{{ currentItem.device_name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">设备编号</span>
                <span class="info-value">{{ currentItem.device_no }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">设备类型</span>
                <span class="info-value">{{ currentItem.device_type }}</span>
              </div>
              <div class="info-item full-width">
                <span class="info-label">安装地址</span>
                <span class="info-value">{{ currentItem.install_address || '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 审批意见区块（待审批状态） -->
        <div
          v-if="currentItem.status === 'PENDING'"
          class="detail-block"
        >
          <div class="block-header">
            <div class="block-icon red">
              <el-icon><EditPen /></el-icon>
            </div>
            <span class="block-title">审批意见</span>
          </div>
          <div class="block-body">
            <el-input
              v-model="approvalForm.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入审批意见（选填）"
              maxlength="200"
              show-word-limit
              class="remark-input"
            />
          </div>
        </div>

        <!-- 审批记录区块（已审批状态） -->
        <div
          v-if="currentItem.status !== 'PENDING'"
          class="detail-block"
        >
          <div class="block-header">
            <div class="block-icon gray">
              <el-icon><DocumentChecked /></el-icon>
            </div>
            <span class="block-title">审批记录</span>
          </div>
          <div class="block-body">
            <div class="approval-record">
              <div class="record-item">
                <span class="record-label">审批结果</span>
                <span class="record-value">
                  <span
                    class="status-tag"
                    :class="getStatusClass(currentItem.status)"
                  >
                    {{ getStatusText(currentItem.status) }}
                  </span>
                </span>
              </div>
              <div class="record-item">
                <span class="record-label">审批人</span>
                <span class="record-value">{{ currentItem.approver_name || '-' }}</span>
              </div>
              <div class="record-item">
                <span class="record-label">审批时间</span>
                <span class="record-value">{{ formatDateTime(currentItem.approved_at) }}</span>
              </div>
              <div class="record-item">
                <span class="record-label">审批意见</span>
                <span class="record-value remark">{{ currentItem.approval_remark || '无' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div
          v-if="currentItem?.status === 'PENDING'"
          class="dialog-footer"
        >
          <el-button @click="dialogVisible = false">
            取消
          </el-button>
          <el-button
            type="danger"
            class="reject-btn-lg"
            @click="submitReject"
          >
            <el-icon><CircleClose /></el-icon>拒绝
          </el-button>
          <el-button
            type="primary"
            class="approve-btn-lg"
            @click="submitApprove"
          >
            <el-icon><CircleCheck /></el-icon>通过
          </el-button>
        </div>
        <div
          v-else
          class="dialog-footer"
        >
          <el-button @click="dialogVisible = false">
            关闭
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* ==================== 基础布局 ==================== */
.gov-approval {
  padding: 24px;
  background-color: #f0f2f5;
  min-height: 100%;
}

/* ==================== 顶部标题区 ==================== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
}

.page-subtitle {
  font-size: 14px;
  color: #6b7280;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
}

/* ==================== 统计卡片 ==================== */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pending-card .stat-icon {
  background-color: #fff7e6;
  color: #faad14;
}

.approved-card .stat-icon {
  background-color: #f6ffed;
  color: #52c41a;
}

.rejected-card .stat-icon {
  background-color: #fff1f0;
  color: #ff4d4f;
}

.total-card .stat-icon {
  background-color: #e6f4ff;
  color: #1677ff;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: #1f2937;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

/* ==================== 主卡片区域 ==================== */
.main-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* ==================== Tab切换栏 ==================== */
.tab-bar {
  padding: 0 24px;
  border-bottom: 1px solid #e5e7eb;
}

.tab-items {
  display: flex;
  gap: 32px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 4px;
  font-size: 15px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.tab-item:hover {
  color: #1677ff;
}

.tab-item.active {
  color: #1677ff;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #1677ff;
  border-radius: 2px 2px 0 0;
}

.tab-badge :deep(.el-badge__content) {
  background-color: #ff4d4f;
}

/* ==================== 筛选栏 ==================== */
.filter-bar {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.filter-select {
  width: 140px;
}

.filter-input {
  width: 240px;
}

/* ==================== 数据表格 ==================== */
.data-table {
  padding: 0 24px 24px;
}

.data-table :deep(.el-table__header) {
  background-color: #f9fafb;
}

.data-table :deep(.el-table__header th) {
  background-color: #f9fafb;
  font-weight: 600;
  color: #374151;
  padding: 12px 0;
}

.data-table :deep(.el-table__row) {
  transition: background-color 0.2s;
}

.data-table :deep(.el-table__row:hover) {
  background-color: #f9fafb;
}

/* 申请人单元格 */
.applicant-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.applicant-avatar {
  border: 2px solid #e5e7eb;
}

.applicant-info {
  display: flex;
  flex-direction: column;
}

.applicant-name {
  font-weight: 500;
  font-size: 14px;
  color: #1f2937;
}

.applicant-phone {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

/* 老人单元格 */
.elderly-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.elderly-name {
  font-weight: 500;
  font-size: 14px;
  color: #1f2937;
}

.elderly-idcard {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

/* 关系标签 */
.relation-tag {
  display: inline-block;
  padding: 4px 12px;
  background-color: #e6f4ff;
  color: #1677ff;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

/* 村庄文本 */
.village-text {
  font-size: 14px;
  color: #4b5563;
}

/* 时间文本 */
.time-text {
  font-size: 13px;
  color: #6b7280;
}

/* 状态标签 */
.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.status-pending {
  background-color: #fff7e6;
  color: #faad14;
}

.status-approved {
  background-color: #f6ffed;
  color: #52c41a;
}

.status-rejected {
  background-color: #fff1f0;
  color: #ff4d4f;
}

/* 设备单元格 */
.device-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-name {
  font-weight: 500;
  font-size: 14px;
  color: #1f2937;
}

.device-no {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.device-type {
  display: inline-block;
  padding: 2px 8px;
  background-color: #f3f4f6;
  color: #4b5563;
  border-radius: 4px;
  font-size: 12px;
  width: fit-content;
}

/* 地址文本 */
.address-text {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
}

/* 操作按钮 */
.action-btns {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
}

.approve-btn {
  background-color: #52c41a;
  border-color: #52c41a;
}

.approve-btn:hover {
  background-color: #73d13d;
  border-color: #73d13d;
}

.reject-btn {
  background-color: #ff4d4f;
  border-color: #ff4d4f;
}

.reject-btn:hover {
  background-color: #ff7875;
  border-color: #ff7875;
}

.detail-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ==================== 分页 ==================== */
.pagination-wrapper {
  padding: 16px 24px 24px;
  display: flex;
  justify-content: flex-end;
}

/* ==================== 审批弹窗 ==================== */
.approval-dialog :deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  margin-right: 0;
}

.approval-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.approval-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.approval-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-block {
  background-color: #f9fafb;
  border-radius: 8px;
  overflow: hidden;
}

.block-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background-color: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.block-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.block-icon.blue {
  background-color: #1677ff;
}

.block-icon.green {
  background-color: #52c41a;
}

.block-icon.orange {
  background-color: #fa8c16;
}

.block-icon.purple {
  background-color: #722ed1;
}

.block-icon.red {
  background-color: #ff4d4f;
}

.block-icon.gray {
  background-color: #6b7280;
}

.block-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.block-body {
  padding: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  grid-column: span 2;
}

.info-label {
  font-size: 13px;
  color: #6b7280;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.primary-tag {
  display: inline-block;
  padding: 2px 10px;
  background-color: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
  font-size: 13px;
}

.primary-tag.is-primary {
  background-color: #f6ffed;
  color: #52c41a;
}

.remark-input :deep(.el-textarea__inner) {
  border-radius: 8px;
}

/* 审批记录 */
.approval-record {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  display: flex;
  gap: 16px;
}

.record-label {
  width: 80px;
  font-size: 13px;
  color: #6b7280;
  flex-shrink: 0;
}

.record-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.record-value.remark {
  color: #4b5563;
  font-weight: 400;
  line-height: 1.5;
}

/* 弹窗底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.approve-btn-lg {
  background-color: #52c41a;
  border-color: #52c41a;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
}

.approve-btn-lg:hover {
  background-color: #73d13d;
  border-color: #73d13d;
}

.reject-btn-lg {
  background-color: #ff4d4f;
  border-color: #ff4d4f;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
}

.reject-btn-lg:hover {
  background-color: #ff7875;
  border-color: #ff7875;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 1200px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .gov-approval {
    padding: 16px;
  }

  .stats-cards {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .tab-items {
    gap: 20px;
  }

  .filter-bar {
    flex-direction: column;
  }

  .filter-select,
  .filter-input {
    width: 100% !important;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-item.full-width {
    grid-column: span 1;
  }
}
</style>

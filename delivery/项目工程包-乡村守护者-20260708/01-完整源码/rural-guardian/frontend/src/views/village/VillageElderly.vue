<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getElderlyList, getElderlyDetail, createElderly } from '../../api/elderly'

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const drawerVisible = ref(false)
const detail = ref(null)
const formRef = ref(null)
const tableData = ref([])

const filters = reactive({ keyword: '', healthStatus: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const defaultForm = {
  name: '', gender: 'M', birthDate: '', idCard: '', phone: '',
  address: '', emergencyContact: '', emergencyPhone: '',
  livingAlone: false, healthStatus: 'GOOD',
}
const form = reactive({ ...defaultForm })

const formRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
}

const deviceTypeMap = { BAND: '手环', GATEWAY: '网关', TERMINAL: '终端' }

function healthTagType(status) {
  const map = { GOOD: 'success', FAIR: '', ATTENTION: 'warning', CRITICAL: 'danger' }
  return map[status] || 'info'
}

function healthStatusText(status) {
  const map = { GOOD: '良好', FAIR: '一般', ATTENTION: '需关注', CRITICAL: '高危' }
  return map[status] || status
}

function resetFilters() {
  filters.keyword = ''
  filters.healthStatus = ''
  pagination.page = 1
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.healthStatus) params.healthStatus = filters.healthStatus
    const res = await getElderlyList(params)
    if (res.code === 200) {
      tableData.value = res.data.list
      pagination.total = res.data.total
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function openDialog() {
  Object.assign(form, { ...defaultForm })
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    await createElderly(form)
    ElMessage.success('创建成功')
    dialogVisible.value = false
    fetchData()
  } catch (err) {
    console.error(err)
  } finally {
    submitLoading.value = false
  }
}

async function viewDetail(row) {
  try {
    const res = await getElderlyDetail(row.id)
    if (res.code === 200) {
      detail.value = res.data
      drawerVisible.value = true
    }
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => { fetchData() })
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2>本村老人</h2>
      <el-button
        type="primary"
        @click="openDialog()"
      >
        <el-icon><Plus /></el-icon> 新增老人
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索姓名/电话"
        clearable
        style="width: 220px"
        @clear="fetchData"
        @keyup.enter="fetchData"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select
        v-model="filters.healthStatus"
        placeholder="健康状态"
        clearable
        style="width: 140px"
        @change="fetchData"
      >
        <el-option
          label="良好"
          value="GOOD"
        />
        <el-option
          label="一般"
          value="FAIR"
        />
        <el-option
          label="需关注"
          value="ATTENTION"
        />
        <el-option
          label="高危"
          value="CRITICAL"
        />
      </el-select>
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

    <el-table
      v-loading="loading"
      :data="tableData"
      stripe
      border
    >
      <el-table-column
        prop="id"
        label="ID"
        width="70"
      />
      <el-table-column
        prop="name"
        label="姓名"
        width="100"
      />
      <el-table-column
        prop="gender"
        label="性别"
        width="70"
      >
        <template #default="{ row }">
          {{ row.gender === 'M' ? '男' : row.gender === 'F' ? '女' : '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="age"
        label="年龄"
        width="70"
      >
        <template #default="{ row }">
          {{ row.birthDate ? new Date().getFullYear() - new Date(row.birthDate).getFullYear() : '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="phone"
        label="电话"
        width="130"
      />
      <el-table-column
        prop="healthStatus"
        label="健康状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="healthTagType(row.healthStatus)"
            size="small"
          >
            {{ healthStatusText(row.healthStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="livingAlone"
        label="独居"
        width="70"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.livingAlone ? 'danger' : 'success'"
            size="small"
          >
            {{ row.livingAlone ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="address"
        label="地址"
        show-overflow-tooltip
      />
      <el-table-column
        prop="emergencyContact"
        label="紧急联系人"
        width="110"
      />
      <el-table-column
        prop="emergencyPhone"
        label="紧急电话"
        width="130"
      />
      <el-table-column
        label="操作"
        width="100"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            text
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

    <div style="display: flex; justify-content: flex-end; margin-top: 16px">
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

    <!-- 新增老人对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="新增老人"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="110px"
      >
        <el-form-item
          label="姓名"
          prop="name"
        >
          <el-input
            v-model="form.name"
            placeholder="请输入姓名"
          />
        </el-form-item>
        <el-form-item
          label="性别"
          prop="gender"
        >
          <el-select
            v-model="form.gender"
            placeholder="请选择性别"
            style="width: 100%"
          >
            <el-option
              label="男"
              value="M"
            />
            <el-option
              label="女"
              value="F"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="出生日期"
          prop="birthDate"
        >
          <el-date-picker
            v-model="form.birthDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="身份证号"
          prop="idCard"
        >
          <el-input
            v-model="form.idCard"
            placeholder="请输入身份证号"
          />
        </el-form-item>
        <el-form-item
          label="电话"
          prop="phone"
        >
          <el-input
            v-model="form.phone"
            placeholder="请输入电话"
          />
        </el-form-item>
        <el-form-item
          label="地址"
          prop="address"
        >
          <el-input
            v-model="form.address"
            placeholder="请输入地址"
          />
        </el-form-item>
        <el-form-item
          label="紧急联系人"
          prop="emergencyContact"
        >
          <el-input
            v-model="form.emergencyContact"
            placeholder="请输入紧急联系人"
          />
        </el-form-item>
        <el-form-item
          label="紧急联系电话"
          prop="emergencyPhone"
        >
          <el-input
            v-model="form.emergencyPhone"
            placeholder="请输入紧急联系电话"
          />
        </el-form-item>
        <el-form-item
          label="是否独居"
          prop="livingAlone"
        >
          <el-switch
            v-model="form.livingAlone"
            active-text="是"
            inactive-text="否"
          />
        </el-form-item>
        <el-form-item
          label="健康状态"
          prop="healthStatus"
        >
          <el-select
            v-model="form.healthStatus"
            placeholder="请选择健康状态"
            style="width: 100%"
          >
            <el-option
              label="良好"
              value="GOOD"
            />
            <el-option
              label="一般"
              value="FAIR"
            />
            <el-option
              label="需关注"
              value="ATTENTION"
            />
            <el-option
              label="高危"
              value="CRITICAL"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="老人详情"
      size="500px"
    >
      <el-descriptions
        v-if="detail"
        :column="1"
        border
      >
        <el-descriptions-item label="姓名">
          {{ detail.name }}
        </el-descriptions-item>
        <el-descriptions-item label="性别">
          {{ detail.gender === 'M' ? '男' : '女' }}
        </el-descriptions-item>
        <el-descriptions-item label="出生日期">
          {{ detail.birthDate || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="身份证号">
          {{ detail.idCard || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="电话">
          {{ detail.phone || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="地址">
          {{ detail.address || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="所属村庄">
          {{ detail.villageName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="健康状态">
          <el-tag
            :type="healthTagType(detail.healthStatus)"
            size="small"
          >
            {{ healthStatusText(detail.healthStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="独居">
          {{ detail.livingAlone ? '是' : '否' }}
        </el-descriptions-item>
        <el-descriptions-item label="紧急联系人">
          {{ detail.emergencyContact || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="紧急电话">
          {{ detail.emergencyPhone || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <h4 style="margin: 20px 0 10px; color: var(--text)">
        关联设备
      </h4>
      <el-table
        :data="detail?.devices || []"
        size="small"
        border
      >
        <el-table-column
          prop="deviceSn"
          label="设备编号"
        />
        <el-table-column
          prop="type"
          label="类型"
          width="80"
        >
          <template #default="{ row }">
            {{ deviceTypeMap[row.type] || row.type }}
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="状态"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'ONLINE' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 'ONLINE' ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <h4 style="margin: 20px 0 10px; color: var(--text)">
        最新健康记录
      </h4>
      <el-descriptions
        v-if="detail?.latestHealth"
        :column="2"
        border
        size="small"
      >
        <el-descriptions-item label="心率">
          {{ detail.latestHealth.heartRate || '-' }} bpm
        </el-descriptions-item>
        <el-descriptions-item label="血压">
          {{ detail.latestHealth.bloodPressureSystolic || '-' }}/{{ detail.latestHealth.bloodPressureDiastolic || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="血氧">
          {{ detail.latestHealth.bloodOxygen || '-' }}%
        </el-descriptions-item>
        <el-descriptions-item label="体温">
          {{ detail.latestHealth.temperature || '-' }} C
        </el-descriptions-item>
      </el-descriptions>
      <el-empty
        v-else
        description="暂无健康记录"
        :image-size="60"
      />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getElderlyList, createElderly, updateElderly, deleteElderly } from '../../api/elderly'
import { getVillageList } from '../../api/village'

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref(null)
const tableData = ref([])
const villageOptions = ref([])

const filters = reactive({ keyword: '', healthStatus: '', livingAlone: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const defaultForm = {
  name: '', gender: 'M', birthDate: '', idCard: '', phone: '',
  address: '', villageId: null, emergencyContact: '', emergencyPhone: '',
  healthStatus: 'GOOD', livingAlone: false,
}
const form = reactive({ ...defaultForm })

const formRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
}

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
  filters.livingAlone = ''
  pagination.page = 1
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.healthStatus) params.healthStatus = filters.healthStatus
    if (filters.livingAlone !== '') params.livingAlone = filters.livingAlone

    const res = await getElderlyList(params)
    if (res.code === 200) {
      const dataList = res.data?.list || []
      tableData.value = [...dataList]
      pagination.total = res.data?.total || 0
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function fetchVillages() {
  try {
    const res = await getVillageList({ page: 1, pageSize: 100 })
    if (res.code === 200) {
      villageOptions.value = res.data.list
    }
  } catch (err) {
    console.error(err)
  }
}

function openDialog(row) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    Object.assign(form, {
      name: row.name,
      gender: row.gender,
      birthDate: row.birthDate,
      idCard: row.idCard,
      phone: row.phone,
      address: row.address,
      villageId: row.villageId,
      emergencyContact: row.emergencyContact,
      emergencyPhone: row.emergencyPhone,
      healthStatus: row.healthStatus,
      livingAlone: !!row.livingAlone,
    })
  } else {
    isEdit.value = false
    editId.value = null
    Object.assign(form, { ...defaultForm })
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    if (isEdit.value) {
      await updateElderly(editId.value, form)
      ElMessage.success('更新成功')
    } else {
      await createElderly(form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (err) {
    console.error(err)
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定要删除老人 "${row.name}" 吗？`, '确认删除', { type: 'warning' })
  try {
    await deleteElderly(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  fetchData()
  fetchVillages()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2>老人管理</h2>
      <el-button
        type="primary"
        @click="openDialog()"
      >
        <el-icon><Plus /></el-icon> 新增老人
      </el-button>
    </div>

    <!-- 搜索过滤 -->
    <div class="filter-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索姓名/身份证/电话"
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
      <el-select
        v-model="filters.livingAlone"
        placeholder="居住情况"
        clearable
        style="width: 140px"
        @change="fetchData"
      >
        <el-option
          label="独居"
          :value="1"
        />
        <el-option
          label="非独居"
          :value="0"
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

    <!-- 数据表格 -->
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
        prop="birth_date"
        label="出生日期"
        width="120"
      />
      <el-table-column
        prop="phone"
        label="电话"
        width="130"
      />
      <el-table-column
        prop="village_name"
        label="所属村庄"
        width="120"
      />
      <el-table-column
        prop="health_status"
        label="健康状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="healthTagType(row.health_status)"
            size="small"
          >
            {{ healthStatusText(row.health_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="living_alone"
        label="独居"
        width="70"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.living_alone ? 'danger' : 'success'"
            size="small"
          >
            {{ row.living_alone ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="address"
        label="地址"
        show-overflow-tooltip
      />
      <el-table-column
        label="操作"
        width="180"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            text
            size="small"
            @click="openDialog(row)"
          >
            编辑
          </el-button>
          <el-button
            type="danger"
            text
            size="small"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && tableData.length === 0"
      description="暂无数据"
    />

    <!-- 分页 -->
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑老人' : '新增老人'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
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
          <el-radio-group v-model="form.gender">
            <el-radio value="M">
              男
            </el-radio>
            <el-radio value="F">
              女
            </el-radio>
          </el-radio-group>
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
          label="所属村庄"
          prop="villageId"
        >
          <el-select
            v-model="form.villageId"
            placeholder="请选择村庄"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="v in villageOptions"
              :key="v.id"
              :label="v.name"
              :value="v.id"
            />
          </el-select>
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
          label="紧急电话"
          prop="emergencyPhone"
        >
          <el-input
            v-model="form.emergencyPhone"
            placeholder="请输入紧急联系电话"
          />
        </el-form-item>
        <el-form-item
          label="健康状态"
          prop="healthStatus"
        >
          <el-select
            v-model="form.healthStatus"
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
        <el-form-item
          label="独居"
          prop="livingAlone"
        >
          <el-switch v-model="form.livingAlone" />
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
  </div>
</template>

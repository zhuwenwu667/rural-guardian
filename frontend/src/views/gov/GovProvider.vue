<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProviderList, createProvider, updateProvider, deleteProvider } from '../../api/provider'

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref(null)
const tableData = ref([])

const filters = reactive({ keyword: '', status: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const defaultForm = { name: '', serviceTypes: '', contactPerson: '', contactPhone: '', serviceArea: '', rating: 0, status: 'ACTIVE' }
const form = reactive({ ...defaultForm })

const formRules = {
  name: [{ required: true, message: '请输入服务商名称', trigger: 'blur' }],
}

function resetFilters() {
  filters.keyword = ''
  filters.status = ''
  pagination.page = 1
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.status) params.status = filters.status
    const res = await getProviderList(params)
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

function openDialog(row) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    Object.assign(form, {
      name: row.name, serviceTypes: row.serviceTypes, contactPerson: row.contactPerson,
      contactPhone: row.contactPhone, serviceArea: row.serviceArea,
      rating: row.rating || 0, status: row.status,
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
      await updateProvider(editId.value, form)
      ElMessage.success('更新成功')
    } else {
      await createProvider(form)
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
  await ElMessageBox.confirm(`确定要删除服务商 "${row.name}" 吗？`, '确认删除', { type: 'warning' })
  try {
    await deleteProvider(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => { fetchData() })
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2>服务商管理</h2>
      <el-button
        type="primary"
        @click="openDialog()"
      >
        <el-icon><Plus /></el-icon> 新增服务商
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索服务商名称/联系人"
        clearable
        style="width: 240px"
        @clear="fetchData"
        @keyup.enter="fetchData"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select
        v-model="filters.status"
        placeholder="状态"
        clearable
        style="width: 140px"
        @change="fetchData"
      >
        <el-option
          label="活跃"
          value="ACTIVE"
        />
        <el-option
          label="停用"
          value="INACTIVE"
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
        label="服务商名称"
        width="160"
      />
      <el-table-column
        prop="service_types"
        label="服务类型"
        width="140"
        show-overflow-tooltip
      />
      <el-table-column
        prop="contact_person"
        label="联系人"
        width="100"
      />
      <el-table-column
        prop="contact_phone"
        label="联系电话"
        width="130"
      />
      <el-table-column
        prop="service_area"
        label="服务区域"
        show-overflow-tooltip
      />
      <el-table-column
        prop="rating"
        label="评分"
        width="70"
      >
        <template #default="{ row }">
          {{ row.actual_rating || row.rating || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="active_orders"
        label="进行中工单"
        width="110"
      />
      <el-table-column
        prop="status"
        label="状态"
        width="80"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ACTIVE' ? 'success' : 'danger'"
            size="small"
          >
            {{ row.status === 'ACTIVE' ? '活跃' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
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

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑服务商' : '新增服务商'"
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
          label="服务商名称"
          prop="name"
        >
          <el-input
            v-model="form.name"
            placeholder="请输入服务商名称"
          />
        </el-form-item>
        <el-form-item
          label="服务类型"
          prop="serviceTypes"
        >
          <el-input
            v-model="form.serviceTypes"
            placeholder="如: 医疗,生活照料,陪护"
          />
        </el-form-item>
        <el-form-item
          label="联系人"
          prop="contactPerson"
        >
          <el-input
            v-model="form.contactPerson"
            placeholder="请输入联系人"
          />
        </el-form-item>
        <el-form-item
          label="联系电话"
          prop="contactPhone"
        >
          <el-input
            v-model="form.contactPhone"
            placeholder="请输入联系电话"
          />
        </el-form-item>
        <el-form-item
          label="服务区域"
          prop="serviceArea"
        >
          <el-input
            v-model="form.serviceArea"
            placeholder="请输入服务区域"
          />
        </el-form-item>
        <el-form-item
          label="评分"
          prop="rating"
        >
          <el-rate
            v-model="form.rating"
            :max="5"
          />
        </el-form-item>
        <el-form-item
          label="状态"
          prop="status"
        >
          <el-radio-group v-model="form.status">
            <el-radio value="ACTIVE">
              活跃
            </el-radio>
            <el-radio value="INACTIVE">
              停用
            </el-radio>
          </el-radio-group>
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

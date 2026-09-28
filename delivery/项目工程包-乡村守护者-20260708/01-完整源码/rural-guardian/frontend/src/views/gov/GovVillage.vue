<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getVillageList, createVillage, updateVillage, deleteVillage } from '../../api/village'

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref(null)
const tableData = ref([])

const filters = reactive({ keyword: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const defaultForm = { name: '', town: '', district: '', population: 0, elderlyCount: 0, staffCount: 0, servicePointAddress: '', contactPhone: '' }
const form = reactive({ ...defaultForm })

const formRules = {
  name: [{ required: true, message: '请输入村庄名称', trigger: 'blur' }],
}

function resetFilters() {
  filters.keyword = ''
  pagination.page = 1
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.keyword) params.keyword = filters.keyword
    const res = await getVillageList(params)
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
      name: row.name, town: row.town, district: row.district,
      population: row.population, elderlyCount: row.elderlyCount,
      staffCount: row.staffCount, servicePointAddress: row.servicePointAddress,
      contactPhone: row.contactPhone,
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
      await updateVillage(editId.value, form)
      ElMessage.success('更新成功')
    } else {
      await createVillage(form)
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
  await ElMessageBox.confirm(`确定要删除村庄 "${row.name}" 吗？`, '确认删除', { type: 'warning' })
  try {
    await deleteVillage(row.id)
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
      <h2>村庄管理</h2>
      <el-button
        type="primary"
        @click="openDialog()"
      >
        <el-icon><Plus /></el-icon> 新增村庄
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索村庄名称/乡镇/区县"
        clearable
        style="width: 260px"
        @clear="fetchData"
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
        label="村庄名称"
        width="140"
      />
      <el-table-column
        prop="town"
        label="所属乡镇"
        width="120"
      />
      <el-table-column
        prop="district"
        label="所属区县"
        width="120"
      />
      <el-table-column
        prop="population"
        label="人口"
        width="80"
      />
      <el-table-column
        prop="elderly_count"
        label="老人数"
        width="80"
      />
      <el-table-column
        prop="actual_elderly_count"
        label="实际老人数"
        width="110"
      />
      <el-table-column
        prop="staff_count"
        label="专员数"
        width="80"
      />
      <el-table-column
        prop="actual_staff_count"
        label="实际专员数"
        width="110"
      />
      <el-table-column
        prop="service_point_address"
        label="服务点地址"
        show-overflow-tooltip
      />
      <el-table-column
        prop="contact_phone"
        label="联系电话"
        width="130"
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
      :title="isEdit ? '编辑村庄' : '新增村庄'"
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
          label="村庄名称"
          prop="name"
        >
          <el-input
            v-model="form.name"
            placeholder="请输入村庄名称"
          />
        </el-form-item>
        <el-form-item
          label="所属乡镇"
          prop="town"
        >
          <el-input
            v-model="form.town"
            placeholder="请输入所属乡镇"
          />
        </el-form-item>
        <el-form-item
          label="所属区县"
          prop="district"
        >
          <el-input
            v-model="form.district"
            placeholder="请输入所属区县"
          />
        </el-form-item>
        <el-form-item
          label="人口"
          prop="population"
        >
          <el-input-number
            v-model="form.population"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="老人数"
          prop="elderlyCount"
        >
          <el-input-number
            v-model="form.elderlyCount"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="专员数"
          prop="staffCount"
        >
          <el-input-number
            v-model="form.staffCount"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="服务点地址"
          prop="servicePointAddress"
        >
          <el-input
            v-model="form.servicePointAddress"
            placeholder="请输入服务点地址"
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

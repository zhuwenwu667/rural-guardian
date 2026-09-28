<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDeviceList, createDevice, updateDevice, deleteDevice } from '../../api/device'
import { getElderlyList } from '../../api/elderly'

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref(null)
const tableData = ref([])
const elderlyOptions = ref([])

const filters = reactive({ keyword: '', type: '', status: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const defaultForm = { deviceSn: '', type: '', elderlyId: null, status: 'ONLINE' }
const form = reactive({ ...defaultForm })

const formRules = {
  deviceSn: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  type: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

function deviceTypeTag(type) {
  const map = { BAND: '', GATEWAY: 'success', TERMINAL: 'warning' }
  return map[type] || 'info'
}

function deviceTypeText(type) {
  const map = { BAND: '手环', GATEWAY: '网关', TERMINAL: '终端' }
  return map[type] || type
}

function deviceStatusTag(status) {
  const map = { ONLINE: 'success', OFFLINE: 'danger', MAINTENANCE: 'warning' }
  return map[status] || 'info'
}

function deviceStatusText(status) {
  const map = { ONLINE: '在线', OFFLINE: '离线', MAINTENANCE: '维护中' }
  return map[status] || status
}

function resetFilters() {
  filters.keyword = ''
  filters.type = ''
  filters.status = ''
  pagination.page = 1
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.type) params.type = filters.type
    if (filters.status) params.status = filters.status
    const res = await getDeviceList(params)
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

async function fetchElderly() {
  try {
    const res = await getElderlyList({ page: 1, pageSize: 200 })
    if (res.code === 200) {
      elderlyOptions.value = res.data.list
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
      deviceSn: row.device_sn,
      type: row.type,
      elderlyId: row.elderly_id || null,
      status: row.status,
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
      await updateDevice(editId.value, form)
      ElMessage.success('更新成功')
    } else {
      await createDevice(form)
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
  await ElMessageBox.confirm(`确定要删除设备 "${row.device_sn}" 吗？`, '确认删除', { type: 'warning' })
  try {
    await deleteDevice(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  fetchData()
  fetchElderly()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2>设备管理</h2>
      <el-button
        type="primary"
        @click="openDialog()"
      >
        <el-icon><Plus /></el-icon> 新增设备
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索设备编号/关联老人"
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
        v-model="filters.type"
        placeholder="设备类型"
        clearable
        style="width: 140px"
        @change="fetchData"
      >
        <el-option
          label="全部"
          value=""
        />
        <el-option
          label="手环"
          value="BAND"
        />
        <el-option
          label="网关"
          value="GATEWAY"
        />
        <el-option
          label="终端"
          value="TERMINAL"
        />
      </el-select>
      <el-select
        v-model="filters.status"
        placeholder="状态"
        clearable
        style="width: 140px"
        @change="fetchData"
      >
        <el-option
          label="全部"
          value=""
        />
        <el-option
          label="在线"
          value="ONLINE"
        />
        <el-option
          label="离线"
          value="OFFLINE"
        />
        <el-option
          label="维护中"
          value="MAINTENANCE"
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
        prop="device_sn"
        label="设备编号"
        width="160"
      />
      <el-table-column
        prop="type"
        label="设备类型"
        width="110"
      >
        <template #default="{ row }">
          <el-tag
            :type="deviceTypeTag(row.type)"
            size="small"
          >
            {{ deviceTypeText(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="elderly_name"
        label="关联老人"
        width="110"
      >
        <template #default="{ row }">
          {{ row.elderly_name || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="battery_level"
        label="电量"
        width="80"
      >
        <template #default="{ row }">
          <span v-if="row.battery_level != null">{{ row.battery_level }}%</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="status"
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="deviceStatusTag(row.status)"
            size="small"
          >
            {{ deviceStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="last_heartbeat"
        label="最后心跳"
        width="170"
      >
        <template #default="{ row }">
          {{ row.last_heartbeat || '-' }}
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="150"
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑设备' : '新增设备'"
      width="550px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item
          label="设备编号"
          prop="deviceSn"
        >
          <el-input
            v-model="form.deviceSn"
            placeholder="请输入设备编号"
          />
        </el-form-item>
        <el-form-item
          label="设备类型"
          prop="type"
        >
          <el-select
            v-model="form.type"
            placeholder="请选择设备类型"
            style="width: 100%"
          >
            <el-option
              label="手环"
              value="BAND"
            />
            <el-option
              label="网关"
              value="GATEWAY"
            />
            <el-option
              label="终端"
              value="TERMINAL"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="关联老人"
          prop="elderlyId"
        >
          <el-select
            v-model="form.elderlyId"
            placeholder="请选择关联老人"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="e in elderlyOptions"
              :key="e.id"
              :label="`${e.name} (${e.phone || '无电话'})`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="状态"
          prop="status"
        >
          <el-select
            v-model="form.status"
            placeholder="请选择状态"
            style="width: 100%"
          >
            <el-option
              label="在线"
              value="ONLINE"
            />
            <el-option
              label="离线"
              value="OFFLINE"
            />
            <el-option
              label="维护中"
              value="MAINTENANCE"
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
  </div>
</template>

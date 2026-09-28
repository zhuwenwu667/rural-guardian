<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, createUser, updateUser, deleteUser, resetPassword } from '../../api/user'
import { getElderlyList } from '../../api/elderly'
import { getFamilyList, deleteFamily } from '../../api/family'

// ========== 通用状态 ==========
const loading = ref(false)
const submitLoading = ref(false)
const resetLoading = ref(false)
const dialogVisible = ref(false)
const resetDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref(null)
const resetFormRef = ref(null)
const activeTab = ref('users')
const resetUser = ref(null)

// ========== 人员列表 ==========
const tableData = ref([])
const filters = reactive({ keyword: '', role: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

// ========== 绑定关系 ==========
const bindingData = ref([])
const bindingLoading = ref(false)
const bindingPagination = reactive({ page: 1, pageSize: 20, total: 0 })

// ========== 老人选项 ==========
const elderlyOptions = ref([])

// ========== 表单 ==========
const defaultForm = {
  username: '',
  password: '',
  realName: '',
  role: '',
  phone: '',
  statusActive: true,
  bindElderlyId: null,
  relationship: '',
  gender: '',
  birthDate: '',
  livingAlone: false,
}
const form = reactive({ ...defaultForm })

const resetForm = reactive({ newPassword: '', confirmPassword: '' })

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const resetFormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== resetForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// ========== 工具函数 ==========
function roleTagType(role) {
  const map = { FAMILY_MEMBER: '', ELDERLY: 'info' }
  return map[role] || 'info'
}

function roleText(role) {
  const map = { FAMILY_MEMBER: '家属', ELDERLY: '老人' }
  return map[role] || role
}

// ========== 筛选 ==========
function resetFilters() {
  filters.keyword = ''
  filters.role = ''
  pagination.page = 1
  fetchData()
}

// ========== Tab 切换 ==========
function handleTabChange(tab) {
  if (tab === 'users') {
    fetchData()
  } else if (tab === 'bindings') {
    fetchBindings()
  }
}

// ========== 人员列表数据 ==========
async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.role) params.role = filters.role
    const res = await getUserList(params)
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

// ========== 绑定关系数据 ==========
async function fetchBindings() {
  bindingLoading.value = true
  try {
    const params = { page: bindingPagination.page, pageSize: bindingPagination.pageSize }
    const res = await getFamilyList(params)
    if (res.code === 200) {
      bindingData.value = res.data.list
      bindingPagination.total = res.data.total
    }
  } catch (err) {
    console.error(err)
  } finally {
    bindingLoading.value = false
  }
}

// ========== 获取老人列表（用于下拉选择） ==========
async function fetchElderlyOptions() {
  try {
    const res = await getElderlyList({ page: 1, pageSize: 1000 })
    if (res.code === 200) {
      elderlyOptions.value = res.data.list
    }
  } catch (err) {
    console.error(err)
  }
}

// ========== 新增/编辑对话框 ==========
function openDialog(row) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    Object.assign(form, {
      username: row.username,
      password: '',
      realName: row.realName || '',
      role: row.role,
      phone: row.phone || '',
      statusActive: row.status === 1,
      bindElderlyId: row.bindElderlyId || null,
      relationship: row.relationship || '',
      gender: row.gender || '',
      birthDate: row.birthDate || '',
      livingAlone: row.livingAlone || false,
    })
  } else {
    isEdit.value = false
    editId.value = null
    Object.assign(form, { ...defaultForm })
  }
  dialogVisible.value = true
}

// ========== 提交表单 ==========
async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    const data = {
      username: form.username,
      realName: form.realName,
      role: form.role,
      phone: form.phone,
      status: form.statusActive ? 1 : 0,
    }
    if (!isEdit.value) {
      data.password = form.password
    }
    // 家属：绑定老人
    if (form.role === 'FAMILY_MEMBER') {
      if (form.bindElderlyId) {
        data.bindElderlyId = form.bindElderlyId
      }
      if (form.relationship) {
        data.relationship = form.relationship
      }
    }
    // 老人：附加信息
    if (form.role === 'ELDERLY') {
      data.gender = form.gender
      data.birthDate = form.birthDate
      data.livingAlone = form.livingAlone ? 1 : 0
    }
    if (isEdit.value) {
      await updateUser(editId.value, data)
      ElMessage.success('更新成功')
    } else {
      await createUser(data)
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

// ========== 状态切换 ==========
async function handleStatusChange(row, val) {
  const newStatus = val ? 1 : 0
  const statusText = val ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定要${statusText}用户 "${row.username}" 吗？`, '确认操作', { type: 'warning' })
    await updateUser(row.id, { status: newStatus })
    ElMessage.success(`${statusText}成功`)
    fetchData()
  } catch (err) {
    fetchData()
  }
}

// ========== 重置密码 ==========
function openResetDialog(row) {
  resetUser.value = row
  resetForm.newPassword = ''
  resetForm.confirmPassword = ''
  resetDialogVisible.value = true
}

async function handleResetSubmit() {
  const valid = await resetFormRef.value.validate().catch(() => false)
  if (!valid) return
  resetLoading.value = true
  try {
    await resetPassword(resetUser.value.id, resetForm.newPassword)
    ElMessage.success('密码重置成功')
    resetDialogVisible.value = false
  } catch (err) {
    console.error(err)
  } finally {
    resetLoading.value = false
  }
}

// ========== 删除用户 ==========
async function handleDelete(row) {
  await ElMessageBox.confirm(`确定要删除用户 "${row.username}" 吗？`, '确认删除', { type: 'warning' })
  try {
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (err) {
    console.error(err)
  }
}

// ========== 解除绑定 ==========
async function handleUnbind(row) {
  await ElMessageBox.confirm(`确定要解除 "${row.user_name}" 与 "${row.elderly_name}" 的绑定关系吗？`, '确认解除绑定', { type: 'warning' })
  try {
    await deleteFamily(row.id)
    ElMessage.success('解除绑定成功')
    fetchBindings()
  } catch (err) {
    console.error(err)
  }
}

// ========== 初始化 ==========
onMounted(() => {
  fetchData()
  fetchElderlyOptions()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2>人员管理</h2>
      <el-button
        type="primary"
        @click="openDialog()"
      >
        <el-icon><Plus /></el-icon> 新增人员
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索用户名/姓名/电话"
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
        v-model="filters.role"
        placeholder="角色"
        clearable
        style="width: 150px"
        @change="fetchData"
      >
        <el-option
          label="全部"
          value=""
        />
        <el-option
          label="家属"
          value="FAMILY_MEMBER"
        />
        <el-option
          label="老人"
          value="ELDERLY"
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

    <el-tabs
      v-model="activeTab"
      @tab-change="handleTabChange"
    >
      <!-- Tab1: 人员列表 -->
      <el-tab-pane
        label="人员列表"
        name="users"
      >
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
            prop="username"
            label="用户名"
            width="130"
          />
          <el-table-column
            prop="realName"
            label="姓名"
            width="100"
          />
          <el-table-column
            prop="role"
            label="角色"
            width="120"
          >
            <template #default="{ row }">
              <el-tag
                :type="roleTagType(row.role)"
                size="small"
              >
                {{ roleText(row.role) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="phone"
            label="电话"
            width="130"
          />
          <el-table-column
            prop="status"
            label="状态"
            width="90"
          >
            <template #default="{ row }">
              <el-switch
                :model-value="row.status === 1"
                active-text="启用"
                inactive-text="禁用"
                @change="(val) => handleStatusChange(row, val)"
              />
            </template>
          </el-table-column>
          <el-table-column
            prop="createdAt"
            label="创建时间"
            width="170"
          />
          <el-table-column
            label="操作"
            width="200"
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
                type="warning"
                text
                size="small"
                @click="openResetDialog(row)"
              >
                重置密码
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
      </el-tab-pane>

      <!-- Tab2: 绑定关系 -->
      <el-tab-pane
        label="绑定关系"
        name="bindings"
      >
        <el-table
          v-loading="bindingLoading"
          :data="bindingData"
          stripe
          border
        >
          <el-table-column
            prop="id"
            label="ID"
            width="70"
          />
          <el-table-column
            prop="user_name"
            label="家属姓名"
            width="120"
          />
          <el-table-column
            prop="user_phone"
            label="家属电话"
            width="130"
          />
          <el-table-column
            prop="elderly_name"
            label="老人姓名"
            width="120"
          />
          <el-table-column
            prop="elderly_phone"
            label="老人电话"
            width="130"
          />
          <el-table-column
            prop="relationship"
            label="关系"
            width="120"
          />
          <el-table-column
            label="操作"
            width="120"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                type="danger"
                text
                size="small"
                @click="handleUnbind(row)"
              >
                解除绑定
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty
          v-if="!bindingLoading && bindingData.length === 0"
          description="暂无绑定关系"
        />

        <div style="display: flex; justify-content: flex-end; margin-top: 16px">
          <el-pagination
            v-model:current-page="bindingPagination.page"
            v-model:page-size="bindingPagination.pageSize"
            :total="bindingPagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="fetchBindings"
            @current-change="fetchBindings"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑人员' : '新增人员'"
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
          label="用户名"
          prop="username"
        >
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item
          v-if="!isEdit"
          label="密码"
          prop="password"
        >
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item
          label="姓名"
          prop="realName"
        >
          <el-input
            v-model="form.realName"
            placeholder="请输入姓名"
          />
        </el-form-item>
        <el-form-item
          label="角色"
          prop="role"
        >
          <el-select
            v-model="form.role"
            placeholder="请选择角色"
            style="width: 100%"
          >
            <el-option
              label="家属"
              value="FAMILY_MEMBER"
            />
            <el-option
              label="老人"
              value="ELDERLY"
            />
          </el-select>
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
          label="状态"
          prop="status"
        >
          <el-switch
            v-model="form.statusActive"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>

        <!-- 家属专属字段 -->
        <template v-if="form.role === 'FAMILY_MEMBER'">
          <el-form-item
            label="关联老人"
            prop="bindElderlyId"
          >
            <el-select
              v-model="form.bindElderlyId"
              placeholder="请选择关联老人"
              clearable
              filterable
              style="width: 100%"
            >
              <el-option
                v-for="e in elderlyOptions"
                :key="e.id"
                :label="`${e.realName} (${e.phone})`"
                :value="e.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            label="与老人关系"
            prop="relationship"
          >
            <el-select
              v-model="form.relationship"
              placeholder="请选择关系"
              style="width: 100%"
            >
              <el-option
                label="女儿"
                value="女儿"
              />
              <el-option
                label="儿子"
                value="儿子"
              />
              <el-option
                label="配偶"
                value="配偶"
              />
              <el-option
                label="孙子女"
                value="孙子女"
              />
              <el-option
                label="其他亲属"
                value="其他亲属"
              />
              <el-option
                label="朋友"
                value="朋友"
              />
              <el-option
                label="邻居"
                value="邻居"
              />
            </el-select>
          </el-form-item>
        </template>

        <!-- 老人专属字段 -->
        <template v-if="form.role === 'ELDERLY'">
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
                value="男"
              />
              <el-option
                label="女"
                value="女"
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
              placeholder="请选择出生日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
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
        </template>
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

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetDialogVisible"
      title="重置密码"
      width="450px"
      destroy-on-close
    >
      <el-form
        ref="resetFormRef"
        :model="resetForm"
        :rules="resetFormRules"
        label-width="100px"
      >
        <el-form-item label="用户">
          <span>{{ resetUser?.username }}</span>
        </el-form-item>
        <el-form-item
          label="新密码"
          prop="newPassword"
        >
          <el-input
            v-model="resetForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
        <el-form-item
          label="确认密码"
          prop="confirmPassword"
        >
          <el-input
            v-model="resetForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="resetLoading"
          @click="handleResetSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

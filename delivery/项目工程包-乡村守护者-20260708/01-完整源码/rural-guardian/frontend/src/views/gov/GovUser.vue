<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import {
  Plus, Search, Edit, Delete, Key, RefreshRight,
  UserFilled, OfficeBuilding, Shop, User, Avatar,
  FirstAidKit, HomeFilled, WarningFilled, MoreFilled,
  Male, Female, DocumentChecked, CircleClose
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, createUser, updateUser, deleteUser, resetPassword } from '../../api/user'
import { getVillageList } from '../../api/village'
import { getElderlyList } from '../../api/elderly'
import { getFamilyList, deleteFamily } from '../../api/family'

const loading = ref(false)
const submitLoading = ref(false)
const resetLoading = ref(false)
const dialogVisible = ref(false)
const resetDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref(null)
const formRef2 = ref(null)
const resetFormRef = ref(null)
const tableData = ref([])
const villageOptions = ref([])
const resetUser = ref(null)
const activeTab = ref('userList')
const currentStep = ref(0)

// 绑定关系相关
const familyLoading = ref(false)
const familyData = ref([])
const elderlyOptions = ref([])

const filters = reactive({ keyword: '', role: '', status: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const defaultForm = {
  username: '', password: '', realName: '', role: '', phone: '', villageId: null, statusActive: true,
  bindElderlyId: null, relationship: '', gender: '', birthDate: '', livingAlone: false,
  serviceTypes: [], serviceArea: '',
}
const form = reactive({ ...defaultForm })

const resetForm = reactive({ newPassword: '', confirmPassword: '' })

// 密码强度
const passwordStrength = reactive({
  percent: 0,
  text: '',
  class: ''
})

// 角色选项配置
const roleOptions = [
  { value: 'GOV_ADMIN', label: '政府管理员', color: '#ff4d4f', icon: 'OfficeBuilding', desc: '系统管理权限' },
  { value: 'VILLAGE_STAFF', label: '村级专员', color: '#faad14', icon: 'User', desc: '村级事务管理' },
  { value: 'PROVIDER', label: '服务商', color: '#52c41a', icon: 'Shop', desc: '提供服务支持' },
  { value: 'FAMILY_MEMBER', label: '家属', color: '#1677ff', icon: 'UserFilled', desc: '老人家属账号' },
  { value: 'ELDERLY', label: '老人', color: '#722ed1', icon: 'Avatar', desc: '服务对象账号' },
]

// 服务类型映射
const serviceTypeMap = {
  MEDICAL: '医疗护理',
  LIFE_CARE: '生活照料',
  COMPANION: '陪伴陪护',
  EMERGENCY: '紧急救援',
  OTHER: '其他服务'
}

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
}

const formRules2 = {
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  villageId: [{ required: true, message: '请选择所属村庄', trigger: 'change', validator: (rule, value, callback) => {
    if ((form.role === 'VILLAGE_STAFF') && !value) {
      callback(new Error('村级专员必须选择所属村庄'))
    } else {
      callback()
    }
  }}],
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

// 密码强度检查
function checkPasswordStrength() {
  const pwd = resetForm.newPassword
  if (!pwd) {
    passwordStrength.percent = 0
    passwordStrength.text = ''
    passwordStrength.class = ''
    return
  }

  let score = 0
  if (pwd.length >= 6) score += 20
  if (pwd.length >= 10) score += 20
  if (/[a-z]/.test(pwd)) score += 15
  if (/[A-Z]/.test(pwd)) score += 15
  if (/[0-9]/.test(pwd)) score += 15
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 15

  passwordStrength.percent = score

  if (score < 40) {
    passwordStrength.text = '弱'
    passwordStrength.class = 'weak'
  } else if (score < 70) {
    passwordStrength.text = '中'
    passwordStrength.class = 'medium'
  } else {
    passwordStrength.text = '强'
    passwordStrength.class = 'strong'
  }
}

function roleTagClass(role) {
  const map = {
    GOV_ADMIN: 'role-gov',
    VILLAGE_STAFF: 'role-village',
    PROVIDER: 'role-provider',
    FAMILY_MEMBER: 'role-family',
    ELDERLY: 'role-elderly'
  }
  return map[role] || 'role-default'
}

function roleText(role) {
  const map = { GOV_ADMIN: '政府管理员', VILLAGE_STAFF: '村级专员', PROVIDER: '服务商', FAMILY_MEMBER: '家属', ELDERLY: '老人' }
  return map[role] || role
}

function getVillageName(villageId) {
  const village = villageOptions.value.find(v => v.id === villageId)
  return village ? village.name : '-'
}

function getElderlyName(elderlyId) {
  const elderly = elderlyOptions.value.find(e => e.id === elderlyId)
  return elderly ? (elderly.realName || elderly.name) : '-'
}

function getServiceTypeText(type) {
  return serviceTypeMap[type] || type
}

function resetFilters() {
  filters.keyword = ''
  filters.role = ''
  filters.status = ''
  pagination.page = 1
  fetchData()
}

function handleTabChange(tab) {
  if (tab === 'bindRelation') {
    fetchFamilyData()
  }
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.role) params.role = filters.role
    if (filters.status) params.status = filters.status
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

async function fetchElderlyOptions() {
  try {
    const res = await getElderlyList({ page: 1, pageSize: 1000 })
    if (res.code === 200) {
      elderlyOptions.value = res.data.list || res.data || []
    }
  } catch (err) {
    console.error(err)
  }
}

async function fetchFamilyData() {
  familyLoading.value = true
  try {
    const res = await getFamilyList({ page: 1, pageSize: 1000 })
    if (res.code === 200) {
      familyData.value = res.data.list || res.data || []
    }
  } catch (err) {
    console.error(err)
  } finally {
    familyLoading.value = false
  }
}

function openDialog(row) {
  currentStep.value = 0
  if (row) {
    isEdit.value = true
    editId.value = row.id
    Object.assign(form, {
      username: row.username,
      password: '',
      realName: row.realName || '',
      role: row.role,
      phone: row.phone || '',
      villageId: row.villageId || null,
      statusActive: Number(row.status) === 1,
      bindElderlyId: null,
      relationship: '',
      gender: '',
      birthDate: '',
      livingAlone: false,
      serviceTypes: [],
      serviceArea: '',
    })
  } else {
    isEdit.value = false
    editId.value = null
    Object.assign(form, { ...defaultForm })
  }
  dialogVisible.value = true
}

async function handleNextStep() {
  if (currentStep.value === 0) {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
  } else if (currentStep.value === 1) {
    const valid = await formRef2.value.validate().catch(() => false)
    if (!valid) return
  }
  currentStep.value++
}

async function handleSubmit() {
  submitLoading.value = true
  try {
    const data = {
      username: form.username,
      realName: form.realName,
      role: form.role,
      phone: form.phone,
      villageId: form.villageId,
      status: form.statusActive ? 1 : 0,
    }
    if (!isEdit.value) {
      data.password = form.password
    }
    // 家属角色：添加绑定信息
    if (form.role === 'FAMILY_MEMBER' && form.bindElderlyId) {
      data.bindElderlyId = form.bindElderlyId
      data.relationship = form.relationship
    }
    // 老人角色：添加老人信息
    if (form.role === 'ELDERLY') {
      data.gender = form.gender
      data.birthDate = form.birthDate
      data.livingAlone = form.livingAlone
    }
    // 服务商角色：添加服务信息
    if (form.role === 'PROVIDER') {
      data.serviceTypes = form.serviceTypes.join(',')
      data.serviceArea = form.serviceArea
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

async function handleStatusChange(row, val) {
  const newStatus = val ? 1 : 0
  const statusText = val ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定要${statusText}用户 "${row.username}" 吗？`, '确认操作', { type: 'warning' })
    await updateUser(row.id, { ...row, status: newStatus })
    ElMessage.success(`${statusText}成功`)
    fetchData()
  } catch (err) {
    // 用户取消或请求失败，刷新数据恢复 switch UI
    fetchData()
  }
}

function openResetDialog(row) {
  resetUser.value = row
  resetForm.newPassword = ''
  resetForm.confirmPassword = ''
  passwordStrength.percent = 0
  passwordStrength.text = ''
  passwordStrength.class = ''
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

async function handleUnbind(row) {
  await ElMessageBox.confirm(
    `确定要解除 "${row.user_name}" 与 "${row.elderly_name}" 的绑定关系吗？`,
    '确认解除绑定',
    { type: 'warning' }
  )
  try {
    await deleteFamily(row.id)
    ElMessage.success('解除绑定成功')
    fetchFamilyData()
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  fetchData()
  fetchVillages()
  fetchElderlyOptions()
})
</script>

<template>
  <div class="gov-user-page">
    <!-- 顶部标题区 -->
    <div class="page-header-card">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            用户管理
          </h1>
          <p class="page-subtitle">
            管理系统用户账号、角色权限及绑定关系
          </p>
        </div>
        <el-button
          type="primary"
          size="large"
          class="add-btn"
          @click="openDialog()"
        >
          <el-icon><Plus /></el-icon>
          <span>新增用户</span>
        </el-button>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tab-card">
      <el-tabs
        v-model="activeTab"
        class="custom-tabs"
        @tab-change="handleTabChange"
      >
        <!-- 用户列表 Tab -->
        <el-tab-pane
          label="用户列表"
          name="userList"
        >
          <div class="tab-content">
            <!-- 筛选栏 -->
            <div class="filter-section">
              <div class="filter-row">
                <el-input
                  v-model="filters.keyword"
                  placeholder="搜索用户名/姓名/电话"
                  clearable
                  class="filter-input"
                  @clear="fetchData"
                  @keyup.enter="fetchData"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-select
                  v-model="filters.role"
                  placeholder="全部角色"
                  clearable
                  class="filter-select"
                  @change="fetchData"
                >
                  <el-option
                    label="全部角色"
                    value=""
                  />
                  <el-option
                    label="政府管理员"
                    value="GOV_ADMIN"
                  >
                    <span class="role-option">
                      <span
                        class="role-dot"
                        style="background: #ff4d4f;"
                      />
                      政府管理员
                    </span>
                  </el-option>
                  <el-option
                    label="村级专员"
                    value="VILLAGE_STAFF"
                  >
                    <span class="role-option">
                      <span
                        class="role-dot"
                        style="background: #faad14;"
                      />
                      村级专员
                    </span>
                  </el-option>
                  <el-option
                    label="服务商"
                    value="PROVIDER"
                  >
                    <span class="role-option">
                      <span
                        class="role-dot"
                        style="background: #52c41a;"
                      />
                      服务商
                    </span>
                  </el-option>
                  <el-option
                    label="家属"
                    value="FAMILY_MEMBER"
                  >
                    <span class="role-option">
                      <span
                        class="role-dot"
                        style="background: #1677ff;"
                      />
                      家属
                    </span>
                  </el-option>
                  <el-option
                    label="老人"
                    value="ELDERLY"
                  >
                    <span class="role-option">
                      <span
                        class="role-dot"
                        style="background: #722ed1;"
                      />
                      老人
                    </span>
                  </el-option>
                </el-select>
                <el-select
                  v-model="filters.status"
                  placeholder="全部状态"
                  clearable
                  class="filter-select"
                  @change="fetchData"
                >
                  <el-option
                    label="全部状态"
                    value=""
                  />
                  <el-option
                    label="启用"
                    value="1"
                  />
                  <el-option
                    label="禁用"
                    value="0"
                  />
                </el-select>
                <el-button
                  type="primary"
                  class="search-btn"
                  @click="fetchData"
                >
                  <el-icon><Search /></el-icon>查询
                </el-button>
                <el-button
                  class="reset-btn"
                  @click="resetFilters"
                >
                  <el-icon><RefreshRight /></el-icon>重置
                </el-button>
              </div>
            </div>

            <!-- 数据表格 -->
            <el-table
              v-loading="loading"
              :data="tableData"
              class="custom-table"
              row-class-name="table-row"
            >
              <el-table-column
                prop="id"
                label="ID"
                width="70"
                align="center"
              />
              <el-table-column
                prop="username"
                label="用户名"
                width="130"
              />
              <el-table-column
                prop="real_name"
                label="姓名"
                width="100"
              />
              <el-table-column
                prop="role"
                label="角色"
                width="120"
              >
                <template #default="{ row }">
                  <span :class="['role-tag', roleTagClass(row.role)]">
                    {{ roleText(row.role) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column
                prop="phone"
                label="电话"
                width="130"
              />
              <el-table-column
                prop="village_name"
                label="所属村庄"
                min-width="120"
              >
                <template #default="{ row }">
                  <span class="village-text">{{ row.village_name || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column
                prop="status"
                label="状态"
                width="90"
                align="center"
              >
                <template #default="{ row }">
                  <el-switch
                    :model-value="Number(row.status) === 1"
                    :active-value="true"
                    :inactive-value="false"
                    style="--el-switch-on-color: #1677ff;"
                    @change="(val) => handleStatusChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column
                prop="created_at"
                label="创建时间"
                width="170"
              />
              <el-table-column
                label="操作"
                width="200"
                fixed="right"
              >
                <template #default="{ row }">
                  <div class="action-btns">
                    <el-button
                      type="primary"
                      link
                      class="action-btn"
                      @click="openDialog(row)"
                    >
                      <el-icon><Edit /></el-icon>编辑
                    </el-button>
                    <el-button
                      type="warning"
                      link
                      class="action-btn"
                      @click="openResetDialog(row)"
                    >
                      <el-icon><Key /></el-icon>重置密码
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      class="action-btn"
                      @click="handleDelete(row)"
                    >
                      <el-icon><Delete /></el-icon>删除
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <el-empty
              v-if="!loading && tableData.length === 0"
              description="暂无数据"
              class="custom-empty"
            />

            <!-- 分页 -->
            <div class="pagination-section">
              <el-pagination
                v-model:current-page="pagination.page"
                v-model:page-size="pagination.pageSize"
                :total="pagination.total"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                class="custom-pagination"
                @size-change="fetchData"
                @current-change="fetchData"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- 绑定关系管理 Tab -->
        <el-tab-pane
          label="绑定关系管理"
          name="bindRelation"
        >
          <div class="tab-content">
            <el-table
              v-loading="familyLoading"
              :data="familyData"
              class="custom-table"
            >
              <el-table-column
                prop="id"
                label="ID"
                width="70"
                align="center"
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
              >
                <template #default="{ row }">
                  <span class="relationship-tag">{{ row.relationship }}</span>
                </template>
              </el-table-column>
              <el-table-column
                label="操作"
                width="120"
                fixed="right"
              >
                <template #default="{ row }">
                  <el-button
                    type="danger"
                    link
                    @click="handleUnbind(row)"
                  >
                    <el-icon><CircleClose /></el-icon>解除绑定
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-empty
              v-if="!familyLoading && familyData.length === 0"
              description="暂无绑定关系"
              class="custom-empty"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 新增/编辑对话框 - 分步骤表单 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="700px"
      destroy-on-close
      class="custom-dialog step-dialog"
      :close-on-click-modal="false"
    >
      <el-steps
        :active="currentStep"
        finish-status="success"
        simple
        class="form-steps"
      >
        <el-step title="基本信息" />
        <el-step title="角色信息" />
        <el-step title="确认" />
      </el-steps>

      <!-- 步骤1：基本信息 -->
      <div
        v-show="currentStep === 0"
        class="step-content"
      >
        <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          label-width="100px"
          class="step-form"
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
            label="电话"
            prop="phone"
          >
            <el-input
              v-model="form.phone"
              placeholder="请输入电话"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-switch
              v-model="form.statusActive"
              active-text="启用"
              inactive-text="禁用"
              style="--el-switch-on-color: #1677ff;"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- 步骤2：角色信息 -->
      <div
        v-show="currentStep === 1"
        class="step-content"
      >
        <el-form
          ref="formRef2"
          :model="form"
          :rules="formRules2"
          label-width="100px"
          class="step-form"
        >
          <el-form-item
            label="选择角色"
            prop="role"
          >
            <div class="role-select-grid">
              <div
                v-for="role in roleOptions"
                :key="role.value"
                :class="['role-card', { active: form.role === role.value }]"
                @click="form.role = role.value"
              >
                <div
                  class="role-icon"
                  :style="{ background: role.color + '20', color: role.color }"
                >
                  <el-icon :size="24">
                    <component :is="role.icon" />
                  </el-icon>
                </div>
                <div class="role-name">
                  {{ role.label }}
                </div>
                <div class="role-desc">
                  {{ role.desc }}
                </div>
              </div>
            </div>
          </el-form-item>

          <!-- 村级专员：选择所属村庄 -->
          <template v-if="form.role === 'VILLAGE_STAFF'">
            <el-divider content-position="left">
              村级专员信息
            </el-divider>
            <el-form-item
              label="所属村庄"
              prop="villageId"
            >
              <el-select
                v-model="form.villageId"
                placeholder="请选择所属村庄"
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
          </template>

          <!-- 服务商：服务类型复选框、服务区域 -->
          <template v-if="form.role === 'PROVIDER'">
            <el-divider content-position="left">
              服务商信息
            </el-divider>
            <el-form-item
              label="服务类型"
              prop="serviceTypes"
            >
              <el-checkbox-group
                v-model="form.serviceTypes"
                class="service-type-group"
              >
                <el-checkbox label="MEDICAL">
                  <span class="checkbox-label">
                    <el-icon color="#1677ff"><FirstAidKit /></el-icon>
                    医疗护理
                  </span>
                </el-checkbox>
                <el-checkbox label="LIFE_CARE">
                  <span class="checkbox-label">
                    <el-icon color="#52c41a"><HomeFilled /></el-icon>
                    生活照料
                  </span>
                </el-checkbox>
                <el-checkbox label="COMPANION">
                  <span class="checkbox-label">
                    <el-icon color="#faad14"><UserFilled /></el-icon>
                    陪伴陪护
                  </span>
                </el-checkbox>
                <el-checkbox label="EMERGENCY">
                  <span class="checkbox-label">
                    <el-icon color="#ff4d4f"><WarningFilled /></el-icon>
                    紧急救援
                  </span>
                </el-checkbox>
                <el-checkbox label="OTHER">
                  <span class="checkbox-label">
                    <el-icon color="#722ed1"><MoreFilled /></el-icon>
                    其他服务
                  </span>
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item
              label="服务区域"
              prop="serviceArea"
            >
              <el-input
                v-model="form.serviceArea"
                placeholder="请输入服务区域，如：某某镇、某某村"
              />
            </el-form-item>
          </template>

          <!-- 家属：关联老人选择、关系选择 -->
          <template v-if="form.role === 'FAMILY_MEMBER'">
            <el-divider content-position="left">
              家属信息
            </el-divider>
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
                  :label="`${e.realName || e.name} (${e.phone || ''})`"
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
                clearable
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

          <!-- 老人：性别、出生日期、是否独居 -->
          <template v-if="form.role === 'ELDERLY'">
            <el-divider content-position="left">
              老人信息
            </el-divider>
            <el-form-item
              label="性别"
              prop="gender"
            >
              <el-radio-group v-model="form.gender">
                <el-radio label="男">
                  <span class="radio-label"><el-icon><Male /></el-icon> 男</span>
                </el-radio>
                <el-radio label="女">
                  <span class="radio-label"><el-icon><Female /></el-icon> 女</span>
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
                placeholder="请选择出生日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="居住情况">
              <el-switch
                v-model="form.livingAlone"
                active-text="独居"
                inactive-text="非独居"
                style="--el-switch-on-color: #faad14;"
              />
            </el-form-item>
            <el-form-item
              label="所属村庄"
              prop="villageId"
            >
              <el-select
                v-model="form.villageId"
                placeholder="请选择所属村庄"
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
          </template>

          <!-- 政府管理员：所属村庄 -->
          <template v-if="form.role === 'GOV_ADMIN'">
            <el-divider content-position="left">
              管理员信息
            </el-divider>
            <el-form-item
              label="所属村庄"
              prop="villageId"
            >
              <el-select
                v-model="form.villageId"
                placeholder="请选择所属村庄（可选）"
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
          </template>
        </el-form>
      </div>

      <!-- 步骤3：确认 -->
      <div
        v-show="currentStep === 2"
        class="step-content"
      >
        <div class="confirm-section">
          <div class="confirm-icon">
            <el-icon
              color="#1677ff"
              :size="48"
            >
              <DocumentChecked />
            </el-icon>
          </div>
          <h3 class="confirm-title">
            请确认以下信息
          </h3>
          <div class="confirm-info">
            <div class="info-item">
              <span class="info-label">用户名：</span>
              <span class="info-value">{{ form.username }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">姓名：</span>
              <span class="info-value">{{ form.realName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">电话：</span>
              <span class="info-value">{{ form.phone || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">角色：</span>
              <span class="info-value">
                <span :class="['role-tag', roleTagClass(form.role)]">{{ roleText(form.role) }}</span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">状态：</span>
              <span class="info-value">{{ form.statusActive ? '启用' : '禁用' }}</span>
            </div>
            <template v-if="form.role === 'VILLAGE_STAFF' && form.villageId">
              <div class="info-item">
                <span class="info-label">所属村庄：</span>
                <span class="info-value">{{ getVillageName(form.villageId) }}</span>
              </div>
            </template>
            <template v-if="form.role === 'PROVIDER'">
              <div class="info-item">
                <span class="info-label">服务类型：</span>
                <span class="info-value">{{ form.serviceTypes.map(getServiceTypeText).join('、') || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">服务区域：</span>
                <span class="info-value">{{ form.serviceArea || '-' }}</span>
              </div>
            </template>
            <template v-if="form.role === 'FAMILY_MEMBER'">
              <div class="info-item">
                <span class="info-label">关联老人：</span>
                <span class="info-value">{{ getElderlyName(form.bindElderlyId) || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">关系：</span>
                <span class="info-value">{{ form.relationship || '-' }}</span>
              </div>
            </template>
            <template v-if="form.role === 'ELDERLY'">
              <div class="info-item">
                <span class="info-label">性别：</span>
                <span class="info-value">{{ form.gender || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">出生日期：</span>
                <span class="info-value">{{ form.birthDate || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">居住情况：</span>
                <span class="info-value">{{ form.livingAlone ? '独居' : '非独居' }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button
            v-if="currentStep > 0"
            @click="currentStep--"
          >
            上一步
          </el-button>
          <el-button
            v-if="currentStep < 2"
            type="primary"
            @click="handleNextStep"
          >
            下一步
          </el-button>
          <el-button
            v-if="currentStep === 2"
            @click="dialogVisible = false"
          >
            取消
          </el-button>
          <el-button
            v-if="currentStep === 2"
            type="primary"
            :loading="submitLoading"
            @click="handleSubmit"
          >
            {{ isEdit ? '保存修改' : '确认创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetDialogVisible"
      title="重置密码"
      width="450px"
      destroy-on-close
      class="custom-dialog"
    >
      <div class="reset-password-section">
        <div class="reset-user-info">
          <el-avatar
            :size="48"
            :icon="UserFilled"
            class="user-avatar"
          />
          <div class="user-meta">
            <div class="user-name">
              {{ resetUser?.realName || resetUser?.username }}
            </div>
            <div class="user-role">
              <span :class="['role-tag', roleTagClass(resetUser?.role)]">{{ roleText(resetUser?.role) }}</span>
            </div>
          </div>
        </div>

        <el-form
          ref="resetFormRef"
          :model="resetForm"
          :rules="resetFormRules"
          label-width="100px"
        >
          <el-form-item
            label="新密码"
            prop="newPassword"
          >
            <el-input
              v-model="resetForm.newPassword"
              type="password"
              placeholder="请输入新密码"
              show-password
              @input="checkPasswordStrength"
            />
          </el-form-item>

          <!-- 密码强度提示 -->
          <div
            v-if="resetForm.newPassword"
            class="password-strength"
          >
            <div class="strength-label">
              密码强度：
            </div>
            <div class="strength-bar">
              <div
                class="strength-fill"
                :class="passwordStrength.class"
                :style="{ width: passwordStrength.percent + '%' }"
              />
            </div>
            <div
              class="strength-text"
              :class="passwordStrength.class"
            >
              {{ passwordStrength.text }}
            </div>
          </div>

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
      </div>

      <template #footer>
        <el-button @click="resetDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="resetLoading"
          @click="handleResetSubmit"
        >
          确认重置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 页面整体布局 */
.gov-user-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

/* 顶部标题卡片 */
.page-header-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px 28px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.add-btn {
  background: #1677ff;
  border-color: #1677ff;
  padding: 10px 20px;
  font-size: 14px;
  border-radius: 8px;
}

.add-btn:hover {
  background: #4096ff;
  border-color: #4096ff;
}

/* Tab卡片 */
.tab-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.custom-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.custom-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: #e5e7eb;
}

.custom-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
  color: #6b7280;
  padding: 0 24px;
}

.custom-tabs :deep(.el-tabs__item.is-active) {
  color: #1677ff;
}

.custom-tabs :deep(.el-tabs__active-bar) {
  background: #1677ff;
  height: 3px;
  border-radius: 2px;
}

.tab-content {
  padding: 4px 0;
}

/* 筛选栏 */
.filter-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-input {
  width: 240px;
}

.filter-select {
  width: 150px;
}

.search-btn {
  background: #1677ff;
  border-color: #1677ff;
}

.search-btn:hover {
  background: #4096ff;
  border-color: #4096ff;
}

.reset-btn {
  color: #6b7280;
}

/* 角色选择下拉样式 */
.role-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* 自定义表格 */
.custom-table {
  border-radius: 8px;
  overflow: hidden;
}

.custom-table :deep(.el-table__header) {
  background: #f9fafb;
}

.custom-table :deep(.el-table__header th) {
  background: #f9fafb;
  color: #374151;
  font-weight: 600;
  font-size: 13px;
  padding: 12px 0;
}

.custom-table :deep(.el-table__row) {
  transition: background 0.2s;
}

.custom-table :deep(.el-table__row:hover) {
  background: #f0f7ff;
}

.custom-table :deep(.el-table__cell) {
  padding: 14px 0;
  font-size: 13px;
  color: #4b5563;
}

/* 角色标签 */
.role-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}

.role-gov {
  background: #fff1f0;
  color: #ff4d4f;
  border: 1px solid #ffa39e;
}

.role-village {
  background: #fffbe6;
  color: #faad14;
  border: 1px solid #ffe58f;
}

.role-provider {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.role-family {
  background: #e6f4ff;
  color: #1677ff;
  border: 1px solid #91caff;
}

.role-elderly {
  background: #f9f0ff;
  color: #722ed1;
  border: 1px solid #d3adf7;
}

.role-default {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

/* 村庄文本 */
.village-text {
  color: #6b7280;
}

/* 操作按钮 */
.action-btns {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 8px;
  font-size: 13px;
}

/* 关系标签 */
.relationship-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: #e6f4ff;
  color: #1677ff;
  border: 1px solid #91caff;
}

/* 分页 */
.pagination-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.custom-pagination :deep(.el-pagination__total) {
  color: #6b7280;
}

.custom-pagination :deep(.el-pager li.active) {
  background: #1677ff;
  color: #fff;
}

.custom-pagination :deep(.el-pager li:hover) {
  color: #1677ff;
}

/* 空状态 */
.custom-empty {
  padding: 60px 0;
}

/* 对话框样式 */
.custom-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #e5e7eb;
  padding: 20px 24px;
  margin-right: 0;
}

.custom-dialog :deep(.el-dialog__title) {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
}

.custom-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.custom-dialog :deep(.el-dialog__footer) {
  border-top: 1px solid #e5e7eb;
  padding: 16px 24px;
}

/* 步骤表单 */
.form-steps {
  margin-bottom: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.form-steps :deep(.el-step__title) {
  font-size: 14px;
}

.form-steps :deep(.el-step__head.is-success) {
  color: #52c41a;
  border-color: #52c41a;
}

.form-steps :deep(.el-step__head.is-process) {
  color: #1677ff;
  border-color: #1677ff;
}

.step-content {
  min-height: 280px;
}

.step-form {
  max-width: 500px;
  margin: 0 auto;
}

.step-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
}

/* 角色选择卡片 */
.role-select-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.role-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.role-card:hover {
  border-color: #1677ff;
  background: #f0f7ff;
}

.role-card.active {
  border-color: #1677ff;
  background: #e6f4ff;
}

.role-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}

.role-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.role-desc {
  font-size: 12px;
  color: #6b7280;
}

/* 服务类型复选框 */
.service-type-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.service-type-group :deep(.el-checkbox) {
  margin-right: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 单选按钮 */
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 确认信息 */
.confirm-section {
  text-align: center;
  padding: 20px 0;
}

.confirm-icon {
  margin-bottom: 16px;
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24px;
}

.confirm-info {
  max-width: 400px;
  margin: 0 auto;
  text-align: left;
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
}

.info-item {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px dashed #e5e7eb;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  width: 100px;
  color: #6b7280;
  font-size: 14px;
}

.info-value {
  flex: 1;
  color: #1f2937;
  font-size: 14px;
  font-weight: 500;
}

/* 重置密码区域 */
.reset-password-section {
  padding: 8px 0;
}

.reset-user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 24px;
}

.user-avatar {
  background: #1677ff20;
  color: #1677ff;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.user-role {
  display: flex;
}

/* 密码强度 */
.password-strength {
  margin: -10px 0 16px 100px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.strength-label {
  font-size: 13px;
  color: #6b7280;
}

.strength-bar {
  width: 120px;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 3px;
  transition: all 0.3s;
}

.strength-fill.weak {
  background: #ff4d4f;
}

.strength-fill.medium {
  background: #faad14;
}

.strength-fill.strong {
  background: #52c41a;
}

.strength-text {
  font-size: 13px;
  font-weight: 500;
}

.strength-text.weak {
  color: #ff4d4f;
}

.strength-text.medium {
  color: #faad14;
}

.strength-text.strong {
  color: #52c41a;
}

/* 对话框底部 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

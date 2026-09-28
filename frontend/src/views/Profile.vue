<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { User } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { updateProfile, changePassword } from '../api/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const activeTab = ref('info')
const infoFormRef = ref(null)
const pwdFormRef = ref(null)
const infoLoading = ref(false)
const pwdLoading = ref(false)

const roleTagTypeMap = {
  GOV_ADMIN: 'danger',
  VILLAGE_STAFF: 'warning',
  PROVIDER: 'success',
  FAMILY_MEMBER: 'info',
  ELDERLY: '',
}

const roleTagType = computed(() => roleTagTypeMap[userStore.role] || '')

const infoForm = reactive({
  realName: '',
  phone: '',
})

const infoRules = {
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
}

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== pwdForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const pwdRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function handleUpdateInfo() {
  const valid = await infoFormRef.value.validate().catch(() => false)
  if (!valid) return

  infoLoading.value = true
  try {
    await updateProfile({ realName: infoForm.realName, phone: infoForm.phone })
    await userStore.fetchUserInfo()
    ElMessage.success('信息修改成功')
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    infoLoading.value = false
  }
}

async function handleChangePassword() {
  const valid = await pwdFormRef.value.validate().catch(() => false)
  if (!valid) return

  pwdLoading.value = true
  try {
    await changePassword({
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword,
    })
    ElMessage.success('密码修改成功，请重新登录')
    pwdFormRef.value.resetFields()
    userStore.logout()
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    pwdLoading.value = false
  }
}

onMounted(() => {
  if (!userStore.userInfo) {
    userStore.fetchUserInfo()
  }
  // 填充表单
  if (userStore.userInfo) {
    infoForm.realName = userStore.userInfo.realName || ''
    infoForm.phone = userStore.userInfo.phone || ''
  }
})
</script>

<template>
  <div class="profile-page page-container">
    <div class="page-header">
      <h2>个人中心</h2>
    </div>

    <el-row :gutter="20">
      <!-- 用户信息卡片 -->
      <el-col :span="8">
        <el-card class="profile-card">
          <div class="avatar-section">
            <div class="avatar-placeholder">
              <el-icon :size="48">
                <User />
              </el-icon>
            </div>
            <h3 class="user-realname">
              {{ userStore.realName || userStore.userInfo?.username }}
            </h3>
            <el-tag
              :type="roleTagType"
              size="small"
              effect="dark"
            >
              {{ userStore.roleName }}
            </el-tag>
          </div>
          <el-divider />
          <el-descriptions
            :column="1"
            size="small"
          >
            <el-descriptions-item label="用户名">
              {{ userStore.userInfo?.username }}
            </el-descriptions-item>
            <el-descriptions-item label="姓名">
              {{ userStore.userInfo?.realName || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="电话">
              {{ userStore.userInfo?.phone || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="角色">
              {{ userStore.roleName }}
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">
              {{ formatDate(userStore.userInfo?.createdAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 表单区域 -->
      <el-col :span="16">
        <el-tabs v-model="activeTab">
          <!-- 修改个人信息 -->
          <el-tab-pane
            label="修改信息"
            name="info"
          >
            <el-card>
              <el-form
                ref="infoFormRef"
                :model="infoForm"
                :rules="infoRules"
                label-width="80px"
                style="max-width: 480px;"
              >
                <el-form-item
                  label="姓名"
                  prop="realName"
                >
                  <el-input
                    v-model="infoForm.realName"
                    placeholder="请输入姓名"
                  />
                </el-form-item>
                <el-form-item
                  label="电话"
                  prop="phone"
                >
                  <el-input
                    v-model="infoForm.phone"
                    placeholder="请输入电话号码"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="infoLoading"
                    @click="handleUpdateInfo"
                  >
                    保存修改
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>

          <!-- 修改密码 -->
          <el-tab-pane
            label="修改密码"
            name="password"
          >
            <el-card>
              <el-form
                ref="pwdFormRef"
                :model="pwdForm"
                :rules="pwdRules"
                label-width="100px"
                style="max-width: 480px;"
              >
                <el-form-item
                  label="旧密码"
                  prop="oldPassword"
                >
                  <el-input
                    v-model="pwdForm.oldPassword"
                    type="password"
                    placeholder="请输入旧密码"
                    show-password
                  />
                </el-form-item>
                <el-form-item
                  label="新密码"
                  prop="newPassword"
                >
                  <el-input
                    v-model="pwdForm.newPassword"
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
                    v-model="pwdForm.confirmPassword"
                    type="password"
                    placeholder="请再次输入新密码"
                    show-password
                  />
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="pwdLoading"
                    @click="handleChangePassword"
                  >
                    修改密码
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1200px;
}

.profile-card {
  text-align: center;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-placeholder {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 4px;
}

.user-realname {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}
</style>

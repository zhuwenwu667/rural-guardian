<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Phone, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { register } from '../../api/auth'
import { getVillageList } from '../../api/village'
import { getElderlyList } from '../../api/elderly'

const router = useRouter()
const registerFormRef = ref(null)
const loading = ref(false)
const villageList = ref([])
const elderlyList = ref([])

const roleOptions = [
  { label: '家属', value: 'FAMILY_MEMBER' },
  { label: '老人', value: 'ELDERLY' },
]

const relationshipOptions = [
  { label: '女儿', value: '女儿' },
  { label: '儿子', value: '儿子' },
  { label: '配偶', value: '配偶' },
  { label: '孙子女', value: '孙子女' },
  { label: '其他亲属', value: '其他亲属' },
  { label: '朋友', value: '朋友' },
  { label: '邻居', value: '邻居' },
]

const registerForm = reactive({
  phone: '',
  realName: '',
  password: '',
  confirmPassword: '',
  role: 'FAMILY_MEMBER',
  villageId: '',
  bindElderlyId: '',
  relationship: '',
})

const validatePhone = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入手机号'))
  } else if (!/^1[3-9]\d{9}$/.test(value)) {
    callback(new Error('请输入正确的11位手机号'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules = {
  phone: [{ required: true, validator: validatePhone, trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' },
  ],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
}

// 加载村庄列表
async function loadVillageList() {
  try {
    const res = await getVillageList()
    villageList.value = res || []
  } catch (err) {
    // 错误已在拦截器中处理
  }
}

// 加载老人列表
async function loadElderlyList() {
  try {
    const res = await getElderlyList()
    elderlyList.value = res || []
  } catch (err) {
    // 错误已在拦截器中处理
  }
}

onMounted(() => {
  loadVillageList()
  loadElderlyList()
})

async function handleRegister() {
  const valid = await registerFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await register({
      phone: registerForm.phone,
      password: registerForm.password,
      realName: registerForm.realName,
      role: registerForm.role,
      villageId: registerForm.villageId || undefined,
      bindElderlyId: registerForm.bindElderlyId || undefined,
      relationship: registerForm.relationship || undefined,
    })
    ElMessage.success('注册成功')
    setTimeout(() => {
      router.push('/login')
    }, 1000)
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <!-- 注册表单 -->
    <div class="login-form-area">
      <div class="login-form-wrapper">
        <div class="login-header">
          <h1 class="login-logo">
            乡村守护者
          </h1>
          <p class="login-subtitle">
            智慧养老综合服务平台
          </p>
        </div>

        <h2 class="form-title">
          用户注册
        </h2>
        <p class="form-desc">
          请填写注册信息
        </p>

        <!-- 角色选择 -->
        <div class="role-select">
          <div
            v-for="item in roleOptions"
            :key="item.value"
            :class="['role-card', { active: registerForm.role === item.value }]"
            @click="registerForm.role = item.value"
          >
            <span>{{ item.label }}</span>
          </div>
        </div>

        <!-- 注册表单 -->
        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          class="login-form"
          @keyup.enter="handleRegister"
        >
          <el-form-item prop="phone">
            <el-input
              v-model="registerForm.phone"
              placeholder="请输入手机号"
              size="large"
              :prefix-icon="Phone"
            />
          </el-form-item>
          <el-form-item prop="realName">
            <el-input
              v-model="registerForm.realName"
              placeholder="请输入姓名"
              size="large"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          <el-form-item prop="villageId">
            <el-select
              v-model="registerForm.villageId"
              placeholder="请选择村庄"
              size="large"
              style="width: 100%"
              clearable
            >
              <el-option
                v-for="village in villageList"
                :key="village.id"
                :label="village.name"
                :value="village.id"
              />
            </el-select>
          </el-form-item>

          <!-- 家属角色时动态显示的字段 -->
          <template v-if="registerForm.role === 'FAMILY_MEMBER'">
            <el-form-item prop="bindElderlyId">
              <el-select
                v-model="registerForm.bindElderlyId"
                placeholder="请选择要关联的老人（注册后也可绑定）"
                size="large"
                style="width: 100%"
                clearable
                filterable
              >
                <el-option
                  v-for="elderly in elderlyList"
                  :key="elderly.id"
                  :label="`${elderly.realName} (${elderly.phone})`"
                  :value="elderly.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item prop="relationship">
              <el-select
                v-model="registerForm.relationship"
                placeholder="请选择与老人关系"
                size="large"
                style="width: 100%"
                clearable
              >
                <el-option
                  v-for="item in relationshipOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </template>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="login-btn"
              @click="handleRegister"
            >
              {{ loading ? '注册中...' : '注 册' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-tips">
          <router-link to="/login">
            已有账号？立即登录
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 整体布局 ========== */
.login-container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* ========== 表单区域 ========== */
.login-form-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary, #f8fafc);
  padding: 40px;
  position: relative;
}

.login-form-wrapper {
  width: 100%;
  max-width: 420px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  font-size: 24px;
  font-weight: 600;
  color: var(--text, #0f172a);
  margin: 0;
}

.login-subtitle {
  font-size: 14px;
  color: var(--text-muted, #94a3b8);
  margin-top: 8px;
  margin-bottom: 0;
}

.form-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text, #0f172a);
  margin: 0 0 4px 0;
}

.form-desc {
  font-size: 14px;
  color: var(--text-muted, #94a3b8);
  margin: 0 0 28px 0;
}

/* ========== 角色选择 ========== */
.role-select {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.role-card {
  flex: 1;
  padding: 10px 20px;
  border: 2px solid var(--border-light, #e2e8f0);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  text-align: center;
  transition: all 0.3s ease;
  color: var(--text-muted, #94a3b8);
  background: #fff;
}

.role-card:hover {
  border-color: #1677ff;
  box-shadow: 0 4px 20px rgba(22, 119, 255, 0.12);
  transform: translateY(-1px);
}

.role-card.active {
  border-color: #1677ff;
  color: #1677ff;
  background: #e6f4ff;
  font-weight: 600;
}

/* ========== 表单 ========== */
.login-form {
  margin-top: 4px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 12px;
  box-shadow: 0 0 0 1px var(--border-light, #e2e8f0) inset;
  transition: all 0.3s ease;
  background: #fff;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #1677ff inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2) inset, 0 0 0 1px #1677ff inset;
}

.login-form :deep(.el-input__prefix .el-icon) {
  color: var(--text-muted, #94a3b8);
  font-size: 16px;
}

.login-form :deep(.el-select) {
  width: 100%;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* ========== 注册按钮 ========== */
.login-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
  border: none;
  letter-spacing: 4px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(22, 119, 255, 0.3);
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(22, 119, 255, 0.4);
}

.login-btn:active {
  transform: translateY(0);
}

/* ========== 底部 ========== */
.login-tips {
  text-align: center;
  margin-top: 20px;
  color: var(--text-muted, #94a3b8);
  font-size: 12px;
}

.login-tips a {
  color: #1677ff;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.login-tips a:hover {
  color: #4096ff;
  text-decoration: underline;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .login-form-area {
    padding: 20px;
    background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
  }

  .login-form-wrapper {
    max-width: 100%;
  }

  .form-title {
    font-size: 22px;
  }

  .role-select {
    gap: 8px;
  }

  .role-card {
    padding: 8px 12px;
    font-size: 13px;
  }
}
</style>

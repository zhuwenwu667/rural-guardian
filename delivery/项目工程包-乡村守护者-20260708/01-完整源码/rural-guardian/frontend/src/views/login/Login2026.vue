<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  HomeFilled, User, Lock, Key, Phone, Message,
  UserFilled, FirstAidKit, Bell, Location, ArrowRight,
  View, Hide, Check, CircleCheck, Cpu, Document
} from '@element-plus/icons-vue'
import { login } from '../../api/auth'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()

const loginType = ref('account')
const tabs = [
  { key: 'account', label: '账号登录', icon: 'User' },
  { key: 'sms', label: '手机登录', icon: 'Message' },
  { key: 'elderly', label: '适老模式', icon: 'UserFilled' }
]

const loading = ref(false)
const rememberPassword = ref(false)
const showPassword = ref(false)
const focusedField = ref('')

const errors = reactive({
  username: '',
  password: '',
  captcha: '',
  phone: '',
  smsCode: ''
})

const accountForm = reactive({
  username: '',
  password: '',
  captchaCode: '',
  captchaKey: ''
})

const smsForm = reactive({
  phone: '',
  code: ''
})

const smsCountdown = ref(0)
const captchaCanvas = ref(null)
const loginHistory = ref([])

function validateUsername() {
  if (!accountForm.username) {
    errors.username = '请输入账号'
    return false
  }
  errors.username = ''
  return true
}

function validatePassword() {
  if (!accountForm.password) {
    errors.password = '请输入密码'
    return false
  }
  if (accountForm.password.length < 6) {
    errors.password = '密码长度不能少于6位'
    return false
  }
  errors.password = ''
  return true
}

function validateCaptcha() {
  if (!accountForm.captchaCode) {
    errors.captcha = '请输入验证码'
    return false
  }
  errors.captcha = ''
  return true
}

function generateCaptcha() {
  const canvas = captchaCanvas.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, 140, 46)
  
  const num1 = Math.floor(Math.random() * 9) + 1
  const num2 = Math.floor(Math.random() * 9) + 1
  const operators = ['+', '-', '×']
  const operator = operators[Math.floor(Math.random() * operators.length)]
  
  let answer
  switch(operator) {
    case '+': answer = num1 + num2; break
    case '-': answer = num1 - num2; break
    case '×': answer = num1 * num2; break
  }
  
  accountForm.captchaKey = answer.toString()
  
  // 绘制背景噪点
  for (let i = 0; i < 30; i++) {
    ctx.beginPath()
    ctx.arc(Math.random() * 140, Math.random() * 46, Math.random() * 1.5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, 0.5)`
    ctx.fill()
  }
  
  ctx.font = 'bold 22px "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#1e3a5f'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${num1} ${operator} ${num2} = ?`, 70, 23)
  
  // 干扰线
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(Math.random() * 140, Math.random() * 46)
    ctx.lineTo(Math.random() * 140, Math.random() * 46)
    ctx.strokeStyle = `rgba(30, 58, 95, ${Math.random() * 0.15 + 0.05})`
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function refreshCaptcha() {
  generateCaptcha()
}

function sendSmsCode() {
  if (!smsForm.phone) {
    ElMessage.warning('请输入手机号')
    return
  }
  
  ElMessage.success('验证码已发送，请注意查收')
  smsCountdown.value = 60
  const timer = setInterval(() => {
    smsCountdown.value--
    if (smsCountdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

async function handleLogin() {
  const v1 = validateUsername()
  const v2 = validatePassword()
  const v3 = validateCaptcha()
  
  if (!v1 || !v2 || !v3) return
  
  loading.value = true
  try {
    const res = await login({
      username: accountForm.username,
      password: accountForm.password,
      role: 'GOV_ADMIN'
    })
    
    console.log('[DEBUG] Login response:', res)
    
    if (res.code === 200) {
      // 保存登录历史
      const now = new Date()
      const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
      const historyItem = `${accountForm.username} · ${timeStr}`
      loginHistory.value = [historyItem, ...loginHistory.value.slice(0, 2)]
      localStorage.setItem('loginHistory', JSON.stringify(loginHistory.value))
      
      // 正确保存登录状态到 localStorage 和 store
      const token = res.data.token
      const role = res.data.user?.role || res.data.role || 'GOV_ADMIN'
      const realName = res.data.user?.realName || res.data.realName || accountForm.username
      
      localStorage.setItem('token', token)
      localStorage.setItem('role', role)
      localStorage.setItem('realName', realName)
      
      // 更新 store
      userStore.token = token
      userStore.role = role
      userStore.realName = realName
      
      console.log('[DEBUG] Token saved:', localStorage.getItem('token'))
      console.log('[DEBUG] Role saved:', localStorage.getItem('role'))
      
      ElMessage.success('登录成功，欢迎回来！')
      router.push('/gov/dashboard')
    }
  } catch (error) {
    console.error('[DEBUG] Login error:', error)
    ElMessage.error('登录失败，请检查账号密码')
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

function handleSmsLogin() {
  if (!smsForm.phone || !smsForm.code) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  loading.value = true
  setTimeout(() => {
    ElMessage.success('登录成功')
    router.push('/gov/dashboard')
    loading.value = false
  }, 1000)
}

function callSupport() {
  ElMessage.info('正在为您连接客服，请稍候...')
}

onMounted(() => {
  generateCaptcha()
  // 读取登录历史
  const history = localStorage.getItem('loginHistory')
  if (history) {
    loginHistory.value = JSON.parse(history)
  }
})
</script>

<template>
  <div class="login-elegant">
    <!-- 左侧品牌区域 -->
    <div class="brand-section">
      <!-- 抽象山水背景 -->
      <div class="mountain-bg">
        <div class="mountain-layer layer-1" />
        <div class="mountain-layer layer-2" />
        <div class="mountain-layer layer-3" />
        <div class="sun" />
      </div>
      
      <div class="brand-content">
        <!-- Logo 区域 -->
        <div class="logo-area">
          <div class="logo-icon-wrap">
            <el-icon :size="48">
              <HomeFilled />
            </el-icon>
          </div>
          <div class="logo-text">
            <h1 class="brand-name">
              乡村守护者
            </h1>
            <p class="brand-slogan">
              智慧养老综合服务平台
            </p>
          </div>
        </div>
      </div>
      
      <div class="copyright">
        <p>© 2024 乡村守护者</p>
      </div>
    </div>
    
    <!-- 右侧登录区域 -->
    <div class="login-section">
      <!-- 背景装饰 -->
      <div class="section-bg" />
      
      <div class="login-box">
        <div class="login-header">
          <div class="login-icon">
            <el-icon :size="28">
              <User />
            </el-icon>
          </div>
          <h2 class="login-title">
            欢迎登录
          </h2>
          <p class="login-subtitle">
            请输入您的账号信息
          </p>
        </div>
        
        <!-- 登录方式切换 -->
        <div class="login-tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.key"
            class="tab-btn"
            :class="{ active: loginType === tab.key }"
            @click="loginType = tab.key"
          >
            <el-icon
              v-if="tab.icon"
              :size="14"
            >
              <component :is="tab.icon" />
            </el-icon>
            {{ tab.label }}
          </button>
        </div>
        
        <!-- 账号密码登录 -->
        <div
          v-if="loginType === 'account'"
          class="form-area"
        >
          <div class="input-wrap">
            <label class="input-label">
              <el-icon :size="14"><User /></el-icon>
              账号
            </label>
            <div
              class="input-field"
              :class="{ focused: focusedField === 'username', error: errors.username }"
            >
              <el-icon class="field-icon">
                <User />
              </el-icon>
              <input 
                v-model="accountForm.username" 
                type="text" 
                placeholder="请输入账号"
                class="elegant-input"
                @focus="focusedField = 'username'"
                @blur="focusedField = ''; validateUsername()"
              >
            </div>
            <div
              v-if="errors.username"
              class="error-tip"
            >
              {{ errors.username }}
            </div>
          </div>
          
          <div class="input-wrap">
            <label class="input-label">
              <el-icon :size="14"><Lock /></el-icon>
              密码
            </label>
            <div
              class="input-field"
              :class="{ focused: focusedField === 'password', error: errors.password }"
            >
              <el-icon class="field-icon">
                <Lock />
              </el-icon>
              <input 
                v-model="accountForm.password" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="请输入密码"
                class="elegant-input"
                @focus="focusedField = 'password'"
                @blur="focusedField = ''; validatePassword()"
              >
              <el-icon
                class="field-toggle"
                @click="showPassword = !showPassword"
              >
                <View v-if="!showPassword" />
                <Hide v-else />
              </el-icon>
            </div>
            <div
              v-if="errors.password"
              class="error-tip"
            >
              {{ errors.password }}
            </div>
          </div>
          
          <div class="input-wrap">
            <label class="input-label">
              <el-icon :size="14"><Key /></el-icon>
              验证码
            </label>
            <div class="captcha-row">
              <div
                class="input-field captcha-field"
                :class="{ focused: focusedField === 'captcha', error: errors.captcha }"
              >
                <el-icon class="field-icon">
                  <Key />
                </el-icon>
                <input 
                  v-model="accountForm.captchaCode" 
                  type="text" 
                  placeholder="请输入验证码"
                  class="elegant-input"
                  @focus="focusedField = 'captcha'"
                  @blur="focusedField = ''; validateCaptcha()"
                >
              </div>
              <canvas
                ref="captchaCanvas"
                class="captcha-img"
                width="140"
                height="46"
                @click="refreshCaptcha"
              />
            </div>
            <div
              v-if="errors.captcha"
              class="error-tip"
            >
              {{ errors.captcha }}
            </div>
          </div>
          
          <div class="form-options">
            <label class="checkbox-wrap">
              <input
                v-model="rememberPassword"
                type="checkbox"
              >
              <span class="check-box">
                <el-icon
                  v-if="rememberPassword"
                  :size="12"
                ><Check /></el-icon>
              </span>
              <span class="check-label">记住密码</span>
            </label>
            <a
              href="#"
              class="forgot-link"
            >忘记密码？</a>
          </div>
          
          <button 
            type="button" 
            class="submit-btn"
            :disabled="loading"
            @click="handleLogin"
          >
            <span class="btn-text">{{ loading ? '登录中...' : '登 录' }}</span>
            <el-icon
              v-if="!loading"
              class="btn-arrow"
            >
              <ArrowRight />
            </el-icon>
            <div
              v-else
              class="btn-loading"
            />
          </button>
          
          <!-- 安全提示 -->
          <div class="security-notice">
            <el-icon :size="12">
              <Lock />
            </el-icon>
            <span>您的登录信息已加密保护</span>
          </div>
        </div>
        
        <!-- 手机验证码登录 -->
        <div
          v-else-if="loginType === 'sms'"
          class="form-area"
        >
          <div class="input-wrap">
            <label class="input-label">
              <el-icon :size="14"><Phone /></el-icon>
              手机号
            </label>
            <div
              class="input-field"
              :class="{ focused: focusedField === 'phone', error: errors.phone }"
            >
              <el-icon class="field-icon">
                <Phone />
              </el-icon>
              <input 
                v-model="smsForm.phone" 
                type="tel" 
                placeholder="请输入手机号"
                class="elegant-input"
                @focus="focusedField = 'phone'"
                @blur="focusedField = ''"
              >
            </div>
          </div>
          
          <div class="input-wrap">
            <label class="input-label">
              <el-icon :size="14"><Message /></el-icon>
              验证码
            </label>
            <div class="sms-row">
              <div
                class="input-field sms-field"
                :class="{ focused: focusedField === 'smsCode', error: errors.smsCode }"
              >
                <el-icon class="field-icon">
                  <Message />
                </el-icon>
                <input 
                  v-model="smsForm.code" 
                  type="text" 
                  placeholder="请输入验证码"
                  class="elegant-input"
                  @focus="focusedField = 'smsCode'"
                  @blur="focusedField = ''"
                >
              </div>
              <button 
                type="button"
                class="sms-btn"
                :disabled="smsCountdown > 0"
                @click="sendSmsCode"
              >
                <span v-if="smsCountdown === 0">获取验证码</span>
                <span v-else>{{ smsCountdown }}s</span>
              </button>
            </div>
          </div>
          
          <button 
            type="button" 
            class="submit-btn"
            :disabled="loading"
            @click="handleSmsLogin"
          >
            <span class="btn-text">{{ loading ? '登录中...' : '登 录' }}</span>
            <el-icon
              v-if="!loading"
              class="btn-arrow"
            >
              <ArrowRight />
            </el-icon>
          </button>
          
          <div class="security-notice">
            <el-icon :size="12">
              <Lock />
            </el-icon>
            <span>短信验证码仅限本机使用，请注意保密</span>
          </div>
        </div>
        
        <!-- 适老登录 -->
        <div
          v-else
          class="elderly-area"
        >
          <div class="elderly-icon">
            <el-icon :size="56">
              <UserFilled />
            </el-icon>
          </div>
          <h3 class="elderly-title">
            一键呼叫客服
          </h3>
          <p class="elderly-desc">
            我们的客服人员将协助您完成登录
          </p>
          <button
            class="elderly-btn"
            @click="callSupport"
          >
            <el-icon :size="20">
              <Phone />
            </el-icon>
            呼叫客服
          </button>
          <p class="elderly-note">
            服务时间：7×24 小时
          </p>
        </div>
        
        <!-- 登录记录 -->
        <div
          v-if="loginHistory.length > 0 && loginType === 'account'"
          class="login-history"
        >
          <span class="history-label">最近登录：</span>
          <span class="history-item">{{ loginHistory[0] }}</span>
        </div>
      </div>
      
      <!-- 底部认证 -->
      <div class="auth-badges">
        <div class="badge-item">
          <el-icon :size="14">
            <Lock />
          </el-icon>
          <span>SSL加密</span>
        </div>
        <div class="badge-divider" />
        <div class="badge-item">
          <el-icon :size="14">
            <CircleCheck />
          </el-icon>
          <span>安全认证</span>
        </div>
        <div class="badge-divider" />
        <div class="badge-item">
          <el-icon :size="14">
            <Cpu />
          </el-icon>
          <span>可信站点</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-elegant {
  display: flex;
  min-height: 100vh;
  background: #fff;
  position: relative;
  overflow: hidden;
}

/* 左侧品牌区域 */
.brand-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 80px 64px;
  color: #fff;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

/* 抽象山水背景 - 纯 CSS 绘制 */
.mountain-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0f172a 0%, #1e3a5f 40%, #0d9488 100%);
  overflow: hidden;
  z-index: 0;
}

.mountain-layer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-size: 100% 100%;
}

/* 远山 */
.layer-1 {
  height: 60%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(30, 58, 95, 0.3) 50%,
    rgba(30, 58, 95, 0.6) 100%
  );
  clip-path: polygon(
    0% 100%,
    0% 60%,
    15% 45%,
    30% 55%,
    45% 35%,
    60% 50%,
    75% 30%,
    90% 45%,
    100% 40%,
    100% 100%
  );
}

/* 中山 */
.layer-2 {
  height: 45%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(13, 148, 136, 0.2) 50%,
    rgba(13, 148, 136, 0.5) 100%
  );
  clip-path: polygon(
    0% 100%,
    0% 50%,
    20% 35%,
    35% 45%,
    50% 25%,
    65% 40%,
    80% 20%,
    100% 35%,
    100% 100%
  );
}

/* 近山 */
.layer-3 {
  height: 30%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(6, 78, 59, 0.4) 50%,
    rgba(6, 78, 59, 0.8) 100%
  );
  clip-path: polygon(
    0% 100%,
    0% 40%,
    25% 25%,
    45% 35%,
    65% 15%,
    85% 30%,
    100% 20%,
    100% 100%
  );
}

/* 太阳/月亮 */
.sun {
  position: absolute;
  top: 15%;
  right: 20%;
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0.2) 50%, transparent 70%);
  border-radius: 50%;
  box-shadow: 0 0 60px rgba(251, 191, 36, 0.4);
}

.brand-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Logo 区域 - 调整为青绿色系与照片协调 */
.logo-area {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
}

.logo-icon-wrap {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 
    0 12px 40px rgba(13, 148, 136, 0.4),
    0 4px 8px rgba(0, 0, 0, 0.1);
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-name {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: 6px;
  margin: 0;
  background: linear-gradient(135deg, #fff 0%, #5eead4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-slogan {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  letter-spacing: 8px;
  font-weight: 300;
}

/* 版权信息 */
.copyright {
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}

/* 右侧登录区域 */
.login-section {
  width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 48px;
  background: #fafbfc;
  position: relative;
  z-index: 1;
}

.section-bg {
  position: absolute;
  top: 20%;
  right: -50px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(30, 58, 95, 0.05) 0%, transparent 70%);
  border-radius: 50%;
}

.login-box {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.08),
    0 8px 24px rgba(0, 0, 0, 0.04);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.25);
}

.login-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 6px;
}

.login-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* 登录标签 */
.login-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 12px;
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tab-btn:hover {
  color: #1e293b;
}

.tab-btn.active {
  background: #fff;
  color: #1e293b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* 表单区域 */
.form-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 48px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.input-field.focused {
  background: #fff;
  border-color: #14b8a6;
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.1);
}

.input-field.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.08);
}

.field-icon {
  color: #9ca3af;
  font-size: 18px;
  transition: color 0.2s ease;
}

.input-field.focused .field-icon {
  color: #14b8a6;
}

.field-toggle {
  color: #9ca3af;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.field-toggle:hover {
  color: #14b8a6;
}

.elegant-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #1f2937;
  outline: none;
}

.elegant-input::placeholder {
  color: #9ca3af;
}

.error-tip {
  font-size: 12px;
  color: #ef4444;
  margin-top: 2px;
}

/* 验证码行 */
.captcha-row {
  display: flex;
  gap: 10px;
}

.captcha-field {
  flex: 0 0 140px;
  min-width: 0;
}

.captcha-img {
  flex: 1;
  height: 46px;
  border-radius: 10px;
  cursor: pointer;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  transition: all 0.2s ease;
  max-width: 160px;
}

.captcha-img:hover {
  border-color: #14b8a6;
}

/* 短信行 */
.sms-row {
  display: flex;
  gap: 12px;
}

.sms-field {
  flex: 1;
}

.sms-btn {
  padding: 0 16px;
  height: 46px;
  border: none;
  background: #0d9488;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.sms-btn:hover:not(:disabled) {
  background: #14b8a6;
  transform: translateY(-1px);
}

.sms-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #94a3b8;
}

/* 表单选项 */
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.checkbox-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-wrap input {
  display: none;
}

.check-box {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #fff;
}

.checkbox-wrap input:checked + .check-box {
  background: #0d9488;
  border-color: #0d9488;
}

.check-label {
  font-size: 13px;
  color: #4b5563;
}

.forgot-link {
  font-size: 13px;
  color: #0d9488;
  text-decoration: none;
  transition: color 0.2s ease;
}

.forgot-link:hover {
  color: #14b8a6;
  text-decoration: underline;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 52px;
  margin-top: 8px;
  border: none;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.35);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-arrow {
  font-size: 18px;
}

.btn-loading {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 安全提示 */
.security-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
}

/* 登录历史 */
.login-history {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e5e7eb;
  font-size: 12px;
}

.history-label {
  color: #9ca3af;
}

.history-item {
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 适老登录 */
.elderly-area {
  text-align: center;
  padding: 32px 0;
}

.elderly-icon {
  width: 96px;
  height: 96px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 32px rgba(13, 148, 136, 0.35);
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 8px 32px rgba(13, 148, 136, 0.35); }
  50% { box-shadow: 0 8px 48px rgba(13, 148, 136, 0.5); }
}

.elderly-title {
  font-size: 22px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px;
}

.elderly-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 32px;
}

.elderly-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 36px;
  border: none;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.3);
}

.elderly-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.4);
}

.elderly-note {
  font-size: 12px;
  color: #9ca3af;
  margin: 16px 0 0;
}

/* 底部认证 */
.auth-badges {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.badge-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.badge-item .el-icon {
  color: #0d9488;
}

.badge-divider {
  width: 1px;
  height: 12px;
  background: #e5e7eb;
}

/* 响应式 */
@media (max-width: 1100px) {
  .brand-section {
    flex: 1;
    padding: 40px 48px;
  }
  
  .brand-name {
    font-size: 32px;
  }
}

@media (max-width: 768px) {
  .brand-section {
    display: none;
  }
  
  .login-section {
    width: 100%;
    padding: 40px 24px;
  }
}
</style>
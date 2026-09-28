<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  HomeFilled, User, Lock, Phone, CreditCard, Microphone,
  Key, Check, DArrowRight, Message,
  Monitor, Bell, DataAnalysis, Location
} from '@element-plus/icons-vue'
import { useUserStore } from '../../stores/user'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

const router = useRouter()
const userStore = useUserStore()

// ========== 通用状态 ==========
const loading = ref(false)
const rememberPassword = ref(false)
const loginType = ref('account')

const features = [
  { icon: 'Monitor', text: '智能设备实时监测' },
  { icon: 'Bell', text: '7×24小时预警守护' },
  { icon: 'DataAnalysis', text: '大数据分析决策' },
  { icon: 'Location', text: '多级联动快速响应' },
]

const roleDefaultRoutes = {
  GOV_ADMIN: '/gov/dashboard',
  VILLAGE_STAFF: '/village/dashboard',
  PROVIDER: '/provider/dashboard',
  FAMILY_MEMBER: '/family/dashboard',
  ELDERLY: '/elderly/home',
}

// ========== 粒子动画背景 ==========
const particleCanvas = ref(null)
let particleAnimId = null

function initParticles() {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  let w = canvas.width = canvas.parentElement.offsetWidth
  let h = canvas.height = canvas.parentElement.offsetHeight

  const particles = []
  const count = 60
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.2,
    })
  }

  function draw() {
    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0 || p.x > w) p.vx *= -1
      if (p.y < 0 || p.y > h) p.vy *= -1

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`
      ctx.fill()

      // 连线
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j]
        const dist = Math.hypot(p.x - q.x, p.y - q.y)
        if (dist < 120) {
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(q.x, q.y)
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * (1 - dist / 120)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }
    particleAnimId = requestAnimationFrame(draw)
  }
  draw()

  // 响应窗口变化
  const resizeObserver = new ResizeObserver(() => {
    w = canvas.width = canvas.parentElement.offsetWidth
    h = canvas.height = canvas.parentElement.offsetHeight
  })
  resizeObserver.observe(canvas.parentElement)
}

// ========== 图形验证码（算术验证码） ==========
const captchaCanvas = ref(null)
let captchaAnswer = 0

function generateCaptcha() {
  const canvas = captchaCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  // 生成算术题
  const ops = ['+', '-', '×']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a, b
  if (op === '+') {
    a = Math.floor(Math.random() * 30) + 1
    b = Math.floor(Math.random() * 30) + 1
    captchaAnswer = a + b
  } else if (op === '-') {
    a = Math.floor(Math.random() * 30) + 10
    b = Math.floor(Math.random() * a) + 1
    captchaAnswer = a - b
  } else {
    a = Math.floor(Math.random() * 9) + 2
    b = Math.floor(Math.random() * 9) + 2
    captchaAnswer = a * b
  }

  const text = `${a} ${op} ${b} = ?`

  // 背景
  ctx.fillStyle = '#f0f5ff'
  ctx.fillRect(0, 0, w, h)

  // 干扰线
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(Math.random() * w, Math.random() * h)
    ctx.lineTo(Math.random() * w, Math.random() * h)
    ctx.strokeStyle = `rgba(22, 119, 255, ${Math.random() * 0.3 + 0.1})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // 干扰点
  for (let i = 0; i < 30; i++) {
    ctx.beginPath()
    ctx.arc(Math.random() * w, Math.random() * h, 1, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(22, 119, 255, ${Math.random() * 0.4 + 0.1})`
    ctx.fill()
  }

  // 文字
  ctx.font = 'bold 20px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 逐字绘制，带随机偏移和旋转
  const chars = text.split('')
  const startX = 15
  const charWidth = (w - 30) / chars.length
  chars.forEach((ch, i) => {
    ctx.save()
    const x = startX + i * charWidth + charWidth / 2
    const y = h / 2 + (Math.random() - 0.5) * 6
    ctx.translate(x, y)
    ctx.rotate((Math.random() - 0.5) * 0.3)
    const colors = ['#1677ff', '#0958d9', '#4096ff', '#1d39c4', '#003eb3']
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
}

function refreshCaptcha() {
  generateCaptcha()
  accountForm.captchaCode = ''
}

// ========== 滑块验证 ==========
const sliderOffset = ref(0)
const smsVerified = ref(false)
const sliderHint = ref('向右滑动完成验证')
let sliderDragging = false
let sliderStartX = 0
const sliderTrack = ref(null)

function verifySlider() {
  // 模拟验证：滑到80%以上即成功
  if (sliderOffset.value >= 200) {
    smsVerified.value = true
    ElMessage.success('验证成功')
  } else {
    ElMessage.warning('请将滑块滑到最右端')
    sliderOffset.value = 0
  }
}

function onSliderDown(e) {
  if (smsVerified.value) return
  sliderDragging = true
  sliderStartX = e.clientX - sliderOffset.value
  document.addEventListener('mousemove', onSliderMove)
  document.addEventListener('mouseup', onSliderUp)
}

function onSliderMove(e) {
  if (!sliderDragging) return
  const newOffset = Math.min(Math.max(0, e.clientX - sliderStartX), 260)
  sliderOffset.value = newOffset
}

function onSliderUp() {
  sliderDragging = false
  document.removeEventListener('mousemove', onSliderMove)
  document.removeEventListener('mouseup', onSliderUp)
  verifySlider()
}

function onSliderTouchStart(e) {
  if (smsVerified.value) return
  sliderDragging = true
  sliderStartX = e.touches[0].clientX - sliderOffset.value
  document.addEventListener('touchmove', onSliderTouchMove)
  document.addEventListener('touchend', onSliderTouchEnd)
}

function onSliderTouchMove(e) {
  if (!sliderDragging) return
  const newOffset = Math.min(Math.max(0, e.touches[0].clientX - sliderStartX), 260)
  sliderOffset.value = newOffset
}

function onSliderTouchEnd() {
  sliderDragging = false
  document.removeEventListener('touchmove', onSliderTouchMove)
  document.removeEventListener('touchend', onSliderTouchEnd)
  verifySlider()
}

// ========== 账号密码登录 ==========
const accountFormRef = ref(null)
const accountForm = reactive({
  username: '',
  password: '',
  captchaCode: '',
})

const accountRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captchaCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (parseInt(value) !== captchaAnswer) {
          callback(new Error('验证码错误'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// ========== 手机验证码登录 ==========
const smsFormRef = ref(null)
const smsForm = reactive({
  phone: '',
  code: '',
})

const smsRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' },
  ],
}

const smsCountdown = ref(0)
const smsSending = ref(false)
let smsTimer = null

function startCountdown() {
  smsCountdown.value = 60
  smsTimer = setInterval(() => {
    smsCountdown.value--
    if (smsCountdown.value <= 0) {
      clearInterval(smsTimer)
      smsTimer = null
    }
  }, 1000)
}

async function handleSendSms() {
  try {
    await smsFormRef.value.validateField('phone')
  } catch { return }

  smsSending.value = true
  try {
    await request.post('/auth/send-sms', { phone: smsForm.phone })
    ElMessage.success('验证码已发送')
    startCountdown()
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    smsSending.value = false
  }
}

async function handleSmsLogin() {
  const valid = await smsFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await request.post('/auth/sms-login', {
      phone: smsForm.phone,
      code: smsForm.code,
    })
    const data = res.data
    userStore.token = data.token
    userStore.role = data.user.role
    userStore.realName = data.user.realName
    userStore.userInfo = data.user
    localStorage.setItem('token', data.token)
    ElMessage.success('登录成功')
    const targetPath = roleDefaultRoutes[data.user.role] || '/elderly/home'
    router.push(targetPath)
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}

// ========== NFC登录 ==========
const showNfcDialog = ref(false)
const nfcFormRef = ref(null)
const nfcLoading = ref(false)
const nfcForm = reactive({ deviceSn: '' })
const nfcRules = {
  deviceSn: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
}

async function handleNfcLogin() {
  const valid = await nfcFormRef.value.validate().catch(() => false)
  if (!valid) return
  nfcLoading.value = true
  try {
    const res = await request.post('/auth/nfc-login', { deviceSn: nfcForm.deviceSn })
    const data = res.data
    userStore.token = data.token
    userStore.role = data.user.role
    userStore.realName = data.user.realName
    userStore.userInfo = data.user
    localStorage.setItem('token', data.token)
    ElMessage.success('登录成功')
    showNfcDialog.value = false
    const targetPath = roleDefaultRoutes[data.user.role] || '/elderly/home'
    router.push(targetPath)
  } catch (err) {} finally {
    nfcLoading.value = false
  }
}

// ========== 语音登录 ==========
const showVoiceDialog = ref(false)
const voiceFormRef = ref(null)
const voiceLoading = ref(false)
const voiceRecognizing = ref(false)
const voiceForm = reactive({ phone: '' })
const voiceRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' },
  ],
}

async function handleVoiceLogin() {
  const valid = await voiceFormRef.value.validate().catch(() => false)
  if (!valid) return
  voiceRecognizing.value = true
  await new Promise((resolve) => setTimeout(resolve, 2000))
  voiceRecognizing.value = false
  voiceLoading.value = true
  try {
    const res = await request.post('/auth/voice-login', {
      phone: voiceForm.phone,
      voiceCommand: 'voice_login',
    })
    const data = res.data
    userStore.token = data.token
    userStore.role = data.user.role
    userStore.realName = data.user.realName
    userStore.userInfo = data.user
    localStorage.setItem('token', data.token)
    ElMessage.success('登录成功')
    showVoiceDialog.value = false
    const targetPath = roleDefaultRoutes[data.user.role] || '/elderly/home'
    router.push(targetPath)
  } catch (err) {} finally {
    voiceLoading.value = false
  }
}

function handleCancelVoice() {
  if (voiceRecognizing.value) return
  showVoiceDialog.value = false
}

// ========== 账号密码登录处理 ==========
async function handleAccountLogin() {
  const valid = await accountFormRef.value.validate().catch(() => false)
  if (!valid) {
    refreshCaptcha()
    return
  }

  loading.value = true
  try {
    const data = await userStore.login({
      username: accountForm.username,
      password: accountForm.password,
    })

    if (rememberPassword.value) {
      localStorage.setItem('remembered_credentials', JSON.stringify({
        username: accountForm.username,
        password: accountForm.password,
      }))
    } else {
      localStorage.removeItem('remembered_credentials')
    }

    const targetPath = roleDefaultRoutes[data.user.role] || '/gov/dashboard'
    router.push(targetPath)
  } catch (err) {
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

// ========== 初始化 ==========
onMounted(() => {
  // 恢复记住的密码
  const saved = localStorage.getItem('remembered_credentials')
  if (saved) {
    try {
      const credentials = JSON.parse(saved)
      accountForm.username = credentials.username || ''
      accountForm.password = credentials.password || ''
      rememberPassword.value = true
    } catch (e) {
      localStorage.removeItem('remembered_credentials')
    }
  }

  // 初始化验证码和粒子动画
  nextTick(() => {
    generateCaptcha()
    initParticles()
  })
})

// ========== 演示登录处理 ==========
async function handleDemoLogin() {
  loading.value = true
  try {
    const resp = await fetch('/api/auth/demo-login?role=GOV_ADMIN')
    const result = await resp.json()
    
    if (result.code === 200) {
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('role', result.data.user.role)
      localStorage.setItem('realName', result.data.user.realName)
      ElMessage.success('演示登录成功')
      router.push('/gov/dashboard')
    } else {
      ElMessage.error(result.message || '演示登录失败')
    }
  } catch (err) {
    console.error('演示登录失败:', err)
    ElMessage.error('演示登录失败')
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (smsTimer) { clearInterval(smsTimer); smsTimer = null }
  if (particleAnimId) { cancelAnimationFrame(particleAnimId); particleAnimId = null }
  document.removeEventListener('mousemove', onSliderMove)
  document.removeEventListener('mouseup', onSliderUp)
  document.removeEventListener('touchmove', onSliderTouchMove)
  document.removeEventListener('touchend', onSliderTouchEnd)
})
</script>

<template>
  <div class="login-page">
    <!-- 左侧品牌展示区 -->
    <div class="brand-panel">
      <div class="brand-bg">
        <canvas
          ref="particleCanvas"
          class="particle-canvas"
        />
        <div class="brand-overlay" />
      </div>
      <div class="brand-content">
        <div class="brand-logo">
          <div class="logo-icon-wrapper">
            <el-icon :size="40">
              <HomeFilled />
            </el-icon>
          </div>
        </div>
        <h1 class="brand-title">
          乡村守护者
        </h1>
        <p class="brand-subtitle">
          智慧养老综合服务平台
        </p>
        <div class="brand-features">
          <div
            v-for="(feat, idx) in features"
            :key="idx"
            class="feature-item"
            :style="{ animationDelay: `${idx * 0.15}s` }"
          >
            <el-icon :size="20">
              <component :is="feat.icon" />
            </el-icon>
            <span>{{ feat.text }}</span>
          </div>
        </div>
        <div class="brand-stats">
          <div class="stat-item">
            <span class="stat-number">2,680</span>
            <span class="stat-label">服务老人</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-number">156</span>
            <span class="stat-label">覆盖村庄</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-number">99.8%</span>
            <span class="stat-label">预警响应</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧登录表单区 -->
    <div class="form-panel">
      <div class="form-wrapper">
        <!-- 移动端Logo -->
        <div class="mobile-logo">
          <div class="logo-icon-sm">
            <el-icon :size="24">
              <HomeFilled />
            </el-icon>
          </div>
          <span>乡村守护者</span>
        </div>

        <h2 class="form-title">
          欢迎登录
        </h2>
        <p class="form-desc">
          请选择登录方式
        </p>

        <!-- 登录方式Tab -->
        <el-tabs
          v-model="loginType"
          class="login-tabs"
        >
          <el-tab-pane
            label="账号密码"
            name="account"
          />
          <el-tab-pane
            label="手机验证码"
            name="sms"
          />
          <el-tab-pane
            label="适老登录"
            name="elderly"
          />
        </el-tabs>

        <!-- ===== 账号密码登录 ===== -->
        <el-form
          v-show="loginType === 'account'"
          ref="accountFormRef"
          :model="accountForm"
          :rules="accountRules"
          class="login-form"
          @keyup.enter="handleAccountLogin"
        >
          <el-form-item prop="username">
            <el-input
              v-model="accountForm.username"
              placeholder="请输入账号"
              size="large"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="accountForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <!-- 图形验证码 -->
          <el-form-item prop="captchaCode">
            <div class="captcha-row">
              <el-input
                v-model="accountForm.captchaCode"
                placeholder="请输入计算结果"
                size="large"
                :prefix-icon="Key"
                clearable
                class="captcha-input"
              />
              <canvas
                ref="captchaCanvas"
                class="captcha-canvas"
                width="120"
                height="40"
                title="点击刷新验证码"
                @click="refreshCaptcha"
              />
            </div>
          </el-form-item>

          <el-form-item>
            <div class="login-options">
              <el-checkbox
                v-model="rememberPassword"
                label="记住密码"
              />
              <el-link
                type="primary"
                underline="never"
              >
                忘记密码？
              </el-link>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="login-btn"
              @click="handleAccountLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              plain
              size="large"
              class="demo-btn"
              @click="handleDemoLogin"
            >
              演示登录（政府端）
            </el-button>
          </el-form-item>
        </el-form>

        <!-- ===== 手机验证码登录 ===== -->
        <el-form
          v-show="loginType === 'sms'"
          ref="smsFormRef"
          :model="smsForm"
          :rules="smsRules"
          class="login-form"
          @keyup.enter="handleSmsLogin"
        >
          <el-form-item prop="phone">
            <el-input
              v-model="smsForm.phone"
              placeholder="请输入手机号"
              size="large"
              :prefix-icon="Phone"
              clearable
            />
          </el-form-item>
          <el-form-item prop="code">
            <div class="sms-code-row">
              <el-input
                v-model="smsForm.code"
                placeholder="请输入验证码"
                size="large"
                :prefix-icon="Message"
              />
              <el-button
                size="large"
                :disabled="smsCountdown > 0 || smsSending"
                class="sms-btn"
                @click="handleSendSms"
              >
                {{ smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>

          <!-- 滑块验证 -->
          <el-form-item v-if="!smsVerified">
            <div
              class="slider-verify"
              :class="{ 'is-success': smsVerified }"
            >
              <div
                ref="sliderTrack"
                class="slider-track"
              >
                <div
                  class="slider-progress"
                  :style="{ width: sliderOffset + 'px' }"
                />
                <div
                  class="slider-thumb"
                  :style="{ left: sliderOffset + 'px' }"
                  @mousedown="onSliderDown"
                  @touchstart.prevent="onSliderTouchStart"
                >
                  <el-icon v-if="smsVerified">
                    <Check />
                  </el-icon>
                  <el-icon v-else>
                    <DArrowRight />
                  </el-icon>
                </div>
              </div>
              <span
                v-if="!smsVerified && sliderOffset === 0"
                class="slider-text"
              >
                {{ sliderHint }}
              </span>
              <span
                v-else-if="smsVerified"
                class="slider-text success"
              >
                验证成功
              </span>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              :disabled="!smsVerified"
              class="login-btn"
              @click="handleSmsLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <!-- ===== 适老登录 ===== -->
        <div
          v-show="loginType === 'elderly'"
          class="elderly-login-section"
        >
          <div class="elderly-btn-group">
            <div
              class="elderly-btn-card"
              @click="showNfcDialog = true"
            >
              <div class="elderly-icon-circle">
                <el-icon :size="32">
                  <CreditCard />
                </el-icon>
              </div>
              <span class="elderly-btn-label">NFC手环登录</span>
              <span class="elderly-btn-desc">使用NFC手环感应登录</span>
            </div>
            <div
              class="elderly-btn-card"
              @click="showVoiceDialog = true"
            >
              <div class="elderly-icon-circle voice">
                <el-icon :size="32">
                  <Microphone />
                </el-icon>
              </div>
              <span class="elderly-btn-label">语音登录</span>
              <span class="elderly-btn-desc">使用语音识别验证登录</span>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div
          v-show="loginType !== 'elderly'"
          class="login-footer"
        >
          <router-link
            to="/register"
            class="register-link"
          >
            还没有账号？立即注册
          </router-link>
        </div>

        <div class="login-tips">
          <el-tag
            type="info"
            effect="plain"
            size="small"
            round
          >
            演示账号: gov_admin / admin123
          </el-tag>
        </div>
      </div>

      <!-- 底部版权 -->
      <div class="form-panel-footer">
        <span>&copy; 2026 乡村守护者 · 智慧养老综合服务平台</span>
      </div>
    </div>

    <!-- ===== NFC登录对话框 ===== -->
    <el-dialog
      v-model="showNfcDialog"
      title="NFC手环登录"
      width="420px"
      :close-on-click-modal="false"
      center
    >
      <div class="dialog-content">
        <div class="dialog-icon-circle">
          <el-icon :size="36">
            <CreditCard />
          </el-icon>
        </div>
        <p class="dialog-tip">
          请将NFC手环靠近设备感应区
        </p>
        <el-form
          ref="nfcFormRef"
          :model="nfcForm"
          :rules="nfcRules"
        >
          <el-form-item prop="deviceSn">
            <el-input
              v-model="nfcForm.deviceSn"
              placeholder="或手动输入设备编号"
              size="large"
              clearable
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button
          size="large"
          @click="showNfcDialog = false"
        >
          取 消
        </el-button>
        <el-button
          type="primary"
          size="large"
          :loading="nfcLoading"
          @click="handleNfcLogin"
        >
          {{ nfcLoading ? '登录中...' : '确认登录' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 语音登录对话框 ===== -->
    <el-dialog
      v-model="showVoiceDialog"
      title="语音登录"
      width="420px"
      :close-on-click-modal="false"
      center
    >
      <div class="dialog-content">
        <div class="dialog-icon-circle voice">
          <el-icon :size="36">
            <Microphone />
          </el-icon>
        </div>
        <p class="dialog-tip">
          请输入手机号后开始语音验证
        </p>
        <el-form
          ref="voiceFormRef"
          :model="voiceForm"
          :rules="voiceRules"
        >
          <el-form-item prop="phone">
            <el-input
              v-model="voiceForm.phone"
              placeholder="请输入手机号"
              size="large"
              :prefix-icon="Phone"
              clearable
            />
          </el-form-item>
        </el-form>
        <div
          v-if="voiceRecognizing"
          class="voice-recognizing"
        >
          <div class="voice-wave">
            <span
              v-for="i in 5"
              :key="i"
              class="wave-bar"
              :style="{ animationDelay: `${i * 0.1}s` }"
            />
          </div>
          <p>正在语音识别中...</p>
        </div>
      </div>
      <template #footer>
        <el-button
          size="large"
          @click="handleCancelVoice"
        >
          取 消
        </el-button>
        <el-button
          type="primary"
          size="large"
          :loading="voiceLoading"
          :disabled="voiceRecognizing"
          @click="handleVoiceLogin"
        >
          {{ voiceRecognizing ? '识别中...' : (voiceLoading ? '登录中...' : '开始验证') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* ========== 整体布局 ========== */
.login-page {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* ========== 左侧品牌区 ========== */
.brand-panel {
  flex: 0 0 45%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.brand-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #001529 0%, #003a70 40%, #0050b3 100%);
}

.particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.brand-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 30% 50%, rgba(22, 119, 255, 0.15) 0%, transparent 70%);
}

.brand-content {
  position: relative;
  z-index: 1;
  padding: 60px;
  color: #fff;
  max-width: 480px;
}

.brand-logo {
  margin-bottom: 24px;
}

.logo-icon-wrapper {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  color: #fff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.brand-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 8px 0;
  letter-spacing: 2px;
  background: linear-gradient(90deg, #ffffff 0%, #bae0ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 48px 0;
  letter-spacing: 1px;
}

.brand-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 48px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  animation: featureFadeIn 0.6s ease both;
}

@keyframes featureFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.brand-stats {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 24px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
}

/* ========== 右侧表单区 ========== */
.form-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--card);
  padding: 40px;
  position: relative;
}

.form-wrapper {
  width: 100%;
  max-width: 420px;
  margin: auto 0;
}

.mobile-logo {
  display: none;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
  font-size: 20px;
  font-weight: 700;
  color: #001529;
}

.logo-icon-sm {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
  border-radius: 10px;
  color: #fff;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.3);
}

.form-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px 0;
}

.form-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0 0 28px 0;
}

/* ========== Tabs ========== */
.login-tabs {
  margin-bottom: 24px;
}

.login-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: #e2e8f0;
}

.login-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  color: #94a3b8;
  font-weight: 500;
}

.login-tabs :deep(.el-tabs__item.is-active) {
  color: #1677ff;
  font-weight: 600;
}

.login-tabs :deep(.el-tabs__active-bar) {
  background: linear-gradient(90deg, #1677ff, #4096ff);
  height: 3px;
  border-radius: 2px;
}

/* ========== 表单 ========== */
.login-form {
  margin-top: 4px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 12px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
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
  color: #94a3b8;
  font-size: 16px;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* ========== 图形验证码 ========== */
.captcha-row {
  display: flex;
  width: 100%;
  gap: 12px;
  align-items: center;
}

.captcha-input {
  flex: 1;
}

.captcha-canvas {
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.captcha-canvas:hover {
  border-color: #1677ff;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.15);
}

/* ========== 滑块验证 ========== */
.slider-verify {
  position: relative;
  width: 100%;
  height: 44px;
  background: #f1f5f9;
  border-radius: 10px;
  overflow: hidden;
  user-select: none;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.slider-verify.is-success {
  background: #f0fdf4;
  border-color: #86efac;
}

.slider-track {
  position: relative;
  width: 100%;
  height: 100%;
}

.slider-progress {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(22, 119, 255, 0.1), rgba(22, 119, 255, 0.2));
  border-radius: 10px 0 0 10px;
  transition: none;
}

.slider-verify.is-success .slider-progress {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.2));
}

.slider-thumb {
  position: absolute;
  top: 2px;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: grab;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.3);
  transition: box-shadow 0.3s ease;
  z-index: 1;
}

.slider-thumb:active {
  cursor: grabbing;
  box-shadow: 0 4px 16px rgba(22, 119, 255, 0.4);
}

.slider-verify.is-success .slider-thumb {
  background: linear-gradient(135deg, #22c55e, #4ade80);
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.slider-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 13px;
  color: var(--text-muted);
  pointer-events: none;
  white-space: nowrap;
}

.slider-text.success {
  color: #22c55e;
  font-weight: 500;
}

/* ========== 登录按钮 ========== */
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
.login-footer {
  text-align: center;
  margin-top: 20px;
}

.register-link {
  color: #1677ff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s ease;
}

.register-link:hover {
  color: #4096ff;
}

.login-tips {
  text-align: center;
  margin-top: 20px;
}

.form-panel-footer {
  margin-top: auto;
  padding-top: 24px;
  font-size: 12px;
  color: var(--text-muted);
}

/* ========== 适老登录 ========== */
.elderly-login-section {
  margin-top: 4px;
}

.elderly-btn-group {
  display: flex;
  gap: 16px;
}

.elderly-btn-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.elderly-btn-card:hover {
  border-color: #1677ff;
  box-shadow: 0 4px 20px rgba(22, 119, 255, 0.12);
  transform: translateY(-2px);
}

.elderly-icon-circle {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%);
  border-radius: 50%;
  color: #1677ff;
}

.elderly-icon-circle.voice {
  background: linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%);
  color: #22c55e;
}

.elderly-btn-label {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.elderly-btn-desc {
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}

/* ========== 对话框 ========== */
.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.dialog-icon-circle {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%);
  border-radius: 50%;
  color: #1677ff;
}

.dialog-icon-circle.voice {
  background: linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%);
  color: #22c55e;
}

.dialog-tip {
  font-size: 14px;
  color: #64748b;
  text-align: center;
  margin: 0;
}

/* ========== 语音波形 ========== */
.voice-recognizing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.voice-wave {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
}

.wave-bar {
  width: 4px;
  height: 8px;
  background: #22c55e;
  border-radius: 2px;
  animation: waveAnim 0.8s ease-in-out infinite;
}

@keyframes waveAnim {
  0%, 100% { height: 8px; opacity: 0.4; }
  50% { height: 32px; opacity: 1; }
}

.voice-recognizing p {
  font-size: 14px;
  color: #22c55e;
  font-weight: 500;
  margin: 0;
}

/* ========== 短信验证码行 ========== */
.sms-code-row {
  display: flex;
  width: 100%;
  gap: 12px;
}

.sms-code-row .el-input {
  flex: 1;
}

.sms-btn {
  flex-shrink: 0;
  min-width: 110px;
  font-size: 13px;
  border-radius: 10px;
}

/* ========== 响应式 ========== */
@media (max-width: 900px) {
  .brand-panel {
    display: none;
  }

  .mobile-logo {
    display: flex;
  }

  .form-panel {
    background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
  }
}

/* ========== 暗色模式 ========== */
[data-theme="dark"] .form-panel {
  background: var(--card) !important;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .form-panel .el-input__wrapper,
[data-theme="dark"] .form-panel .el-select__wrapper {
  background-color: var(--bg-secondary);
  box-shadow: 0 0 0 1px var(--border) inset;
}
</style>

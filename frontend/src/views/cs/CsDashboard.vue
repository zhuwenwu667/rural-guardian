<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { ElMessage } from 'element-plus'
import { useWebSocket } from '../../composables/useWebSocket'

const userStore = useUserStore()
const { ws, isConnected, connect, send } = useWebSocket()

// ========== 统计数据 ==========
const stats = ref({
  pendingCount: 0,
  activeCount: 0,
  totalHandled: 0,
  totalCalls: 0
})

// ========== 呼叫列表 ==========
const pendingCalls = ref([])
const activeCalls = ref([])
const callDurations = ref({})

// ========== 通知 ==========
const showNotification = ref(false)
const notificationText = ref('')

// ========== 连接 WebSocket ==========
onMounted(() => {
  if (userStore.userId) {
    connect(userStore.userId, 'CS')
    
    // 监听 WebSocket 消息
    if (ws.value) {
      ws.value.onmessage = (event) => {
        const message = JSON.parse(event.data)
        handleWsMessage(message)
      }
    }
  }
  
  // 加载初始数据
  loadStats()
  loadPendingCalls()
  loadActiveCalls()
  
  // 启动计时器更新通话时长
  const timer = setInterval(updateDurations, 1000)
  
  onUnmounted(() => {
    clearInterval(timer)
  })
})

// ========== 处理 WebSocket 消息 ==========
function handleWsMessage(message) {
  const { type, payload } = message
  
  switch (type) {
    case 'new_call':
      // 新呼叫到来
      pendingCalls.value.unshift(payload)
      stats.value.pendingCount++
      showToast(`新呼叫：${payload.elderlyName}`)
      break
      
    case 'call_taken':
      // 呼叫被其他客服接走
      pendingCalls.value = pendingCalls.value.filter(c => c.id !== payload.callId)
      break
      
    case 'call_submitted':
      // 确认收到
      console.log('呼叫提交确认:', payload)
      break
  }
}

// ========== 加载数据 ==========
async function loadStats() {
  try {
    const res = await fetch(`/api/cs/stats?csId=${  userStore.userId}`, {
      headers: { 'Authorization': `Bearer ${  localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.code === 200) {
      stats.value = data.data
    }
  } catch (err) {
    console.error('加载统计失败:', err)
  }
}

async function loadPendingCalls() {
  try {
    const res = await fetch('/api/cs/calls/pending', {
      headers: { 'Authorization': `Bearer ${  localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.code === 200) {
      pendingCalls.value = data.data
    }
  } catch (err) {
    console.error('加载待处理呼叫失败:', err)
  }
}

async function loadActiveCalls() {
  try {
    const res = await fetch(`/api/cs/calls/active?csId=${  userStore.userId}`, {
      headers: { 'Authorization': `Bearer ${  localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.code === 200) {
      activeCalls.value = data.data
    }
  } catch (err) {
    console.error('加载进行中呼叫失败:', err)
  }
}

// ========== 接听呼叫 ==========
function acceptCall(call) {
  send({
    type: 'call_accept',
    payload: {
      callId: call.id,
      csId: userStore.userId,
      csName: userStore.realName
    }
  })
  
  // 本地更新
  pendingCalls.value = pendingCalls.value.filter(c => c.id !== call.id)
  activeCalls.value.push({ ...call, status: 'active', accepted_at: new Date().toISOString() })
  
  stats.value.pendingCount--
  stats.value.activeCount++
  
  ElMessage.success(`已接听 ${call.elderly_name} 的呼叫`)
}

// ========== 结束呼叫 ==========
function endCall(call) {
  send({
    type: 'call_end',
    payload: {
      callId: call.id,
      endBy: userStore.userId
    }
  })
  
  // 本地更新
  activeCalls.value = activeCalls.value.filter(c => c.id !== call.id)
  delete callDurations.value[call.id]
  
  stats.value.activeCount--
  stats.value.totalHandled++
  
  ElMessage.success('通话已结束')
}

// ========== 更新通话时长 ==========
function updateDurations() {
  activeCalls.value.forEach(call => {
    if (call.accepted_at) {
      const start = new Date(call.accepted_at).getTime()
      const now = Date.now()
      const diff = Math.floor((now - start) / 1000)
      const mins = String(Math.floor(diff / 60)).padStart(2, '0')
      const secs = String(diff % 60).padStart(2, '0')
      callDurations.value[call.id] = `${mins}:${secs}`
    }
  })
}

// ========== 格式化时间 ==========
function formatTime(timeStr) {
  const date = new Date(timeStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000 / 60)
  
  if (diff < 1) return '刚刚'
  if (diff < 60) return `${diff}分钟前`
  return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ========== 显示通知 ==========
function showToast(text) {
  notificationText.value = text
  showNotification.value = true
  setTimeout(() => {
    showNotification.value = false
  }, 5000)
}
</script>

<template>
  <div class="cs-dashboard">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="bg-blob bg-blob-1" />
      <div class="bg-blob bg-blob-2" />
    </div>

    <div class="page-content">
      <!-- 顶部状态栏 -->
      <header
        class="header-section animate-in"
        style="--delay: 0s"
      >
        <div class="header-left">
          <h1 class="page-title">
            客服工作台
          </h1>
          <div
            class="connection-status"
            :class="{ connected: isConnected }"
          >
            <span class="status-dot" />
            <span class="status-text">{{ isConnected ? '在线' : '连接中...' }}</span>
          </div>
        </div>
        <div class="header-right">
          <div class="stat-item">
            <span class="stat-value">{{ stats.pendingCount }}</span>
            <span class="stat-label">待处理</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.activeCount }}</span>
            <span class="stat-label">处理中</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.totalHandled }}</span>
            <span class="stat-label">已处理</span>
          </div>
        </div>
      </header>

      <!-- 待处理呼叫列表 -->
      <section
        class="pending-section animate-in"
        style="--delay: 0.1s"
      >
        <h2 class="section-title">
          <span class="title-icon">📞</span>
          待处理呼叫
          <span
            v-if="pendingCalls.length > 0"
            class="title-badge"
          >{{ pendingCalls.length }}</span>
        </h2>
        <div class="pending-list">
          <div
            v-for="call in pendingCalls"
            :key="call.id"
            class="call-card pending"
          >
            <div class="call-info">
              <div class="elderly-info">
                <span class="elderly-name">{{ call.elderly_name }}</span>
                <span class="elderly-location">{{ call.village_name }}</span>
              </div>
              <div class="call-reason">
                {{ call.reason }}
              </div>
              <div class="call-time">
                {{ formatTime(call.created_at) }}
              </div>
            </div>
            <div class="call-actions">
              <button
                class="accept-btn"
                @click="acceptCall(call)"
              >
                <span>接听</span>
              </button>
            </div>
          </div>
          <div
            v-if="pendingCalls.length === 0"
            class="empty-state"
          >
            <span class="empty-icon">📭</span>
            <span class="empty-text">暂无待处理呼叫</span>
          </div>
        </div>
      </section>

      <!-- 进行中的呼叫 -->
      <section
        v-if="activeCalls.length > 0"
        class="active-section animate-in"
        style="--delay: 0.2s"
      >
        <h2 class="section-title">
          <span class="title-icon">💬</span>
          处理中
        </h2>
        <div class="active-list">
          <div
            v-for="call in activeCalls"
            :key="call.id"
            class="call-card active"
          >
            <div class="call-info">
              <div class="elderly-info">
                <span class="elderly-name">{{ call.elderly_name }}</span>
                <span class="elderly-phone">{{ call.phone }}</span>
              </div>
              <div class="call-status">
                <span class="status-badge">通话中</span>
                <span class="call-duration">{{ callDurations[call.id] || '00:00' }}</span>
              </div>
            </div>
            <div class="call-actions">
              <button
                class="end-btn"
                @click="endCall(call)"
              >
                <span>结束通话</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 实时通知 -->
      <div
        v-if="showNotification"
        class="notification-toast"
        @click="showNotification = false"
      >
        <span class="toast-icon">🔔</span>
        <span class="toast-text">{{ notificationText }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cs-dashboard {
  --teal-600: #0d9488;
  --teal-500: #14b8a6;
  --teal-300: #5eead4;
  --teal-50: #f0fdfa;
  --red-500: #ef4444;
  --green-500: #22c55e;
  --gray-50: #f8fafc;
  --gray-100: #f1f5f9;
  --gray-200: #e2e8f0;
  --gray-400: #94a3b8;
  --gray-500: #64748b;
  --gray-700: #334155;
  --gray-800: #1e293b;

  position: relative;
  min-height: 100vh;
  background: linear-gradient(160deg, var(--teal-50) 0%, #ecfdf5 40%, var(--gray-50) 100%);
}

.bg-decoration {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
}

.bg-blob-1 {
  width: 400px;
  height: 400px;
  background: var(--teal-300);
  top: -100px;
  right: -100px;
}

.bg-blob-2 {
  width: 300px;
  height: 300px;
  background: #a7f3d0;
  bottom: 20%;
  left: -80px;
}

.page-content {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* ========== 头部 ========== */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--gray-800);
  margin: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--gray-100);
  border-radius: 20px;
  font-size: 13px;
  color: var(--gray-500);
}

.connection-status.connected {
  background: #dcfce7;
  color: var(--green-500);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gray-400);
}

.connection-status.connected .status-dot {
  background: var(--green-500);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.header-right {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--teal-600);
}

.stat-label {
  font-size: 13px;
  color: var(--gray-500);
}

/* ========== 区域标题 ========== */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--gray-800);
  margin: 0 0 16px;
}

.title-icon {
  font-size: 20px;
}

.title-badge {
  padding: 2px 8px;
  background: var(--red-500);
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
}

/* ========== 呼叫卡片 ========== */
.pending-section,
.active-section {
  margin-bottom: 24px;
}

.pending-list,
.active-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.call-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

.call-card.pending {
  border-left: 4px solid var(--red-500);
}

.call-card.active {
  border-left: 4px solid var(--teal-500);
}

.call-info {
  flex: 1;
}

.elderly-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.elderly-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-800);
}

.elderly-location,
.elderly-phone {
  font-size: 13px;
  color: var(--gray-500);
  padding: 2px 8px;
  background: var(--gray-100);
  border-radius: 4px;
}

.call-reason {
  font-size: 14px;
  color: var(--gray-600);
  margin-bottom: 4px;
}

.call-time {
  font-size: 12px;
  color: var(--gray-400);
}

.call-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  padding: 4px 10px;
  background: #dcfce7;
  color: var(--green-500);
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
}

.call-duration {
  font-size: 14px;
  font-weight: 600;
  color: var(--teal-600);
  font-family: monospace;
}

/* ========== 按钮 ========== */
.call-actions {
  display: flex;
  gap: 8px;
}

.accept-btn,
.end-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.accept-btn {
  background: var(--teal-600);
  color: white;
}

.accept-btn:hover {
  background: #0f766e;
  transform: translateY(-1px);
}

.end-btn {
  background: var(--red-500);
  color: white;
}

.end-btn:hover {
  background: #dc2626;
}

/* ========== 空状态 ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  color: var(--gray-400);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
}

/* ========== 通知 ========== */
.notification-toast {
  position: fixed;
  top: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
  cursor: pointer;
  z-index: 1000;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-icon {
  font-size: 20px;
}

.toast-text {
  font-size: 14px;
  color: var(--gray-700);
}

/* ========== 动画 ========== */
.animate-in {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease;
}

.animate-in.visible {
  opacity: 1;
  transform: translateY(0);
}
</style>

<script setup>
import { ref, computed, onMounted, onUnmounted, h, defineComponent } from 'vue'
import { useUserStore } from '../../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWebSocket } from '../../composables/useWebSocket'

const userStore = useUserStore()
const sosPulse = ref(true)

// ========== WebSocket 连接 ==========
const { isConnected, connect, send } = useWebSocket()
const callStatus = ref('idle') // idle/pending/active/ended
const currentCallId = ref(null)

// 连接 WebSocket
onMounted(() => {
  if (userStore.userId) {
    connect(userStore.userId, 'ELDERLY')
  }
})

// ========== 问候语 ==========
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const currentDate = computed(() => {
  const now = new Date()
  const weekMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}年${m}月${d}日 ${weekMap[now.getDay()]}`
})

// ========== Mock 天气 ==========
const weather = ref({
  temp: 24,
  desc: '晴转多云'
})

// ========== Mock 健康数据 ==========
const healthData = ref([
  {
    label: '心率',
    value: '72',
    unit: '次/分',
    color: '#ef4444',
    status: 'normal',
    statusText: '正常',
    icon: defineComponent({
      render() {
        return h('svg', { viewBox: '0 0 48 48', width: 48, height: 48, fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
          h('path', { d: 'M24 42s-16-10-16-22a10 10 0 0 1 20 0 10 10 0 0 1 20 0c0 12-16 22-16 22z' })
        ])
      }
    })
  },
  {
    label: '血压',
    value: '128/82',
    unit: 'mmHg',
    color: '#0d9488',
    status: 'normal',
    statusText: '正常',
    icon: defineComponent({
      render() {
        return h('svg', { viewBox: '0 0 48 48', width: 48, height: 48, fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round' }, [
          h('path', { d: 'M24 8v32' }),
          h('path', { d: 'M24 16c-4 0-8 3-8 8s4 8 8 8' }),
          h('path', { d: 'M24 16c4 0 8 3 8 8s-4 8-8 8' })
        ])
      }
    })
  },
  {
    label: '血氧',
    value: '97',
    unit: '%',
    color: '#3b82f6',
    status: 'normal',
    statusText: '正常',
    icon: defineComponent({
      render() {
        return h('svg', { viewBox: '0 0 48 48', width: 48, height: 48, fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round' }, [
          h('circle', { cx: '24', cy: '24', r: '18' }),
          h('path', { d: 'M18 24h4l3-8 5 16 3-8h4' })
        ])
      }
    })
  },
  {
    label: '体温',
    value: '36.5',
    unit: '°C',
    color: '#f59e0b',
    status: 'normal',
    statusText: '正常',
    icon: defineComponent({
      render() {
        return h('svg', { viewBox: '0 0 48 48', width: 48, height: 48, fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
          h('path', { d: 'M28 4v20a8 8 0 1 1-12-6.93V4a4 4 0 0 1 8 0z' }),
          h('circle', { cx: '22', cy: '30', r: '3', fill: 'currentColor' })
        ])
      }
    })
  }
])

// ========== Mock 用药数据 ==========
const medicineData = ref([
  { name: '降压药', dose: '氨氯地平片 1片', time: '08:00', done: true },
  { name: '降糖药', dose: '二甲双胍 1片', time: '08:00', done: true },
  { name: '钙片', dose: '碳酸钙D3 1片', time: '12:00', done: false },
  { name: '降压药', dose: '氨氯地平片 1片', time: '20:00', done: false }
])

// ========== Mock 家人动态 ==========
const familyData = ref([
  {
    name: '李明',
    message: '妈，今天天气好，记得出去走走',
    time: '10分钟前',
    avatarBg: 'linear-gradient(135deg, #0d9488, #14b8a6)'
  },
  {
    name: '李红',
    message: '给您买了水果，下午送到',
    time: '1小时前',
    avatarBg: 'linear-gradient(135deg, #f43f5e, #fb7185)'
  },
  {
    name: '王强',
    message: '周末回来看您，给您带好吃的',
    time: '昨天',
    avatarBg: 'linear-gradient(135deg, #3b82f6, #60a5fa)'
  }
])

// ========== 快捷服务 ==========
const services = [
  {
    name: '看医生',
    desc: '在线问诊',
    gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)',
    icon: defineComponent({
      render() {
        return h('svg', { viewBox: '0 0 48 48', width: 48, height: 48, fill: 'none', stroke: '#fff', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
          h('rect', { x: '8', y: '4', width: '32', height: '40', rx: '4' }),
          h('path', { d: 'M16 16h16' }),
          h('path', { d: 'M16 24h16' }),
          h('path', { d: 'M16 32h10' })
        ])
      }
    }),
    action: () => {}
  },
  {
    name: '买东西',
    desc: '生活代购',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    icon: defineComponent({
      render() {
        return h('svg', { viewBox: '0 0 48 48', width: 48, height: 48, fill: 'none', stroke: '#fff', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
          h('circle', { cx: '18', cy: '18', r: '10' }),
          h('path', { d: 'M26 26l12 12' }),
          h('path', { d: 'M14 18h8' }),
          h('path', { d: 'M18 14v8' })
        ])
      }
    }),
    action: () => {}
  },
  {
    name: '找人帮忙',
    desc: '邻里互助',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    icon: defineComponent({
      render() {
        return h('svg', { viewBox: '0 0 48 48', width: 48, height: 48, fill: 'none', stroke: '#fff', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
          h('circle', { cx: '18', cy: '14', r: '6' }),
          h('path', { d: 'M6 40v-4a10 10 0 0 1 20 0v4' }),
          h('circle', { cx: '34', cy: '14', r: '5' }),
          h('path', { d: 'M28 40v-4a10 10 0 0 0-4-8' }),
          h('path', { d: 'M34 22a8 8 0 0 1 8 8v2' })
        ])
      }
    }),
    action: () => {}
  },
  {
    name: '休闲娱乐',
    desc: '听戏下棋',
    gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
    icon: defineComponent({
      render() {
        return h('svg', { viewBox: '0 0 48 48', width: 48, height: 48, fill: 'none', stroke: '#fff', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, [
          h('circle', { cx: '24', cy: '24', r: '18' }),
          h('path', { d: 'M20 16v16l12-8z', fill: '#fff' })
        ])
      }
    }),
    action: () => {}
  }
]

// ========== 呼叫客服 ==========
async function handleSOS() {
  if (callStatus.value === 'pending') {
    ElMessage.info('正在等待客服接听，请稍候...')
    return
  }
  if (callStatus.value === 'active') {
    ElMessage.info('正在通话中...')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定要呼叫客服吗？客服将为您提供帮助。',
      '呼叫客服确认',
      {
        confirmButtonText: '确定呼叫',
        cancelButtonText: '取消',
        type: 'info',
        customStyle: {
          fontSize: '20px',
          width: '420px'
        }
      }
    )

    // 发送呼叫请求
    const success = send({
      type: 'call_request',
      payload: {
        elderlyId: userStore.userId,
        elderlyName: userStore.realName || '老人',
        villageName: '幸福村',
        phone: '138****1234',
        reason: '老人主动呼叫客服'
      }
    })

    if (success) {
      callStatus.value = 'pending'
      ElMessage.success('呼叫已发送，正在为您连接客服...')
    } else {
      ElMessage.error('连接失败，请检查网络')
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error(err)
    }
  }
}

// ========== 动画观察器 ==========
let observer = null
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.animate-in').forEach((el) => {
    observer.observe(el)
  })
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})
</script>

<template>
  <div class="elderly-home">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="bg-blob bg-blob-1" />
      <div class="bg-blob bg-blob-2" />
      <div class="bg-blob bg-blob-3" />
    </div>

    <div class="page-content">
      <!-- 顶部问候区域 -->
      <header
        class="greeting-section animate-in"
        style="--delay: 0s"
      >
        <div class="greeting-left">
          <h1 class="greeting-text">
            {{ greeting }}，{{ userStore.realName || '老人家' }}
          </h1>
          <p class="date-text">
            {{ currentDate }}
          </p>
        </div>
        <div class="weather-card glass-card">
          <div class="weather-icon">
            <svg
              viewBox="0 0 48 48"
              width="48"
              height="48"
            >
              <circle
                cx="24"
                cy="24"
                r="10"
                fill="#fbbf24"
              />
              <g
                stroke="#fbbf24"
                stroke-width="3"
                stroke-linecap="round"
              >
                <line
                  x1="24"
                  y1="4"
                  x2="24"
                  y2="10"
                />
                <line
                  x1="24"
                  y1="38"
                  x2="24"
                  y2="44"
                />
                <line
                  x1="4"
                  y1="24"
                  x2="10"
                  y2="24"
                />
                <line
                  x1="38"
                  y1="24"
                  x2="44"
                  y2="24"
                />
                <line
                  x1="9.86"
                  y1="9.86"
                  x2="14.1"
                  y2="14.1"
                />
                <line
                  x1="33.9"
                  y1="33.9"
                  x2="38.14"
                  y2="38.14"
                />
                <line
                  x1="9.86"
                  y1="38.14"
                  x2="14.1"
                  y2="33.9"
                />
                <line
                  x1="33.9"
                  y1="14.1"
                  x2="38.14"
                  y2="9.86"
                />
              </g>
            </svg>
          </div>
          <div class="weather-info">
            <span class="weather-temp">{{ weather.temp }}°C</span>
            <span class="weather-desc">{{ weather.desc }}</span>
          </div>
        </div>
      </header>

      <!-- SOS 紧急呼叫 -->
      <div
        class="sos-section animate-in"
        style="--delay: 0.1s"
      >
        <button
          class="sos-button"
          :class="{ 'sos-pulse': sosPulse }"
          @click="handleSOS"
        >
          <div class="sos-ring" />
          <div class="sos-ring sos-ring-2" />
          <div class="sos-icon">
            <svg
              viewBox="0 0 64 64"
              width="64"
              height="64"
            >
              <path
                d="M32 4a24 24 0 0 0-24 24c0 18 24 36 24 36s24-18 24-36A24 24 0 0 0 32 4z"
                fill="none"
                stroke="#fff"
                stroke-width="3"
              />
              <circle
                cx="32"
                cy="26"
                r="8"
                fill="none"
                stroke="#fff"
                stroke-width="3"
              />
              <path
                d="M32 34v6"
                stroke="#fff"
                stroke-width="3"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <span class="sos-text">紧急呼叫</span>
          <span class="sos-sub">长按或点击立即求助</span>
        </button>
      </div>

      <!-- 快捷服务入口 -->
      <section
        class="services-section animate-in"
        style="--delay: 0.2s"
      >
        <h2 class="section-title">
          快捷服务
        </h2>
        <div class="services-grid">
          <div
            v-for="(service, index) in services"
            :key="service.name"
            class="service-card glass-card"
            :style="{ '--card-delay': `${0.3 + index * 0.08}s` }"
            @click="service.action"
          >
            <div
              class="service-icon"
              :style="{ background: service.gradient }"
            >
              <component :is="service.icon" />
            </div>
            <span class="service-name">{{ service.name }}</span>
            <span class="service-desc">{{ service.desc }}</span>
          </div>
        </div>
      </section>

      <!-- 健康提醒卡片 -->
      <section
        class="health-section animate-in"
        style="--delay: 0.4s"
      >
        <h2 class="section-title">
          今日健康
        </h2>
        <div class="health-card glass-card">
          <div class="health-grid">
            <div
              v-for="item in healthData"
              :key="item.label"
              class="health-item"
            >
              <div
                class="health-icon-wrap"
                :style="{ color: item.color }"
              >
                <component :is="item.icon" />
              </div>
              <div class="health-detail">
                <span class="health-label">{{ item.label }}</span>
                <span
                  class="health-value"
                  :style="{ color: item.color }"
                >{{ item.value }}</span>
                <span class="health-unit">{{ item.unit }}</span>
              </div>
              <div
                class="health-status"
                :class="item.status"
              >
                {{ item.statusText }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 今日用药提醒 -->
      <section
        class="medicine-section animate-in"
        style="--delay: 0.5s"
      >
        <h2 class="section-title">
          今日用药提醒
        </h2>
        <div class="medicine-card glass-card">
          <div
            v-for="(med, index) in medicineData"
            :key="index"
            class="medicine-item"
            :class="{ 'medicine-done': med.done }"
          >
            <div
              class="medicine-check"
              @click="med.done = !med.done"
            >
              <svg
                v-if="med.done"
                viewBox="0 0 32 32"
                width="32"
                height="32"
              >
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="#0d9488"
                />
                <path
                  d="M10 16l4 4 8-8"
                  fill="none"
                  stroke="#fff"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg
                v-else
                viewBox="0 0 32 32"
                width="32"
                height="32"
              >
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="#cbd5e1"
                  stroke-width="2.5"
                />
              </svg>
            </div>
            <div class="medicine-info">
              <span class="medicine-name">{{ med.name }}</span>
              <span class="medicine-dose">{{ med.dose }}</span>
            </div>
            <div class="medicine-time">
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="#64748b"
                stroke-width="2"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>{{ med.time }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 家人动态 -->
      <section
        class="family-section animate-in"
        style="--delay: 0.6s"
      >
        <h2 class="section-title">
          家人动态
        </h2>
        <div class="family-card glass-card">
          <div
            v-for="(member, index) in familyData"
            :key="index"
            class="family-item"
          >
            <div
              class="family-avatar"
              :style="{ background: member.avatarBg }"
            >
              {{ member.name.charAt(0) }}
            </div>
            <div class="family-info">
              <span class="family-name">{{ member.name }}</span>
              <span class="family-message">{{ member.message }}</span>
            </div>
            <span class="family-time">{{ member.time }}</span>
          </div>
        </div>
      </section>

      <!-- 底部安全间距 -->
      <div style="height: 40px" />
    </div>
  </div>
</template>

<style scoped>
/* ========== 全局变量 ========== */
.elderly-home {
  --teal-600: #0d9488;
  --teal-500: #14b8a6;
  --teal-300: #5eead4;
  --teal-100: #ccfbf1;
  --teal-50: #f0fdfa;
  --red-500: #ef4444;
  --red-600: #dc2626;
  --red-700: #b91c1c;
  --gray-50: #f8fafc;
  --gray-100: #f1f5f9;
  --gray-200: #e2e8f0;
  --gray-400: #94a3b8;
  --gray-500: #64748b;
  --gray-700: #334155;
  --gray-800: #1e293b;
  --gray-900: #0f172a;

  position: relative;
  min-height: 100vh;
  background: linear-gradient(160deg, var(--teal-50) 0%, #ecfdf5 40%, var(--gray-50) 100%);
  overflow-x: hidden;
}

/* ========== 背景装饰 ========== */
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
  animation: blobFloat 20s ease-in-out infinite;
}

.bg-blob-2 {
  width: 300px;
  height: 300px;
  background: #a7f3d0;
  bottom: 20%;
  left: -80px;
  animation: blobFloat 25s ease-in-out infinite reverse;
}

.bg-blob-3 {
  width: 250px;
  height: 250px;
  background: var(--teal-300);
  top: 50%;
  right: -60px;
  animation: blobFloat 18s ease-in-out infinite 5s;
}

@keyframes blobFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* ========== 页面内容 ========== */
.page-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 28px 24px;
}

/* ========== 毛玻璃卡片 ========== */
.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(13, 148, 136, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.glass-card:hover {
  box-shadow: 0 12px 40px rgba(13, 148, 136, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06);
}

/* ========== 入场动画 ========== */
.animate-in {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
  transition-delay: var(--delay, 0s);
}

.animate-in.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ========== 顶部问候区域 ========== */
.greeting-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 20px;
}

.greeting-text {
  font-size: 32px;
  font-weight: 700;
  color: var(--gray-800);
  line-height: 1.3;
  margin: 0 0 8px 0;
}

.date-text {
  font-size: 20px;
  color: var(--gray-500);
  font-weight: 400;
}

.weather-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  flex-shrink: 0;
}

.weather-temp {
  font-size: 28px;
  font-weight: 700;
  color: var(--gray-800);
  display: block;
  line-height: 1.2;
}

.weather-desc {
  font-size: 18px;
  color: var(--gray-500);
}

/* ========== SOS 紧急呼叫 ========== */
.sos-section {
  display: flex;
  justify-content: center;
  margin-bottom: 36px;
}

.sos-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 220px;
  height: 220px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--red-600), var(--red-700));
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 8px 30px rgba(220, 38, 38, 0.4);
  z-index: 1;
}

.sos-button:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 40px rgba(220, 38, 38, 0.5);
}

.sos-button:active {
  transform: scale(0.98);
}

.sos-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid rgba(239, 68, 68, 0.3);
  top: 0;
  left: 0;
  animation: sosRipple 2s ease-out infinite;
}

.sos-ring-2 {
  animation-delay: 1s;
}

@keyframes sosRipple {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

.sos-icon {
  margin-bottom: 8px;
}

.sos-text {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 4px;
}

.sos-sub {
  font-size: 18px;
  opacity: 0.85;
  margin-top: 4px;
}

/* ========== 区域标题 ========== */
.section-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--gray-800);
  margin: 0 0 20px 0;
  padding-left: 16px;
  border-left: 5px solid var(--teal-500);
  line-height: 1.3;
}

/* ========== 快捷服务 ========== */
.services-section {
  margin-bottom: 36px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.service-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  min-height: 180px;
}

.service-card:hover {
  transform: translateY(-4px);
}

.service-card:active {
  transform: translateY(0) scale(0.98);
}

.service-icon {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.service-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--gray-800);
  margin-bottom: 6px;
}

.service-desc {
  font-size: 18px;
  color: var(--gray-500);
}

/* ========== 健康卡片 ========== */
.health-section {
  margin-bottom: 36px;
}

.health-card {
  padding: 24px;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.health-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.health-icon-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.health-detail {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.health-label {
  font-size: 18px;
  color: var(--gray-500);
  font-weight: 400;
}

.health-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.3;
}

.health-unit {
  font-size: 16px;
  color: var(--gray-400);
}

.health-status {
  font-size: 18px;
  font-weight: 600;
  padding: 4px 14px;
  border-radius: 20px;
  white-space: nowrap;
}

.health-status.normal {
  color: var(--teal-600);
  background: var(--teal-100);
}

.health-status.warning {
  color: #f59e0b;
  background: #fef3c7;
}

.health-status.danger {
  color: var(--red-500);
  background: #fef2f2;
}

/* ========== 用药提醒 ========== */
.medicine-section {
  margin-bottom: 36px;
}

.medicine-card {
  padding: 20px 24px;
}

.medicine-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  transition: opacity 0.3s ease;
}

.medicine-item:last-child {
  border-bottom: none;
}

.medicine-done {
  opacity: 0.55;
}

.medicine-done .medicine-name {
  text-decoration: line-through;
}

.medicine-check {
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.medicine-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.medicine-name {
  font-size: 22px;
  font-weight: 600;
  color: var(--gray-800);
}

.medicine-dose {
  font-size: 18px;
  color: var(--gray-500);
}

.medicine-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--teal-600);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ========== 家人动态 ========== */
.family-section {
  margin-bottom: 20px;
}

.family-card {
  padding: 20px 24px;
}

.family-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.family-item:last-child {
  border-bottom: none;
}

.family-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  flex-shrink: 0;
}

.family-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.family-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--gray-800);
}

.family-message {
  font-size: 18px;
  color: var(--gray-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.family-time {
  font-size: 18px;
  color: var(--gray-400);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ========== 响应式适配 ========== */
@media (max-width: 600px) {
  .page-content {
    padding: 20px 16px;
  }

  .greeting-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .greeting-text {
    font-size: 26px;
  }

  .date-text {
    font-size: 18px;
  }

  .weather-card {
    align-self: flex-start;
    padding: 14px 20px;
  }

  .weather-temp {
    font-size: 24px;
  }

  .sos-button {
    width: 180px;
    height: 180px;
  }

  .sos-text {
    font-size: 24px;
  }

  .sos-sub {
    font-size: 16px;
  }

  .services-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .service-card {
    padding: 22px 12px;
    min-height: 150px;
  }

  .service-icon {
    width: 64px;
    height: 64px;
    border-radius: 20px;
  }

  .service-name {
    font-size: 22px;
  }

  .service-desc {
    font-size: 16px;
  }

  .health-grid {
    grid-template-columns: 1fr;
  }

  .health-value {
    font-size: 24px;
  }

  .section-title {
    font-size: 22px;
  }

  .medicine-name {
    font-size: 20px;
  }

  .medicine-dose {
    font-size: 16px;
  }

  .medicine-time {
    font-size: 18px;
  }

  .family-name {
    font-size: 20px;
  }

  .family-message {
    font-size: 16px;
  }
}

/* ========== Element Plus 弹窗适老化覆盖 ========== */
:deep(.el-message-box) {
  font-size: 20px !important;
  border-radius: 20px !important;
  padding: 28px !important;
}

:deep(.el-message-box__title) {
  font-size: 24px !important;
  font-weight: 700 !important;
}

:deep(.el-message-box__message) {
  font-size: 20px !important;
  line-height: 1.6 !important;
}

:deep(.el-message-box__btns .el-button) {
  font-size: 20px !important;
  padding: 12px 28px !important;
  border-radius: 12px !important;
  min-height: 52px !important;
}

:deep(.el-message) {
  font-size: 20px !important;
  border-radius: 14px !important;
  padding: 16px 24px !important;
  min-height: 52px !important;
}
</style>

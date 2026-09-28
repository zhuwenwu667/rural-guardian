<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HomeFilled, SwitchButton, Bell, Sunny, Moon, Search } from '@element-plus/icons-vue'
import { useUserStore } from '../../stores/user'
import { getAlertList } from '../../api/alert'
import { ElMessageBox, ElNotification } from 'element-plus'
import ElderlyModeToggle from '../../components/ElderlyModeToggle.vue'
import { voiceService } from '../../services/voice'
import { accessibilityService } from '../../services/accessibility'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapsed = ref(false)
const isDark = ref(false)
const searchKeyword = ref('')
const searchFocused = ref(false)
const highlightedSearchIndex = ref(0)
const currentTimeStr = ref('')
const currentWeather = ref('晴 26°C')
const weatherIcon = ref('☀️')
const pendingAlertCount = ref(0)
const pendingAlerts = ref([])

let clockTimer = null
let demoWs = null
let searchBlurTimer = null

const weatherList = [
  { text: '晴', icon: '☀️' },
  { text: '多云', icon: '⛅' },
  { text: '阴', icon: '☁️' },
  { text: '小雨', icon: '🌧️' },
  { text: '大雨', icon: '⛈️' },
]

const roleBreadcrumbMap = {
  gov: '政府监管',
  village: '村级管理',
  provider: '服务商',
  family: '家属端',
  elderly: '老人端',
  cs: '客服中心',
}

const pageDescriptions = {
  '/gov/dashboard': '集中查看预警、工单、设备与服务质量，优先处理高风险事项。',
  '/gov/alert': '统一处理预警事件，按严重程度快速进入处置流程。',
  '/gov/order': '跟踪服务工单状态，协调服务商与村级专员协同处理。',
  '/gov/device-monitor': '监控设备在线率、异常告警与链路稳定性。',
  '/village/dashboard': '聚焦本村服务对象、工单与预警处置进度。',
  '/provider/dashboard': '围绕派单、响应和履约效率安排服务执行。',
  '/family/dashboard': '随时掌握家人健康、预警与服务预约状态。',
  '/elderly/home': '提供高可读、高可达的核心操作与生活服务入口。',
}

function updateClock() {
  const now = new Date()
  currentTimeStr.value = now.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function initWeather() {
  const idx = new Date().getDay() % weatherList.length
  const w = weatherList[idx]
  const temp = 22 + Math.floor(Math.random() * 10)
  currentWeather.value = `${w.text} ${temp}°C`
  weatherIcon.value = w.icon
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

function handleGlobalKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    const input = document.querySelector('.search-input')
    if (input) input.focus()
  }
}

const breadcrumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  const crumbs = []
  if (parts.length >= 2 && roleBreadcrumbMap[parts[0]]) {
    crumbs.push(roleBreadcrumbMap[parts[0]])
  }
  if (route.meta.title) {
    crumbs.push(route.meta.title)
  }
  return crumbs.length ? crumbs : ['首页']
})

const currentRoute = computed(() => route.path)
const currentTitle = computed(() => route.meta.title || '工作台')
const currentSection = computed(() => breadcrumbs.value[0] || userStore.roleName || '业务模块')
const currentDescription = computed(() => {
  return pageDescriptions[route.path] || '统一查看业务状态、风险提醒和当前页面的关键操作入口。'
})

const fallbackMenus = {
  GOV_ADMIN: [
    { label: '工作台', items: [{ path: '/gov/dashboard', title: '数据总览', icon: 'DataAnalysis' }] },
    {
      label: '养老服务',
      items: [
        { path: '/gov/elderly', title: '老人管理', icon: 'User' },
        { path: '/gov/alert', title: '预警管理', icon: 'Bell' },
        { path: '/gov/order', title: '工单管理', icon: 'Document' },
        { path: '/gov/approval', title: '审批管理', icon: 'CircleCheck' },
      ],
    },
    {
      label: '区域管理',
      items: [
        { path: '/gov/village', title: '村庄管理', icon: 'OfficeBuilding' },
        { path: '/gov/provider', title: '服务商管理', icon: 'Shop' },
      ],
    },
    {
      label: '系统管理',
      items: [
        { path: '/gov/user', title: '用户管理', icon: 'UserFilled' },
        { path: '/gov/device', title: '设备管理', icon: 'Monitor' },
        { path: '/gov/device-monitor', title: '设备监控', icon: 'Cpu' },
      ],
    },
    {
      label: '数据中心',
      items: [
        { path: '/gov/stats', title: '数据统计', icon: 'TrendCharts' },
        { path: '/big-screen', title: '数据大屏', icon: 'Monitor' },
      ],
    },
    {
      label: '系统设置',
      items: [
        { path: '/gov/service-center', title: '服务集成中心', icon: 'Connection' },
        { path: '/gov/sms-code', title: '短信验证码', icon: 'ChatDotSquare' },
        { path: '/gov/service-sms', title: '短信服务', icon: 'ChatDotRound' },
        { path: '/gov/service-ai', title: 'AI 服务管理', icon: 'MagicStick' },
        { path: '/gov/service-voice', title: '语音服务管理', icon: 'Microphone' },
        { path: '/gov/service-map', title: '地图服务管理', icon: 'MapLocation' },
        { path: '/gov/service-push', title: '消息推送服务管理', icon: 'Promotion' },
      ],
    },
    { label: '账户', items: [{ path: '/profile', title: '个人中心', icon: 'Setting' }] },
  ],
  VILLAGE_STAFF: [
    { label: '工作台', items: [{ path: '/village/dashboard', title: '工作台', icon: 'HomeFilled' }] },
    {
      label: '养老服务',
      items: [
        { path: '/village/elderly', title: '本村老人', icon: 'User' },
        { path: '/village/alert', title: '预警处理', icon: 'Bell' },
        { path: '/village/order', title: '工单处理', icon: 'Document' },
        { path: '/village/approval', title: '审批中心', icon: 'CircleCheck' },
      ],
    },
    { label: '人员管理', items: [{ path: '/village/user', title: '人员管理', icon: 'UserFilled' }] },
    { label: '账户', items: [{ path: '/profile', title: '个人中心', icon: 'Setting' }] },
  ],
  PROVIDER: [
    { label: '工作台', items: [{ path: '/provider/dashboard', title: '工作台', icon: 'HomeFilled' }] },
    { label: '服务管理', items: [{ path: '/provider/order', title: '工单管理', icon: 'Document' }] },
    { label: '账户', items: [{ path: '/profile', title: '个人中心', icon: 'Setting' }] },
  ],
  FAMILY_MEMBER: [
    { label: '首页', items: [{ path: '/family/dashboard', title: '首页', icon: 'HomeFilled' }] },
    {
      label: '关爱服务',
      items: [
        { path: '/family/health', title: '健康监测', icon: 'Heart' },
        { path: '/family/alert', title: '预警通知', icon: 'Bell' },
        { path: '/family/order', title: '服务预约', icon: 'Document' },
      ],
    },
    { label: '账户', items: [{ path: '/profile', title: '个人中心', icon: 'Setting' }] },
  ],
  ELDERLY: [
    { label: '首页', items: [{ path: '/elderly/home', title: '首页', icon: 'HomeFilled' }] },
    {
      label: '我的服务',
      items: [
        { path: '/elderly/health', title: '我的健康', icon: 'Heart' },
        { path: '/elderly/order', title: '我的服务', icon: 'Document' },
      ],
    },
    { label: '账户', items: [{ path: '/profile', title: '个人中心', icon: 'Setting' }] },
  ],
  CS: [
    { label: '工作台', items: [{ path: '/cs/dashboard', title: '客服工作台', icon: 'Headset' }] },
    { label: '账户', items: [{ path: '/profile', title: '个人中心', icon: 'Setting' }] },
  ],
}

const menuGroups = computed(() => {
  if (userStore.menus && userStore.menus.length > 0) {
    return userStore.menus
  }
  const role = userStore.role || 'GOV_ADMIN'
  return fallbackMenus[role] || fallbackMenus.GOV_ADMIN
})

const flatMenuItems = computed(() => {
  return menuGroups.value.flatMap((group) =>
    (group.items || []).map((item) => ({
      ...item,
      groupLabel: group.label,
      keywords: `${group.label} ${item.title} ${item.path}`.toLowerCase(),
    })),
  )
})

const searchResults = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return flatMenuItems.value.slice(0, 6)
  }
  return flatMenuItems.value.filter((item) => item.keywords.includes(keyword)).slice(0, 8)
})

const showSearchPanel = computed(() => {
  return searchFocused.value && (searchKeyword.value.trim() !== '' || searchResults.value.length > 0)
})

const roleTagType = computed(() => {
  const map = {
    GOV_ADMIN: 'danger',
    VILLAGE_STAFF: 'warning',
    PROVIDER: 'success',
    FAMILY_MEMBER: 'info',
    ELDERLY: '',
  }
  return map[userStore.role] || ''
})

const statusPills = computed(() => [
  { label: '未处理预警', value: `${pendingAlertCount.value} 条`, tone: pendingAlertCount.value > 0 ? 'danger' : 'normal' },
  { label: '当前角色', value: userStore.roleName || '访客', tone: 'normal' },
  { label: '运行时间', value: currentTimeStr.value || '--', tone: 'muted' },
])

watch(searchResults, (list) => {
  if (highlightedSearchIndex.value >= list.length) {
    highlightedSearchIndex.value = 0
  }
})

watch(
  () => route.path,
  () => {
    searchKeyword.value = ''
    searchFocused.value = false
    highlightedSearchIndex.value = 0
    fetchPendingAlerts()
  },
)

async function fetchPendingAlerts() {
  try {
    const res = await getAlertList({ status: 'PENDING', pageSize: 5 })
    if (res.code === 200) {
      pendingAlerts.value = res.data?.list || res.data?.records || res.data || []
      pendingAlertCount.value = res.data?.total || pendingAlerts.value.length
    }
  } catch (err) {
    console.error('获取预警列表失败', err)
  }
}

function connectDemoWebSocket() {
  try {
    demoWs = new WebSocket('ws://localhost:8080')
    demoWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'new_alert') {
          const { elderlyName, type, level, villageName, description } = msg.payload
          const typeLabel = type === 'SOS' ? 'SOS紧急求助' : type === 'FALL' ? '跌倒检测' : '告警'
          ElNotification({
            title: `${typeLabel} - ${level === 'CRITICAL' ? '紧急' : '普通'}`,
            message: `${elderlyName}(${villageName}): ${(description || '').slice(0, 50)}`,
            type: level === 'CRITICAL' ? 'error' : 'warning',
            duration: 0,
            position: 'top-right',
          })
          fetchPendingAlerts()
        }
      } catch (error) {
        console.error(error)
      }
    }
    demoWs.onclose = () => setTimeout(connectDemoWebSocket, 5000)
  } catch (error) {
    console.error(error)
  }
}

function handleSearchFocus() {
  if (searchBlurTimer) clearTimeout(searchBlurTimer)
  searchFocused.value = true
}

function handleSearchBlur() {
  searchBlurTimer = setTimeout(() => {
    searchFocused.value = false
  }, 120)
}

function selectSearchResult(item) {
  searchKeyword.value = ''
  searchFocused.value = false
  highlightedSearchIndex.value = 0
  router.push(item.path)
}

function handleSearchSubmit() {
  const target = searchResults.value[highlightedSearchIndex.value] || searchResults.value[0]
  if (target) {
    selectSearchResult(target)
  }
}

function handleSearchKeydown(event) {
  if (!showSearchPanel.value && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
    searchFocused.value = true
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlightedSearchIndex.value = Math.min(highlightedSearchIndex.value + 1, Math.max(searchResults.value.length - 1, 0))
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlightedSearchIndex.value = Math.max(highlightedSearchIndex.value - 1, 0)
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    handleSearchSubmit()
  }
  if (event.key === 'Escape') {
    searchFocused.value = false
  }
}

function alertTypeTag(type) {
  const map = {
    HEALTH: 'danger',
    FALL: 'danger',
    SOS: 'danger',
    DEVICE: 'warning',
    ABNORMAL: 'warning',
  }
  return map[type] || 'info'
}

function alertTypeName(type) {
  const map = {
    HEALTH: '健康预警',
    FALL: '跌倒预警',
    SOS: '紧急求助',
    DEVICE: '设备异常',
    ABNORMAL: '行为异常',
  }
  return map[type] || '预警'
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return d.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goAlertPage() {
  const alertRoutes = {
    GOV_ADMIN: '/gov/alert',
    VILLAGE_STAFF: '/village/alert',
    FAMILY_MEMBER: '/family/alert',
  }
  const targetPath = alertRoutes[userStore.role]
  if (targetPath) {
    router.push(targetPath)
  }
}

function toggleVoice() {
  voiceService.setEnabled(!voiceService.enabled)
}

function handleLogout() {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      userStore.logout()
    })
    .catch(() => {})
}

onMounted(async () => {
  initTheme()
  initWeather()
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  document.addEventListener('keydown', handleGlobalKeydown)
  accessibilityService.init()
  if (!userStore.userInfo) {
    await userStore.fetchUserInfo()
  }
  if (userStore.permissions.length === 0 && userStore.menus.length === 0) {
    await userStore.fetchPermissions()
  }
  fetchPendingAlerts()
  connectDemoWebSocket()
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (demoWs) demoWs.close()
  if (searchBlurTimer) clearTimeout(searchBlurTimer)
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <div class="app-layout">
    <aside :class="['sidebar', { collapsed: isCollapsed }]">
      <div class="sidebar-header">
        <div class="brand-lockup">
          <div class="logo-icon">
            <el-icon :size="26">
              <HomeFilled />
            </el-icon>
          </div>
          <div
            v-show="!isCollapsed"
            class="brand-copy"
          >
            <span class="logo-text">乡村守护者</span>
            <span class="logo-subtext">Rural Guardian Operations</span>
          </div>
        </div>
        <el-tag
          v-show="!isCollapsed"
          size="small"
          effect="dark"
          class="brand-tag"
        >
          {{ currentSection }}
        </el-tag>
      </div>

      <div class="menu-container">
        <el-menu
          :default-active="currentRoute"
          :collapse="isCollapsed"
          :collapse-transition="true"
          background-color="transparent"
          text-color="rgba(255,255,255,0.72)"
          active-text-color="#e6fffb"
          router
        >
          <template
            v-for="group in menuGroups"
            :key="group.label"
          >
            <div
              v-show="!isCollapsed"
              class="menu-group-title"
            >
              <span class="group-dot" />
              <span class="group-label">{{ group.label }}</span>
            </div>
            <div
              v-show="isCollapsed"
              class="menu-group-title-collapsed"
            >
              <span class="group-dot-collapsed" />
            </div>
            <el-menu-item
              v-for="item in group.items"
              :key="item.path"
              :index="item.path"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <template #title>
                {{ item.title }}
              </template>
            </el-menu-item>
          </template>
        </el-menu>
      </div>

      <div class="sidebar-footer">
        <button
          class="sidebar-toggle"
          :aria-label="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="isCollapsed = !isCollapsed"
        >
          <el-icon
            :size="16"
            aria-hidden="true"
          >
            <component :is="isCollapsed ? 'DArrowRight' : 'DArrowLeft'" />
          </el-icon>
          <span v-show="!isCollapsed">{{ isCollapsed ? '展开导航' : '收起导航' }}</span>
        </button>
      </div>
    </aside>

    <div class="main-area">
      <header class="header">
        <div class="header-top">
          <div class="header-context">
            <el-breadcrumb
              separator="/"
              class="header-breadcrumb"
            >
              <el-breadcrumb-item
                v-for="(crumb, index) in breadcrumbs"
                :key="index"
              >
                {{ crumb }}
              </el-breadcrumb-item>
            </el-breadcrumb>
            <div class="page-intro">
              <div class="page-title-row">
                <h1 class="page-title">
                  {{ currentTitle }}
                </h1>
                <span class="page-section-tag">{{ currentSection }}</span>
              </div>
              <p class="page-description">
                {{ currentDescription }}
              </p>
            </div>
          </div>

          <div class="header-workbench">
            <div class="search-shell">
              <div
                class="global-search"
                :class="{ active: showSearchPanel }"
              >
                <el-icon class="search-icon">
                  <Search />
                </el-icon>
                <input
                  v-model="searchKeyword"
                  type="text"
                  class="search-input"
                  placeholder="快速跳转页面、功能模块"
                  @focus="handleSearchFocus"
                  @blur="handleSearchBlur"
                  @keydown="handleSearchKeydown"
                >
                <kbd class="search-kbd">Ctrl+K</kbd>
              </div>
              <div
                v-if="showSearchPanel"
                class="search-panel"
              >
                <div class="search-panel-head">
                  <span>快捷导航</span>
                  <span>{{ searchResults.length }} 项</span>
                </div>
                <button
                  v-for="(item, index) in searchResults"
                  :key="item.path"
                  type="button"
                  class="search-result"
                  :class="{ active: highlightedSearchIndex === index }"
                  @mousedown.prevent="selectSearchResult(item)"
                >
                  <div class="search-result-main">
                    <span class="search-result-title">{{ item.title }}</span>
                    <span class="search-result-group">{{ item.groupLabel }}</span>
                  </div>
                  <span class="search-result-path">{{ item.path }}</span>
                </button>
                <div
                  v-if="searchResults.length === 0"
                  class="search-empty"
                >
                  未找到匹配功能，试试“老人”“预警”“工单”等关键词
                </div>
              </div>
            </div>

            <div class="header-tools">
              <div class="meta-pill">
                <span class="meta-icon">{{ weatherIcon }}</span>
                <span>{{ currentWeather }}</span>
              </div>

              <el-popover
                placement="bottom-end"
                :width="360"
                trigger="click"
                popper-class="notification-popover"
              >
                <template #reference>
                  <el-badge
                    :value="pendingAlertCount"
                    :hidden="pendingAlertCount === 0"
                    :max="99"
                    class="notification-badge"
                  >
                    <el-button
                      text
                      class="header-icon-btn"
                      @click="fetchPendingAlerts"
                    >
                      <el-icon :size="18">
                        <Bell />
                      </el-icon>
                    </el-button>
                  </el-badge>
                </template>
                <div class="notification-panel">
                  <div class="notification-header">
                    <span class="notification-title">未处理预警</span>
                    <el-button
                      text
                      type="primary"
                      size="small"
                      @click="goAlertPage"
                    >
                      查看全部
                    </el-button>
                  </div>
                  <div
                    v-if="pendingAlerts.length === 0"
                    class="notification-empty"
                  >
                    <el-empty
                      description="暂无未处理预警"
                      :image-size="60"
                    />
                  </div>
                  <div
                    v-else
                    class="notification-list"
                  >
                    <div
                      v-for="alert in pendingAlerts"
                      :key="alert.id"
                      class="notification-item"
                      @click="goAlertPage"
                    >
                      <div class="notification-item-header">
                        <el-tag
                          :type="alertTypeTag(alert.type)"
                          size="small"
                        >
                          {{ alertTypeName(alert.type) }}
                        </el-tag>
                        <span class="notification-time">{{ formatTime(alert.createdAt) }}</span>
                      </div>
                      <div class="notification-item-body">
                        {{ alert.content || alert.description || '预警信息' }}
                      </div>
                    </div>
                  </div>
                </div>
              </el-popover>

              <el-tooltip
                :content="isDark ? '切换到亮色模式' : '切换到暗色模式'"
                placement="bottom"
              >
                <el-button
                  text
                  class="header-icon-btn"
                  @click="toggleTheme"
                >
                  <el-icon :size="18">
                    <Sunny v-if="isDark" />
                    <Moon v-else />
                  </el-icon>
                </el-button>
              </el-tooltip>

              <ElderlyModeToggle />

              <el-tooltip
                :content="voiceService.enabled ? '关闭语音播报' : '开启语音播报'"
                placement="bottom"
              >
                <el-button
                  text
                  class="header-icon-btn"
                  :class="{ 'is-active': voiceService.enabled }"
                  @click="toggleVoice"
                >
                  <el-icon :size="18">
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 3C10.34 3 9 4.37 9 6v6c0 1.63 1.34 3 3 3s3-1.37 3-3V6c0-1.63-1.34-3-3-3z"
                        fill="currentColor"
                        opacity="0.9"
                      />
                      <path
                        d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"
                        fill="currentColor"
                      />
                      <line
                        v-if="!voiceService.enabled"
                        x1="4"
                        y1="4"
                        x2="20"
                        y2="20"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                      />
                    </svg>
                  </el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </div>

        <div class="header-bottom">
          <div class="status-strip">
            <div
              v-for="pill in statusPills"
              :key="pill.label"
              class="status-pill"
              :class="[`is-${pill.tone}`]"
            >
              <span class="status-pill-label">{{ pill.label }}</span>
              <strong class="status-pill-value">{{ pill.value }}</strong>
            </div>
          </div>

          <div class="user-section">
            <el-tag
              :type="roleTagType"
              size="small"
              effect="light"
              class="role-tag"
            >
              {{ userStore.roleName }}
            </el-tag>
            <span class="username">{{ userStore.realName || userStore.userInfo?.username }}</span>
            <el-button
              type="primary"
              link
              class="logout-btn"
              @click="handleLogout"
            >
              <el-icon><SwitchButton /></el-icon>
              <span>退出</span>
            </el-button>
          </div>
        </div>
      </header>

      <main class="content-area">
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <transition
              name="fade"
              mode="out-in"
            >
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}

.sidebar {
  width: var(--sidebar-width, 220px);
  min-width: var(--sidebar-width, 220px);
  height: 100vh;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background:
    radial-gradient(circle at top, rgba(94, 234, 212, 0.12), transparent 32%),
    linear-gradient(180deg, #062b2c 0%, #0d3d3f 46%, #0d4746 100%);
  color: #fff;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  transition: width 0.28s ease, min-width 0.28s ease;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width, 80px);
  min-width: var(--sidebar-collapsed-width, 80px);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.logo-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.95), rgba(45, 212, 191, 0.72));
  color: #fff;
  box-shadow: 0 12px 24px rgba(20, 184, 166, 0.25);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #f8fffe;
  letter-spacing: 0.4px;
}

.logo-subtext {
  font-size: 11px;
  color: rgba(230, 255, 251, 0.58);
  white-space: nowrap;
}

.brand-tag {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.08);
}

.menu-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 0;
}

.menu-container::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.menu-group-title,
.menu-group-title-collapsed {
  display: flex;
  align-items: center;
}

.menu-group-title {
  gap: 8px;
  padding: 14px 18px 8px;
}

.menu-group-title-collapsed {
  justify-content: center;
  padding: 14px 0 8px;
}

.group-dot,
.group-dot-collapsed {
  border-radius: 999px;
  background: rgba(94, 234, 212, 0.75);
  box-shadow: 0 0 18px rgba(94, 234, 212, 0.35);
}

.group-dot {
  width: 7px;
  height: 7px;
}

.group-dot-collapsed {
  width: 5px;
  height: 5px;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: rgba(224, 255, 251, 0.4);
  text-transform: uppercase;
}

.sidebar :deep(.el-menu) {
  background: transparent;
  border-right: none;
}

.sidebar :deep(.el-menu-item) {
  height: 44px;
  margin: 4px 10px;
  padding: 0 14px !important;
  border-radius: 12px;
  color: rgba(241, 255, 252, 0.72);
  font-size: 13.5px;
  transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;
}

.sidebar :deep(.el-menu-item .el-icon) {
  margin-right: 10px;
  color: rgba(241, 255, 252, 0.62);
}

.sidebar :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #fff;
  transform: translateX(2px);
}

.sidebar :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(20, 184, 166, 0.25), rgba(94, 234, 212, 0.12)) !important;
  color: #f4fffd;
  box-shadow: inset 0 0 0 1px rgba(94, 234, 212, 0.24);
}

.sidebar :deep(.el-menu-item.is-active .el-icon) {
  color: #99f6e4;
}

.sidebar.collapsed :deep(.el-menu-item) {
  margin: 4px 8px;
  padding: 0 !important;
  justify-content: center;
}

.sidebar.collapsed :deep(.el-menu-item .el-icon) {
  margin-right: 0;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.74);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.11);
  color: #fff;
}

.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(22, 119, 255, 0.08), transparent 26%),
    var(--bg);
}

.header {
  position: relative;
  padding: 18px 24px 16px;
  border-bottom: 1px solid var(--border-light);
  background: color-mix(in srgb, var(--bg-secondary) 88%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 20;
}

.header-top,
.header-bottom {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.header-bottom {
  margin-top: 14px;
  align-items: center;
}

.header-context {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-breadcrumb {
  line-height: 1;
}

.header-breadcrumb :deep(.el-breadcrumb__inner) {
  color: var(--text-muted);
}

.header-breadcrumb :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--text-secondary);
  font-weight: 600;
}

.page-intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  color: var(--text);
  letter-spacing: -0.02em;
}

.page-section-tag {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #0f766e;
  background: rgba(20, 184, 166, 0.12);
}

.page-description {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.header-workbench {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  min-width: 320px;
}

.search-shell {
  position: relative;
  width: min(460px, 100%);
}

.global-search {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  border-radius: 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.global-search.active,
.global-search:focus-within {
  background: var(--bg-secondary);
  border-color: rgba(20, 184, 166, 0.46);
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.08);
}

.search-icon {
  color: var(--text-muted);
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-kbd {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.search-panel {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  padding: 10px;
  border-radius: 18px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-lg);
}

.search-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 6px 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.search-result {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: none;
  background: transparent;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.search-result:hover,
.search-result.active {
  background: var(--bg-tertiary);
}

.search-result-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.search-result-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.search-result-group,
.search-result-path,
.search-empty {
  font-size: 12px;
  color: var(--text-muted);
}

.search-result-path {
  white-space: nowrap;
}

.search-empty {
  padding: 12px;
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.meta-icon {
  font-size: 16px;
}

.notification-badge :deep(.el-badge__content) {
  border: none;
  box-shadow: 0 0 0 2px var(--bg-secondary);
}

.header-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: var(--text-secondary) !important;
}

.header-icon-btn:hover {
  background: rgba(20, 184, 166, 0.08) !important;
  color: #0f766e !important;
}

.header-icon-btn.is-active {
  background: rgba(20, 184, 166, 0.12) !important;
  color: #0f766e !important;
}

.status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
}

.status-pill-label {
  font-size: 12px;
  color: var(--text-muted);
}

.status-pill-value {
  font-size: 13px;
  color: var(--text);
}

.status-pill.is-danger {
  background: rgba(255, 77, 79, 0.08);
  border-color: rgba(255, 77, 79, 0.16);
}

.status-pill.is-muted .status-pill-value {
  font-family: 'Courier New', monospace;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.role-tag {
  border-radius: 999px;
  font-weight: 600;
}

.username {
  color: var(--text-secondary);
  font-weight: 600;
}

.logout-btn {
  color: var(--text-muted) !important;
}

.logout-btn:hover {
  color: var(--danger) !important;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.content-wrapper {
  min-height: 100%;
}

.notification-panel {
  min-height: 100px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
}

.notification-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.notification-empty {
  padding: 16px 0;
}

.notification-list {
  max-height: 320px;
  overflow-y: auto;
}

.notification-item {
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background: var(--bg-tertiary);
}

.notification-item + .notification-item {
  margin-top: 6px;
}

.notification-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.notification-time {
  font-size: 12px;
  color: var(--text-muted);
}

.notification-item-body {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 1200px) {
  .header-top,
  .header-bottom {
    flex-direction: column;
    align-items: stretch;
  }

  .header-workbench {
    min-width: 0;
  }

  .user-section {
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .meta-pill,
  .search-kbd {
    display: none;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 76px;
    min-width: 76px;
  }

  .brand-copy,
  .brand-tag,
  .group-label,
  .sidebar-toggle span {
    display: none;
  }

  .header {
    padding: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .search-shell {
    width: 100%;
  }
}
</style>

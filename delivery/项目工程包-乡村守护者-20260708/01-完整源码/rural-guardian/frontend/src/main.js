import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import permissionDirective from './directives/permission'
import './styles/global.css'
import './styles/design-system-2026.css'

// 防闪烁：在 mount 之前立即应用主题和适老化模式
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark')
}

const savedElderly = localStorage.getItem('elderlyMode')
if (savedElderly === 'true') {
  document.body.classList.add('elderly-mode')
}

const savedHighContrast = localStorage.getItem('highContrast')
if (savedHighContrast === 'true') {
  document.body.classList.add('high-contrast')
}

const app = createApp(App)

app.use(ElementPlus, { locale: zhCn })

// 仅注册常用 Element Plus 图标（减少打包体积 ~2MB）
// 如需新增图标，从此列表添加对应的组件名
const usedIcons = [
  'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp',
  'Bell', 'BellFilled', 'CaretBottom', 'CaretRight', 'CaretTop',
  'ChatDotRound', 'ChatLineSquare', 'ChatRound',
  'Check', 'Checked', 'CircleCheck', 'CircleCheckFilled', 'CircleClose', 'CircleCloseFilled',
  'Connection',
  'Clock', 'Close', 'Cpu',
  'DataAnalysis', 'Delete', 'Document', 'Download', 'Edit', 'EditPen',
  'DArrowLeft', 'DArrowRight',
  'Expand', 'Fold',
  'Headset', 'Heart',
  'HomeFilled', 'Iphone', 'InfoFilled',
  'List', 'Loading', 'Location', 'LocationFilled', 'Lock',
  'Message', 'Microphone', 'Monitor', 'More', 'MoreFilled',
  'Odometer', 'OfficeBuilding', 'Operation',
  'PieChart', 'Platform', 'Plus', 'Position', 'Postcard', 'Printer', 'Promotion',
  'Refresh', 'RefreshRight',
  'Search', 'Service', 'Setting', 'Share', 'Star', 'StarFilled', 'SwitchButton',
  'Shop', 'ChatDotSquare',
  'Timer', 'Tools', 'TrendCharts', 'TrophyBase',
  'Upload', 'User', 'UserFilled',
  'VideoCamera', 'VideoCameraFilled', 'VideoPlay',
  'Warning', 'WarningFilled',
]
for (const key of usedIcons) {
  if (ElementPlusIconsVue[key]) {
    app.component(key, ElementPlusIconsVue[key])
  }
}

// 注册全局自定义指令
app.directive('permission', permissionDirective)

const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')

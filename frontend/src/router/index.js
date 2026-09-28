import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../views/layout/AppLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login2026.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/login/Register.vue'),
    meta: { title: '注册' },
  },
  {
    path: '/big-screen',
    name: 'BigScreen',
    component: () => import('../views/gov/BigScreen.vue'),
    meta: { title: '数据大屏', roles: ['GOV_ADMIN'] },
  },
  {
    path: '/',
    component: AppLayout,
    redirect: '/gov/dashboard',
    children: [
      // ===== 政府监管端 =====
      {
        path: 'gov/dashboard',
        name: 'GovDashboard',
        component: () => import('../views/gov/GovDashboard2026.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '数据总览' },
      },
      {
        path: 'gov/elderly',
        name: 'GovElderly',
        component: () => import('../views/gov/GovElderly.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '老人管理' },
      },
      {
        path: 'gov/alert',
        name: 'GovAlert',
        component: () => import('../views/gov/GovAlert.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '预警管理' },
      },
      {
        path: 'gov/order',
        name: 'GovOrder',
        component: () => import('../views/gov/GovOrder.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '工单管理' },
      },
      {
        path: 'gov/approval',
        name: 'GovApproval',
        component: () => import('../views/gov/GovApproval.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '审批管理' },
      },
      {
        path: 'gov/village',
        name: 'GovVillage',
        component: () => import('../views/gov/GovVillage.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '村庄管理' },
      },
      {
        path: 'gov/provider',
        name: 'GovProvider',
        component: () => import('../views/gov/GovProvider.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '服务商管理' },
      },
      {
        path: 'gov/user',
        name: 'GovUser',
        component: () => import('../views/gov/GovUser.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '用户管理' },
      },
      {
        path: 'gov/device',
        name: 'GovDevice',
        component: () => import('../views/gov/GovDevice.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '设备管理' },
      },
      {
        path: 'gov/device-monitor',
        name: 'GovDeviceMonitor',
        component: () => import('../views/gov/DeviceMonitor.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '设备监控' },
      },
      {
        path: 'gov/stats',
        name: 'GovStats',
        component: () => import('../views/gov/GovStats.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '数据统计' },
      },
      {
        path: 'gov/service-center',
        name: 'GovServiceCenter',
        component: () => import('../views/gov/GovServiceCenter.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '服务集成中心' },
      },
      {
        path: 'gov/service-ai',
        name: 'GovServiceAI',
        component: () => import('../views/gov/GovServiceAI.vue'),
        meta: { roles: ['GOV_ADMIN'], title: 'AI 服务管理' },
      },
      {
        path: 'gov/service-voice',
        name: 'GovServiceVoice',
        component: () => import('../views/gov/GovServiceVoice.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '语音服务管理' },
      },
      {
        path: 'gov/service-map',
        name: 'GovServiceMap',
        component: () => import('../views/gov/GovServiceMap.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '地图服务管理' },
      },
      {
        path: 'gov/service-push',
        name: 'GovServicePush',
        component: () => import('../views/gov/GovServicePush.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '消息推送服务管理' },
      },
      {
        path: 'gov/sms-code',
        name: 'GovSmsCode',
        component: () => import('../views/gov/GovSmsCode.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '短信验证码管理' },
      },
      {
        path: 'gov/service-sms',
        name: 'GovServiceSms',
        component: () => import('../views/gov/GovServiceSms.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '短信服务管理' },
      },
      {
        path: 'gov/permission',
        name: 'GovPermission',
        component: () => import('../views/gov/GovPermission.vue'),
        meta: { roles: ['GOV_ADMIN'], title: '菜单管理' },
      },

      // ===== 村级专员端 =====
      {
        path: 'village/dashboard',
        name: 'VillageDashboard',
        component: () => import('../views/village/VillageDashboard.vue'),
        meta: { roles: ['VILLAGE_STAFF'], title: '工作台' },
      },
      {
        path: 'village/elderly',
        name: 'VillageElderly',
        component: () => import('../views/village/VillageElderly.vue'),
        meta: { roles: ['VILLAGE_STAFF'], title: '本村老人' },
      },
      {
        path: 'village/alert',
        name: 'VillageAlert',
        component: () => import('../views/village/VillageAlert.vue'),
        meta: { roles: ['VILLAGE_STAFF'], title: '预警处理' },
      },
      {
        path: 'village/order',
        name: 'VillageOrder',
        component: () => import('../views/village/VillageOrder.vue'),
        meta: { roles: ['VILLAGE_STAFF'], title: '工单处理' },
      },
      {
        path: 'village/approval',
        name: 'VillageApproval',
        component: () => import('../views/village/VillageApproval.vue'),
        meta: { roles: ['VILLAGE_STAFF'], title: '审批中心' },
      },
      {
        path: 'village/user',
        name: 'VillageUser',
        component: () => import('../views/village/VillageUser.vue'),
        meta: { roles: ['VILLAGE_STAFF'], title: '人员管理' },
      },

      // ===== 服务商端 =====
      {
        path: 'provider/dashboard',
        name: 'ProviderDashboard',
        component: () => import('../views/provider/ProviderDashboard.vue'),
        meta: { roles: ['PROVIDER'], title: '工作台' },
      },
      {
        path: 'provider/order',
        name: 'ProviderOrder',
        component: () => import('../views/provider/ProviderOrder.vue'),
        meta: { roles: ['PROVIDER'], title: '工单管理' },
      },

      // ===== 家属端 =====
      {
        path: 'family/dashboard',
        name: 'FamilyDashboard',
        component: () => import('../views/family/FamilyDashboard.vue'),
        meta: { roles: ['FAMILY_MEMBER'], title: '首页' },
      },
      {
        path: 'family/health',
        name: 'FamilyHealth',
        component: () => import('../views/family/FamilyHealth.vue'),
        meta: { roles: ['FAMILY_MEMBER'], title: '健康监测' },
      },
      {
        path: 'family/alert',
        name: 'FamilyAlert',
        component: () => import('../views/family/FamilyAlert.vue'),
        meta: { roles: ['FAMILY_MEMBER'], title: '预警通知' },
      },
      {
        path: 'family/order',
        name: 'FamilyOrder',
        component: () => import('../views/family/FamilyOrder.vue'),
        meta: { roles: ['FAMILY_MEMBER'], title: '服务预约' },
      },

      // ===== 客服端 =====
      {
        path: 'cs/dashboard',
        name: 'CsDashboard',
        component: () => import('../views/cs/CsDashboard.vue'),
        meta: { roles: ['CS'], title: '客服工作台' },
      },

      // ===== 老人端 =====
      {
        path: 'elderly/home',
        name: 'ElderlyHome',
        component: () => import('../views/elderly/ElderlyHome.vue'),
        meta: { roles: ['ELDERLY'], title: '首页' },
      },
      {
        path: 'elderly/health',
        name: 'ElderlyHealth',
        component: () => import('../views/elderly/ElderlyHealth.vue'),
        meta: { roles: ['ELDERLY'], title: '我的健康' },
      },
      {
        path: 'elderly/order',
        name: 'ElderlyOrder',
        component: () => import('../views/elderly/ElderlyOrder.vue'),
        meta: { roles: ['ELDERLY'], title: '我的服务' },
      },

      // ===== 个人中心（所有角色可访问） =====
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue'),
        meta: { title: '个人中心' },
      },

      // ===== 404 =====
      {
        path: '404',
        name: 'NotFound',
        component: () => import('../views/NotFound.vue'),
        meta: { title: '页面不存在' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  // 白名单路由（无需登录）
  const whiteList = ['/login', '/register']
  // 大屏需要登录认证
  if (to.path === '/big-screen') {
    if (!token || !role) {
      next('/login')
      return
    }
    next()
    return
  }
  if (whiteList.includes(to.path)) {
    // 已登录用户访问登录页，跳转到对应角色首页
    if (token && role) {
      const roleRoutes = {
        GOV_ADMIN: '/gov/dashboard',
        VILLAGE_STAFF: '/village/dashboard',
        PROVIDER: '/provider/dashboard',
        FAMILY_MEMBER: '/family/dashboard',
        ELDERLY: '/elderly/home',
        CS: '/cs/dashboard',
      }
      const target = roleRoutes[role]
      if (target) {
        next(target)
        return
      }
    }
    next()
    return
  }

  // 未登录或无角色 → 清除无效数据并跳转登录页
  if (!token || !role) {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('realName')
    next('/login')
    return
  }

  // 角色权限校验（meta.roles 存在且非空时才校验）
  if (to.meta.roles && to.meta.roles.length > 0 && !to.meta.roles.includes(role)) {
    const roleRoutes = {
      GOV_ADMIN: '/gov/dashboard',
      VILLAGE_STAFF: '/village/dashboard',
      PROVIDER: '/provider/dashboard',
      FAMILY_MEMBER: '/family/dashboard',
      ELDERLY: '/elderly/home',
      CS: '/cs/dashboard',
    }
    const target = roleRoutes[role]
    // 防止重定向到自身导致无限循环
    if (target && target !== to.path) {
      next(target)
    } else {
      next()
    }
    return
  }

  next()
})

export default router

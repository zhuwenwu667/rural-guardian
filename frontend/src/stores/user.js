import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, getUserInfo, register as registerApi } from '../api/auth'
import request from '../api/request'
import { ElMessage } from 'element-plus'
import router from '../router'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  const role = ref(localStorage.getItem('role') || '')
  const realName = ref(localStorage.getItem('realName') || '')
  const userId = computed(() => userInfo.value?.id || null)

  // RBAC 权限相关
  const permissions = ref([])   // 当前用户的权限标识列表
  const menus = ref([])         // 当前用户的菜单树（侧边栏分组格式）

  const isLoggedIn = computed(() => !!token.value)

  const roleMap = {
    GOV_ADMIN: '政府管理员',
    VILLAGE_STAFF: '村级专员',
    PROVIDER: '服务商',
    FAMILY_MEMBER: '家属',
    ELDERLY: '老人',
    CS: '客服',
  }

  const roleName = computed(() => roleMap[role.value] || role.value)

  // 登录
  async function login(loginForm) {
    try {
      const res = await loginApi(loginForm)
      console.log('[DEBUG] login response:', res)
      if (res.code === 200) {
        token.value = res.data.token
        role.value = res.data.user.role
        realName.value = res.data.user.realName
        userInfo.value = res.data.user
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('role', res.data.user.role)
        localStorage.setItem('realName', res.data.user.realName)
        console.log('[DEBUG] token saved:', localStorage.getItem('token'))
        ElMessage.success('登录成功')
        await fetchPermissions()
        return res.data
      }
    } catch (err) {
      console.error('[DEBUG] login error:', err)
      throw err
    }
  }

  // 注册
  async function register(registerForm) {
    try {
      const res = await registerApi(registerForm)
      if (res.code === 200) {
        ElMessage.success('注册成功')
        return res.data
      }
    } catch (err) {
      throw err
    }
  }

  // 获取用户信息
  async function fetchUserInfo() {
    try {
      const res = await getUserInfo()
      if (res.code === 200) {
        userInfo.value = res.data
        role.value = res.data.role
        realName.value = res.data.realName
      }
    } catch (err) {
      console.error('获取用户信息失败', err)
    }
  }

  // 获取当前用户的菜单和权限标识
  async function fetchPermissions() {
    try {
      console.log('[DEBUG] fetchPermissions - token in localStorage:', localStorage.getItem('token'))
      const res = await request.get('/permission/menus')
      console.log('[DEBUG] fetchPermissions response:', res)
      if (res.code === 200) {
        permissions.value = res.data.permissions || []
        menus.value = res.data.sidebarGroups || []
      }
    } catch (err) {
      console.error('获取权限菜单失败', err)
      // 获取失败时使用空数组，不影响基本使用
      permissions.value = []
      menus.value = []
    }
  }

  // 检查是否拥有某权限
  function hasPermission(perm) {
    // GOV_ADMIN 拥有所有权限
    if (role.value === 'GOV_ADMIN') return true
    return permissions.value.includes(perm)
  }

  // 退出登录
  function logout() {
    token.value = ''
    userInfo.value = null
    role.value = ''
    realName.value = ''
    permissions.value = []
    menus.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('realName')
    router.push('/login')
  }

  return {
    token,
    userInfo,
    role,
    realName,
    userId,
    permissions,
    menus,
    isLoggedIn,
    roleName,
    login,
    register,
    fetchUserInfo,
    fetchPermissions,
    hasPermission,
    logout,
  }
})

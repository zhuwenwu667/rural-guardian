import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 不需要自动跳转登录页的接口
const NO_REDIRECT_URLS = ['/auth/login', '/auth/register', '/auth/demo-login']

// 请求拦截器 - 自动附加 token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 判断是否为登录相关接口
function isAuthUrl(url) {
  return NO_REDIRECT_URLS.some(u => url && url.includes(u))
}

// 响应拦截器 - 统一处理错误
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 200) {
      return res
    }
    // 登录接口的 401 直接返回错误信息，不跳转
    if (res.code === 401 && isAuthUrl(response.config.url)) {
      return Promise.reject(new Error(res.message || '账号或密码错误'))
    }
    // 其他接口的 401 只提示错误，不清除认证信息，不跳转
    if (res.code === 401) {
      ElMessage.error('登录已过期，请重新登录')
      return Promise.reject(new Error(res.message || '未授权'))
    }
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      const serverMsg = error.response.data?.message
      const url = error.config?.url || ''
      // 登录接口的 401 不跳转
      if (status === 401 && isAuthUrl(url)) {
        ElMessage.error(serverMsg || '账号或密码错误')
      } else if (status === 401) {
        ElMessage.error('登录已过期，请重新登录')
      } else if (status === 403) {
        ElMessage.error('没有权限访问')
      } else if (status === 404) {
        ElMessage.error('请求的资源不存在')
      } else if (status === 400) {
        ElMessage.error(serverMsg || '请求参数错误')
      } else if (status === 422) {
        ElMessage.error(serverMsg || '数据验证失败')
      } else if (status === 429) {
        ElMessage.error('请求过于频繁，请稍后重试')
      } else if (status >= 500) {
        ElMessage.error(serverMsg || '服务器内部错误')
      } else {
        ElMessage.error(serverMsg || '请求失败')
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后重试')
    } else if (error.message === 'Network Error') {
      ElMessage.error('网络连接失败，请检查网络')
    } else {
      ElMessage.error(error.message || '网络连接失败')
    }
    return Promise.reject(error)
  }
)

export default request

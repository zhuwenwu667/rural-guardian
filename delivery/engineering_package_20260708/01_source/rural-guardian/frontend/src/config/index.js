/**
 * 全局配置文件
 */

// 是否使用 Mock 数据（开发环境可开启，生产环境关闭）
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || false

// API 基础地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// WebSocket 地址
export const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}`

// 分页默认配置
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// 请求超时时间（毫秒）
export const REQUEST_TIMEOUT = 30000

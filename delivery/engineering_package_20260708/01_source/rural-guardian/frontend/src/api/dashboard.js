import request from './request'

// 获取仪表盘统计数据
export function getDashboardStats() {
  return request.get('/dashboard/stats')
}

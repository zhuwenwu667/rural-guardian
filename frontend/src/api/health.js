import request from './request'

// 获取健康记录列表
export function getHealthList(params) {
  return request.get('/health', { params })
}

// 获取健康记录详情
export function getHealthDetail(id) {
  return request.get(`/health/${id}`)
}

// 创建健康记录
export function createHealth(data) {
  return request.post('/health', data)
}

// 更新健康记录
export function updateHealth(id, data) {
  return request.put(`/health/${id}`, data)
}

// 删除健康记录
export function deleteHealth(id) {
  return request.delete(`/health/${id}`)
}

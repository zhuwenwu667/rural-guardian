import request from './request'

// 获取预警列表
export function getAlertList(params) {
  return request.get('/alert', { params })
}

// 获取预警详情
export function getAlertDetail(id) {
  return request.get(`/alert/${id}`)
}

// 创建预警
export function createAlert(data) {
  return request.post('/alert', data)
}

// 更新预警
export function updateAlert(id, data) {
  return request.put(`/alert/${id}`, data)
}

// 删除预警
export function deleteAlert(id) {
  return request.delete(`/alert/${id}`)
}

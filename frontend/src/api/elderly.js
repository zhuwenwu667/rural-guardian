import request from './request'

// 获取老人列表
export function getElderlyList(params) {
  return request.get('/elderly', { params })
}

// 获取老人详情
export function getElderlyDetail(id) {
  return request.get(`/elderly/${id}`)
}

// 创建老人
export function createElderly(data) {
  return request.post('/elderly', data)
}

// 更新老人
export function updateElderly(id, data) {
  return request.put(`/elderly/${id}`, data)
}

// 删除老人
export function deleteElderly(id) {
  return request.delete(`/elderly/${id}`)
}

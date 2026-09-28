import request from './request'

// 获取村庄列表
export function getVillageList(params) {
  return request.get('/village', { params })
}

// 获取村庄详情
export function getVillageDetail(id) {
  return request.get(`/village/${id}`)
}

// 创建村庄
export function createVillage(data) {
  return request.post('/village', data)
}

// 更新村庄
export function updateVillage(id, data) {
  return request.put(`/village/${id}`, data)
}

// 删除村庄
export function deleteVillage(id) {
  return request.delete(`/village/${id}`)
}

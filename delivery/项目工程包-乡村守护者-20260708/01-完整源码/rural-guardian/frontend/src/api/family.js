import request from './request'

// 获取家属列表
export function getFamilyList(params) {
  return request.get('/family', { params })
}

// 获取家属详情
export function getFamilyDetail(id) {
  return request.get(`/family/${id}`)
}

// 创建家属关联
export function createFamily(data) {
  return request.post('/family', data)
}

// 更新家属关联
export function updateFamily(id, data) {
  return request.put(`/family/${id}`, data)
}

// 删除家属关联
export function deleteFamily(id) {
  return request.delete(`/family/${id}`)
}

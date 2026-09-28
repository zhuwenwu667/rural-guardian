import request from './request'

// 获取设备列表
export function getDeviceList(params) {
  return request.get('/device', { params })
}

// 获取设备详情
export function getDeviceDetail(id) {
  return request.get(`/device/${id}`)
}

// 创建设备
export function createDevice(data) {
  return request.post('/device', data)
}

// 更新设备
export function updateDevice(id, data) {
  return request.put(`/device/${id}`, data)
}

// 删除设备
export function deleteDevice(id) {
  return request.delete(`/device/${id}`)
}

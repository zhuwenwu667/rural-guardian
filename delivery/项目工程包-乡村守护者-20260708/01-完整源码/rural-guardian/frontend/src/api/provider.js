import request from './request'

// 获取服务商列表
export function getProviderList(params) {
  return request.get('/provider', { params })
}

// 获取服务商详情
export function getProviderDetail(id) {
  return request.get(`/provider/${id}`)
}

// 创建服务商
export function createProvider(data) {
  return request.post('/provider', data)
}

// 更新服务商
export function updateProvider(id, data) {
  return request.put(`/provider/${id}`, data)
}

// 删除服务商
export function deleteProvider(id) {
  return request.delete(`/provider/${id}`)
}

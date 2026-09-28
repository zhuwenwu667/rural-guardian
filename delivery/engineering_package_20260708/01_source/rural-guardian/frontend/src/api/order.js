import request from './request'

// 获取工单列表
export function getOrderList(params) {
  return request.get('/order', { params })
}

// 获取工单详情
export function getOrderDetail(id) {
  return request.get(`/order/${id}`)
}

// 创建工单
export function createOrder(data) {
  return request.post('/order', data)
}

// 更新工单
export function updateOrder(id, data) {
  return request.put(`/order/${id}`, data)
}

// 删除工单
export function deleteOrder(id) {
  return request.delete(`/order/${id}`)
}

// 派单
export function assignOrder(id, data) {
  return request.post(`/orders/${id}/assign`, data)
}

// 取消工单
export function cancelOrder(id, data) {
  return request.put(`/orders/${id}/cancel`, data)
}

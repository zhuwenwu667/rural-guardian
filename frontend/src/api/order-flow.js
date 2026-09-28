import request from './request'

/**
 * 工单流转API
 * 包含派单、接单、完成、评价等功能
 */

// 获取工单列表
export function getOrderFlowList(params) {
  return request({
    url: '/orders',
    method: 'get',
    params
  })
}

// 获取工单详情（含流转记录）
export function getOrderFlowDetail(id) {
  return request({
    url: `/orders/${id}`,
    method: 'get'
  })
}

// 创建工单
export function createOrder(data) {
  return request({
    url: '/orders',
    method: 'post',
    data
  })
}

// 派单
export function assignOrder(id, data) {
  return request({
    url: `/orders/${id}/assign`,
    method: 'post',
    data
  })
}

// 接单
export function acceptOrder(id) {
  return request({
    url: `/orders/${id}/accept`,
    method: 'put'
  })
}

// 拒单
export function rejectOrder(id, data) {
  return request({
    url: `/orders/${id}/reject`,
    method: 'put',
    data
  })
}

// 开始服务
export function startOrder(id) {
  return request({
    url: `/orders/${id}/start`,
    method: 'put'
  })
}

// 完成服务
export function completeOrder(id, data) {
  return request({
    url: `/orders/${id}/complete`,
    method: 'put',
    data
  })
}

// 取消工单
export function cancelOrder(id, data) {
  return request({
    url: `/orders/${id}/cancel`,
    method: 'post',
    data
  })
}

// 评价工单
export function reviewOrder(id, data) {
  return request({
    url: `/orders/${id}/review`,
    method: 'post',
    data
  })
}

// 获取流转记录
export function getOrderFlowRecords(orderId) {
  return request({
    url: `/orders/${orderId}/flow`,
    method: 'get'
  })
}

// 获取我的待处理工单
export function getMyPendingOrders() {
  return request({
    url: '/orders',
    method: 'get',
    params: { status: ['CREATED', 'ASSIGNED'] }
  })
}

// 获取我的工单历史
export function getMyOrderHistory(params) {
  return request({
    url: '/orders',
    method: 'get',
    params: { ...params, status: 'COMPLETED' }
  })
}

// 获取可派单的服务商列表
export function getAvailableProviders(params) {
  return request({
    url: '/orders/available',
    method: 'get',
    params
  })
}

import request from './request'

/**
 * 告警审批流程API
 * 包含接单、处置、流转记录等功能
 */

// 获取告警列表（带流程状态）
export function getAlertFlowList(params) {
  return request({
    url: '/alerts',
    method: 'get',
    params
  })
}

// 获取告警详情（含流转记录）
export function getAlertFlowDetail(id) {
  return request({
    url: `/alerts/${id}`,
    method: 'get'
  })
}

// 接单
export function acceptAlert(id) {
  return request({
    url: `/alerts/${id}/accept`,
    method: 'post'
  })
}

// 处置完成
export function processAlert(id, data) {
  return request({
    url: `/alerts/${id}/process`,
    method: 'put',
    data
  })
}

// 家属确认
export function confirmAlert(id, data) {
  return request({
    url: `/alerts/${id}/confirm`,
    method: 'put',
    data
  })
}

// 升级告警
export function escalateAlert(id, data) {
  return request({
    url: `/alerts/${id}/escalate`,
    method: 'put',
    data
  })
}

// 关闭告警
export function closeAlert(id, data) {
  return request({
    url: `/alerts/${id}/close`,
    method: 'put',
    data
  })
}

// 获取流转记录
export function getAlertFlowRecords(alertId) {
  return request({
    url: `/alerts/${alertId}/flow-records`,
    method: 'get'
  })
}

// 获取我的待处理告警
export function getMyPendingAlerts() {
  return request({
    url: '/alerts/my-pending',
    method: 'get'
  })
}

// 获取我的处理历史
export function getMyAlertHistory(params) {
  return request({
    url: '/alerts/my-history',
    method: 'get',
    params
  })
}

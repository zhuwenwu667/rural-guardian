import request from './request'

/**
 * 审批中心API
 * 包含家属绑定、设备绑定审批等功能
 */

// ========== 家属绑定审批 ==========

// 提交家属绑定申请
export function submitFamilyBinding(data) {
  return request({
    url: '/approvals/family-binding',
    method: 'post',
    data
  })
}

// 获取家属绑定申请列表
export function getFamilyBindingList(params) {
  return request({
    url: '/approvals/family-binding',
    method: 'get',
    params
  })
}

// 审批家属绑定
export function approveFamilyBinding(id, data) {
  return request({
    url: `/approvals/family-binding/${id}/approve`,
    method: 'put',
    data
  })
}

// 获取我的家属绑定申请
export function getMyFamilyBindings() {
  return request({
    url: '/approvals/family-binding/my-applications',
    method: 'get'
  })
}

// ========== 设备绑定审批 ==========

// 提交设备绑定申请
export function submitDeviceBinding(data) {
  return request({
    url: '/approvals/device-binding',
    method: 'post',
    data
  })
}

// 获取设备绑定申请列表
export function getDeviceBindingList(params) {
  return request({
    url: '/approvals/device-binding',
    method: 'get',
    params
  })
}

// 审批设备绑定
export function approveDeviceBinding(id, data) {
  return request({
    url: `/approvals/device-binding/${id}/approve`,
    method: 'put',
    data
  })
}

// 获取我的设备绑定申请
export function getMyDeviceBindings() {
  return request({
    url: '/approvals/device-binding/my-applications',
    method: 'get'
  })
}

// ========== 待办审批统计 ==========

// 获取待办审批数量
export function getPendingApprovalCount() {
  return request({
    url: '/approvals/pending-count',
    method: 'get'
  })
}

// 获取审批统计
export function getApprovalStats() {
  return request({
    url: '/approvals/stats',
    method: 'get'
  })
}

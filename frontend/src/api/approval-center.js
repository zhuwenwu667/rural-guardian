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
    url: '/approvals',
    method: 'get',
    params: { ...params, type: 'FAMILY_BINDING' }
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
    url: '/approvals/my',
    method: 'get',
    params: { type: 'FAMILY_BINDING' }
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
    url: '/approvals',
    method: 'get',
    params: { ...params, type: 'DEVICE_BINDING' }
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
    url: '/approvals/my',
    method: 'get',
    params: { type: 'DEVICE_BINDING' }
  })
}

// ========== 待办审批统计 ==========

// 获取待办审批数量
export function getPendingApprovalCount() {
  return request({
    url: '/approvals',
    method: 'get',
    params: { status: 'PENDING' }
  }).then(res => res.data.total)
}

// 获取审批统计（按类型和状态分组）
export function getApprovalStats() {
  return request({
    url: '/approvals',
    method: 'get',
    params: { pageSize: 1000 }
  }).then(res => {
    const list = res.data.list || []
    const stats = {
      family_pending: 0, family_approved: 0, family_rejected: 0,
      device_pending: 0, device_approved: 0, device_rejected: 0
    }
    list.forEach(item => {
      const status = item.status || 'UNKNOWN'
      if (item.approval_type === 'FAMILY_BINDING') {
        if (status === 'PENDING') stats.family_pending++
        else if (status === 'APPROVED') stats.family_approved++
        else if (status === 'REJECTED') stats.family_rejected++
      } else if (item.approval_type === 'DEVICE_BINDING') {
        if (status === 'PENDING') stats.device_pending++
        else if (status === 'APPROVED') stats.device_approved++
        else if (status === 'REJECTED') stats.device_rejected++
      }
    })
    return { code: 200, data: stats, total: list.length, message: 'success' }
  })
}

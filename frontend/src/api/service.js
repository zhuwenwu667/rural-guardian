import request from './request'

// 服务总览
export function getServiceOverview() {
  return request.get('/service/overview')
}

// 24h调用量趋势
export function getServiceTrend() {
  return request.get('/service/trend')
}

// 服务调用日志
export function getServiceLogs(params) {
  return request.get('/service/logs', { params })
}

// 测试服务连接
export function testServiceConnection(group) {
  return request.post('/service/test', { group })
}

// AI 对话测试
export function testAIChat(message) {
  return request.post('/service/ai/chat', { message })
}

// 消息模板 CRUD
export function getTemplates(params) {
  return request.get('/service/templates', { params })
}

export function createTemplate(data) {
  return request.post('/service/templates', data)
}

export function updateTemplate(id, data) {
  return request.put(`/service/templates/${id}`, data)
}

export function deleteTemplate(id) {
  return request.delete(`/service/templates/${id}`)
}

// 电子围栏 CRUD
export function getFences(params) {
  return request.get('/service/fences', { params })
}

export function createFence(data) {
  return request.post('/service/fences', data)
}

export function updateFence(id, data) {
  return request.put(`/service/fences/${id}`, data)
}

export function deleteFence(id) {
  return request.delete(`/service/fences/${id}`)
}

// 短信验证码管理
export function getSmsLogs(params) {
  return request.get('/service/sms-logs', { params })
}

export function getSmsStats() {
  return request.get('/service/sms-stats')
}

import request from './request'

// 获取所有设备实时数据
export function getRealtimeData() {
  return request.get('/device-monitor/realtime')
}

// 获取某老人的设备实时数据
export function getRealtimeDataByElderly(elderlyId) {
  return request.get(`/device-monitor/realtime/${elderlyId}`)
}

// 获取告警规则列表
export function getAlertRules() {
  return request.get('/device-monitor/alert-rules')
}

// 更新告警规则
export function updateAlertRule(id, data) {
  return request.put(`/device-monitor/alert-rules/${id}`, data)
}

// 获取设备统计数据
export function getDeviceStatistics() {
  return request.get('/device-monitor/statistics')
}

// 发送设备指令
export function sendDeviceCommand(deviceId, command) {
  return request.post(`/device-monitor/command/${deviceId}`, { command })
}

// 获取设备历史数据
export function getDeviceHistory(deviceId, minutes = 30) {
  return request.get(`/device-monitor/history/${deviceId}`, { params: { minutes } })
}

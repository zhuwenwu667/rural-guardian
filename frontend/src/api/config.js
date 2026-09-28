import request from './request'

// 获取所有配置（按分组）
export function getConfigs() {
  return request.get('/config')
}

// 更新单个配置
export function updateConfig(key, value) {
  return request.put(`/config/${key}`, { value })
}

// 测试API连接（使用新的service路由）
export function testApiConnection(group) {
  return request.post('/service/test', { group })
}

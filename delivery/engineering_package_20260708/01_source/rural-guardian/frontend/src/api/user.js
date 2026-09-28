import request from './request'

export function getUserList(params) {
  return request.get('/auth/users', { params })
}

export function getUserDetail(id) {
  return request.get(`/auth/users/${id}`)
}

export function createUser(data) {
  return request.post('/auth/users', data)
}

export function updateUser(id, data) {
  return request.put(`/auth/users/${id}`, data)
}

export function deleteUser(id) {
  return request.delete(`/auth/users/${id}`)
}

export function resetPassword(id, newPassword) {
  return request.put(`/auth/users/${id}/reset-password`, { newPassword })
}

export function changePassword(data) {
  return request.put('/auth/change-password', data)
}

export function updateProfile(data) {
  return request.put('/auth/profile', data)
}

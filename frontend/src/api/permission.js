import request from './request'

export function getMenuList() {
  return request({
    url: '/permission/menus/all',
    method: 'get'
  })
}

export function createMenu(data) {
  return request({
    url: '/permission/menus',
    method: 'post',
    data
  })
}

export function updateMenu(id, data) {
  return request({
    url: `/permission/menus/${id}`,
    method: 'put',
    data
  })
}

export function deleteMenu(id) {
  return request({
    url: `/permission/menus/${id}`,
    method: 'delete'
  })
}

export function getRoleMenus(role) {
  return request({
    url: `/permission/role-menus/${role}`,
    method: 'get'
  })
}

export function assignRoleMenus(role, menuIds) {
  return request({
    url: `/permission/role-menus/${role}`,
    method: 'put',
    data: { menuIds }
  })
}

const express = require('express');
const db = require('../config/db');
const { auth, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// ==================== 辅助函数 ====================

/**
 * 构建菜单树
 * @param {Array} menus - 扁平菜单列表
 * @param {number} parentId - 父级ID
 * @returns {Array} 树形菜单
 */
function buildMenuTree(menus, parentId = 0) {
  const tree = [];
  const children = menus.filter(m => m.parent_id === parentId);
  children.sort((a, b) => a.sort_order - b.sort_order);
  for (const child of children) {
    const node = {
      id: child.id,
      name: child.name,
      path: child.path,
      component: child.component,
      icon: child.icon,
      permission: child.permission,
      menuType: child.menu_type,
      sortOrder: child.sort_order,
      visible: child.visible,
      children: buildMenuTree(menus, child.id),
    };
    tree.push(node);
  }
  return tree;
}

/**
 * 将菜单树转换为前端侧边栏格式
 * 前端期望: [{ label: '分组名', items: [{ path, title, icon }] }]
 */
function convertToSidebarGroups(menuTree) {
  const groups = [];
  let currentGroup = null;

  for (const node of menuTree) {
    if (node.menuType === 1 && node.children && node.children.length > 0) {
      // 目录节点 -> 作为分组
      currentGroup = {
        label: node.name,
        items: [],
      };
      groups.push(currentGroup);
      // 将子菜单添加到当前分组
      for (const child of node.children) {
        if (child.menuType === 2 && child.visible === 1) {
          currentGroup.items.push({
            path: child.path,
            title: child.name,
            icon: child.icon,
            permission: child.permission,
          });
        }
      }
    } else if (node.menuType === 2 && node.visible === 1) {
      // 顶级菜单节点（无父目录） -> 独立分组
      currentGroup = {
        label: node.name,
        items: [],
      };
      currentGroup.items.push({
        path: node.path,
        title: node.name,
        icon: node.icon,
        permission: node.permission,
      });
      groups.push(currentGroup);
    }
  }
  return groups;
}

// ==================== 路由 ====================

// GET /api/permission/menus — 获取当前用户角色的菜单树（用于动态侧边栏）
router.get('/menus', auth, async (req, res) => {
  try {
    const role = req.user.role;

    // GOV_ADMIN 拥有所有菜单
    let menus;
    if (role === 'GOV_ADMIN') {
      menus = await db.prepare(`
        SELECT * FROM sys_menu WHERE status = 1 ORDER BY sort_order ASC
      `).all();
    } else {
      menus = await db.prepare(`
        SELECT m.* FROM sys_menu m
        INNER JOIN sys_role_menu rm ON m.id = rm.menu_id
        WHERE rm.role = ? AND m.status = 1
        ORDER BY m.sort_order ASC
      `).all(role);
    }

    // 构建树形结构
    const menuTree = buildMenuTree(menus);

    // 提取权限标识列表（按钮级权限）
    const permissions = menus
      .filter(m => m.permission && m.permission.trim() !== '' && m.menu_type === 3)
      .map(m => m.permission);

    // 转换为侧边栏分组格式
    const sidebarGroups = convertToSidebarGroups(menuTree);

    res.json({
      code: 200,
      data: {
        menuTree,
        sidebarGroups,
        permissions,
      },
      message: 'success',
    });
  } catch (err) {
    console.error('获取菜单失败:', err);
    res.json({ code: 500, data: null, message: '获取菜单失败' });
  }
});

// GET /api/permission/menus/all — 获取所有菜单列表（管理员用）
router.get('/menus/all', auth, requireRole('GOV_ADMIN'), async (req, res) => {
  try {
    const menus = await db.prepare(`
      SELECT * FROM sys_menu ORDER BY sort_order ASC
    `).all();

    const menuTree = buildMenuTree(menus);

    res.json({
      code: 200,
      data: {
        list: menus,
        tree: menuTree,
      },
      message: 'success',
    });
  } catch (err) {
    console.error('获取所有菜单失败:', err);
    res.json({ code: 500, data: null, message: '获取菜单列表失败' });
  }
});

// POST /api/permission/menus — 新增菜单
router.post('/menus', auth, requireRole('GOV_ADMIN'), requirePermission('menu:add'), async (req, res) => {
  try {
    const { parentId = 0, name, path, component, icon, permission, menuType = 2, sortOrder = 0, visible = 1, status = 1 } = req.body;

    if (!name) {
      return res.json({ code: 400, data: null, message: '菜单名称不能为空' });
    }

    const result = await db.prepare(`
      INSERT INTO sys_menu (parent_id, name, path, component, icon, permission, menu_type, sort_order, visible, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(parentId, name, path || '', component || '', icon || '', permission || '', menuType, sortOrder, visible, status);

    res.json({
      code: 200,
      data: { id: result.lastInsertRowid },
      message: '菜单创建成功',
    });
  } catch (err) {
    console.error('创建菜单失败:', err);
    res.json({ code: 500, data: null, message: '创建菜单失败' });
  }
});

// PUT /api/permission/menus/:id — 修改菜单
router.put('/menus/:id', auth, requireRole('GOV_ADMIN'), requirePermission('menu:edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { parentId, name, path, component, icon, permission, menuType, sortOrder, visible, status } = req.body;

    const existing = await db.prepare('SELECT id FROM sys_menu WHERE id = ?').get(id);
    if (!existing) {
      return res.json({ code: 404, data: null, message: '菜单不存在' });
    }

    const updates = [];
    const params = [];

    if (parentId !== undefined) { updates.push('parent_id = ?'); params.push(parentId); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (path !== undefined) { updates.push('path = ?'); params.push(path); }
    if (component !== undefined) { updates.push('component = ?'); params.push(component); }
    if (icon !== undefined) { updates.push('icon = ?'); params.push(icon); }
    if (permission !== undefined) { updates.push('permission = ?'); params.push(permission); }
    if (menuType !== undefined) { updates.push('menu_type = ?'); params.push(menuType); }
    if (sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(sortOrder); }
    if (visible !== undefined) { updates.push('visible = ?'); params.push(visible); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return res.json({ code: 400, data: null, message: '没有需要更新的字段' });
    }

    params.push(id);
  await db.prepare(`UPDATE sys_menu SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    res.json({ code: 200, data: null, message: '菜单更新成功' });
  } catch (err) {
    console.error('更新菜单失败:', err);
    res.json({ code: 500, data: null, message: '更新菜单失败' });
  }
});

// DELETE /api/permission/menus/:id — 删除菜单
router.delete('/menus/:id', auth, requireRole('GOV_ADMIN'), requirePermission('menu:remove'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.prepare('SELECT id FROM sys_menu WHERE id = ?').get(id);
    if (!existing) {
      return res.json({ code: 404, data: null, message: '菜单不存在' });
    }

    // 检查是否有子菜单
    const childCount = await db.prepare('SELECT COUNT(*) as cnt FROM sys_menu WHERE parent_id = ?').get(id).cnt;
    if (childCount > 0) {
      return res.json({ code: 400, data: null, message: '存在子菜单，请先删除子菜单' });
    }

    // 删除菜单
  await db.prepare('DELETE FROM sys_menu WHERE id = ?').run(id);
    // 删除角色菜单关联
  await db.prepare('DELETE FROM sys_role_menu WHERE menu_id = ?').run(id);

    res.json({ code: 200, data: null, message: '菜单删除成功' });
  } catch (err) {
    console.error('删除菜单失败:', err);
    res.json({ code: 500, data: null, message: '删除菜单失败' });
  }
});

// GET /api/permission/role-menus/:role — 获取角色的菜单权限
router.get('/role-menus/:role', auth, requireRole('GOV_ADMIN'), async (req, res) => {
  try {
    const { role } = req.params;

    const roleMenus = await db.prepare(`
      SELECT menu_id FROM sys_role_menu WHERE role = ?
    `).all(role);

    const menuIds = roleMenus.map(rm => rm.menu_id);

    // 获取菜单详情
    let menus = [];
    if (menuIds.length > 0) {
      const placeholders = menuIds.map(() => '?').join(',');
      menus = db.prepare(`
        SELECT * FROM sys_menu WHERE id IN (${placeholders}) ORDER BY sort_order ASC
      `).all(...menuIds);
    }

    res.json({
      code: 200,
      data: {
        role,
        menuIds,
        menus,
      },
      message: 'success',
    });
  } catch (err) {
    console.error('获取角色菜单权限失败:', err);
    res.json({ code: 500, data: null, message: '获取角色菜单权限失败' });
  }
});

// PUT /api/permission/role-menus/:role — 分配角色菜单权限
router.put('/role-menus/:role', auth, requireRole('GOV_ADMIN'), async (req, res) => {
  try {
    const { role } = req.params;
    const { menuIds } = req.body;

    if (!Array.isArray(menuIds)) {
      return res.json({ code: 400, data: null, message: 'menuIds 必须为数组' });
    }

    // 验证角色有效性
    const validRoles = ['GOV_ADMIN', 'VILLAGE_STAFF', 'PROVIDER', 'FAMILY_MEMBER', 'ELDERLY'];
    if (!validRoles.includes(role)) {
      return res.json({ code: 400, data: null, message: '无效的角色标识' });
    }

    // 先删除该角色的所有菜单关联
  await db.prepare('DELETE FROM sys_role_menu WHERE role = ?').run(role);

    // 批量插入新的关联
    if (menuIds.length > 0) {
      for (const menuId of menuIds) {
        await db.prepare('INSERT IGNORE INTO sys_role_menu (role, menu_id) VALUES (?, ?)').run(role, menuId);
      }
    }

    res.json({ code: 200, data: null, message: '角色菜单权限分配成功' });
  } catch (err) {
    console.error('分配角色菜单权限失败:', err);
    res.json({ code: 500, data: null, message: '分配角色菜单权限失败' });
  }
});

module.exports = router;

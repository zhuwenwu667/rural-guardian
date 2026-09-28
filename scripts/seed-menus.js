const db = require('../backend/config/db');

(async () => {
  try {
    await db.prepare('DELETE FROM sys_role_menu').run();
    await db.prepare('DELETE FROM sys_menu').run();

    // 1. 先创建目录节点，拿到 id
    const dirs = {};
    const dirDefs = {
      workbench: ['工作台', 'DataAnalysis', 1],
      elder_service: ['养老服务', 'User', 2],
      region: ['区域管理', 'OfficeBuilding', 3],
      system: ['系统管理', 'Setting', 4],
      data_center: ['数据中心', 'TrendCharts', 5],
      settings: ['系统设置', 'Connection', 6],
    };
    for (const [key, [name, icon, sort]] of Object.entries(dirDefs)) {
      const r = await db.prepare(
        'INSERT INTO sys_menu (name, parent_id, path, icon, menu_type, sort_order, permission, status) VALUES (?,0,\'\',?,1,?,\'\',1)'
      ).run(name, icon, sort);
      dirs[key] = r.lastInsertRowid;
    }

    // 2. 创建菜单项，挂到对应目录下
    const items = {};
    const itemDefs = [
      ['m_dashboard', '数据总览', '/gov/dashboard', 'DataAnalysis', 2, 1, '', 'workbench'],
      ['m_elderly', '老人管理', '/gov/elderly', 'User', 2, 10, 'elderly:list', 'elder_service'],
      ['m_alert', '预警管理', '/gov/alert', 'Bell', 2, 20, 'alert:list', 'elder_service'],
      ['m_order', '工单管理', '/gov/order', 'Document', 2, 30, 'order:list', 'elder_service'],
      ['m_approval', '审批管理', '/gov/approval', 'CircleCheck', 2, 40, 'approval:list', 'elder_service'],
      ['m_village', '村庄管理', '/gov/village', 'OfficeBuilding', 2, 50, 'village:list', 'region'],
      ['m_provider', '服务商管理', '/gov/provider', 'Shop', 2, 60, 'provider:list', 'region'],
      ['m_user', '用户管理', '/gov/user', 'UserFilled', 2, 70, 'user:list', 'system'],
      ['m_device', '设备管理', '/gov/device', 'Monitor', 2, 80, 'device:list', 'system'],
      ['m_device_monitor', '设备监控', '/gov/device-monitor', 'Cpu', 2, 90, 'device:monitor', 'system'],
      ['m_stats', '数据统计', '/gov/stats', 'TrendCharts', 2, 100, 'stats:view', 'data_center'],
      ['m_big_screen', '数据大屏', '/big-screen', 'Monitor', 2, 105, '', 'data_center'],
      ['m_service_center', '服务集成中心', '/gov/service-center', 'Connection', 2, 110, 'service:center', 'settings'],
      ['m_permission', '菜单管理', '/gov/permission', 'Menu', 2, 120, 'menu:list', 'settings'],
    ];
    for (const [key, name, path, icon, mt, sort, perm, dirKey] of itemDefs) {
      const r = await db.prepare(
        'INSERT INTO sys_menu (name, parent_id, path, icon, menu_type, sort_order, permission, status) VALUES (?,?,?,?,?,?,?,1)'
      ).run(name, dirs[dirKey], path, icon, mt, sort, perm);
      items[key] = r.lastInsertRowid;
    }

    // 个人中心单独放（无父目录）
    const profileItem = await db.prepare(
      'INSERT INTO sys_menu (name, parent_id, path, icon, menu_type, sort_order, permission, status) VALUES (?,0,\'/profile\',\'Setting\',2,999,\'\',1)'
    ).run('个人中心');
    const m_profile = profileItem.lastInsertRowid;

    // 3. 角色菜单分配
    const roleItems = {
      GOV_ADMIN: Object.values(items).concat(m_profile),
      VILLAGE_STAFF: [
        items.m_dashboard, items.m_elderly, items.m_alert, items.m_order, items.m_approval, items.m_user, m_profile,
      ].filter(Boolean),
      PROVIDER: [items.m_dashboard, items.m_order, m_profile].filter(Boolean),
      FAMILY_MEMBER: [items.m_dashboard, items.m_alert, items.m_order, m_profile].filter(Boolean),
      ELDERLY: [items.m_dashboard, m_profile].filter(Boolean),
      CS: [items.m_dashboard, m_profile].filter(Boolean),
    };

    let roleCount = 0;
    for (const [role, menuIds] of Object.entries(roleItems)) {
      for (const mid of menuIds) {
        await db.prepare('INSERT INTO sys_role_menu (role, menu_id) VALUES (?, ?)').run(role, mid);
        roleCount++;
      }
    }

    console.log('菜单种子数据创建完成');
    console.log('  sys_menu:', (await db.prepare('SELECT COUNT(*) as cnt FROM sys_menu').get()).cnt, '条');
    console.log('  sys_role_menu:', roleCount, '条 (覆盖', Object.keys(roleItems).length, '个角色)');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

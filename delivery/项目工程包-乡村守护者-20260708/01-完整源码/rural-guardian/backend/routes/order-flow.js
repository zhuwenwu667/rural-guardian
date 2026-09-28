const express = require('express');
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ==================== 工单流转核心API ====================

// GET /api/orders - 工单列表查询
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, type, priority, keyword } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (status) { where += ' AND so.status = ?'; params.push(status); }
    if (type) { where += ' AND so.type = ?'; params.push(type); }
    if (priority) { where += ' AND so.priority = ?'; params.push(priority); }
    if (keyword) { where += ' AND (ei.name LIKE ? OR p.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }

    // 角色数据范围
    if (req.user.role === 'VILLAGE_STAFF') {
      where += ' AND ei.village_id = ?';
      params.push(req.user.village_id);
    } else if (req.user.role === 'PROVIDER') {
      where += ' AND so.provider_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'FAMILY_MEMBER') {
      where += ' AND so.created_by = ?';
      params.push(req.user.id);
    }

    const countSql = `SELECT COUNT(*) as total FROM service_order so LEFT JOIN elderly_info ei ON so.elderly_id = ei.id LEFT JOIN provider_info p ON so.provider_id = p.user_id ${where}`;
    const total = await db.prepare(countSql).get(...params).total;

    const offset = (page - 1) * pageSize;
    const dataSql = `SELECT so.*, ei.name as elderly_name, ei.phone as elderly_phone, ei.address as elderly_address,
      p.name as provider_name, u.real_name as staff_name, fu.real_name as family_name
      FROM service_order so
      LEFT JOIN elderly_info ei ON so.elderly_id = ei.id
      LEFT JOIN provider_info p ON so.provider_id = p.user_id
      LEFT JOIN sys_user u ON so.assigned_by = u.id
      LEFT JOIN sys_user fu ON so.created_by = fu.id
      ${where} ORDER BY so.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), offset);
    const list = await db.prepare(dataSql).all(...params);

    const listWithFlow = list.map(async order => {
      const flowRecords = await db.prepare(
        `SELECT ofr.*, u.real_name as operator_name FROM order_flow ofr LEFT JOIN sys_user u ON ofr.operator_id = u.id WHERE ofr.order_id = ? ORDER BY ofr.created_at ASC`
      ).all(order.id);
      const review = await db.prepare(
        `SELECT * FROM order_review WHERE order_id = ?`
      ).get(order.id);
      return { ...order, flowRecords, review };
    });

    res.json({ code: 200, data: { list: listWithFlow, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    console.error('获取工单列表失败:', err);
    res.json({ code: 500, data: null, message: '获取工单列表失败' });
  }
});

// GET /api/orders/:id - 工单详情
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await db.prepare(
      `SELECT so.*, ei.name as elderly_name, ei.phone as elderly_phone, ei.address as elderly_address,
        p.company_name as provider_name, u.real_name as staff_name, fu.real_name as family_name
        FROM service_order so
        LEFT JOIN elderly_info ei ON so.elderly_id = ei.id
        LEFT JOIN provider_info p ON so.provider_id = p.user_id
        LEFT JOIN sys_user u ON so.assigned_by = u.id
        LEFT JOIN sys_user fu ON so.created_by = fu.id
        WHERE so.id = ?`
    ).get(req.params.id);

    if (!order) return res.json({ code: 404, data: null, message: '工单不存在' });

    const flowRecords = await db.prepare(
      `SELECT ofr.*, u.real_name as operator_name FROM order_flow ofr LEFT JOIN sys_user u ON ofr.operator_id = u.id WHERE ofr.order_id = ? ORDER BY ofr.created_at ASC`
    ).all(order.id);
    const review = await db.prepare(`SELECT * FROM order_review WHERE order_id = ?`).get(order.id);

    res.json({ code: 200, data: { ...order, flowRecords, review }, message: 'success' });
  } catch (err) {
    console.error('获取工单详情失败:', err);
    res.json({ code: 500, data: null, message: '获取工单详情失败' });
  }
});

// POST /api/orders - 创建工单
router.post('/', auth, requireRole('VILLAGE_STAFF', 'FAMILY_MEMBER', 'GOV_ADMIN'), async (req, res) => {
  try {
    const { elderlyId, type, priority, appointmentTime, description } = req.body;
    if (!elderlyId || !type || !description) {
      return res.json({ code: 400, data: null, message: '缺少必填参数' });
    }
    const result = await db.prepare(
      `INSERT INTO service_order (elderly_id, type, priority, appointment_time, description, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 'CREATED', ?, datetime('now', 'localtime'))`
    ).run(elderlyId, type, priority || 'NORMAL', appointmentTime || null, description, req.user.id);

    // 记录流转
    db.prepare(
      `INSERT INTO order_flow (order_id, action, operator_id, remark, created_at) VALUES (?, 'CREATE', ?, ?, datetime('now', 'localtime'))`
    ).run(result.lastInsertRowid, req.user.id, '创建工单');

    res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '工单创建成功' });
  } catch (err) {
    console.error('创建工单失败:', err);
    res.json({ code: 500, data: null, message: '创建工单失败' });
  }
});

// POST /api/orders/:id/assign - 派单（村级专员/家属）
router.post('/:id/assign', auth, requireRole('VILLAGE_STAFF', 'FAMILY_MEMBER', 'GOV_ADMIN'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const { providerId, dispatchType = 'MANUAL' } = req.body;
    const operatorId = req.user.id;
    const operatorRole = req.user.role;

    const order = await db.prepare('SELECT * FROM service_order WHERE id = ?').get(orderId);
    if (!order) {
      return res.json({ code: 404, data: null, message: '工单不存在' });
    }
    if (order.status !== 'CREATED') {
      return res.json({ code: 400, data: null, message: '工单已派单或已完成' });
    }

    // 权限检查
    if (operatorRole === 'VILLAGE_STAFF') {
      const elderly = await db.prepare('SELECT village_id FROM elderly_info WHERE id = ?').get(order.elderly_id);
      const staff = await db.prepare('SELECT village_id FROM sys_user WHERE id = ?').get(operatorId);
      if (elderly.village_id !== staff.village_id) {
        return res.json({ code: 403, data: null, message: '无权处理其他村庄的工单' });
      }
    } else if (operatorRole === 'FAMILY_MEMBER') {
      if (order.family_id !== operatorId) {
        return res.json({ code: 403, data: null, message: '只能派发自己创建的工单' });
      }
    }

    // 检查服务商是否存在且有效
    if (providerId) {
      const provider = await db.prepare('SELECT * FROM provider_info WHERE id = ? AND status = "ACTIVE"').get(providerId);
      if (!provider) {
        return res.json({ code: 400, data: null, message: '服务商不存在或不可用' });
      }
    }

    db.prepare(`
      UPDATE service_order 
      SET status = 'ASSIGNED', provider_id = ?, village_staff_id = ?, 
          assigned_at = datetime('now', 'localtime'), dispatch_type = ?
      WHERE id = ?
    `).run(providerId || null, operatorRole === 'VILLAGE_STAFF' ? operatorId : null, dispatchType, orderId);

    // 记录流转
    db.prepare(`
      INSERT INTO order_flow (order_id, action, operator_id, operator_role, from_status, to_status, remark)
      VALUES (?, 'ASSIGNED', ?, ?, 'CREATED', 'ASSIGNED', ?)
    `).run(orderId, operatorId, operatorRole, `派单给服务商${providerId || '待抢单'}`);

    res.json({ code: 200, data: { id: orderId, status: 'ASSIGNED' }, message: '派单成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/orders/:id/accept - 服务商接单
router.put('/:id/accept', auth, requireRole('PROVIDER'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const providerId = req.user.id; // 假设服务商也是sys_user

    const order = await db.prepare('SELECT * FROM service_order WHERE id = ?').get(orderId);
    if (!order) {
      return res.json({ code: 404, data: null, message: '工单不存在' });
    }
    if (order.status !== 'ASSIGNED' && order.status !== 'CREATED') {
      return res.json({ code: 400, data: null, message: '工单状态不允许接单' });
    }

    // 检查是否指派给该服务商或是抢单模式
    if (order.provider_id && order.provider_id !== providerId) {
      return res.json({ code: 403, data: null, message: '工单未指派给您' });
    }

    db.prepare(`
      UPDATE service_order 
      SET status = 'IN_PROGRESS', provider_id = ?
      WHERE id = ?
    `).run(providerId, orderId);

    db.prepare(`
      INSERT INTO order_flow (order_id, action, operator_id, operator_role, from_status, to_status, remark)
      VALUES (?, 'ACCEPT', ?, 'PROVIDER', ?, 'IN_PROGRESS', '服务商接单')
    `).run(orderId, providerId, order.status);

    res.json({ code: 200, data: { id: orderId, status: 'IN_PROGRESS' }, message: '接单成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/orders/:id/reject - 服务商拒单
router.put('/:id/reject', auth, requireRole('PROVIDER'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason } = req.body;
    const providerId = req.user.id;

    const order = await db.prepare('SELECT * FROM service_order WHERE id = ?').get(orderId);
    if (!order) {
      return res.json({ code: 404, data: null, message: '工单不存在' });
    }
    if (order.status !== 'ASSIGNED') {
      return res.json({ code: 400, data: null, message: '工单状态不允许拒单' });
    }

    // 重置为待派单状态
    db.prepare(`
      UPDATE service_order 
      SET status = 'CREATED', provider_id = NULL
      WHERE id = ?
    `).run(orderId);

    db.prepare(`
      INSERT INTO order_flow (order_id, action, operator_id, operator_role, from_status, to_status, remark)
      VALUES (?, 'REJECT', ?, 'PROVIDER', 'ASSIGNED', 'CREATED', ?)
    `).run(orderId, providerId, reason || '服务商拒单');

    res.json({ code: 200, data: { id: orderId, status: 'CREATED' }, message: '已拒单，工单重新进入待派单池' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/orders/:id/start - 开始服务
router.put('/:id/start', auth, requireRole('PROVIDER'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const providerId = req.user.id;

    const order = await db.prepare('SELECT * FROM service_order WHERE id = ?').get(orderId);
    if (!order) {
      return res.json({ code: 404, data: null, message: '工单不存在' });
    }
    if (order.status !== 'IN_PROGRESS') {
      return res.json({ code: 400, data: null, message: '工单状态不正确' });
    }
    if (order.provider_id !== providerId) {
      return res.json({ code: 403, data: null, message: '无权操作此工单' });
    }

    db.prepare(`
      UPDATE service_order 
      SET started_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(orderId);

    db.prepare(`
      INSERT INTO order_flow (order_id, action, operator_id, operator_role, from_status, to_status, remark)
      VALUES (?, 'START', ?, 'PROVIDER', 'IN_PROGRESS', 'IN_PROGRESS', '开始服务')
    `).run(orderId, providerId);

    res.json({ code: 200, data: { id: orderId }, message: '服务已开始' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/orders/:id/complete - 完成服务
router.put('/:id/complete', auth, requireRole('PROVIDER'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const { result, attachment } = req.body;
    const providerId = req.user.id;

    const order = await db.prepare('SELECT * FROM service_order WHERE id = ?').get(orderId);
    if (!order) {
      return res.json({ code: 404, data: null, message: '工单不存在' });
    }
    if (order.status !== 'IN_PROGRESS') {
      return res.json({ code: 400, data: null, message: '工单不在进行中状态' });
    }
    if (order.provider_id !== providerId) {
      return res.json({ code: 403, data: null, message: '无权操作此工单' });
    }

    db.prepare(`
      UPDATE service_order 
      SET status = 'PENDING_REVIEW', completed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(orderId);

    db.prepare(`
      INSERT INTO order_flow (order_id, action, operator_id, operator_role, from_status, to_status, remark, attachment)
      VALUES (?, 'COMPLETE', ?, 'PROVIDER', 'IN_PROGRESS', 'PENDING_REVIEW', ?, ?)
    `).run(orderId, providerId, result || '服务完成', attachment || null);

    res.json({ code: 200, data: { id: orderId, status: 'PENDING_REVIEW' }, message: '服务完成，等待评价' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// POST /api/orders/:id/review - 评价工单（家属）
router.post('/:id/review', auth, requireRole('FAMILY_MEMBER'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const { rating, serviceAttitude, serviceQuality, timeliness, content, images, isAnonymous } = req.body;
    const reviewerId = req.user.id;

    const order = await db.prepare('SELECT * FROM service_order WHERE id = ?').get(orderId);
    if (!order) {
      return res.json({ code: 404, data: null, message: '工单不存在' });
    }
    if (order.status !== 'PENDING_REVIEW') {
      return res.json({ code: 400, data: null, message: '工单不处于待评价状态' });
    }
    if (order.family_id !== reviewerId) {
      return res.json({ code: 403, data: null, message: '只有工单发起人可以评价' });
    }

    // 创建评价
    const result = await db.prepare(`
      INSERT INTO order_review (order_id, reviewer_id, rating, service_attitude, service_quality, timeliness, content, images, is_anonymous)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orderId, reviewerId, rating, serviceAttitude, serviceQuality, timeliness, content || null, images || null, isAnonymous ? 1 : 0);

    const reviewId = result.lastInsertRowid;

    // 更新工单状态
    db.prepare(`
      UPDATE service_order 
      SET status = 'COMPLETED', rating = ?, review_id = ?
      WHERE id = ?
    `).run(rating, reviewId, orderId);

    // 更新服务商评分
    if (order.provider_id) {
      const avgRating = await db.prepare(`
        SELECT ROUND(AVG(rating), 1) as avg_rating FROM service_order 
        WHERE provider_id = ? AND status = 'COMPLETED' AND rating IS NOT NULL
      `).get(order.provider_id);
  await db.prepare('UPDATE provider_info SET rating = ? WHERE id = ?').run(avgRating.avg_rating || 0, order.provider_id);
    }

    db.prepare(`
      INSERT INTO order_flow (order_id, action, operator_id, operator_role, from_status, to_status, remark)
      VALUES (?, 'REVIEW', ?, 'FAMILY_MEMBER', 'PENDING_REVIEW', 'COMPLETED', ?)
    `).run(orderId, reviewerId, `评分：${rating}星`);

    res.json({ code: 200, data: { id: orderId, reviewId, status: 'COMPLETED' }, message: '评价成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/orders/:id/reply - 服务商回复评价
router.put('/:id/reply', auth, requireRole('PROVIDER'), async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reply } = req.body;
    const providerId = req.user.id;

    const order = await db.prepare('SELECT * FROM service_order WHERE id = ?').get(orderId);
    if (!order) {
      return res.json({ code: 404, data: null, message: '工单不存在' });
    }
    if (order.provider_id !== providerId) {
      return res.json({ code: 403, data: null, message: '无权操作此工单' });
    }

    db.prepare(`
      UPDATE order_review 
      SET reply = ?, reply_at = datetime('now', 'localtime')
      WHERE order_id = ?
    `).run(reply, orderId);

    res.json({ code: 200, data: null, message: '回复成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// GET /api/orders/:id/flow - 获取工单流转记录
router.get('/:id/flow', auth, async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const flows = await db.prepare(`
      SELECT of.*, u.real_name as operator_name
      FROM order_flow of
      LEFT JOIN sys_user u ON of.operator_id = u.id
      WHERE of.order_id = ?
      ORDER BY of.created_at ASC
    `).all(orderId);

    res.json({ code: 200, data: flows, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// GET /api/orders/available - 可接工单池（服务商）
router.get('/available', auth, requireRole('PROVIDER'), async (req, res) => {
  try {
    const providerId = req.user.id;
    const { type, villageId } = req.query;

    // 获取服务商服务类型和服务区域
    const provider = await db.prepare('SELECT service_types, service_area FROM provider_info WHERE id = ?').get(providerId);
    if (!provider) {
      return res.json({ code: 404, data: null, message: '服务商信息不存在' });
    }

    let where = "WHERE so.status = 'CREATED' OR (so.status = 'ASSIGNED' AND so.provider_id = ?)";
    const params = [providerId];

    if (type) {
      where += " AND so.type = ?";
      params.push(type);
    }
    if (villageId) {
      where += " AND ei.village_id = ?";
      params.push(villageId);
    }

    const orders = await db.prepare(`
      SELECT so.*, ei.name as elderly_name, ei.address, ei.phone as elderly_phone,
             v.name as village_name
      FROM service_order so
      JOIN elderly_info ei ON so.elderly_id = ei.id
      LEFT JOIN village_info v ON ei.village_id = v.id
      ${where}
      ORDER BY so.created_at DESC
    `).all(...params);

    res.json({ code: 200, data: orders, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

module.exports = router;

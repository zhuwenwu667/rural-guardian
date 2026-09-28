const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/order - 服务工单列表（分页）
router.get('/', auth, async (req, res) => {
  const { page = 1, pageSize = 20, type, status, elderlyId, providerId } = req.query;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params = [];

  if (type) {
    where += ' AND o.type = ?';
    params.push(type);
  }
  if (status) {
    where += ' AND o.status = ?';
    params.push(status);
  }
  if (elderlyId) {
    where += ' AND o.elderly_id = ?';
    params.push(elderlyId);
  }
  if (providerId) {
    where += ' AND o.provider_id = ?';
    params.push(providerId);
  }

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM service_order o ${where}`).get(...params).cnt;
  const list = await db.prepare(`
    SELECT o.*, e.name as elderly_name, e.phone as elderly_phone,
           p.name as provider_name,
           vs.real_name as staff_name,
           fm.real_name as family_name
    FROM service_order o
    LEFT JOIN elderly_info e ON o.elderly_id = e.id
    LEFT JOIN provider_info p ON o.provider_id = p.id
    LEFT JOIN sys_user vs ON o.village_staff_id = vs.id
    LEFT JOIN sys_user fm ON o.family_id = fm.id
    ${where}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  res.json({
    code: 200,
    data: { list, total, page: Number(page), pageSize: Number(pageSize) },
    message: 'success',
  });
});

// GET /api/order/:id - 工单详情
router.get('/:id', auth, async (req, res) => {
  const order = await db.prepare(`
    SELECT o.*, e.name as elderly_name, e.phone as elderly_phone, e.address as elderly_address,
           p.name as provider_name, p.contact_phone as provider_phone,
           vs.real_name as staff_name,
           fm.real_name as family_name
    FROM service_order o
    LEFT JOIN elderly_info e ON o.elderly_id = e.id
    LEFT JOIN provider_info p ON o.provider_id = p.id
    LEFT JOIN sys_user vs ON o.village_staff_id = vs.id
    LEFT JOIN sys_user fm ON o.family_id = fm.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) {
    return res.json({ code: 404, data: null, message: '工单不存在' });
  }

  res.json({ code: 200, data: order, message: 'success' });
});

// POST /api/order - 创建工单
router.post('/', auth, async (req, res) => {
  const { elderlyId, type, description, providerId, villageStaffId, familyId } = req.body;
  if (!elderlyId || !type) {
    return res.json({ code: 400, data: null, message: '老人ID和工单类型不能为空' });
  }

  const validTypes = ['MEDICAL', 'LIFE_CARE', 'EMERGENCY', 'COMPANION', 'OTHER'];
  if (!validTypes.includes(type)) {
    return res.json({ code: 400, data: null, message: '无效的工单类型' });
  }

  const result = await db.prepare(`
    INSERT INTO service_order (elderly_id, type, status, description, provider_id, village_staff_id, family_id)
    VALUES (?, ?, 'CREATED', ?, ?, ?, ?)
  `).run(elderlyId, type, description || null, providerId || null, villageStaffId || null, familyId || null);

  res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '创建成功' });
});

// PUT /api/order/:id - 更新工单
router.put('/:id', auth, async (req, res) => {
  const { type, status, description, providerId, villageStaffId, familyId, rating } = req.body;

  const existing = await db.prepare('SELECT id, status FROM service_order WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '工单不存在' });
  }

  const completedAt = status === 'COMPLETED' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null;

  db.prepare(`
    UPDATE service_order SET
      type = COALESCE(?, type),
      status = COALESCE(?, status),
      description = COALESCE(?, description),
      provider_id = COALESCE(?, provider_id),
      village_staff_id = COALESCE(?, village_staff_id),
      family_id = COALESCE(?, family_id),
      rating = COALESCE(?, rating),
      completed_at = COALESCE(?, completed_at)
    WHERE id = ?
  `).run(type, status, description, providerId, villageStaffId, familyId, rating, completedAt, req.params.id);

  res.json({ code: 200, data: null, message: '更新成功' });
});

// DELETE /api/order/:id - 删除工单
router.delete('/:id', auth, async (req, res) => {
  const existing = await db.prepare('SELECT id FROM service_order WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '工单不存在' });
  }
  await db.prepare('DELETE FROM service_order WHERE id = ?').run(req.params.id);
  res.json({ code: 200, data: null, message: '删除成功' });
});

module.exports = router;

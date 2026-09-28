const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/alert - 预警列表（分页）
router.get('/', auth, async (req, res) => {
  const { page = 1, pageSize = 20, type, level, status, elderlyId } = req.query;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params = [];

  if (type) {
    where += ' AND a.type = ?';
    params.push(type);
  }
  if (level) {
    where += ' AND a.level = ?';
    params.push(level);
  }
  if (status) {
    where += ' AND a.status = ?';
    params.push(status);
  }
  if (elderlyId) {
    where += ' AND a.elderly_id = ?';
    params.push(elderlyId);
  }

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM alert_record a ${where}`).get(...params).cnt;
  const list = await db.prepare(`
    SELECT a.*, e.name as elderly_name, e.phone as elderly_phone, e.address as elderly_address,
           u.real_name as handler_name
    FROM alert_record a
    LEFT JOIN elderly_info e ON a.elderly_id = e.id
    LEFT JOIN sys_user u ON a.handler_id = u.id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  res.json({
    code: 200,
    data: { list, total, page: Number(page), pageSize: Number(pageSize) },
    message: 'success',
  });
});

// GET /api/alert/:id - 预警详情
router.get('/:id', auth, async (req, res) => {
  const alert = await db.prepare(`
    SELECT a.*, e.name as elderly_name, e.phone as elderly_phone, e.address as elderly_address,
           u.real_name as handler_name
    FROM alert_record a
    LEFT JOIN elderly_info e ON a.elderly_id = e.id
    LEFT JOIN sys_user u ON a.handler_id = u.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!alert) {
    return res.json({ code: 404, data: null, message: '预警记录不存在' });
  }

  res.json({ code: 200, data: alert, message: 'success' });
});

// POST /api/alert - 创建预警
router.post('/', auth, async (req, res) => {
  const { elderlyId, type, level, description } = req.body;
  if (!elderlyId || !type) {
    return res.json({ code: 400, data: null, message: '老人ID和预警类型不能为空' });
  }

  const validTypes = ['FALL', 'HEALTH_ABNORMAL', 'SOS', 'GEO_FENCE', 'DEVICE_OFFLINE'];
  const validLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  if (!validTypes.includes(type)) {
    return res.json({ code: 400, data: null, message: '无效的预警类型' });
  }
  if (level && !validLevels.includes(level)) {
    return res.json({ code: 400, data: null, message: '无效的预警级别' });
  }

  const result = await db.prepare(`
    INSERT INTO alert_record (elderly_id, type, level, status, description)
    VALUES (?, ?, ?, 'PENDING', ?)
  `).run(elderlyId, type, level || 'MEDIUM', description || null);

  res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '创建成功' });
});

// PUT /api/alert/:id - 更新预警
router.put('/:id', auth, async (req, res) => {
  const { status, description, handlerId } = req.body;

  const existing = await db.prepare('SELECT id FROM alert_record WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '预警记录不存在' });
  }

  const handledAt = status === 'RESOLVED' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null;

  db.prepare(`
    UPDATE alert_record SET
      status = COALESCE(?, status),
      description = COALESCE(?, description),
      handler_id = COALESCE(?, handler_id),
      handled_at = COALESCE(?, handled_at)
    WHERE id = ?
  `).run(status, description, handlerId, handledAt, req.params.id);

  res.json({ code: 200, data: null, message: '更新成功' });
});

// DELETE /api/alert/:id - 删除预警
router.delete('/:id', auth, async (req, res) => {
  const existing = await db.prepare('SELECT id FROM alert_record WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '预警记录不存在' });
  }
  await db.prepare('DELETE FROM alert_record WHERE id = ?').run(req.params.id);
  res.json({ code: 200, data: null, message: '删除成功' });
});

module.exports = router;

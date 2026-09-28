const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/family - 家属列表（分页）
router.get('/', auth, async (req, res) => {
  const { page = 1, pageSize = 20, elderlyId, userId } = req.query;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params = [];

  if (elderlyId) {
    where += ' AND f.elderly_id = ?';
    params.push(elderlyId);
  }
  if (userId) {
    where += ' AND f.user_id = ?';
    params.push(userId);
  }

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM family_member f ${where}`).get(...params).cnt;
  const list = await db.prepare(`
    SELECT f.*, u.real_name as user_name, u.phone as user_phone, u.username,
           e.name as elderly_name, e.phone as elderly_phone, e.address as elderly_address
    FROM family_member f
    LEFT JOIN sys_user u ON f.user_id = u.id
    LEFT JOIN elderly_info e ON f.elderly_id = e.id
    ${where}
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  res.json({
    code: 200,
    data: { list, total, page: Number(page), pageSize: Number(pageSize) },
    message: 'success',
  });
});

// GET /api/family/:id - 家属详情
router.get('/:id', auth, async (req, res) => {
  const family = await db.prepare(`
    SELECT f.*, u.real_name as user_name, u.phone as user_phone, u.username, u.role,
           e.name as elderly_name, e.phone as elderly_phone, e.address as elderly_address
    FROM family_member f
    LEFT JOIN sys_user u ON f.user_id = u.id
    LEFT JOIN elderly_info e ON f.elderly_id = e.id
    WHERE f.id = ?
  `).get(req.params.id);

  if (!family) {
    return res.json({ code: 404, data: null, message: '家属记录不存在' });
  }

  res.json({ code: 200, data: family, message: 'success' });
});

// POST /api/family - 创建家属关联
router.post('/', auth, async (req, res) => {
  const { userId, elderlyId, relationship, phone } = req.body;
  if (!userId || !elderlyId) {
    return res.json({ code: 400, data: null, message: '用户ID和老人ID不能为空' });
  }

  const result = await db.prepare(`
    INSERT INTO family_member (user_id, elderly_id, relationship, phone) VALUES (?, ?, ?, ?)
  `).run(userId, elderlyId, relationship || null, phone || null);

  res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '创建成功' });
});

// PUT /api/family/:id - 更新家属关联
router.put('/:id', auth, async (req, res) => {
  const { userId, elderlyId, relationship, phone } = req.body;

  const existing = await db.prepare('SELECT id FROM family_member WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '家属记录不存在' });
  }

  db.prepare(`
    UPDATE family_member SET
      user_id = COALESCE(?, user_id),
      elderly_id = COALESCE(?, elderly_id),
      relationship = COALESCE(?, relationship),
      phone = COALESCE(?, phone)
    WHERE id = ?
  `).run(userId, elderlyId, relationship, phone, req.params.id);

  res.json({ code: 200, data: null, message: '更新成功' });
});

// DELETE /api/family/:id - 删除家属关联
router.delete('/:id', auth, async (req, res) => {
  const existing = await db.prepare('SELECT id FROM family_member WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '家属记录不存在' });
  }
  await db.prepare('DELETE FROM family_member WHERE id = ?').run(req.params.id);
  res.json({ code: 200, data: null, message: '删除成功' });
});

module.exports = router;

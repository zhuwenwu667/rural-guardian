const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/provider - 服务商列表（分页）
router.get('/', auth, async (req, res) => {
  const { page = 1, pageSize = 20, status, keyword } = req.query;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params = [];

  if (status) {
    where += ' AND p.status = ?';
    params.push(status);
  }
  if (keyword) {
    where += ' AND (p.name LIKE ? OR p.contact_person LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM provider_info p ${where}`).get(...params).cnt;
  const list = await db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM service_order WHERE provider_id = p.id AND status IN ('CREATED','ASSIGNED','IN_PROGRESS')) as active_orders,
      (SELECT ROUND(AVG(rating), 1) FROM service_order WHERE provider_id = p.id AND rating IS NOT NULL) as actual_rating
    FROM provider_info p
    ${where}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  res.json({
    code: 200,
    data: { list, total, page: Number(page), pageSize: Number(pageSize) },
    message: 'success',
  });
});

// GET /api/provider/:id - 服务商详情
router.get('/:id', auth, async (req, res) => {
  const provider = await db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM service_order WHERE provider_id = p.id AND status IN ('CREATED','ASSIGNED','IN_PROGRESS')) as active_orders,
      (SELECT COUNT(*) FROM service_order WHERE provider_id = p.id AND status = 'COMPLETED') as completed_orders,
      (SELECT ROUND(AVG(rating), 1) FROM service_order WHERE provider_id = p.id AND rating IS NOT NULL) as actual_rating
    FROM provider_info p
    WHERE p.id = ?
  `).get(req.params.id);

  if (!provider) {
    return res.json({ code: 404, data: null, message: '服务商不存在' });
  }

  res.json({ code: 200, data: provider, message: 'success' });
});

// POST /api/provider - 创建服务商
router.post('/', auth, async (req, res) => {
  const { name, serviceTypes, contactPerson, contactPhone, serviceArea, rating, status } = req.body;
  if (!name) {
    return res.json({ code: 400, data: null, message: '服务商名称不能为空' });
  }

  const result = await db.prepare(`
    INSERT INTO provider_info (name, service_types, contact_person, contact_phone, service_area, rating, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, serviceTypes || null, contactPerson || null, contactPhone || null, serviceArea || null, rating || 0, status || 'ACTIVE');

  res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '创建成功' });
});

// PUT /api/provider/:id - 更新服务商
router.put('/:id', auth, async (req, res) => {
  const { name, serviceTypes, contactPerson, contactPhone, serviceArea, rating, status } = req.body;

  const existing = await db.prepare('SELECT id FROM provider_info WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '服务商不存在' });
  }

  db.prepare(`
    UPDATE provider_info SET
      name = COALESCE(?, name), service_types = COALESCE(?, service_types),
      contact_person = COALESCE(?, contact_person), contact_phone = COALESCE(?, contact_phone),
      service_area = COALESCE(?, service_area), rating = COALESCE(?, rating),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(name, serviceTypes, contactPerson, contactPhone, serviceArea, rating, status, req.params.id);

  res.json({ code: 200, data: null, message: '更新成功' });
});

// DELETE /api/provider/:id - 删除服务商
router.delete('/:id', auth, async (req, res) => {
  const existing = await db.prepare('SELECT id FROM provider_info WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '服务商不存在' });
  }
  await db.prepare('DELETE FROM provider_info WHERE id = ?').run(req.params.id);
  res.json({ code: 200, data: null, message: '删除成功' });
});

module.exports = router;

const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/village - 村庄列表（分页）
router.get('/', auth, async (req, res) => {
  const { page = 1, pageSize = 20, keyword } = req.query;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params = [];

  if (keyword) {
    where += ' AND (name LIKE ? OR town LIKE ? OR district LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM village_info ${where}`).get(...params).cnt;
  const list = await db.prepare(`
    SELECT v.*,
      (SELECT COUNT(*) FROM elderly_info WHERE village_id = v.id) as actual_elderly_count,
      (SELECT COUNT(*) FROM sys_user WHERE village_id = v.id AND role = 'VILLAGE_STAFF') as actual_staff_count
    FROM village_info v
    ${where}
    ORDER BY v.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  res.json({
    code: 200,
    data: { list, total, page: Number(page), pageSize: Number(pageSize) },
    message: 'success',
  });
});

// GET /api/village/:id - 村庄详情
router.get('/:id', auth, async (req, res) => {
  const village = await db.prepare(`
    SELECT v.*,
      (SELECT COUNT(*) FROM elderly_info WHERE village_id = v.id) as actual_elderly_count,
      (SELECT COUNT(*) FROM sys_user WHERE village_id = v.id AND role = 'VILLAGE_STAFF') as actual_staff_count
    FROM village_info v
    WHERE v.id = ?
  `).get(req.params.id);

  if (!village) {
    return res.json({ code: 404, data: null, message: '村庄不存在' });
  }

  // 获取村庄工作人员
  village.staff = await db.prepare(`
    SELECT id, username, real_name, phone FROM sys_user WHERE village_id = ? AND role = 'VILLAGE_STAFF'
  `).all(req.params.id);

  // 获取村庄老人
  village.elderly = await db.prepare(`
    SELECT id, name, gender, phone, address, health_status, living_alone FROM elderly_info WHERE village_id = ?
  `).all(req.params.id);

  res.json({ code: 200, data: village, message: 'success' });
});

// POST /api/village - 创建村庄
router.post('/', auth, async (req, res) => {
  const { name, town, district, population, elderlyCount, staffCount, servicePointAddress, contactPhone } = req.body;
  if (!name) {
    return res.json({ code: 400, data: null, message: '村庄名称不能为空' });
  }

  const result = await db.prepare(`
    INSERT INTO village_info (name, town, district, population, elderly_count, staff_count, service_point_address, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, town || null, district || null, population || null, elderlyCount || 0, staffCount || 0, servicePointAddress || null, contactPhone || null);

  res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '创建成功' });
});

// PUT /api/village/:id - 更新村庄
router.put('/:id', auth, async (req, res) => {
  const { name, town, district, population, elderlyCount, staffCount, servicePointAddress, contactPhone } = req.body;

  const existing = await db.prepare('SELECT id FROM village_info WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '村庄不存在' });
  }

  db.prepare(`
    UPDATE village_info SET
      name = COALESCE(?, name), town = COALESCE(?, town), district = COALESCE(?, district),
      population = COALESCE(?, population), elderly_count = COALESCE(?, elderly_count),
      staff_count = COALESCE(?, staff_count), service_point_address = COALESCE(?, service_point_address),
      contact_phone = COALESCE(?, contact_phone)
    WHERE id = ?
  `).run(name, town, district, population, elderlyCount, staffCount, servicePointAddress, contactPhone, req.params.id);

  res.json({ code: 200, data: null, message: '更新成功' });
});

// DELETE /api/village/:id - 删除村庄
router.delete('/:id', auth, async (req, res) => {
  const existing = await db.prepare('SELECT id FROM village_info WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '村庄不存在' });
  }
  await db.prepare('DELETE FROM village_info WHERE id = ?').run(req.params.id);
  res.json({ code: 200, data: null, message: '删除成功' });
});

module.exports = router;

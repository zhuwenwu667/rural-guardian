const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/health - 健康记录列表（分页）
router.get('/', auth, async (req, res) => {
  const { page = 1, pageSize = 20, elderlyId, startDate, endDate } = req.query;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE 1=1';
  const params = [];

  if (elderlyId) {
    where += ' AND h.elderly_id = ?';
    params.push(elderlyId);
  }
  if (startDate) {
    where += ' AND h.record_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    where += ' AND h.record_date <= ?';
    params.push(endDate);
  }

  const total = await db.prepare(`SELECT COUNT(*) as cnt FROM health_record h ${where}`).get(...params).cnt;
  const list = await db.prepare(`
    SELECT h.*, e.name as elderly_name, e.phone as elderly_phone
    FROM health_record h
    LEFT JOIN elderly_info e ON h.elderly_id = e.id
    ${where}
    ORDER BY h.record_date DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  res.json({
    code: 200,
    data: { list, total, page: Number(page), pageSize: Number(pageSize) },
    message: 'success',
  });
});

// GET /api/health/:id - 健康记录详情
router.get('/:id', auth, async (req, res) => {
  const record = await db.prepare(`
    SELECT h.*, e.name as elderly_name
    FROM health_record h
    LEFT JOIN elderly_info e ON h.elderly_id = e.id
    WHERE h.id = ?
  `).get(req.params.id);

  if (!record) {
    return res.json({ code: 404, data: null, message: '健康记录不存在' });
  }

  res.json({ code: 200, data: record, message: 'success' });
});

// POST /api/health - 创建健康记录
router.post('/', auth, async (req, res) => {
  const { elderlyId, heartRate, bloodPressureSystolic, bloodPressureDiastolic, bloodOxygen, temperature, sleepHours, steps, recordDate, notes } = req.body;
  if (!elderlyId) {
    return res.json({ code: 400, data: null, message: '老人ID不能为空' });
  }

  const elderly = await db.prepare('SELECT id FROM elderly_info WHERE id = ?').get(elderlyId);
  if (!elderly) {
    return res.json({ code: 404, data: null, message: '老人信息不存在' });
  }

  const result = await db.prepare(`
    INSERT INTO health_record (elderly_id, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, blood_oxygen, temperature, sleep_hours, steps, record_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(elderlyId, heartRate || null, bloodPressureSystolic || null, bloodPressureDiastolic || null, bloodOxygen || null, temperature || null, sleepHours || null, steps || null, recordDate || null, notes || null);

  res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '创建成功' });
});

// PUT /api/health/:id - 更新健康记录
router.put('/:id', auth, async (req, res) => {
  const { heartRate, bloodPressureSystolic, bloodPressureDiastolic, bloodOxygen, temperature, sleepHours, steps, notes } = req.body;

  const existing = await db.prepare('SELECT id FROM health_record WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '健康记录不存在' });
  }

  db.prepare(`
    UPDATE health_record SET
      heart_rate = COALESCE(?, heart_rate),
      blood_pressure_systolic = COALESCE(?, blood_pressure_systolic),
      blood_pressure_diastolic = COALESCE(?, blood_pressure_diastolic),
      blood_oxygen = COALESCE(?, blood_oxygen),
      temperature = COALESCE(?, temperature),
      sleep_hours = COALESCE(?, sleep_hours),
      steps = COALESCE(?, steps),
      notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(heartRate, bloodPressureSystolic, bloodPressureDiastolic, bloodOxygen, temperature, sleepHours, steps, notes, req.params.id);

  res.json({ code: 200, data: null, message: '更新成功' });
});

// DELETE /api/health/:id - 删除健康记录
router.delete('/:id', auth, async (req, res) => {
  const existing = await db.prepare('SELECT id FROM health_record WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.json({ code: 404, data: null, message: '健康记录不存在' });
  }
  await db.prepare('DELETE FROM health_record WHERE id = ?').run(req.params.id);
  res.json({ code: 200, data: null, message: '删除成功' });
});

module.exports = router;

const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, villageId, healthStatus, livingAlone } = req.query;
    const offset = (page - 1) * pageSize;
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) { where += ' AND (e.name LIKE ? OR e.id_card LIKE ? OR e.phone LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (villageId) { where += ' AND e.village_id = ?'; params.push(villageId); }
    if (healthStatus) { where += ' AND e.health_status = ?'; params.push(healthStatus); }
    if (livingAlone !== undefined) { where += ' AND e.living_alone = ?'; params.push(livingAlone); }

    const total = (await db.prepare(`SELECT COUNT(*) as cnt FROM elderly_info e ${where}`).get(...params)).cnt;
    const list = await db.prepare(`SELECT e.*, v.name as village_name FROM elderly_info e LEFT JOIN village_info v ON e.village_id=v.id ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`).all(...params, Number(pageSize), offset);

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const elderly = await db.prepare('SELECT e.*, v.name as village_name FROM elderly_info e LEFT JOIN village_info v ON e.village_id=v.id WHERE e.id=?').get(req.params.id);
    if (!elderly) return res.json({ code: 404, data: null, message: '老人不存在' });
    const healthRecords = await db.prepare('SELECT * FROM health_record WHERE elderly_id=? ORDER BY record_date DESC LIMIT 10').all(req.params.id);
    const recentAlerts = await db.prepare('SELECT * FROM alert_record WHERE elderly_id=? ORDER BY created_at DESC LIMIT 5').all(req.params.id);
    const latestHealth = await db.prepare('SELECT * FROM health_record WHERE elderly_id=? ORDER BY record_date DESC LIMIT 1').get(req.params.id);
    res.json({ code: 200, data: { ...elderly, healthRecords, recentAlerts, latestHealth }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, gender, birthDate, idCard, phone, address, villageId, emergencyContact, emergencyPhone, healthStatus, livingAlone } = req.body;
    const result = await db.prepare('INSERT INTO elderly_info (name,gender,birth_date,id_card,phone,address,village_id,emergency_contact,emergency_phone,health_status,living_alone) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(name, gender, birthDate, idCard, phone, address, villageId, emergencyContact, emergencyPhone, healthStatus||'GOOD', livingAlone?1:0);
    res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '创建成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT id FROM elderly_info WHERE id=?').get(req.params.id);
    if (!existing) return res.json({ code: 404, data: null, message: '老人不存在' });
    const { name, gender, birthDate, idCard, phone, address, villageId, emergencyContact, emergencyPhone, healthStatus, livingAlone } = req.body;
    await db.prepare('UPDATE elderly_info SET name=?,gender=?,birth_date=?,id_card=?,phone=?,address=?,village_id=?,emergency_contact=?,emergency_phone=?,health_status=?,living_alone=? WHERE id=?').run(name, gender, birthDate, idCard, phone, address, villageId, emergencyContact, emergencyPhone, healthStatus, livingAlone?1:0, req.params.id);
    res.json({ code: 200, data: null, message: '更新成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM elderly_info WHERE id=?').run(req.params.id);
    res.json({ code: 200, data: null, message: '删除成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

module.exports = router;

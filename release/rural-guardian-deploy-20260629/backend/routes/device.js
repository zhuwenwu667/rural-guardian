const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/device - 设备列表（分页+搜索）
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, type, status, elderlyId, keyword } = req.query;
    const offset = (page - 1) * pageSize;
    let where = 'WHERE 1=1';
    const params = [];
    if (type)      { where += ' AND d.type = ?'; params.push(type); }
    if (status)    { where += ' AND d.status = ?'; params.push(status); }
    if (elderlyId) { where += ' AND d.elderly_id = ?'; params.push(elderlyId); }
    if (keyword)   { where += ' AND (d.device_sn LIKE ? OR e.name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }

    const total = (await db.prepare(`SELECT COUNT(*) as cnt FROM device_info d ${where}`).get(...params)).cnt;
    const list = await db.prepare(`
      SELECT d.*, e.name as elderly_name, e.phone as elderly_phone
      FROM device_info d LEFT JOIN elderly_info e ON d.elderly_id = e.id
      ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), offset);

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// GET /api/device/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const device = await db.prepare(`
      SELECT d.*, e.name as elderly_name, e.phone as elderly_phone
      FROM device_info d LEFT JOIN elderly_info e ON d.elderly_id = e.id WHERE d.id = ?
    `).get(req.params.id);
    if (!device) return res.json({ code: 404, data: null, message: '设备不存在' });
    res.json({ code: 200, data: device, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// POST /api/device - 创建设备（绑定老人）
router.post('/', auth, async (req, res) => {
  try {
    const { elderlyId, deviceSn, type, batteryLevel, status, firmwareVersion } = req.body;
    if (!elderlyId || !deviceSn || !type) return res.json({ code: 400, data: null, message: '老人ID、设备编号和类型不能为空' });
    if (!['BAND', 'GATEWAY', 'TERMINAL'].includes(type)) return res.json({ code: 400, data: null, message: '类型仅限: BAND/GATEWAY/TERMINAL' });

    const elder = await db.prepare('SELECT id FROM elderly_info WHERE id = ?').get(elderlyId);
    if (!elder) return res.json({ code: 404, data: null, message: '老人不存在' });

    const existing = await db.prepare('SELECT id FROM device_info WHERE device_sn = ?').get(deviceSn);
    if (existing) return res.json({ code: 400, data: null, message: '设备编号已存在' });

    const result = await db.prepare(`INSERT INTO device_info (elderly_id, device_sn, type, battery_level, status, firmware_version) VALUES (?,?,?,?,?,?)`)
      .run(elderlyId, deviceSn, type, batteryLevel || 100, status || 'ONLINE', firmwareVersion || null);

    res.json({ code: 200, data: { id: result.lastInsertRowid, deviceSn, type }, message: `设备 ${deviceSn} 已绑定到老人(ID:${elderlyId})` });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/device/:id - 更新设备（换绑老人）
router.put('/:id', auth, async (req, res) => {
  try {
    const { elderlyId, deviceSn, type, batteryLevel, status, firmwareVersion } = req.body;
    const existing = await db.prepare('SELECT * FROM device_info WHERE id = ?').get(req.params.id);
    if (!existing) return res.json({ code: 404, data: null, message: '设备不存在' });

    if (deviceSn && deviceSn !== existing.device_sn) {
      const dup = await db.prepare('SELECT id FROM device_info WHERE device_sn = ? AND id != ?').get(deviceSn, req.params.id);
      if (dup) return res.json({ code: 400, data: null, message: '设备编号已被占用' });
    }
    if (elderlyId && elderlyId !== existing.elderly_id) {
      const elder = await db.prepare('SELECT id FROM elderly_info WHERE id = ?').get(elderlyId);
      if (!elder) return res.json({ code: 404, data: null, message: '目标老人不存在' });
    }

    await db.prepare(`UPDATE device_info SET elderly_id=COALESCE(?,elderly_id), device_sn=COALESCE(?,device_sn), type=COALESCE(?,type), battery_level=COALESCE(?,battery_level), status=COALESCE(?,status), firmware_version=COALESCE(?,firmware_version), last_heartbeat=CASE WHEN ? IS NOT NULL AND ?!=? THEN NOW() ELSE last_heartbeat END WHERE id=?`)
      .run(elderlyId, deviceSn, type, batteryLevel, status, firmwareVersion, status, status, existing.status, req.params.id);

    const updated = await db.prepare('SELECT d.*, e.name as elderly_name FROM device_info d LEFT JOIN elderly_info e ON d.elderly_id=e.id WHERE d.id=?').get(req.params.id);
    res.json({ code: 200, data: updated, message: '更新成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// DELETE /api/device/:id - 删除设备（释放绑定+清理关联数据）
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT id, device_sn FROM device_info WHERE id = ?').get(req.params.id);
    if (!existing) return res.json({ code: 404, data: null, message: '设备不存在' });

    await db.prepare('DELETE FROM device_realtime WHERE device_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM device_history WHERE device_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM device_binding_approval WHERE device_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM device_info WHERE id = ?').run(req.params.id);

    res.json({ code: 200, data: null, message: `设备 ${existing.device_sn} 已删除，绑定释放` });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

module.exports = router;

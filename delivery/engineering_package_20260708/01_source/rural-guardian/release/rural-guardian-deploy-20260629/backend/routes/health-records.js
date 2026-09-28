/**
 * 健康记录 API 路由
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { initDb } = require('../config/db');

// 获取老人的健康记录
router.get('/elderly/:id/health-records', auth.auth, async (req, res) => {
  try {
    const db = await initDb();
    const { id } = req.params;
    const { limit = 30 } = req.query;
    
    const records = await db.prepare(`
      SELECT * FROM health_records 
      WHERE elderly_id = ?
      ORDER BY record_date DESC, created_at DESC
      LIMIT ?
    `).all(id, parseInt(limit));
    
    res.json({ code: 200, data: records, message: 'success' });
  } catch (err) {
    console.error('[健康记录] 获取失败:', err);
    res.json({ code: 500, data: null, message: '获取失败' });
  }
});

// 添加健康记录
router.post('/health-records', auth.auth, async (req, res) => {
  try {
    const db = await initDb();
    const {
      elderlyId,
      recordDate,
      heartRate,
      systolic,
      diastolic,
      temperature,
      oxygen,
      weight,
      remark
    } = req.body;
    
    const result = await db.prepare(`
      INSERT INTO health_records 
      (elderly_id, record_date, heart_rate, systolic, diastolic, temperature, oxygen, weight, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(
      elderlyId,
      recordDate,
      heartRate,
      systolic,
      diastolic,
      temperature,
      oxygen,
      weight,
      remark
    );
    
    res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '添加成功' });
  } catch (err) {
    console.error('[健康记录] 添加失败:', err);
    res.json({ code: 500, data: null, message: '添加失败' });
  }
});

// 更新健康记录
router.put('/health-records/:id', auth.auth, async (req, res) => {
  try {
    const db = await initDb();
    const { id } = req.params;
    const {
      recordDate,
      heartRate,
      systolic,
      diastolic,
      temperature,
      oxygen,
      weight,
      remark
    } = req.body;
    
    db.prepare(`
      UPDATE health_records 
      SET record_date = ?, heart_rate = ?, systolic = ?, diastolic = ?, 
          temperature = ?, oxygen = ?, weight = ?, remark = ?
      WHERE id = ?
    `).run(
      recordDate,
      heartRate,
      systolic,
      diastolic,
      temperature,
      oxygen,
      weight,
      remark,
      id
    );
    
    res.json({ code: 200, data: null, message: '更新成功' });
  } catch (err) {
    console.error('[健康记录] 更新失败:', err);
    res.json({ code: 500, data: null, message: '更新失败' });
  }
});

// 删除健康记录
router.delete('/health-records/:id', auth.auth, async (req, res) => {
  try {
    const db = await initDb();
    const { id } = req.params;
  await db.prepare('DELETE FROM health_records WHERE id = ?').run(id);
    
    res.json({ code: 200, data: null, message: '删除成功' });
  } catch (err) {
    console.error('[健康记录] 删除失败:', err);
    res.json({ code: 500, data: null, message: '删除失败' });
  }
});

module.exports = router;

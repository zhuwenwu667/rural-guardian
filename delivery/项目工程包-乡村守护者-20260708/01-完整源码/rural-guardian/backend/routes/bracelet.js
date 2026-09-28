/**
 * 智能手环数据 API
 * 提供手环实时数据、历史趋势、告警查询
 */
const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const deviceEngine = require('../services/device-engine');

const router = express.Router();

// ==================== 实时数据 ====================

// GET /api/bracelet/realtime/:elderlyId — 获取指定老人的手环实时数据
router.get('/realtime/:elderlyId', auth, async (req, res) => {
  const { elderlyId } = req.params;

  try {
    const data = await db.prepare(`
      SELECT dr.*, di.device_sn, di.type as device_type, ei.name as elderly_name
      FROM device_realtime dr
      JOIN device_info di ON dr.device_id = di.id
      LEFT JOIN elderly_info ei ON dr.elderly_id = ei.id
      WHERE dr.elderly_id = ? AND di.type = 'BAND'
      ORDER BY dr.last_report_at DESC
      LIMIT 1
    `).get(elderlyId);

    if (!data) {
      return res.json({
        code: 200,
        data: null,
        message: '该老人暂无手环数据',
      });
    }

    // 判断数据是否在线（5分钟内上报认为在线）
    const lastReport = new Date(data.last_report_at);
    const now = new Date();
    const isOnline = (now - lastReport) < 5 * 60 * 1000;

    res.json({
      code: 200,
      data: {
        deviceSn: data.device_sn,
        elderlyName: data.elderly_name,
        heartRate: data.heart_rate,
        spo2: data.blood_oxygen,
        temperature: data.temperature,
        systolic: data.blood_pressure_systolic,
        diastolic: data.blood_pressure_diastolic,
        steps: data.steps,
        battery: data.battery,
        isOnline,
        lastReportAt: data.last_report_at,
        latitude: data.location_lat,
        longitude: data.location_lng,
      },
      message: 'success',
    });
  } catch (err) {
    res.status(500).json({ code: 500, data: null, message: '获取手环数据失败' });
  }
});

// ==================== 历史趋势 ====================

// GET /api/bracelet/trend/:elderlyId — 获取指定老人的手环历史趋势（最近24小时）
router.get('/trend/:elderlyId', auth, async (req, res) => {
  const { elderlyId } = req.params;
  const { hours = 24 } = req.query;

  try {
    const data = await db.prepare(`
      SELECT heart_rate, blood_oxygen, temperature, steps,
             strftime('%H:%M', recorded_at) as time_label,
             recorded_at
      FROM device_history dh
      JOIN device_info di ON dh.device_id = di.id
      WHERE dh.elderly_id = ? AND di.type = 'BAND'
        AND dh.recorded_at >= datetime('now', 'localtime', '-' || ? || ' hours')
      ORDER BY dh.recorded_at ASC
    `).all(elderlyId, hours);

    // 采样：如果数据点太多，每5分钟取一个点
    const sampled = sampleData(data, 5);

    res.json({
      code: 200,
      data: {
        hours: Number(hours),
        points: sampled.length,
        heartRate: sampled.map(d => ({ time: d.time_label, value: d.heart_rate })),
        spo2: sampled.map(d => ({ time: d.time_label, value: d.blood_oxygen })),
        temperature: sampled.map(d => ({ time: d.time_label, value: d.temperature })),
        steps: sampled.map(d => ({ time: d.time_label, value: d.steps })),
      },
      message: 'success',
    });
  } catch (err) {
    res.status(500).json({ code: 500, data: null, message: '获取趋势数据失败' });
  }
});

// ==================== 手环告警列表 ====================

// GET /api/bracelet/alerts/:elderlyId — 获取指定老人的手环相关告警
router.get('/alerts/:elderlyId', auth, async (req, res) => {
  const { elderlyId } = req.params;
  const { limit = 10 } = req.query;

  try {
    const alerts = await db.prepare(`
      SELECT ar.*, ei.name as elderly_name
      FROM alert_record ar
      LEFT JOIN elderly_info ei ON ar.elderly_id = ei.id
      WHERE ar.elderly_id = ?
        AND (ar.type IN ('FALL', 'SOS', 'BAND', 'HEART_RATE', 'BLOOD_PRESSURE') OR ar.type LIKE 'DEVICE_%')
      ORDER BY ar.created_at DESC
      LIMIT ?
    `).all(elderlyId, Number(limit));

    res.json({
      code: 200,
      data: alerts.map(a => ({
        id: a.id,
        type: a.type,
        level: a.level,
        status: a.status,
        description: a.description,
        elderlyName: a.elderly_name,
        createdAt: a.created_at,
      })),
      message: 'success',
    });
  } catch (err) {
    res.status(500).json({ code: 500, data: null, message: '获取告警列表失败' });
  }
});

// ==================== 手环设备列表 ====================

// GET /api/bracelet/devices — 获取所有手环设备及关联老人
router.get('/devices', auth, async (req, res) => {
  try {
    const devices = await db.prepare(`
      SELECT di.id, di.device_sn, di.type, di.status, di.battery_level,
             di.last_heartbeat, dr.last_report_at, dr.heart_rate, dr.blood_oxygen,
             dr.temperature, dr.steps, dr.battery,
             ei.id as elderly_id, ei.name as elderly_name
      FROM device_info di
      LEFT JOIN device_realtime dr ON di.id = dr.device_id
      LEFT JOIN elderly_info ei ON di.elderly_id = ei.id
      WHERE di.type = 'BAND'
      ORDER BY di.id
    `).all();

    const now = new Date();
    const result = devices.map(d => {
      const lastReport = d.last_report_at ? new Date(d.last_report_at) : null;
      const isOnline = lastReport && (now - lastReport) < 5 * 60 * 1000;
      return {
        id: d.id,
        deviceSn: d.device_sn,
        type: d.type,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        battery: d.battery || d.battery_level || 0,
        heartRate: d.heart_rate || 0,
        spo2: d.blood_oxygen || 0,
        temperature: d.temperature || 0,
        steps: d.steps || 0,
        lastReportAt: d.last_report_at || d.last_heartbeat,
        elderlyId: d.elderly_id,
        elderlyName: d.elderly_name,
      };
    });

    res.json({ code: 200, data: result, message: 'success' });
  } catch (err) {
    res.status(500).json({ code: 500, data: null, message: '获取设备列表失败' });
  }
});

// ==================== 工具函数 ====================

// 按时间窗口采样：每 `windowMinutes` 分钟取一个数据点
function sampleData(data, windowMinutes) {
  if (data.length < 60) return data; // 少于60条无需采样

  const sampled = [];
  let lastBucket = null;

  for (const point of data) {
    const time = point.recorded_at;
    const bucket = time ? time.substring(0, 16) : point.time_label; // 精确到分钟

    if (lastBucket !== bucket) {
      sampled.push(point);
      lastBucket = bucket;
    }
  }

  return sampled;
}

module.exports = router;

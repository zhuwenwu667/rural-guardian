/**
 * 设备实时监控 API 路由
 * 参考 IoT DC3 设备管理模块设计
 */
const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const deviceEngine = require('../services/device-engine');

const router = express.Router();

// GET /api/device-monitor/realtime — 获取所有设备最新实时数据
router.get('/realtime', auth, async (req, res) => {
  try {
    const realtimeData = (await deviceEngine.getAllRealtimeData()) || [];

    // 附加老人姓名信息
    const enrichedData = await Promise.all(realtimeData.map(async data => {
      const elderly = await db.prepare('SELECT name, phone, address FROM elderly_info WHERE id = ?').get(data.elderlyId);
      return {
        ...data,
        elderlyName: elderly ? elderly.name : '未知',
        elderlyPhone: elderly ? elderly.phone : '',
        elderlyAddress: elderly ? elderly.address : '',
      };
    }));

    // 统一字段名为 camelCase（前端期望）
    const result = enrichedData.map(d => ({
      deviceId: d.deviceId,
      deviceSn: d.deviceSn,
      deviceType: d.deviceType,
      elderlyId: d.elderlyId,
      elderlyName: d.elderlyName,
      elderlyPhone: d.elderlyPhone,
      elderlyAddress: d.elderlyAddress,
      heartRate: d.heartRate || 0,
      bloodOxygen: d.bloodOxygen || 0,
      temperature: d.temperature || 0,
      bloodPressureSystolic: d.bloodPressureSystolic || 0,
      bloodPressureDiastolic: d.bloodPressureDiastolic || 0,
      steps: d.steps || 0,
      battery: d.battery || 0,
      status: d.status || 'OFFLINE',
      lastReportAt: d.lastReportAt,
      locationLat: d.locationLat,
      locationLng: d.locationLng,
      fallDetected: d.fallDetected || 0,
      sosPressed: d.sosPressed || 0,
    }));

    res.json({
      code: 200,
      data: result,
      message: 'success',
    });
  } catch (err) {
    console.error('[DeviceMonitor] 获取实时数据失败:', err);
    res.json({ code: 500, data: null, message: '获取实时数据失败' });
  }
});

// GET /api/device-monitor/realtime/:elderlyId — 获取某老人的设备实时数据
router.get('/realtime/:elderlyId', auth, async (req, res) => {
  try {
    const { elderlyId } = req.params;
    const realtimeData = deviceEngine.getRealtimeDataByElderly(elderlyId);

    // 附加老人姓名信息
    const elderly = await db.prepare('SELECT name, phone, address FROM elderly_info WHERE id = ?').get(elderlyId);

    const enrichedData = realtimeData.map(data => ({
      ...data,
      elderlyName: elderly ? elderly.name : '未知',
      elderlyPhone: elderly ? elderly.phone : '',
      elderlyAddress: elderly ? elderly.address : '',
    }));

    res.json({
      code: 200,
      data: enrichedData,
      message: 'success',
    });
  } catch (err) {
    console.error('[DeviceMonitor] 获取老人实时数据失败:', err);
    res.json({ code: 500, data: null, message: '获取实时数据失败' });
  }
});

// GET /api/device-monitor/alert-rules — 获取告警规则列表
router.get('/alert-rules', auth, async (req, res) => {
  try {
    const rules = await db.prepare('SELECT * FROM alert_rule ORDER BY level, metric').all();
    res.json({
      code: 200,
      data: rules,
      message: 'success',
    });
  } catch (err) {
    console.error('[DeviceMonitor] 获取告警规则失败:', err);
    res.json({ code: 500, data: null, message: '获取告警规则失败' });
  }
});

// PUT /api/device-monitor/alert-rules/:id — 更新告警规则（阈值调整）
router.put('/alert-rules/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, metric, condition, threshold, level, enabled, description } = req.body;

    const existing = await db.prepare('SELECT id FROM alert_rule WHERE id = ?').get(id);
    if (!existing) {
      return res.json({ code: 404, data: null, message: '告警规则不存在' });
    }

    await db.prepare(`
      UPDATE alert_rule SET
        name = COALESCE(?, name),
        metric = COALESCE(?, metric),
        condition = COALESCE(?, condition),
        threshold = COALESCE(?, threshold),
        level = COALESCE(?, level),
        enabled = COALESCE(?, enabled),
        description = COALESCE(?, description)
      WHERE id = ?
    `).run(name, metric, condition, threshold, level, enabled, description, id);

    // 刷新引擎中的告警规则缓存
    deviceEngine.refreshAlertRules();

    res.json({
      code: 200,
      data: null,
      message: '告警规则更新成功',
    });
  } catch (err) {
    console.error('[DeviceMonitor] 更新告警规则失败:', err);
    res.json({ code: 500, data: null, message: '更新告警规则失败' });
  }
});

// GET /api/device-monitor/statistics — 设备在线率、告警统计
router.get('/statistics', auth, async (req, res) => {
  try {
    const stats = deviceEngine.getStatistics();

    // 附加今日告警趋势
    const todayAlerts = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN level = 'HIGH' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN level = 'MEDIUM' THEN 1 ELSE 0 END) as medium_count,
        SUM(CASE WHEN level = 'LOW' THEN 1 ELSE 0 END) as low_count,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END) as processing_count,
        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_count
      FROM alert_record
      WHERE type LIKE 'DEVICE_%'
        AND created_at >= datetime('now', 'localtime', 'start of day')
    `).get();

    res.json({
      code: 200,
      data: {
        ...stats,
        todayAlerts: todayAlerts || {
          total: 0, critical_count: 0, high_count: 0,
          medium_count: 0, low_count: 0, pending_count: 0,
          processing_count: 0, resolved_count: 0,
        },
      },
      message: 'success',
    });
  } catch (err) {
    console.error('[DeviceMonitor] 获取统计数据失败:', err);
    res.json({ code: 500, data: null, message: '获取统计数据失败' });
  }
});

// POST /api/device-monitor/command/:deviceId — 发送指令到设备（模拟）
router.post('/command/:deviceId', auth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { command } = req.body;

    if (!command) {
      return res.json({ code: 400, data: null, message: '指令不能为空' });
    }

    const validCommands = ['REBOOT', 'SYNC', 'LOCATE', 'SET_INTERVAL'];
    if (!validCommands.includes(command)) {
      return res.json({
        code: 400,
        data: null,
        message: `无效指令，支持的指令: ${validCommands.join(', ')}`,
      });
    }

    const result = deviceEngine.sendCommand(deviceId, command);
    res.json({
      code: result.success ? 200 : 400,
      data: result,
      message: result.success ? 'success' : result.message,
    });
  } catch (err) {
    console.error('[DeviceMonitor] 发送设备指令失败:', err);
    res.json({ code: 500, data: null, message: '发送设备指令失败' });
  }
});

// GET /api/device-monitor/history/:deviceId — 获取设备历史数据（趋势图用）
router.get('/history/:deviceId', auth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { minutes = 30 } = req.query;

    const history = await db.prepare(`
      SELECT * FROM device_history
      WHERE device_id = ?
        AND recorded_at >= datetime('now', 'localtime', ? || ' minutes')
      ORDER BY recorded_at ASC
    `).all(deviceId, `-${minutes}`);

    res.json({
      code: 200,
      data: history,
      message: 'success',
    });
  } catch (err) {
    console.error('[DeviceMonitor] 获取历史数据失败:', err);
    res.json({ code: 500, data: null, message: '获取历史数据失败' });
  }
});

module.exports = router;

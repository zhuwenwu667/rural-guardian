const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 大屏所有接口均需认证
router.use(auth);

// GET /api/big-screen/overview — 大屏总览数据
router.get('/overview', async (req, res) => {
  try {
    // 核心KPI
    const elderlyCount = await db.prepare('SELECT COUNT(*) as cnt FROM elderly_info').get().cnt;
    const deviceOnline = await db.prepare("SELECT COUNT(*) as cnt FROM device_info WHERE status = 'ONLINE'").get().cnt;
    const deviceTotal = await db.prepare('SELECT COUNT(*) as cnt FROM device_info').get().cnt;
    const todayAlerts = await db.prepare(`
      SELECT COUNT(*) as cnt FROM alert_record
      WHERE DATE(created_at) = DATE('now', 'localtime')
    `).get().cnt;
    const activeOrders = await db.prepare(`
      SELECT COUNT(*) as cnt FROM service_order
      WHERE status IN ('CREATED', 'ASSIGNED', 'IN_PROGRESS')
    `).get().cnt;
    const completedOrders = await db.prepare(`
      SELECT COUNT(*) as cnt FROM service_order WHERE status = 'COMPLETED'
    `).get().cnt;
    const totalOrders = await db.prepare('SELECT COUNT(*) as cnt FROM service_order').get().cnt;
    const villageCount = await db.prepare('SELECT COUNT(*) as cnt FROM village_info').get().cnt;
    const livingAlone = await db.prepare('SELECT COUNT(*) as cnt FROM elderly_info WHERE living_alone = 1').get().cnt;

    // 告警类型分布
    const alertByType = await db.prepare(`
      SELECT type, COUNT(*) as count FROM alert_record GROUP BY type
    `).all();

    // 工单状态分布
    const orderByStatus = await db.prepare(`
      SELECT status, COUNT(*) as count FROM service_order GROUP BY status
    `).all();

    // 健康状况分布
    const healthByStatus = await db.prepare(`
      SELECT health_status as status, COUNT(*) as count
      FROM elderly_info GROUP BY health_status
    `).all();

    // 24小时告警趋势
    const alertTrend24h = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 3600000);
      const hourEnd = new Date(now.getTime() - (i - 1) * 3600000);
      const hourLabel = `${String(hourStart.getHours()).padStart(2, '0')}:00`;

      const count = await db.prepare(`
        SELECT COUNT(*) as cnt FROM alert_record
        WHERE created_at >= ? AND created_at < ?
      `).get(
        hourStart.toISOString().replace('T', ' ').slice(0, 19),
        hourEnd.toISOString().replace('T', ' ').slice(0, 19)
      ).cnt;

      alertTrend24h.push({ hour: hourLabel, count });
    }

    // 村庄告警热力数据
    const villageHeatmap = await db.prepare(`
      SELECT
        v.id as villageId,
        v.name as villageName,
        COUNT(a.id) as totalAlerts,
        SUM(CASE WHEN a.level = 'CRITICAL' THEN 1 ELSE 0 END) as criticalCount,
        SUM(CASE WHEN a.level = 'HIGH' THEN 1 ELSE 0 END) as highCount,
        SUM(CASE WHEN a.level = 'MEDIUM' THEN 1 ELSE 0 END) as mediumCount,
        SUM(CASE WHEN a.level = 'LOW' THEN 1 ELSE 0 END) as lowCount
      FROM village_info v
      LEFT JOIN elderly_info e ON e.village_id = v.id
      LEFT JOIN alert_record a ON a.elderly_id = e.id
      GROUP BY v.id, v.name
      ORDER BY totalAlerts DESC
    `).all();

    // 服务响应时效
    const avgResponse = await db.prepare(`
      SELECT
        AVG((julianday(started_at) - julianday(created_at)) * 24 * 60) as avgMinutes
      FROM service_order
      WHERE started_at IS NOT NULL AND created_at IS NOT NULL
    `).get();

    // 近7天每日响应时间
    const dailyResponse = await db.prepare(`
      SELECT
        DATE(created_at) as date,
        AVG(CASE WHEN started_at IS NOT NULL
          THEN (julianday(started_at) - julianday(created_at)) * 24 * 60
          ELSE NULL END
        ) as avgMinutes
      FROM service_order
      WHERE created_at >= DATE('now', '-7 days', 'localtime')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all();

    res.json({
      code: 200,
      data: {
        kpi: {
          elderlyCount,
          deviceOnline,
          deviceTotal,
          deviceOnlineRate: deviceTotal > 0 ? Math.round((deviceOnline / deviceTotal) * 10000) / 100 : 0,
          todayAlerts,
          activeOrders,
          completedOrders,
          totalOrders,
          orderCompletionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 10000) / 100 : 0,
          villageCount,
          livingAlone,
          avgResponseMinutes: avgResponse.avgMinutes ? Math.round(avgResponse.avgMinutes * 10) / 10 : 0,
        },
        alertByType,
        orderByStatus,
        healthByStatus,
        alertTrend24h,
        villageHeatmap,
        dailyResponse,
        updateTime: new Date().toISOString(),
      },
      message: 'success',
    });
  } catch (err) {
    res.json({ code: 500, data: null, message: '获取大屏总览数据失败: ' + err.message });
  }
});

// GET /api/big-screen/alerts — 最新告警列表（滚动展示）
router.get('/alerts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const alerts = await db.prepare(`
      SELECT
        a.id,
        a.type,
        a.level,
        a.status,
        a.description,
        a.created_at,
        e.name as elderlyName,
        e.address as elderlyAddress,
        v.name as villageName
      FROM alert_record a
      LEFT JOIN elderly_info e ON a.elderly_id = e.id
      LEFT JOIN village_info v ON e.village_id = v.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(limit);

    res.json({
      code: 200,
      data: alerts,
      message: 'success',
    });
  } catch (err) {
    res.json({ code: 500, data: null, message: '获取告警列表失败: ' + err.message });
  }
});

// GET /api/big-screen/devices — 设备状态统计
router.get('/devices', async (req, res) => {
  try {
    const total = await db.prepare('SELECT COUNT(*) as cnt FROM device_info').get().cnt;
    const online = await db.prepare("SELECT COUNT(*) as cnt FROM device_info WHERE status = 'ONLINE'").get().cnt;
    const offline = await db.prepare("SELECT COUNT(*) as cnt FROM device_info WHERE status = 'OFFLINE'").get().cnt;

    // 按设备类型统计
    const byType = await db.prepare(`
      SELECT type, COUNT(*) as count,
        SUM(CASE WHEN status = 'ONLINE' THEN 1 ELSE 0 END) as onlineCount
      FROM device_info GROUP BY type
    `).all();

    // 低电量设备
    const lowBattery = await db.prepare(`
      SELECT COUNT(*) as cnt FROM device_info WHERE battery_level < 20
    `).get().cnt;

    // 24小时在线率趋势
    const hourlyData = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 3600000);
      const hourLabel = `${String(hourStart.getHours()).padStart(2, '0')}:00`;
      const onlineCount = await db.prepare(`
        SELECT COUNT(*) as cnt FROM device_info WHERE status = 'ONLINE'
      `).get().cnt;
      hourlyData.push({
        hour: hourLabel,
        online: onlineCount,
        offline: total - onlineCount,
        rate: total > 0 ? Math.round((onlineCount / total) * 10000) / 100 : 0,
      });
    }

    res.json({
      code: 200,
      data: {
        total,
        online,
        offline,
        onlineRate: total > 0 ? Math.round((online / total) * 10000) / 100 : 0,
        lowBattery,
        byType,
        hourlyData,
      },
      message: 'success',
    });
  } catch (err) {
    res.json({ code: 500, data: null, message: '获取设备状态统计失败: ' + err.message });
  }
});

// GET /api/big-screen/services — 服务数据统计
router.get('/services', async (req, res) => {
  try {
    const total = await db.prepare('SELECT COUNT(*) as cnt FROM service_order').get().cnt;
    const completed = await db.prepare("SELECT COUNT(*) as cnt FROM service_order WHERE status = 'COMPLETED'").get().cnt;
    const inProgress = await db.prepare("SELECT COUNT(*) as cnt FROM service_order WHERE status IN ('CREATED', 'ASSIGNED', 'IN_PROGRESS')").get().cnt;
    const cancelled = await db.prepare("SELECT COUNT(*) as cnt FROM service_order WHERE status = 'CANCELLED'").get().cnt;

    // 按类型统计
    const byType = await db.prepare(`
      SELECT type, COUNT(*) as count FROM service_order GROUP BY type
    `).all();

    // 按状态统计
    const byStatus = await db.prepare(`
      SELECT status, COUNT(*) as count FROM service_order GROUP BY status
    `).all();

    // 近7天工单趋势
    const dailyTrend = await db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
      FROM service_order
      WHERE created_at >= DATE('now', '-7 days', 'localtime')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all();

    // 平均响应时间
    const avgResponse = await db.prepare(`
      SELECT AVG((julianday(started_at) - julianday(created_at)) * 24 * 60) as avgMinutes
      FROM service_order
      WHERE started_at IS NOT NULL AND created_at IS NOT NULL
    `).get();

    // 平均评分
    const avgRating = await db.prepare(`
      SELECT AVG(rating) as avgRating
      FROM service_order
      WHERE rating IS NOT NULL AND status = 'COMPLETED'
    `).get();

    res.json({
      code: 200,
      data: {
        total,
        completed,
        inProgress,
        cancelled,
        completionRate: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        byType,
        byStatus,
        dailyTrend,
        avgResponseMinutes: avgResponse.avgMinutes ? Math.round(avgResponse.avgMinutes * 10) / 10 : 0,
        avgRating: avgRating.avgRating ? Math.round(avgRating.avgRating * 10) / 10 : 0,
      },
      message: 'success',
    });
  } catch (err) {
    res.json({ code: 500, data: null, message: '获取服务数据统计失败: ' + err.message });
  }
});

module.exports = router;

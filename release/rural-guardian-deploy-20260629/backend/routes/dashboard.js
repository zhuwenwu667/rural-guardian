const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', auth, async (req, res) => {
  try {
    const [overview, alertByType, orderByType, alertTrend, healthAbnormal] = await Promise.all([
      (async () => ({
        elderlyCount: (await db.prepare('SELECT COUNT(*) as cnt FROM elderly_info').get()).cnt,
        alertPending: (await db.prepare("SELECT COUNT(*) as cnt FROM alert_record WHERE status IN ('PENDING','PROCESSING')").get()).cnt,
        alertCritical: (await db.prepare("SELECT COUNT(*) as cnt FROM alert_record WHERE level = 'CRITICAL' AND status IN ('PENDING','PROCESSING')").get()).cnt,
        orderPending: (await db.prepare("SELECT COUNT(*) as cnt FROM service_order WHERE status IN ('CREATED','ASSIGNED','IN_PROGRESS')").get()).cnt,
        deviceOnline: (await db.prepare("SELECT COUNT(*) as cnt FROM device_info WHERE status = 'ONLINE'").get()).cnt,
        deviceOffline: (await db.prepare("SELECT COUNT(*) as cnt FROM device_info WHERE status = 'OFFLINE'").get()).cnt,
        villageCount: (await db.prepare('SELECT COUNT(*) as cnt FROM village_info').get()).cnt,
        providerCount: (await db.prepare("SELECT COUNT(*) as cnt FROM provider_info WHERE status = 'ACTIVE'").get()).cnt,
        userCount: (await db.prepare('SELECT COUNT(*) as cnt FROM sys_user').get()).cnt,
        livingAloneCount: (await db.prepare('SELECT COUNT(*) as cnt FROM elderly_info WHERE living_alone = 1').get()).cnt,
      }))(),
      db.prepare('SELECT type, COUNT(*) as count FROM alert_record GROUP BY type').all(),
      db.prepare('SELECT type, COUNT(*) as count FROM service_order GROUP BY type').all(),
      db.prepare('SELECT DATE(created_at) as date, COUNT(*) as count FROM alert_record WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date').all(),
      db.prepare("SELECT e.id, e.name, e.phone, e.address FROM elderly_info e WHERE e.health_status IN ('WARNING', 'DANGER') LIMIT 10").all(),
    ]);

    res.json({ code: 200, data: { overview, alertByType, orderByType, alertTrend, healthAbnormal }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.get('/realtime', auth, async (req, res) => {
  try {
    const deviceOnline = (await db.prepare("SELECT COUNT(*) as cnt FROM device_info WHERE status = 'ONLINE'").get()).cnt;
    const todayAlerts = (await db.prepare("SELECT COUNT(*) as cnt FROM alert_record WHERE DATE(created_at) = CURDATE()").get()).cnt;
    const activeOrders = (await db.prepare("SELECT COUNT(*) as cnt FROM service_order WHERE status IN ('CREATED','ASSIGNED','IN_PROGRESS')").get()).cnt;
    const todayCompleted = (await db.prepare("SELECT COUNT(*) as cnt FROM service_order WHERE status = 'COMPLETED' AND DATE(completed_at) = CURDATE()").get()).cnt;
    res.json({ code: 200, data: { deviceOnline, todayAlerts, activeOrders, todayCompleted, updateTime: new Date().toISOString() }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.get('/alert-heatmap', auth, async (req, res) => {
  try {
    const heatmapData = await db.prepare(`SELECT v.id as villageId, v.name as villageName, v.town, v.district, COUNT(a.id) as totalAlerts, SUM(CASE WHEN a.type='FALL' THEN 1 ELSE 0 END) as fallCount, SUM(CASE WHEN a.type IN ('HEALTH_ABNORMAL','HEALTH') THEN 1 ELSE 0 END) as healthCount, SUM(CASE WHEN a.type='DEVICE_OFFLINE' THEN 1 ELSE 0 END) as deviceOfflineCount, SUM(CASE WHEN a.type='SOS' THEN 1 ELSE 0 END) as sosCount, SUM(CASE WHEN a.type='GEO_FENCE' THEN 1 ELSE 0 END) as geoFenceCount, SUM(CASE WHEN a.level='CRITICAL' THEN 1 ELSE 0 END) as criticalCount, SUM(CASE WHEN a.level='HIGH' THEN 1 ELSE 0 END) as highCount, SUM(CASE WHEN a.level='MEDIUM' THEN 1 ELSE 0 END) as mediumCount, SUM(CASE WHEN a.level='LOW' THEN 1 ELSE 0 END) as lowCount FROM village_info v LEFT JOIN elderly_info e ON e.village_id=v.id LEFT JOIN alert_record a ON a.elderly_id=e.id GROUP BY v.id, v.name, v.town, v.district ORDER BY totalAlerts DESC`).all();
    res.json({ code: 200, data: heatmapData, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.get('/service-timeline', auth, async (req, res) => {
  try {
    const avgResponse = await db.prepare('SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, started_at)) as avgResponseMinutes, COUNT(*) as totalProcessed FROM service_order WHERE started_at IS NOT NULL AND created_at IS NOT NULL').get();
    const timeoutOrders = await db.prepare('SELECT COUNT(*) as cnt FROM service_order WHERE started_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, created_at, started_at) > 120').get();
    const dailyResponse = await db.prepare('SELECT DATE(created_at) as date, AVG(CASE WHEN started_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, created_at, started_at) ELSE NULL END) as avgMinutes, COUNT(*) as totalOrders, SUM(CASE WHEN started_at IS NOT NULL THEN 1 ELSE 0 END) as processedOrders FROM service_order WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date').all();
    res.json({ code: 200, data: { avgResponseMinutes: avgResponse.avgResponseMinutes ? Math.round(avgResponse.avgResponseMinutes * 10) / 10 : 0, totalProcessed: avgResponse.totalProcessed || 0, timeoutOrders: timeoutOrders.cnt, dailyResponse }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.get('/device-trend', auth, async (req, res) => {
  try {
    const totalDevices = (await db.prepare('SELECT COUNT(*) as cnt FROM device_info').get()).cnt;
    const hourlyData = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 3600000);
      const hourEnd = new Date(now.getTime() - (i - 1) * 3600000);
      const hourLabel = `${String(hourStart.getHours()).padStart(2, '0')}:00`;
      const onlineCount = (await db.prepare("SELECT COUNT(*) as cnt FROM device_info WHERE status='ONLINE' AND last_heartbeat >= ? AND last_heartbeat < ?").get(hourStart.toISOString().replace('T',' ').slice(0,19), hourEnd.toISOString().replace('T',' ').slice(0,19))).cnt;
      hourlyData.push({ hour: hourLabel, online: onlineCount, offline: totalDevices - onlineCount, onlineRate: totalDevices > 0 ? Math.round((onlineCount / totalDevices) * 10000) / 100 : 0 });
    }
    const currentOnline = (await db.prepare("SELECT COUNT(*) as cnt FROM device_info WHERE status='ONLINE'").get()).cnt;
    res.json({ code: 200, data: { total: totalDevices, currentOnline, currentOffline: totalDevices - currentOnline, currentRate: totalDevices > 0 ? Math.round((currentOnline / totalDevices) * 10000) / 100 : 0, hourlyData }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.get('/elderly-distribution', auth, async (req, res) => {
  try {
    const [byVillage, byAge, byHealth, total, livingAlone] = await Promise.all([
      db.prepare('SELECT v.id as villageId, v.name as villageName, COUNT(e.id) as total, SUM(CASE WHEN e.health_status="GOOD" THEN 1 ELSE 0 END) as good, SUM(CASE WHEN e.health_status="WARNING" THEN 1 ELSE 0 END) as warning, SUM(CASE WHEN e.health_status="DANGER" THEN 1 ELSE 0 END) as danger, SUM(CASE WHEN e.living_alone=1 THEN 1 ELSE 0 END) as livingAlone FROM village_info v LEFT JOIN elderly_info e ON e.village_id=v.id GROUP BY v.id, v.name ORDER BY total DESC').all(),
      db.prepare("SELECT CASE WHEN birth_date IS NULL THEN '未知' WHEN YEAR(NOW())-YEAR(birth_date)<70 THEN '60-69岁' WHEN YEAR(NOW())-YEAR(birth_date)<80 THEN '70-79岁' WHEN YEAR(NOW())-YEAR(birth_date)<90 THEN '80-89岁' ELSE '90岁以上' END as ageGroup, COUNT(*) as count FROM elderly_info GROUP BY ageGroup ORDER BY count DESC").all(),
      db.prepare('SELECT health_status as status, COUNT(*) as count FROM elderly_info GROUP BY health_status ORDER BY count DESC').all(),
      db.prepare('SELECT COUNT(*) as cnt FROM elderly_info').get(),
      db.prepare('SELECT COUNT(*) as cnt FROM elderly_info WHERE living_alone=1').get(),
    ]);
    res.json({ code: 200, data: { total: total.cnt, livingAlone: livingAlone.cnt, byVillage, byAge, byHealth }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

module.exports = router;

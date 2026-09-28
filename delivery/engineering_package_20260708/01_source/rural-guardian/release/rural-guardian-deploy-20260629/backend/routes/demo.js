/**
 * 演示触发器 — 比赛用一键触发完整告警流程
 *
 * POST /api/demo/trigger-sos    → SOS 紧急求助
 * POST /api/demo/trigger-fall   → 跌倒检测
 * GET  /api/demo/flow-status    → 当前流程状态
 */
const express = require('express');
const db = require('../config/db');
const router = express.Router();

// WebSocket 引用（从 server.js 注入）
let wsService = null;
function setWsService(ws) { wsService = ws; }

// 流程状态缓存
const flowState = {
  active: false,
  type: null,
  elderlyName: null,
  elderlyId: null,
  villageName: null,
  step: 0,
  startedAt: null,
  steps: [],
};

// 演示用老人列表
const DEMO_ELDERLY = [
  { id: 1, name: '王福贵', village: '幸福村' },
  { id: 5, name: '张美兰', village: '幸福村' },
];

// ==================== 触发 SOS ====================
router.post('/trigger-sos', async (req, res) => {
  const { elderlyId = 5 } = req.body; // 张美兰
  const elderly = await await db.prepare('SELECT id, name, village_id FROM elderly_info WHERE id = ?').get(elderlyId);
  if (!elderly) return res.json({ code: 404, data: null, message: '老人不存在' });

  const village = await await db.prepare('SELECT name FROM village_info WHERE id = ?').get(elderly.village_id);
  const villageName = village ? village.name : '未知村庄';

  // 创建告警
  const now = new Date().toISOString();
  const desc = `${elderly.name}通过SOS按钮发起紧急求助！位置：天津市蓟州区${villageName}`;
  db.prepare(`INSERT INTO alert_record (elderly_id, type, level, status, description, created_at) VALUES (?, 'SOS', 'CRITICAL', 'PENDING', ?, ?)`)
    .run(elderly.id, desc, now);

  const alertId = await db.prepare('SELECT last_insert_rowid() as id').get().id;

  // 更新手环实时数据的 SOS 标志
  db.prepare(`UPDATE device_realtime SET last_report_at = ? WHERE device_id IN (SELECT id FROM device_info WHERE elderly_id = ? LIMIT 1)`)
    .run(now, elderly.id);

  // 更新流程状态
  flowState.active = true;
  flowState.type = 'SOS';
  flowState.elderlyName = elderly.name;
  flowState.elderlyId = elderly.id;
  flowState.villageName = villageName;
  flowState.step = 1;
  flowState.startedAt = now;
  flowState.steps = [
    { time: now, text: `${elderly.name}触发SOS紧急求助` },
  ];

  // WebSocket 推送给所有在线客户端
  if (wsService) {
    wsService.broadcastToCS({
      type: 'new_alert',
      payload: {
        alertId,
        elderlyId: elderly.id,
        elderlyName: elderly.name,
        villageName,
        type: 'SOS',
        level: 'CRITICAL',
        description: desc,
        createdAt: now,
      },
    });
  }

  console.log(`[DEMO] SOS触发: ${elderly.name} | ${villageName} | Alert#${alertId}`);
  res.json({
    code: 200,
    data: { alertId, elderlyName: elderly.name, villageName, step: 1 },
    message: `SOS触发成功！${elderly.name}正在紧急求助`,
  });
});

// ==================== 触发跌倒 ====================
router.post('/trigger-fall', async (req, res) => {
  const { elderlyId = 1 } = req.body;
  const elderly = await await db.prepare('SELECT id, name, village_id FROM elderly_info WHERE id = ?').get(elderlyId);
  if (!elderly) return res.json({ code: 404, data: null, message: '老人不存在' });

  const village = await await db.prepare('SELECT name FROM village_info WHERE id = ?').get(elderly.village_id);
  const villageName = village ? village.name : '未知村庄';
  const now = new Date().toISOString();

  const desc = `${elderly.name}检测到疑似跌倒！加速度峰值超过阈值，请立即确认安全`;
  db.prepare(`INSERT INTO alert_record (elderly_id, type, level, status, description, created_at) VALUES (?, 'FALL', 'CRITICAL', 'PENDING', ?, ?)`)
    .run(elderly.id, desc, now);

  const alertId = await db.prepare('SELECT last_insert_rowid() as id').get().id;

  // 更新流程
  flowState.active = true;
  flowState.type = 'FALL';
  flowState.elderlyName = elderly.name;
  flowState.elderlyId = elderly.id;
  flowState.villageName = villageName;
  flowState.step = 1;
  flowState.startedAt = now;
  flowState.steps = [{ time: now, text: `${elderly.name}检测到跌倒` }];

  if (wsService) {
    wsService.broadcastToCS({
      type: 'new_alert',
      payload: {
        alertId,
        elderlyId: elderly.id,
        elderlyName: elderly.name,
        villageName,
        type: 'FALL',
        level: 'CRITICAL',
        description: desc,
        createdAt: now,
      },
    });
  }

  console.log(`[DEMO] 跌倒触发: ${elderly.name} | ${villageName} | Alert#${alertId}`);
  res.json({
    code: 200,
    data: { alertId, elderlyName: elderly.name, villageName, step: 1 },
    message: `跌倒检测成功！${elderly.name}可能需要帮助`,
  });
});

// ==================== 处理告警（模拟村级专员） ====================
router.post('/handle-alert', async (req, res) => {
  const { alertId, handlerName = '张为民（村级专员）', action = 'RESOLVED' } = req.body;
  const now = new Date().toISOString();

  db.prepare(`UPDATE alert_record SET status = ?, handler_id = 2, handled_at = ? WHERE id = ?`)
    .run(action, now, alertId);

  flowState.step = 2;
  flowState.steps.push({
    time: now,
    text: `${handlerName}已${action === 'RESOLVED' ? '处理' : '确认'}告警 #${alertId}`,
  });

  if (wsService) {
    wsService.broadcastToCS({
      type: 'alert_handled',
      payload: { alertId, status: action, handlerName, handledAt: now },
    });
  }

  console.log(`[DEMO] 告警#${alertId} 已处理: ${handlerName}`);
  res.json({ code: 200, data: { alertId, status: action }, message: '告警已处理' });
});

// ==================== 流程状态 ====================
router.get('/flow-status', async (req, res) => {
  res.json({
    code: 200,
    data: flowState,
    message: flowState.active ? '演示流程进行中' : '无活跃演示',
  });
});

// ==================== 重置流程 ====================
router.post('/reset', async (req, res) => {
  flowState.active = false;
  flowState.step = 0;
  flowState.steps = [];
  console.log('[DEMO] 流程已重置');
  res.json({ code: 200, data: null, message: '流程已重置' });
});

module.exports = { router, setWsService, flowState };

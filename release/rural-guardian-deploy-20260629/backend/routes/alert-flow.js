const express = require('express');
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ==================== 告警流转核心API ====================

// GET /api/alerts - 告警列表查询
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, type, level, keyword, village_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (status) { where += ' AND ar.status = ?'; params.push(status); }
    if (type) { where += ' AND ar.type = ?'; params.push(type); }
    if (level) { where += ' AND ar.level = ?'; params.push(level); }
    if (keyword) { where += ' AND (ei.name LIKE ? OR ei.address LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (village_id) { where += ' AND ei.village_id = ?'; params.push(village_id); }

    // 角色数据范围隔离
    if (req.user.role === 'VILLAGE_STAFF') {
      where += ' AND ei.village_id = ?';
      params.push(req.user.village_id);
    }

    const countSql = `SELECT COUNT(*) as total FROM alert_record ar LEFT JOIN elderly_info ei ON ar.elderly_id = ei.id ${where}`;
    const total = await db.prepare(countSql).get(...params).total;

    const offset = (page - 1) * pageSize;
    const dataSql = `SELECT ar.*, ei.name as elderly_name, ei.phone as elderly_phone, ei.address as elderly_address, ei.village_id,
      v.name as village_name, u.real_name as handler_name
      FROM alert_record ar
      LEFT JOIN elderly_info ei ON ar.elderly_id = ei.id
      LEFT JOIN village_info v ON ei.village_id = v.id
      LEFT JOIN sys_user u ON ar.handler_id = u.id
      ${where} ORDER BY ar.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), offset);
    const list = await db.prepare(dataSql).all(...params);

    // 获取各状态的流转记录
    const listWithFlow = list.map(async alert => {
      const flowRecords = await db.prepare(
        `SELECT af.*, u.real_name as operator_name FROM alert_flow af LEFT JOIN sys_user u ON af.operator_id = u.id WHERE af.alert_id = ? ORDER BY af.created_at ASC`
      ).all(alert.id);
      return { ...alert, flowRecords };
    });

    res.json({ code: 200, data: { list: listWithFlow, total, page: parseInt(page), pageSize: parseInt(pageSize) }, message: 'success' });
  } catch (err) {
    console.error('获取告警列表失败:', err);
    res.json({ code: 500, data: null, message: '获取告警列表失败' });
  }
});

// GET /api/alerts/:id - 告警详情
router.get('/:id', auth, async (req, res) => {
  try {
    const alert = await db.prepare(
      `SELECT ar.*, ei.name as elderly_name, ei.phone as elderly_phone, ei.address as elderly_address, ei.village_id,
        v.name as village_name, u.real_name as handler_name
        FROM alert_record ar
        LEFT JOIN elderly_info ei ON ar.elderly_id = ei.id
        LEFT JOIN village_info v ON ei.village_id = v.id
        LEFT JOIN sys_user u ON ar.handler_id = u.id
        WHERE ar.id = ?`
    ).get(req.params.id);

    if (!alert) return res.json({ code: 404, data: null, message: '告警不存在' });

    const flowRecords = await db.prepare(
      `SELECT af.*, u.real_name as operator_name FROM alert_flow af LEFT JOIN sys_user u ON af.operator_id = u.id WHERE af.alert_id = ? ORDER BY af.created_at ASC`
    ).all(alert.id);

    res.json({ code: 200, data: { ...alert, flowRecords }, message: 'success' });
  } catch (err) {
    console.error('获取告警详情失败:', err);
    res.json({ code: 500, data: null, message: '获取告警详情失败' });
  }
});

// POST /api/alerts/:id/accept - 接单（村级专员）
router.post('/:id/accept', auth, requireRole('VILLAGE_STAFF', 'GOV_ADMIN'), async (req, res) => {
  try {
    const alertId = req.params.id;
    const handlerId = req.user.id;
    const handlerRole = req.user.role;

    // 检查告警是否存在且状态为待处理
    const alert = await db.prepare('SELECT * FROM alert_record WHERE id = ?').get(alertId);
    if (!alert) {
      return res.json({ code: 404, data: null, message: '告警不存在' });
    }
    if (alert.status !== 'PENDING') {
      return res.json({ code: 400, data: null, message: '告警已被处理或正在处理中' });
    }

    // 数据范围检查（村级专员只能处理本村老人的告警）
    if (handlerRole === 'VILLAGE_STAFF') {
      const elderly = await db.prepare('SELECT village_id FROM elderly_info WHERE id = ?').get(alert.elderly_id);
      const staff = await db.prepare('SELECT village_id FROM sys_user WHERE id = ?').get(handlerId);
      if (elderly.village_id !== staff.village_id) {
        return res.json({ code: 403, data: null, message: '无权处理其他村庄的告警' });
      }
    }

    // 更新告警状态
    db.prepare(`
      UPDATE alert_record 
      SET status = 'PROCESSING', handler_id = ?, current_handler_id = ?, handled_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(handlerId, handlerId, alertId);

    // 记录流转
    db.prepare(`
      INSERT INTO alert_flow (alert_id, action, operator_id, operator_role, from_status, to_status, remark)
      VALUES (?, 'ACCEPT', ?, ?, 'PENDING', 'PROCESSING', '专员接单')
    `).run(alertId, handlerId, handlerRole);

    res.json({ code: 200, data: { id: alertId, status: 'PROCESSING' }, message: '接单成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/alerts/:id/process - 处置完成
router.put('/:id/process', auth, requireRole('VILLAGE_STAFF', 'GOV_ADMIN'), async (req, res) => {
  try {
    const alertId = req.params.id;
    const { result, remark, needConfirm } = req.body;
    const handlerId = req.user.id;
    const handlerRole = req.user.role;

    const alert = await db.prepare('SELECT * FROM alert_record WHERE id = ?').get(alertId);
    if (!alert) {
      return res.json({ code: 404, data: null, message: '告警不存在' });
    }
    if (alert.status !== 'PROCESSING') {
      return res.json({ code: 400, data: null, message: '告警不在处理中状态' });
    }

    // 检查是否是当前处理人
    if (alert.current_handler_id !== handlerId && handlerRole !== 'GOV_ADMIN') {
      return res.json({ code: 403, data: null, message: '只有当前处理人可以提交处置结果' });
    }

    // 如果需要家属确认，状态变为待确认
    const newStatus = needConfirm ? 'PENDING_CONFIRM' : 'RESOLVED';
    
    await db.prepare(`
      UPDATE alert_record
      SET status = ?, description = CONCAT(COALESCE(description,''), '\n处置结果：', ?)
      WHERE id = ?
    `).run(newStatus, result, alertId);

    // 记录流转
    await db.prepare(`
      INSERT INTO alert_flow (alert_id, action, operator_id, operator_role, from_status, to_status, remark)
      VALUES (?, 'PROCESS', ?, ?, 'PROCESSING', ?, ?)
    `).run(alertId, handlerId, handlerRole, newStatus, remark || result);

    // 如果需要家属确认，发送通知
    if (needConfirm) {
      const familyMembers = await db.prepare(`
        SELECT u.id FROM sys_user u 
        JOIN family_member fm ON u.id = fm.user_id 
        WHERE fm.elderly_id = ?
      `).all(alert.elderly_id);
      
      for (const member of familyMembers) {
        await db.prepare(`
          INSERT INTO alert_notification (alert_id, channel, recipient_id, recipient_role, status)
          VALUES (?, 'APP_PUSH', ?, 'FAMILY_MEMBER', 'PENDING')
        `).run(alertId, member.id);
      }
    }

    res.json({ code: 200, data: { id: alertId, status: newStatus }, message: '处置提交成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/alerts/:id/confirm - 家属确认
router.put('/:id/confirm', auth, requireRole('FAMILY_MEMBER'), async (req, res) => {
  try {
    const alertId = req.params.id;
    const { confirmed, appealReason } = req.body;
    const familyId = req.user.id;

    const alert = await db.prepare('SELECT * FROM alert_record WHERE id = ?').get(alertId);
    if (!alert) {
      return res.json({ code: 404, data: null, message: '告警不存在' });
    }
    if (alert.status !== 'PENDING_CONFIRM') {
      return res.json({ code: 400, data: null, message: '告警不处于待确认状态' });
    }

    // 检查是否是绑定家属
    const isFamily = await await db.prepare(`
      SELECT 1 FROM family_member WHERE elderly_id = ? AND user_id = ?
    `).get(alert.elderly_id, familyId);
    if (!isFamily) {
      return res.json({ code: 403, data: null, message: '只有绑定家属可以确认' });
    }

    if (confirmed) {
      // 确认通过，告警关闭
      db.prepare(`
        UPDATE alert_record 
        SET status = 'RESOLVED', family_confirmed = 1, family_confirm_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(alertId);

      db.prepare(`
        INSERT INTO alert_flow (alert_id, action, operator_id, operator_role, from_status, to_status, remark)
        VALUES (?, 'CONFIRM', ?, 'FAMILY_MEMBER', 'PENDING_CONFIRM', 'RESOLVED', '家属确认通过')
      `).run(alertId, familyId);

      res.json({ code: 200, data: { id: alertId, status: 'RESOLVED' }, message: '确认成功' });
    } else {
      // 申诉，告警重新打开
      await db.prepare(`
        UPDATE alert_record 
        SET status = 'PENDING', family_confirmed = 0
        WHERE id = ?
      `).run(alertId);

      db.prepare(`
        INSERT INTO alert_flow (alert_id, action, operator_id, operator_role, from_status, to_status, remark)
        VALUES (?, 'APPEAL', ?, 'FAMILY_MEMBER', 'PENDING_CONFIRM', 'PENDING', ?)
      `).run(alertId, familyId, appealReason || '家属申诉');

      res.json({ code: 200, data: { id: alertId, status: 'PENDING' }, message: '申诉已提交，将重新处理' });
    }
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// POST /api/alerts/:id/escalate - 升级告警
router.post('/:id/escalate', auth, requireRole('VILLAGE_STAFF', 'GOV_ADMIN'), async (req, res) => {
  try {
    const alertId = req.params.id;
    const { reason } = req.body;
    const operatorId = req.user.id;
    const operatorRole = req.user.role;

    const alert = await db.prepare('SELECT * FROM alert_record WHERE id = ?').get(alertId);
    if (!alert) {
      return res.json({ code: 404, data: null, message: '告警不存在' });
    }

    const newLevel = (alert.escalation_level || 0) + 1;
    
    await db.prepare(`
      UPDATE alert_record 
      SET escalation_level = ?, status = 'PENDING', current_handler_id = NULL
      WHERE id = ?
    `).run(newLevel, alertId);

    db.prepare(`
      INSERT INTO alert_flow (alert_id, action, operator_id, operator_role, from_status, to_status, remark)
      VALUES (?, 'ESCALATE', ?, ?, ?, 'PENDING', ?)
    `).run(alertId, operatorId, operatorRole, alert.status, `升级至${newLevel}级：${reason || ''}`);

    res.json({ code: 200, data: { id: alertId, escalationLevel: newLevel }, message: '告警已升级' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// GET /api/alerts/:id/flow - 获取告警流转记录
router.get('/:id/flow', auth, async (req, res) => {
  try {
    const alertId = req.params.id;
    
    const flows = await db.prepare(`
      SELECT af.*, u.real_name as operator_name
      FROM alert_flow af
      LEFT JOIN sys_user u ON af.operator_id = u.id
      WHERE af.alert_id = ?
      ORDER BY af.created_at ASC
    `).all(alertId);

    res.json({ code: 200, data: flows, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// GET /api/alerts/pending - 获取待处理告警列表（按角色过滤）
router.get('/pending', auth, async (req, res) => {
  try {
    const { role, villageId } = req.user;
    const { level, type } = req.query;
    
    let where = "WHERE ar.status IN ('PENDING', 'PROCESSING', 'PENDING_CONFIRM')";
    const params = [];

    // 数据范围过滤
    if (role === 'VILLAGE_STAFF') {
      where += " AND ei.village_id = (SELECT village_id FROM sys_user WHERE id = ?)";
      params.push(req.user.id);
    } else if (role === 'FAMILY_MEMBER') {
      where += " AND EXISTS (SELECT 1 FROM family_member fm WHERE fm.elderly_id = ar.elderly_id AND fm.user_id = ?)";
      params.push(req.user.id);
    }

    if (level) {
      where += " AND ar.level = ?";
      params.push(level);
    }
    if (type) {
      where += " AND ar.type = ?";
      params.push(type);
    }

    const alerts = await db.prepare(`
      SELECT ar.*, ei.name as elderly_name, ei.phone as elderly_phone, ei.address,
             v.name as village_name, u.real_name as handler_name
      FROM alert_record ar
      JOIN elderly_info ei ON ar.elderly_id = ei.id
      LEFT JOIN village_info v ON ei.village_id = v.id
      LEFT JOIN sys_user u ON ar.current_handler_id = u.id
      ${where}
      ORDER BY 
        CASE ar.level 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END,
        ar.created_at DESC
    `).all(...params);

    res.json({ code: 200, data: alerts, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

module.exports = router;

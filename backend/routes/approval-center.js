const express = require('express');
const db = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ==================== 审批中心API ====================

// GET /api/approvals - 获取审批列表（按角色过滤）
router.get('/', auth, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { type, status = 'PENDING', page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    let approvals = [];
    let total = 0;

    // 家属绑定审批（村级专员/政府管理员可见）
    if (!type || type === 'FAMILY_BINDING') {
      if (role === 'VILLAGE_STAFF' || role === 'GOV_ADMIN') {
        let where = "WHERE fba.status = ?";
        const params = [status];

        if (role === 'VILLAGE_STAFF') {
          where += " AND ei.village_id = (SELECT village_id FROM sys_user WHERE id = ?)";
          params.push(userId);
        }

        const bindings = await db.prepare(`
          SELECT fba.*, ei.name as elderly_name, ei.phone as elderly_phone,
                 u.real_name as applicant_name, u.phone as applicant_phone,
                 v.name as village_name
          FROM family_binding_approval fba
          JOIN elderly_info ei ON fba.elderly_id = ei.id
          JOIN sys_user u ON fba.user_id = u.id
          LEFT JOIN village_info v ON ei.village_id = v.id
          ${where}
          ORDER BY fba.created_at DESC
          LIMIT ? OFFSET ?
        `).all(...params, pageSize, offset);

        const countResult = await db.prepare(`
          SELECT COUNT(*) as cnt FROM family_binding_approval fba
          JOIN elderly_info ei ON fba.elderly_id = ei.id
          ${where}
        `).get(...params);

        approvals = approvals.concat(bindings.map(b => ({ ...b, approval_type: 'FAMILY_BINDING' })));
        total += countResult.cnt;
      }
    }

    // 设备绑定审批（村级专员/政府管理员可见）
    if (!type || type === 'DEVICE_BINDING') {
      if (role === 'VILLAGE_STAFF' || role === 'GOV_ADMIN') {
        let where = "WHERE dba.status = ?";
        const params = [status];

        if (role === 'VILLAGE_STAFF') {
          where += " AND ei.village_id = (SELECT village_id FROM sys_user WHERE id = ?)";
          params.push(userId);
        }

        const deviceBindings = await db.prepare(`
          SELECT dba.*, ei.name as elderly_name, di.device_sn, di.type as device_type,
                 u.real_name as operator_name
          FROM device_binding_approval dba
          JOIN elderly_info ei ON dba.elderly_id = ei.id
          JOIN device_info di ON dba.device_id = di.id
          JOIN sys_user u ON dba.operator_id = u.id
          ${where}
          ORDER BY dba.created_at DESC
          LIMIT ? OFFSET ?
        `).all(...params, pageSize, offset);

        const countResult = await db.prepare(`
          SELECT COUNT(*) as cnt FROM device_binding_approval dba
          JOIN elderly_info ei ON dba.elderly_id = ei.id
          ${where}
        `).get(...params);

        approvals = approvals.concat(deviceBindings.map(d => ({ ...d, approval_type: 'DEVICE_BINDING' })));
        total += countResult.cnt;
      }
    }

    // 服务商认证审批（政府管理员可见）
    if (!type || type === 'PROVIDER_CERT') {
      if (role === 'GOV_ADMIN') {
        const certs = await db.prepare(`
          SELECT pc.*, pi.name as provider_name, pi.contact_person, pi.contact_phone
          FROM provider_certification pc
          JOIN provider_info pi ON pc.provider_id = pi.id
          WHERE pc.status = ?
          ORDER BY pc.created_at DESC
          LIMIT ? OFFSET ?
        `).all(status, pageSize, offset);

        const countResult = await db.prepare(`
          SELECT COUNT(*) as cnt FROM provider_certification WHERE status = ?
        `).get(status);

        approvals = approvals.concat(certs.map(c => ({ ...c, approval_type: 'PROVIDER_CERT' })));
        total += countResult.cnt;
      }
    }

    res.json({ code: 200, data: { list: approvals, total, page: Number(page), pageSize: Number(pageSize) }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// POST /api/approvals/family-binding - 申请家属绑定
router.post('/family-binding', auth, requireRole('FAMILY_MEMBER'), async (req, res) => {
  try {
    const { elderlyId, relationship, relationshipProof } = req.body;
    const userId = req.user.id;

    // 检查老人是否存在
    const elderly = await db.prepare('SELECT * FROM elderly_info WHERE id = ?').get(elderlyId);
    if (!elderly) {
      return res.json({ code: 404, data: null, message: '老人不存在' });
    }

    // 检查是否已绑定
    const existing = await db.prepare('SELECT * FROM family_member WHERE elderly_id = ? AND user_id = ?').get(elderlyId, userId);
    if (existing) {
      return res.json({ code: 400, data: null, message: '您已绑定该老人' });
    }

    // 检查是否有待审批的申请
    const pending = await db.prepare('SELECT * FROM family_binding_approval WHERE elderly_id = ? AND user_id = ? AND status = "PENDING"').get(elderlyId, userId);
    if (pending) {
      return res.json({ code: 400, data: null, message: '已有待审批的绑定申请' });
    }

    const result = await db.prepare(`
      INSERT INTO family_binding_approval (elderly_id, user_id, relationship, relationship_proof, applicant_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(elderlyId, userId, relationship, relationshipProof, userId);

    res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '绑定申请已提交，等待审批' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/approvals/family-binding/:id/approve - 审批家属绑定
router.put('/family-binding/:id/approve', auth, requireRole('VILLAGE_STAFF', 'GOV_ADMIN'), async (req, res) => {
  try {
    const approvalId = req.params.id;
    const { approved, remark } = req.body;
    const approverId = req.user.id;
    const role = req.user.role;

    const approval = await db.prepare('SELECT * FROM family_binding_approval WHERE id = ?').get(approvalId);
    if (!approval) {
      return res.json({ code: 404, data: null, message: '审批记录不存在' });
    }
    if (approval.status !== 'PENDING') {
      return res.json({ code: 400, data: null, message: '审批已处理' });
    }

    // 数据范围检查
    if (role === 'VILLAGE_STAFF') {
      const elderly = await db.prepare('SELECT village_id FROM elderly_info WHERE id = ?').get(approval.elderly_id);
      const staff = await db.prepare('SELECT village_id FROM sys_user WHERE id = ?').get(approverId);
      if (elderly.village_id !== staff.village_id) {
        return res.json({ code: 403, data: null, message: '无权审批其他村庄的申请' });
      }
    }

    const newStatus = approved ? 'APPROVED' : 'REJECTED';

    db.prepare(`
      UPDATE family_binding_approval 
      SET status = ?, approver_id = ?, approve_remark = ?, processed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(newStatus, approverId, remark, approvalId);

    // 如果通过，创建家属关联
    if (approved) {
      db.prepare(`
        INSERT INTO family_member (user_id, elderly_id, relationship, phone)
        VALUES (?, ?, ?, (SELECT phone FROM sys_user WHERE id = ?))
      `).run(approval.user_id, approval.elderly_id, approval.relationship, approval.user_id);
    }

    res.json({ code: 200, data: { id: approvalId, status: newStatus }, message: approved ? '审批通过' : '审批已拒绝' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// POST /api/approvals/device-binding - 申请设备绑定
router.post('/device-binding', auth, requireRole('VILLAGE_STAFF'), async (req, res) => {
  try {
    const { deviceId, elderlyId, bindType = 'BIND', reason } = req.body;
    const operatorId = req.user.id;

    // 检查设备是否存在
    const device = await db.prepare('SELECT * FROM device_info WHERE id = ?').get(deviceId);
    if (!device) {
      return res.json({ code: 404, data: null, message: '设备不存在' });
    }

    // 检查老人是否存在
    const elderly = await db.prepare('SELECT * FROM elderly_info WHERE id = ?').get(elderlyId);
    if (!elderly) {
      return res.json({ code: 404, data: null, message: '老人不存在' });
    }

    // 数据范围检查
    const staff = await db.prepare('SELECT village_id FROM sys_user WHERE id = ?').get(operatorId);
    if (elderly.village_id !== staff.village_id) {
      return res.json({ code: 403, data: null, message: '无权操作其他村庄的设备' });
    }

    // 检查是否有待审批的申请
    const pending = await db.prepare(`
      SELECT * FROM device_binding_approval 
      WHERE device_id = ? AND elderly_id = ? AND status = "PENDING"
    `).get(deviceId, elderlyId);
    if (pending) {
      return res.json({ code: 400, data: null, message: '已有待审批的绑定申请' });
    }

    const result = await db.prepare(`
      INSERT INTO device_binding_approval (device_id, elderly_id, operator_id, bind_type, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(deviceId, elderlyId, operatorId, bindType, reason);

    res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '设备绑定申请已提交' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/approvals/device-binding/:id/approve - 审批设备绑定
router.put('/device-binding/:id/approve', auth, requireRole('VILLAGE_STAFF', 'GOV_ADMIN'), async (req, res) => {
  try {
    const approvalId = req.params.id;
    const { approved, remark } = req.body;
    const approverId = req.user.id;
    const role = req.user.role;

    const approval = await db.prepare('SELECT * FROM device_binding_approval WHERE id = ?').get(approvalId);
    if (!approval) {
      return res.json({ code: 404, data: null, message: '审批记录不存在' });
    }
    if (approval.status !== 'PENDING') {
      return res.json({ code: 400, data: null, message: '审批已处理' });
    }

    // 数据范围检查
    if (role === 'VILLAGE_STAFF') {
      const elderly = await db.prepare('SELECT village_id FROM elderly_info WHERE id = ?').get(approval.elderly_id);
      const staff = await db.prepare('SELECT village_id FROM sys_user WHERE id = ?').get(approverId);
      if (elderly.village_id !== staff.village_id) {
        return res.json({ code: 403, data: null, message: '无权审批其他村庄的申请' });
      }
    }

    const newStatus = approved ? 'APPROVED' : 'REJECTED';

    db.prepare(`
      UPDATE device_binding_approval 
      SET status = ?, approver_id = ?, approve_remark = ?, processed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(newStatus, approverId, remark, approvalId);

    // 如果通过，执行绑定/解绑操作
    if (approved) {
      if (approval.bind_type === 'BIND') {
  await db.prepare('UPDATE device_info SET elderly_id = ? WHERE id = ?').run(approval.elderly_id, approval.device_id);
      } else {
  await db.prepare('UPDATE device_info SET elderly_id = NULL WHERE id = ?').run(approval.device_id);
      }
    }

    res.json({ code: 200, data: { id: approvalId, status: newStatus }, message: approved ? '审批通过' : '审批已拒绝' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// POST /api/approvals/provider-cert - 提交服务商认证
router.post('/provider-cert', auth, requireRole('PROVIDER'), async (req, res) => {
  try {
    const { certType, certNumber, certImage, businessLicense, serviceQualification } = req.body;
    const providerInfo = await db.prepare('SELECT id FROM provider_info WHERE user_id = ?').get(req.user.id);
    if (!providerInfo) return res.json({ code: 400, data: null, message: '服务商信息不存在' });
    const providerId = providerInfo.id;

    // 检查是否已有待审批的认证
    const pending = await db.prepare('SELECT * FROM provider_certification WHERE provider_id = ? AND status = "PENDING"').get(providerId);
    if (pending) {
      return res.json({ code: 400, data: null, message: '已有待审批的认证申请' });
    }

    const result = await db.prepare(`
      INSERT INTO provider_certification (provider_id, cert_type, cert_number, cert_image, business_license, service_qualification, submitter_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(providerId, certType, certNumber, certImage, businessLicense, serviceQualification, providerId);

    // 更新服务商认证状态
  await db.prepare('UPDATE provider_info SET cert_status = "PENDING" WHERE id = ?').run(providerId);

    res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '认证申请已提交' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/approvals/provider-cert/:id/approve - 审批服务商认证
router.put('/provider-cert/:id/approve', auth, requireRole('GOV_ADMIN'), async (req, res) => {
  try {
    const certId = req.params.id;
    const { approved, remark } = req.body;
    const reviewerId = req.user.id;

    const cert = await db.prepare('SELECT * FROM provider_certification WHERE id = ?').get(certId);
    if (!cert) {
      return res.json({ code: 404, data: null, message: '认证记录不存在' });
    }
    if (cert.status !== 'PENDING') {
      return res.json({ code: 400, data: null, message: '认证已处理' });
    }

    const newStatus = approved ? 'APPROVED' : 'REJECTED';

    db.prepare(`
      UPDATE provider_certification 
      SET status = ?, reviewer_id = ?, review_remark = ?, reviewed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(newStatus, reviewerId, remark, certId);

    // 更新服务商认证状态
  await db.prepare('UPDATE provider_info SET cert_status = ?, cert_date = datetime("now", "localtime") WHERE id = ?').run(newStatus, cert.provider_id);

    res.json({ code: 200, data: { id: certId, status: newStatus }, message: approved ? '认证通过' : '认证已拒绝' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// GET /api/approvals/my - 获取我的申请记录
router.get('/my', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, status } = req.query;

    let results = [];

    // 家属绑定申请
    if (!type || type === 'FAMILY_BINDING') {
      const bindings = await db.prepare(`
        SELECT fba.*, ei.name as elderly_name
        FROM family_binding_approval fba
        JOIN elderly_info ei ON fba.elderly_id = ei.id
        WHERE fba.user_id = ? ${status ? 'AND fba.status = ?' : ''}
        ORDER BY fba.created_at DESC
      `).all(userId, ...(status ? [status] : []));
      results = results.concat(bindings.map(b => ({ ...b, approval_type: 'FAMILY_BINDING' })));
    }

    // 服务商认证申请
    if (!type || type === 'PROVIDER_CERT') {
      const certs = await db.prepare(`
        SELECT pc.*, pi.name as provider_name
        FROM provider_certification pc
        JOIN provider_info pi ON pc.provider_id = pi.id
        WHERE pc.submitter_id = ? ${status ? 'AND pc.status = ?' : ''}
        ORDER BY pc.created_at DESC
      `).all(userId, ...(status ? [status] : []));
      results = results.concat(certs.map(c => ({ ...c, approval_type: 'PROVIDER_CERT' })));
    }

    res.json({ code: 200, data: results, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// GET /api/approvals/pending-count - 待处理审批数量统计
router.get('/pending-count', auth, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let total = 0;

    if (role === 'VILLAGE_STAFF' || role === 'GOV_ADMIN') {
      const familyCount = await db.prepare(`
        SELECT COUNT(*) as cnt FROM family_binding_approval fba
        JOIN elderly_info ei ON fba.elderly_id = ei.id
        WHERE fba.status = 'PENDING'
        ${role === 'VILLAGE_STAFF' ? "AND ei.village_id = (SELECT village_id FROM sys_user WHERE id = ?)" : ''}
      `).get(...(role === 'VILLAGE_STAFF' ? [userId] : []));
      total += familyCount.cnt;

      const deviceCount = await db.prepare(`
        SELECT COUNT(*) as cnt FROM device_binding_approval dba
        JOIN elderly_info ei ON dba.elderly_id = ei.id
        WHERE dba.status = 'PENDING'
        ${role === 'VILLAGE_STAFF' ? "AND ei.village_id = (SELECT village_id FROM sys_user WHERE id = ?)" : ''}
      `).get(...(role === 'VILLAGE_STAFF' ? [userId] : []));
      total += deviceCount.cnt;
    }

    if (role === 'GOV_ADMIN') {
      const certCount = await db.prepare(`
        SELECT COUNT(*) as cnt FROM provider_certification WHERE status = 'PENDING'
      `).get();
      total += certCount.cnt;
    }

    res.json({ code: 200, data: { total }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// GET /api/approvals/stats - 审批统计（按状态分组）
router.get('/stats', auth, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const stats = { PENDING: 0, APPROVED: 0, REJECTED: 0 };

    if (role === 'VILLAGE_STAFF' || role === 'GOV_ADMIN') {
      const familyStats = await db.prepare(`
        SELECT fba.status, COUNT(*) as cnt FROM family_binding_approval fba
        JOIN elderly_info ei ON fba.elderly_id = ei.id
        ${role === 'VILLAGE_STAFF' ? "WHERE ei.village_id = (SELECT village_id FROM sys_user WHERE id = ?)" : ''}
        GROUP BY fba.status
      `).all(...(role === 'VILLAGE_STAFF' ? [userId] : []));
      familyStats.forEach(row => { stats[row.status] = (stats[row.status] || 0) + row.cnt; });

      const deviceStats = await db.prepare(`
        SELECT dba.status, COUNT(*) as cnt FROM device_binding_approval dba
        JOIN elderly_info ei ON dba.elderly_id = ei.id
        ${role === 'VILLAGE_STAFF' ? "WHERE ei.village_id = (SELECT village_id FROM sys_user WHERE id = ?)" : ''}
        GROUP BY dba.status
      `).all(...(role === 'VILLAGE_STAFF' ? [userId] : []));
      deviceStats.forEach(row => { stats[row.status] = (stats[row.status] || 0) + row.cnt; });
    }

    if (role === 'GOV_ADMIN') {
      const certStats = await db.prepare(`
        SELECT status, COUNT(*) as cnt FROM provider_certification GROUP BY status
      `).all();
      certStats.forEach(row => { stats[row.status] = (stats[row.status] || 0) + row.cnt; });
    }

    res.json({ code: 200, data: stats, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

module.exports = router;

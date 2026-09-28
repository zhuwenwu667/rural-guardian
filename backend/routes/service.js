const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const https = require('https');
const http = require('http');

// 所有服务路由需要登录
router.use(authMiddleware.auth);

// ==================== 服务总览统计 ====================

// 获取各服务状态概览
router.get('/overview', async (req, res) => {
  try {
    const groups = ['ai', 'voice', 'map', 'sms', 'push'];
    const overview = {};

    for (const group of groups) {
      const enabled = await db.prepare("SELECT config_value FROM system_config WHERE config_key = ?").get(`${group}_enabled`);
      const todayCount = await db.prepare(
        "SELECT COUNT(*) as cnt FROM service_call_log WHERE service_group = ? AND created_at >= date('now', 'localtime')"
      ).get(group);
      const successCount = await db.prepare(
        "SELECT COUNT(*) as cnt FROM service_call_log WHERE service_group = ? AND status = 'success' AND created_at >= date('now', 'localtime')"
      ).get(group);
      const failCount = await db.prepare(
        "SELECT COUNT(*) as cnt FROM service_call_log WHERE service_group = ? AND status = 'fail' AND created_at >= date('now', 'localtime')"
      ).get(group);
      const avgDuration = await db.prepare(
        "SELECT COALESCE(CAST(AVG(duration_ms) AS INTEGER), 0) as avg FROM service_call_log WHERE service_group = ? AND status = 'success' AND created_at >= date('now', 'localtime')"
      ).get(group);

      // 检查关键配置是否已填写
      let configured = false;
      if (group === 'ai') {
        const key = await db.prepare("SELECT config_value FROM system_config WHERE config_key = 'ai_api_key'").get();
        configured = !!(key && key.config_value);
      } else if (group === 'voice') {
        const key = await db.prepare("SELECT config_value FROM system_config WHERE config_key = 'xfyun_api_key'").get();
        configured = !!(key && key.config_value);
      } else if (group === 'map') {
        const key = await db.prepare("SELECT config_value FROM system_config WHERE config_key = 'map_api_key'").get();
        configured = !!(key && key.config_value);
      } else if (group === 'sms') {
        const key = await db.prepare("SELECT config_value FROM system_config WHERE config_key = 'sms_access_key_id'").get();
        configured = !!(key && key.config_value);
      } else if (group === 'push') {
        const key = await db.prepare("SELECT config_value FROM system_config WHERE config_key = 'push_app_key'").get();
        configured = !!(key && key.config_value);
      }

      overview[group] = {
        enabled: enabled ? enabled.config_value === 'true' : false,
        configured,
        todayCalls: todayCount.cnt,
        todaySuccess: successCount.cnt,
        todayFail: failCount.cnt,
        avgDuration: avgDuration.avg,
      };
    }

    res.json({ code: 200, data: overview, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// 获取24小时调用量趋势
router.get('/trend', async (req, res) => {
  try {
    const hours = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now - i * 3600000);
      const hourStr = h.toISOString().replace('T', ' ').substring(0, 13);
      const nextHourStr = new Date(h.getTime() + 3600000).toISOString().replace('T', ' ').substring(0, 13);

      const total = await db.prepare(
        "SELECT COUNT(*) as cnt FROM service_call_log WHERE created_at >= ? AND created_at < ?"
      ).get(hourStr, nextHourStr).cnt;

      hours.push({
        hour: `${String(h.getHours()).padStart(2, '0')}:00`,
        total,
      });
    }
    res.json({ code: 200, data: hours, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// ==================== 服务调用日志 ====================

// 获取日志列表
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, group, status, startDate, endDate } = req.query;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const params = [];
    if (group) { where += ' AND service_group = ?'; params.push(group); }
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (startDate) { where += ' AND created_at >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND created_at <= ?'; params.push(endDate + ' 23:59:59'); }

    const total = await db.prepare(`SELECT COUNT(*) as cnt FROM service_call_log WHERE ${where}`).get(...params).cnt;
    const list = await db.prepare(
      `SELECT * FROM service_call_log WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, Number(pageSize), offset);

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// ==================== 测试连接 ====================

// 测试服务连接
router.post('/test', async (req, res) => {
  try {
    const { group } = req.body;
    if (!group) return res.json({ code: 400, data: null, message: '缺少 group 参数' });

    const startTime = Date.now();
    let result = { success: false, message: '' };

    if (group === 'ai') {
      result = await testAIConnection();
    } else if (group === 'voice') {
      result = await testVoiceConnection();
    } else if (group === 'map') {
      result = await testMapConnection();
    } else if (group === 'sms') {
      result = testSMSConnection();
    } else if (group === 'push') {
      result = testPushConnection();
    } else {
      return res.json({ code: 400, data: null, message: '不支持的服务类型' });
    }

    const duration = Date.now() - startTime;

    // 记录日志
    db.prepare(`
      INSERT INTO service_call_log (service_group, action, status, error_msg, duration_ms)
      VALUES (?, 'test_connection', ?, ?, ?)
    `).run(group, result.success ? 'success' : 'fail', result.message, duration);

    res.json({ code: 200, data: { ...result, duration }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// AI 对话测试
router.post('/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ code: 400, data: null, message: '缺少 message 参数' });

    const provider = getConfig('ai_provider', 'zhipu');
    const apiKey = getConfig('ai_api_key', '');
    const apiUrl = getConfig('ai_api_url', 'https://open.bigmodel.cn/api/paas/v4/chat/completions');
    const model = getConfig('ai_model', 'glm-4-flash');

    if (!apiKey) return res.json({ code: 400, data: null, message: '请先配置 AI API Key' });

    const startTime = Date.now();

    try {
      const reply = await callAI(apiUrl, apiKey, model, message);
      const duration = Date.now() - startTime;

      db.prepare(`
        INSERT INTO service_call_log (service_group, action, status, request_data, response_data, duration_ms, token_used)
        VALUES (?, 'chat', 'success', ?, ?, ?, 0)
      `).run('ai', message, reply, duration);

      res.json({ code: 200, data: { reply, duration }, message: 'success' });
    } catch (err) {
      const duration = Date.now() - startTime;
      db.prepare(`
        INSERT INTO service_call_log (service_group, action, status, error_msg, duration_ms)
        VALUES (?, 'chat', 'fail', ?, ?)
      `).run('ai', err.message, duration);
      res.json({ code: 500, data: null, message: `AI 调用失败: ${err.message}` });
    }
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// ==================== 消息模板 CRUD ====================

router.get('/templates', async (req, res) => {
  try {
    const { type, channel, status } = req.query;
    let where = '1=1';
    const params = [];
    if (type) { where += ' AND type = ?'; params.push(type); }
    if (channel) { where += ' AND channel = ?'; params.push(channel); }
    if (status !== undefined) { where += ' AND status = ?'; params.push(status); }

    const list = await db.prepare(`SELECT * FROM message_template WHERE ${where} ORDER BY created_at DESC`).all(...params);
    res.json({ code: 200, data: list, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { name, type, channel, content, variables, status = 1 } = req.body;
    if (!name || !type || !channel || !content) {
      return res.json({ code: 400, data: null, message: '缺少必填字段' });
    }
    const result = await db.prepare(
      'INSERT INTO message_template (name, type, channel, content, variables, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, type, channel, content, variables || null, status);
    res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '创建成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const { name, type, channel, content, variables, status } = req.body;
    const existing = await db.prepare('SELECT id FROM message_template WHERE id = ?').get(req.params.id);
    if (!existing) return res.json({ code: 404, data: null, message: '模板不存在' });

    db.prepare(`
      UPDATE message_template SET
        name = COALESCE(?, name), type = COALESCE(?, type), channel = COALESCE(?, channel),
        content = COALESCE(?, content), variables = COALESCE(?, variables),
        status = COALESCE(?, status), updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(name, type, channel, content, variables, status, req.params.id);
    res.json({ code: 200, data: null, message: '更新成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
  await db.prepare('DELETE FROM message_template WHERE id = ?').run(req.params.id);
    res.json({ code: 200, data: null, message: '删除成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// ==================== 电子围栏 CRUD ====================

router.get('/fences', async (req, res) => {
  try {
    const { village_id, status } = req.query;
    let where = '1=1';
    const params = [];
    if (village_id) { where += ' AND village_id = ?'; params.push(village_id); }
    if (status !== undefined) { where += ' AND status = ?'; params.push(status); }

    const list = await db.prepare(`
      SELECT f.*, v.name as village_name
      FROM geo_fence f LEFT JOIN village_info v ON f.village_id = v.id
      WHERE ${where} ORDER BY f.created_at DESC
    `).all(...params);
    res.json({ code: 200, data: list, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.post('/fences', async (req, res) => {
  try {
    const { name, longitude, latitude, radius = 500, village_id, status = 1 } = req.body;
    if (!name || longitude === undefined || latitude === undefined) {
      return res.json({ code: 400, data: null, message: '缺少必填字段（名称、经纬度）' });
    }
    const result = await db.prepare(
      'INSERT INTO geo_fence (name, longitude, latitude, radius, village_id, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, longitude, latitude, radius, village_id || null, status);
    res.json({ code: 200, data: { id: result.lastInsertRowid }, message: '创建成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.put('/fences/:id', async (req, res) => {
  try {
    const { name, longitude, latitude, radius, village_id, status } = req.body;
    const existing = await db.prepare('SELECT id FROM geo_fence WHERE id = ?').get(req.params.id);
    if (!existing) return res.json({ code: 404, data: null, message: '围栏不存在' });

    db.prepare(`
      UPDATE geo_fence SET
        name = COALESCE(?, name), longitude = COALESCE(?, longitude), latitude = COALESCE(?, latitude),
        radius = COALESCE(?, radius), village_id = COALESCE(?, village_id), status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, longitude, latitude, radius, village_id, status, req.params.id);
    res.json({ code: 200, data: null, message: '更新成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

router.delete('/fences/:id', async (req, res) => {
  try {
  await db.prepare('DELETE FROM geo_fence WHERE id = ?').run(req.params.id);
    res.json({ code: 200, data: null, message: '删除成功' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// ==================== 辅助函数 ====================

async function getConfig(key, defaultValue = '') {
  const row = await db.prepare('SELECT config_value FROM system_config WHERE config_key = ?').get(key);
  return row ? row.config_value : defaultValue;
}

// AI 连接测试
async function testAIConnection() {
  const apiKey = getConfig('ai_api_key', '');
  if (!apiKey) return { success: false, message: '未配置 API Key' };

  const apiUrl = getConfig('ai_api_url', 'https://open.bigmodel.cn/api/paas/v4/chat/completions');
  const model = getConfig('ai_model', 'glm-4-flash');

  try {
    const reply = await callAI(apiUrl, apiKey, model, '你好，请用一句话介绍自己');
    return { success: true, message: '连接成功', reply };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// 调用 AI 接口
function callAI(apiUrl, apiKey, model, message) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 15000,
    };

    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else if (json.error) {
            reject(new Error(json.error.message || 'AI 返回错误'));
          } else {
            reject(new Error('AI 返回格式异常'));
          }
        } catch (e) {
          reject(new Error('解析 AI 响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
    req.write(JSON.stringify({ model, messages: [{ role: 'user', content: message }], max_tokens: 100 }));
    req.end();
  });
}

// 语音服务连接测试
async function testVoiceConnection() {
  const appId = getConfig('xfyun_app_id', '');
  const apiKey = getConfig('xfyun_api_key', '');
  const apiSecret = getConfig('xfyun_api_secret', '');
  if (!appId || !apiKey || !apiSecret) {
    return { success: false, message: '未完成讯飞配置（AppID/API Key/API Secret）' };
  }
  return { success: true, message: '配置已填写，讯飞服务需要实际语音流才能验证' };
}

// 地图服务连接测试
async function testMapConnection() {
  const mapKey = getConfig('map_api_key', '');
  if (!mapKey) return { success: false, message: '未配置地图 API Key' };

  const provider = getConfig('map_provider', 'amap');
  try {
    if (provider === 'amap') {
      const result = await httpGet(`https://restapi.amap.com/v3/ip?key=${mapKey}`);
      if (result.status === '1') {
        return { success: true, message: `高德地图连接成功，IP: ${result.province || ''}${result.city || ''}` };
      } else {
        return { success: false, message: `高德地图返回错误: ${result.info}` };
      }
    } else {
      return { success: true, message: '百度地图配置已填写，需要实际调用验证' };
    }
  } catch (err) {
    return { success: false, message: `连接失败: ${err.message}` };
  }
}

// 短信服务连接测试
function testSMSConnection() {
  const keyId = getConfig('sms_access_key_id', '');
  const keySecret = getConfig('sms_access_key_secret', '');
  if (!keyId || !keySecret) return { success: false, message: '未配置阿里云短信 AccessKey' };
  return { success: true, message: '阿里云短信配置已填写，实际发送需调用短信API验证' };
}

// 推送服务连接测试
function testPushConnection() {
  const appKey = getConfig('push_app_key', '');
  const masterSecret = getConfig('push_master_secret', '');
  if (!appKey || !masterSecret) return { success: false, message: '未配置极光推送 AppKey/MasterSecret' };
  return { success: true, message: '极光推送配置已填写，实际推送需客户端配合验证' };
}

// HTTP GET 请求
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 10000 }, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    }).on('error', reject);
  });
}

// ==================== 短信验证码日志 ====================

// 获取短信日志列表
router.get('/sms-logs', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, phone, status, startDate, endDate } = req.query;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const params = [];
    if (phone) { where += ' AND s.phone LIKE ?'; params.push(`%${phone}%`); }
    if (status) { where += ' AND s.status = ?'; params.push(status); }
    if (startDate) { where += ' AND s.created_at >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND s.created_at <= ?'; params.push(endDate + ' 23:59:59'); }

    const total = await db.prepare(`SELECT COUNT(*) as cnt FROM sms_log s WHERE ${where}`).get(...params).cnt;
    const list = await db.prepare(
      `SELECT s.*, u.real_name, u.role
       FROM sms_log s LEFT JOIN sys_user u ON s.phone = u.phone
       WHERE ${where} ORDER BY s.id DESC LIMIT ? OFFSET ?`
    ).all(...params, Number(pageSize), offset);

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) }, message: 'success' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// 短信发送统计
router.get('/sms-stats', async (req, res) => {
  try {
    const today = await db.prepare("SELECT COUNT(*) as cnt FROM sms_log WHERE created_at >= date('now', 'localtime')").get().cnt;
    const todayVerified = await db.prepare("SELECT COUNT(*) as cnt FROM sms_log WHERE verified = 1 AND created_at >= date('now', 'localtime')").get().cnt;
    const todayExpired = await db.prepare("SELECT COUNT(*) as cnt FROM sms_log WHERE status = 'sent' AND verified = 0 AND expires_at < datetime('now', 'localtime') AND created_at >= date('now', 'localtime')").get().cnt;
    const totalAll = await db.prepare("SELECT COUNT(*) as cnt FROM sms_log").get().cnt;
    const totalVerified = await db.prepare("SELECT COUNT(*) as cnt FROM sms_log WHERE verified = 1").get().cnt;

    // 最近7天发送趋势
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      const dateStr = date.toISOString().substring(0, 10);
      const dayTotal = await db.prepare("SELECT COUNT(*) as cnt FROM sms_log WHERE created_at >= ? AND created_at < ?").get(dateStr, dateStr + ' 23:59:59').cnt;
      const dayVerified = await db.prepare("SELECT COUNT(*) as cnt FROM sms_log WHERE verified = 1 AND created_at >= ? AND created_at < ?").get(dateStr, dateStr + ' 23:59:59').cnt;
      trend.push({ date: dateStr.substring(5), total: dayTotal, verified: dayVerified });
    }

    res.json({
      code: 200,
      data: { today, todayVerified, todayExpired, totalAll, totalVerified, trend },
      message: 'success',
    });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

module.exports = router;

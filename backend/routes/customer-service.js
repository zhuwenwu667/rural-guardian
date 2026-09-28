/**
 * 客服系统 API 路由
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { initDb } = require('../config/db');

// 获取待处理的呼叫请求
router.get('/calls/pending', auth.auth, async (req, res) => {
  try {
    const db = await initDb();
    const calls = await db.prepare(`
      SELECT * FROM cs_call_records 
      WHERE status = 'pending' 
      ORDER BY created_at DESC
    `).all();
    
    res.json({ code: 200, data: calls, message: 'success' });
  } catch (err) {
    console.error('[客服] 获取待处理呼叫失败:', err);
    res.json({ code: 500, data: null, message: '获取失败' });
  }
});

// 获取进行中的呼叫
router.get('/calls/active', auth.auth, async (req, res) => {
  try {
    const db = await initDb();
    const { csId } = req.query;
    
    let calls;
    if (csId) {
      calls = await db.prepare(`
        SELECT * FROM cs_call_records 
        WHERE status = 'active' AND cs_id = ?
        ORDER BY accepted_at DESC
      `).all(csId);
    } else {
      calls = await db.prepare(`
        SELECT * FROM cs_call_records 
        WHERE status = 'active'
        ORDER BY accepted_at DESC
      `).all();
    }
    
    res.json({ code: 200, data: calls, message: 'success' });
  } catch (err) {
    console.error('[客服] 获取进行中呼叫失败:', err);
    res.json({ code: 500, data: null, message: '获取失败' });
  }
});

// 获取呼叫历史
router.get('/calls/history', auth.auth, async (req, res) => {
  try {
    const db = await initDb();
    const { csId, page = 1, pageSize = 20 } = req.query;
    
    let whereClause = "WHERE status = 'ended'";
    let params = [];
    
    if (csId) {
      whereClause += " AND cs_id = ?";
      params.push(csId);
    }
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    const calls = await db.prepare(`
      SELECT * FROM cs_call_records 
      ${whereClause}
      ORDER BY ended_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    const total = await db.prepare(`
      SELECT COUNT(*) as cnt FROM cs_call_records ${whereClause}
    `).get(...params).cnt;
    
    res.json({ 
      code: 200, 
      data: { list: calls, total, page: parseInt(page), pageSize: parseInt(pageSize) },
      message: 'success' 
    });
  } catch (err) {
    console.error('[客服] 获取历史记录失败:', err);
    res.json({ code: 500, data: null, message: '获取失败' });
  }
});

// 获取呼叫详情
router.get('/calls/:id', auth.auth, async (req, res) => {
  try {
    const db = await initDb();
    const call = await db.prepare('SELECT * FROM cs_call_records WHERE id = ?').get(req.params.id);
    
    if (!call) {
      return res.json({ code: 404, data: null, message: '呼叫记录不存在' });
    }
    
    // 获取聊天记录
    const messages = await db.prepare(`
      SELECT * FROM cs_chat_messages 
      WHERE call_id = ?
      ORDER BY created_at ASC
    `).all(req.params.id);
    
    res.json({ 
      code: 200, 
      data: { ...call, messages },
      message: 'success' 
    });
  } catch (err) {
    console.error('[客服] 获取呼叫详情失败:', err);
    res.json({ code: 500, data: null, message: '获取失败' });
  }
});

// 获取客服统计
router.get('/stats', auth.auth, async (req, res) => {
  try {
    const db = await initDb();
    const { csId } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (csId) {
      whereClause = 'WHERE cs_id = ?';
      params.push(csId);
    }
    
    const stats = await db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeCount,
        COUNT(CASE WHEN status = 'ended' THEN 1 END) as totalHandled,
        COUNT(*) as totalCalls
      FROM cs_call_records
      ${whereClause}
    `).get(...params);
    
    res.json({ code: 200, data: stats, message: 'success' });
  } catch (err) {
    console.error('[客服] 获取统计失败:', err);
    res.json({ code: 500, data: null, message: '获取失败' });
  }
});

module.exports = router;

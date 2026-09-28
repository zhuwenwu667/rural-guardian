/**
 * WebSocket 服务 - 客服实时消息系统
 */
const WebSocket = require('ws');
const { initDb } = require('../config/db');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.csClients = new Set();
  }

  async init(server) {
    this.wss = new WebSocket.Server({ server });
    this.db = await initDb();

    this.wss.on('connection', (ws, req) => {
      console.log('[WebSocket] 新连接:', req.socket.remoteAddress);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (err) {
          console.error('[WebSocket] 消息解析失败:', err);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
    });

    console.log('[WebSocket] 服务已启动');
  }

  handleMessage(ws, message) {
    const { type, payload } = message || {};
    switch (type) {
      case 'login':
        if (payload && payload.userId) {
          ws.userId = payload.userId;
          ws.userRole = payload.userRole;
          this.clients.set(payload.userId, ws);
          if (payload.userRole === 'CS') {
            this.csClients.add(ws);
            console.log('[WebSocket] 客服上线:', payload.userId);
          }
        }
        break;
      case 'call_request':
        this.handleCallRequest(ws, payload);
        break;
      case 'call_accept':
        this.handleCallAccept(ws, payload);
        break;
      case 'call_end':
        this.handleCallEnd(ws, payload);
        break;
      case 'chat_message':
        this.handleChatMessage(ws, payload);
        break;
      default:
        console.warn('[WebSocket] 未知消息类型:', type);
    }
  }

  async handleCallRequest(ws, payload) {
    const { elderlyId, elderlyName, villageName, phone, reason } = payload;
    const [result] = await this.db.query(
      'INSERT INTO cs_call_records (elderly_id, elderly_name, village_name, phone, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [elderlyId, elderlyName, villageName, phone, reason]
    );
    const callId = result.insertId;

    const notification = {
      type: 'new_call',
      payload: { callId, elderlyId, elderlyName, villageName, phone, reason, status: 'pending', createdAt: new Date().toISOString() }
    };
    this.broadcastToCS(notification);

    ws.send(JSON.stringify({
      type: 'call_submitted',
      payload: { callId, message: '呼叫已提交，等待客服接听...' }
    }));
    console.log('[WebSocket] 新呼叫请求:', callId, elderlyName);
  }

  async handleCallAccept(ws, payload) {
    const { callId, csId, csName } = payload;
    await this.db.query(
      "UPDATE cs_call_records SET status = 'active', cs_id = ?, cs_name = ?, accepted_at = NOW() WHERE id = ?",
      [csId, csName, callId]
    );
    const [[call]] = await this.db.query('SELECT * FROM cs_call_records WHERE id = ?', [callId]);

    const elderlyWs = this.clients.get(call.elderly_id);
    if (elderlyWs) {
      elderlyWs.send(JSON.stringify({
        type: 'call_accepted',
        payload: { callId, csId, csName, message: `客服 ${csName} 已接听，正在为您处理...` }
      }));
    }
    this.broadcastToCS({ type: 'call_taken', payload: { callId, csId, csName } });
    console.log('[WebSocket] 呼叫被接受:', callId, csName);
  }

  async handleCallEnd(ws, payload) {
    const { callId, endBy } = payload;
    await this.db.query("UPDATE cs_call_records SET status = 'ended', ended_at = NOW(), ended_by = ? WHERE id = ?", [endBy, callId]);
    const [[call]] = await this.db.query('SELECT * FROM cs_call_records WHERE id = ?', [callId]);

    const elderlyWs = this.clients.get(call.elderly_id);
    if (elderlyWs) {
      elderlyWs.send(JSON.stringify({ type: 'call_ended', payload: { callId, message: '通话已结束' } }));
    }
    console.log('[WebSocket] 呼叫结束:', callId);
  }

  async handleChatMessage(ws, payload) {
    const { callId, from, fromName, to, content } = payload;
    await this.db.query(
      'INSERT INTO cs_chat_messages (call_id, from_id, from_name, to_id, content, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [callId, from, fromName, to, content]
    );
    const targetWs = this.clients.get(to);
    if (targetWs) {
      targetWs.send(JSON.stringify({
        type: 'chat_message',
        payload: { callId, from, fromName, content, timestamp: new Date().toISOString() }
      }));
    }
  }

  broadcastToCS(message) {
    const data = JSON.stringify(message);
    this.csClients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
  }

  broadcastAll(message) {
    const data = JSON.stringify(message);
    this.clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
  }

  handleDisconnect(ws) {
    if (ws.userId) this.clients.delete(ws.userId);
    if (ws.userRole === 'CS') {
      this.csClients.delete(ws);
      console.log('[WebSocket] 客服下线:', ws.userId);
    }
  }
}

module.exports = new WebSocketService();

/**
 * MQTT Broker 服务 — 基于 aedes v1.x
 * 端口: 1883 (TCP), 8884 (WebSocket)
 *
 * 兼容 ESP32 智能手环等 IoT 设备接入：
 *   - bracelet/data   → 遥测数据 (心率/血氧/体温/GPS)
 *   - bracelet/alert   → 告警事件 (跌倒/SOS)
 *   - device/+/telemetry → 通用遥测
 *   - device/+/event     → 通用事件
 */
const { Aedes } = require('aedes');
const { createServer } = require('aedes-server-factory');
const net = require('net');

const MQTT_PORT = 1883;
const WS_PORT = 8884;

// 设备白名单认证
const validDevices = ['BAND001', 'BAND002', 'GW001', 'GW002'];
const validKey = 'rural-guardian-2024';

const deviceDataCache = new Map();

let aedes = null;
const verbose = process.env.MQTT_LOG_VERBOSE === 'true' || process.env.LOG_LEVEL === 'debug';
const emergencyLogTs = new Map();

// ==================== 启动 / 停止 ====================
let tcpServer = null;
let wsServer = null;

async function start() {
  if (aedes) return; // 已启动

  aedes = await Aedes.createBroker();

  // ==================== 认证 ====================
  // ESP32 PubSubClient 默认不发送用户名密码，通过 clientId 识别
  const knownClientIds = ['bracelet_esp32', 'ESP32_BRACELET', 'BAND001', 'BAND002', 'GW001', 'GW002'];

  aedes.authenticate = (client, username, password, callback) => {
    const user = username ? username.toString() : '';
    const pass = password ? password.toString() : '';
    const clientId = client?.id || '';

    // 已知设备 clientId 直接放行（ESP32 PubSubClient 默认无账号密码）
    if (knownClientIds.includes(clientId)) {
      console.log(`[MQTT] 已知设备通过: ${clientId}`);
      callback(null, true);
      return;
    }

    // 用户名+密码验证（标准 MQTT 客户端）
    if (validDevices.includes(user) && pass === validKey) {
      console.log(`[MQTT] 设备认证成功: ${user}`);
      callback(null, true);
      return;
    }

    // 无用户名但 clientId 不为空 — 可能是 ESP32 类设备，放行
    if (!user && clientId && clientId.length > 0) {
      console.log(`[MQTT] 匿名设备放行: ${clientId}`);
      callback(null, true);
      return;
    }

    console.log(`[MQTT] 设备认证失败: user=${user || '(none)'} clientId=${clientId}`);
    callback(null, false);
  };

  // ==================== 连接事件 ====================
  aedes.on('client', (client) => {
    console.log(`[MQTT] 新连接: ${client.id}`);
  });

  aedes.on('clientDisconnect', (client) => {
    console.log(`[MQTT] 连接断开: ${client.id}`);
  });

  aedes.on('clientError', (client, err) => {
    console.error(`[MQTT] 客户端错误 ${client?.id}:`, err.message);
  });

  // ==================== 消息处理 ====================
  aedes.on('publish', (packet, client) => {
    if (!client) return; // 忽略内部消息

    const topic = packet.topic;
    const payload = packet.payload ? packet.payload.toString() : '';
    const clientId = client ? client.id : 'unknown';

    if (verbose) console.log(`[MQTT] 收到消息: ${clientId} -> ${topic}`);

    try {
      const data = JSON.parse(payload);

      if (topic.includes('/data') || topic.includes('/telemetry')) {
        handleTelemetry(clientId, topic, data);
      } else if (topic.includes('/alert') || topic.includes('/event')) {
        handleEvent(clientId, topic, data);
      } else {
        handleTelemetry(clientId, topic, data);
      }
    } catch (err) {
      console.error(`[MQTT] 解析消息失败: ${err.message}`);
    }
  });

  // TCP MQTT (1883)
  tcpServer = net.createServer(aedes.handle);
  tcpServer.listen(MQTT_PORT, () => {
    console.log(`[MQTT] TCP Broker 启动成功，端口: ${MQTT_PORT}`);
  });

  // WebSocket MQTT (8884)
  wsServer = createServer(aedes, { ws: true });
  wsServer.listen(WS_PORT, () => {
    console.log(`[MQTT] WebSocket Broker 启动成功，端口: ${WS_PORT}`);
  });
}

// ==================== 遥测数据处理 ====================
function handleTelemetry(clientId, topic, data) {
  // 从 payload 中提取真实 deviceSn，fallback 到 MQTT clientId
  const deviceSn = data.deviceSn || clientId;
  if (verbose) console.log(`[MQTT] 遥测: ${deviceSn} -> ${topic}`);

  deviceDataCache.set(deviceSn, {
    ...data,
    lastUpdate: Date.now(),
  });

  try {
    const deviceEngine = require('./device-engine');
    deviceEngine.processMqttData({
      deviceSn,
      deviceType: data.deviceType || inferDeviceType(topic),
      elderlyId: data.elderlyId,
      timestamp: data.timestamp || new Date().toISOString(),
      data: data.data || data,
      events: data.events || [],
    });
  } catch (e) { /* 设备引擎未加载 */ }
}

// ==================== 事件数据处理 ====================
function handleEvent(deviceSn, topic, data) {
  if (verbose) console.log(`[MQTT] 事件: ${deviceSn} -> ${topic}`);

  const eventType = data.type || data.eventType || 'UNKNOWN';
  if (eventType === 'FALL_DETECTED' || eventType === 'SOS_PRESSED' || eventType === 'SOS') {
    const key = `${deviceSn}:${eventType}`;
    const now = Date.now();
    const last = emergencyLogTs.get(key) || 0;
    if (now - last > 5000) {
      console.log(`[MQTT] ⚠️ 紧急事件: ${eventType} from ${deviceSn}`);
      emergencyLogTs.set(key, now);
    }
  }

  try {
    const deviceEngine = require('./device-engine');
    deviceEngine.processMqttData({
      deviceSn,
      deviceType: data.deviceType || 'BAND',
      elderlyId: data.elderlyId,
      timestamp: data.timestamp || new Date().toISOString(),
      data: data.data || data,
      events: [{ type: eventType, payload: data }],
    });
  } catch (e) { /* 设备引擎未加载 */ }
}

function inferDeviceType(topic) {
  if (topic.startsWith('bracelet')) return 'BAND';
  if (topic.startsWith('gateway')) return 'GW';
  return 'UNKNOWN';
}

function stop() {
  if (tcpServer) tcpServer.close();
  if (wsServer) wsServer.close();
  if (aedes) aedes.close();
  aedes = null;
  console.log('[MQTT] Broker 已停止');
}

function sendCommand(deviceSn, command) {
  if (!aedes) return;
  const topic = `device/${deviceSn}/command`;
  const payload = JSON.stringify(command);
  aedes.publish({ topic, payload, qos: 1, retain: false });
  console.log(`[MQTT] 发送命令: ${deviceSn} -> ${topic}`);
}

function getOnlineDevices() {
  return Array.from(deviceDataCache.entries()).map(([sn, data]) => ({
    deviceSn: sn,
    lastUpdate: data.lastUpdate,
  }));
}

module.exports = {
  start,
  stop,
  sendCommand,
  getOnlineDevices,
};

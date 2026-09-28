/**
 * ESP32 智能手环模拟器
 * 模拟手环通过 MQTT 上报体征数据到养老平台
 *
 * 启动: node services/bracelet-simulator.js
 * 协议: MQTT 3.1.1, topic 与 ESP32 手环项目一致
 */
const mqtt = require('mqtt');

const BROKER_URL = 'mqtt://localhost:1883';
const DEVICE_SN = 'BAND001';
const DEVICE_KEY = 'rural-guardian-2024';
const ELDERLY_ID = 1;

// ==================== 模拟参数 ====================
const config = {
  reportInterval: 5000,           // 上报间隔 5 秒
  heartRateBase: 72,             // 基础心率
  spo2Base: 97,                  // 基础血氧
  tempBase: 36.5,                // 基础体温
  latitude: 30.5,                // 幸福村纬度 (匹配围栏中心)
  longitude: 114.4,              // 幸福村经度
  fallProbability: 0.02,         // 跌倒概率 (每 5 秒)
  sosProbability: 0.005,         // SOS 概率
};

// ==================== 连接 MQTT ====================
console.log('[手环模拟器] 正在连接 MQTT Broker...');

const client = mqtt.connect(BROKER_URL, {
  clientId: DEVICE_SN,
  username: DEVICE_SN,
  password: DEVICE_KEY,
  clean: true,
  keepalive: 30,
});

client.on('connect', () => {
  console.log(`[手环模拟器] ✅ 已连接到 ${BROKER_URL}`);
  console.log(`[手环模拟器] 设备: ${DEVICE_SN} | 老人ID: ${ELDERLY_ID}`);
  console.log(`[手环模拟器] 上报间隔: ${config.reportInterval / 1000}s | 跌倒概率: ${(config.fallProbability * 100).toFixed(1)}%`);
  console.log('─'.repeat(50));

  // 开始周期性上报
  setInterval(reportTelemetry, config.reportInterval);
  reportTelemetry(); // 立即上报一次
});

client.on('error', (err) => {
  console.error('[手环模拟器] ❌ 连接错误:', err.message);
});

client.on('close', () => {
  console.log('[手环模拟器] 连接已关闭');
});

// ==================== 数据上报 ====================
let stepCount = 2340;
let lastHr = config.heartRateBase;
let lastSpo2 = config.spo2Base;

function reportTelemetry() {
  // 模拟体征数据波动
  lastHr += randomInt(-4, 4);
  lastHr = clamp(lastHr, 55, 110);

  lastSpo2 += randomFloat(-0.5, 0.5);
  lastSpo2 = clamp(lastSpo2, 90, 100);
  lastSpo2 = Math.round(lastSpo2);

  const temp = config.tempBase + randomFloat(-0.3, 0.3);

  stepCount += randomInt(0, 20);

  // GPS 微漂移
  const lat = config.latitude + randomFloat(-0.001, 0.001);
  const lng = config.longitude + randomFloat(-0.001, 0.001);

  const payload = {
    deviceType: 'BAND',
    elderlyId: ELDERLY_ID,
    timestamp: new Date().toISOString(),
    data: {
      heartRate: lastHr,
      spo2: lastSpo2,
      temperature: Math.round(temp * 10) / 10,
      steps: stepCount,
      gps: {
        lat: Math.round(lat * 1000000) / 1000000,
        lng: Math.round(lng * 1000000) / 1000000,
      },
      battery: 82 - Math.floor(stepCount / 500),
      fallDetected: Math.random() < config.fallProbability ? 1 : 0,
      sosPressed: Math.random() < config.sosProbability ? 1 : 0,
    },
  };

  client.publish('bracelet/data', JSON.stringify(payload), { qos: 1 });
  console.log(`[手环] 遥测 → HR:${lastHr} SpO2:${lastSpo2}% T:${temp.toFixed(1)}°C 步数:${stepCount}`);

  // 模拟告警事件
  if (payload.data.fallDetected) {
    const fallEvent = {
      type: 'FALL_DETECTED',
      elderlyId: ELDERLY_ID,
      timestamp: new Date().toISOString(),
      gps: { lat: payload.data.gps.lat, lng: payload.data.gps.lng },
    };
    client.publish('bracelet/alert', JSON.stringify(fallEvent), { qos: 1 });
    console.log('[手环] ⚠️ 跌倒告警已发送！');
  }

  if (payload.data.sosPressed) {
    const sosEvent = {
      type: 'SOS_PRESSED',
      elderlyId: ELDERLY_ID,
      timestamp: new Date().toISOString(),
      gps: { lat: payload.data.gps.lat, lng: payload.data.gps.lng },
    };
    client.publish('bracelet/alert', JSON.stringify(sosEvent), { qos: 1 });
    console.log('[手环] 🆘 SOS 紧急求助已发送！');
  }

  // 心率异常告警
  if (lastHr > 100) {
    const hrEvent = {
      type: 'HEART_RATE_ABNORMAL',
      elderlyId: ELDERLY_ID,
      timestamp: new Date().toISOString(),
      value: lastHr,
      threshold: 100,
    };
    client.publish('bracelet/alert', JSON.stringify(hrEvent), { qos: 1 });
    console.log(`[手环] ⚠️ 心率异常告警: ${lastHr} bpm`);
  }
}

// ==================== 工具函数 ====================
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ==================== 优雅退出 ====================
process.on('SIGINT', () => {
  console.log('\n[手环模拟器] 正在关闭...');
  client.end();
  process.exit(0);
});

console.log('[手环模拟器] 启动中，按 Ctrl+C 退出');

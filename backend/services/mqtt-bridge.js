const mqtt = require('mqtt');

const REMOTE_BROKER = 'mqtt://broker.emqx.io:1883';
const LOCAL_BROKER = 'mqtt://localhost:1883';

let remoteClient = null;
let localClient = null;
let statusTimer = null;

function start(options = {}) {
  if (remoteClient || localClient) return;
  const verbose = options.verbose === true;

  console.log('[MQTT桥] 连接公共 broker:', REMOTE_BROKER);
  remoteClient = mqtt.connect(REMOTE_BROKER, {
    clientId: 'rural_guardian_bridge_' + Date.now(),
    clean: true,
  });

  console.log('[MQTT桥] 连接本地 broker:', LOCAL_BROKER);
  localClient = mqtt.connect(LOCAL_BROKER, {
    clientId: 'rural_guardian_local_' + Date.now(),
    clean: true,
  });

  remoteClient.on('connect', () => {
    console.log('[MQTT桥] ✅ 已连接公共 broker');
    remoteClient.subscribe(['bracelet/data', 'bracelet/alert', 'bracelet/#', 'device/+/telemetry', 'device/+/event'], (err) => {
      if (err) {
        console.error('[MQTT桥] 订阅失败:', err.message);
      } else {
        console.log('[MQTT桥] 已订阅: bracelet/#, device/+/telemetry, device/+/event');
      }
    });
  });

  remoteClient.on('error', (err) => {
    console.error('[MQTT桥] 公共 broker 错误:', err.message);
  });

  localClient.on('connect', () => {
    console.log('[MQTT桥] ✅ 已连接本地 broker');
  });

  localClient.on('error', (err) => {
    console.error('[MQTT桥] 本地 broker 错误:', err.message);
  });

  remoteClient.on('message', (topic, message) => {
    const payload = message.toString();
    if (verbose) {
      console.log(`[MQTT桥] 收到: ${topic} | ${payload.slice(0, 120)}`);
    }

    localClient.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) console.error('[MQTT桥] 转发失败:', err.message);
    });

    try {
      const data = JSON.parse(payload);
      const deviceEngine = require('./device-engine');
      if (topic === 'bracelet/data' || topic.startsWith('device/')) {
        deviceEngine.processMqttData(data);
      }
    } catch (e) {
      if (verbose) console.error('[MQTT桥] 解析消息失败:', e.message);
    }
  });

  statusTimer = setInterval(() => {
    const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    console.log(`[MQTT桥] 运行中... (内存: ${mem}MB)`);
  }, 60000);

  console.log('[MQTT桥] 启动完成');
}

function stop() {
  if (statusTimer) clearInterval(statusTimer);
  statusTimer = null;
  if (remoteClient) remoteClient.end();
  if (localClient) localClient.end();
  remoteClient = null;
  localClient = null;
  console.log('[MQTT桥] 已停止');
}

module.exports = { start, stop };

if (require.main === module) {
  start({ verbose: true });
  process.on('SIGINT', () => {
    console.log('\n[MQTT桥] 关闭...');
    stop();
    process.exit(0);
  });
}

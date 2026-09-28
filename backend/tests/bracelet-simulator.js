/**
 * 智能养老手环模拟器
 * 模拟手环连接MQTT并上报数据，测试平台对接
 */

const mqtt = require('mqtt');

// 配置
const CONFIG = {
  mqttHost: 'localhost',
  mqttPort: 1883,
  deviceSn: 'BAND001',
  deviceKey: 'rural-guardian-2024',
  telemetryInterval: 5000,  // 遥测数据上报间隔（毫秒）
  simulationDuration: 60000 // 模拟运行时长（毫秒）
};

// 传感器数据
let sensorData = {
  heartRate: 72,
  bloodOxygen: 98,
  temperature: 36.5,
  battery: 85,
  steps: 5200,
  gpsLat: 30.5123,
  gpsLng: 114.3521
};

let client = null;
let telemetryTimer = null;
let startTime = Date.now();

console.log('========================================');
console.log('  智能养老手环模拟器');
console.log('  测试对接乡村守护者平台');
console.log('========================================\n');
console.log(`设备SN: ${CONFIG.deviceSn}`);
console.log(`MQTT服务器: ${CONFIG.mqttHost}:${CONFIG.mqttPort}`);
console.log(`遥测间隔: ${CONFIG.telemetryInterval}ms`);
console.log(`运行时长: ${CONFIG.simulationDuration}ms\n`);

// 生成时间戳
function getTimestamp() {
  return new Date().toISOString();
}

// 模拟传感器数据变化
function updateSensorData() {
  // 心率随机波动
  sensorData.heartRate = 65 + Math.floor(Math.random() * 30);
  // 血氧随机波动
  sensorData.bloodOxygen = 95 + Math.floor(Math.random() * 5);
  // 体温随机波动
  sensorData.temperature = 36.0 + Math.random() * 1.5;
  // 步数增加
  sensorData.steps += Math.floor(Math.random() * 10);
  // 电量缓慢下降
  if (Math.random() > 0.8) sensorData.battery = Math.max(0, sensorData.battery - 1);
}

// 发送遥测数据
function sendTelemetry() {
  updateSensorData();
  
  const payload = {
    deviceSn: CONFIG.deviceSn,
    deviceType: 'BAND',
    timestamp: getTimestamp(),
    data: {
      heartRate: sensorData.heartRate,
      bloodOxygen: sensorData.bloodOxygen,
      temperature: parseFloat(sensorData.temperature.toFixed(1)),
      battery: sensorData.battery,
      steps: sensorData.steps
    },
    events: []
  };
  
  const topic = `device/${CONFIG.deviceSn}/telemetry`;
  
  client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) {
      console.log(`❌ 遥测数据发送失败: ${err.message}`);
    } else {
      console.log(`📊 遥测数据已发送`);
      console.log(`   心率: ${payload.data.heartRate} bpm`);
      console.log(`   血氧: ${payload.data.bloodOxygen}%`);
      console.log(`   体温: ${payload.data.temperature}°C`);
      console.log(`   电量: ${payload.data.battery}%`);
      console.log(`   步数: ${payload.data.steps}\n`);
    }
  });
}

// 发送跌倒事件
function sendFallEvent() {
  const payload = {
    deviceSn: CONFIG.deviceSn,
    deviceType: 'BAND',
    type: 'FALL_DETECTED',
    timestamp: getTimestamp(),
    data: {
      location: {
        lat: sensorData.gpsLat,
        lng: sensorData.gpsLng
      }
    }
  };
  
  const topic = `device/${CONFIG.deviceSn}/event`;
  
  client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) {
      console.log(`❌ 跌倒事件发送失败: ${err.message}`);
    } else {
      console.log(`🚨 跌倒事件已发送！`);
      console.log(`   位置: ${payload.data.location.lat}, ${payload.data.location.lng}\n`);
    }
  });
}

// 发送SOS事件
function sendSosEvent() {
  const payload = {
    deviceSn: CONFIG.deviceSn,
    deviceType: 'BAND',
    type: 'SOS_PRESSED',
    timestamp: getTimestamp(),
    data: {
      location: {
        lat: sensorData.gpsLat,
        lng: sensorData.gpsLng
      }
    }
  };
  
  const topic = `device/${CONFIG.deviceSn}/event`;
  
  client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) {
      console.log(`❌ SOS事件发送失败: ${err.message}`);
    } else {
      console.log(`🆘 SOS事件已发送！`);
      console.log(`   位置: ${payload.data.location.lat}, ${payload.data.location.lng}\n`);
    }
  });
}

// 连接MQTT
function connect() {
  console.log('[MQTT] 正在连接...');
  
  client = mqtt.connect(`mqtt://${CONFIG.mqttHost}:${CONFIG.mqttPort}`, {
    username: CONFIG.deviceSn,
    password: CONFIG.deviceKey,
    clientId: `simulator-${Date.now()}`,
    connectTimeout: 10000,
    reconnectPeriod: 5000
  });
  
  client.on('connect', () => {
    console.log('✅ MQTT连接成功！设备认证通过\n');
    
    // 立即发送一次遥测数据
    sendTelemetry();
    
    // 定时发送遥测数据
    telemetryTimer = setInterval(sendTelemetry, CONFIG.telemetryInterval);
    
    // 10秒后模拟跌倒事件
    setTimeout(() => {
      console.log('>>> 模拟跌倒检测 <<<');
      sendFallEvent();
    }, 10000);
    
    // 20秒后模拟SOS事件
    setTimeout(() => {
      console.log('>>> 模拟SOS按键 <<<');
      sendSosEvent();
    }, 20000);
    
    // 30秒后再发送一次跌倒事件
    setTimeout(() => {
      console.log('>>> 模拟第二次跌倒检测 <<<');
      sendFallEvent();
    }, 30000);
  });
  
  client.on('error', (err) => {
    console.log(`❌ MQTT错误: ${err.message}`);
  });
  
  client.on('offline', () => {
    console.log('⚠️  MQTT连接断开');
  });
  
  client.on('reconnect', () => {
    console.log('🔄 MQTT重新连接中...');
  });
}

// 停止模拟
function stopSimulation() {
  console.log('\n========================================');
  console.log('  模拟结束');
  console.log('========================================');
  
  if (telemetryTimer) {
    clearInterval(telemetryTimer);
  }
  
  if (client) {
    client.end();
  }
  
  const duration = (Date.now() - startTime) / 1000;
  console.log(`运行时长: ${duration}秒`);
  console.log('请检查平台是否收到数据！\n');
  
  process.exit(0);
}

// 启动
connect();

// 定时结束
setTimeout(stopSimulation, CONFIG.simulationDuration);

// 捕获Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n用户中断');
  stopSimulation();
});

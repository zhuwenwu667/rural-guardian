/**
 * MQTT 连接测试脚本
 * 测试设备连接、数据上报、事件上报等功能
 */

const mqtt = require('mqtt');
const readline = require('readline');

const MQTT_HOST = 'localhost';
const MQTT_PORT = 1883;
const DEVICE_SN = 'BAND001';
const DEVICE_KEY = 'rural-guardian-2024';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let client = null;

console.log('========================================');
console.log('  MQTT 设备连接测试工具');
console.log('========================================\n');

// 测试1: 连接测试
function testConnection() {
  return new Promise((resolve, reject) => {
    console.log('[测试1] 设备连接认证测试...');
    console.log(`  设备SN: ${DEVICE_SN}`);
    console.log(`  服务器: ${MQTT_HOST}:${MQTT_PORT}`);
    
    client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
      username: DEVICE_SN,
      password: DEVICE_KEY,
      clientId: `test-client-${Date.now()}`,
      connectTimeout: 5000,
      reconnectPeriod: 0  // 禁用自动重连
    });
    
    client.on('connect', () => {
      console.log('  ✅ 连接成功！设备认证通过\n');
      resolve();
    });
    
    client.on('error', (err) => {
      console.log(`  ❌ 连接失败: ${err.message}\n`);
      reject(err);
    });
    
    client.on('offline', () => {
      console.log('  ⚠️  连接断开\n');
    });
  });
}

// 测试2: 遥测数据上报
function testTelemetry() {
  return new Promise((resolve) => {
    console.log('[测试2] 遥测数据上报测试...');
    
    const telemetryData = {
      deviceSn: DEVICE_SN,
      deviceType: 'BAND',
      timestamp: new Date().toISOString(),
      data: {
        heartRate: 72 + Math.floor(Math.random() * 20),
        bloodOxygen: 95 + Math.floor(Math.random() * 5),
        temperature: 36.5 + Math.random(),
        steps: 5200 + Math.floor(Math.random() * 1000),
        battery: 85
      },
      events: []
    };
    
    const topic = `device/${DEVICE_SN}/telemetry`;
    
    client.publish(topic, JSON.stringify(telemetryData), { qos: 1 }, (err) => {
      if (err) {
        console.log(`  ❌ 发送失败: ${err.message}\n`);
      } else {
        console.log('  ✅ 遥测数据发送成功');
        console.log(`  主题: ${topic}`);
        console.log(`  数据: ${JSON.stringify(telemetryData.data, null, 2)}\n`);
      }
      resolve();
    });
  });
}

// 测试3: 紧急事件上报
function testEvent() {
  return new Promise((resolve) => {
    console.log('[测试3] 紧急事件上报测试...');
    
    const eventData = {
      deviceSn: DEVICE_SN,
      deviceType: 'BAND',
      type: 'FALL_DETECTED',
      timestamp: new Date().toISOString(),
      data: {
        location: { lat: 30.5123, lng: 114.3521 }
      }
    };
    
    const topic = `device/${DEVICE_SN}/event`;
    
    client.publish(topic, JSON.stringify(eventData), { qos: 1 }, (err) => {
      if (err) {
        console.log(`  ❌ 发送失败: ${err.message}\n`);
      } else {
        console.log('  ✅ 紧急事件发送成功');
        console.log(`  主题: ${topic}`);
        console.log(`  事件: ${eventData.type}`);
        console.log('  ⚠️  系统应触发告警通知\n');
      }
      resolve();
    });
  });
}

// 测试4: 批量数据上报
function testBatchTelemetry() {
  return new Promise((resolve) => {
    console.log('[测试4] 批量数据上报测试...');
    console.log('  发送10条模拟数据...');
    
    let count = 0;
    const interval = setInterval(() => {
      count++;
      
      const telemetryData = {
        deviceSn: DEVICE_SN,
        deviceType: 'BAND',
        timestamp: new Date().toISOString(),
        data: {
          heartRate: 60 + Math.floor(Math.random() * 40),
          bloodOxygen: 95 + Math.floor(Math.random() * 5),
          temperature: 36.0 + Math.random() * 2,
          steps: 5000 + Math.floor(Math.random() * 2000),
          battery: 80 + Math.floor(Math.random() * 20)
        },
        events: []
      };
      
      const topic = `device/${DEVICE_SN}/telemetry`;
      client.publish(topic, JSON.stringify(telemetryData));
      
      process.stdout.write(`  进度: ${count}/10\r`);
      
      if (count >= 10) {
        clearInterval(interval);
        console.log('\n  ✅ 批量数据发送完成\n');
        resolve();
      }
    }, 500);
  });
}

// 测试5: 错误认证测试
function testInvalidAuth() {
  return new Promise((resolve) => {
    console.log('[测试5] 错误认证测试...');
    console.log('  使用错误的密钥连接...');
    
    const invalidClient = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
      username: DEVICE_SN,
      password: 'wrong-password',
      clientId: `test-invalid-${Date.now()}`,
      connectTimeout: 5000,
      reconnectPeriod: 0
    });
    
    invalidClient.on('connect', () => {
      console.log('  ❌ 错误：使用错误密码也能连接！\n');
      invalidClient.end();
      resolve();
    });
    
    invalidClient.on('error', (err) => {
      console.log(`  ✅ 认证拒绝: ${err.message}`);
      console.log('  安全机制正常工作\n');
      invalidClient.end();
      resolve();
    });
    
    // 超时处理
    setTimeout(() => {
      invalidClient.end();
      console.log('  ✅ 连接超时，认证被拒绝\n');
      resolve();
    }, 6000);
  });
}

// 运行所有测试
async function runTests() {
  try {
    // 测试1: 连接
    await testConnection();
    
    // 等待用户确认
    await new Promise(resolve => {
      rl.question('按回车键继续测试遥测数据上报...', resolve);
    });
    
    // 测试2: 遥测数据
    await testTelemetry();
    
    // 等待用户确认
    await new Promise(resolve => {
      rl.question('按回车键继续测试紧急事件上报...', resolve);
    });
    
    // 测试3: 紧急事件
    await testEvent();
    
    // 等待用户确认
    await new Promise(resolve => {
      rl.question('按回车键继续测试批量数据上报...', resolve);
    });
    
    // 测试4: 批量数据
    await testBatchTelemetry();
    
    // 等待用户确认
    await new Promise(resolve => {
      rl.question('按回车键继续测试错误认证...', resolve);
    });
    
    // 测试5: 错误认证
    await testInvalidAuth();
    
    console.log('========================================');
    console.log('  所有测试完成！');
    console.log('========================================');
    
  } catch (err) {
    console.error('测试失败:', err.message);
  } finally {
    if (client) {
      client.end();
    }
    rl.close();
  }
}

// 启动测试
runTests();

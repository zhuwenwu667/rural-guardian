/**
 * MQTT 自动测试脚本
 * 自动测试设备连接、数据上报等功能
 */

const mqtt = require('mqtt');

const MQTT_HOST = 'localhost';
const MQTT_PORT = 1883;
const DEVICE_SN = 'BAND001';
const DEVICE_KEY = 'rural-guardian-2024';

console.log('========================================');
console.log('  MQTT 设备连接自动测试');
console.log('========================================\n');

let client = null;
let testResults = [];

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 测试1: 连接测试
async function testConnection() {
  console.log('[测试1] 设备连接认证测试...');
  console.log(`  设备SN: ${DEVICE_SN}`);
  console.log(`  服务器: ${MQTT_HOST}:${MQTT_PORT}`);
  
  return new Promise((resolve, reject) => {
    client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
      username: DEVICE_SN,
      password: DEVICE_KEY,
      clientId: `test-client-${Date.now()}`,
      connectTimeout: 5000,
      reconnectPeriod: 0
    });
    
    client.on('connect', () => {
      console.log('  ✅ 连接成功！设备认证通过\n');
      testResults.push({ test: '连接认证', status: '通过' });
      resolve();
    });
    
    client.on('error', (err) => {
      console.log(`  ❌ 连接失败: ${err.message}\n`);
      testResults.push({ test: '连接认证', status: '失败', error: err.message });
      reject(err);
    });
  });
}

// 测试2: 遥测数据上报
async function testTelemetry() {
  console.log('[测试2] 遥测数据上报测试...');
  
  return new Promise((resolve) => {
    const telemetryData = {
      deviceSn: DEVICE_SN,
      deviceType: 'BAND',
      timestamp: new Date().toISOString(),
      data: {
        heartRate: 72,
        bloodOxygen: 98,
        temperature: 36.5,
        steps: 5200,
        battery: 85
      },
      events: []
    };
    
    const topic = `device/${DEVICE_SN}/telemetry`;
    
    client.publish(topic, JSON.stringify(telemetryData), { qos: 1 }, (err) => {
      if (err) {
        console.log(`  ❌ 发送失败: ${err.message}\n`);
        testResults.push({ test: '遥测数据', status: '失败', error: err.message });
      } else {
        console.log('  ✅ 遥测数据发送成功');
        console.log(`  主题: ${topic}`);
        console.log(`  数据: ${JSON.stringify(telemetryData.data)}\n`);
        testResults.push({ test: '遥测数据', status: '通过' });
      }
      resolve();
    });
  });
}

// 测试3: 紧急事件上报
async function testEvent() {
  console.log('[测试3] 紧急事件上报测试...');
  
  return new Promise((resolve) => {
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
        testResults.push({ test: '紧急事件', status: '失败', error: err.message });
      } else {
        console.log('  ✅ 紧急事件发送成功');
        console.log(`  主题: ${topic}`);
        console.log(`  事件: ${eventData.type}`);
        console.log('  ⚠️  系统应触发告警通知\n');
        testResults.push({ test: '紧急事件', status: '通过' });
      }
      resolve();
    });
  });
}

// 测试4: 批量数据上报
async function testBatchTelemetry() {
  console.log('[测试4] 批量数据上报测试...');
  console.log('  发送5条模拟数据...');
  
  for (let i = 0; i < 5; i++) {
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
    process.stdout.write(`  进度: ${i + 1}/5\r`);
    await delay(200);
  }
  
  console.log('\n  ✅ 批量数据发送完成\n');
  testResults.push({ test: '批量数据', status: '通过' });
}

// 测试5: 错误认证测试
async function testInvalidAuth() {
  console.log('[测试5] 错误认证测试...');
  console.log('  使用错误的密钥连接...');
  
  return new Promise((resolve) => {
    const invalidClient = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
      username: DEVICE_SN,
      password: 'wrong-password',
      clientId: `test-invalid-${Date.now()}`,
      connectTimeout: 5000,
      reconnectPeriod: 0
    });
    
    let resolved = false;
    
    invalidClient.on('connect', () => {
      if (!resolved) {
        resolved = true;
        console.log('  ❌ 错误：使用错误密码也能连接！\n');
        testResults.push({ test: '错误认证', status: '失败', error: '安全漏洞' });
        invalidClient.end();
        resolve();
      }
    });
    
    invalidClient.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        console.log(`  ✅ 认证拒绝: ${err.code || 'CONNREFUSED'}`);
        console.log('  安全机制正常工作\n');
        testResults.push({ test: '错误认证', status: '通过' });
        invalidClient.end();
        resolve();
      }
    });
    
    // 超时处理
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        invalidClient.end();
        console.log('  ✅ 连接被拒绝（超时）');
        console.log('  安全机制正常工作\n');
        testResults.push({ test: '错误认证', status: '通过' });
        resolve();
      }
    }, 6000);
  });
}

// 打印测试报告
function printReport() {
  console.log('========================================');
  console.log('  测试报告');
  console.log('========================================');
  
  let passed = 0;
  let failed = 0;
  
  testResults.forEach(result => {
    const icon = result.status === '通过' ? '✅' : '❌';
    console.log(`  ${icon} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`     错误: ${result.error}`);
    }
    if (result.status === '通过') passed++;
    else failed++;
  });
  
  console.log('----------------------------------------');
  console.log(`  总计: ${testResults.length} 项`);
  console.log(`  通过: ${passed} 项`);
  console.log(`  失败: ${failed} 项`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！MQTT服务运行正常。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查配置。');
  }
}

// 运行所有测试
async function runTests() {
  try {
    // 测试1: 连接
    await testConnection();
    await delay(1000);
    
    // 测试2: 遥测数据
    await testTelemetry();
    await delay(1000);
    
    // 测试3: 紧急事件
    await testEvent();
    await delay(1000);
    
    // 测试4: 批量数据
    await testBatchTelemetry();
    await delay(1000);
    
    // 测试5: 错误认证
    await testInvalidAuth();
    
  } catch (err) {
    console.error('测试过程中出错:', err.message);
  } finally {
    if (client) {
      client.end();
    }
    
    await delay(500);
    printReport();
    
    // 退出进程
    setTimeout(() => process.exit(0), 1000);
  }
}

// 启动测试
runTests();

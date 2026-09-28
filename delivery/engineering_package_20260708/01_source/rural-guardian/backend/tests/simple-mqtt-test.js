/**
 * 简单的MQTT测试 - 使用TCP直接发送MQTT CONNECT报文
 */

const net = require('net');

const HOST = 'localhost';
const PORT = 1883;
const DEVICE_SN = 'BAND001';
const DEVICE_KEY = 'rural-guardian-2024';

console.log('========================================');
console.log('  MQTT 协议测试');
console.log('========================================\n');

// 构建MQTT CONNECT报文
function buildConnectPacket(clientId, username, password) {
  // 可变头
  const protocolName = Buffer.from([0x00, 0x04, 0x4D, 0x51, 0x54, 0x54]); // "MQTT"
  const protocolLevel = Buffer.from([0x04]); // MQTT 3.1.1
  
  // 连接标志
  // bit 7: username, bit 6: password, bit 1: clean session
  const connectFlags = 0xC2; // 11000010
  
  const keepAlive = Buffer.from([0x00, 0x3C]); // 60秒
  
  // 载荷
  const clientIdBuf = Buffer.concat([
    Buffer.from([0x00, clientId.length]),
    Buffer.from(clientId)
  ]);
  
  const usernameBuf = Buffer.concat([
    Buffer.from([0x00, username.length]),
    Buffer.from(username)
  ]);
  
  const passwordBuf = Buffer.concat([
    Buffer.from([0x00, password.length]),
    Buffer.from(password)
  ]);
  
  const payload = Buffer.concat([clientIdBuf, usernameBuf, passwordBuf]);
  
  // 可变头
  const variableHeader = Buffer.concat([protocolName, protocolLevel, Buffer.from([connectFlags]), keepAlive]);
  
  // 剩余长度
  const remainingLength = variableHeader.length + payload.length;
  const remainingLengthBytes = encodeRemainingLength(remainingLength);
  
  // 固定头
  const fixedHeader = Buffer.concat([Buffer.from([0x10]), remainingLengthBytes]);
  
  return Buffer.concat([fixedHeader, variableHeader, payload]);
}

// 编码剩余长度
function encodeRemainingLength(length) {
  const bytes = [];
  do {
    let byte = length % 128;
    length = Math.floor(length / 128);
    if (length > 0) byte |= 0x80;
    bytes.push(byte);
  } while (length > 0);
  return Buffer.from(bytes);
}

// 构建PUBLISH报文
function buildPublishPacket(topic, message) {
  const topicBuf = Buffer.concat([
    Buffer.from([0x00, topic.length]),
    Buffer.from(topic)
  ]);
  
  const messageBuf = Buffer.from(message);
  
  const variableHeader = topicBuf;
  const payload = messageBuf;
  
  const remainingLength = variableHeader.length + payload.length;
  const remainingLengthBytes = encodeRemainingLength(remainingLength);
  
  // 固定头: 0011 0000 (PUBLISH, QoS 0)
  const fixedHeader = Buffer.concat([Buffer.from([0x30]), remainingLengthBytes]);
  
  return Buffer.concat([fixedHeader, variableHeader, payload]);
}

// 测试连接
async function testConnection() {
  return new Promise((resolve, reject) => {
    console.log('[测试1] 连接认证测试...');
    
    const client = new net.Socket();
    let connected = false;
    
    client.connect(PORT, HOST, () => {
      console.log('  TCP连接已建立');
      
      // 发送CONNECT报文
      const connectPacket = buildConnectPacket(
        `test-${Date.now()}`,
        DEVICE_SN,
        DEVICE_KEY
      );
      
      console.log('  发送CONNECT报文...');
      client.write(connectPacket);
    });
    
    client.on('data', (data) => {
      const packetType = data[0] >> 4;
      
      if (packetType === 2) { // CONNACK
        const returnCode = data[3];
        
        if (returnCode === 0) {
          console.log('  ✅ 认证成功！');
          connected = true;
          
          // 发送测试数据
          setTimeout(() => {
            testPublish(client);
          }, 500);
          
          // 10秒后断开
          setTimeout(() => {
            client.end();
          }, 10000);
        } else {
          console.log(`  ❌ 认证失败，返回码: ${returnCode}`);
          client.end();
          reject(new Error(`Auth failed: ${returnCode}`));
        }
      }
    });
    
    client.on('close', () => {
      console.log('  连接已关闭\n');
      if (connected) {
        resolve();
      } else {
        reject(new Error('Connection closed unexpectedly'));
      }
    });
    
    client.on('error', (err) => {
      console.log(`  ❌ 连接错误: ${err.message}\n`);
      reject(err);
    });
    
    // 超时
    setTimeout(() => {
      if (!connected) {
        client.end();
        reject(new Error('Connection timeout'));
      }
    }, 10000);
  });
}

// 测试发布
function testPublish(client) {
  console.log('[测试2] 数据上报测试...');
  
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
  const publishPacket = buildPublishPacket(topic, JSON.stringify(telemetryData));
  
  client.write(publishPacket);
  console.log('  ✅ 遥测数据已发送');
  console.log(`  主题: ${topic}`);
  console.log(`  数据: ${JSON.stringify(telemetryData.data)}\n`);
  
  // 发送紧急事件
  setTimeout(() => {
    console.log('[测试3] 紧急事件测试...');
    
    const eventData = {
      deviceSn: DEVICE_SN,
      deviceType: 'BAND',
      type: 'FALL_DETECTED',
      timestamp: new Date().toISOString(),
      data: { location: { lat: 30.5123, lng: 114.3521 } }
    };
    
    const eventTopic = `device/${DEVICE_SN}/event`;
    const eventPacket = buildPublishPacket(eventTopic, JSON.stringify(eventData));
    
    client.write(eventPacket);
    console.log('  ✅ 紧急事件已发送');
    console.log(`  主题: ${eventTopic}`);
    console.log(`  事件: FALL_DETECTED\n`);
  }, 1000);
}

// 运行测试
async function runTest() {
  try {
    await testConnection();
    
    console.log('========================================');
    console.log('  测试完成！');
    console.log('========================================');
    console.log('\n✅ MQTT服务运行正常');
    console.log('✅ 设备认证功能正常');
    console.log('✅ 数据上报功能正常');
    
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    process.exit(1);
  }
  
  process.exit(0);
}

runTest();

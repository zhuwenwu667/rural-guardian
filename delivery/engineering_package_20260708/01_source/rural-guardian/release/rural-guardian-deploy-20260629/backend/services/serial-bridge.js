/**
 * USB 串口 → MQTT 桥接器
 * 从 COM6 读取 ESP32 手环串口输出，解析并转发到 MQTT Broker
 *
 * ESP32 串口输出格式: "HR:72 SpO2:97% T:36.5°C BLE:1 MQTT:1"
 * 启动: node services/serial-bridge.js
 */
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const mqtt = require('mqtt');

const COM_PORT = 'COM6';
const BAUD_RATE = 115200;
const BROKER_URL = 'mqtt://localhost:1883';
const DEVICE_SN = 'BRACELET_COM6';

// MQTT 连接
console.log('[串口桥] 连接 MQTT...');
const client = mqtt.connect(BROKER_URL, {
  clientId: 'serial_bridge_' + Date.now(),
  clean: true,
});

client.on('connect', () => {
  console.log('[串口桥] MQTT 已连接');
});

// 打开串口
console.log(`[串口桥] 打开 ${COM_PORT} @ ${BAUD_RATE}...`);
const port = new SerialPort({ path: COM_PORT, baudRate: BAUD_RATE }, (err) => {
  if (err) {
    console.error(`[串口桥] ❌ 无法打开 ${COM_PORT}:`, err.message);
    console.log('[串口桥] 提示: 请确认 ESP32 已插入且未被其他程序占用');
    console.log('[串口桥] 尝试其他波特率: node -e "const{SerialPort}=require(\'serialport\');new SerialPort({path:\'COM6\',baudRate:9600},e=>{if(!e)console.log(\'9600 OK\')})"');
    process.exit(1);
  }
  console.log(`[串口桥] ✅ ${COM_PORT} 已打开 (${BAUD_RATE} bps)`);
  console.log('[串口桥] 等待 ESP32 数据...');
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// 解析 ESP32 串口输出
parser.on('data', (line) => {
  const text = line.trim();
  if (!text) return;

  // 尝试解析格式: "HR:72 SpO2:97% T:36.5°C BLE:1 MQTT:1"
  const hrMatch = text.match(/HR:\s*(\d+)/i);
  const spo2Match = text.match(/SpO2:\s*(\d+\.?\d*)/i);
  const tempMatch = text.match(/T:\s*(\d+\.?\d*)/i);
  const bleMatch = text.match(/BLE:\s*(\d+)/i);
  const mqttMatch = text.match(/MQTT:\s*(\d+)/i);

  if (hrMatch || spo2Match || tempMatch) {
    const data = {
      hr: hrMatch ? parseInt(hrMatch[1]) : 0,
      spo2: spo2Match ? parseFloat(spo2Match[1]) : 0,
      temp: tempMatch ? parseFloat(tempMatch[1]) : 0,
      lat: 39.0842 + (Math.random() - 0.5) * 0.002, // 模拟 GPS
      lng: 117.2009 + (Math.random() - 0.5) * 0.002,
      timestamp: new Date().toISOString(),
      source: 'serial',
    };

    const payload = {
      deviceType: 'BAND',
      elderlyId: 1,
      timestamp: data.timestamp,
      data,
    };

    client.publish('bracelet/data', JSON.stringify(payload), { qos: 1 });
    console.log(`[串口→MQTT] HR:${data.hr} SpO2:${data.spo2}% T:${data.temp}°C`);

    // 告警：心率异常
    if (data.hr > 100 || data.hr < 50) {
      const alert = { type: 'HEART_RATE_ABNORMAL', elderlyId: 1, value: data.hr, timestamp: data.timestamp };
      client.publish('bracelet/alert', JSON.stringify(alert), { qos: 1 });
      console.log(`[串口→MQTT] ⚠️ 心率异常告警: ${data.hr} bpm`);
    }
  } else if (text.includes('SOS') || text.includes('FALL') || text.includes('ALERT')) {
    // 告警类消息
    const alert = {
      type: text.includes('SOS') ? 'SOS_PRESSED' : text.includes('FALL') ? 'FALL_DETECTED' : 'ALERT',
      elderlyId: 1,
      timestamp: new Date().toISOString(),
    };
    client.publish('bracelet/alert', JSON.stringify(alert), { qos: 1 });
    console.log(`[串口→MQTT] 🚨 紧急告警: ${text}`);
  } else if (text.includes('AI:') || text.includes('[AI]') || text.includes('[User]')) {
    // AI 语音相关内容，记录日志即可
    console.log(`[ESP32语音] ${text}`);
  } else {
    // 其他日志
    console.log(`[ESP32日志] ${text}`);
  }
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n[串口桥] 关闭...');
  port.close();
  client.end();
  process.exit(0);
});

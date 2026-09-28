require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { initDb } = require('./config/db');
const auth = require('./middleware/auth');
const wsService = require('./services/websocket');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { securityHeaders, rateLimiter } = require('./middleware/security');

async function startServer() {
  console.log('[启动] 正在初始化数据库...');
  const db = await initDb();

  const { initDatabase } = require('./models/init');
  await initDatabase();

  // 启动时校验 JWT 密钥安全性
  const { validateJwtSecretOnStartup } = require('./middleware/auth');
  await validateJwtSecretOnStartup();

  const [portRows] = await db.execute('SELECT config_value FROM system_config WHERE config_key = ?', ['server_port']);
  const PORT = (portRows && portRows.length > 0) ? parseInt(portRows[0].config_value) : 8080;

  const app = express();
  const server = http.createServer(app);

  // CORS 白名单：开发环境允许 localhost，生产环境需配置域名
  const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGINS || '').split(',').filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];
  app.use(cors({
    origin: (origin, cb) => {
      // 非浏览器请求（无 origin）或白名单内允许
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true);
      } else {
        console.warn('[CORS] 拒绝跨域请求:', origin);
        cb(null, false);
      }
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' })); // 限制请求体大小
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // 安全中间件
  app.use(securityHeaders);
  app.use(rateLimiter);

  // 请求日志脱敏中间件：记录请求时自动脱敏 body 中的敏感字段
  app.use((req, res, next) => {
    const sensitiveKeys = ['password', 'password_hash', 'token', 'newPassword', 'oldPassword', 'code'];
    const logBody = { ...req.body };
    for (const key of Object.keys(logBody)) {
      if (sensitiveKeys.includes(key)) logBody[key] = '***';
    }
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`, Object.keys(logBody).length > 0 ? logBody : '');
    next();
  });

  app.get('/api-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'api-dashboard.html'));
  });

  // 健康检查（无需认证，必须在全局守卫前定义）
  app.get('/api/health', async (req, res) => {
    try {
      const [rows] = await db.execute('SELECT 1 AS ok');
      const dbOk = rows && rows.length > 0;
      res.json({
        code: 200, data: {
          status: dbOk ? 'healthy' : 'degraded',
          uptime: Math.floor(process.uptime()),
          db: dbOk ? 'connected' : 'error',
          memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          version: '2.0.0',
        }, message: 'ok',
      });
    } catch (e) {
      res.status(503).json({ code: 503, data: null, message: '服务不可用' });
    }
  });

  // Serve H5 frontend (static files from uni-app H5 build)
  const h5Path = path.join(__dirname, '..', '..', 'app', 'dist', 'build', 'h5');
  if (fs.existsSync(h5Path)) {
    app.use(express.static(h5Path));
    console.log('[Static] H5 frontend served from:', h5Path);
  } else {
    console.log('[Static] H5 frontend not found at:', h5Path);
  }

  // 全局认证守卫：所有 /api/* 路由（除白名单外）均需认证
  app.use('/api', (req, res, next) => {
    const publicPaths = [
      '/health',
      '/auth/login', '/auth/register', '/auth/sms-login',
      '/auth/send-sms', '/auth/nfc-login', '/auth/voice-login',
      '/auth/demo-login',
    ];
    // Express 挂载在 /api 上时，req.path 是相对路径
    if (publicPaths.includes(req.path) || req.path === '/') {
      return next();
    }
    auth.auth(req, res, next);
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/elderly', require('./routes/elderly'));
  app.use('/api/health', require('./routes/health'));
  app.use('/api/alert', require('./routes/alert'));
  app.use('/api/order', require('./routes/order'));
  app.use('/api/device', require('./routes/device'));
  app.use('/api/village', require('./routes/village'));
  app.use('/api/provider', require('./routes/provider'));
  app.use('/api/family', require('./routes/family'));
  app.use('/api/service', require('./routes/service'));
  
  // 新增角色化流程API
  app.use('/api/alerts', require('./routes/alert-flow'));
  app.use('/api/orders', require('./routes/order-flow'));
  app.use('/api/approvals', require('./routes/approval-center'));

  // 权限管理API
  app.use('/api/permission', require('./routes/permission'));

  // IoT 设备实时监控API
  app.use('/api/device-monitor', require('./routes/device-monitor'));

  // 大屏展示API
  app.use('/api/big-screen', require('./routes/big-screen'));

  // 客服系统API
  app.use('/api/cs', require('./routes/customer-service'));

  // 智能手环数据API
  app.use('/api/bracelet', require('./routes/bracelet'));

  // AI健康分析API
  app.use('/api/ai', require('./routes/ai'));

  // 演示触发器API（比赛用）
  const demoModule = require('./routes/demo');
  demoModule.setWsService(wsService);
  app.use('/api/demo', demoModule.router);

  app.get('/', (req, res) => {
    res.json({
      code: 200,
      data: { name: '乡村守护者智慧养老平台 API', version: '2.0.0', docs: '/api-dashboard' },
      message: 'success',
    });
  });

  app.get('/api/config', auth.auth, async (req, res) => {
    try {
      const [configs] = await db.query('SELECT * FROM system_config ORDER BY config_group, config_key');
      res.json({ code: 200, data: configs, message: 'success' });
    } catch (e) { res.json({ code: 500, data: null, message: e.message }); }
  });

  app.put('/api/config/:key', auth.auth, async (req, res) => {
    try {
      const { value } = req.body;
      if (value === undefined) return res.json({ code: 400, data: null, message: '配置值不能为空' });
      const [[existing]] = await db.query('SELECT id FROM system_config WHERE config_key = ?', [req.params.key]);
      if (!existing) return res.json({ code: 404, data: null, message: '配置项不存在' });
      await db.query('UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?', [value, req.params.key]);
      res.json({ code: 200, data: null, message: '配置更新成功' });
    } catch (e) { res.json({ code: 500, data: null, message: e.message }); }
  });

  app.get('/api/db-status', auth.auth, async (req, res) => {
    const tables = ['sys_user', 'elderly_info', 'health_record', 'alert_record', 'service_order', 'device_info', 'village_info', 'provider_info', 'family_member', 'system_config'];
    const status = [];
    for (const table of tables) {
      try {
        const [[row]] = await db.query(`SELECT COUNT(*) as cnt FROM ${table}`);
        status.push({ table, count: row.cnt, status: 'OK' });
      } catch (e) {
        status.push({ table, count: 0, status: 'ERROR: ' + e.message });
      }
    }
    res.json({ code: 200, data: status, message: 'success' });
  });

  app.use((req, res) => {
    res.json({ code: 404, data: null, message: '接口不存在' });
  });

  // 启动 WebSocket 服务
  wsService.init(server);

  // 404 处理
  app.use(notFoundHandler);

  // 全局错误处理
  app.use(errorHandler);

  server.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  乡村守护者智慧养老平台 - 后端服务');
    console.log(`  HTTP服务: http://localhost:${PORT}`);
    console.log(`  WS服务:   ws://localhost:${PORT}`);
    console.log(`  API文档:  http://localhost:${PORT}/api-dashboard`);
    console.log('========================================');
    console.log('');

    const enableIot = process.env.ENABLE_IOT === 'true';
    if (!enableIot) {
      console.log('  IoT模块: 已禁用 (设置 ENABLE_IOT=true 可启用)');
      return;
    }

    try {
      const deviceEngine = require('./services/device-engine');
      deviceEngine.start();
    } catch (err) {
      console.error('[DeviceEngine] 设备引擎启动失败:', err.message);
    }

    try {
      const mqttBroker = require('./services/mqtt-broker');
      mqttBroker
        .start()
        .then(() => {
          console.log('');
          console.log('  MQTT服务: mqtt://localhost:1883');
          console.log('  MQTT-WS:  ws://localhost:8884');
        })
        .catch((e) => {
          console.error('[MQTT] MQTT Broker启动失败:', e.message);
        });
    } catch (err) {
      console.error('[MQTT] MQTT Broker启动失败:', err.message);
    }

    try {
      const mqttBridge = require('./services/mqtt-bridge');
      mqttBridge.start({ verbose: false });
      console.log('  MQTT桥接: broker.emqx.io → 本地 (ESP32手环数据转发)');
    } catch (err) {
      console.error('[MQTT桥] 桥接启动失败:', err.message);
    }

    try {
      const { SerialPort } = require('serialport');
      const { ReadlineParser } = require('@serialport/parser-readline');
      const mqtt = require('mqtt');

      const mqttClient = mqtt.connect('mqtt://localhost:1883', { clientId: 'serial_bridge_auto', clean: true });
      const port = new SerialPort({ path: 'COM7', baudRate: 115200 }, (err) => {
        if (err) {
          console.log('  ⚠ ESP32串口: COM7 未就绪');
          return;
        }
        console.log('  ✅ ESP32串口桥: COM7 → MQTT');
        const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
        parser.on('data', (line) => {
          const t = line.trim();
          if (!t) return;

          // Format 1: JSON (from ESP32 with JSON patch)
          if (t.startsWith('{')) {
            try {
              const d = JSON.parse(t);
              const payload = {
                deviceSn: d.deviceSn || 'BAND001',
                deviceType: 'BAND',
                elderlyId: d.elderlyId || 1,
                timestamp: new Date().toISOString(),
                data: d.data || d,
              };
              mqttClient.publish('bracelet/data', JSON.stringify(payload), { qos: 1 });
              if (d.data?.fall || d.data?.sos) {
                mqttClient.publish('bracelet/alert', JSON.stringify({
                  type: d.data.fall ? 'FALL_DETECTED' : 'SOS_PRESSED',
                  elderlyId: d.elderlyId || 1,
                  timestamp: new Date().toISOString(),
                }), { qos: 1 });
              }
              return;
            } catch (e) {}
          }

          // Format 2: [MAX30102] SpO2=97% HR=72 R=0.523 samples=180 peaks=5
          const hrMatch = t.match(/HR=(\d+)/);
          const spo2Match = t.match(/SpO2=(\d+)/);
          const gpsLatMatch = t.match(/LAT=([\d.-]+)/);
          const gpsLonMatch = t.match(/LON=([\d.-]+)/);
          if (hrMatch || spo2Match) {
            const payload = {
              deviceSn: 'BAND001',
              deviceType: 'BAND',
              elderlyId: 1,
              timestamp: new Date().toISOString(),
              data: {
                heartRate: hrMatch ? parseInt(hrMatch[1]) : 0,
                bloodOxygen: spo2Match ? parseInt(spo2Match[1]) : 0,
                steps: 0,
                battery: 80,
                lat: gpsLatMatch ? parseFloat(gpsLatMatch[1]) : 0,
                lng: gpsLonMatch ? parseFloat(gpsLonMatch[1]) : 0,
              },
            };
            console.log(`[SerialBridge] 📩 ${payload.deviceSn} 心率=${payload.data.heartRate} 血氧=${payload.data.bloodOxygen}`);
            mqttClient.publish('bracelet/data', JSON.stringify(payload), { qos: 1 });
          }
        });
      });
    } catch (err) {
      console.log('  ⚠ ESP32串口桥: 未启动 (' + err.message + ')');
    }
  });
}

startServer().catch(err => {
  console.error('[启动失败]', err);
  process.exit(1);
});

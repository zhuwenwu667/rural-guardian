/**
 * IoT 设备引擎服务
 * 参考 IoT DC3 和知安系统架构设计
 * 模拟设备数据上报、规则引擎告警评估
 */
const db = require('../config/db');
const verbose = process.env.DEVICE_ENGINE_VERBOSE === 'true' || process.env.LOG_LEVEL === 'debug';

class DeviceEngine {
  constructor() {
    this.devices = new Map();       // 在线设备缓存: deviceId -> deviceData
    this.alertRules = new Map();    // 告警规则缓存: ruleId -> rule
    this.simulationTimer = null;    // 模拟定时器
    this.offlineCheckTimer = null;  // 离线检测定时器
    this.isRunning = false;
  }

  /**
   * 启动设备引擎
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[DeviceEngine] 设备引擎启动中...');

    // 加载告警规则到缓存
    this._loadAlertRules();

    // 初始化已有设备的实时数据
    this._initDeviceRealtime();

    // 每5秒模拟一次设备数据上报
    // 模拟器已禁用(使用真实ESP32硬件)
    /*this.simulationTimer = setInterval(() => {
      this._simulateAllDevices();
    }, 5000);*/

    // 每60秒检查一次设备离线状态
    this.offlineCheckTimer = setInterval(() => {
      this._checkOfflineDevices();
    }, 60000);

    console.log('[DeviceEngine] 设备引擎已启动，模拟数据上报间隔: 5秒');
  }

  /**
   * 停止设备引擎
   */
  async stop() {
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    if (this.offlineCheckTimer) clearInterval(this.offlineCheckTimer);
    this.isRunning = false;
    console.log('[DeviceEngine] 设备引擎已停止');
  }

  /**
   * 加载告警规则到缓存
   */
  async _loadAlertRules() {
    const rules = await db.prepare('SELECT * FROM alert_rule WHERE enabled = 1').all();
    this.alertRules.clear();
    for (const rule of rules) {
      this.alertRules.set(rule.id, rule);
    }
    console.log(`[DeviceEngine] 已加载 ${this.alertRules.size} 条告警规则`);
  }

  /**
   * 初始化已有设备的实时数据
   */
  async _initDeviceRealtime() {
    const devices = await db.prepare(`
      SELECT d.id, d.elderly_id, d.device_sn, d.type, d.battery_level, d.status
      FROM device_info d
    `).all();

    for (const device of devices) {
      const realtimeData = {
        deviceId: device.id,
        elderlyId: device.elderly_id,
        deviceSn: device.device_sn,
        deviceType: device.type,
        heartRate: this._randomInt(60, 90),
        bloodPressureSystolic: this._randomInt(110, 140),
        bloodPressureDiastolic: this._randomInt(70, 90),
        bloodOxygen: this._randomFloat(95, 99, 1),
        temperature: this._randomFloat(36.0, 37.0, 1),
        steps: this._randomInt(1000, 8000),
        battery: device.battery_level || this._randomInt(20, 100),
        status: device.status || 'ONLINE',
        lastReportAt: new Date().toISOString().replace('T',' ').replace(/\.\d{3}Z$/, ''),
        locationLat: this._randomFloat(30.2, 30.8, 6),
        locationLng: this._randomFloat(114.2, 114.8, 6),
      };

      this.devices.set(device.id, realtimeData);

      // 写入数据库
      this._upsertRealtime(realtimeData);
    }

    console.log(`[DeviceEngine] 已初始化 ${devices.length} 台设备的实时数据`);
  }

  /**
   * 模拟所有设备数据上报
   */
  _simulateAllDevices() {
    if (this.devices.size === 0) return;

    for (const [deviceId, data] of this.devices) {
      // 只模拟 ONLINE 设备
      if (data.status !== 'ONLINE') continue;

      // 模拟数据波动
      const newData = this.simulateDeviceData(data);

      // 更新缓存
      this.devices.set(deviceId, newData);

      // 写入实时数据表
      this._upsertRealtime(newData);

      // 写入历史数据表
      this._insertHistory(newData);

      // 规则引擎评估
      const alerts = this.evaluateAlertRules(newData);

      // 如果有告警，写入告警记录
      for (const alert of alerts) {
        this._createAlertRecord(newData, alert);
      }
    }
  }

  /**
   * 模拟单个设备数据上报
   * @param {Object} prevData - 上一次的数据
   * @returns {Object} 新的设备数据
   */
  simulateDeviceData(prevData) {
    if (!prevData) {
      return {
        heartRate: this._randomInt(60, 90),
        bloodPressureSystolic: this._randomInt(110, 140),
        bloodPressureDiastolic: this._randomInt(70, 90),
        bloodOxygen: this._randomFloat(95, 99, 1),
        temperature: this._randomFloat(36.0, 37.0, 1),
        steps: this._randomInt(1000, 8000),
        battery: this._randomInt(20, 100),
        status: 'ONLINE',
        lastReportAt: new Date().toISOString().replace('T',' ').replace(/\.\d{3}Z$/, ''),
        locationLat: this._randomFloat(30.2, 30.8, 6),
        locationLng: this._randomFloat(114.2, 114.8, 6),
      };
    }

    // 在前一次数据基础上小幅波动
    const newData = { ...prevData };

    // 心率波动 (-3 ~ +3)
    newData.heartRate = Math.max(40, Math.min(120, prevData.heartRate + this._randomInt(-3, 3)));

    // 血压波动
    newData.bloodPressureSystolic = Math.max(90, Math.min(180, prevData.bloodPressureSystolic + this._randomInt(-2, 2)));
    newData.bloodPressureDiastolic = Math.max(60, Math.min(110, prevData.bloodPressureDiastolic + this._randomInt(-2, 2)));

    // 血氧波动
    newData.bloodOxygen = Math.max(85, Math.min(100, prevData.bloodOxygen + this._randomFloat(-0.3, 0.3, 1)));

    // 体温波动
    newData.temperature = Math.max(35.5, Math.min(39.5, prevData.temperature + this._randomFloat(-0.1, 0.1, 1)));

    // 步数累加
    newData.steps = prevData.steps + this._randomInt(0, 15);

    // 电量缓慢下降
    newData.battery = Math.max(0, prevData.battery - (Math.random() < 0.1 ? 1 : 0));

    // 位置微调
    newData.locationLat = prevData.locationLat + this._randomFloat(-0.0001, 0.0001, 6);
    newData.locationLng = prevData.locationLng + this._randomFloat(-0.0001, 0.0001, 6);

    // 更新时间
    newData.lastReportAt = new Date().toISOString().replace('T',' ').replace(/\.\d{3}Z$/, '');

    // 模拟跌倒检测（极低概率触发）
    newData.fallDetected = Math.random() < 0.002 ? 1 : 0;

    return newData;
  }

  /**
   * 规则引擎：检查数据是否触发告警
   * @param {Object} deviceData - 设备实时数据
   * @returns {Array} 触发的告警列表
   */
  evaluateAlertRules(deviceData) {
    const triggeredAlerts = [];

    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      const metricValue = this._getMetricValue(deviceData, rule.metric);
      if (metricValue === undefined) continue;

      let triggered = false;

      switch (rule.condition) {
        case 'gt':
          triggered = metricValue > rule.threshold;
          break;
        case 'lt':
          triggered = metricValue < rule.threshold;
          break;
        case 'eq':
          triggered = metricValue === rule.threshold;
          break;
        case 'gte':
          triggered = metricValue >= rule.threshold;
          break;
        case 'lte':
          triggered = metricValue <= rule.threshold;
          break;
      }

      if (triggered) {
        triggeredAlerts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          metric: rule.metric,
          condition: rule.condition,
          threshold: rule.threshold,
          level: rule.level,
          currentValue: metricValue,
          description: rule.description,
        });
      }
    }

    return triggeredAlerts;
  }

  /**
   * 获取指标值
   */
  _getMetricValue(deviceData, metric) {
    const metricMap = {
      heart_rate: deviceData.heartRate,
      blood_oxygen: deviceData.bloodOxygen,
      temperature: deviceData.temperature,
      battery: deviceData.battery,
      fall: deviceData.fallDetected || 0,
      blood_pressure_systolic: deviceData.bloodPressureSystolic,
      blood_pressure_diastolic: deviceData.bloodPressureDiastolic,
    };
    return metricMap[metric];
  }

  /**
   * 检查离线设备
   */
  _checkOfflineDevices() {
    const now = new Date();
    const offlineThreshold = 30 * 60 * 1000; // 30分钟

    for (const [deviceId, data] of this.devices) {
      if (data.status === 'OFFLINE') continue;

      const lastReport = new Date(data.lastReportAt);
      const diff = now - lastReport;

      if (diff > offlineThreshold) {
        data.status = 'OFFLINE';
        this.devices.set(deviceId, data);
        this._upsertRealtime(data);

        // 创建离线告警
        const offlineRule = this._findRule('offline');
        if (offlineRule) {
          this._createAlertRecord(data, {
            ruleId: offlineRule.id,
            ruleName: offlineRule.name,
            metric: 'offline',
            condition: 'gt',
            threshold: offlineRule.threshold,
            level: offlineRule.level,
            currentValue: Math.floor(diff / 60000),
            description: `设备离线超过${Math.floor(diff / 60000)}分钟`,
          });
        }
      }
    }
  }

  /**
   * 查找指定 metric 的规则
   */
  _findRule(metric) {
    for (const [id, rule] of this.alertRules) {
      if (rule.metric === metric && rule.enabled) return rule;
    }
    return null;
  }

  /**
   * 写入/更新实时数据表
   */
  async _upsertRealtime(data) {
    try {
      await db.prepare(`
        INSERT INTO device_realtime (device_id, elderly_id, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, blood_oxygen, temperature, steps, battery, status, last_report_at, location_lat, location_lng)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(device_id) DO UPDATE SET
          elderly_id = excluded.elderly_id,
          heart_rate = excluded.heart_rate,
          blood_pressure_systolic = excluded.blood_pressure_systolic,
          blood_pressure_diastolic = excluded.blood_pressure_diastolic,
          blood_oxygen = excluded.blood_oxygen,
          temperature = excluded.temperature,
          steps = excluded.steps,
          battery = excluded.battery,
          status = excluded.status,
          last_report_at = excluded.last_report_at,
          location_lat = excluded.location_lat,
          location_lng = excluded.location_lng
      `).run(
        data.deviceId, data.elderlyId,
        data.heartRate, data.bloodPressureSystolic, data.bloodPressureDiastolic,
        data.bloodOxygen, data.temperature, data.steps, data.battery,
        data.status, data.lastReportAt,
        data.locationLat, data.locationLng
      );
    } catch (e) {
      console.error('[DeviceEngine] 实时数据写入失败:', e.message);
    }
  }

  /**
   * 写入历史数据表
   */
  async _insertHistory(data) {
    try {
      await db.prepare(`
        INSERT INTO device_history (device_id, elderly_id, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, blood_oxygen, temperature, steps, battery, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.deviceId, data.elderlyId,
        data.heartRate, data.bloodPressureSystolic, data.bloodPressureDiastolic,
        data.bloodOxygen, data.temperature, data.steps, data.battery,
        data.lastReportAt
      );
    } catch (e) {
      console.error('[DeviceEngine] 历史数据写入失败:', e.message);
    }
  }

  /**
   * 创建告警记录
   */
  async _createAlertRecord(deviceData, alert) {
    try {
      // 避免短时间内重复创建相同告警（1分钟内同设备同规则不重复）
      const recentAlert = await db.prepare(`
        SELECT id FROM alert_record
        WHERE elderly_id = ? AND type = ? AND status = 'PENDING'
        AND created_at > datetime('now', 'localtime', '-1 minute')
      `).get(deviceData.elderlyId, `DEVICE_${alert.metric.toUpperCase()}`);

      if (recentAlert) return;

      const levelMap = {
        P0: 'CRITICAL',
        P1: 'HIGH',
        P2: 'MEDIUM',
      };

      await db.prepare(`
        INSERT INTO alert_record (elderly_id, type, level, status, description, created_at)
        VALUES (?, ?, ?, 'PENDING', ?, NOW())
      `).run(
        deviceData.elderlyId,
        `DEVICE_${alert.metric.toUpperCase()}`,
        levelMap[alert.level] || 'MEDIUM',
        `${alert.ruleName}：当前值 ${alert.currentValue}，阈值 ${alert.threshold}（设备ID: ${deviceData.deviceId}）`
      );
    } catch (e) {
      console.error('[DeviceEngine] 告警创建失败:', e.message);
    }
  }

  /**
   * 获取所有设备实时数据（从缓存）
   */
  getAllRealtimeData() {
    const result = [];
    for (const [deviceId, data] of this.devices) {
      result.push({
        deviceId: data.deviceId,
        elderlyId: data.elderlyId,
        deviceSn: data.deviceSn,
        deviceType: data.deviceType,
        heartRate: data.heartRate,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        bloodOxygen: data.bloodOxygen,
        temperature: data.temperature,
        steps: data.steps,
        battery: data.battery,
        status: data.status,
        lastReportAt: data.lastReportAt,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        fallDetected: data.fallDetected || 0,
      });
    }
    return result;
  }

  /**
   * 获取指定老人的设备实时数据
   */
  async getRealtimeDataByElderly(elderlyId) {
    const result = [];
    for (const [deviceId, data] of this.devices) {
      if (data.elderlyId === Number(elderlyId)) {
        result.push({
          deviceId: data.deviceId,
          elderlyId: data.elderlyId,
          deviceSn: data.deviceSn,
          deviceType: data.deviceType,
          heartRate: data.heartRate,
          bloodPressureSystolic: data.bloodPressureSystolic,
          bloodPressureDiastolic: data.bloodPressureDiastolic,
          bloodOxygen: data.bloodOxygen,
          temperature: data.temperature,
          steps: data.steps,
          battery: data.battery,
          status: data.status,
          lastReportAt: data.lastReportAt,
          locationLat: data.locationLat,
          locationLng: data.locationLng,
          fallDetected: data.fallDetected || 0,
        });
      }
    }
    return result;
  }

  /**
   * 获取设备统计信息
   */
  async getStatistics() {
    let onlineCount = 0;
    let offlineCount = 0;
    let alertCount = 0;

    for (const [deviceId, data] of this.devices) {
      if (data.status === 'ONLINE') {
        onlineCount++;
      } else {
        offlineCount++;
      }
    }

    // 查询未处理的设备相关告警数
    try {
      const alertResult = await db.prepare(`
        SELECT COUNT(*) as cnt FROM alert_record
        WHERE type LIKE 'DEVICE_%' AND status = 'PENDING'
      `).get();
      alertCount = alertResult ? alertResult.cnt : 0;
    } catch (e) {
      alertCount = 0;
    }

    const total = onlineCount + offlineCount;
    return {
      totalDevices: total,
      onlineCount,
      offlineCount,
      alertCount,
      onlineRate: total > 0 ? ((onlineCount / total) * 100).toFixed(1) : '0.0',
    };
  }

  /**
   * 发送指令到设备（模拟）
   */
  sendCommand(deviceId, command) {
    const device = this.devices.get(Number(deviceId));
    if (!device) {
      return { success: false, message: '设备不存在或未注册' };
    }

    // 模拟指令处理
    const commandHandlers = {
      REBOOT: () => {
        device.status = 'ONLINE';
        device.lastReportAt = new Date().toISOString().replace('T',' ').replace(/\.\d{3}Z$/, '');
        this.devices.set(Number(deviceId), device);
        return '设备重启指令已发送';
      },
      SYNC: () => {
        device.lastReportAt = new Date().toISOString().replace('T',' ').replace(/\.\d{3}Z$/, '');
        this.devices.set(Number(deviceId), device);
        return '数据同步指令已发送';
      },
      LOCATE: () => {
        return `设备位置: ${device.locationLat}, ${device.locationLng}`;
      },
      SET_INTERVAL: () => {
        return '上报间隔设置指令已发送';
      },
    };

    const handler = commandHandlers[command];
    if (handler) {
      return { success: true, message: handler() };
    }

    return { success: false, message: `不支持的指令: ${command}` };
  }

  /**
   * 刷新告警规则缓存
   */
  async refreshAlertRules() {
    this._loadAlertRules();
  }

  /**
   * 处理MQTT上报数据（来自真实设备）
   * @param {Object} mqttData - MQTT消息数据
   */
  async processMqttData(mqttData) {
    try {
      const { deviceSn, deviceType, elderlyId, timestamp, data, events } = mqttData;

      // 查找设备ID
      const device = await db.prepare('SELECT id, elderly_id FROM device_info WHERE device_sn = ?').get(deviceSn);
      if (!device) {
        if (verbose) console.log(`[DeviceEngine] 设备未注册: ${deviceSn}`);
        return;
      }

      const deviceId = device.id;
      const dbElderlyId = device.elderly_id || elderlyId;

      // 提取传感器值（兼容多种字段名）
      const rawHR = data.heartRate || data.hr || 0;
      const rawSpO2 = data.bloodOxygen || data.bo || data.spo2 || 0;
      const rawTemp = data.temperature || data.temp || 0;
      const rawSteps = data.steps || 0;
      const rawBattery = data.battery || data.bat || 0;

      // 零值过滤：传感器未就绪时不覆盖缓存中的有效数据
      const isZeroPacket = rawHR === 0 && rawSpO2 === 0 && rawTemp === 0;
      const cached = this.devices.get(deviceId);

      if (isZeroPacket && cached && cached.heartRate > 0) {
        // 零值包但缓存有效 → 只更新在线状态和时间，保留有效传感器数据
        this.zeroPacketCount = (this.zeroPacketCount || 0) + 1;
        if (verbose && this.zeroPacketCount % 50 === 0) {
          console.log(`[DeviceEngine] ⚠️ ${deviceSn} 连续${this.zeroPacketCount}个零值包，传感器可能异常`);
        }
      }

      const deviceData = {
        deviceId,
        deviceSn,
        deviceType,
        elderlyId: dbElderlyId,
        heartRate: isZeroPacket && cached ? cached.heartRate : rawHR,
        bloodPressureSystolic: data.bloodPressure?.systolic || data.bpSys || (cached?.bloodPressureSystolic || 0),
        bloodPressureDiastolic: data.bloodPressure?.diastolic || data.bpDia || (cached?.bloodPressureDiastolic || 0),
        bloodOxygen: isZeroPacket && cached ? cached.bloodOxygen : rawSpO2,
        temperature: isZeroPacket && cached ? cached.temperature : rawTemp,
        steps: isZeroPacket && cached ? Math.max(cached.steps, rawSteps) : rawSteps,
        battery: rawBattery > 0 ? rawBattery : (cached?.battery || 0),
        locationLat: data.location?.lat || data.gps?.lat || data.lat || (cached?.locationLat || 0),
        locationLng: data.location?.lng || data.gps?.lng || data.lng || (cached?.locationLng || 0),
        fallDetected: (data.fallDetected || (events && events.includes('FALL_DETECTED'))) ? 1 : 0,
        sosPressed: (data.sosPressed || (events && events.includes('SOS_PRESSED'))) ? 1 : 0,
        status: 'ONLINE',
        lastReportAt: (timestamp || new Date().toISOString().replace('T',' ').replace(/\.\d{3}Z$/, '')).replace('T', ' ').replace(/\.\d{3}Z$/, ''),
      };

      // 如果收到有效数据，重置零值计数器
      if (!isZeroPacket) this.zeroPacketCount = 0;

      // 更新缓存
      this.devices.set(deviceId, deviceData);

      // 写入实时数据表
      await this._upsertRealtime(deviceData);

      // 写入历史数据表（每5次上报写入一次，减少数据库压力）
      const reportCount = this._getReportCount(deviceId);
      if (reportCount % 5 === 0) {
        await this._insertHistory(deviceData);
      }

      // 评估告警规则（传感器未连接返回0时跳过告警）
      const hasRealSensorData = deviceData.heartRate > 0 || deviceData.bloodOxygen > 0;
      if (hasRealSensorData) {
        const alerts = this.evaluateAlertRules(deviceData);
        if (alerts && alerts.length > 0) {
          for (const alert of alerts) {
            try {
              await db.prepare(`
                INSERT INTO alert_record (elderly_id, type, level, status, description, created_at)
                VALUES (?, ?, ?, 'PENDING', ?, NOW())
              `).run(
                deviceData.elderlyId,
                alert.type || 'HEALTH',
                alert.level || 'MEDIUM',
                alert.description || '设备数据异常'
              );
            } catch (e) {
              console.error('[DeviceEngine] 创建告警记录失败:', e.message);
            }
          }
        }
      }

      // 处理特殊事件（跌倒、SOS等）
      if (events && events.length > 0) {
        for (const eventType of events) {
          await this._handleSpecialEvent(deviceData, eventType);
        }
      }

      // 电子围栏检测
      if (deviceData.locationLat && deviceData.locationLng && deviceData.locationLat !== 0) {
        await this._checkGeoFence(deviceData);
      }

      if (verbose) console.log(`[DeviceEngine] MQTT数据处理完成: ${deviceSn}`);
    } catch (err) {
      console.error('[DeviceEngine] 处理MQTT数据失败:', err);
    }
  }

  /**
   * 获取设备上报计数
   */
  _getReportCount(deviceId) {
    const key = `report_count_${deviceId}`;
    const count = this.reportCounts?.get(deviceId) || 0;
    if (!this.reportCounts) this.reportCounts = new Map();
    this.reportCounts.set(deviceId, count + 1);
    return count;
  }

  /**
   * 处理特殊事件
   */
  async _handleSpecialEvent(deviceData, eventType) {
    if (verbose) console.log(`[DeviceEngine] 特殊事件: ${eventType}, 设备: ${deviceData.deviceSn}`);

    const eventAlertMap = {
      'FALL_DETECTED': { type: 'FALL', level: 'CRITICAL', desc: '检测到跌倒事件' },
      'SOS_PRESSED': { type: 'SOS', level: 'CRITICAL', desc: 'SOS紧急呼叫' },
      'HEART_RATE_ABNORMAL': { type: 'HEART_RATE', level: 'HIGH', desc: '心率异常' },
      'BLOOD_PRESSURE_ABNORMAL': { type: 'BLOOD_PRESSURE', level: 'HIGH', desc: '血压异常' },
      'FENCE_BREACH': { type: 'FENCE', level: 'HIGH', desc: '离开安全区域' },
    };

    const alertInfo = eventAlertMap[eventType];
    if (!alertInfo) return;

    try {
      // 创建紧急告警
      await db.prepare(`
        INSERT INTO alert_record (elderly_id, type, level, status, description, created_at)
        VALUES (?, ?, ?, 'PENDING', ?, NOW())
      `).run(
        deviceData.elderlyId,
        alertInfo.type,
        alertInfo.level,
        `${alertInfo.desc}（设备: ${deviceData.deviceSn}）`
      );

      console.log(`[DeviceEngine] ⚠️ 紧急告警已创建: ${eventType}`);
    } catch (e) {
      console.error('[DeviceEngine] 创建事件告警失败:', e);
    }
  }

  /**
   * 电子围栏检测
   */
  async _checkGeoFence(deviceData) {
    try {
      const fences = await db.prepare('SELECT * FROM geo_fence WHERE status = 1').all();
      for (const fence of fences) {
        const distance = this._haversine(
          deviceData.locationLat, deviceData.locationLng,
          parseFloat(fence.latitude), parseFloat(fence.longitude)
        );
        if (distance > fence.radius) {
          // 避免短时间内重复告警（5分钟内同一设备同一围栏不重复）
          const cacheKey = `fence_${deviceData.deviceId}_${fence.id}`;
          const lastAlert = this.fenceAlertCache?.get(cacheKey) || 0;
          if (Date.now() - lastAlert < 5 * 60 * 1000) continue;
          if (!this.fenceAlertCache) this.fenceAlertCache = new Map();
          this.fenceAlertCache.set(cacheKey, Date.now());

          await db.prepare(`
            INSERT INTO alert_record (elderly_id, type, level, status, description, created_at)
            VALUES (?, 'GEO_FENCE', 'HIGH', 'PENDING', ?, NOW())
          `).run(deviceData.elderlyId, `老人离开${fence.name}安全区域，距离${Math.round(distance)}米（设备: ${deviceData.deviceSn}）`);
          console.log(`[DeviceEngine] ⚠️ 围栏告警: ${fence.name} 距离${Math.round(distance)}m`);
        }
      }
    } catch (e) {
      console.error('[DeviceEngine] 围栏检测失败:', e.message);
    }
  }

  /**
   * Haversine 公式计算两点间距离（米）
   */
  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // ===== 工具方法 =====

  _randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  _randomFloat(min, max, decimals) {
    const val = Math.random() * (max - min) + min;
    return Number(val.toFixed(decimals));
  }
}

// 单例模式
const deviceEngine = new DeviceEngine();

module.exports = deviceEngine;

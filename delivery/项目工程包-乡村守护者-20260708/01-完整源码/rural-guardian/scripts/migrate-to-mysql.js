/**
 * 乡村守护者 — SQLite → MySQL 一键迁移脚本
 * 用法: node scripts/migrate-to-mysql.js
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'RuralGuardian2026!',
  multipleStatements: true,
};

const DB_NAME = 'rural_guardian';

async function migrate() {
  let conn;
  try {
    // 1. 连接 MySQL（不指定数据库）
    console.log('[1/4] 连接 MySQL...');
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('  ✓ 已连接');

    // 2. 创建数据库并导入表结构
    console.log('[2/4] 创建数据库和表...');
    const sql = fs.readFileSync(
      path.join(__dirname, '..', 'backend', 'models', 'init-mysql.sql'),
      'utf-8'
    );
    // 分割多条语句（MySQL multipleStatements 模式）
    const statements = sql
      .replace(/--.*$/gm, '') // 移除注释
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (e) {
        // 忽略表已存在、数据库已存在等错误
        if (!e.message.includes('already exists') && !e.message.includes('Duplicate')) {
          console.error('  ✗', e.message.substring(0, 80));
        }
      }
    }
    console.log('  ✓ 表结构创建完成');

    // 3. 切换数据库
    await conn.query(`USE ${DB_NAME}`);

    // 4. 种子数据
    console.log('[3/4] 插入种子数据...');
    await seedData(conn);
    console.log('  ✓ 种子数据完成');

    // 5. 验证
    console.log('[4/4] 验证...');
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`  ✓ ${tables.length} 张表已创建`);

    const [users] = await conn.query('SELECT COUNT(*) AS cnt FROM sys_user');
    console.log(`  ✓ ${users[0].cnt} 个用户已创建`);

    console.log('\n========================================');
    console.log('  🎉 迁移完成! MySQL 数据库已就绪');
    console.log('  Database: rural_guardian');
    console.log('  Host:     127.0.0.1:3306');
    console.log('  User:     root');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n✗ 迁移失败:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

async function seedData(conn) {
  const hash = (pwd) => bcrypt.hashSync(pwd, 10);

  // 系统配置
  const configs = [
    ['server_port', '8080', 'server', '服务端口号'],
    ['jwt_secret', 'rural-guardian-default-secret-key-2024', 'security', 'JWT签名密钥'],
    ['jwt_expire', '24h', 'security', 'JWT过期时间'],
    ['page_size', '20', 'system', '默认分页大小'],
    ['system_name', '乡村守护者智慧养老平台', 'system', '系统名称'],
    ['xfyun_app_id', '', 'voice', '科大讯飞 App ID'],
    ['xfyun_api_key', '', 'voice', '科大讯飞 API Key'],
    ['xfyun_api_secret', '', 'voice', '科大讯飞 API Secret'],
    ['voice_language', 'zh_cn', 'voice', '语音识别语言'],
    ['voice_dialect', 'tianjin', 'voice', '方言模式'],
    ['voice_tts_voice', 'xiaoyan', 'voice', '语音合成发音人'],
    ['voice_enabled', 'true', 'voice', '语音服务总开关'],
    ['ai_provider', 'zhipu', 'ai', 'AI服务提供商'],
    ['ai_api_key', '', 'ai', 'AI服务 API Key'],
    ['ai_api_url', 'https://open.bigmodel.cn/api/paas/v4/chat/completions', 'ai', 'AI服务接口地址'],
    ['ai_model', 'glm-4-flash', 'ai', 'AI模型名称'],
    ['ai_health_prompt', '你是一位专业的老年健康分析师，请根据以下健康数据给出简要分析建议：', 'ai', '健康分析提示词模板'],
    ['ai_enabled', 'true', 'ai', 'AI服务总开关'],
    ['map_provider', 'amap', 'map', '地图服务提供商'],
    ['map_api_key', '', 'map', '地图服务 API Key'],
    ['map_api_secret', '', 'map', '地图服务 API Secret'],
    ['map_geo_fence_radius', '500', 'map', '电子围栏半径（米）'],
    ['map_tracking_interval', '300', 'map', '定位上报间隔（秒）'],
    ['map_enabled', 'true', 'map', '地图服务总开关'],
    ['sms_provider', 'aliyun', 'sms', '短信服务提供商'],
    ['sms_access_key_id', '', 'sms', '短信服务 Access Key ID'],
    ['sms_access_key_secret', '', 'sms', '短信服务 Access Key Secret'],
    ['sms_sign_name', '乡村守护', 'sms', '短信签名'],
    ['sms_template_code', '', 'sms', '短信模板Code'],
    ['sms_enabled', 'true', 'sms', '短信服务总开关'],
    ['push_provider', 'jpush', 'push', 'APP推送服务提供商'],
    ['push_app_key', '', 'push', '极光推送 App Key'],
    ['push_master_secret', '', 'push', '极光推送 Master Secret'],
    ['push_enabled', 'true', 'push', 'APP推送服务总开关'],
  ];
  for (const c of configs) {
    await conn.query(
      'INSERT IGNORE INTO system_config (config_key, config_value, config_group, description) VALUES (?, ?, ?, ?)',
      c
    );
  }

  // 村庄
  const [villageResult] = await conn.query(
    'INSERT INTO village_info (name, town, district, population, elderly_count, staff_count, service_point_address, contact_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ['幸福村', '阳光镇', '青山县', 3200, 186, 5, '幸福村村委会一楼', '0571-88886666']
  );
  const villageId = villageResult.insertId;

  // 用户
  const users = [
    ['gov_admin', hash('admin123'), '王建国', 'GOV_ADMIN', '13900000001', null, 1],
    ['village_staff', hash('staff123'), '李秀芳', 'VILLAGE_STAFF', '13900000002', villageId, 1],
    ['provider_user', hash('provider123'), '张明远', 'PROVIDER', '13900000003', null, 1],
    ['family_user', hash('family123'), '朱雨晴', 'FAMILY_MEMBER', '13900000004', villageId, 1],
    ['elderly_user', hash('elderly123'), '王大爷', 'ELDERLY', '13900000005', villageId, 1],
  ];
  const userIds = {};
  for (const u of users) {
    const [r] = await conn.query(
      'INSERT INTO sys_user (username, password_hash, real_name, role, phone, village_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      u
    );
    userIds[u[0]] = r.insertId;
  }

  // 服务商
  const [providerResult] = await conn.query(
    'INSERT INTO provider_info (user_id, name, service_types, contact_person, contact_phone, service_area, rating, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userIds.provider_user, '阳光养老服务中心', 'MEDICAL,LIFE_CARE,COMPANION', '张明远', '13800001111', '阳光镇', 4.8, 'ACTIVE']
  );
  const providerId = providerResult.insertId;

  // 老人信息
  const [elderlyResult] = await conn.query(
    "INSERT INTO elderly_info (name, gender, birth_date, id_card, phone, address, village_id, emergency_contact, emergency_phone, health_status, living_alone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['王福贵', '男', '1950-03-15', '330102195003150011', '13900000005', '幸福村一组12号', villageId, '朱雨晴', '13900000004', 'GOOD', 1]
  );
  const elderlyId = elderlyResult.insertId;

  // 家属关联
  await conn.query(
    'INSERT INTO family_member (user_id, elderly_id, relationship, phone) VALUES (?, ?, ?, ?)',
    [userIds.family_user, elderlyId, '女儿', '13900000004']
  );

  // 健康记录
  const healthData = [
    [elderlyId, 72, 130, 82, 97.5, 36.5, 6.5, 3200, '2026-04-20 08:00:00', '各项指标正常'],
    [elderlyId, 78, 145, 95, 96.0, 36.8, 5.0, 1800, '2026-04-19 08:00:00', '血压偏高，建议关注'],
    [elderlyId, 68, 125, 78, 98.0, 36.4, 7.0, 4500, '2026-04-18 08:00:00', '状态良好'],
    [elderlyId, 75, 135, 85, 97.0, 36.6, 6.0, 2800, '2026-04-17 08:00:00', '正常'],
    [elderlyId, 80, 150, 98, 95.5, 37.0, 4.5, 1200, '2026-04-16 08:00:00', '血压偏高，睡眠不足'],
  ];
  for (const h of healthData) {
    await conn.query(
      'INSERT INTO health_record (elderly_id, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, blood_oxygen, temperature, sleep_hours, steps, record_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      h
    );
  }

  // 预警记录
  const alerts = [
    [elderlyId, 'HEALTH_ABNORMAL', 'HIGH', 'RESOLVED', '血压持续偏高，已通知家属', userIds.village_staff, '2026-04-19 10:30:00', '2026-04-19 09:15:00'],
    [elderlyId, 'GEO_FENCE', 'MEDIUM', 'RESOLVED', '老人离开安全区域，已确认安全', userIds.village_staff, '2026-04-18 15:00:00', '2026-04-18 14:30:00'],
    [elderlyId, 'FALL', 'CRITICAL', 'PROCESSING', '检测到疑似跌倒，已派人员前往', userIds.village_staff, null, '2026-04-21 07:45:00'],
    [elderlyId, 'DEVICE_OFFLINE', 'LOW', 'PENDING', '手环设备离线超过2小时', null, null, '2026-04-21 06:00:00'],
    [elderlyId, 'SOS', 'CRITICAL', 'RESOLVED', '老人按下SOS按钮，已处理', userIds.village_staff, '2026-04-15 11:20:00', '2026-04-15 11:00:00'],
  ];
  for (const a of alerts) {
    await conn.query(
      'INSERT INTO alert_record (elderly_id, type, level, status, description, handler_id, handled_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      a
    );
  }

  // 服务工单
  const orders = [
    [elderlyId, 'MEDICAL', 'COMPLETED', '定期健康检查', providerId, userIds.village_staff, userIds.family_user, '2026-04-18 16:00:00', 5, '2026-04-18 09:00:00'],
    [elderlyId, 'LIFE_CARE', 'IN_PROGRESS', '居家清洁服务', providerId, userIds.village_staff, userIds.family_user, null, null, '2026-04-21 08:00:00'],
    [elderlyId, 'COMPANION', 'ASSIGNED', '心理陪伴服务', providerId, userIds.village_staff, userIds.family_user, null, null, '2026-04-21 09:00:00'],
    [elderlyId, 'EMERGENCY', 'COMPLETED', '紧急救助-跌倒处理', providerId, userIds.village_staff, userIds.family_user, '2026-04-15 12:00:00', 5, '2026-04-15 11:05:00'],
    [elderlyId, 'OTHER', 'CREATED', '代购生活用品', null, null, userIds.family_user, null, null, '2026-04-21 10:00:00'],
  ];
  for (const o of orders) {
    await conn.query(
      'INSERT INTO service_order (elderly_id, type, status, description, provider_id, village_staff_id, family_id, completed_at, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      o
    );
  }

  // 设备
  const devices = [
    [elderlyId, 'BAND-2026-0001', 'BAND', 85, 'ONLINE', '2026-04-21 07:50:00', 'v2.1.3'],
    [elderlyId, 'GW-2026-0001', 'GATEWAY', 100, 'ONLINE', '2026-04-21 07:55:00', 'v1.5.0'],
    [elderlyId, 'TERM-2026-0001', 'TERMINAL', 60, 'OFFLINE', '2026-04-21 04:30:00', 'v3.0.1'],
  ];
  for (const d of devices) {
    await conn.query(
      'INSERT INTO device_info (elderly_id, device_sn, type, battery_level, status, last_heartbeat, firmware_version) VALUES (?, ?, ?, ?, ?, ?, ?)',
      d
    );
  }

  // 告警规则
  const rules = [
    ['心率过高告警', 'heart_rate', 'gt', 100, 'P1', 1, '心率超过100bpm时触发告警'],
    ['心率过低告警', 'heart_rate', 'lt', 50, 'P1', 1, '心率低于50bpm时触发告警'],
    ['低血氧告警', 'blood_oxygen', 'lt', 90, 'P0', 1, '血氧饱和度低于90%时触发紧急告警'],
    ['发热告警', 'temperature', 'gt', 37.5, 'P1', 1, '体温超过37.5度时触发发热告警'],
    ['低电量告警', 'battery', 'lt', 10, 'P2', 1, '设备电量低于10%时触发低电量告警'],
    ['跌倒检测告警', 'fall', 'eq', 1, 'P0', 1, '检测到老人跌倒时触发紧急告警'],
    ['设备离线告警', 'offline', 'gt', 30, 'P1', 1, '设备离线超过30分钟时触发告警'],
  ];
  for (const r of rules) {
    await conn.query(
      'INSERT INTO alert_rule (name, metric, `condition`, threshold, level, enabled, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      r
    );
  }

  console.log('  [种子数据] 已插入: 村庄1, 用户5, 服务商1, 老人1, 健康5, 预警5, 工单5, 设备3, 规则7');
}

migrate();

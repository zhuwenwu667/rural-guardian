/**
 * 演示种子数据 — 创建比赛用 Demo 场景
 * 运行: node seed-demo.js
 */
const db = require('./config/db');
const bcrypt = require('bcryptjs');

console.log('========================================');
console.log('  乡村守护者 - 演示种子数据创建');
console.log('========================================\n');

// === 村庄 ===
console.log('--- 创建村庄 ---');
const villages = [
  ['幸福村', '下营镇', '蓟州区', 3200, 32, 3, '幸福村党群服务中心', '13800001111'],
  ['阳光村', '穿芳峪镇', '蓟州区', 1800, 18, 2, '阳光村村委会', '13800002222'],
  ['平安村', '罗庄子镇', '蓟州区', 1200, 12, 1, '平安村卫生室', '13800003333'],
];
const vIds = [];
villages.forEach(v => {
  const ex = db.prepare('SELECT id FROM village_info WHERE name = ?').get(v[0]);
  if (!ex) {
    const r = db.prepare('INSERT INTO village_info (name,town,district,population,elderly_count,staff_count,service_point_address,contact_phone) VALUES (?,?,?,?,?,?,?,?)').run(...v);
    vIds.push(r.lastInsertRowid);
    console.log('  + ' + v[0]);
  } else { vIds.push(ex.id); console.log('  = ' + v[0]); }
});

// === 老人 ===
console.log('\n--- 创建老人 (12位) ---');
const elderly = [
  ['王福贵','男','1954-08-15','13900000001',vIds[0],'张小明','13811111111','WARNING',1],
  ['李秀英','女','1958-03-22','13900000002',vIds[0],'李大明','13811111112','WARNING',1],
  ['张建国','男','1951-11-08','13900000003',vIds[0],'张小红','13811111113','GOOD',0],
  ['张美兰','女','1945-06-01','13900000004',vIds[0],'陈志强','13811111114','DANGER',1],
  ['刘德厚','男','1956-01-30','13900000005',vIds[1],'刘小伟','13811111115','GOOD',0],
  ['赵淑芬','女','1959-09-12','13900000006',vIds[1],'赵明辉','13811111116','WARNING',1],
  ['陈永发','男','1948-12-25','13900000007',vIds[1],'陈丽华','13811111117','GOOD',0],
  ['钱桂花','女','1952-04-08','13900000008',vIds[2],'钱建国','13811111118','DANGER',1],
  ['马德胜','男','1955-07-19','13900000009',vIds[2],'马晓明','13811111119','GOOD',0],
  ['周翠英','女','1960-10-03','13900000010',vIds[0],'周志强','13811111120','GOOD',0],
  ['吴天佑','男','1947-02-14','13900000011',vIds[1],'吴丽萍','13811111121','WARNING',1],
  ['孙秀珍','女','1953-05-28','13900000012',vIds[2],'孙文斌','13811111122','GOOD',0],
];
const eIds = [];
elderly.forEach(e => {
  const ex = db.prepare('SELECT id FROM elderly_info WHERE phone = ?').get(e[3]);
  if (!ex) {
    const r = db.prepare('INSERT INTO elderly_info (name,gender,birth_date,phone,village_id,emergency_contact,emergency_phone,health_status,living_alone) VALUES (?,?,?,?,?,?,?,?,?)').run(...e);
    eIds.push(r.lastInsertRowid);
  } else { eIds.push(ex.id); }
});
console.log('  创建/更新: ' + eIds.length + ' 位');

// === 用户 ===
console.log('\n--- 创建用户 ---');
const pwd = bcrypt.hashSync('123456', 10);
const users = [
  ['gov_admin','政府管理员','GOV_ADMIN',null],
  ['village_happy','张为民','VILLAGE_STAFF',vIds[0]],
  ['village_sunny','李建国','VILLAGE_STAFF',vIds[1]],
  ['village_pingan','王守义','VILLAGE_STAFF',vIds[2]],
  ['provider_health','康养服务','PROVIDER',null],
  ['provider_clean','家政服务','PROVIDER',null],
  ['family_wang','张小明','FAMILY_MEMBER',vIds[0]],
  ['family_li','李大明','FAMILY_MEMBER',vIds[0]],
  ['elderly_wang','王福贵','ELDERLY',vIds[0]],
  ['elderly_zhang','张美兰','ELDERLY',vIds[0]],
  ['cs_user','客服中心','CS',null],
  // 通用演示账号（供 demo-login 映射使用）
  ['village_staff','村级专员(演示)','VILLAGE_STAFF',vIds[0]],
  ['provider_user','服务商(演示)','PROVIDER',null],
  ['family_user','家属(演示)','FAMILY_MEMBER',vIds[0]],
  ['elderly_user','老人(演示)','ELDERLY',vIds[0]],
];
users.forEach(u => {
  const ex = db.prepare('SELECT id FROM sys_user WHERE username = ?').get(u[0]);
  if (!ex) db.prepare('INSERT INTO sys_user (username,password_hash,real_name,role,village_id,phone,status) VALUES (?,?,?,?,?,?,1)').run(u[0],pwd,u[1],u[2],u[3],'13800000000');
});
console.log('  创建: ' + users.length + ' 个 (密码均为 123456)');

// === 设备 ===
console.log('\n--- 创建设备 ---');
const devices = [
  [eIds[0],'BAND001','BAND',100,'ONLINE'],
  [eIds[1],'BAND002','BAND',85,'ONLINE'],
  [eIds[3],'BAND003','BAND',45,'ONLINE'],
  [eIds[4],'BAND004','BAND',92,'ONLINE'],
  [eIds[5],'BAND005','BAND',68,'ONLINE'],
  [eIds[7],'BAND006','BAND',22,'OFFLINE'],
];
devices.forEach(d => {
  const ex = db.prepare('SELECT id FROM device_info WHERE device_sn = ?').get(d[1]);
  if (!ex) db.prepare('INSERT INTO device_info (elderly_id,device_sn,type,battery_level,status) VALUES (?,?,?,?,?)').run(...d);
});
console.log('  创建: ' + devices.length + ' 台 (5在线 + 1离线)');

// === 告警规则 ===
console.log('\n--- 创建告警规则 ---');
const rules = [
  ['心率过高','heart_rate','gt',120,'P1',1],
  ['心率过低','heart_rate','lt',45,'P1',1],
  ['血氧过低','blood_oxygen','lt',90,'P1',1],
  ['体温过高','temperature','gt',38.0,'P2',1],
  ['体温过低','temperature','lt',35.5,'P2',1],
  ['跌倒检测','fall','eq',1,'P0',1],
  ['设备离线','offline','gt',30,'P2',1],
  ['低电量','battery','lt',15,'P2',1],
];
rules.forEach(r => {
  const ex = db.prepare('SELECT id FROM alert_rule WHERE name = ?').get(r[0]);
  if (!ex) db.prepare('INSERT INTO alert_rule (name,metric,condition,threshold,level,enabled) VALUES (?,?,?,?,?,?)').run(...r);
});
console.log('  创建: ' + rules.length + ' 条');

// === 健康历史数据 (过去3天) ===
console.log('\n--- 创建历史健康数据 ---');
const now = Date.now();
let hCount = 0;
for (let day = 3; day >= 0; day--) {
  for (let h = 0; h < 24; h += 1) {
    for (let e = 0; e < 6; e++) {
      const dt = new Date(now - day * 86400000 - h * 3600000);
      const hr = 68 + Math.floor(Math.random() * 20);
      const spo2 = 95 + Math.random() * 5;
      const temp = 36.2 + Math.random() * 1.2;
      db.prepare('INSERT INTO health_record (elderly_id,heart_rate,blood_oxygen,temperature,steps,record_date) VALUES (?,?,?,?,?,?)')
        .run(eIds[e], hr, Math.round(spo2 * 10) / 10, Math.round(temp * 10) / 10, 2000 + Math.floor(Math.random() * 5000), dt.toISOString());
      hCount++;
    }
  }
}
console.log('  创建: ' + hCount + ' 条健康记录');

// === 演示告警 ===
console.log('\n--- 创建演示告警 ---');
const alerts = [
  [eIds[3],'FALL','CRITICAL','RESOLVED','张美兰检测到跌倒，已触发SOS报警并通知家属'],
  [eIds[1],'HEART_RATE','HIGH','RESOLVED','李秀英心率异常132bpm，村级专员已上门查看'],
  [eIds[7],'BLOOD_OXYGEN','HIGH','PENDING','钱桂花血氧降至87%，需立即关注'],
  [eIds[3],'SOS','CRITICAL','RESOLVED','张美兰按下SOS按钮，已派服务商前往'],
  [eIds[7],'DEVICE_OFFLINE','LOW','PENDING','钱桂花手环离线超过2小时，尝试联系紧急联系人'],
  [eIds[0],'FALL','CRITICAL','PENDING','王福贵疑似跌倒，加速度计检测到高冲击'],
  [eIds[5],'HEALTH_ABNORMAL','MEDIUM','PENDING','赵淑芬体温38.2°C，持续偏高需观察'],
];
alerts.forEach((a, i) => {
  const dt = new Date(now - (alerts.length - i) * 3600000 + i * 600000);
  db.prepare('INSERT INTO alert_record (elderly_id,type,level,status,description,created_at) VALUES (?,?,?,?,?,?)')
    .run(a[0], a[1], a[2], a[3], a[4], dt.toISOString());
});
console.log('  创建: ' + alerts.length + ' 条 (3已处理 + 4待处理)');

// === 汇总 ===
console.log('\n========================================');
const stats = {
  '老人': db.prepare('SELECT COUNT(*) as c FROM elderly_info').get().c,
  '用户': db.prepare('SELECT COUNT(*) as c FROM sys_user').get().c,
  '设备': db.prepare('SELECT COUNT(*) as c FROM device_info').get().c,
  '告警规则': db.prepare('SELECT COUNT(*) as c FROM alert_rule').get().c,
  '告警记录': db.prepare('SELECT COUNT(*) as c FROM alert_record').get().c,
  '健康记录': db.prepare('SELECT COUNT(*) as c FROM health_record').get().c,
  '村庄': db.prepare('SELECT COUNT(*) as c FROM village_info').get().c,
};
for (const [k, v] of Object.entries(stats)) console.log('  ' + k + ': ' + v);
console.log('========================================');
console.log('种子数据创建完成！');
console.log('默认密码: 123456');

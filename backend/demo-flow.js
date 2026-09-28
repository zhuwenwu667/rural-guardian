/**
 * 比赛演示流程 — 一键触发全链路
 * 用法: node demo-flow.js
 *
 * 自动执行:
 *  1. SOS 紧急求助触发
 *  2. 等待5秒 → 村级专员处理告警
 *  3. 等待3秒 → 跌倒检测触发
 *  4. 等待5秒 → 家属收到通知
 */
const http = require('http');

const BASE = 'http://localhost:8080';
let token = '';

function api(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function log(msg) {
  const time = new Date().toLocaleTimeString('zh-CN');
  console.log(`[${time}] ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   乡村守护者 - 演示流程自动化        ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Step 0: 登录
  log('登录...');
  const loginRes = await api('POST', '/api/auth/login', { username: 'gov_admin', password: 'admin123' });
  token = loginRes.data.token;
  log(`✅ 登录成功 (角色: ${loginRes.data.user.role})`);

  // 重置流程
  await api('POST', '/api/demo/reset');
  await sleep(1000);

  // Step 1: 张美兰 SOS 紧急求助
  log('\n📢 场景1: 张美兰(81岁,独居)按下SOS按钮');
  log('   手环震动 → LED闪烁 → 4G通话触发 → 平台收到告警');
  const sosRes = await api('POST', '/api/demo/trigger-sos', { elderlyId: 5 }); // 张美兰
  log(`   ✅ ${sosRes.message}`);
  await sleep(5000);

  // Step 2: 村级专员处理
  log('\n👨‍💼 场景2: 幸福村村级专员张为民收到告警推送');
  log('   打开APP → 查看告警详情 → 联系老人 → 确认处理');
  const handleRes = await api('POST', '/api/demo/handle-alert', {
    alertId: sosRes.data.alertId,
    handlerName: '张为民（幸福村村级专员）',
    action: 'RESOLVED',
  });
  log(`   ✅ ${handleRes.message}`);
  await sleep(3000);

  // Step 3: 王福贵跌倒检测
  log('\n🚨 场景3: 王福贵(72岁,独居)跌倒检测');
  log('   SFD01毫米波雷达 + ADXL加速度计双重确认');
  const fallRes = await api('POST', '/api/demo/trigger-fall', { elderlyId: 1 });
  log(`   ✅ ${fallRes.message}`);
  await sleep(5000);

  // Step 4: 家属通知
  log('\n📱 场景4: 王福贵家属张小明收到通知');
  log('   APP推送 → 查看老人位置 → 一键拨打老人电话');
  await api('POST', '/api/demo/handle-alert', {
    alertId: fallRes.data.alertId,
    handlerName: '张小明（家属）',
    action: 'CONFIRMED',
  });
  log('   ✅ 家属已确认收到告警');

  // 最终状态
  await sleep(1000);
  const status = await api('GET', '/api/demo/flow-status');
  log('\n╔══════════════════════════════════════╗');
  log('║   ✅ 演示流程完成!                    ║');
  log('╚══════════════════════════════════════╝');
  log(`\n流程步骤: ${status.data.steps.length} 步`);
  status.data.steps.forEach((s, i) => log(`  ${i + 1}. ${s.text} (${s.time.slice(11, 19)})`));

  const alertCount = await api('GET', '/api/alert');
  log(`\n当前待处理告警: ${alertCount.data?.total || 0} 条`);
  log('\n提示: 打开 http://localhost:3000 查看告警列表');
  log('登录: gov_admin / admin123');
}

main().catch((e) => {
  console.error('演示流程失败:', e.message);
  console.error('请确保后端已启动: cd backend && node server.js');
});

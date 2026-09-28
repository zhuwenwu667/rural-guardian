/**
 * AI 健康分析 API
 * 对接智谱GLM / 通义千问 等大模型，分析老人健康数据
 */
const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/ai/health-analysis/:elderlyId — AI健康分析
router.get('/health-analysis/:elderlyId', auth, async (req, res) => {
  try {
    const elderlyId = req.params.elderlyId;

    // 获取老人信息
    const elderly = await db.prepare('SELECT * FROM elderly_info WHERE id = ?').get(elderlyId);
    if (!elderly) return res.json({ code: 404, data: null, message: '老人不存在' });

    // 获取最近24小时健康数据
    const records = await db.prepare(`
      SELECT * FROM health_record WHERE elderly_id = ?
      ORDER BY record_date DESC LIMIT 24
    `).all(elderlyId);

    // 获取实时设备数据
    const realtime = await db.prepare(`
      SELECT r.*, d.device_sn FROM device_realtime r
      JOIN device_info d ON r.device_id = d.id
      WHERE r.elderly_id = ? AND d.type = 'BAND' LIMIT 1
    `).get(elderlyId);

    // 构建健康摘要
    const summary = {
      name: elderly.name,
      gender: elderly.gender,
      age: elderly.birth_date ? (new Date().getFullYear() - new Date(elderly.birth_date).getFullYear()) : '未知',
      healthStatus: elderly.health_status,
      livingAlone: elderly.living_alone,
      realtime: realtime ? {
        heartRate: realtime.heart_rate,
        bloodOxygen: realtime.blood_oxygen,
        temperature: realtime.temperature,
        bloodPressure: realtime.blood_pressure_systolic ? `${realtime.blood_pressure_systolic}/${realtime.blood_pressure_diastolic}` : null,
        steps: realtime.steps,
        battery: realtime.battery,
        lastReport: realtime.last_report_at,
      } : null,
      historyCount: records.length,
      avgHeartRate: records.length > 0 ? Math.round(records.reduce((s, r) => s + (r.heart_rate || 0), 0) / records.length) : null,
      avgBloodOxygen: records.length > 0 ? Math.round(records.reduce((s, r) => s + (r.blood_oxygen || 0), 0) / records.length * 10) / 10 : null,
    };

    // 调用 AI 分析（如果有 API Key）
    const aiConfig = await db.prepare("SELECT config_value FROM system_config WHERE config_key = 'ai_api_key'").get();
    const aiProvider = await db.prepare("SELECT config_value FROM system_config WHERE config_key = 'ai_provider'").get();
    const aiEnabled = await db.prepare("SELECT config_value FROM system_config WHERE config_key = 'ai_enabled'").get();

    let aiAnalysis = null;
    if (aiEnabled?.config_value === 'true' && aiConfig?.config_value) {
      try {
        const prompt = `你是一位专业的老年健康分析师。请根据以下数据给出简要分析建议(100字以内):

老人: ${summary.name}, ${summary.gender}, 约${summary.age}岁
健康状况: ${summary.healthStatus}
独居: ${summary.livingAlone ? '是' : '否'}
实时数据: 心率${summary.realtime?.heartRate || '无'}bpm, 血氧${summary.realtime?.bloodOxygen || '无'}%, 体温${summary.realtime?.temperature || '无'}°C
近24h平均心率: ${summary.avgHeartRate || '无'}bpm, 平均血氧: ${summary.avgBloodOxygen || '无'}%`;

        const response = await fetch(aiProvider?.config_value === 'qwen'
          ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
          : 'https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.config_value}` },
          body: JSON.stringify({
            model: aiProvider?.config_value === 'qwen' ? 'qwen-turbo' : 'glm-4-flash',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const result = await response.json();
        aiAnalysis = result.choices?.[0]?.message?.content || 'AI 分析暂不可用';
      } catch (e) {
        aiAnalysis = null; // AI 服务不可用时静默降级
      }
    }

    res.json({
      code: 200,
      data: { summary, aiAnalysis, aiAvailable: !!(aiEnabled?.config_value === 'true' && aiConfig?.config_value) },
      message: 'success',
    });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

// PUT /api/ai/config — 更新AI配置
router.put('/config', auth, async (req, res) => {
  try {
    const { apiKey, provider, model } = req.body;
    if (apiKey) await db.prepare("UPDATE system_config SET config_value = ? WHERE config_key = 'ai_api_key'").run(apiKey);
    if (provider) await db.prepare("UPDATE system_config SET config_value = ? WHERE config_key = 'ai_provider'").run(provider);
    if (model) await db.prepare("UPDATE system_config SET config_value = ? WHERE config_key = 'ai_model'").run(model);
    res.json({ code: 200, data: null, message: 'AI配置已更新' });
  } catch (err) {
    res.json({ code: 500, data: null, message: err.message });
  }
});

module.exports = router;

/**
 * 数据库初始化 — MySQL 版本
 * 表结构通过 init-mysql.sql 创建，种子数据通过 migrate-to-mysql.js 导入
 * 此文件仅确保系统配置完整性
 */
const { getPool } = require('../config/db');

async function initDatabase() {
  const pool = getPool();
  console.log('[Init] MySQL 表结构已就绪，检查系统配置...');

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

  for (const [key, value, group, desc] of configs) {
    try {
      await pool.execute(
        'INSERT IGNORE INTO system_config (config_key, config_value, config_group, description) VALUES (?, ?, ?, ?)',
        [key, value, group, desc]
      );
    } catch (e) {
      // Ignore duplicates
    }
  }

  console.log('[Init] 系统配置检查完成');
}

module.exports = { initDatabase };

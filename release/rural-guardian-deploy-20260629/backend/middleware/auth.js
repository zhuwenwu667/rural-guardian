const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

// 从 system_config 读取 JWT 密钥，生产环境禁止使用默认值
async function getJwtSecret() {
  const pool = getPool();
  const [rows] = await pool.execute("SELECT config_value FROM system_config WHERE config_key = 'jwt_secret'");
  const value = rows.length > 0 ? rows[0].config_value : '';
  if (!value || value === 'rural-guardian-default-secret-key-2024') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[安全] 生产环境禁止使用默认 JWT 密钥！请修改 system_config 表中 jwt_secret 配置项');
    }
    const newSecret = crypto.randomBytes(64).toString('hex');
    try {
      await pool.execute(
        "INSERT INTO system_config (config_key, config_value, config_group, description) VALUES ('jwt_secret', ?, 'system', 'JWT签名密钥') ON DUPLICATE KEY UPDATE config_value = ?",
        [newSecret, newSecret]
      );
      console.log('[安全] 已自动生成 JWT 强随机密钥');
    } catch (e) {
      console.warn('[安全] 无法写入 JWT 密钥到数据库，使用临时随机密钥:', e.message);
    }
    return newSecret;
  }
  return value;
}

// 启动时校验 JWT 密钥强度
async function validateJwtSecretOnStartup() {
  const secret = await getJwtSecret();
  if (secret.length < 32) {
    console.warn('[安全] ⚠️  JWT 密钥长度不足 32 字符，建议使用更长的随机密钥');
  }
}

// JWT 认证中间件（async — Express 支持异步中间件）
async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log('[AUTH] URL:', req.url, 'Authorization:', authHeader ? 'Bearer ***' : 'None');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] No token provided');
    return res.json({ code: 401, data: null, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, await getJwtSecret());
    req.user = decoded;
    next();
  } catch (err) {
    return res.json({ code: 401, data: null, message: '令牌无效或已过期' });
  }
}

// 角色校验中间件
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.json({ code: 403, data: null, message: '未登录' });
    }
    if (!roles.includes(req.user.role)) {
      return res.json({ code: 403, data: null, message: '权限不足，需要角色: ' + roles.join(', ') });
    }
    next();
  };
}

// 权限校验中间件
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.json({ code: 403, data: null, message: '未登录' });
    }
    // 管理员拥有所有权限
    if (req.user.role === 'GOV_ADMIN') return next();
    // TODO: 查询角色权限表校验具体权限
    // 暂时放行（权限系统后续完善）
    next();
  };
}

module.exports = { auth, getJwtSecret, validateJwtSecretOnStartup, requireRole, requirePermission };

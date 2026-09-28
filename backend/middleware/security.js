/**
 * 安全防护中间件
 */

// HTML 转义，防止 XSS
exports.escapeHtml = (str) => {
  if (!str) return str;
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return str.replace(/[&<>"']/g, (char) => escapeMap[char]);
};

// 对对象的所有字符串字段进行转义
exports.escapeObject = (obj) => {
  if (!obj) return obj;
  if (typeof obj === 'string') return exports.escapeHtml(obj);
  if (Array.isArray(obj)) return obj.map(exports.escapeObject);
  if (typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = exports.escapeObject(obj[key]);
    }
    return result;
  }
  return obj;
};

// 安全响应头
exports.securityHeaders = (req, res, next) => {
  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // XSS 防护
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // 防止 MIME 类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // 引用策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // 内容安全策略
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  next();
};

// 速率限制（简单版，生产环境建议用 express-rate-limit）
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15分钟
const RATE_LIMIT_MAX = 500; // 最大请求数

exports.rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const record = requestCounts.get(ip);
  
  // 重置计数
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  // 检查限制
  if (record.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      code: 429,
      data: null,
      message: '请求过于频繁，请稍后再试'
    });
  }
  
  record.count++;
  next();
};

// 清理过期的速率限制记录（每分钟清理一次）
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 60000);

/**
 * 全局错误处理中间件
 */

// 异步路由错误捕获包装器
exports.asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 全局错误处理中间件
exports.errorHandler = (err, req, res, next) => {
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 数据库错误
  if (err.message && err.message.includes('SQLITE')) {
    return res.status(500).json({
      code: 500,
      data: null,
      message: '数据库操作失败'
    });
  }

  // JWT 认证错误
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '登录已过期，请重新登录'
    });
  }

  // 参数验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      code: 400,
      data: null,
      message: err.message || '参数验证失败'
    });
  }

  // 默认错误响应
  res.status(err.status || 500).json({
    code: err.status || 500,
    data: null,
    message: err.message || '服务器内部错误'
  });
};

// 404 处理
exports.notFoundHandler = (req, res) => {
  res.status(404).json({
    code: 404,
    data: null,
    message: '接口不存在'
  });
};

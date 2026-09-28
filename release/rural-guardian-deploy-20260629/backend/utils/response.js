/**
 * 统一错误处理和响应工具
 */

/**
 * 成功响应
 */
export function success(res, data = null, message = '操作成功') {
  return res.json({
    code: 200,
    message,
    data
  });
}

/**
 * 错误响应
 */
export function error(res, message = '操作失败', code = 500, details = null) {
  const response = {
    code,
    message
  };
  if (details) {
    response.details = details;
  }
  return res.status(code >= 500 ? 500 : code).json(response);
}

/**
 * 分页响应
 */
export function paginated(res, { list, total, page = 1, pageSize = 20 }) {
  return res.json({
    code: 200,
    message: 'success',
    data: {
      list,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: Number(total),
        totalPages: Math.ceil(Number(total) / Number(pageSize))
      }
    }
  });
}

/**
 * 自定义业务错误
 */
export class AppError extends Error {
  constructor(message, code = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.isOperational = true;
  }
}

/**
 * 常见错误类型工厂
 */
export const errors = {
  badRequest: (message = '请求参数错误') => new AppError(message, 400),
  unauthorized: (message = '未授权') => new AppError(message, 401),
  forbidden: (message = '权限不足') => new AppError(message, 403),
  notFound: (message = '资源不存在') => new AppError(message, 404),
  conflict: (message = '资源冲突') => new AppError(message, 409),
  serverError: (message = '服务器内部错误') => new AppError(message, 500)
};

/**
 * 全局错误处理中间件
 */
export function errorHandler(err, req, res, _next) {
  // 记录错误日志
  console.error('[Error]', {
    name: err.name,
    message: err.message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // 自定义业务错误
  if (err instanceof AppError) {
    return error(res, err.message, err.code);
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Token 无效', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return error(res, 'Token 已过期', 401);
  }

  // 参数验证错误
  if (err.name === 'ValidationError') {
    return error(res, err.message, 400);
  }

  // 默认返回 500 错误
  return error(
    res,
    process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
    500
  );
}

/**
 * 异步路由包装器 - 自动捕获异步错误
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

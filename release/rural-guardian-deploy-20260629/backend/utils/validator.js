/**
 * 输入验证工具
 */

import { errors } from './response.js';

/**
 * 验证必填字段
 */
export function required(fields, source = 'body') {
  return (req, _res, next) => {
    const data = req[source] || {};
    const missing = [];

    for (const field of fields) {
      const value = data[field];
      if (value === undefined || value === null || value === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw errors.badRequest(`缺少必填字段: ${missing.join(', ')}`);
    }

    next();
  };
}

/**
 * 验证数据类型
 */
export function validateType(field, type, source = 'body') {
  return (req, _res, next) => {
    const value = req[source]?.[field];

    if (value === undefined || value === null) {
      return next();
    }

    const typeMap = {
      string: () => typeof value === 'string',
      number: () => typeof value === 'number' && !isNaN(value),
      integer: () => Number.isInteger(value),
      boolean: () => typeof value === 'boolean',
      array: () => Array.isArray(value),
      object: () => typeof value === 'object' && !Array.isArray(value)
    };

    if (!typeMap[type]()) {
      throw errors.badRequest(`字段 ${field} 必须是 ${type} 类型`);
    }

    next();
  };
}

/**
 * 验证数值范围
 */
export function validateRange(field, min, max, source = 'body') {
  return (req, _res, next) => {
    const value = req[source]?.[field];

    if (value === undefined || value === null) {
      return next();
    }

    const num = Number(value);

    if (isNaN(num)) {
      throw errors.badRequest(`字段 ${field} 必须是数字`);
    }

    if (min !== undefined && num < min) {
      throw errors.badRequest(`字段 ${field} 不能小于 ${min}`);
    }

    if (max !== undefined && num > max) {
      throw errors.badRequest(`字段 ${field} 不能大于 ${max}`);
    }

    next();
  };
}

/**
 * 验证字符串长度
 */
export function validateLength(field, min, max, source = 'body') {
  return (req, _res, next) => {
    const value = req[source]?.[field];

    if (value === undefined || value === null) {
      return next();
    }

    const len = String(value).length;

    if (min !== undefined && len < min) {
      throw errors.badRequest(`字段 ${field} 长度不能少于 ${min}`);
    }

    if (max !== undefined && len > max) {
      throw errors.badRequest(`字段 ${field} 长度不能超过 ${max}`);
    }

    next();
  };
}

/**
 * 验证手机号格式
 */
export function validatePhone(field, source = 'body') {
  return (req, _res, next) => {
    const phone = req[source]?.[field];

    if (phone === undefined || phone === null) {
      return next();
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw errors.badRequest('手机号格式不正确');
    }

    next();
  };
}

/**
 * 验证身份证号格式
 */
export function validateIdCard(field, source = 'body') {
  return (req, _res, next) => {
    const idCard = req[source]?.[field];

    if (idCard === undefined || idCard === null) {
      return next();
    }

    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
    if (!idCardRegex.test(idCard)) {
      throw errors.badRequest('身份证号格式不正确');
    }

    next();
  };
}

/**
 * 验证枚举值
 */
export function validateEnum(field, enumValues, source = 'body') {
  return (req, _res, next) => {
    const value = req[source]?.[field];

    if (value === undefined || value === null) {
      return next();
    }

    if (!enumValues.includes(value)) {
      throw errors.badRequest(
        `字段 ${field} 必须是以下值之一: ${enumValues.join(', ')}`
      );
    }

    next();
  };
}

/**
 * 验证日期格式 (YYYY-MM-DD)
 */
export function validateDate(field, source = 'body') {
  return (req, _res, next) => {
    const dateStr = req[source]?.[field];

    if (dateStr === undefined || dateStr === null) {
      return next();
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      throw errors.badRequest(`字段 ${field} 必须是 YYYY-MM-DD 格式`);
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw errors.badRequest(`字段 ${field} 日期格式不正确`);
    }

    next();
  };
}

/**
 * 组合多个验证器
 */
export function validate(...validators) {
  return (req, res, next) => {
    for (const validator of validators) {
      validator(req, res, next);
    }
    next();
  };
}

/**
 * 分页参数验证
 */
export function validatePagination(source = 'query') {
  return (req, _res, next) => {
    const page = Number(req[source]?.page) || 1;
    const pageSize = Number(req[source]?.pageSize) || 20;

    if (page < 1) {
      throw errors.badRequest('页码必须大于 0');
    }

    if (pageSize < 1 || pageSize > 100) {
      throw errors.badRequest('每页数量必须在 1-100 之间');
    }

    // 将验证后的值写回请求对象
    req.pagination = { page, pageSize };

    next();
  };
}

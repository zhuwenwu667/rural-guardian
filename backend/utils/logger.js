/**
 * 统一日志系统 — 基于 pino
 * 开发环境自动美化输出，生产环境输出 JSON
 */
const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {} // 生产环境标准 JSON 输出
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
  ),
});

module.exports = logger;

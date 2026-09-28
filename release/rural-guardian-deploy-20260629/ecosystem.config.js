/**
 * PM2 进程管理配置
 * 用法:
 *   pm2 start ecosystem.config.js          # 启动所有
 *   pm2 stop rural-guardian                # 停止
 *   pm2 restart rural-guardian             # 重启
 *   pm2 logs rural-guardian                # 查看日志
 *   pm2 save && pm2 startup                # 设置开机自启
 */
module.exports = {
  apps: [{
    name: 'rural-guardian',
    script: './backend/server.js',
    cwd: __dirname,
    instances: 1,                // 单实例（SQLite 不适合多进程）
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      ALLOW_DEMO_LOGIN: 'false',
      LOG_LEVEL: 'info',
    },
    env_development: {
      NODE_ENV: 'development',
      ALLOW_DEMO_LOGIN: 'true',
      LOG_LEVEL: 'debug',
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 10000,
  }],
};

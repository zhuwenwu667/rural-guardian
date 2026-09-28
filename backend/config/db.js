/**
 * 数据库层 — 基于 mysql2/promise
 * 连接池 + 自动重连
 */
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'RuralGuardian2026!',
  database: process.env.DB_NAME || 'rural_guardian',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

/**
 * 获取数据库连接（兼容旧 API）
 */
async function getConnection() {
  return getPool().getConnection();
}

/**
 * 兼容旧 initDb() 调用 — 返回 pool
 */
async function initDb() {
  const p = getPool();
  // 测试连接
  const conn = await p.getConnection();
  conn.release();
  console.log('[DB] MySQL 连接成功:', DB_CONFIG.host + ':' + DB_CONFIG.port + '/' + DB_CONFIG.database);
  return p;
}

/**
 * 执行查询的便捷方法（兼容 better-sqlite3 的同步风格）
 * 返回类似 better-sqlite3 的 stmt 对象用于链式调用
 */
// Convert SQLite SQL to MySQL compatible SQL
function toMySQL(sql) {
  return sql
    // strftime (before simpler patterns)
    .replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "DATE_FORMAT($1, '%Y-%m')")
    .replace(/strftime\('%Y-%m-%d',\s*([^)]+)\)/gi, "DATE_FORMAT($1, '%Y-%m-%d')")
    .replace(/strftime\('%Y',\s*([^)]+)\)/gi, "DATE_FORMAT($1, '%Y')")
    .replace(/strftime\('%m',\s*([^)]+)\)/gi, "DATE_FORMAT($1, '%m')")
    .replace(/strftime\('%H:%M',\s*([^)]+)\)/gi, "DATE_FORMAT($1, '%H:%i')")
    .replace(/CAST\(strftime\('%Y',\s*'now',\s*'localtime'\)\s*AS\s*INTEGER\)/gi, 'YEAR(NOW())')
    .replace(/CAST\(strftime\('%Y',\s*([^)]+)\)\s*AS\s*INTEGER\)/gi, 'YEAR($1)')
    // julianday
    .replace(/julianday\(([^)]+)\)\s*-\s*julianday\(([^)]+)\)/gi, 'TIMESTAMPDIFF(SECOND, $2, $1) / 86400.0')
    .replace(/julianday\(([^)]+)\)/gi, 'UNIX_TIMESTAMP($1) / 86400.0')
    // datetime('now','localtime') with dynamic suffix
    .replace(/datetime\('now',\s*'localtime',\s*'\|\|\s*\?\s*\|\|\s*'\s*hours?'\s*\)/gi, "DATE_SUB(NOW(), INTERVAL ? HOUR)")
    .replace(/datetime\('now',\s*'localtime',\s*'\|\|\s*\?\s*\|\|\s*'\s*minutes?'\s*\)/gi, "DATE_SUB(NOW(), INTERVAL ? MINUTE)")
    .replace(/datetime\('now',\s*'localtime',\s*'(-\d+)\s+minutes?'\s*\)/gi, "DATE_SUB(NOW(), INTERVAL $1 MINUTE)")
    .replace(/datetime\('now',\s*'localtime',\s*'start of day'\)/gi, 'CURDATE()')
    // datetime('now','localtime') basic
    .replace(/datetime\('now',\s*'localtime'\)/gi, 'NOW()')
    .replace(/datetime\("now",\s*"localtime"\)/gi, 'NOW()')
    // date functions
    .replace(/DATE\('now',\s*'localtime'\)/gi, 'CURDATE()')
    .replace(/DATE\('now'\)/gi, 'CURDATE()')
    .replace(/date\('now',\s*'localtime'\)/gi, 'CURDATE()')
    .replace(/DATE\('now',\s*'(-?\d+)\s+days?',\s*'localtime'\)/gi, 'DATE_SUB(CURDATE(), INTERVAL $1 DAY)')
    .replace(/datetime\('now',\s*'(-?\d+)\s+hours?'\)/gi, 'DATE_SUB(NOW(), INTERVAL $1 HOUR)')
    .replace(/datetime\('now',\s*'(-?\d+)\s+days?'\)/gi, 'DATE_SUB(NOW(), INTERVAL $1 DAY)')
    // UPSERT: ON CONFLICT → ON DUPLICATE KEY, excluded. → VALUES()
    .replace(/ON CONFLICT\((\w+)\)\s+DO\s+UPDATE\s+SET/gi, 'ON DUPLICATE KEY UPDATE')
    .replace(/excluded\.(\w+)/gi, 'VALUES($1)')
    // INSERT OR
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO')
    .replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO')
    // CAST(... AS INTEGER) → CAST(... AS SIGNED) for MySQL compatibility
    .replace(/AS\s+INTEGER\)/gi, 'AS SIGNED)');
}

function query(sql, params = []) {
  const p = getPool();
  const mysqlSql = toMySQL(sql);
  return {
    async run(...args) {
      const actualParams = args.length > 0 ? args : params;
      const [result] = await p.query(mysqlSql, actualParams);
      result.lastInsertRowid = result.insertId;
      return result;
    },
    async get(...args) {
      const actualParams = args.length > 0 ? args : params;
      const [rows] = await p.query(mysqlSql, actualParams);
      return rows[0] || null;
    },
    async all(...args) {
      const actualParams = args.length > 0 ? args : params;
      const [rows] = await p.query(mysqlSql, actualParams);
      return rows;
    },
  };
}

/**
 * 执行原始 SQL（用于建表、种子数据等）
 */
async function exec(sql) {
  const p = getPool();
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  for (const stmt of statements) {
    await p.execute(stmt);
  }
}

// 进程退出时关闭连接池
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
process.on('SIGINT', () => { closePool().then(() => process.exit(0)); });
process.on('SIGTERM', () => { closePool().then(() => process.exit(0)); });

module.exports = { initDb, getPool, getConnection, query, exec, DB_CONFIG };
module.exports.prepare = (sql) => query(sql);
module.exports.execute = (sql, params) => getPool().execute(sql, params);

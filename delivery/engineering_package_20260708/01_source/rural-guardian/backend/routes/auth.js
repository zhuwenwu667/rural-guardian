const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../config/db');
const { auth, getJwtSecret } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

const loginSchema = z.object({
  username: z.string().min(1, '账号不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

const registerSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, '请输入正确的手机号'),
  password: z.string().min(6, '密码至少6位'),
  realName: z.string().optional(),
  role: z.enum(['FAMILY_MEMBER', 'ELDERLY']).optional().default('FAMILY_MEMBER'),
  villageId: z.any().optional(),
  bindElderlyId: z.any().optional(),
  relationship: z.string().optional(),
});

const createUserSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(6, '密码至少6位'),
  role: z.enum(['GOV_ADMIN', 'VILLAGE_STAFF', 'PROVIDER', 'FAMILY_MEMBER', 'ELDERLY']),
  realName: z.string().optional(),
  phone: z.string().optional(),
  villageId: z.any().optional(),
  bindElderlyId: z.any().optional(),
  relationship: z.string().optional(),
  gender: z.string().optional(),
  birthDate: z.string().optional(),
  livingAlone: z.any().optional(),
  serviceTypes: z.string().optional(),
  serviceArea: z.string().optional(),
});

const smsCodes = {};

async function getJwtConfig() {
  const secret = await getJwtSecret();
  const row = await db.prepare("SELECT config_value FROM system_config WHERE config_key = 'jwt_expire'").get();
  const expiresIn = row ? row.config_value : '24h';
  return { secret, expiresIn };
}

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { username, password } = req.validated;

  const user = await db.prepare('SELECT * FROM sys_user WHERE (username = ? OR phone = ?) AND status = 1').get(username, username);
  if (!user) {
    return res.json({ code: 401, data: null, message: '账号或密码错误' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.json({ code: 401, data: null, message: '账号或密码错误' });
  }

  const { secret, expiresIn } = await getJwtConfig();
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, realName: user.real_name },
    secret,
    { expiresIn }
  );

  res.json({
    code: 200,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role,
        phone: user.phone,
        villageId: user.village_id,
      },
    },
    message: '登录成功',
  });
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  const { phone, password, realName, role, villageId, bindElderlyId, relationship } = req.validated;
  const userRole = role;

  const existing = await db.prepare('SELECT id FROM sys_user WHERE phone = ?').get(phone);
  if (existing) {
    return res.json({ code: 400, data: null, message: '该手机号已注册' });
  }

  const username = phone;
  const passwordHash = bcrypt.hashSync(password, 10);
  const result = await db.prepare(`
    INSERT INTO sys_user (username, password_hash, real_name, role, phone, village_id, status) VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(username, passwordHash, realName || '', userRole, phone, villageId || null);
  const newUserId = result.lastInsertRowid;

  if (userRole === 'ELDERLY') {
    await db.prepare(`
      INSERT INTO elderly_info (name, phone, village_id) VALUES (?, ?, ?)
    `).run(realName || '', phone, villageId || null);
  }

  const token = jwt.sign(
    { id: newUserId, username, role: userRole, realName },
    (await getJwtSecret()),
    { expiresIn: '24h' }
  );

  res.json({
    code: 200,
    data: { token, user: { id: newUserId, username, realName, role: userRole, phone, villageId } },
    message: '注册成功',
  });
});

router.get('/demo-login', async (req, res) => {
  const role = String(req.query.role || 'GOV_ADMIN').toUpperCase();
  const roleToUsername = {
    GOV_ADMIN: 'gov_admin',
    VILLAGE_STAFF: 'village_staff',
    PROVIDER: 'provider_user',
    FAMILY_MEMBER: 'family_user',
    ELDERLY: 'elderly_user',
  };
  const username = roleToUsername[role] || roleToUsername.GOV_ADMIN;

  const user = await db.prepare('SELECT * FROM sys_user WHERE username = ? AND status = 1').get(username);
  if (!user) {
    return res.json({ code: 404, data: null, message: '演示账号不存在' });
  }

  const { secret, expiresIn } = await getJwtConfig();
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, realName: user.real_name },
    secret,
    { expiresIn }
  );

  return res.json({
    code: 200,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role,
        phone: user.phone,
        villageId: user.village_id,
      },
    },
    message: '演示登录成功',
  });
});

module.exports = router;

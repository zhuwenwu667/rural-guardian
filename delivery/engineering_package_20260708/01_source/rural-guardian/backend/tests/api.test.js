/**
 * 后端 API 测试
 * 运行: npm test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = 'http://localhost:8080/api';
const TEST_USER = {
  username: 'gov_admin',
  password: 'admin123'
};

let authToken = '';

describe('认证接口', () => {
  it('登录成功', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('token');
    expect(data.data).toHaveProperty('user');

    authToken = data.data.token;
  });

  it('登录失败 - 密码错误', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'gov_admin',
        password: 'wrong_password'
      })
    });

    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe(401);
  });

  it('获取当前用户信息', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('username', 'gov_admin');
    expect(data.data).toHaveProperty('role', 'GOV_ADMIN');
  });

  it('未授权访问', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`);

    expect(res.status).toBe(401);
  });
});

describe('老人管理接口', () => {
  it('获取老人列表', async () => {
    const res = await fetch(`${BASE_URL}/elderly?page=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('list');
    expect(Array.isArray(data.data.list)).toBe(true);
  });

  it('获取老人详情', async () => {
    const res = await fetch(`${BASE_URL}/elderly/1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('name');
  });
});

describe('健康管理接口', () => {
  it('获取健康记录列表', async () => {
    const res = await fetch(`${BASE_URL}/health/1?page=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('list');
    expect(Array.isArray(data.data.list)).toBe(true);
  });

  it('添加健康记录', async () => {
    const res = await fetch(`${BASE_URL}/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        elderlyId: 1,
        heartRate: 75,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        bloodOxygen: 98.5,
        temperature: 36.5,
        sleepHours: 7.0,
        steps: 5000
      })
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
  });
});

describe('预警管理接口', () => {
  it('获取预警列表', async () => {
    const res = await fetch(`${BASE_URL}/alert?page=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('list');
    expect(Array.isArray(data.data.list)).toBe(true);
  });

  it('按状态筛选预警', async () => {
    const res = await fetch(`${BASE_URL}/alert?status=PENDING&pageSize=5`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
  });
});

describe('工单管理接口', () => {
  it('获取工单列表', async () => {
    const res = await fetch(`${BASE_URL}/order?page=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('list');
    expect(Array.isArray(data.data.list)).toBe(true);
  });

  it('创建工单', async () => {
    const res = await fetch(`${BASE_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        elderlyId: 1,
        type: 'LIFE_CARE',
        description: '测试工单'
      })
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
  });
});

describe('统计分析接口', () => {
  it('获取概览统计', async () => {
    const res = await fetch(`${BASE_URL}/stats/overview`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('totalElderly');
    expect(data.data).toHaveProperty('totalAlerts');
  });

  it('获取健康趋势', async () => {
    const res = await fetch(`${BASE_URL}/stats/health-trend`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
  });
});

describe('设备管理接口', () => {
  it('获取设备列表', async () => {
    const res = await fetch(`${BASE_URL}/device`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('list');
    expect(Array.isArray(data.data.list)).toBe(true);
  });
});

describe('服务集成接口', () => {
  it('获取服务总览', async () => {
    const res = await fetch(`${BASE_URL}/service/overview`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('services');
  });

  it('测试服务连接 - AI', async () => {
    const res = await fetch(`${BASE_URL}/service/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ type: 'ai' })
    });

    const data = await res.json();

    // 即使没配置也会返回响应
    expect(res.status).toBe(200);
    expect(data).toHaveProperty('code');
  });
});

describe('村庄管理接口', () => {
  it('获取村庄列表', async () => {
    const res = await fetch(`${BASE_URL}/village`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data).toHaveProperty('list');
    expect(Array.isArray(data.data.list)).toBe(true);
  });
});

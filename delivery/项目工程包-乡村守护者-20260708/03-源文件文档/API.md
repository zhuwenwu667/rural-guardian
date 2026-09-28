# API 文档

## 概述

乡村守护者平台 RESTful API，基于 JWT Token 认证。

**Base URL**: `http://localhost:8080/api`

**认证方式**: 在请求头中携带 JWT Token
```
Authorization: Bearer <token>
```

---

## 认证接口

### 登录

```
POST /api/auth/login
Content-Type: application/json
```

**请求体**:
```json
{
  "username": "gov_admin",
  "password": "admin123"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "gov_admin",
      "real_name": "王建国",
      "role": "GOV_ADMIN"
    }
  }
}
```

### 发送短信验证码

```
POST /api/auth/send-sms
Content-Type: application/json
```

**请求体**:
```json
{
  "phone": "13900000001"
}
```

### 短信登录

```
POST /api/auth/sms-login
Content-Type: application/json
```

**请求体**:
```json
{
  "phone": "13900000001",
  "code": "123456"
}
```

### 获取当前用户信息

```
GET /api/auth/me
Authorization: Bearer <token>
```

---

## 健康管理

### 获取老人健康记录

```
GET /api/health/:elderlyId
Authorization: Bearer <token>
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码 (默认 1) |
| pageSize | int | 每页数量 (默认 20) |
| startDate | string | 开始日期 (YYYY-MM-DD) |
| endDate | string | 结束日期 (YYYY-MM-DD) |

### 添加健康记录

```
POST /api/health
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "elderlyId": 1,
  "heartRate": 72,
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "bloodOxygen": 98.5,
  "temperature": 36.5,
  "sleepHours": 7.0,
  "steps": 5000,
  "notes": "正常"
}
```

---

## 预警管理

### 获取预警列表

```
GET /api/alert
Authorization: Bearer <token>
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 预警状态 (PENDING/PROCESSING/RESOLVED) |
| level | string | 预警级别 (LOW/MEDIUM/HIGH/CRITICAL) |
| page | int | 页码 |
| pageSize | int | 每页数量 |

### 处理预警

```
PUT /api/alert/:id/handle
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "handlerId": 2,
  "notes": "已电话确认老人安全"
}
```

---

## 服务工单

### 获取工单列表

```
GET /api/order
Authorization: Bearer <token>
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 工单状态 |
| type | string | 工单类型 |
| page | int | 页码 |
| pageSize | int | 每页数量 |

### 创建工单

```
POST /api/order
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "elderlyId": 1,
  "type": "MEDICAL",
  "description": "定期健康检查",
  "providerId": 1
}
```

### 更新工单状态

```
PUT /api/order/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "status": "IN_PROGRESS"
}
```

---

## 设备管理

### 获取设备列表

```
GET /api/device
Authorization: Bearer <token>
```

### 设备上报数据

```
POST /api/device/report
Content-Type: application/json
```

**请求体**:
```json
{
  "deviceSn": "BAND-2026-0001",
  "data": {
    "heartRate": 72,
    "bloodOxygen": 98.5,
    "temperature": 36.5,
    "steps": 500,
    "batteryLevel": 85
  }
}
```

---

## 老人管理

### 获取老人列表

```
GET /api/elderly
Authorization: Bearer <token>
```

### 添加老人

```
POST /api/elderly
Authorization: Bearer <token>
Content-Type: application/json
```

### 获取老人详情

```
GET /api/elderly/:id
Authorization: Bearer <token>
```

---

## 统计分析

### 概览统计

```
GET /api/stats/overview
Authorization: Bearer <token>
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "totalElderly": 186,
    "totalAlerts": 45,
    "pendingAlerts": 5,
    "totalOrders": 120,
    "activeOrders": 15,
    "onlineDevices": 98
  }
}
```

### 健康趋势

```
GET /api/stats/health-trend
Authorization: Bearer <token>
```

---

## 服务集成

### 服务总览

```
GET /api/service/overview
Authorization: Bearer <token>
```

### 测试服务连接

```
POST /api/service/test
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "type": "ai|voice|map|sms|push"
}
```

### AI 对话

```
POST /api/service/ai/chat
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "message": "帮我分析一下最近一周的健康数据",
  "elderlyId": 1
}
```

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 / Token 过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 角色权限

| 角色 | 权限范围 |
|------|----------|
| GOV_ADMIN | 全部数据 / 服务配置 / 系统管理 |
| VILLAGE_STAFF | 本村老人 / 本村预警 / 本村工单 |
| PROVIDER | 自己接单 / 订单管理 |
| FAMILY_MEMBER | 自己关联的老人数据 |
| ELDERLY | 仅自己的健康数据和SOS |

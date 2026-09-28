# 乡村守护者 - 智慧养老平台

> 基于 Vue 3 + Node.js + SQLite 的农村智慧养老管理系统

## 项目简介

乡村守护者是一款面向农村空巢老人的智慧养老平台，通过"家庭-村级-乡镇"三级联动机制，实现老人健康监测、紧急救助、生活服务等一站式管理。

## 技术栈

### 前端
- **框架**: Vue 3 (Composition API)
- **UI 组件**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router
- **构建工具**: Vite
- **HTTP 客户端**: Axios
- **图表**: ECharts

### 后端
- **运行环境**: Node.js 18+
- **框架**: Express.js
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT
- **工具库**: bcryptjs, cors, helmet

## 功能模块

### 五大用户角色
1. **超级管理员** - 区域监管、数据驾驶舱、API服务管理
2. **村级专员** - 老人管理、预警处理、工单调度
3. **服务商** - 服务工单、订单管理、收入统计
4. **家属** - 家人健康、预警通知、服务预约
5. **老人** - 健康数据、SOS求助、语音交互

### 核心功能
- 多因素登录（账号密码/短信验证码/NFC/语音）
- 实时健康监测（心率/血压/血氧/体温/睡眠）
- 智能预警（跌倒检测/电子围栏/异常预警）
- 服务工单管理（医疗/生活/陪伴/紧急）
- AI 健康分析
- 语音交互（方言识别/语音合成）
- GIS 地图服务
- 消息推送（短信/APP推送）

## 快速开始

### 环境要求
- Node.js >= 18.x
- npm >= 9.x

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd rural-guardian

# 一键安装（后端 + 前端）
./install.sh
```

### 启动

```bash
# 一键启动（后端 + 前端）
./start.sh
```

或手动启动：

```bash
# 终端 1: 启动后端
cd backend
node server.js

# 终端 2: 启动前端
cd frontend
npm run dev
```

### 访问地址
- 前端页面: http://localhost:3000
- 后端 API: http://localhost:8080
- API 管理面板: http://localhost:8080/api-dashboard

### 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 超级管理员 | gov_admin | admin123 |
| 村级专员 | village_staff | staff123 |
| 服务商 | provider_user | provider123 |
| 家属 | family_user | family123 |
| 老人 | elderly_user | elderly123 |

## 项目结构

```
rural-guardian/
├── backend/                 # 后端服务
│   ├── config/             # 配置文件
│   │   └── db.js          # 数据库配置
│   ├── middleware/         # 中间件
│   │   └── auth.js        # 认证中间件
│   ├── models/            # 数据模型
│   │   └── init.js       # 数据库初始化
│   ├── routes/           # 路由
│   │   ├── auth.js       # 认证路由
│   │   ├── health.js      # 健康管理路由
│   │   ├── alert.js       # 预警管理路由
│   │   ├── order.js       # 工单管理路由
│   │   ├── device.js      # 设备管理路由
│   │   ├── village.js     # 村庄管理路由
│   │   └── service.js     # 服务集成路由
│   ├── tests/            # 测试文件
│   └── server.js         # 服务入口
│
├── frontend/              # 前端应用
│   ├── src/
│   │   ├── api/          # API 接口
│   │   ├── assets/       # 静态资源
│   │   ├── components/   # 公共组件
│   │   ├── router/      # 路由配置
│   │   ├── stores/      # 状态管理
│   │   ├── utils/       # 工具函数
│   │   ├── views/       # 页面组件
│   │   │   ├── gov/     # 政府管理员视图
│   │   │   ├── village/ # 村级专员视图
│   │   │   ├── provider/# 服务商视图
│   │   │   ├── family/  # 家属视图
│   │   │   ├── elderly/ # 老人视图
│   │   │   └── login/   # 登录页
│   │   ├── App.vue      # 根组件
│   │   └── main.js      # 入口文件
│   └── index.html
│
├── scripts/              # 工具脚本
│   └── sanitize.py       # 文档清理脚本
│
├── docs/                 # 开发文档
│   ├── API.md           # API 文档
│   ├── DEPLOY.md        # 部署指南
│   └── ARCHITECTURE.md  # 架构文档
│
├── .eslintrc.js         # ESLint 配置
├── .prettierrc         # Prettier 配置
├── package.json        # 根配置
└── README.md          # 项目说明
```

## 开发指南

### 代码规范
```bash
# 格式化代码
npm run lint

# 检查代码规范
npm run lint:check
```

### 测试
```bash
# 运行测试
npm test

# 运行测试（监听模式）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 外部服务配置

系统支持以下外部服务的集成配置：

### AI 服务 (智谱 GLM)
- 配置路径: 管理员端 > 服务集成中心 > AI对话配置
- API Key 获取: https://open.bigmodel.cn/

### 语音服务 (科大讯飞)
- 配置路径: 管理员端 > 服务集成中心 > 语音服务配置
- API 获取: https://console.xfyun.cn/

### 地图服务 (高德地图)
- 配置路径: 管理员端 > 服务集成中心 > 地图服务配置
- API Key 获取: https://lbs.amap.com/

### 消息推送 (阿里云短信/极光推送)
- 配置路径: 管理员端 > 服务集成中心 > 消息推送配置
- 相关平台: https://www.aliyun.com/, https://www.jiguang.cn/

## 部署

详见 [部署指南](./docs/DEPLOY.md)

### Docker 部署
```bash
# 构建镜像
docker build -t rural-guardian .

# 运行容器
docker run -d -p 3000:3000 -p 8080:8080 rural-guardian
```

### 环境变量
```bash
# 后端环境变量
NODE_ENV=production
PORT=8080

# 前端环境变量
VITE_API_BASE_URL=/api
```

## 许可证

MIT License

## 联系方式

技术支持: support@example.com

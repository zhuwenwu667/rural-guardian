## 乡村守护者发布包说明

本发布包包含：

- `frontend/dist`：前端生产构建产物
- `backend`：后端运行源码与 `package-lock.json`
- `docs/DEPLOY.md`：项目部署文档
- `Dockerfile`、`docker-compose.yml`、`ecosystem.config.js`：部署辅助文件

## 传统部署

1. 安装 Node.js 18+ 与 npm 9+
2. 进入 `backend` 目录执行：

```bash
npm ci --omit=dev
```

3. 复制 `backend/.env.example` 为 `backend/.env`，按服务器环境填写数据库等配置
4. 使用 PM2 启动后端：

```bash
pm2 start server.js --name rural-guardian-backend
```

5. 用 Nginx 或其他静态服务托管 `frontend/dist`
6. 将 `/api` 反向代理到后端服务端口

## Docker 部署

在发布包根目录执行：

```bash
docker build -t rural-guardian:latest .
docker compose up -d
```

## 说明

- 本包不包含 `node_modules`
- 本包不包含开发源码目录 `frontend/src`
- 本包不包含本地私有 `.env`
- 当前项目运行依赖 MySQL

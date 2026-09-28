# 部署指南

## 环境要求

| 环境 | 要求 |
|------|------|
| 操作系统 | Ubuntu 20.04+ / CentOS 7+ / macOS 12+ / Windows 10+ |
| Node.js | >= 18.x |
| npm | >= 9.x |
| 内存 | >= 2GB |
| 磁盘 | >= 10GB |

---

## 开发环境部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd rural-guardian
```

### 2. 安装依赖

```bash
# 一键安装
./install.sh

# 或手动安装
cd backend && npm install
cd ../frontend && npm install
```

### 3. 启动服务

```bash
# 一键启动
./start.sh

# 或手动启动
cd backend && node server.js &
cd ../frontend && npm run dev
```

### 4. 验证部署

访问 http://localhost:3000 使用测试账号登录。

---

## 生产环境部署

### 方案一：传统部署

#### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2 (进程管理器)
sudo npm install -g pm2
```

#### 2. 构建前端

```bash
cd frontend
npm install
npm run build
```

构建产物在 `frontend/dist/` 目录。

#### 3. 配置后端

```bash
cd backend

# 创建生产环境配置
cat > .env << EOF
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
EOF
```

#### 4. 启动服务

```bash
# 使用 PM2 启动后端
pm2 start server.js --name rural-backend

# 配置 Nginx 静态文件服务
sudo nano /etc/nginx/sites-available/rural-guardian
```

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/rural-guardian/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # SSL 配置 (可选)
    # listen 443 ssl;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/rural-guardian /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. 配置 HTTPS (可选)

使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 6. 设置开机自启

```bash
pm2 startup
pm2 save
```

---

### 方案二：Docker 部署

#### 1. 安装 Docker

```bash
# Ubuntu
curl -fsSL https://get.docker.com | sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

#### 2. 创建 Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
# 后端构建阶段
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# 前端构建阶段
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 最终镜像
FROM node:18-alpine
WORKDIR /app

# 复制后端
COPY --from=backend-builder /app/backend ./backend
COPY backend/server.js ./backend/

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 安装生产依赖
RUN cd backend && npm install --only=production

EXPOSE 8080

WORKDIR /app/backend
CMD ["node", "server.js"]
```

#### 3. 构建镜像

```bash
docker build -t rural-guardian:latest .
```

#### 4. 运行容器

```bash
# 运行容器
docker run -d \
  --name rural-guardian \
  -p 3000:8080 \
  -v $(pwd)/data:/app/backend/data \
  rural-guardian:latest

# 查看日志
docker logs -f rural-guardian

# 停止/重启
docker stop rural-guardian
docker start rural-guardian
```

#### 5. Docker Compose (推荐)

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    image: rural-guardian:latest
    ports:
      - "3000:8080"
    volumes:
      - ./data:/app/backend/data
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

启动：

```bash
docker-compose up -d
docker-compose logs -f
```

---

## 数据备份

### 数据库备份

```bash
# 备份
cp backend/data/rural_guardian.db "backup/$(date +%Y%m%d_%H%M%S).db"

# 恢复
cp backup/rural_guardian_20240101.db backend/data/rural_guardian.db
```

### 自动备份脚本

创建 `scripts/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/opt/backup/rural-guardian"
DATE=$(date +%Y%m%d)

mkdir -p $BACKUP_DIR
cp /path/to/backend/data/rural_guardian.db "$BACKUP_DIR/db_$DATE.db"

# 保留最近 30 天备份
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
```

添加定时任务：

```bash
crontab -e
# 每天凌晨 3 点备份
0 3 * * * /path/to/scripts/backup.sh
```

---

## 监控与日志

### PM2 监控

```bash
# 查看进程状态
pm2 status

# 查看实时日志
pm2 logs rural-backend

# 监控资源使用
pm2 monit
```

### 日志管理

```bash
# 配置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 故障排查

### 后端无法启动

```bash
# 检查端口占用
lsof -i :8080

# 检查 Node 版本
node -v

# 查看详细错误
cd backend && node server.js
```

### 前端构建失败

```bash
# 清除缓存
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 数据库连接失败

```bash
# 检查数据库文件权限
ls -la backend/data/

# 重新初始化数据库
rm backend/data/rural_guardian.db
cd backend && node server.js
```

---

## 安全加固

### 1. 防火墙配置

```bash
# Ubuntu
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. 修改 JWT 密钥

首次部署前，修改 `backend/models/init.js` 中的 JWT 密钥：

```javascript
// 使用随机字符串生成器生成强密钥
const jwtSecret = require('crypto').randomBytes(64).toString('hex');
```

### 3. 定期更新依赖

```bash
# 检查可用更新
npm outdated

# 更新生产依赖
npm update
```

---

## 性能优化

### 1. 启用 gzip 压缩

在 Nginx 配置中添加：

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1000;
```

### 2. 静态资源缓存

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 3. 数据库优化

定期执行：

```sql
-- 分析表
ANALYZE;

-- 整理碎片
VACUUM;
```

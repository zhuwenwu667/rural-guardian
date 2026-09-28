# ============================================
# 乡村守护者 — 生产环境 Dockerfile
# 构建: docker build -t rural-guardian .
# ============================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --production=false
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine AS backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production && npm cache clean --force
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 非 root 用户运行
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080 1883 8884
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health',r=>{process.exit(r.statusCode===200?0:1)})"

ENV NODE_ENV=production
ENV ALLOW_DEMO_LOGIN=false
CMD ["node", "server.js"]

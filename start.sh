#!/bin/bash
echo "========================================"
echo "  乡村守护者 - 一键启动"
echo "========================================"
echo ""

DIR="$(dirname "$0")"

echo "启动后端服务（端口 8080）..."
cd "$DIR/backend"
node server.js &
BACKEND_PID=$!
sleep 2

echo "启动前端服务（端口 3000）..."
cd "$DIR/frontend"
npx vite --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  启动完成！"
echo "  前端地址: http://localhost:3000"
echo "  后端地址: http://localhost:8080"
echo "  API管理:  http://localhost:8080/api-dashboard"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获退出信号，清理子进程
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '服务已停止'; exit" SIGINT SIGTERM

wait

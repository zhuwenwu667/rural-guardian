#!/bin/bash
echo "========================================"
echo "  乡村守护者 - 一键安装依赖"
echo "========================================"
echo ""

echo "[1/2] 安装后端依赖..."
cd "$(dirname "$0")/backend"
npm install
if [ $? -ne 0 ]; then
    echo "[错误] 后端依赖安装失败！请确保已安装 Node.js 和 C++ 编译工具。"
    echo "       macOS: xcode-select --install"
    echo "       Linux: sudo apt install build-essential python3"
    exit 1
fi

echo ""
echo "[2/2] 安装前端依赖..."
cd "$(dirname "$0")/frontend"
npm install
if [ $? -ne 0 ]; then
    echo "[错误] 前端依赖安装失败！"
    exit 1
fi

echo ""
echo "========================================"
echo "  安装完成！请运行 ./start.sh 启动服务"
echo "========================================"

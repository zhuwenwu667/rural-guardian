@echo off
chcp 65001 >nul
echo ========================================
echo   乡村守护者 - 一键安装依赖
echo ========================================
echo.

echo [1/2] 安装后端依赖...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo [错误] 后端依赖安装失败！请确保已安装 Node.js 和 C++ 编译工具。
    echo        Windows 用户需要安装 Visual Studio Build Tools。
    pause
    exit /b 1
)

echo.
echo [2/2] 安装前端依赖...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo [错误] 前端依赖安装失败！
    pause
    exit /b 1
)

echo.
echo ========================================
echo   安装完成！请运行 start.bat 启动服务
echo ========================================
pause

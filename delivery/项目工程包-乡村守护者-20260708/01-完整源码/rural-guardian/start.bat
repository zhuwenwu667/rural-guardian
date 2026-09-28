@echo off
chcp 65001 >nul
echo ========================================
echo   乡村守护者 - 一键启动
echo ========================================
echo.
echo 启动后端服务（端口 8080）...
start "后端服务 - 8080" cmd /k "cd /d "%~dp0backend" && npm start"
timeout /t 3 /nobreak >nul

echo 启动前端服务（端口 3000）...
start "前端服务 - 3000" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   启动完成！
echo   前端地址: http://localhost:3000
echo   后端地址: http://localhost:8080
echo   API管理:  http://localhost:8080/api-dashboard
echo ========================================
echo.
echo 按任意键打开浏览器...
pause >nul
start http://localhost:3000

@echo off
REM 118 Studio Manager 一键启动脚本（Windows CMD）
cd /d "%~dp0"
echo 正在启动 118 Studio Manager VC 版...
start "" cmd /k "npm run dev"
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"
echo 已在浏览器中打开项目。关闭新打开的命令窗口即停止服务。

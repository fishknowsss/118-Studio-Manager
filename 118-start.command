#!/bin/bash
# 118 Studio Manager 一键启动脚本
cd /Users/fishknowsss/Documents/MMSS/118SM/118studio-vc
echo "正在启动 118 Studio Manager VC 版..."
npm run dev &
sleep 2
open http://localhost:5173
echo "已在浏览器中打开项目。关闭此窗口即停止服务。"
wait

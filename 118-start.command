#!/bin/zsh
# 118 Studio Manager 一键启动脚本
cd -- "$(dirname -- "$0")" || exit 1
echo "正在启动 118 Studio Manager VC 版..."
exec npm run dev -- --open

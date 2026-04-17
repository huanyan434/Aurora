#!/bin/bash

# Aurora 项目打包脚本
# 用途: 构建前端、后端和 dashboard 项目，并将它们打包在一起

set -e  # 遇到错误时终止脚本

echo "开始打包 Aurora 项目..."

# 获取脚本所在目录
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
echo "项目根目录: $PROJECT_ROOT"

# 创建构建输出目录
BUILD_DIR="$PROJECT_ROOT/build"
BACKEND_DIR="$BUILD_DIR/backend"
FRONTEND_DIR="$BUILD_DIR/frontend"
DASHBOARD_DIR="$BUILD_DIR/dashboard"

echo "清理旧的构建文件..."
rm -rf "$BUILD_DIR"
mkdir -p "$BACKEND_DIR" "$FRONTEND_DIR" "$DASHBOARD_DIR"

# 构建后端
echo "开始构建后端..."
cd "$PROJECT_ROOT/backend"
go build -o "$BACKEND_DIR/aurora-backend" main.go

# 构建前端
echo "开始构建前端..."
cd "$PROJECT_ROOT/frontend"
pnpm build

# 复制前端构建产物
cp -r "$PROJECT_ROOT/frontend/dist" "$FRONTEND_DIR/"

# 构建 dashboard
echo "开始构建 dashboard..."
cd "$PROJECT_ROOT/dashboard"
npm run build

# 复制 dashboard 构建产物
cp -r "$PROJECT_ROOT/dashboard/dist" "$DASHBOARD_DIR/"

echo "打包完成!"
echo "构建产物位置: $BUILD_DIR"
echo "  - 后端: $BACKEND_DIR"
echo "  - 前端: $FRONTEND_DIR"
echo "  - Dashboard: $DASHBOARD_DIR"

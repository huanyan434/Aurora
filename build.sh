#!/bin/bash

# Aurora 项目构建脚本
# 用途: 构建前端和后端项目，并将它们打包在一起

set -e  # 遇到错误时终止脚本

echo "开始构建 Aurora 项目..."

# 获取脚本所在目录
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
echo "项目根目录: $PROJECT_ROOT"

# 创建构建输出目录
BUILD_DIR="$PROJECT_ROOT/build"
DIST_DIR="$BUILD_DIR/dist"
BACKEND_DIR="$BUILD_DIR/backend"
FRONTEND_DIR="$BUILD_DIR/frontend"

echo "清理旧的构建文件..."
rm -rf "$BUILD_DIR"
mkdir -p "$DIST_DIR" "$BACKEND_DIR" "$FRONTEND_DIR"

# 构建后端
echo "开始构建后端..."
cd "$PROJECT_ROOT/backend"
go mod tidy
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o "$BACKEND_DIR/aurora-backend" .

# 复制配置文件和文档（如果有的话）
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    cp "$PROJECT_ROOT/backend/.env" "$BACKEND_DIR/"
fi

if [ -d "$PROJECT_ROOT/backend/docs" ]; then
    cp -r "$PROJECT_ROOT/backend/docs" "$BACKEND_DIR/"
fi

# 构建前端
echo "开始构建前端..."
cd "$PROJECT_ROOT/frontend"
npm install
npm run build

# 复制前端构建产物到后端静态文件目录
cp -r "$PROJECT_ROOT/frontend/dist" "$BACKEND_DIR/"

# 创建统一的启动脚本
cat > "$BUILD_DIR/start.sh" << 'EOF'
#!/bin/bash
# Aurora 项目启动脚本

# 获取脚本所在目录
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 启动后端服务
cd "$DIR/backend"
./aurora-backend
EOF

chmod +x "$BUILD_DIR/start.sh"

# 创建部署包
echo "创建部署包..."
cd "$BUILD_DIR"
tar -czf "$PROJECT_ROOT/aurora-deployment.tar.gz" .

echo "构建完成!"
echo "部署包位置: $PROJECT_ROOT/aurora-deployment.tar.gz"
echo "解压后运行 ./start.sh 来启动服务"
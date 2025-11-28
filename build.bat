@echo off
REM Aurora 项目构建脚本 (Windows)
REM 用途: 构建前端和后端项目，并将它们打包在一起

echo 开始构建 Aurora 项目...

REM 获取当前目录作为项目根目录
set PROJECT_ROOT=%~dp0
echo 项目根目录: %PROJECT_ROOT%

REM 设置构建输出目录
set BUILD_DIR=%PROJECT_ROOT%build
set DIST_DIR=%BUILD_DIR%\dist
set BACKEND_DIR=%BUILD_DIR%\backend
set FRONTEND_DIR=%BUILD_DIR%\frontend

echo 清理旧的构建文件...
rmdir /s /q "%BUILD_DIR%"
mkdir "%DIST_DIR%" 2>nul
mkdir "%BACKEND_DIR%" 2>nul
mkdir "%FRONTEND_DIR%" 2>nul

REM 构建后端
echo 开始构建后端...
cd /d "%PROJECT_ROOT%backend"
go mod tidy
go build -o "%BACKEND_DIR%\aurora-backend.exe"

REM 复制配置文件和文档（如果有的话）
if exist "%PROJECT_ROOT%backend\.env" (
    copy "%PROJECT_ROOT%backend\.env" "%BACKEND_DIR%\"
)

if exist "%PROJECT_ROOT%backend\docs\" (
    xcopy "%PROJECT_ROOT%backend\docs" "%BACKEND_DIR%\docs\" /E /I /H /Y
)

REM 构建前端
echo 开始构建前端...
cd /d "%PROJECT_ROOT%frontend"
call npm install
call npm run build

REM 复制前端构建产物到后端静态文件目录
xcopy "%PROJECT_ROOT%frontend\dist" "%BACKEND_DIR%\dist\" /E /I /H /Y

REM 创建统一的启动脚本
(
    echo @echo off
    echo REM Aurora 项目启动脚本
    echo cd /d "%%~dp0backend"
    echo aurora-backend.exe
) > "%BUILD_DIR%\start.bat"

echo 构建完成!
echo 部署包位于构建目录: %BUILD_DIR%
echo 运行 start.bat 来启动服务
# Aurora AI 项目文档

## 规则区域

1. **元规则**:
   1. 执行任何规则前，必须先声明"根据规则X"，规则1、2除外
   2. 规则2（自然语言规则）可直接执行，无需额外说明
   3. 调用工具前需简述工具名称及用途
   4. 当用户指出错误时，不要过多自责，而是立刻改正解决问题
2. **自然语言规则**:
   1. 与用户交流必须使用简体中文
   2. 注释尽可能使用简体中文
3. **开发语言**: 前端使用Dart+Flutter
4. **代码规范**: 遵循Dart和Flutter官方代码规范
5. **文档查询**: 遇到不确定问题时，使用context7工具，查阅Flutter官方文档
6. **Flutter约定**:
    1. 使用Dart语言，遵循类型安全
    2. 使用Flutter框架和Material 3设计规范
    3. 组件使用PascalCase命名
    4. 遵循Flutter官方代码风格和最佳实践
    5. 修改文件使用编辑器功能，不使用终端工具
    6. 功能组件放在`lib/`目录下的相应子目录
    7. 页面组件放在`lib/`目录下，按功能组织
    8. 使用`Colors`和`Theme`系统保持一致的视觉风格
    9. 使用`SafeArea`处理设备安全区域
    10. 使用`SystemChrome`处理系统UI
    11. 使用`flutter_statusbarcolor_ns`处理沉浸式UI
    12. 使用`extendBody`属性实现底部导航栏沉浸效果
    13. 修改代码后不尝试运行，除非特别要求

## 项目概述

Aurora AI 是一个现代化的Flutter移动应用，基于Material 3 (Material You)设计规范构建，提供了沉浸式UI体验、状态栏和导航栏适配等丰富的功能。应用采用底部导航设计，包含聊天和用户配置等核心功能。

## UI设计与实现

### 沉浸式UI实现

Aurora AI实现了Android全面屏手势导航栏的沉浸式效果：

1. 使用`FlutterStatusbarcolor`库设置状态栏和导航栏颜色
2. 状态栏设置为白色背景，深色图标
3. 导航栏设置为透明，让页面背景延伸到底部
4. 使用`extendBody: true`属性让内容延伸到导航栏下方
5. 设置Scaffold背景色为白色，确保导航栏下方显示白色背景

### Material 3设计规范

- 使用`ColorScheme.fromSeed`生成Material 3色彩系统
- 遵循Material You设计原则
- 使用`useMaterial3: true`启用Material 3组件
- 使用圆角和阴影创建现代UI外观

## 状态栏和导航栏适配

### 状态栏适配
- 使用`FlutterStatusbarcolor.setStatusBarColor(Colors.white)`设置白色状态栏背景
- 使用`FlutterStatusbarcolor.setStatusBarWhiteForeground(false)`设置深色状态栏图标

### 导航栏适配
- 使用`FlutterStatusbarcolor.setNavigationBarColor(Colors.transparent)`设置透明导航栏背景
- 使用`FlutterStatusbarcolor.setNavigationBarWhiteForeground(false)`设置深色导航栏图标
- 使用`extendBody: true`让页面内容延伸到导航栏下方
- 设置`Scaffold`背景色为白色，实现导航栏下方的白色背景效果

## Chrome开发者工具使用

### 初始化Chrome开发者工具
- 工具名称：`new_page`
- 用途：创建一个新的浏览器页面并访问指定URL
- 用法：`new_page(url="http://192.168.31.134:5000/swagger/index.html")`
- 说明：此工具用于初始化Chrome开发者工具环境，访问API文档页面

### 访问API文档
- 目标URL：`http://192.168.31.134:5000/swagger/index.html`
- 用途：查看Aurora API的Swagger文档
- 步骤：
  1. 使用`new_page`工具打开API文档页面
  2. 使用`take_snapshot`工具获取页面内容
  3. 使用`click`工具展开API端点详情
  4. 查看API端点参数和响应格式
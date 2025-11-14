# Aurora 前端项目

## 项目概述

Aurora 是一个现代化的前端项目，基于 Vue 3、TypeScript 和 Vite 构建。该项目使用了 Tailwind CSS 进行样式设计，并结合了多种现代前端技术栈，包括 Pinia 状态管理、Vue Router 路由管理等。

项目提供了用户认证（登录/注册）、聊天界面、用户配置文件等功能。聊天界面是项目的核心功能，支持与AI助手的对话功能。

## 技术栈

- Vue 3 (使用 Composition API 和 `<script setup>`)
- TypeScript
- Vite (开发服务器和构建工具)
- Tailwind CSS (样式框架)
- Pinia (状态管理)
- Vue Router (路由管理)
- reka-ui (UI组件库)
- clsx 和 tailwind-merge (类名处理)

## 组件结构

项目遵循清晰的组件结构，主要组件包括：

- **认证视图**: `/src/views/Login.vue` 和 `/src/views/Register.vue`
- **聊天界面**: `/src/views/Chat.vue` (已实现完整的侧边栏和聊天区域)
- **用户配置文件**: `/src/views/Profile.vue`

### 主要组件

- `/src/components/Sidebar.vue`: 侧边栏组件，包含 Aurora 标题、新对话按钮和对话列表
- `/src/components/SidebarHeader.vue`: 侧边栏头部组件
- `/src/components/ConversationsList.vue`: 对话列表组件
- `/src/components/MainContent.vue`: 右侧主内容组件
- `/src/components/TopBar.vue`: 顶部工具栏组件
- `/src/components/MessagesContainer.vue`: 消息容器组件
- `/src/components/InputArea.vue`: 输入区域组件

## API 集成

项目通过 API 模块与后端交互，主要 API 文件位于 `/src/api/user.ts` 和 `/src/api/chat.ts`，包括：

- 用户登录/注册
- 验证码发送
- 当前用户信息获取
- 签到功能
- 积分和VIP验证
- 对话管理（获取列表、重命名、删除）
- 模型列表获取

## 构建和运行

### 依赖安装

```bash
pnpm add
```

### 开发环境运行

```bash
pnpm dev
```

### 构建项目

```bash
pnpm build
```

## 开发约定

### 总述

- 使用 TypeScript 编写，遵循类型安全原则
- 使用 Vue 3 Composition API 和 `<script setup>` 语法
- 组件命名采用 PascalCase
- 使用 ESLint 和 Prettier 保持代码风格一致
- 修改文件时不要用终端工具，而是使用编辑器功能进行修改
- 完成任务之后无需运行代码
- 回答时使用中文

### 组件设计

- 功能组件放在 `/src/components` 目录下
- 页面组件放在 `/src/views` 目录下
- 使用 `@` 别名引用 `/src` 目录

### 状态管理

- 使用 Pinia 进行状态管理
- 用户信息存储在 `useUserStore` 中，并使用持久化存储
- 聊天相关信息存储在 `useChatStore` 中
- API 错误处理遵循统一的模式

### 样式管理

- 颜色、字体大小等属性建议使用常量放在 `<style scoped>` 中统一定义，尤其多个值重复属性，可以取一个通用名字合并为一个常量
- 使用 Tailwind CSS 进行样式设计，但不是在 `<template>` 中 `class` 属性直接编写，而是在 `<style scoped>` 中编写
- 实现深色模式切换
- 使用类名合并工具 `cn` 函数
- Vue 文件中 `<style>` 部分如果为空，不需要 `/* 可以根据需要添加额外的样式 */`，直接写空行

## 项目结构

```
src/
├── api/                 # API 接口定义
├── components/          # 可复用组件
│   ├── ui/             # UI 组件库
│   ├── Sidebar.vue     # 侧边栏
│   ├── SidebarHeader.vue # 侧边栏头部
│   ├── ConversationsList.vue # 对话列表
│   ├── MainContent.vue # 主内容区域
│   ├── TopBar.vue      # 顶部工具栏
│   ├── MessagesContainer.vue # 消息容器
│   └── InputArea.vue   # 输入区域
├── lib/                # 工具函数
├── router/             # 路由配置
├── stores/             # Pinia 状态存储
├── utils/              # 工具函数
├── views/              # 页面组件
│   ├── Chat.vue        # 聊天界面
│   ├── Login.vue       # 登录页面
│   ├── Register.vue    # 注册页面
│   └── Profile.vue     # 用户配置文件页面
├── App.vue             # 根组件
└── main.ts             # 入口文件
```

## 代理配置

Vite 配置了代理，将 `/api` 和 `/chat` 请求代理到 `http://localhost:5000`，用于开发环境的后端API交互。

## 最近更新

### 对话列表组件改进
- 在 ConversationsList 组件中添加了"历史对话"标题
- 为侧边栏恢复了分割线元素
- 调整了组件间间距样式

### 主内容区域优化
- 欢迎界面问候语根据时间动态变化（早上好/下午好/晚上好）
- 修复了HTML标签错误问题

### UI组件升级
- 集成并使用了 shadcn UI 组件库
- 替换了原生HTML元素为 shadcn 组件
- 统一了项目UI风格

### 代码质量改进
- 修复了多个HTML标签错误
- 完善了组件之间的通信机制
- 优化了状态管理和数据流

### MessagesContainer 组件安全改进
- 修复了 Markdown 渲染的安全性问题
- 实现了对链接和图片的安全协议检查
- 防范 XSS 攻击的风险

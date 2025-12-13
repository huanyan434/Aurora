# Aurora 项目文档

## 规则区域

1. **元规则**:
   1. 执行任何规则前，必须先声明"根据规则X"
   2. 规则2（自然语言规则）可直接执行，无需额外说明
   3. 调用工具前需简述工具名称及用途
   4. 当用户指出错误时，不要过多自责，而是立刻改正解决问题
2. **自然语言规则**:
   1. 与用户交流必须使用简体中文
   2. 注释尽可能使用简体中文
3. **开发语言**: 前端用TypeScript+Vue3，后端用Go
4. **代码规范**: 前端用ESLint+Prettier，后端遵循Go标准格式
5. **文档查询**: 遇到不确定问题时，调用context7获取最新文档
6. **前端验证**: 每次修改前端代码后，用chrome-devtools调试前端，检查错误以及日志
7. **前端约定**:
    1. 使用TypeScript，遵循类型安全
    2. 使用Vue3 Composition API和`<script setup>`语法
    3. 组件使用PascalCase命名
    4. 使用ESLint和Prettier保持代码风格一致
    5. 修改文件使用编辑器功能，不使用终端工具
    6. 功能组件放在`/src/components`目录
    7. 页面组件放在`/src/views`目录
    8. 使用`@`别名引用`/src`目录
    9. 颜色、字体等属性用常量在`<style scoped>`中统一定义
    10. 使用Tailwind CSS设计样式，但写在`<style scoped>`中
    11. 使用类名合并工具`cn`函数
    12. Vue文件`<style>`部分为空时直接留空行
8. **后端约定**:
    1. 遵循Go语言标准格式（gofmt）
    2. API接口使用Swagger文档注释
    3. 数据库操作使用GORM库
    4. 错误处理遵循Go最佳实践
    5. 日志记录使用结构化日志

## 项目概述

Aurora 是一个现代化的全栈项目，包含了前端和后端两个部分。前端基于 Vue 3、TypeScript 和 Vite 构建，提供了用户认证、聊天界面、用户配置等丰富的功能。后端采用 Go 语言开发，使用 Gin 框架和 GORM 库，提供 RESTful API 和 SSE 流式接口，支持用户管理、积分系统、AI 对话等功能。

## 前端技术栈

- Vue 3 (使用 Composition API 和 `<script setup>`)
- TypeScript
- Vite (开发服务器和构建工具)
- Tailwind CSS (样式框架)
- Pinia (状态管理)
- Vue Router (路由管理)
- reka-ui (UI组件库)
- clsx 和 tailwind-merge (类名处理)

## 后端技术栈

- Go 语言
- Gin 框架 (Web 框架)
- GORM (数据库 ORM)
- Sessions (会话管理)
- JWT (可选，若使用)
- Swagger (API 文档)

## 前端组件结构

项目遵循清晰的组件结构，主要组件包括：

- **认证视图**: `/src/views/Login.vue` 和 `/src/views/Register.vue`
- **聊天界面**: `/src/views/Chat.vue` (已实现完整的侧边栏和聊天区域)
- **用户配置文件**: `/src/views/Profile.vue`

### 主要前端组件

- `/src/components/Sidebar.vue`: 侧边栏组件，包含 Aurora 标题、新对话按钮和对话列表
- `/src/components/SidebarHeader.vue`: 侧边栏头部组件
- `/src/components/ConversationsList.vue`: 对话列表组件
- `/src/components/MainContent.vue`: 右侧主内容组件
- `/src/components/TopBar.vue`: 顶部工具栏组件
- `/src/components/MessagesContainer.vue`: 消息容器组件
- `/src/components/InputArea.vue`: 输入区域组件

## 后端功能模块

后端主要包含以下功能模块：

### API 接口 (路径: `/api`)
- `/api/login`: 用户登录
- `/api/signup`: 用户注册
- `/api/current_user`: 获取当前用户信息
- `/api/send_verify_code`: 发送验证码
- `/api/sign`: 签到功能
- `/api/has_signed`: 获取签到状态
- `/api/models_list`: 获取AI模型列表
- `/api/verify_vip`: 验证VIP会员
- `/api/verify_points`: 验证积分充值
- `/api/logout`: 退出登录

### 聊天接口 (路径: `/chat`)
- `/chat/generate`: 生成AI回复（SSE流式传输）
- `/chat/thread_list`: 获取线程列表
- `/chat/stop`: 停止生成
- `/chat/new_conversation`: 创建新对话
- `/chat/delete_conversation`: 删除对话
- `/chat/conversations_list`: 获取对话列表
- `/chat/messages_list`: 获取历史消息
- `/chat/share_messages`: 分享消息
- `/chat/:shareID`: 获取分享内容
- `/chat/delete_message`: 删除消息
- `/chat/tts`: 文字转语音
- `/chat/stt`: 语音转文字

## API 集成

前端通过 API 模块与后端交互，主要 API 文件位于 `/src/api/user.ts` 和 `/src/api/chat.ts`，包括：
- 用户登录/注册
- 验证码发送
- 当前用户信息获取
- 签到功能
- 积分和VIP验证
- 对话管理（获取列表、重命名、删除）
- 模型列表获取

## 数据库模型

后端定义了多种数据模型，主要包含：

### User 结构 (用户信息)
- ID (用户ID)
- Username (用户名)
- Email (邮箱)
- PasswordHash (密码哈希)
- CreatedAt (创建时间)
- UpdatedAt (更新时间)
- IsMember (是否是会员)
- MemberLevel (会员等级)
- Points (积分)

### Conversation 结构 (对话)
- ID (对话ID)
- UserID (用户ID)
- Title (对话标题)
- CreatedAt (创建时间)
- UpdatedAt (更新时间)

### Message 结构 (消息)
- ID (消息ID)
- ConversationID (对话ID)
- Content (消息内容)
- Role (消息角色: user/assistant)
- CreatedAt (创建时间)

### Log 结构 (日志)
- ID (日志ID)
- UserID (用户ID)
- Time (时间)
- Route (路由)
- Method (HTTP方法)
- Response (响应内容)
- About (日志分类: 用户/对话/财务)

## 积分与会员系统

Aurora 项目实现了完整的积分与会员系统：

### 会员等级
- Free: 免费用户
- VIP: 高级会员
- SVIP: 超级会员

### 积分消耗规则
- 普通用户: 使用AI模型按模型指定的积分消耗
- VIP用户: 积分消耗减半（向上取整）
- SVIP用户: 免费使用

对于启用推理模式的请求，积分消耗为正常模式的1.5倍（向上取整）。

### 签到系统
- 用户每日签到可以获得一定数量的积分
- 连续签到可获得额外奖励


## 构建和运行

### 项目打包

使用项目提供的构建脚本可以一次性构建前端和后端，并将它们打包在一起：

```bash
./build-package.sh
```

构建产物将位于 `build` 目录中，其中：
- `backend` 目录包含后端可执行文件
- `frontend` 目录包含前端构建产物

## 项目结构

### 前端结构
```
frontend/src/
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

### 后端结构
```
backend/
├── main.go             # 主程序入口
├── go.mod              # Go 模块定义
├── go.sum              # Go 依赖校验
├── docs/               # API 文档
├── routes/             # 路由处理
│   ├── chat.go         # 聊天相关路由
│   └── api.go          # 用户相关路由
└── utils/              # 工具函数
    ├── config.go       # 配置管理
    ├── config.yaml     # 配置文件
    ├── models.go       # 数据模型定义
    └── user.go         # 用户相关工具函数
```
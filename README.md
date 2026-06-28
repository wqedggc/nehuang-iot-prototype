# 涅凰智农 IoT 云平台 — HTML 原型

## 概述

本目录包含涅凰智农 IoT 云平台的 C 端（农户小程序视角）和管理端的 HTML 原型页面。

原型目的：
- 验证 C 端和管理端的业务流程
- 在真实硬件/后端就绪前，通过 mock 数据跑通完整操作链路
- 为后续小程序开发和管理后台开发提供交互参考

## 目录结构

```
prototype/
├── mini/                  # C 端（农户视角）
│   ├── index.html         # 入口页面（SPA）
│   ├── app.css            # 样式表
│   └── app.js             # 应用逻辑（Hash 路由）
├── admin/                 # 管理端
│   ├── index.html         # 入口页面（SPA）
│   ├── app.css            # 样式表
│   └── app.js             # 应用逻辑（Hash 路由）
├── mock/
│   └── mock-api.js        # Mock API 层（数据 + 路由）
└── README.md              # 本文件
```

## 快速开始

### 方式一：直接打开（推荐）

直接用浏览器打开 HTML 文件即可运行：

```bash
# C 端
open prototype/mini/index.html

# 管理端
open prototype/admin/index.html
```

### 方式二：本地静态服务

```bash
cd prototype
python3 -m http.server 8080
```

然后访问：
- C 端：http://localhost:8080/mini/
- 管理端：http://localhost:8080/admin/

### 方式三：VS Code Live Server

在 VS Code 中安装 Live Server 插件，右键 `index.html` → "Open with Live Server"。

## 页面功能

### C 端（mini/）

| 页面 | 路由 | 说明 |
|------|------|------|
| 登录 | `#login` | 输入手机号/用户名或点击"模拟登录" |
| 设备列表 | `#devices` | 展示已绑定设备的实时值、状态、更新时间 |
| 设备详情 | `#device/:id` | 实时数据、基本信息、控制按钮、历史曲线入口 |
| 历史曲线 | `#history/:id` | 温度/墒情曲线，支持 1h/24h/7d 时间范围 |
| 设置 | `#settings` | 用户名、绑定设备数、退出登录 |

### 管理端（admin/）

| 页面 | 路由 | 说明 |
|------|------|------|
| 登录 | `#login` | 用户名 + 密码（测试：admin/admin123） |
| Dashboard | `#dashboard` | 在线设备、采集执行器、农户数、今日上报 |
| 用户管理 | `#users` | 用户列表、角色、绑定设备数、状态、搜索 |
| 设备管理 | `#gateways` | 云边设备列表 + 采集执行器功能点列表、搜索 |
| 绑定管理 | `#bindings` | 农户-设备绑定关系、新增绑定（Modal）、解绑 |
| 控制日志 | `#logs` | 操作人、设备、操作类型、命令状态、结果、搜索 |

## API 接口约定

### C 端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/mini/mock-login` | 模拟登录，返回 token |
| GET | `/api/v1/mini/me` | 当前用户信息 |
| GET | `/api/v1/mini/devices` | 已绑定设备列表 |
| GET | `/api/v1/mini/devices/{id}/realtime` | 设备实时数据 |
| GET | `/api/v1/mini/devices/{id}/history?range=24h` | 历史曲线数据 |
| POST | `/api/v1/mini/devices/{id}/control` | 设备控制（start/stop/close） |

### 管理端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/admin/login` | 管理员登录 |
| GET | `/api/v1/admin/me` | 当前管理员信息 |
| GET | `/api/v1/admin/dashboard` | Dashboard 统计数据 |
| GET | `/api/v1/admin/users` | 用户列表 |
| GET | `/api/v1/admin/gateways` | 云边设备列表 |
| GET | `/api/v1/admin/collectors` | 采集执行器列表 |
| GET | `/api/v1/admin/bindings` | 绑定关系列表 |
| POST | `/api/v1/admin/bindings` | 新增绑定 |
| DELETE | `/api/v1/admin/bindings/{id}` | 删除绑定 |
| GET | `/api/v1/admin/control-logs` | 控制日志列表 |

## 切换真实后端

所有 API 调用集中在 `mock/mock-api.js` 中。切换到真实 Go 后端只需修改一处：

```javascript
// mock/mock-api.js 第 23 行
const API_BASE = 'http://your-server:8080';  // 改为真实后端地址
```

设为空字符串 `''` 时使用内置 mock 数据。

请求封装遵循统一模式：
- 自动携带 `Authorization: Bearer <token>`
- 统一 JSON 请求/响应格式
- 后续接口变更只需在 `mockRoutes` 中对应调整

## Mock 数据覆盖

Mock 数据覆盖以下功能类型：

| 功能类型 | func 值 | 单位 | 模拟状态 |
|----------|---------|------|----------|
| 温度 | 1 | ℃ | 正常/偏高/偏低 |
| 墒情 | 2 | % | 正常 |
| 限位 | 3 | — | 正常 |
| 水泵 | 4 | — | 开启/关闭 |
| 风机 | 5 | — | 开启/关闭 |
| 继电器 | 6 | — | 开启/关闭 |

额外模拟场景：
- 设备离线状态
- 控制操作成功/失败
- 多农户、多设备绑定关系

## 设计说明

- **风格**：农业 IoT 运维，清爽绿色系，密度适中
- **C 端**：移动端优先宽度（max-width: 600px），浏览器也能正常查看
- **管理端**：桌面端优先，侧边栏 + 表格 + 筛选
- **技术栈**：原生 HTML/CSS/JS，无框架依赖
- **图表**：Chart.js 4.x（CDN 加载，历史曲线页使用）
- **状态覆盖**：加载态（spinner）、空状态、错误态、Toast 提示

## 限制与边界

1. 不处理硬件协议（不解析十六进制、不模拟 LoRa）
2. 不处理 TCP Gateway（不建立 TCP 连接）
3. 不直接读取 devices.json（所有数据通过 API 获取）
4. 不直接访问数据库（使用 mock 数据）
5. 不做营销首页（打开直接进入业务界面）
6. 不实现微信小程序原生能力（仅浏览器访问）

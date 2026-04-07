# TypeScript Monorepo 初始化 Prompt

[English](PROMPT.md) | [中文](PROMPT.zh-CN.md) | [日本語](PROMPT.ja.md) | [한국어](PROMPT.ko.md)

请初始化一个可运行、可维护、可扩展、接近真实团队项目的全栈 TypeScript Monorepo，不要只输出说明文字或空壳模板。

## 1. 执行规则

- 直接采用最佳实践，不要给我多个可选方案。
- 如果我原始要求中有不符合最佳实践的地方，请直接纠正并采用更优方案。
- 生成结果必须优先保证可运行性、边界清晰和后续可维护性。
- 不要为了“显得完整”生成大量无法运行、无法验证、没有边界的样板代码。
- 如果上下文窗口或 token 不足，请优先完整交付 `Must`，再处理 `Should`，最后处理 `Nice-to-have`。
- 如果你跳过了 `Should` 或 `Nice-to-have` 项，不要假装已经完成；请明确说明哪些被延期。
- 源码、标识符、注释、配置键名、环境变量名、fixture 和 seed 数据统一使用英文。用户可见文案与本地化文档的初始交付语言策略取决于当前 Prompt 版本：中文 Prompt 交付 `中文 + 英文`。

## 2. 交付优先级

### 2.1 Must

必须优先完成以下内容：

- Monorepo 基础骨架可运行
- 前后端都能本地开发、构建、lint、typecheck、测试
- 前端 React + Vite + BrowserRouter + base path 方案正确
- 后端 NestJS + Prisma + MySQL + Redis 基础链路可运行
- 前端 FSD 边界清晰
- 后端核心业务模块采用 DDD 分层
- Zod 方案落地一致，不混入另一套 HTTP 校验风格
- OpenAPI 导出与 Orval SDK 生成链路可用
- User Management 示例业务完整打通
- 基础页面、主题、国际化、错误边界、加载态等关键用户体验能力可用
- API 响应格式、日志字段、缓存边界、环境变量治理等核心约束已落地
- Makefile、环境变量、Docker、基础 README 可用

### 2.2 Should

在 `Must` 完成后，优先补充以下内容：

- GitHub Actions
- `CLAUDE.md` 与 `AGENTS.md`
- 关键规范文档
- 更完整的测试样例
- Storybook

### 2.3 Nice-to-have

如果仍有充足上下文、时间或 token，再补充以下内容：

- 更多 docs
- ADR 文档
- skills 目录
- 更丰富的示例业务
- 更强的可观测性增强

## 3. 固定技术栈

不要提供备选方案，直接采用以下方案。

### 3.1 运行时与 Monorepo

- Node.js 24 LTS
- 如果执行时 Node.js 24 已不再是活跃 LTS，则切换到当前活跃 LTS，并说明原因
- pnpm workspace
- Turborepo
- TypeScript 5.x
- TypeScript Project References（`composite`）

### 3.2 前端

- React
- Vite
- React Router（BrowserRouter）
- TanStack Query
- Zustand
- i18next
- Zod
- CSS Modules
- Radix UI Primitives
- MSW
- Design Tokens + CSS Variables
- Storybook 作为 `Should`

### 3.3 后端

- NestJS
- Prisma
- MySQL
- Redis
- Zod
- `nestjs-zod`
- Swagger / OpenAPI
- Pino

### 3.4 工程化

- ESLint
- Prettier
- EditorConfig
- Husky
- lint-staged
- commitlint
- Knip
- Vitest
- Playwright 仅用于真实浏览器 E2E（如实现）
- GitHub Actions
- Orval

## 4. 版本与锁定策略

初始化工程时，不要强调“尽量最新”，而要强调“稳定兼容并锁版本”。

必须包含：

- 根目录 `package.json` 声明 `packageManager`
- 使用 Corepack 固定 pnpm 版本
- 根目录提供 `.nvmrc`
- 根目录提供 `.node-version`
- 根目录提供 `.npmrc`
- 根目录提供 `pnpm-lock.yaml`
- 根目录 `package.json` 声明 `engines`

建议补充：

- Dependabot 或 Renovate 配置

## 5. Monorepo 结构

至少包含以下结构：

```text
.
├── apps
│   ├── web
│   └── server
├── packages
│   ├── shared
│   ├── ui
│   ├── config
│   ├── sdk
│   └── tooling                       # 可选：辅助脚本与工具
├── docs
├── .agents
│   └── skills
├── .claude
│   └── skills -> ../.agents/skills
├── .codex
│   └── skills -> ../.agents/skills
├── CLAUDE.md
├── AGENTS.md -> CLAUDE.md
├── README.md
├── README.zh-CN.md
├── Makefile
├── Dockerfile
├── docker-compose.yml
├── .editorconfig
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
├── .npmrc
├── .nvmrc
├── .node-version
└── ...
```

要求：

- 所有 package 都必须声明清晰的 `exports`
- 禁止跨包 deep import
- `shared` 不能成为杂物间
- 自动生成代码与手写代码必须分目录隔离
- 新增 package 必须声明清晰的 `name`、`type`、`exports`、`files`
- 新增 package 必须接入 TypeScript project references
- `packages/tooling` 用于放置辅助脚本与工具，例如 OpenAPI spec 导出脚本、代码生成配置等；如果初始化阶段没有明确内容，可以暂不创建

### 5.1 内部 Package 构建策略

- 内部 packages 默认使用 `tsup` 预编译，输出 ESM 和类型声明
- apps 默认消费 package 的编译产物，而不是直接跨包消费未编译的 `.ts` 源文件
- TypeScript project references 用于 IDE 跳转、类型检查和增量构建加速，不替代 package 的实际构建产物

### 5.2 tsconfig 继承策略

- `packages/config` 提供共享的 `tsconfig.base.json`
- 前端 app 额外继承 `tsconfig.web.json`，包含 JSX / DOM 相关配置
- 后端 app 额外继承 `tsconfig.node.json`，包含 Node.js 运行时相关配置
- 各 package 和 app 的 `tsconfig.json` 都应从共享配置继承，而不是各自散落重复配置

### 5.3 共享包职责

- `packages/shared` 用于跨前后端共享的类型、schema、常量、通用工具
- `packages/ui` 用于前端共享 UI 组件、tokens、主题工具
- `packages/config` 用于共享工程配置
- `packages/sdk` 用于 API 契约、生成代码与前端专用 hooks 的分层导出
- `packages/tooling` 用于工程脚本与代码生成工具

## 6. 架构原则

### 6.1 总原则

- 默认按生产项目骨架初始化
- 高内聚、低耦合
- 优先保证可运行、可读、可测、可扩展
- 目录与命名必须统一、一致、可预测
- 必须通过工程规则约束边界，而不是只写文档

### 6.2 禁止事项

- 不允许把 Prisma model 直接当领域模型
- 不允许把所有业务逻辑堆到一个 service
- 不允许在业务页面散落请求逻辑和业务规则
- 不允许将服务端状态塞进 Zustand
- 不允许组件写死颜色、圆角、阴影、间距、字号
- 不允许在组件中写死用户可见文案
- 不允许到处直接读取 `process.env`
- 不允许手写与 OpenAPI 重复的大量 API client
- 不允许手改自动生成的 SDK 代码

### 6.3 边界落地工具

必须明确并真正落地：

- 使用 `eslint-plugin-boundaries` 或等价方案限制跨层导入
- 可选补充 `dependency-cruiser` 做依赖拓扑检查
- 通过 package `exports`、路径别名、生成目录隔离共同约束边界

## 7. 前端要求

### 7.1 前端架构

前端采用 FSD，不要生搬硬套后端 DDD。

推荐结构：

```text
apps/web/src
├── app
├── pages
├── widgets
├── features
├── entities
├── shared
├── styles
├── locales
└── ...
```

要求：

- 不要使用 `processes` 层
- `pages` 负责页面装配，不承载复杂业务规则
- `widgets` 负责页面级组合，不直接耦合底层 API 细节
- `features` 负责用户动作与业务能力
- `entities` 负责前端领域对象表示、adapter、query hooks、view model
- `shared` 只放纯通用能力，不放业务语义代码
- `apps/web/src/shared` 是 FSD 层级中的前端内部通用层，不要与 `packages/shared` 混淆；两者职责不同，禁止互相替代

### 7.2 前端状态边界

- 服务端状态统一交给 TanStack Query
- Zustand 仅用于 UI 全局状态，例如主题、语言、侧边栏折叠、弹窗显隐
- DTO 不得直接污染 UI model，必须经过 adapter / mapper
- TanStack Query 应配置全局 `QueryCache` / `MutationCache` 的 `onError` 回调，用于统一处理 401 跳转、网络异常 toast 等场景，避免每个 query 重复处理

### 7.3 样式与组件

- 样式方案固定为 `CSS Modules` + Design Tokens + CSS Variables
- 不要引入运行时 CSS-in-JS
- 复杂交互组件优先基于 `Radix UI Primitives` 封装
- Radix Primitives 仅提供行为与可访问性，样式通过 CSS Modules 和 design tokens 附加
- 不要引入 `Radix Themes` 或其他预设样式包
- 基础组件至少包含：
  - `Button`
  - `Input`
  - `Card`
  - `Modal`
  - `Table`
  - `Tag`
  - `Spinner`
  - `EmptyState`

### 7.4 前端最小可用能力

至少提供：

- 应用 Layout 骨架
- 首页
- 404 页面
- 主题切换组件
- 语言切换组件
- 全局错误边界
- `Loading / Empty / Error` 三态组件
- 用户列表页
- 用户详情页
- 用户创建页 / 表单页

### 7.5 主题与 i18n

必须支持：

- 深色 / 浅色主题
- 主题持久化
- 系统主题作为默认行为
- 中文 / 英文
- 所有用户可见文案必须走 i18n
- 初始交付必须至少包含 `zh-CN` 与 `en` 两套语言包
- 所有设计值必须走 token
- token 至少覆盖 `color`、`spacing`、`radius`、`shadow`、`typography`、`z-index`
- 颜色命名必须语义化，例如 `--color-bg-default`、`--color-text-primary`
- 不允许在业务组件里直接写 hex/rgb/hsl、固定间距、固定圆角、固定阴影、固定字号

### 7.6 无障碍与路由性能

- 表单控件必须有关联 label
- 键盘可达
- 弹窗支持焦点管理
- 颜色不能作为唯一信息载体
- 页面级路由组件默认使用 `React.lazy` + `Suspense`

## 8. 路由与 Base Path

### 8.1 路由策略

- 使用 BrowserRouter
- 使用 React Router `basename`
- 使用 Vite `base`
- 前端不能假设自己部署在根路径 `/`

### 8.2 必须支持

- `https://domain.com/path/`
- `https://domain.com/path/users`
- `https://domain.com/path/users/123`

### 8.3 Base Path 归一化规则

请明确实现并文档化以下规则：

- base path 必须归一化为 `/` 或以 `/` 开头的非根路径
- 除根路径 `/` 外，不允许以 `/` 结尾
- `""`、`"/"`、`"//"` 等异常输入必须在配置层被统一归一化
- React Router `basename`、Vite `base`、NestJS 静态托管路径、Swagger 路径必须基于同一套归一化规则

### 8.4 Vite `base` 与 React Router `basename` 的边界

必须明确两种模式，不要混用。默认采用“部署后可变”模式：

- 部署后可变模式（默认）：
  - Vite `base` 设为 `./`
  - React Router `basename` 从 `window.__APP_CONFIG__.basePath` 或等价运行时配置读取
  - 由 NestJS 在返回 `index.html` 时注入运行时配置
- 构建时固定模式（备用）：
  - Vite `base` 与 React Router `basename` 可以同时从 `VITE_BASE_PATH` 读取
  - 此模式下部署后不应再试图动态修改静态资源前缀
  - 文档中说明如何切换到此模式

### 8.5 部署配置

- 刷新页面不能 404
- 非 API 请求统一 fallback 到 `index.html`
- API 路由与 SPA 路由明确分离
- 推荐 API 前缀为 `${APP_BASE_PATH}/api/v1`
- Swagger UI 路径为 `${APP_BASE_PATH}/api/docs`
- 对部署后仍可能变化的前端配置，提供运行时注入机制，例如 `window.__APP_CONFIG__`
- 本地开发时，Vite 必须配置 `server.proxy`，将 `/api` 或等价 API 前缀代理到后端端口，避免跨域问题

## 9. 后端要求

### 9.1 DDD 范围

- 后端核心业务模块采用 DDD 分层
- 基础设施与胶水模块避免过度抽象
- `health`、`config`、`swagger`、`static hosting` 这类模块不要强行套完整 DDD 壳

### 9.2 核心业务模块分层

核心业务模块至少拆分为：

- Domain
- Application
- Infrastructure
- Interfaces

要求：

- Domain 不依赖 Prisma、HTTP、NestJS 细节
- Application 负责用例编排、事务边界、缓存协作
- Infrastructure 放 Prisma、Redis、Mapper、外部依赖适配
- Interfaces 放 Controller、DTO、Presenter、异常映射、Swagger 装饰与文档暴露

### 9.3 后端基础能力

至少实现：

- `/health`
- `/ready`
- `/live`
- MySQL 连接
- Redis 连接
- 配置加载与校验
- 全局异常过滤器
- 统一响应格式
- 请求级日志
- Swagger / OpenAPI
- migration
- seed

### 9.4 API 响应与错误规范

必须统一：

- 成功响应结构
- 分页响应结构
- 错误响应结构

建议字段至少包括：

- `success`
- `data`
- `message`
- `code`
- `requestId`
- `timestamp`

要求：

- Controller 不得随意返回裸对象
- 区分业务异常与系统异常
- 通过全局异常过滤器统一序列化错误响应

## 10. Zod、OpenAPI 与 SDK

### 10.1 Zod 统一策略

- Zod 作为 schema 单一真相来源
- 不要混入 `class-validator` / `class-transformer`
- 前端表单、共享 schema、环境变量校验统一基于 Zod
- NestJS 请求校验统一通过 `nestjs-zod` 或等价的 `ZodValidationPipe` 方案

### 10.2 NestJS 与 OpenAPI 集成

必须明确：

- NestJS 侧通过 `nestjs-zod` 处理请求校验
- 响应序列化也要通过 Zod 方案统一
- OpenAPI 文档必须使用与 Zod 一致的桥接方案
- 如果使用 `@nestjs/swagger`，需要正确处理 Zod 生成文档的后处理流程

### 10.3 SDK 生成

- 基于后端 OpenAPI 自动生成 SDK
- 使用 Orval
- 输出到 `packages/sdk`
- 前端优先消费自动生成的 SDK
- 手写请求层仅保留 transport 配置与拦截器
- 优先使用 Orval 的 TanStack Query 输出模式，直接生成 typed `useQuery` / `useMutation` hooks，而不是只生成基础 HTTP client
- `packages/sdk` 的导出建议按 subpath 拆分：
  - `packages/sdk/types`：纯类型、schema、基础 client，无 React 依赖
  - `packages/sdk/react`：TanStack Query hooks，仅前端消费
- package `exports` 必须分别暴露这些入口，避免将 React 依赖污染到非前端消费者

### 10.4 生成时序

必须明确拓扑关系：

- 后端提供一个无需启动 HTTP 服务即可导出 OpenAPI spec 的脚本
- 例如导出到 `apps/server/openapi/openapi.json`
- 可以使用 standalone CLI 脚本：调用 `NestFactory.create()` 创建应用，但不调用 `app.listen()`，仅执行 `SwaggerModule.createDocument()` 后将 JSON 写入文件
- `sdk:generate` 必须依赖 `server:openapi`
- `web:build` 必须依赖 `sdk:generate`
- `turbo.json` 中必须体现这条任务依赖链

## 11. 数据访问、缓存与配置

### 11.1 Prisma

- 使用 Prisma + MySQL
- Prisma schema 只属于 Infrastructure
- Prisma client 最终消费规范化后的 `DATABASE_URL`
- 如果本地仍使用 `MYSQL_*` 分项变量，只允许在 config 模块中集中拼接

### 11.2 迁移与 seed 安全策略

- 生产启动流程不要隐式执行破坏性迁移
- 开发、测试、生产环境的迁移命令必须分离
- seed 仅在开发 / 测试环境显式触发
- README 与 docs 中说明数据库初始化、迁移、重置、seed 的边界

### 11.3 Redis

- 提供统一缓存封装
- Redis 客户端最终消费规范化后的 `REDIS_URL`
- 明确 cache key 命名规范
- 至少提供一个真实缓存示例
- 至少区分 query cache、id-based entity cache、future auth/session extension、future rate limit extension
- 不允许业务代码里随意拼接 cache key

### 11.4 环境变量

必须提供：

- `.env.example`
- `.env.development`
- `.env.test`
- `.env.production`

前端构建时变量：

- `VITE_APP_NAME`
- `VITE_DEFAULT_LOCALE`
- `VITE_DEFAULT_THEME`
- `VITE_BASE_PATH`（仅构建时固定模式使用）

前端运行时注入变量：

- `APP_RUNTIME_API_BASE_URL`
- `APP_RUNTIME_BASE_PATH`

说明：

- 这两个值不是前端构建时环境变量
- 它们由 NestJS 在返回 `index.html` 时注入到 `window.__APP_CONFIG__`
- 它们不要求直接写入前端 `.env` 文件
- 对应的服务端配置来源应在后端配置层统一声明和映射

后端变量：

- `PORT`
- `APP_BASE_PATH`
- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `SWAGGER_ENABLED`

要求：

- 使用 Zod 校验环境变量
- 启动时失败快返
- 业务代码只依赖类型化配置对象
- 前端构建时只能直接读取 `VITE_` 变量
- 需要部署后覆盖的前端配置通过运行时注入提供
- `.env.production` 仅存放非敏感默认值
- 真实生产密钥与连接串必须由部署环境注入，不提交到仓库
- 默认同源部署时，前端应直接使用相对路径 API 前缀，例如 `/api/v1`
- `APP_RUNTIME_API_BASE_URL` 仅在 API 与前端不同源部署时使用
- 同源部署时，`CORS_ORIGIN` 通常不需要开启；仅当前后端分离跨源部署时才需要明确配置

## 12. 示例业务

不要只生成空壳工程。

固定采用 `User Management` 作为完整示例业务，至少包含：

- 用户列表页
- 用户详情页
- 用户创建页 / 表单页
- 用户领域模型
- 用户仓储接口
- 用户仓储实现
- 用户 use cases
- 用户 controller
- migration
- seed
- Redis 缓存示例

至少打通一条完整链路：

- 前端页面
- SDK 调用
- 后端 Controller
- Application Use Case
- Repository
- MySQL
- Redis Cache

## 13. 测试策略

### 13.1 必须完成

- 前端单元测试
- 前端组件测试
- 基于 MSW 的前端 mock 方案
- 后端单元测试
- 后端 e2e 测试
- `packages/shared` 测试

### 13.2 测试工具选择

- 默认统一使用 Vitest 进行单测、集成测试和后端 e2e 测试
- 如果包含真实浏览器端到端测试，优先补充 Playwright
- 当前 NestJS 版本已提供官方 Vitest 配置路径，优先采用 Vitest，不要默认回退 Jest
- 仅在确认当前依赖版本存在明确兼容性阻塞时，才允许对 `apps/server` 的 e2e 最小化例外使用 Jest，并必须说明原因

### 13.3 测试覆盖最小示例

至少体现：

- 一个前端组件测试
- 一个前端页面或 feature 测试
- 一个后端 use case 单测
- 一个后端 e2e 测试
- 一个 shared schema / utility 测试

## 14. Makefile、Docker 与 CI

### 14.1 Makefile

至少包含：

- `make help`
- `make setup`
- `make dev`
- `make dev-web`
- `make dev-server`
- `make lint`
- `make typecheck`
- `make knip`
- `make test`
- `make build`
- `make check`
- `make generate-sdk`
- `make db-migrate`
- `make db-seed`
- `make db-reset`
- `make db-studio`
- `make clean`
- `make docker-build`
- `make docker-run`

要求：

- `make help` 自动读取注释输出帮助信息
- `make setup` 负责安装依赖、初始化环境变量文件、安装 hooks、创建软链
- `make dev` 通过 `turbo dev`、`concurrently` 或等价方案并发启动前后端
- `make dev` 运行前必须确保 `mysql` 和 `redis` 已可用；可以自动执行 `docker compose up -d mysql redis`，或在缺失时给出明确提示
- `make check` 至少串联 `lint`、`knip`、`typecheck`、`test`、`build`
- 提供 `make db-studio`，用于开发阶段启动 Prisma Studio

### 14.2 Turbo 配置

- `turbo.json` 必须为 `build`、`test`、`generate-sdk`、`openapi` 等任务声明正确的 `outputs`
- Turbo 的任务依赖和缓存配置属于通用工程要求，不要只在 CI 中考虑

### 14.3 Docker

要求：

- 前后端最终打包为一个镜像
- 前端构建产物由后端托管
- 使用 `turbo prune`
- 分别对 `server` 和 `web` 执行 `turbo prune`，得到各自最小化的 workspace 子集
- 在独立 build stage 中分别构建 `server` 与 `web`
- 最终 runner image 仅包含 `server` 运行产物与 `web` 静态产物
- 最终运行镜像尽量使用非 root 用户
- `docker-compose.yml` 至少包含 `mysql`、`redis`
- 体现 `liveness`、`readiness` 以及 `mysql / redis` 可用性检查

### 14.4 CI

作为 `Should` 完成，至少包含：

- 安装依赖
- 缓存 pnpm / turbo
- lint
- typecheck
- test
- build
- 校验自动生成 SDK 未过期

## 15. 日志与安全基线

### 15.1 日志

- 后端默认使用 `pino` 输出结构化 JSON 日志
- 日志字段至少包含 `timestamp`、`level`、`service`、`module`、`action`、`requestId`、`message`
- 错误日志在需要时包含 `error`、`stack`
- 不要在日志中输出密码、token、连接串等敏感信息

### 15.2 安全基线

- CORS 通过环境变量控制
- 默认启用合理的 HTTP 安全头
- 为未来鉴权、限流、审计预留扩展位

## 16. 文档与协作产物

### 16.1 Must

至少生成：

- `README.md`（英文）
- `README.zh-CN.md`（中文）
- `docs/frontend-architecture.md`
- `docs/backend-architecture.md`
- `docs/api-guidelines.md`
- `docs/deployment-guidelines.md`
- `docs/theme-guidelines.md`
- `docs/dependency-boundaries.md`
- `docs/logging-guidelines.md`

### 16.2 Should

如有余量，再生成：

- `CLAUDE.md`
- `AGENTS.md -> CLAUDE.md`
- `docs/testing-guidelines.md`
- `docs/i18n-guidelines.md`
- `docs/env-guidelines.md`
- `docs/accessibility-guidelines.md`
- `docs/security-guidelines.md`
- `docs/error-handling-guidelines.md`
- `docs/cache-guidelines.md`
- `docs/package-guidelines.md`
- Storybook

### 16.3 Nice-to-have

如仍有余量，再生成：

- `docs/adr/*`
- `.agents/skills/*`
- `.claude/skills -> .agents/skills`
- `.codex/skills -> .agents/skills`
- 更多规范文档

## 17. 输出清单

至少输出：

- 完整目录结构
- 根级配置文件
- `apps` 下前后端代码
- `packages` 下共享包代码
- `Makefile`
- `Dockerfile`
- `docker-compose.yml`
- `.editorconfig`
- `.gitignore`
- `.npmrc`
- `.nvmrc`
- `.node-version`
- `README.md`
- `README.zh-CN.md`
- 示例业务完整链路

## 18. 验收与验证

不要只生成文件后就宣称完成。必须尽量执行或至少显式设计以下验收项：

### 18.1 基础验收

至少验证以下命令链路：

```bash
corepack enable
pnpm install
make setup
make lint
make typecheck
make test
make generate-sdk
make build
make check
```

### 18.2 本地运行验收

至少保证以下链路可跑通：

- `make dev` 可以同时启动前后端
- 前端页面可以访问
- 后端 API 可以访问
- Swagger 文档可以访问
- 用户列表示例链路可用

### 18.3 Docker 验收

至少设计并说明以下验收方式：

```bash
make docker-build
make docker-run
```

### 18.4 失败处理

如果你无法在当前环境完成真实验证：

- 明确说明哪些步骤已验证
- 明确说明哪些步骤未验证
- 不要把未验证内容描述成“已完成且可运行”

## 19. 最终输出风格

- 直接落地，不要给多套方案
- 优先给完整、能运行、能维护的工程
- 解释关键设计决策，但不要让输出变成纯理论说明
- 示例代码必须围绕同一个业务场景
- 如果 `Should` / `Nice-to-have` 未完成，请直接标注延期项

请开始初始化整个工程。

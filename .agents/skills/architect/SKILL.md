---
name: architect
description: >
  Software architecture specialist for system design, scalability, and technical decisions.
  Use PROACTIVELY when planning new features, refactoring systems, or making architectural decisions.
  Specialized for a TypeScript Monorepo (React 19 + React Router v7 + NestJS 11 + Prisma) with DDD backend and FSD frontend.
---

# Architect

> **Skill Directory**: `.agents/skills/architect/`
> All bundled resource paths below (scripts, references, assets) are relative to this directory.

软件架构专家，基于 DDD（领域驱动设计）后端与 FSD（Feature-Sliced Design）前端原则，专注于可扩展、可维护的系统设计。

## When to Use

- 规划新功能架构（确定模块归属、层级职责）
- 重构大型系统（模块拆分/合并、职责重新划分）
- 做技术选型决策
- 评估技术方案权衡
- 识别性能/扩展瓶颈
- 审查模块边界是否合理

---

## Project Architecture Overview

### 技术栈

- **Frontend**: React 19 + React Router v7 (SPA Mode) + Vite + TanStack Query + Zustand + i18next + Zod
- **Backend**: NestJS 11 + Prisma + MySQL + Redis + nestjs-zod + Swagger/OpenAPI + Pino
- **Monorepo**: pnpm workspace + Turborepo + TypeScript project references
- **Shared Contracts**: `packages/shared`（跨前后端共享 schema、类型、常量）
- **Generated SDK**: `packages/sdk`（OpenAPI 导出 + Orval 生成）
- **Shared UI**: `packages/ui`（设计 tokens、可复用 primitives）
- **Runtime**: Node.js >= 24

---

## Backend 架构（DDD 分层）

### 核心分层模型

每个业务模块遵循统一的四层分层：

```
apps/server/src/modules/<module>/
├── domain/           # 业务概念与规则（framework-agnostic）
├── application/      # Use cases 与 Ports（依赖 domain 与抽象）
├── infrastructure/   # Prisma、Redis 适配器（实现 Ports）
└── interfaces/       # Controllers、DTOs、Presenters（调用 use cases）
```

### 层间依赖规则

```
interfaces → application → domain
infrastructure → application（实现 Ports）
```

- `domain/` → 只放业务概念与规则，**禁止依赖** NestJS、Prisma、nestjs-zod
- `application/` → Use cases 和 ports，依赖 domain 与抽象，不依赖具体基础设施
- `infrastructure/` → Prisma、Redis 等适配器，不能依赖 `interfaces/`
- `interfaces/` → Controllers、DTOs、Presenters，只能调用 use cases，不能直接下探到 `infrastructure/`

### 目录结构

```
apps/server/src/
├── modules/                # 业务模块（每个模块 = 一个限界上下文）
│   └── <module>/
│       ├── domain/         # 实体、值对象、业务规则
│       ├── application/    # Use cases、Service、Port 接口
│       ├── infrastructure/ # Prisma repository、Redis 实现
│       └── interfaces/     # NestJS Controller、DTO、Swagger
│
├── common/                 # 横切能力
│   ├── cache/              # CachePort 与 cache-keys.ts
│   ├── config/             # env.ts（Zod 校验环境变量）
│   └── ...
│
└── infrastructure/         # 顶层基础设施（DB Provider、Redis 等）
```

### 模块代码示例

```typescript
// domain/user.entity.ts — framework-agnostic
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly role: UserRole,
  ) {}

  canAccessSpace(spaceId: string): boolean {
    return this.role === UserRole.ADMIN; // 业务规则在此
  }
}

// application/user-repository.port.ts — 抽象接口
export abstract class UserRepositoryPort {
  abstract findById(id: string): Promise<User | null>;
  abstract save(user: User): Promise<void>;
}

// infrastructure/prisma-user.repository.ts — 具体实现
@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? new User(row.id, row.email, row.role as UserRole) : null;
  }
}

// interfaces/users.controller.ts — 接口适配
@Controller("users")
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const user = await this.userService.findById(id);
    return { success: true, data: UserPresenter.toResponse(user) };
  }
}
```

### 关键硬约束

- 禁止把 **Prisma model** 当作 domain model 使用
- 请求校验统一使用 **Zod**（nestjs-zod），不要混入其他 validation 风格
- 成功响应统一使用 `{ success, data, meta }` envelope
- 所有缓存访问经过 `CachePort`，key 统一在 `cache-keys.ts` 中定义
- 环境变量在 `apps/server/src/common/config/env.ts` 中 Zod 校验并 fail fast

---

## Frontend 架构（FSD）

### FSD 分层模型

```
apps/web/src/
├── app/        # Providers、routing、bootstrapping、顶层布局
├── pages/      # Route-level screen assembly（不承载复杂业务规则）
├── widgets/    # 页面级组合（可选层）
├── features/   # 用户触发的业务能力与 mutation 流程
├── entities/   # Server data access、query hooks、view-facing models
├── shared/     # 通用 UI、配置、基础设施辅助（无业务语义）
├── locales/    # i18n 资源（en.ts / zh.ts）
└── styles/     # 全局样式
```

### 层间依赖方向

```
app → pages → widgets → features → entities → shared
```

上层可依赖下层，禁止反向依赖。

### 各层职责

| 层          | 职责                                   | 禁止                              |
| ----------- | -------------------------------------- | --------------------------------- |
| `app/`      | Providers 装配、路由树、全局布局       | 业务逻辑                          |
| `pages/`    | 路由参数解析、页面骨架 assembly        | 复杂业务规则、直接调 API          |
| `widgets/`  | 跨 feature 的页面级组合                | 直接耦合传输细节                  |
| `features/` | Mutation 流程、表单、用户交互          | Server state（用 TanStack Query） |
| `entities/` | Query hooks、API adapters、view models | 本地 UI 状态                      |
| `shared/`   | UI primitives、工具函数、配置          | 任何业务语义                      |

### State 分工

- **Server state** → TanStack Query（`entities/` 层的 query hooks）
- **本地 UI 状态** → Zustand（theme preference 等，不放 server 数据）

### 代码示例

```typescript
// entities/spaces/api-hooks.ts — server state
export function useSpaces() {
  return useQuery({
    queryKey: ['spaces'],
    queryFn: () => spacesApi.list(),
  });
}

// features/create-space/ui/CreateSpaceForm.tsx — mutation
export function CreateSpaceForm() {
  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateSpaceDto) => spacesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['spaces'] }),
  });
  // ...
}

// pages/spaces/SpacesPage.tsx — assembly only
export function SpacesPage() {
  return (
    <div className="flex flex-col h-dvh min-h-0">
      <SpacesHeader />
      <SpacesList />
    </div>
  );
}
```

---

## Monorepo 边界

```
apps/web     → 只能依赖 @<scope>/sdk、@<scope>/shared、@<scope>/ui
apps/server  → 只能依赖 @<scope>/shared（不能依赖 sdk 或 ui）
packages/shared → 跨端共享 contracts、schemas、constants
packages/sdk    → 自动生成的 OpenAPI client + 手写 hooks（分离）
packages/ui     → 共享 tokens、样式入口、展示型 primitives
```

- 禁止 deep import，只能通过公开 `exports` 消费
- 禁止手改 `packages/sdk` 自动生成代码
- `packages/shared` 不是杂物间，只放跨端共享内容

---

## 共享契约工作流

1. 修改 `packages/shared`（DTO shape、schema）
2. 调整 `apps/server` 对应 controller / use case / OpenAPI
3. 运行 `pnpm generate-sdk` 同步 `packages/sdk`
4. `apps/web` 消费生成后的 SDK

---

## Architecture Review Process

### 1. 边界与分层检查

```bash
# 检查后端模块结构
ls apps/server/src/modules/
tree apps/server/src/modules/<module> -L 2

# 检查前端 FSD 结构
ls apps/web/src/{app,pages,features,entities,shared}

# 检测边界穿透（绕过 packages exports）
rg "from.*apps/server/src" apps/web/src --type ts

# 检测 Prisma 类型泄漏到前端
rg "PrismaClient|@prisma/client" apps/web/src --type ts
```

### 2. 新功能归属决策

```
新功能需求 → 归属哪一层？
  │
  ├── 业务规则 / 实体 → backend domain/
  ├── Use case 编排  → backend application/
  ├── 数据库操作      → backend infrastructure/ (Prisma repository)
  ├── HTTP 接口       → backend interfaces/ (Controller + DTO)
  │
  ├── 用户触发的操作  → frontend features/
  ├── 数据查询展示    → frontend entities/ (query hooks)
  ├── 页面骨架        → frontend pages/
  └── 跨页面组合      → frontend widgets/
```

### 3. 权衡分析模板

```markdown
## Decision: [决策标题]

### Context

[业务背景、当前约束]

### Options

- **方案 A**: [描述] — 优：... | 劣：...
- **方案 B**: [描述] — 优：... | 劣：...

### Decision

[最终选择及理由]

### Consequences

- [对边界的影响]
- [对 SDK/契约的影响]
- [对测试的影响]
```

---

## Red Flags（架构反模式）

| 反模式                                 | 描述                                           | 检测方式                              |
| -------------------------------------- | ---------------------------------------------- | ------------------------------------- |
| **Prisma model 当 domain model**       | 直接把 Prisma 返回的 row 作为业务对象流转      | 检查 domain/ 是否 import Prisma       |
| **interfaces 直接访问 infrastructure** | Controller 跳过 use case 直接调 repository     | 检查 interfaces/ 的 import            |
| **Server state 进 Zustand**            | 把 API 数据放进 Zustand store                  | 检查 Zustand store 是否存放服务端数据 |
| **前端依赖 server 内部类型**           | web 直接 import server 的 class 或 Prisma 类型 | 检查 apps/web import 路径             |
| **手改自动生成 SDK**                   | 修改 packages/sdk 中生成的文件                 | git diff packages/sdk/src/generated   |
| **环境变量散落读取**                   | 各处直接 process.env.XXX                       | `rg "process\.env\." apps/server/src` |
| **跨层业务逻辑**                       | 业务规则写在 Controller 或 repository 里       | code review domain 层                 |

---

## New Module Checklist

### 后端新模块

- [ ] 在 `modules/` 下创建 `{domain,application,infrastructure,interfaces}` 四层目录
- [ ] `domain/` 无 NestJS/Prisma 依赖
- [ ] `application/` 定义 Port 接口，不依赖具体 infrastructure
- [ ] `infrastructure/` 实现 Port，注入 PrismaService / CachePort
- [ ] `interfaces/` Controller 使用 nestjs-zod DTO，返回 `{ success, data }` envelope
- [ ] 在模块的 `*.module.ts` 中正确注册 DI
- [ ] 需要缓存时经过 `CachePort`，key 添加到 `cache-keys.ts`
- [ ] 新增契约同步到 `packages/shared` 并重新生成 SDK

### 前端新功能

- [ ] 确认功能属于哪一 FSD 层
- [ ] Server state 用 TanStack Query，本地 UI 状态用 Zustand（或 useState）
- [ ] 通过 `@<scope>/sdk` 调用 API，不手写重复的 API client
- [ ] 面向用户的文案全部走 i18n（`locales/en.ts` 和 `locales/zh.ts` 同步更新）
- [ ] 组件使用语义化 CSS variables（不硬编码颜色/圆角/间距）
- [ ] 表单 label、focus、loading/empty/error 状态可访问

---

## Quick Analysis Commands

```bash
# 查看所有业务模块
ls apps/server/src/modules/

# 检查某模块分层结构
tree apps/server/src/modules/<name> -L 2

# 检查 domain 层是否有框架依赖
rg "@nestjs|PrismaClient|@prisma" apps/server/src/modules/<name>/domain --type ts

# 检查 interfaces 是否直接下探 infrastructure
rg "Repository|PrismaService" apps/server/src/modules/<name>/interfaces --type ts

# 检查前端是否直接引用 server 内部
rg "from.*apps/server" apps/web/src --type ts

# 检查环境变量散落读取
rg "process\.env\." apps/server/src --type ts | grep -v "env\.ts"

# 检查 SDK 是否有手改
git diff packages/sdk/src/generated

# 检查 i18n 对齐（两份资源 key 数量；locale 文件是 .ts，不能 require，用 tsx）
pnpm --silent --filter @<scope>/web exec tsx -e "import('./src/locales/en.ts').then(async e => { const z = await import('./src/locales/zh.ts'); console.log('en', Object.keys(e.en).length, 'zh', Object.keys(z.zh).length); })"
```

---

**Remember**: 好的架构让每一层可以独立演进。后端 domain 无框架依赖、前端 server state 不进 Zustand、边界通过 packages/shared 和 SDK 收口 — 这是长期可维护的基础。

---
name: build-fixer
description: >
  Build and TypeScript error resolution specialist. Use when build fails, type errors occur, or compilation issues need fixing.
  Fixes build/type errors with minimal diffs, no architectural changes. Focuses on getting the build green quickly.
  Includes incremental fix workflow and common error patterns for React 19 + NestJS + Prisma stack.
---

# Build Fixer

> **Skill Directory**: `.agents/skills/build-fixer/`
> All bundled resource paths below (scripts, references, assets) are relative to this directory.

专注于修复 TypeScript、构建和编译错误的技能，目标是以最小改动让构建通过。

## When to Use

- `make build` 失败
- `make typecheck` 报错
- 类型错误阻塞开发
- 模块导入/解析错误
- 配置文件错误

## Core Principles

1. **最小改动** - 只修复错误，不重构
2. **逐个修复** - 一次修复一个错误，验证后继续
3. **不改架构** - 只修复类型/编译问题
4. **验证修复** - 每次修复后重新编译确认

## Workflow

### 1. 收集所有错误

```bash
# 默认入口：仓库根整体类型检查（基于 TypeScript project references）
make typecheck 2>&1 | head -100

# 只看某个 workspace
pnpm --filter @<scope>/web typecheck
pnpm --filter @<scope>/server typecheck
pnpm --filter @<scope>/shared typecheck
pnpm --filter @<scope>/ui typecheck
```

> 本仓库使用 TypeScript project references，单独 `npx tsc --noEmit <file>` 往往拿不到正确的 `rootDir`/alias，请优先走 `pnpm --filter` 或 `make typecheck`。

### 2. 分类错误

按类型分组：

- 类型推断失败
- 缺少类型定义
- 导入/导出错误
- 配置错误
- 依赖问题

### 3. 逐个修复

对于每个错误：

1. **理解错误**
   - 仔细阅读错误信息
   - 查看文件和行号
   - 理解预期类型 vs 实际类型

2. **找到最小修复方案**
   - 添加缺失的类型注解
   - 修复导入语句
   - 添加 null 检查
   - 类型断言（最后手段）

3. **验证修复**

   ```bash
   make typecheck
   ```

4. **重复直到构建通过**

## 常见错误模式与修复

### Pattern 1: 类型推断失败

```typescript
// ❌ ERROR: Parameter 'x' implicitly has an 'any' type
function add(x, y) {
  return x + y;
}

// ✅ FIX: 添加类型注解
function add(x: number, y: number): number {
  return x + y;
}
```

### Pattern 2: Null/Undefined 错误

```typescript
// ❌ ERROR: Object is possibly 'undefined'
const name = user.name.toUpperCase();

// ✅ FIX: 可选链
const name = user?.name?.toUpperCase();

// ✅ OR: Null 检查
const name = user && user.name ? user.name.toUpperCase() : "";
```

### Pattern 3: 缺少属性

```typescript
// ❌ ERROR: Property 'age' does not exist on type 'User'
interface User {
  name: string;
}
const user: User = { name: "John", age: 30 };

// ✅ FIX: 添加属性到接口
interface User {
  name: string;
  age?: number;
}
```

### Pattern 4: 导入错误

本仓库不使用 `@/*` 之类的 TS path alias；跨 package 靠 workspace 包名（`@<scope>/*`），同 package 内用相对路径。

```typescript
// ❌ ERROR: Cannot find module '@<scope>/shared'
import { CreateSpaceDto } from "@<scope>/shared";

// ✅ FIX 1: 确认 package.json 已声明依赖
// apps/web/package.json
// {
//   "dependencies": { "@<scope>/shared": "workspace:*" }
// }
// 然后在仓库根执行
pnpm install;

// ✅ FIX 2: 同 package 内的相对路径
import { formatDate } from "../lib/utils";

// ❌ 不要尝试新增 "@/*" paths — 仓库不遵循这个约定，且可能破坏
// TypeScript project references 的解析。
```

### Pattern 5: 类型不匹配

```typescript
// ❌ ERROR: Type 'string' is not assignable to type 'number'
const age: number = "30";

// ✅ FIX: 转换类型
const age: number = parseInt("30", 10);

// ✅ OR: 改变类型
const age: string = "30";
```

### Pattern 6: React Hook 错误

```typescript
// ❌ ERROR: React Hook "useState" cannot be called conditionally
function MyComponent() {
  if (condition) {
    const [state, setState] = useState(0); // ERROR!
  }
}

// ✅ FIX: 移到顶层
function MyComponent() {
  const [state, setState] = useState(0);

  if (!condition) {
    return null;
  }
  // 在这里使用 state
}
```

### Pattern 7: Prisma 类型

```typescript
// ❌ ERROR: Type 'any' not assignable
const users = await prisma.user.findMany();

// ✅ FIX: Prisma 自动推断类型，检查 schema 定义
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
// users 类型自动推断为 Prisma.User[]（来自 @prisma/client）
const users = await this.prisma.user.findMany();
```

### Pattern 8: NestJS Controller 类型

```typescript
// ❌ ERROR: Parameter 'req' implicitly has 'any' type
async handler(req) { ... }

// ✅ FIX: 使用 NestJS 装饰器和类型
import { Controller, Get, Param, Body } from '@nestjs/common'

@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string) {
    // id 自动推断为 string
  }
}
```

## 项目特定修复

### React 19 类型变更

```typescript
// ❌ React 19 不再需要 FC
import { FC } from 'react'
const Component: FC<Props> = ({ children }) => {
  return <div>{children}</div>
}

// ✅ React 19 直接使用
interface Props {
  children: React.ReactNode
}
const Component = ({ children }: Props) => {
  return <div>{children}</div>
}
```

### 模块解析（Monorepo）

```typescript
// ❌ ERROR: Cannot find module '@<scope>/shared'
import { CreateSpaceDto } from '@<scope>/shared'

// ✅ FIX: 检查 package.json 依赖
// apps/web/package.json
{
  "dependencies": {
    "@<scope>/shared": "workspace:*"
  }
}

// 并运行
pnpm install
```

## 最小改动原则

### ✅ 可以做：

- 添加缺失的类型注解
- 添加 null 检查
- 修复导入/导出
- 添加缺失的依赖
- 更新类型定义
- 修复配置文件

### ❌ 不要做：

- 重构无关代码
- 改变架构
- 重命名变量/函数（除非导致错误）
- 添加新功能
- 改变逻辑流程
- 优化性能
- 改进代码风格

## 修复报告格式

````markdown
# Build Error Resolution Report

**Date:** YYYY-MM-DD
**Initial Errors:** X
**Errors Fixed:** Y
**Build Status:** ✅ PASSING / ❌ FAILING

## Errors Fixed

### 1. [错误类别]

**Location:** `apps/web/src/components/Card.tsx:45`
**Error:** Parameter 'data' implicitly has an 'any' type
**Fix:**

```diff
- function processData(data) {
+ function processData(data: DataType) {
```
````

**Lines Changed:** 1

---

## Verification

- ✅ `make typecheck` passes
- ✅ `make build` succeeds
- ✅ No new errors introduced

````

## 快速命令参考

```bash
# 类型检查
make typecheck

# 构建
make build

# 清理缓存重建
rm -rf apps/web/node_modules/.cache
rm -rf apps/server/dist
make build

# 单个 workspace 聚焦 typecheck（不要尝试单文件 tsc，本仓库用 project references）
pnpm --filter @<scope>/web typecheck
pnpm --filter @<scope>/server typecheck

# 安装缺失依赖
pnpm install

# 更新 TypeScript
pnpm add -D typescript@latest --filter @<scope>/web
````

## 成功标准

修复完成后：

- ✅ `make typecheck` 退出码 0
- ✅ `make build` 成功完成
- ✅ 没有引入新错误
- ✅ 改动行数最小化（< 受影响文件的 5%）

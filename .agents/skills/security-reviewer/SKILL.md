---
name: security-reviewer
description: >
  Security vulnerability detection and remediation specialist. Use when handling user input, authentication,
  API endpoints, or sensitive data. Flags secrets, injection, XSS, SSRF, path traversal, command injection,
  and OWASP Top 10 vulnerabilities. Provides comprehensive security checklist, automated scanning scripts,
  and secure coding patterns for NestJS + Prisma + React stack.
---

# Security Reviewer

> **Skill Directory**: `.agents/skills/security-reviewer/`
> All bundled resource paths below (scripts, references, assets) are relative to this directory.

安全漏洞检测与修复专家，专注于识别和修复 Web 应用安全问题。

## When to Use

- 实现认证/授权功能
- 处理用户输入或文件上传
- 创建新的 API 端点
- 处理密钥或凭证
- 存储或传输敏感数据
- 集成第三方 API
- 文件读写操作
- 构建 URL 或处理重定向

---

## Quick Start: 一键扫描

```bash
# 推荐先跑仓库现有校验，再补充安全专项扫描
make check

# 再手动执行安全相关检查
pnpm audit                    # 依赖漏洞
rg "api[_-]?key|password|secret|token" --type ts -i apps/  # 硬编码密钥
```

---

## Security Review Workflow

### 1. 自动化扫描脚本

运行以下命令进行全面扫描（详见 [Quick Security Commands](#quick-security-commands) 完整列表）：

```bash
# 依赖审计
pnpm audit

# 硬编码密钥检测
rg "api[_-]?key|password|secret|token|credential|bearer" --type ts -i apps/ -g '!*.test.ts' -g '!*.spec.ts'

# 危险函数检测
rg "eval\(|new Function\(|child_process|execSync|spawnSync" --type ts apps/

# console.log 检测（可能泄露敏感信息）
rg "console\.(log|debug|info)" apps/server/src --type ts -g '!*.test.ts'

# dangerouslySetInnerHTML 检测
rg "dangerouslySetInnerHTML" apps/web/src --type tsx --type ts
```

### 2. 高风险区域检查

| 路径                                        | 风险类型            | 重点检查                       |
| ------------------------------------------- | ------------------- | ------------------------------ |
| `apps/server/src/modules/*/interfaces/`     | 认证绕过 / 注入攻击 | Guard 配置、DTO 校验、参数处理 |
| `apps/server/src/common/`                   | 授权绕过            | Guard 顺序、权限检查           |
| `apps/server/src/modules/*/infrastructure/` | SQL 注入            | Prisma 查询、$queryRaw 使用    |
| `apps/server/src/modules/*/application/`    | 业务逻辑            | 权限校验、数据泄露             |
| `apps/web/src/pages/`                       | XSS                 | 用户内容渲染                   |

### 3. OWASP Top 10 检查

对每个类别进行检查...

---

## Security Checklist

### 1. 密钥管理 (CRITICAL)

#### ❌ 禁止

```typescript
const apiKey = "sk-proj-xxxxx"; // 硬编码密钥
const dbPassword = "password123"; // 源码中的密码
```

#### ✅ 正确做法

```typescript
const apiKey = process.env.OPENAI_API_KEY;
const dbUrl = process.env.DATABASE_URL;

// 验证密钥存在
if (!apiKey) {
  throw new Error("OPENAI_API_KEY not configured");
}
```

#### 检查项

- [ ] 无硬编码 API keys, tokens, 或 passwords
- [ ] 所有密钥在环境变量中
- [ ] `.env` 和 `.env.local` 在 .gitignore
- [ ] 生产密钥在部署平台配置

---

### 2. 输入验证 (CRITICAL)

#### 使用 Zod 验证

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150),
});

export async function createUser(input: unknown) {
  const validated = CreateUserSchema.parse(input);
  return await db.insert(users).values(validated);
}
```

#### 文件上传验证

```typescript
function validateFileUpload(file: File) {
  // 大小检查 (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File too large (max 5MB)");
  }

  // 类型检查
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type");
  }

  return true;
}
```

#### 检查项

- [ ] 所有用户输入使用 schema 验证
- [ ] 文件上传有大小、类型限制
- [ ] 白名单验证（而非黑名单）
- [ ] 错误信息不泄露敏感信息

---

### 3. SQL 注入防护 (CRITICAL)

#### ❌ 禁止拼接 SQL

```typescript
// 危险 - SQL 注入漏洞
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
await db.execute(query);
```

#### ✅ 使用 Prisma 参数化查询

```typescript
// 安全 - Prisma 自动参数化
const result = await prisma.user.findMany({
  where: { email: userEmail },
});

// 安全 - Prisma 原生查询时使用模板标签
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userEmail}
`;
```

#### 检查项

- [ ] 所有数据库查询使用 Prisma ORM
- [ ] 无字符串拼接 SQL
- [ ] 原生查询使用 `$queryRaw` 模板标签而非字符串拼接

---

### 4. 认证与授权 (CRITICAL)

> **项目约定**: 认证由 `apps/server/src/modules/auth` 收口，`AuthGuard` 在 `AppModule` 注册为 `APP_GUARD`，**默认阻断所有请求**。Session 通过 HTTP-only cookie `AUTH_SESSION_COOKIE_NAME` 传递，`Authorization: Bearer <token>` 为程序化调用的兼容通道。放行必须显式 `@Public()`，并与 `packages/shared/src/contracts/auth-access-matrix.ts` 的公开端点矩阵保持一致，运行时有 drift 告警。Session 生命周期包含短寿命 access cookie + 长寿命 refresh token rotation（reuse detection 全链路吊销），并通过 `login` throttler 做登录失败节流（见第 9 节）。审计事件走 Pino child logger 的 `audit.auth.*` 命名空间。

#### 路由保护（NestJS）

```typescript
// apps/server/src/modules/spaces/interfaces/spaces.controller.ts
import { Public, Roles } from "../../auth/interfaces/auth.guard";

@Controller("spaces")
export class SpacesController {
  // ✅ 默认所有方法都受 AuthGuard 保护，需要登录

  @Get(":id")
  async findOne(@Param("id") id: string, @SessionUser() user: AuthSessionUser) {
    return { success: true, data: await this.service.findOne(id, user.id) };
  }

  // ✅ 需要管理员角色（SUPER_ADMIN 自动放行）
  @Roles("ADMIN")
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return { success: true, data: await this.service.remove(id) };
  }

  // ⚠️ 显式公开端点（如登录、健康检查）— 必须同步更新
  // packages/shared/src/contracts/auth-access-matrix.ts，否则会触发 drift 告警
  @Public()
  @Post("auth/login")
  async login(@Body() dto: LoginDto) { ... }
}
```

#### 资源访问控制（NestJS + Prisma）

```typescript
// application/spaces.service.ts — 业务层判权
async getSpace(spaceId: string, userId: string) {
  const space = await this.repo.findById(spaceId);
  if (!space) throw new NotFoundException("Space not found");

  // 不只依赖 AuthGuard 的角色；还要校验资源所有权
  if (space.ownerId !== userId && !this.isSpaceAdmin(space, userId)) {
    throw new ForbiddenException("Access denied");
  }

  return space;
}
```

#### 检查项

- [ ] 新增 Controller 没有无意识绕过 `AuthGuard`（不要自行注册 guard 次序覆盖 `APP_GUARD`）
- [ ] `@Public()` 端点同步更新 `packages/shared/src/contracts/auth-access-matrix.ts`，避免矩阵 drift 告警
- [ ] 资源所有权在 `application` 层显式校验（`AuthGuard` 只负责身份与角色，不懂业务资源归属）
- [ ] 登录/登出相关操作使用 HTTP-only + `SameSite=Lax/Strict` cookie，且只在 HTTPS 下下发 `Secure`
- [ ] 登录、刷新、注销、session 吊销等关键事件通过 `audit.auth.*` 打稳定结构化日志，字段不含 token 原文
- [ ] Refresh token 改动（轮换、reuse detection、吊销链路）必须附带单测覆盖 reuse 场景

---

### 5. XSS 防护 (HIGH)

#### 清理 HTML

```typescript
import DOMPurify from 'isomorphic-dompurify'

// 清理用户提供的 HTML
function renderUserContent(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
    ALLOWED_ATTR: []
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

#### React 默认防护

```tsx
// React 默认转义，安全
<div>{userInput}</div>

// ❌ 危险 - 需要清理
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

#### 检查项

- [ ] 用户内容已清理
- [ ] 避免使用 dangerouslySetInnerHTML
- [ ] 使用 React 的内置 XSS 防护

---

### 6. SSRF 防护 (HIGH)

> **项目约定**: 所有接触用户可控 URL 的出站 HTTP 请求必须走 `SafeHttpService`（`apps/server/src/infrastructure/http/safe-http.service.ts`）。它负责协议白名单、主机白名单（静态 + 运行时注册）、DNS 解析后 IP 校验（拒绝 RFC 1918 / loopback / link-local / IPv6 私网段）、防 DNS rebinding（整次请求复用首次解析结果）、`redirect: "manual"` 并对每跳重新校验、超时与响应大小上限、结构化指标与日志。内部代码常量 / 环境变量驱动的 URL（ACP、sandbox 等）允许直接 `fetch()`，但必须在文件头部注释 "internal-only, SafeHttpService-bypass"，否则视为违规。

#### 使用方式

```typescript
// application/webhook-delivery.service.ts
@Injectable()
export class WebhookDeliveryService {
  constructor(private readonly safeHttp: SafeHttpService) {}

  async deliver(userConfiguredUrl: string, payload: unknown) {
    // ✅ SafeHttpService 内部已做协议/主机/IP/重定向/超时校验
    return this.safeHttp.fetch(userConfiguredUrl, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
      timeoutMs: 5_000, // 覆盖默认 10s
      maxBytes: 1_000_000, // 覆盖默认 10MB
    });
  }
}
```

#### 检查命令

```bash
# 业务模块里不允许出现原生 fetch（infrastructure/ 例外，需文件头部注释标注）
rg -n "fetch\(|axios\(|got\(|node:https" apps/server/src/modules --type ts

# 检查 infrastructure 层里的 fetch 是否都有 "internal-only" 标注
rg -nB2 "fetch\(" apps/server/src/infrastructure --type ts | rg -B1 "internal-only" -v

# 主机白名单配置检查
rg -n "OUTBOUND_ALLOWED_HOSTS" apps/server/src/common/config/env.ts
```

#### 检查项

- [ ] 任何业务模块新增外部请求走 `SafeHttpService`，不要自行 `fetch()`
- [ ] 新增的"内部可信" URL 调用点必须在文件顶部注释声明，并在 code review 中显式确认
- [ ] 用户可配置 URL 入库前做一次 `SafeHttpService.validateUrl()` 预检，避免把已知非法 URL 存入数据库
- [ ] 新增 allowed host 必须先在 `OUTBOUND_ALLOWED_HOSTS` 里声明，禁止运行时硬编码放行

---

### 7. 路径遍历防护 (HIGH)

#### ❌ 禁止直接拼接路径

```typescript
// 危险 - 路径遍历漏洞
const filePath = `./uploads/${userFilename}`;
const content = fs.readFileSync(filePath);
```

#### ✅ 验证并规范化路径

```typescript
import path from "node:path";

function safeReadFile(userFilename: string, baseDir: string): Buffer {
  // 规范化路径
  const safeName = path.basename(userFilename); // 只取文件名
  const fullPath = path.resolve(baseDir, safeName);

  // 确保在允许目录内
  if (!fullPath.startsWith(path.resolve(baseDir))) {
    throw new Error("Invalid file path");
  }

  return fs.readFileSync(fullPath);
}

// 更严格的版本：验证完整路径
function validateFilePath(userPath: string, allowedDir: string): string {
  const resolved = path.resolve(allowedDir, userPath);
  const normalized = path.normalize(resolved);

  // 检查是否包含 .. 或在允许目录外
  if (
    userPath.includes("..") ||
    !normalized.startsWith(path.resolve(allowedDir))
  ) {
    throw new Error("Path traversal attempt detected");
  }

  return normalized;
}
```

#### 检查项

- [ ] 使用 `path.basename()` 提取文件名
- [ ] 使用 `path.resolve()` 规范化路径
- [ ] 验证最终路径在允许目录内
- [ ] 禁止路径包含 `..`

---

### 8. 命令注入防护 (HIGH)

> **本项目状态**: 未使用 `child_process`，无命令注入风险。如需添加系统命令执行，必须遵循以下规范。

#### ❌ 禁止拼接命令

```typescript
import { exec } from "child_process";

// 危险 - 命令注入漏洞
exec(`convert ${userFilename} output.png`);
```

#### ✅ 使用参数数组

```typescript
import { execFile, spawn } from "child_process";

// 安全 - 使用 execFile + 参数数组
execFile("convert", [userFilename, "output.png"], (error, stdout) => {
  // ...
});

// 安全 - 使用 spawn + 参数数组
const proc = spawn("convert", [userFilename, "output.png"]);
```

#### 检查项

- [ ] 禁止使用 `exec()` / `execSync()`
- [ ] 使用 `execFile()` 或 `spawn()` + 参数数组
- [ ] 对命令参数进行白名单验证
- [ ] 限制可执行的命令列表

---

### 9. 速率限制 (HIGH)

> **项目约定**: 限流通过 `@nestjs/throttler` + `CacheThrottlerStorage` 落地；`CacheThrottlerStorage` 内部委托给 `CachePort`（Redis 共享计数器），多实例部署下计数一致。`APP_GUARD` 注册了 `ThrottlerGuard`，默认对非 GET `/api/*` 请求应用 `short`（10 次/60s/IP）配额；登录、验证码、密码重置等敏感端点通过 `@Throttle({ login: { ttl: 60_000, limit: 5 } })` 挂接独立的 `login` 配额。Redis 不可用时 Guard **fail-closed**，返回 503 `rate_limit_unavailable`；超限返回 429 `rate_limit_exceeded`，两者都带 `Retry-After` 头。

#### 声明式使用

```typescript
// apps/server/src/modules/auth/interfaces/auth.controller.ts
import { Throttle, SkipThrottle } from "@nestjs/throttler";

@Controller("auth")
export class AuthController {
  // 覆盖默认 short，使用更严格的 login 配额
  @Throttle({ login: { ttl: 60_000, limit: 5 } })
  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto) { ... }

  // 某些只读、内部探测类端点可显式跳过限流
  @SkipThrottle()
  @Public()
  @Get("health/ping")
  async ping() { return { success: true }; }
}
```

新增 throttler 命名空间（如按租户或企业维度）时在 `ThrottlerModule.forRootAsync` 的 `throttlers` 列表里加配置，并通过 `@Throttle({ <name>: { ... } })` 挂接端点。

#### 检查命令

```bash
# 不要绕开 @nestjs/throttler 手写 Redis 计数器
rg -n "cacheKeys\.rateLimit\.|cache.*increment" apps/server/src/modules --type ts

# 敏感端点是否都挂了独立 throttler
rg -nB1 "@Post\(\"(login|register|reset-password|request-otp|mfa)" apps/server/src/modules --type ts
```

#### 检查项

- [ ] 新增敏感写端点（登录 / 注册 / 密码重置 / OTP / 邀请 / 付款）挂接 `login` 或更严格的命名空间
- [ ] 需要基于 session user 的限流用 `@Throttle` + 自定义 `Tracker`（例如 `throttler.getTracker = (req) => req.user?.id ?? req.ip`）而不是按 IP
- [ ] 拒绝响应保留项目统一 envelope `{ success: false, error: { code, message }, meta }` 和 `Retry-After` 头
- [ ] `CacheThrottlerStorage` 在单元测试里验证过 Redis 异常时 Guard 拒绝请求（fail-closed）

---

### 10. 安全 Headers (HIGH)

> **项目约定**: 响应安全头由 `helmet` 统一下发，入口在 `apps/server/src/app.factory.ts`。CSP directives 仍由 `createContentSecurityPolicy(environment)` 生成，Swagger 路径通过独立的 `helmet({ contentSecurityPolicy: { directives: swaggerDirectives } })` 覆盖。HSTS 仅在 `NODE_ENV === "production"` 且 `TRUST_PROXY` 指向可信代理链时启用，避免在本地 HTTP 调试环境把 localhost 锁死为 HTTPS。

#### 扩展 / 调整响应头

- 调整 CSP：改 `createContentSecurityPolicy` 的 directives 输出（或 Swagger 专用的 directives），不要在中间件链路外手写 `setHeader`。
- 新增外部资源（CDN、字体、图片域名）：先更新 CSP directives，再更新资源引用。
- 不要为单个 Controller 引入局部 `app.use(helmet({...}))` —— 全局一份 + Swagger 独立一份是约定，更多覆盖会让 header 诊断变复杂。

#### 关键 Headers 约定

| Header                         | 状态                                               | 说明                                 |
| ------------------------------ | -------------------------------------------------- | ------------------------------------ |
| `Content-Security-Policy`      | ✅ helmet（主应用 / Swagger 分离）                 | 新增外部资源同步更新 directives      |
| `X-Content-Type-Options`       | ✅ `nosniff`                                       |                                      |
| `X-Frame-Options`              | ✅ `DENY`                                          | 禁止 iframe 嵌入                     |
| `Referrer-Policy`              | ✅ `strict-origin-when-cross-origin`               |                                      |
| `Strict-Transport-Security`    | ✅ 生产启用；`max-age=31536000; includeSubDomains` | 非生产环境**不**下发                 |
| `Cross-Origin-Opener-Policy`   | ✅ `same-origin`                                   |                                      |
| `Cross-Origin-Resource-Policy` | ✅ `same-site`                                     | 跨站部署时评估 resource 是否需要放宽 |
| `X-Powered-By`                 | ✅ 已删除                                          | helmet 默认关闭                      |

#### 检查项

- [ ] 新增外部资源同步更新 `createContentSecurityPolicy` 的 directives
- [ ] Swagger CSP 与主应用 CSP 分离，不会互相覆盖
- [ ] 非生产环境不下发 HSTS；生产环境通过响应头快照回归验证
- [ ] 不要在 Controller 或其它中间件里手写 `setHeader` 覆盖 helmet 全局策略

---

### 11. 敏感数据暴露 (MEDIUM)

#### 日志

```typescript
// ❌ 错误：日志记录敏感数据
console.log("User login:", { email, password });

// ✅ 正确：脱敏
console.log("User login:", { email, userId });
```

#### 错误信息

```typescript
// ❌ 错误：暴露内部细节
catch (error) {
  return res.status(500).json({
    error: error.message,
    stack: error.stack
  })
}

// ✅ 正确：通用错误信息
catch (error) {
  console.error('Internal error:', error)
  return res.status(500).json({
    error: 'An error occurred. Please try again.'
  })
}
```

#### 检查项

- [ ] 日志不包含密码、token、密钥
- [ ] 用户看到的错误信息通用化
- [ ] 详细错误只在服务器日志

---

### 12. ReDoS 防护 (MEDIUM)

#### ❌ 危险的正则表达式

```typescript
// 危险 - 指数级回溯
const emailRegex = /^([a-zA-Z0-9]+)*@example\.com$/
const input = 'aaaaaaaaaaaaaaaaaaaaaaaaaaa!'
emailRegex.test(input) // 可能卡住

// 危险模式：嵌套量词
/^(a+)+$/
/^(a|a?)+$/
/(.*a){10}/
```

#### ✅ 安全的正则表达式

```typescript
// 使用非回溯量词或限制长度
const safeEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 先限制输入长度
function validateEmail(email: string): boolean {
  if (email.length > 254) return false; // RFC 5321
  return safeEmailRegex.test(email);
}

// 使用 safe-regex 库检测
import safeRegex from "safe-regex";
if (!safeRegex(userProvidedPattern)) {
  throw new Error("Unsafe regex pattern");
}
```

#### 检查项

- [ ] 避免嵌套量词 `(a+)+`
- [ ] 先验证输入长度再匹配
- [ ] 用户提供的正则需用 safe-regex 检测
- [ ] 设置正则匹配超时（如可能）

---

### 13. 依赖安全 (MEDIUM)

```bash
# 检查漏洞
pnpm audit

# 修复可自动修复的问题
pnpm audit --fix

# 更新依赖
pnpm update

# 检查过时包
pnpm outdated
```

#### 检查项

- [ ] 依赖保持更新
- [ ] 无已知漏洞（pnpm audit clean）
- [ ] lock 文件已提交
- [ ] 定期安全更新

---

### 14. CSRF 防护 (MEDIUM)

> **项目约定**: 主认证通道是 HTTP-only cookie（`AUTH_SESSION_COOKIE_NAME`），存在 CSRF 面。默认防线依赖 cookie 的 `SameSite=Lax`（或更严格）+ CORS origin 白名单 + 非 GET 端点的 `login` / `short` 限流。未引入显式 CSRF token 机制，因为当前架构下收益不大于成本；如果未来放宽 `SameSite` 或引入跨子域 cookie，再评估引入 double-submit token 或 same-site origin header 校验。

#### 当前默认防线

- Cookie 的 `SameSite` 属性（建议 `Lax`/`Strict`）阻断多数跨站自动带 cookie 场景。
- CORS / origin 校验拒绝非法前端站点的请求。
- 对非 GET 的写请求已有 IP 维度 Redis 限流（上文第 9 点）。
- 若客户端主动使用 `Authorization: Bearer <token>`（如 SDK 非浏览器场景），这一路径不受 CSRF 影响。

#### 何时需要显式 CSRF Token

- 引入第三方 iframe 或跨子域共享 cookie
- 将 `SameSite` 放宽到 `None`
- 出现需要表单 POST 到同源接口的页面（非 XHR/fetch）
- 业务对"无感 CSRF"风险容忍度进一步降低时

#### 检查项

- [ ] 会话 cookie 下发 `HttpOnly`、`Secure`（HTTPS 环境）、`SameSite=Lax` 或更严格
- [ ] CORS `origin` 白名单收敛到已知前端域，不使用通配符
- [ ] 对资金、权限、账户安全等高敏操作考虑二次确认（密码、验证码、重新登录）
- [ ] 不要因为"有 Bearer 支持"就认为不存在 CSRF 面——浏览器端默认走 cookie

---

## Security Review Report Format

````markdown
# Security Review Report

**File/Component:** [path/to/file.ts]
**Reviewed:** YYYY-MM-DD

## Summary

- **Critical Issues:** X
- **High Issues:** Y
- **Medium Issues:** Z
- **Risk Level:** 🔴 HIGH / 🟡 MEDIUM / 🟢 LOW

## Critical Issues

### 1. [Issue Title]

**Severity:** CRITICAL
**Category:** SQL Injection / XSS / Authentication
**Location:** `file.ts:123`

**Issue:** [漏洞描述]

**Impact:** [被利用后的影响]

**Remediation:**

```typescript
// ✅ 安全实现
```
````

---

## Security Checklist

- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Authentication required
- [ ] Authorization verified
- [ ] Rate limiting enabled
- [ ] Logging sanitized
- [ ] Dependencies up to date

````

---

## Pre-Deployment Security Checklist

部署前必须检查：

- [ ] **Secrets**: 无硬编码密钥，全部在环境变量
- [ ] **Input Validation**: 所有用户输入已验证
- [ ] **SQL Injection**: 所有查询参数化
- [ ] **XSS**: 用户内容已清理
- [ ] **Authentication**: Token 处理正确
- [ ] **Authorization**: 权限检查到位
- [ ] **Rate Limiting**: 所有端点已启用
- [ ] **Security Headers**: helmet 已配置
- [ ] **Path Traversal**: 文件操作已验证路径
- [ ] **SSRF**: URL 请求已白名单验证
- [ ] **HTTPS**: 生产环境强制
- [ ] **Error Handling**: 错误信息不泄露敏感数据
- [ ] **Logging**: 日志不包含敏感数据
- [ ] **Dependencies**: 已更新，无漏洞

---

## Makefile Target

将以下内容添加到项目 Makefile（与现有 target 不冲突）：

```makefile
# Security scanning
.PHONY: security-scan security-audit security-secrets security-dangerous

security-scan: security-audit security-secrets security-dangerous
	@echo "✅ Security scan complete. Review any findings above."

security-audit:
	@echo "🔍 Checking dependency vulnerabilities..."
	@pnpm audit || true

security-secrets:
	@echo "🔍 Scanning for hardcoded secrets..."
	@rg "api[_-]?key|password|secret|token|credential|bearer" \
		--type ts -i apps/ \
		-g '!*.test.ts' -g '!*.spec.ts' -g '!*.d.ts' \
		-g '!**/i18n/**' -g '!**/*.example*' || echo "  No matches found"

security-dangerous:
	@echo "🔍 Scanning for dangerous functions..."
	@rg "eval\(|new Function\(|child_process|execSync" --type ts apps/ || echo "  No matches found"
	@echo "🔍 Scanning for dangerouslySetInnerHTML..."
	@rg "dangerouslySetInnerHTML" apps/web/src --type tsx --type ts || echo "  No matches found"
````

---

## Quick Security Commands

以下命令可快速检测常见安全问题。建议添加到 CI 或定期执行。

### 一键扫描脚本

```bash
# 这个仓库当前没有内置 `make security-scan`
# 建议组合执行现有校验 + 安全专项命令
make check
pnpm audit
```

### 依赖与配置

```bash
# 依赖漏洞审计
pnpm audit

# 检查 .env 是否被忽略
cat .gitignore | grep -E "\.env"

# 检查过时依赖
pnpm outdated
```

### 硬编码密钥检测

```bash
# 检测 API Key / Secret / Token / Password
rg "api[_-]?key|password|secret|token|credential|bearer|private[_-]?key" \
   --type ts -i apps/ \
   -g '!*.test.ts' -g '!*.spec.ts' -g '!*.d.ts'

# 检测可能的 Base64 编码密钥（长字符串）
rg "['\"]\w{32,}['\"]" --type ts apps/server/src

# 检测硬编码 IP 地址
rg "\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b" --type ts apps/ -g '!*.test.ts'
```

### 危险函数检测

```bash
# eval / Function 动态执行
rg "eval\(|new Function\(" --type ts apps/

# 命令执行（child_process）
rg "child_process|execSync|spawnSync|exec\(|spawn\(" --type ts apps/

# 动态 require/import
rg "require\([^'\"]|import\([^'\"]" --type ts apps/server/src
```

### 注入漏洞检测

```bash
# SQL 字符串拼接（可疑）
rg "SELECT.*\+|INSERT.*\+|UPDATE.*\+|DELETE.*\+" --type ts apps/server/src

# SQL 模板字符串（需人工审查）
rg "sql\`.*\$\{" --type ts apps/server/src

# 路径拼接（潜在路径遍历）
rg "readFile|writeFile|unlink|rmdir|mkdir|access|stat" --type ts apps/server/src
rg "path\.join\(.*req\.|path\.resolve\(.*req\." --type ts apps/server/src
```

### XSS 检测

```bash
# React dangerouslySetInnerHTML
rg "dangerouslySetInnerHTML" apps/web/src --type tsx --type ts

# innerHTML 直接赋值
rg "\.innerHTML\s*=" --type ts apps/
```

### 认证授权检测

```bash
# 列出所有 Controller 端点（需人工核对是否应该 @Public()）
rg -n "@(Get|Post|Put|Patch|Delete)\(" apps/server/src/modules --type ts

# 检查 @Public() / @Roles() 使用情况
rg -n "@Public\(\)|@Roles\(" apps/server/src/modules --type ts

# 确认公开端点矩阵同步
rg -n "isPublicApiEndpoint" apps/server/src packages/shared/src --type ts
```

### 敏感信息泄露

```bash
# console.log 在生产代码
rg "console\.(log|debug|info|warn)" apps/server/src --type ts \
   -g '!*.test.ts' -g '!*.spec.ts'

# 错误堆栈暴露
rg "error\.stack|err\.stack" apps/server/src --type ts
```

### URL / 重定向检测

```bash
# 业务模块里的原生 fetch（应走 SafeHttpService；infrastructure 例外需显式注释）
rg -n "fetch\(|axios\(|http\.get\(|https\.get\(" --type ts apps/server/src/modules

# 前端重定向 / window.open 是否来自用户输入
rg "redirect\(|location\.href|window\.open" --type ts apps/web/src

# 确认 SafeHttpService 的主机白名单配置位置
rg "OUTBOUND_ALLOWED_HOSTS" apps/server/src/common/config/env.ts
```

### 正则表达式检测

```bash
# 动态正则（潜在 ReDoS）
rg "new RegExp\(" --type ts apps/

# 可疑的嵌套量词
rg "\(\[?[^)]+\]\+\)\+" --type ts apps/
```

---

**Remember**: 安全不是可选的。一个漏洞可能危及整个平台。宁可谨慎，不要冒险。

---

## Appendix: 安全类别速查表

| #   | 类别         | 优先级   | 本项目状态                                       | 快速检测命令                                                  |
| --- | ------------ | -------- | ------------------------------------------------ | ------------------------------------------------------------- |
| 1   | 密钥管理     | CRITICAL | ⚠️ 需持续检查                                    | `rg "api[_-]?key\|password\|secret" --type ts -i apps/`       |
| 2   | 输入验证     | CRITICAL | ✅ nestjs-zod + Zod DTO                          | 人工审查 schema 严格性                                        |
| 3   | SQL 注入     | CRITICAL | ✅ Prisma ORM                                    | `rg "SELECT.*\+\|\$queryRawUnsafe" --type ts apps/server/src` |
| 4   | 认证授权     | CRITICAL | ✅ `AuthGuard` + refresh rotation + audit log    | `rg "@Public\(\)\|@Roles\(" apps/server/src`                  |
| 5   | XSS          | HIGH     | ⚠️ 需持续检查                                    | `rg "dangerouslySetInnerHTML" apps/web/src`                   |
| 6   | SSRF         | HIGH     | ✅ `SafeHttpService` 统一拦截                    | 见第 6 节检查命令                                             |
| 7   | 路径遍历     | HIGH     | ⚠️ 需持续检查                                    | `rg "readFile\|writeFile" apps/server/src`                    |
| 8   | 命令注入     | HIGH     | ✅ 无 child_process                              | `rg "child_process\|exec\(" apps/`                            |
| 9   | 速率限制     | HIGH     | ✅ `@nestjs/throttler` + `CacheThrottlerStorage` | `rg "@Throttle\(" apps/server/src`                            |
| 10  | 安全 Headers | HIGH     | ✅ helmet 统一（含 HSTS 生产启用）               | 响应头快照回归                                                |
| 11  | 敏感数据     | MEDIUM   | ⚠️ 需持续检查                                    | `rg "console\.log" apps/server/src`                           |
| 12  | ReDoS        | MEDIUM   | ⚠️ 需持续检查                                    | `rg "new RegExp\(" apps/`                                     |
| 13  | 依赖安全     | MEDIUM   | ⚠️ 需持续检查                                    | `pnpm audit`                                                  |
| 14  | CSRF         | MEDIUM   | ⚠️ Cookie 认证 + SameSite                        | 核对 cookie 属性与 CORS origin                                |

# InitMonorepo

[English](README.md) | **中文** | [日本語](README.ja.md) | [한국어](README.ko.md)

一份经过多轮优化的大模型 Prompt，用于让 AI 一次性初始化一个**生产级全栈 TypeScript Monorepo 工程**。

## 它能生成什么

将 [PROMPT.zh-CN.md](PROMPT.zh-CN.md) 投喂给大模型后，预期得到一个完整可运行的工程，包括：

- **Monorepo 骨架** — pnpm workspace + Turborepo + TypeScript Project References
- **前端** — React + Vite + BrowserRouter + FSD 架构 + TanStack Query + Zustand + i18n + 深浅主题
- **后端** — NestJS + Prisma + MySQL + Redis + DDD 分层 + Pino 结构化日志
- **API 契约** — Zod 统一 schema → OpenAPI → Orval 自动生成 typed SDK
- **示例业务** — User Management 完整链路（前端页面 → SDK → Controller → Use Case → Repository → MySQL/Redis）
- **工程化** — ESLint + Prettier + Husky + commitlint + Knip + Vitest + Makefile + Docker + CI
- **文档** — 中英文 README、架构说明、规范文档、CLAUDE.md / AGENTS.md

## 如何使用

1. 复制 [PROMPT.zh-CN.md](PROMPT.zh-CN.md) 的全部内容
2. 在一个**空目录**中，将其作为 Prompt 发送给大模型（Claude / ChatGPT / Gemini 等）
3. 等待模型生成完整工程
4. 按照生成的 README 执行 `make setup && make dev` 验证

## Prompt 设计要点

- **分层优先级**（Must / Should / Nice-to-have）— 防止模型 token 不足时产出不可运行的半成品
- **验收要求** — 要求模型实际验证命令链路，而不是只生成文件就宣称完成
- **边界约束** — 通过工程规则（ESLint boundaries、package exports、路径别名）落地架构边界
- **Base Path 归一化** — 支持非根路径部署，运行时注入与构建时固定两种模式
- **状态边界** — TanStack Query 管服务端状态，Zustand 仅管 UI 全局状态
- **DDD 范围收紧** — 核心业务模块走 DDD，基础设施模块不过度抽象

## 文件说明

| 文件 | 说明 |
|---|---|
| [PROMPT.zh-CN.md](PROMPT.zh-CN.md) | 投喂给大模型的完整 Prompt（中文） |
| [PROMPT.md](PROMPT.md) | 完整 Prompt（英文版） |
| [PROMPT.ja.md](PROMPT.ja.md) | 完整 Prompt（日文版） |
| [PROMPT.ko.md](PROMPT.ko.md) | 完整 Prompt（韩文版） |
| [README.md](README.md) | 英文版项目介绍（默认） |
| [README.zh-CN.md](README.zh-CN.md) | 本文件，中文版项目介绍 |
| [README.ja.md](README.ja.md) | 日文版项目介绍 |
| [README.ko.md](README.ko.md) | 韩文版项目介绍 |

## 迭代与贡献

如需调整 Prompt 内容，直接修改 [PROMPT.zh-CN.md](PROMPT.zh-CN.md)。

## License

MIT

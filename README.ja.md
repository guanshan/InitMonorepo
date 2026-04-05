# InitMonorepo

[English](README.md) | [中文](README.zh-CN.md) | **日本語** | [한국어](README.ko.md)

AIに**本番グレードのフルスタック TypeScript Monorepo**を一発で初期化させるための、繰り返し最適化された LLM プロンプトです。

## 生成されるもの

[PROMPT.ja.md](PROMPT.ja.md) を LLM に入力すると、以下を含む完全に実行可能なプロジェクトが生成されます：

- **Monorepo 骨格** — pnpm workspace + Turborepo + TypeScript Project References
- **フロントエンド** — React + Vite + BrowserRouter + FSD アーキテクチャ + TanStack Query + Zustand + i18n + ライト/ダークテーマ
- **バックエンド** — NestJS + Prisma + MySQL + Redis + DDD レイヤリング + Pino 構造化ログ
- **API コントラクト** — Zod 統一スキーマ → OpenAPI → Orval 自動生成型付き SDK
- **サンプルビジネスモジュール** — User Management 完全フロー（フロントエンドページ → SDK → Controller → Use Case → Repository → MySQL/Redis）
- **エンジニアリングツール** — ESLint + Prettier + Husky + commitlint + Knip + Vitest + Makefile + Docker + CI
- **ドキュメント** — 多言語 README、アーキテクチャ説明、規約ドキュメント、CLAUDE.md / AGENTS.md

## 使い方

1. [PROMPT.ja.md](PROMPT.ja.md) の内容をすべてコピー
2. **空のディレクトリ**で、LLM（Claude / ChatGPT / Gemini など）にプロンプトとして送信
3. モデルがプロジェクト全体を生成するのを待つ
4. 生成された README に従い `make setup && make dev` を実行して検証

## プロンプト設計のポイント

- **優先度レイヤー**（Must / Should / Nice-to-have）— モデルのトークン不足時に実行不能な半端な成果物を防止
- **受け入れ基準** — ファイル生成だけで完了を宣言せず、コマンドチェーンの実際の検証を要求
- **境界制約** — エンジニアリングルール（ESLint boundaries、package exports、パスエイリアス）でアーキテクチャ境界を強制
- **ベースパス正規化** — 非ルートパスデプロイをサポート（ランタイム注入とビルド時固定の両モード）
- **ステート境界** — TanStack Query はサーバーステート管理、Zustand は UI グローバルステートのみ
- **スコープ限定 DDD** — コアビジネスモジュールは DDD、インフラモジュールは過度な抽象化を回避

## ファイル一覧

| ファイル | 説明 |
|---|---|
| [PROMPT.ja.md](PROMPT.ja.md) | LLM に入力する完全なプロンプト（日本語版） |
| [PROMPT.md](PROMPT.md) | 完全なプロンプト（英語デフォルト） |
| [PROMPT.zh-CN.md](PROMPT.zh-CN.md) | 完全なプロンプト（中国語原文） |
| [PROMPT.ko.md](PROMPT.ko.md) | 完全なプロンプト（韓国語版） |
| [README.md](README.md) | 英語版プロジェクト紹介（デフォルト） |
| [README.zh-CN.md](README.zh-CN.md) | 中国語版プロジェクト紹介 |
| [README.ja.md](README.ja.md) | このファイル、日本語版プロジェクト紹介 |
| [README.ko.md](README.ko.md) | 韓国語版プロジェクト紹介 |

## 改善と貢献

プロンプト内容を調整するには、[PROMPT.md](PROMPT.md)（英語デフォルト）または [PROMPT.zh-CN.md](PROMPT.zh-CN.md)（中国語原文）を編集し、必要に応じて [PROMPT.ja.md](PROMPT.ja.md) の翻訳も同期してください。

## License

MIT

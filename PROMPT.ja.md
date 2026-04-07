# TypeScript Monorepo 初期化プロンプト

[English](PROMPT.md) | [中文](PROMPT.zh-CN.md) | [日本語](PROMPT.ja.md) | [한국어](PROMPT.ko.md)

実行可能で、保守性が高く、拡張可能で、実際のチームプロジェクトに近いフルスタック TypeScript Monorepo を初期化してください。説明文やテンプレートの空殻だけを出力しないでください。

## 1. 実行ルール

- ベストプラクティスを直接採用してください。複数の選択肢を提示しないでください。
- 私の元の要件にベストプラクティスに反する点がある場合は、直接修正してより良い方法を採用してください。
- 生成結果は、実行可能性、境界の明確さ、長期的な保守性を最優先にしてください。
- 「完璧に見せる」ために、実行不可能で検証不可能な、境界のないボイラープレートコードを大量に生成しないでください。
- コンテキストウィンドウまたはトークンが不足する場合は、`Must` の完全な納品を優先し、次に `Should`、最後に `Nice-to-have` を処理してください。
- `Should` または `Nice-to-have` の項目をスキップした場合、完了したふりをせず、何が延期されたかを明示してください。
- ソースコード、識別子、コメント、設定キー名、環境変数名、fixture、seed データは英語で統一してください。ユーザー向け文言とローカライズされたドキュメントの初期納品言語ポリシーは、このプロンプト variant に従います。日本語プロンプトでは `日本語 + 英語` を納品してください。

## 2. 納品優先度

### 2.1 Must

以下を最優先で完了する必要があります：

- Monorepo 基本骨格が実行可能
- フロントエンドとバックエンドの両方がローカルで開発、ビルド、lint、typecheck、テスト可能
- フロントエンド React + Vite + BrowserRouter + base path 戦略が正しい
- バックエンド NestJS + Prisma + MySQL + Redis 基本チェーンが実行可能
- フロントエンド FSD 境界が明確
- バックエンドコアビジネスモジュールが DDD レイヤリングを使用
- Zod 戦略が一貫しており、別の HTTP バリデーションスタイルが混在しない
- OpenAPI エクスポートと Orval SDK 生成チェーンが使用可能
- User Management サンプルビジネスがエンドツーエンドで完全に接続
- 基本ページ、テーマ、i18n、エラー境界、ローディング状態、主要な UX 機能が使用可能
- API レスポンス形式、ログフィールド、キャッシュ境界、環境変数ガバナンス、その他のコア制約が実装済み
- Makefile、環境変数、Docker、基本 README が使用可能

### 2.2 Should

`Must` 完了後、以下を優先的に補充：

- GitHub Actions
- `CLAUDE.md` と `AGENTS.md`
- 主要な規約ドキュメント
- より完全なテスト例
- Storybook

### 2.3 Nice-to-have

十分なコンテキスト、時間、またはトークンが残っている場合、以下を追加：

- 追加ドキュメント
- ADR ドキュメント
- skills ディレクトリ
- より豊富なサンプルビジネスロジック
- 可観測性の強化

## 3. 固定技術スタック

代替案を提供せず、以下を直接採用してください。

### 3.1 ランタイムと Monorepo

- Node.js 24 LTS
- 実行時に Node.js 24 がアクティブな LTS でなくなった場合は、現在のアクティブ LTS に切り替え、理由を説明
- pnpm workspace
- Turborepo
- TypeScript 5.x
- TypeScript Project References（`composite`）

### 3.2 フロントエンド

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
- Storybook は `Should` として

### 3.3 バックエンド

- NestJS
- Prisma
- MySQL
- Redis
- Zod
- `nestjs-zod`
- Swagger / OpenAPI
- Pino

### 3.4 エンジニアリングツール

- ESLint
- Prettier
- EditorConfig
- Husky
- lint-staged
- commitlint
- Knip
- Vitest
- Playwright は実ブラウザ E2E のみ（実装する場合）
- GitHub Actions
- Orval

## 4. バージョニングとロック戦略

プロジェクト初期化時、「最新を使う」ではなく「安定・互換・バージョンロック」を強調してください。

必須：

- ルート `package.json` に `packageManager` を宣言
- Corepack で pnpm バージョンを固定
- ルートディレクトリに `.nvmrc` を提供
- ルートディレクトリに `.node-version` を提供
- ルートディレクトリに `.npmrc` を提供
- ルートディレクトリに `pnpm-lock.yaml` を提供
- ルート `package.json` に `engines` を宣言

推奨：

- Dependabot または Renovate の設定

## 5. Monorepo 構造

少なくとも以下の構造を含めてください：

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
│   └── tooling                       # オプション：ヘルパースクリプトとツール
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
├── README.ja.md
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

要件：

- すべてのパッケージは明確な `exports` を宣言する必要がある
- パッケージ間のディープインポートは禁止
- `shared` はゴミ箱にしてはならない
- 自動生成コードと手書きコードは別ディレクトリに分離する必要がある
- 新規パッケージは明確な `name`、`type`、`exports`、`files` を宣言する必要がある
- 新規パッケージは TypeScript project references に統合する必要がある
- `packages/tooling` はヘルパースクリプトとツール用（OpenAPI spec エクスポートスクリプト、コード生成設定など）；初期化段階で明確なコンテンツがない場合はスキップ可能

### 5.1 内部パッケージビルド戦略

- 内部パッケージはデフォルトで `tsup` によるプリコンパイル、ESM と型宣言を出力
- アプリはデフォルトでパッケージのコンパイル済み成果物を消費し、未コンパイルの `.ts` ソースファイルを直接消費しない
- TypeScript project references は IDE ナビゲーション、型チェック、インクリメンタルビルド加速用；パッケージの実際のビルド成果物を置き換えるものではない

### 5.2 tsconfig 継承戦略

- `packages/config` が共有 `tsconfig.base.json` を提供
- フロントエンドアプリは追加で `tsconfig.web.json`（JSX / DOM 関連設定）を継承
- バックエンドアプリは追加で `tsconfig.node.json`（Node.js ランタイム関連設定）を継承
- 各パッケージとアプリの `tsconfig.json` は共有設定から継承し、設定を重複させない

### 5.3 共有パッケージの責務

- `packages/shared`：フロントエンド・バックエンド間で共有する型、スキーマ、定数、汎用ユーティリティ
- `packages/ui`：フロントエンド共有 UI コンポーネント、トークン、テーマユーティリティ
- `packages/config`：共有エンジニアリング設定
- `packages/sdk`：API コントラクト、生成コード、フロントエンド専用フックのレイヤード エクスポート
- `packages/tooling`：エンジニアリングスクリプトとコード生成ツール

## 6. アーキテクチャ原則

### 6.1 一般原則

- デフォルトでプロダクションプロジェクトの骨格として初期化
- 高凝集・低結合
- 実行可能性、可読性、テスト可能性、拡張性を優先
- ディレクトリ構造と命名は統一的、一貫性があり、予測可能でなければならない
- 境界はドキュメントだけでなく、エンジニアリングルールで強制する必要がある

### 6.2 禁止事項

- Prisma モデルをドメインモデルとして直接使用しない
- すべてのビジネスロジックを単一のサービスに詰め込まない
- ビジネスページにリクエストロジックとビジネスルールを散在させない
- サーバーステートを Zustand に入れない
- コンポーネントで色、border-radius、シャドウ、スペーシング、フォントサイズをハードコードしない
- コンポーネントでユーザーに表示されるテキストをハードコードしない
- `process.env` をどこでも直接読み取らない
- OpenAPI と重複する大量の API クライアントコードを手書きしない
- 自動生成された SDK コードを手動で修正しない

### 6.3 境界強制ツール

明確に定義し、実際に強制する必要がある：

- `eslint-plugin-boundaries` または同等のものを使用してクロスレイヤーインポートを制限
- オプションで `dependency-cruiser` を追加して依存トポロジチェック
- パッケージ `exports`、パスエイリアス、生成ディレクトリの分離で境界を強制

## 7. フロントエンド要件

### 7.1 フロントエンドアーキテクチャ

フロントエンドは FSD を使用；バックエンドの DDD パターンを生硬に適用しない。

推奨構造：

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

要件：

- `processes` レイヤーは使用しない
- `pages` はページアセンブリを担当；複雑なビジネスルールを含まない
- `widgets` はページレベルのコンポジションを担当；低レベル API の詳細と直接結合しない
- `features` はユーザーアクションとビジネス機能を担当
- `entities` はフロントエンドドメインオブジェクトの表現、アダプター、クエリフック、ビューモデルを担当
- `shared` は純粋に汎用的な機能のみを含む；ビジネスセマンティックなコードは含まない
- `apps/web/src/shared` は FSD レベルのフロントエンド内部汎用レイヤー；`packages/shared` と混同しない；責務が異なり、相互に置き換えてはならない

### 7.2 フロントエンドステート境界

- サーバーステートはすべて TanStack Query が管理
- Zustand は UI グローバルステートのみに使用（テーマ、言語、サイドバー折りたたみ、ダイアログ表示など）
- DTO は UI モデルを直接汚染してはならない；アダプター / マッパーを経由する必要がある
- TanStack Query はグローバル `QueryCache` / `MutationCache` の `onError` コールバックを設定し、401 リダイレクトやネットワークエラートーストなどを統一処理する必要がある

### 7.3 スタイリングとコンポーネント

- スタイリング方法は `CSS Modules` + Design Tokens + CSS Variables に固定
- ランタイム CSS-in-JS を導入しない
- 複雑なインタラクティブコンポーネントは `Radix UI Primitives` をベースに構築
- Radix Primitives は動作とアクセシビリティのみ提供；スタイルは CSS Modules と design tokens で適用
- `Radix Themes` やその他のプリスタイルパッケージを導入しない
- 基本コンポーネントは少なくとも以下を含む：
  - `Button`
  - `Input`
  - `Card`
  - `Modal`
  - `Table`
  - `Tag`
  - `Spinner`
  - `EmptyState`

### 7.4 フロントエンド最小限の機能

少なくとも以下を提供：

- アプリ Layout 骨格
- ホームページ
- 404 ページ
- テーマ切り替えコンポーネント
- 言語切り替えコンポーネント
- グローバルエラー境界
- `Loading / Empty / Error` 三態コンポーネント
- ユーザー一覧ページ
- ユーザー詳細ページ
- ユーザー作成ページ / フォームページ

### 7.5 テーマと i18n

以下をサポートする必要がある：

- ダーク / ライトテーマ
- テーマの永続化
- システムテーマをデフォルト動作として
- 日本語 / 英語
- すべてのユーザーに表示されるテキストは i18n を経由する必要がある
- 初期納品では `ja` と `en` の両ロケールを含めること
- すべてのデザイン値はトークンを使用する必要がある
- トークンは少なくとも `color`、`spacing`、`radius`、`shadow`、`typography`、`z-index` をカバー
- 色名はセマンティックでなければならない（例：`--color-bg-default`、`--color-text-primary`）
- ビジネスコンポーネントで hex/rgb/hsl、固定スペーシング、固定 border-radius、固定シャドウ、固定フォントサイズのハードコードは禁止

### 7.6 アクセシビリティとルートパフォーマンス

- フォームコントロールには関連する label が必要
- キーボードで操作可能
- ダイアログはフォーカス管理をサポート
- 色を唯一の情報伝達手段にしない
- ページレベルのルートコンポーネントはデフォルトで `React.lazy` + `Suspense`

## 8. ルーティングとベースパス

### 8.1 ルーティング戦略

- BrowserRouter を使用
- React Router `basename` を使用
- Vite `base` を使用
- フロントエンドはルートパス `/` でのデプロイを前提としない

### 8.2 サポート必須

- `https://domain.com/path/`
- `https://domain.com/path/users`
- `https://domain.com/path/users/123`

### 8.3 ベースパス正規化ルール

以下のルールを明確に実装しドキュメント化：

- ベースパスは `/` または `/` で始まる非ルートパスに正規化する必要がある
- ルートパス `/` を除き、末尾の `/` は許可しない
- `""`、`"/"`、`"//"` などの異常入力は設定レイヤーで統一的に正規化する必要がある
- React Router `basename`、Vite `base`、NestJS 静的ホスティングパス、Swagger パスはすべて同じ正規化ルールに従う必要がある

### 8.4 Vite `base` と React Router `basename` の境界

2つのモードを明確に定義する必要がある。混在させない。デフォルトは「デプロイ後に変更可能」モード：

- デプロイ後に変更可能モード（デフォルト）：
  - Vite `base` を `./` に設定
  - React Router `basename` は `window.__APP_CONFIG__.basePath` または同等のランタイム設定から読み取り
  - NestJS が `index.html` を返す際にランタイム設定を注入
- ビルド時固定モード（フォールバック）：
  - Vite `base` と React Router `basename` は両方とも `VITE_BASE_PATH` から読み取り可能
  - このモードでは、デプロイ後に静的アセットプレフィックスを動的に変更すべきでない
  - このモードへの切り替え方法をドキュメント化

### 8.5 デプロイ設定

- ページリフレッシュで 404 にならない
- 非 API リクエストは統一的に `index.html` にフォールバック
- API ルートと SPA ルートを明確に分離
- 推奨 API プレフィックス：`${APP_BASE_PATH}/api/v1`
- Swagger UI パス：`${APP_BASE_PATH}/api/docs`
- デプロイ後に変更される可能性のあるフロントエンド設定には、ランタイム注入メカニズムを提供（例：`window.__APP_CONFIG__`）
- ローカル開発時、Vite は `server.proxy` を設定して `/api` または同等の API プレフィックスをバックエンドポートにプロキシし、CORS 問題を回避

## 9. バックエンド要件

### 9.1 DDD スコープ

- バックエンドコアビジネスモジュールは DDD レイヤリングを使用
- インフラストラクチャとグルーモジュールは過度な抽象化を回避
- `health`、`config`、`swagger`、`static hosting` などのモジュールには完全な DDD シェルを強制しない

### 9.2 コアビジネスモジュールレイヤリング

コアビジネスモジュールは少なくとも以下に分割：

- Domain
- Application
- Infrastructure
- Interfaces

要件：

- Domain は Prisma、HTTP、NestJS の詳細に依存しない
- Application はユースケースのオーケストレーション、トランザクション境界、キャッシュ連携を担当
- Infrastructure は Prisma、Redis、Mapper、外部依存アダプターを配置
- Interfaces は Controller、DTO、Presenter、例外マッピング、Swagger デコレータとドキュメント公開を配置

### 9.3 バックエンド基本機能

少なくとも以下を実装：

- `/health`
- `/ready`
- `/live`
- MySQL 接続
- Redis 接続
- 設定のロードとバリデーション
- グローバル例外フィルター
- 統一レスポンス形式
- リクエストレベルのロギング
- Swagger / OpenAPI
- migration
- seed

### 9.4 API レスポンスとエラー規約

以下を統一する必要がある：

- 成功レスポンス構造
- ページネーションレスポンス構造
- エラーレスポンス構造

推奨フィールドは少なくとも以下を含む：

- `success`
- `data`
- `message`
- `code`
- `requestId`
- `timestamp`

要件：

- Controller はベアオブジェクトを任意に返してはならない
- ビジネス例外とシステム例外を区別
- グローバル例外フィルターでエラーレスポンスを統一的にシリアライズ

## 10. Zod、OpenAPI と SDK

### 10.1 統一 Zod 戦略

- Zod がスキーマの単一の真実の源
- `class-validator` / `class-transformer` を混在させない
- フロントエンドフォーム、共有スキーマ、環境変数バリデーションはすべて Zod ベース
- NestJS リクエストバリデーションは `nestjs-zod` または同等の `ZodValidationPipe` で統一

### 10.2 NestJS と OpenAPI の統合

明確に定義する必要がある：

- NestJS 側は `nestjs-zod` でリクエストバリデーションを処理
- レスポンスのシリアライズも Zod アプローチで統一
- OpenAPI ドキュメントは Zod と一貫したブリッジングアプローチを使用
- `@nestjs/swagger` を使用する場合、Zod 生成ドキュメントの後処理パイプラインを適切に処理

### 10.3 SDK 生成

- バックエンド OpenAPI に基づいて SDK を自動生成
- Orval を使用
- `packages/sdk` に出力
- フロントエンドは主に自動生成された SDK を消費
- 手書きのリクエストレイヤーはトランスポート設定とインターセプターのみ保持
- Orval の TanStack Query 出力モードを優先し、型付きの `useQuery` / `useMutation` フックを直接生成する（基本的な HTTP クライアントのみの生成ではない）
- `packages/sdk` のエクスポートはサブパスで分割を推奨：
  - `packages/sdk/types`：純粋な型、スキーマ、ベースクライアント — React 依存なし
  - `packages/sdk/react`：TanStack Query フック — フロントエンド消費のみ
- パッケージ `exports` はこれらのエントリを個別に公開し、非フロントエンドコンシューマーに React 依存を汚染させない

### 10.4 生成シーケンス

トポロジカル関係を明確に定義する必要がある：

- バックエンドは HTTP サーバーを起動せずに OpenAPI spec をエクスポートできるスクリプトを提供
- 例：`apps/server/openapi/openapi.json` にエクスポート
- スタンドアロン CLI スクリプトを使用可能：`NestFactory.create()` でアプリケーションを作成するが `app.listen()` は呼ばず、`SwaggerModule.createDocument()` のみ実行して JSON をファイルに書き込む
- `sdk:generate` は `server:openapi` に依存する必要がある
- `web:build` は `sdk:generate` に依存する必要がある
- `turbo.json` でこのタスク依存チェーンを反映する必要がある

## 11. データアクセス、キャッシュと設定

### 11.1 Prisma

- Prisma + MySQL を使用
- Prisma スキーマは Infrastructure にのみ属する
- Prisma クライアントは最終的に正規化された `DATABASE_URL` を消費
- ローカル開発で別々の `MYSQL_*` 変数を使用する場合、config モジュールでのみ結合を許可

### 11.2 マイグレーションと Seed の安全戦略

- プロダクション起動時に破壊的なマイグレーションを暗黙的に実行しない
- 開発、テスト、プロダクション環境のマイグレーションコマンドを分離
- Seed は開発 / テスト環境でのみ明示的にトリガー
- README と docs でデータベースの初期化、マイグレーション、リセット、Seed の境界を説明

### 11.3 Redis

- 統一キャッシュラッパーを提供
- Redis クライアントは最終的に正規化された `REDIS_URL` を消費
- キャッシュキーの命名規約を明確に定義
- 少なくとも1つの実際のキャッシュ例を提供
- 少なくとも以下を区別：クエリキャッシュ、ID ベースのエンティティキャッシュ、将来の認証/セッション拡張、将来のレート制限拡張
- ビジネスコードでキャッシュキーを任意に結合することを禁止

### 11.4 環境変数

以下を提供する必要がある：

- `.env.example`
- `.env.development`
- `.env.test`
- `.env.production`

フロントエンドビルド時変数：

- `VITE_APP_NAME`
- `VITE_DEFAULT_LOCALE`
- `VITE_DEFAULT_THEME`
- `VITE_BASE_PATH`（ビルド時固定モードのみ）

フロントエンドランタイム注入変数：

- `APP_RUNTIME_API_BASE_URL`
- `APP_RUNTIME_BASE_PATH`

説明：

- これら2つの値はフロントエンドビルド時の環境変数ではない
- NestJS が `index.html` を返す際に `window.__APP_CONFIG__` に注入
- フロントエンドの `.env` ファイルに書き込む必要はない
- 対応するサーバーサイドの設定ソースはバックエンド設定レイヤーで集中的に宣言・マッピング

バックエンド変数：

- `PORT`
- `APP_BASE_PATH`
- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `SWAGGER_ENABLED`

要件：

- Zod で環境変数をバリデーション
- 起動時にフェイルファスト
- ビジネスコードは型付き設定オブジェクトのみに依存
- フロントエンドはビルド時に `VITE_` 変数のみ直接読み取り可能
- デプロイ後に変更が必要なフロントエンド設定はランタイム注入で提供
- `.env.production` は非機密のデフォルト値のみ格納
- 実際のプロダクションシークレットと接続文字列はデプロイ環境から注入；リポジトリにコミットしない
- デフォルトで同一オリジンデプロイの場合、フロントエンドは相対 API プレフィックスを直接使用（例：`/api/v1`）
- `APP_RUNTIME_API_BASE_URL` は API とフロントエンドが異なるオリジンでデプロイされる場合のみ使用
- 同一オリジンの場合、`CORS_ORIGIN` は通常有効にする必要なし；フロントエンドとバックエンドがクロスオリジンでデプロイされる場合のみ明示的に設定

## 12. サンプルビジネスモジュール

空殻プロジェクトだけを生成しないでください。

`User Management` を完全なサンプルビジネスモジュールとして使用し、少なくとも以下を含める：

- ユーザー一覧ページ
- ユーザー詳細ページ
- ユーザー作成ページ / フォームページ
- ユーザードメインモデル
- ユーザーリポジトリインターフェース
- ユーザーリポジトリ実装
- ユーザーユースケース
- ユーザーコントローラー
- migration
- seed
- Redis キャッシュ例

少なくとも1つの完全なチェーンをエンドツーエンドで接続：

- フロントエンドページ
- SDK 呼び出し
- バックエンド Controller
- Application Use Case
- Repository
- MySQL
- Redis Cache

## 13. テスト戦略

### 13.1 必須完了

- フロントエンド単体テスト
- フロントエンドコンポーネントテスト
- MSW ベースのフロントエンドモック
- バックエンド単体テスト
- バックエンド e2e テスト
- `packages/shared` テスト

### 13.2 テストツール選択

- デフォルトで単体テスト、統合テスト、バックエンド e2e テストに Vitest を使用
- 実ブラウザのエンドツーエンドテストを含む場合は Playwright を追加
- 現行の NestJS バージョンは公式 Vitest 設定パスを提供；Vitest を優先し、デフォルトで Jest に戻さない
- 現在の依存バージョンに明確な互換性ブロッカーが確認された場合のみ、`apps/server` e2e に最小限の Jest 例外を許可し、理由を明記

### 13.3 最小テストカバレッジ例

少なくとも以下を示す：

- 1つのフロントエンドコンポーネントテスト
- 1つのフロントエンドページまたはフィーチャーテスト
- 1つのバックエンドユースケース単体テスト
- 1つのバックエンド e2e テスト
- 1つの共有スキーマ / ユーティリティテスト

## 14. Makefile、Docker と CI

### 14.1 Makefile

少なくとも以下を含む：

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

要件：

- `make help` はコメントを自動的に読み取りヘルプ情報を出力
- `make setup` は依存関係のインストール、env ファイルの初期化、フックのインストール、シンボリックリンクの作成を担当
- `make dev` は `turbo dev`、`concurrently` または同等の方法でフロントエンドとバックエンドを同時起動
- `make dev` は実行前に `mysql` と `redis` が利用可能であることを確認する必要がある；`docker compose up -d mysql redis` を自動実行するか、不足時に明確なプロンプトを表示
- `make check` は少なくとも `lint`、`knip`、`typecheck`、`test`、`build` をチェーン
- 開発段階で Prisma Studio を起動するための `make db-studio` を提供

### 14.2 Turbo 設定

- `turbo.json` は `build`、`test`、`generate-sdk`、`openapi` などのタスクに正しい `outputs` を宣言する必要がある
- Turbo のタスク依存関係とキャッシュ設定は一般的なエンジニアリング要件；CI でのみ考慮しない

### 14.3 Docker

要件：

- フロントエンドとバックエンドは最終的に1つのイメージにパッケージ
- フロントエンドビルド成果物はバックエンドが配信
- `turbo prune` を使用
- `server` と `web` それぞれに `turbo prune` を実行し、最小化されたワークスペースサブセットを取得
- 別々のビルドステージで `server` と `web` をビルド
- 最終ランナーイメージは `server` ランタイム成果物と `web` 静的成果物のみを含む
- 最終ランタイムイメージは可能な限り非 root ユーザーを使用
- `docker-compose.yml` は少なくとも `mysql`、`redis` を含む
- `liveness`、`readiness`、`mysql / redis` の可用性チェックを含む

### 14.4 CI

`Should` として、少なくとも以下を含む：

- 依存関係のインストール
- pnpm / turbo のキャッシュ
- lint
- typecheck
- test
- build
- 自動生成 SDK が最新であることを検証

## 15. ロギングとセキュリティベースライン

### 15.1 ロギング

- バックエンドはデフォルトで `pino` による構造化 JSON ログ出力
- ログフィールドは少なくとも `timestamp`、`level`、`service`、`module`、`action`、`requestId`、`message` を含む
- エラーログは必要に応じて `error`、`stack` を含む
- パスワード、トークン、接続文字列、その他の機密情報をログに出力しない

### 15.2 セキュリティベースライン

- CORS は環境変数で制御
- 合理的な HTTP セキュリティヘッダーをデフォルトで有効
- 将来の認証、レート制限、監査のための拡張ポイントを予約

## 16. ドキュメントとコラボレーション成果物

### 16.1 Must

少なくとも以下を生成：

- `README.md`（英語）
- `README.ja.md`（日本語）
- `docs/frontend-architecture.md`
- `docs/backend-architecture.md`
- `docs/api-guidelines.md`
- `docs/deployment-guidelines.md`
- `docs/theme-guidelines.md`
- `docs/dependency-boundaries.md`
- `docs/logging-guidelines.md`

### 16.2 Should

余力があれば生成：

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

さらに余力があれば生成：

- `docs/adr/*`
- `.agents/skills/*`
- `.claude/skills -> .agents/skills`
- `.codex/skills -> .agents/skills`
- その他の規約ドキュメント

## 17. 出力チェックリスト

少なくとも以下を出力：

- 完全なディレクトリ構造
- ルートレベルの設定ファイル
- `apps` 配下のフロントエンドとバックエンドコード
- `packages` 配下の共有パッケージコード
- `Makefile`
- `Dockerfile`
- `docker-compose.yml`
- `.editorconfig`
- `.gitignore`
- `.npmrc`
- `.nvmrc`
- `.node-version`
- `README.md`
- `README.ja.md`
- 完全なサンプルビジネスチェーン

## 18. 受け入れと検証

ファイルを生成しただけで完了を宣言しないでください。以下の受け入れ項目を実行するか、少なくとも明示的に設計する必要があります：

### 18.1 基本受け入れ

少なくとも以下のコマンドチェーンを検証：

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

### 18.2 ローカル実行受け入れ

少なくとも以下のチェーンが動作することを確認：

- `make dev` でフロントエンドとバックエンドを同時に起動可能
- フロントエンドページにアクセス可能
- バックエンド API にアクセス可能
- Swagger ドキュメントにアクセス可能
- ユーザー一覧サンプルチェーンが機能

### 18.3 Docker 受け入れ

少なくとも以下の受け入れプロセスを設計し説明：

```bash
make docker-build
make docker-run
```

### 18.4 失敗時の対応

現在の環境で実際の検証を完了できない場合：

- どのステップが検証済みかを明示
- どのステップが未検証かを明示
- 未検証の内容を「完了済みで実行可能」と説明しない

## 19. 最終出力スタイル

- 直接実装する；複数の選択肢を提示しない
- 完全で、実行可能で、保守可能なプロジェクトを優先
- 重要な設計決定を説明するが、出力を純粋な理論説明にしない
- サンプルコードは同一のビジネスシナリオを中心にする
- `Should` / `Nice-to-have` が未完了の場合、延期項目として明示的にマーク

プロジェクト全体の初期化を開始してください。

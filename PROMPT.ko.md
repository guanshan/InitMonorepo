# TypeScript Monorepo 초기화 프롬프트

[English](PROMPT.md) | [中文](PROMPT.zh-CN.md) | [日本語](PROMPT.ja.md) | [한국어](PROMPT.ko.md)

실행 가능하고, 유지보수가 용이하며, 확장 가능하고, 실제 팀 프로젝트에 가까운 풀스택 TypeScript Monorepo를 초기화해 주세요. 설명 텍스트나 빈 껍데기 템플릿만 출력하지 마세요.

## 1. 실행 규칙

- 모범 사례를 직접 채택하세요. 여러 선택지를 제시하지 마세요.
- 내 원래 요구사항 중 모범 사례에 부합하지 않는 부분이 있으면 직접 수정하고 더 나은 방법을 채택하세요.
- 생성 결과는 실행 가능성, 경계의 명확성, 장기적인 유지보수성을 최우선으로 해야 합니다.
- "완전해 보이기" 위해 실행 불가능하고 검증 불가능한, 경계 없는 보일러플레이트 코드를 대량으로 생성하지 마세요.
- 컨텍스트 윈도우나 토큰이 부족한 경우, `Must`를 완전히 전달하는 것을 최우선으로 하고, 그 다음 `Should`, 마지막으로 `Nice-to-have`를 처리하세요.
- `Should` 또는 `Nice-to-have` 항목을 건너뛴 경우, 완료된 것처럼 위장하지 말고 어떤 항목이 연기되었는지 명시하세요.

## 2. 전달 우선순위

### 2.1 Must

다음 항목을 최우선으로 완료해야 합니다:

- Monorepo 기본 골격이 실행 가능
- 프론트엔드와 백엔드 모두 로컬에서 개발, 빌드, lint, typecheck, 테스트 가능
- 프론트엔드 React + Vite + BrowserRouter + base path 전략이 올바름
- 백엔드 NestJS + Prisma + MySQL + Redis 기본 체인이 실행 가능
- 프론트엔드 FSD 경계가 명확
- 백엔드 핵심 비즈니스 모듈이 DDD 레이어링 사용
- Zod 전략이 일관되며, 다른 HTTP 검증 스타일이 혼재하지 않음
- OpenAPI 내보내기 및 Orval SDK 생성 체인이 사용 가능
- User Management 예제 비즈니스가 엔드투엔드로 완전히 연결
- 기본 페이지, 테마, i18n, 에러 바운더리, 로딩 상태, 주요 UX 기능이 사용 가능
- API 응답 형식, 로그 필드, 캐시 경계, 환경 변수 거버넌스, 기타 핵심 제약이 구현됨
- Makefile, 환경 변수, Docker, 기본 README가 사용 가능

### 2.2 Should

`Must` 완료 후, 다음을 우선 보충:

- GitHub Actions
- `CLAUDE.md` 및 `AGENTS.md`
- 주요 규약 문서
- 더 완전한 테스트 예제
- Storybook

### 2.3 Nice-to-have

충분한 컨텍스트, 시간 또는 토큰이 남아있다면 다음을 추가:

- 추가 문서
- ADR 문서
- skills 디렉토리
- 더 풍부한 예제 비즈니스 로직
- 관측 가능성 강화

## 3. 고정 기술 스택

대안을 제시하지 말고 다음을 직접 채택하세요.

### 3.1 런타임 및 Monorepo

- Node.js 24 LTS
- 실행 시점에 Node.js 24가 더 이상 활성 LTS가 아니면, 현재 활성 LTS로 전환하고 이유를 설명
- pnpm workspace
- Turborepo
- TypeScript 5.x
- TypeScript Project References (`composite`)

### 3.2 프론트엔드

- React
- Vite
- React Router (BrowserRouter)
- TanStack Query
- Zustand
- i18next
- Zod
- CSS Modules
- Radix UI Primitives
- MSW
- Design Tokens + CSS Variables
- Storybook은 `Should`로

### 3.3 백엔드

- NestJS
- Prisma
- MySQL
- Redis
- Zod
- `nestjs-zod`
- Swagger / OpenAPI
- Pino

### 3.4 엔지니어링 도구

- ESLint
- Prettier
- EditorConfig
- Husky
- lint-staged
- commitlint
- Knip
- Vitest
- Playwright은 실제 브라우저 E2E 전용 (구현 시)
- GitHub Actions
- Orval

## 4. 버전 관리 및 잠금 전략

프로젝트 초기화 시, "최신 사용"이 아닌 "안정적이고 호환 가능하며 버전 잠금"을 강조하세요.

필수:

- 루트 `package.json`에 `packageManager` 선언
- Corepack으로 pnpm 버전 고정
- 루트 디렉토리에 `.nvmrc` 제공
- 루트 디렉토리에 `.node-version` 제공
- 루트 디렉토리에 `.npmrc` 제공
- 루트 디렉토리에 `pnpm-lock.yaml` 제공
- 루트 `package.json`에 `engines` 선언

권장:

- Dependabot 또는 Renovate 설정

## 5. Monorepo 구조

최소한 다음 구조를 포함해야 합니다:

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
│   └── tooling                       # 선택사항: 헬퍼 스크립트 및 도구
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

요구사항:

- 모든 패키지는 명확한 `exports`를 선언해야 함
- 패키지 간 딥 임포트 금지
- `shared`를 잡동사니 서랍으로 만들지 않음
- 자동 생성 코드와 수작업 코드는 별도 디렉토리로 분리해야 함
- 새 패키지는 명확한 `name`, `type`, `exports`, `files`를 선언해야 함
- 새 패키지는 TypeScript project references에 통합해야 함
- `packages/tooling`은 헬퍼 스크립트 및 도구용 (OpenAPI spec 내보내기 스크립트, 코드 생성 설정 등); 초기화 단계에서 명확한 내용이 없으면 건너뛸 수 있음

### 5.1 내부 패키지 빌드 전략

- 내부 패키지는 기본적으로 `tsup`으로 프리컴파일, ESM과 타입 선언 출력
- 앱은 기본적으로 패키지의 컴파일된 산출물을 소비하며, 컴파일되지 않은 `.ts` 소스 파일을 직접 소비하지 않음
- TypeScript project references는 IDE 탐색, 타입 체크, 증분 빌드 가속용; 패키지의 실제 빌드 산출물을 대체하지 않음

### 5.2 tsconfig 상속 전략

- `packages/config`가 공유 `tsconfig.base.json` 제공
- 프론트엔드 앱은 추가로 `tsconfig.web.json` (JSX / DOM 관련 설정) 상속
- 백엔드 앱은 추가로 `tsconfig.node.json` (Node.js 런타임 관련 설정) 상속
- 각 패키지와 앱의 `tsconfig.json`은 공유 설정에서 상속하며, 설정을 중복하지 않음

### 5.3 공유 패키지 책임

- `packages/shared`: 프론트엔드-백엔드 간 공유 타입, 스키마, 상수, 범용 유틸리티
- `packages/ui`: 프론트엔드 공유 UI 컴포넌트, 토큰, 테마 유틸리티
- `packages/config`: 공유 엔지니어링 설정
- `packages/sdk`: API 계약, 생성 코드, 프론트엔드 전용 훅의 계층화된 익스포트
- `packages/tooling`: 엔지니어링 스크립트 및 코드 생성 도구

## 6. 아키텍처 원칙

### 6.1 일반 원칙

- 기본적으로 프로덕션 프로젝트 골격으로 초기화
- 높은 응집도, 낮은 결합도
- 실행 가능성, 가독성, 테스트 가능성, 확장성을 우선
- 디렉토리 구조와 명명은 통일적이고 일관되며 예측 가능해야 함
- 경계는 문서가 아닌 엔지니어링 규칙으로 강제해야 함

### 6.2 금지 사항

- Prisma 모델을 도메인 모델로 직접 사용하지 않음
- 모든 비즈니스 로직을 단일 서비스에 몰아넣지 않음
- 비즈니스 페이지에 요청 로직과 비즈니스 규칙을 흩뿌리지 않음
- 서버 상태를 Zustand에 넣지 않음
- 컴포넌트에서 색상, border-radius, 그림자, 간격, 폰트 크기를 하드코딩하지 않음
- 컴포넌트에서 사용자에게 보이는 텍스트를 하드코딩하지 않음
- `process.env`를 여기저기서 직접 읽지 않음
- OpenAPI와 중복되는 대량의 API 클라이언트 코드를 수작업으로 작성하지 않음
- 자동 생성된 SDK 코드를 수동으로 수정하지 않음

### 6.3 경계 강제 도구

명확하게 정의하고 실제로 강제해야 함:

- `eslint-plugin-boundaries` 또는 동등한 것을 사용하여 크로스 레이어 임포트 제한
- 선택적으로 `dependency-cruiser`를 추가하여 의존성 토폴로지 체크
- 패키지 `exports`, 경로 별칭, 생성 디렉토리 분리로 경계 강제

## 7. 프론트엔드 요구사항

### 7.1 프론트엔드 아키텍처

프론트엔드는 FSD를 사용; 백엔드 DDD 패턴을 경직되게 적용하지 않음.

권장 구조:

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

요구사항:

- `processes` 레이어 사용하지 않음
- `pages`는 페이지 조립 담당; 복잡한 비즈니스 규칙을 포함하지 않음
- `widgets`는 페이지 수준 컴포지션 담당; 저수준 API 세부사항과 직접 결합하지 않음
- `features`는 사용자 액션과 비즈니스 기능 담당
- `entities`는 프론트엔드 도메인 객체 표현, 어댑터, 쿼리 훅, 뷰 모델 담당
- `shared`는 순수하게 범용적인 기능만 포함; 비즈니스 시맨틱 코드 불포함
- `apps/web/src/shared`는 FSD 수준의 프론트엔드 내부 범용 레이어; `packages/shared`와 혼동하지 않음; 책임이 다르며 서로 대체해서는 안 됨

### 7.2 프론트엔드 상태 경계

- 서버 상태는 전적으로 TanStack Query가 관리
- Zustand는 UI 전역 상태에만 사용 (테마, 언어, 사이드바 접기, 다이얼로그 표시 등)
- DTO가 UI 모델을 직접 오염시켜서는 안 됨; 어댑터 / 매퍼를 거쳐야 함
- TanStack Query는 글로벌 `QueryCache` / `MutationCache`의 `onError` 콜백을 설정하여 401 리디렉션, 네트워크 오류 토스트 등을 통일 처리해야 함

### 7.3 스타일링 및 컴포넌트

- 스타일링 방법은 `CSS Modules` + Design Tokens + CSS Variables로 고정
- 런타임 CSS-in-JS 도입하지 않음
- 복잡한 인터랙티브 컴포넌트는 `Radix UI Primitives`를 기반으로 구축
- Radix Primitives는 동작과 접근성만 제공; 스타일은 CSS Modules과 design tokens으로 적용
- `Radix Themes` 또는 기타 프리스타일 패키지 도입하지 않음
- 기본 컴포넌트는 최소한 다음을 포함:
  - `Button`
  - `Input`
  - `Card`
  - `Modal`
  - `Table`
  - `Tag`
  - `Spinner`
  - `EmptyState`

### 7.4 프론트엔드 최소 기능

최소한 다음을 제공:

- 앱 Layout 골격
- 홈 페이지
- 404 페이지
- 테마 전환 컴포넌트
- 언어 전환 컴포넌트
- 글로벌 에러 바운더리
- `Loading / Empty / Error` 삼태 컴포넌트
- 사용자 목록 페이지
- 사용자 상세 페이지
- 사용자 생성 페이지 / 폼 페이지

### 7.5 테마 및 i18n

다음을 지원해야 함:

- 다크 / 라이트 테마
- 테마 영속화
- 시스템 테마를 기본 동작으로
- 중국어 / 영어
- 모든 사용자에게 보이는 텍스트는 i18n을 거쳐야 함
- 모든 디자인 값은 토큰을 사용해야 함
- 토큰은 최소한 `color`, `spacing`, `radius`, `shadow`, `typography`, `z-index`를 커버
- 색상 이름은 시맨틱이어야 함 (예: `--color-bg-default`, `--color-text-primary`)
- 비즈니스 컴포넌트에서 hex/rgb/hsl, 고정 간격, 고정 border-radius, 고정 그림자, 고정 폰트 크기 하드코딩 금지

### 7.6 접근성 및 라우트 성능

- 폼 컨트롤에는 연관된 label이 있어야 함
- 키보드로 탐색 가능
- 다이얼로그는 포커스 관리 지원
- 색상만으로 정보를 전달하지 않음
- 페이지 수준 라우트 컴포넌트는 기본적으로 `React.lazy` + `Suspense`

## 8. 라우팅 및 베이스 경로

### 8.1 라우팅 전략

- BrowserRouter 사용
- React Router `basename` 사용
- Vite `base` 사용
- 프론트엔드는 루트 경로 `/`에 배포됨을 가정하지 않음

### 8.2 필수 지원

- `https://domain.com/path/`
- `https://domain.com/path/users`
- `https://domain.com/path/users/123`

### 8.3 베이스 경로 정규화 규칙

다음 규칙을 명확히 구현하고 문서화:

- 베이스 경로는 `/` 또는 `/`로 시작하는 비루트 경로로 정규화해야 함
- 루트 경로 `/`를 제외하고, 후행 `/`는 허용하지 않음
- `""`, `"/"`, `"//"` 등의 비정상 입력은 설정 레이어에서 통일적으로 정규화해야 함
- React Router `basename`, Vite `base`, NestJS 정적 호스팅 경로, Swagger 경로는 모두 동일한 정규화 규칙을 따라야 함

### 8.4 Vite `base`와 React Router `basename`의 경계

두 가지 모드를 명확히 정의해야 하며, 혼합하지 않음. 기본은 "배포 후 변경 가능" 모드:

- 배포 후 변경 가능 모드 (기본):
  - Vite `base`를 `./`로 설정
  - React Router `basename`은 `window.__APP_CONFIG__.basePath` 또는 동등한 런타임 설정에서 읽음
  - NestJS가 `index.html`을 반환할 때 런타임 설정 주입
- 빌드 시 고정 모드 (폴백):
  - Vite `base`와 React Router `basename` 모두 `VITE_BASE_PATH`에서 읽을 수 있음
  - 이 모드에서는 배포 후 정적 자산 접두사를 동적으로 변경하면 안 됨
  - 이 모드로 전환하는 방법을 문서화

### 8.5 배포 설정

- 페이지 새로고침 시 404가 발생하면 안 됨
- 비 API 요청은 통일적으로 `index.html`로 폴백
- API 라우트와 SPA 라우트를 명확히 분리
- 권장 API 접두사: `${APP_BASE_PATH}/api/v1`
- Swagger UI 경로: `${APP_BASE_PATH}/api/docs`
- 배포 후 변경될 수 있는 프론트엔드 설정에는 런타임 주입 메커니즘 제공 (예: `window.__APP_CONFIG__`)
- 로컬 개발 시, Vite는 `server.proxy`를 설정하여 `/api` 또는 동등한 API 접두사를 백엔드 포트로 프록시하여 CORS 문제 회피

## 9. 백엔드 요구사항

### 9.1 DDD 범위

- 백엔드 핵심 비즈니스 모듈은 DDD 레이어링 사용
- 인프라스트럭처 및 글루 모듈은 과도한 추상화 회피
- `health`, `config`, `swagger`, `static hosting` 같은 모듈에 완전한 DDD 셸을 강제하지 않음

### 9.2 핵심 비즈니스 모듈 레이어링

핵심 비즈니스 모듈은 최소한 다음으로 분할:

- Domain
- Application
- Infrastructure
- Interfaces

요구사항:

- Domain은 Prisma, HTTP, NestJS 세부사항에 의존하지 않음
- Application은 유스케이스 오케스트레이션, 트랜잭션 경계, 캐시 조정 담당
- Infrastructure는 Prisma, Redis, Mapper, 외부 의존성 어댑터 배치
- Interfaces는 Controller, DTO, Presenter, 예외 매핑, Swagger 데코레이터 및 문서 노출 배치

### 9.3 백엔드 기본 기능

최소한 다음을 구현:

- `/health`
- `/ready`
- `/live`
- MySQL 연결
- Redis 연결
- 설정 로드 및 검증
- 글로벌 예외 필터
- 통일 응답 형식
- 요청 수준 로깅
- Swagger / OpenAPI
- migration
- seed

### 9.4 API 응답 및 에러 규약

다음을 통일해야 함:

- 성공 응답 구조
- 페이지네이션 응답 구조
- 에러 응답 구조

권장 필드는 최소한 다음을 포함:

- `success`
- `data`
- `message`
- `code`
- `requestId`
- `timestamp`

요구사항:

- Controller는 bare 객체를 임의로 반환해서는 안 됨
- 비즈니스 예외와 시스템 예외를 구분
- 글로벌 예외 필터로 에러 응답을 통일적으로 직렬화

## 10. Zod, OpenAPI 및 SDK

### 10.1 통일 Zod 전략

- Zod가 스키마의 단일 진실 소스
- `class-validator` / `class-transformer`를 혼합하지 않음
- 프론트엔드 폼, 공유 스키마, 환경 변수 검증은 모두 Zod 기반
- NestJS 요청 검증은 `nestjs-zod` 또는 동등한 `ZodValidationPipe`로 통일

### 10.2 NestJS와 OpenAPI 통합

명확히 정의해야 함:

- NestJS 측은 `nestjs-zod`로 요청 검증 처리
- 응답 직렬화도 Zod 접근 방식으로 통일
- OpenAPI 문서는 Zod와 일관된 브리징 접근 방식 사용
- `@nestjs/swagger` 사용 시, Zod 생성 문서의 후처리 파이프라인을 적절히 처리

### 10.3 SDK 생성

- 백엔드 OpenAPI 기반으로 SDK 자동 생성
- Orval 사용
- `packages/sdk`에 출력
- 프론트엔드는 주로 자동 생성된 SDK 소비
- 수작업 요청 레이어는 트랜스포트 설정과 인터셉터만 보유
- Orval의 TanStack Query 출력 모드를 우선하여 타입이 지정된 `useQuery` / `useMutation` 훅을 직접 생성 (기본 HTTP 클라이언트만 생성하는 것이 아님)
- `packages/sdk` 익스포트는 서브패스로 분할 권장:
  - `packages/sdk/types`: 순수 타입, 스키마, 기본 클라이언트 — React 의존성 없음
  - `packages/sdk/react`: TanStack Query 훅 — 프론트엔드 소비 전용
- 패키지 `exports`는 이러한 엔트리를 개별적으로 노출하여 비프론트엔드 소비자에게 React 의존성을 오염시키지 않음

### 10.4 생성 시퀀스

토폴로지 관계를 명확히 정의해야 함:

- 백엔드는 HTTP 서버를 시작하지 않고 OpenAPI spec을 내보낼 수 있는 스크립트 제공
- 예: `apps/server/openapi/openapi.json`에 내보내기
- 독립 CLI 스크립트 사용 가능: `NestFactory.create()`로 애플리케이션 생성하되 `app.listen()`은 호출하지 않고, `SwaggerModule.createDocument()`만 실행하여 JSON을 파일에 기록
- `sdk:generate`는 `server:openapi`에 의존해야 함
- `web:build`는 `sdk:generate`에 의존해야 함
- `turbo.json`에 이 태스크 의존 체인을 반영해야 함

## 11. 데이터 액세스, 캐싱 및 설정

### 11.1 Prisma

- Prisma + MySQL 사용
- Prisma 스키마는 Infrastructure에만 속함
- Prisma 클라이언트는 최종적으로 정규화된 `DATABASE_URL` 소비
- 로컬 개발에서 별도의 `MYSQL_*` 변수를 사용하는 경우, config 모듈에서만 조합 허용

### 11.2 마이그레이션 및 Seed 안전 전략

- 프로덕션 시작 시 파괴적 마이그레이션을 암묵적으로 실행하지 않음
- 개발, 테스트, 프로덕션 환경의 마이그레이션 명령을 분리
- Seed는 개발 / 테스트 환경에서만 명시적으로 트리거
- README 및 docs에서 데이터베이스 초기화, 마이그레이션, 리셋, Seed의 경계를 설명

### 11.3 Redis

- 통일 캐시 래퍼 제공
- Redis 클라이언트는 최종적으로 정규화된 `REDIS_URL` 소비
- 캐시 키 명명 규약을 명확히 정의
- 최소 1개의 실제 캐싱 예제 제공
- 최소한 다음을 구분: 쿼리 캐시, ID 기반 엔티티 캐시, 향후 인증/세션 확장, 향후 레이트 리밋 확장
- 비즈니스 코드에서 캐시 키를 임의로 결합하는 것을 금지

### 11.4 환경 변수

다음을 제공해야 함:

- `.env.example`
- `.env.development`
- `.env.test`
- `.env.production`

프론트엔드 빌드 시 변수:

- `VITE_APP_NAME`
- `VITE_DEFAULT_LOCALE`
- `VITE_DEFAULT_THEME`
- `VITE_BASE_PATH` (빌드 시 고정 모드 전용)

프론트엔드 런타임 주입 변수:

- `APP_RUNTIME_API_BASE_URL`
- `APP_RUNTIME_BASE_PATH`

설명:

- 이 두 값은 프론트엔드 빌드 시 환경 변수가 아님
- NestJS가 `index.html`을 반환할 때 `window.__APP_CONFIG__`에 주입
- 프론트엔드 `.env` 파일에 작성할 필요 없음
- 대응하는 서버 측 설정 소스는 백엔드 설정 레이어에서 집중적으로 선언 및 매핑

백엔드 변수:

- `PORT`
- `APP_BASE_PATH`
- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `SWAGGER_ENABLED`

요구사항:

- Zod로 환경 변수 검증
- 시작 시 페일 패스트
- 비즈니스 코드는 타입화된 설정 객체에만 의존
- 프론트엔드는 빌드 시 `VITE_` 변수만 직접 읽기 가능
- 배포 후 변경이 필요한 프론트엔드 설정은 런타임 주입으로 제공
- `.env.production`은 비민감 기본값만 저장
- 실제 프로덕션 비밀과 연결 문자열은 배포 환경에서 주입; 리포지토리에 커밋하지 않음
- 기본적으로 동일 오리진 배포 시, 프론트엔드는 상대 API 접두사를 직접 사용 (예: `/api/v1`)
- `APP_RUNTIME_API_BASE_URL`은 API와 프론트엔드가 다른 오리진에 배포될 때만 사용
- 동일 오리진 시, `CORS_ORIGIN`은 보통 활성화할 필요 없음; 프론트엔드와 백엔드가 크로스 오리진 배포될 때만 명시적으로 설정

## 12. 예제 비즈니스 모듈

빈 껍데기 프로젝트만 생성하지 마세요.

`User Management`를 완전한 예제 비즈니스 모듈로 사용하며, 최소한 다음을 포함:

- 사용자 목록 페이지
- 사용자 상세 페이지
- 사용자 생성 페이지 / 폼 페이지
- 사용자 도메인 모델
- 사용자 리포지토리 인터페이스
- 사용자 리포지토리 구현
- 사용자 유스케이스
- 사용자 컨트롤러
- migration
- seed
- Redis 캐싱 예제

최소 1개의 완전한 체인을 엔드투엔드로 연결:

- 프론트엔드 페이지
- SDK 호출
- 백엔드 Controller
- Application Use Case
- Repository
- MySQL
- Redis Cache

## 13. 테스트 전략

### 13.1 필수 완료

- 프론트엔드 단위 테스트
- 프론트엔드 컴포넌트 테스트
- MSW 기반 프론트엔드 모킹
- 백엔드 단위 테스트
- 백엔드 e2e 테스트
- `packages/shared` 테스트

### 13.2 테스트 도구 선택

- 기본적으로 단위 테스트, 통합 테스트, 백엔드 e2e 테스트에 Vitest 사용
- 실제 브라우저 엔드투엔드 테스트를 포함하는 경우 Playwright 추가
- 현재 NestJS 버전은 공식 Vitest 설정 경로를 제공; Vitest를 우선하고, 기본적으로 Jest로 회귀하지 않음
- 현재 의존성 버전에 명확한 호환성 블로커가 확인된 경우에만 `apps/server` e2e에 최소한의 Jest 예외를 허용하며, 이유를 명시

### 13.3 최소 테스트 커버리지 예제

최소한 다음을 보여줘야 함:

- 1개의 프론트엔드 컴포넌트 테스트
- 1개의 프론트엔드 페이지 또는 기능 테스트
- 1개의 백엔드 유스케이스 단위 테스트
- 1개의 백엔드 e2e 테스트
- 1개의 공유 스키마 / 유틸리티 테스트

## 14. Makefile, Docker 및 CI

### 14.1 Makefile

최소한 다음을 포함:

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
- `make db:migrate`
- `make db:seed`
- `make db:reset`
- `make db:studio`
- `make clean`
- `make docker-build`
- `make docker-run`

요구사항:

- `make help`는 주석을 자동으로 읽어 도움말 정보 출력
- `make setup`은 의존성 설치, env 파일 초기화, 훅 설치, 심볼릭 링크 생성 담당
- `make dev`는 `turbo dev`, `concurrently` 또는 동등한 방법으로 프론트엔드와 백엔드를 동시 시작
- `make dev`는 실행 전에 `mysql`과 `redis`가 사용 가능한지 확인해야 함; `docker compose up -d mysql redis`를 자동 실행하거나, 부재 시 명확한 프롬프트 표시
- `make check`는 최소한 `lint`, `knip`, `typecheck`, `test`, `build`를 체인
- 개발 단계에서 Prisma Studio를 실행하기 위한 `make db:studio` 제공

### 14.2 Turbo 설정

- `turbo.json`은 `build`, `test`, `generate-sdk`, `openapi` 등 태스크에 올바른 `outputs`를 선언해야 함
- Turbo의 태스크 의존성과 캐시 설정은 일반 엔지니어링 요구사항; CI에서만 고려하지 않음

### 14.3 Docker

요구사항:

- 프론트엔드와 백엔드는 최종적으로 하나의 이미지로 패키징
- 프론트엔드 빌드 산출물은 백엔드가 서빙
- `turbo prune` 사용
- `server`와 `web` 각각에 `turbo prune`을 실행하여 최소화된 워크스페이스 서브셋 획득
- 별도의 빌드 스테이지에서 `server`와 `web`을 빌드
- 최종 러너 이미지는 `server` 런타임 산출물과 `web` 정적 산출물만 포함
- 최종 런타임 이미지는 가능한 한 비 root 사용자 사용
- `docker-compose.yml`은 최소한 `mysql`, `redis` 포함
- `liveness`, `readiness`, `mysql / redis` 가용성 체크 포함

### 14.4 CI

`Should`로서, 최소한 다음을 포함:

- 의존성 설치
- pnpm / turbo 캐시
- lint
- typecheck
- test
- build
- 자동 생성 SDK가 최신인지 검증

## 15. 로깅 및 보안 베이스라인

### 15.1 로깅

- 백엔드는 기본적으로 `pino`로 구조화된 JSON 로그 출력
- 로그 필드는 최소한 `timestamp`, `level`, `service`, `module`, `action`, `requestId`, `message` 포함
- 에러 로그는 필요 시 `error`, `stack` 포함
- 비밀번호, 토큰, 연결 문자열, 기타 민감 정보를 로그에 출력하지 않음

### 15.2 보안 베이스라인

- CORS는 환경 변수로 제어
- 합리적인 HTTP 보안 헤더를 기본적으로 활성화
- 향후 인증, 레이트 리밋, 감사를 위한 확장 포인트 예약

## 16. 문서 및 협업 산출물

### 16.1 Must

최소한 다음을 생성:

- `README.md` (영어)
- `README.zh-CN.md` (중국어)
- `docs/frontend-architecture.md`
- `docs/backend-architecture.md`
- `docs/api-guidelines.md`
- `docs/deployment-guidelines.md`
- `docs/theme-guidelines.md`
- `docs/dependency-boundaries.md`
- `docs/logging-guidelines.md`

### 16.2 Should

여력이 있으면 생성:

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

추가 여력이 있으면 생성:

- `docs/adr/*`
- `.agents/skills/*`
- `.claude/skills -> .agents/skills`
- `.codex/skills -> .agents/skills`
- 추가 규약 문서

## 17. 출력 체크리스트

최소한 다음을 출력:

- 완전한 디렉토리 구조
- 루트 레벨 설정 파일
- `apps` 하위 프론트엔드 및 백엔드 코드
- `packages` 하위 공유 패키지 코드
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
- 완전한 예제 비즈니스 체인

## 18. 인수 및 검증

파일만 생성하고 완료를 선언하지 마세요. 다음 인수 항목을 실행하거나, 최소한 명시적으로 설계해야 합니다:

### 18.1 기본 인수

최소한 다음 명령 체인을 검증:

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

### 18.2 로컬 실행 인수

최소한 다음 체인이 작동하는지 확인:

- `make dev`로 프론트엔드와 백엔드를 동시에 시작 가능
- 프론트엔드 페이지에 접근 가능
- 백엔드 API에 접근 가능
- Swagger 문서에 접근 가능
- 사용자 목록 예제 체인이 작동

### 18.3 Docker 인수

최소한 다음 인수 프로세스를 설계하고 설명:

```bash
make docker-build
make docker-run
```

### 18.4 실패 처리

현재 환경에서 실제 검증을 완료할 수 없는 경우:

- 어떤 단계가 검증되었는지 명시
- 어떤 단계가 미검증인지 명시
- 미검증 내용을 "완료되고 실행 가능"으로 설명하지 않음

## 19. 최종 출력 스타일

- 직접 구현; 여러 대안을 제시하지 않음
- 완전하고, 실행 가능하며, 유지보수 가능한 프로젝트를 우선
- 주요 설계 결정을 설명하되, 출력이 순수 이론 설명이 되지 않도록 함
- 예제 코드는 동일한 비즈니스 시나리오를 중심으로
- `Should` / `Nice-to-have`가 미완료인 경우, 연기 항목으로 명시적으로 표시

전체 프로젝트 초기화를 시작하세요.

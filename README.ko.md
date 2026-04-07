# InitMonorepo

[English](README.md) | [中文](README.zh-CN.md) | [日本語](README.ja.md) | **한국어**

AI가 **프로덕션 수준의 풀스택 TypeScript Monorepo**를 한 번에 초기화할 수 있도록 반복 최적화된 LLM 프롬프트입니다.

## 생성되는 것

[PROMPT.ko.md](PROMPT.ko.md)를 LLM에 입력하면 다음을 포함하는 완전히 실행 가능한 프로젝트가 생성됩니다:

- **Monorepo 골격** — pnpm workspace + Turborepo + TypeScript Project References
- **프론트엔드** — React + Vite + BrowserRouter + FSD 아키텍처 + TanStack Query + Zustand + i18n + 라이트/다크 테마
- **백엔드** — NestJS + Prisma + MySQL + Redis + DDD 레이어링 + Pino 구조화 로깅
- **API 계약** — Zod 통합 스키마 → OpenAPI → Orval 자동 생성 타입 SDK
- **예제 비즈니스 모듈** — User Management 전체 흐름 (프론트엔드 페이지 → SDK → Controller → Use Case → Repository → MySQL/Redis)
- **엔지니어링 도구** — ESLint + Prettier + Husky + commitlint + Knip + Vitest + Makefile + Docker + CI
- **문서** — 영어 + 해당 언어 README 조합, 아키텍처 설명, 규약 문서, CLAUDE.md / AGENTS.md

## 사용 방법

1. [PROMPT.ko.md](PROMPT.ko.md)의 전체 내용을 복사
2. **빈 디렉토리**에서 LLM(Claude / ChatGPT / Gemini 등)에 프롬프트로 전송
3. 모델이 전체 프로젝트를 생성할 때까지 대기
4. 생성된 README에 따라 `make setup && make dev`를 실행하여 검증

## 프롬프트 설계 핵심

- **우선순위 레이어** (Must / Should / Nice-to-have) — 모델의 토큰 부족 시 실행 불가능한 미완성 결과물 방지
- **인수 기준** — 파일 생성만으로 완료를 선언하지 않고, 명령 체인의 실제 검증을 요구
- **경계 제약** — 엔지니어링 규칙(ESLint boundaries, package exports, 경로 별칭)으로 아키텍처 경계 강제
- **베이스 경로 정규화** — 비루트 경로 배포 지원 (런타임 주입 및 빌드 시 고정 모드)
- **상태 경계** — TanStack Query는 서버 상태 관리, Zustand는 UI 전역 상태만 관리
- **범위 제한 DDD** — 핵심 비즈니스 모듈은 DDD, 인프라 모듈은 과도한 추상화 회피

## 파일 안내

| 파일 | 설명 |
|---|---|
| [PROMPT.ko.md](PROMPT.ko.md) | LLM에 입력할 완전한 프롬프트 (한국어판) |
| [PROMPT.md](PROMPT.md) | 완전한 프롬프트 (영문 기본본) |
| [PROMPT.zh-CN.md](PROMPT.zh-CN.md) | 완전한 프롬프트 (중국어 원문) |
| [PROMPT.ja.md](PROMPT.ja.md) | 완전한 프롬프트 (일본어판) |
| [README.md](README.md) | 영문 프로젝트 소개 (기본) |
| [README.zh-CN.md](README.zh-CN.md) | 중국어 프로젝트 소개 |
| [README.ja.md](README.ja.md) | 일본어 프로젝트 소개 |
| [README.ko.md](README.ko.md) | 이 파일, 한국어 프로젝트 소개 |

## 개선 및 기여

프롬프트 내용을 조정하려면 [PROMPT.md](PROMPT.md) (영문 기본본) 또는 [PROMPT.zh-CN.md](PROMPT.zh-CN.md) (중국어 원문)을 편집하고, 필요하면 [PROMPT.ko.md](PROMPT.ko.md) 번역도 함께 동기화하세요.

## License

MIT

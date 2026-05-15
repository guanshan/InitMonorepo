/**
 * Public SDK surface. Re-exports the Orval-generated client so consumers go
 * through one entry point instead of hand-rolled fetch wrappers. Regenerate
 * via `pnpm codegen` whenever the OpenAPI document changes.
 */
export {
  ApiRequestError,
  configureSdkBaseUrl,
  customFetcher,
} from "./runtime/fetcher";
export * from "./generated/client";

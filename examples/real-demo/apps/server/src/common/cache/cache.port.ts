export class CacheUnavailableError extends Error {
  constructor(message = "Cache backend is unavailable.") {
    super(message);
    this.name = "CacheUnavailableError";
  }
}

export interface CachePort {
  delete: (key: string) => Promise<void>;
  get: <TValue>(key: string) => Promise<TValue | null>;
  getAndDelete: <TValue>(key: string) => Promise<TValue | null>;
  increment: (key: string, ttlSeconds?: number) => Promise<number | null>;
  isReady: () => Promise<boolean>;
  set: <TValue>(
    key: string,
    value: TValue,
    ttlSeconds?: number,
  ) => Promise<void>;
  /**
   * Like `set`, but throws `CacheUnavailableError` when the backend is offline.
   * Useful for security-critical writes (e.g. captcha challenges) where we
   * must fail closed rather than issue a value that can never be verified.
   */
  setStrict: <TValue>(
    key: string,
    value: TValue,
    ttlSeconds?: number,
  ) => Promise<void>;
}

export const CACHE_PORT = Symbol("CACHE_PORT");

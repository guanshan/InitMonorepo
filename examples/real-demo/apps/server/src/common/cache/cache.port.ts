export interface CachePort {
  delete: (key: string) => Promise<void>;
  get: <TValue>(key: string) => Promise<TValue | null>;
  isReady: () => Promise<boolean>;
  set: <TValue>(key: string, value: TValue, ttlSeconds?: number) => Promise<void>;
}

export const CACHE_PORT = Symbol("CACHE_PORT");

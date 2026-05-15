export const SETTINGS_REPOSITORY_PORT = Symbol("SETTINGS_REPOSITORY_PORT");

export interface SettingsRecord {
  value: string;
  updatedAt: Date;
}

export interface SettingsRepositoryPort {
  get(key: string): Promise<SettingsRecord | null>;
  /**
   * Insert if missing, replace if present. Used for the first-time seed and
   * any path where concurrent writes are acceptable.
   */
  upsert(key: string, value: string): Promise<SettingsRecord>;
  /**
   * Compare-and-swap: only writes if the row's `updatedAt` still matches the
   * timestamp the caller observed. Returns the updated record on success or
   * `null` if the row has moved on (another writer won the race).
   */
  compareAndSwap(
    key: string,
    expectedUpdatedAt: Date,
    nextValue: string,
  ): Promise<SettingsRecord | null>;
}

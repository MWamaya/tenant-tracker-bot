export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const loadViewState = <T>(storage: StorageLike, key: string, fallback: T): T => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
};

export const saveViewState = <T>(storage: StorageLike, key: string, state: T): void => {
  try {
    storage.setItem(key, JSON.stringify(state));
  } catch {
    // Private browsing, storage disabled, or quota exceeded — the table
    // just falls back to session-only (unsaved) view state.
  }
};

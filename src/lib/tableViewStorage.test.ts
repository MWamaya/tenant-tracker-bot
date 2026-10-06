import { describe, expect, it, vi } from 'vitest';
import { loadViewState, saveViewState, StorageLike } from './tableViewStorage';

const makeMemoryStorage = (): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
};

describe('saveViewState / loadViewState', () => {
  it('round-trips a saved value', () => {
    const storage = makeMemoryStorage();
    saveViewState(storage, 'my-key', { search: 'abc', count: 3 });
    const result = loadViewState(storage, 'my-key', { search: '', count: 0 });
    expect(result).toEqual({ search: 'abc', count: 3 });
  });

  it('returns the fallback when nothing is stored', () => {
    const storage = makeMemoryStorage();
    const fallback = { search: '', count: 0 };
    expect(loadViewState(storage, 'missing-key', fallback)).toEqual(fallback);
  });

  it('returns the fallback when the stored value is corrupt JSON', () => {
    const storage = makeMemoryStorage();
    storage.data['bad-key'] = '{not json';
    const fallback = { search: '', count: 0 };
    expect(loadViewState(storage, 'bad-key', fallback)).toEqual(fallback);
  });

  it('returns the fallback without throwing when getItem throws', () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('storage disabled');
      },
      setItem: () => {},
    };
    const fallback = { search: '', count: 0 };
    expect(() => loadViewState(storage, 'any-key', fallback)).not.toThrow();
    expect(loadViewState(storage, 'any-key', fallback)).toEqual(fallback);
  });

  it('does not throw when setItem throws (quota exceeded, private mode)', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    expect(() => saveViewState(storage, 'any-key', { a: 1 })).not.toThrow();
  });
});

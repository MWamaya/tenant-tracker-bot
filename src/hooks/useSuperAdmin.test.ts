import { createElement } from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SuperAdminProvider, useSuperAdmin } from './useSuperAdmin';

const mocks = vi.hoisted(() => ({
  authorized: true,
  auth: { user: { id: 'admin-1' }, session: { access_token: 'session-1' } },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: mocks.auth.user } }) },
  from: () => {
    const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: { role: 'SUPER_ADMIN' }, error: null }) };
    return chain;
  },
  rpc: async () => ({ data: mocks.authorized, error: null }),
} }));

let state: ReturnType<typeof useSuperAdmin>;
let renderer: ReactTestRenderer;
function Probe() { state = useSuperAdmin(); return null; }
const tree = () => createElement(SuperAdminProvider, null, createElement(Probe));

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', new EventTarget());
  mocks.authorized = true;
  mocks.auth.session = { access_token: 'session-1' };
  await act(async () => { renderer = create(tree()); });
  expect(state.isSuperAdmin).toBe(true);
});
afterEach(() => {
  act(() => renderer.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('admin authorization lifecycle', () => {
  it('drops expired approval while account identity stays unchanged', async () => {
    mocks.authorized = false;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(state.isSuperAdmin).toBe(false);
    expect(state.hasAdminRole).toBe(true);
  });
  it('rechecks a replaced session for the same account', async () => {
    mocks.authorized = false;
    mocks.auth.session = { access_token: 'session-2' };
    await act(async () => { renderer.update(tree()); });
    expect(state.isSuperAdmin).toBe(false);
  });
  it('notices remote approval invalidation when browser regains focus', async () => {
    mocks.authorized = false;
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(state.isSuperAdmin).toBe(false);
  });
});

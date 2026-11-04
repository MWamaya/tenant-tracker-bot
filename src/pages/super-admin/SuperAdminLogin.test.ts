import { createElement } from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SuperAdminLogin from './SuperAdminLogin';

const mocks = vi.hoisted(() => ({ signOut: vi.fn(async () => {}), invoke: vi.fn(), navigate: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({
  user: null, loading: false, signIn: async () => ({ error: null }), signOut: mocks.signOut, resetPassword: vi.fn(),
}) }));
vi.mock('@/hooks/useSuperAdmin', () => ({ useSuperAdmin: () => ({ isSuperAdmin: false, loading: false, checkSuperAdmin: async () => true }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
let renderer: ReactTestRenderer;
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.invoke.mockResolvedValueOnce({ data: { required: true }, error: null });
  await act(async () => { renderer = create(createElement(SuperAdminLogin)); });
  act(() => {
    renderer.root.findByProps({ id: 'email' }).props.onChange({ target: { value: 'admin@example.com' } });
    renderer.root.findByProps({ id: 'password' }).props.onChange({ target: { value: 'password123' } });
  });
  await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  expect(renderer.root.findByProps({ id: 'otp' })).toBeDefined();
});
afterEach(() => act(() => renderer.unmount()));

it('retains password session after resend cooldown and can verify existing code', async () => {
  mocks.invoke.mockResolvedValueOnce({ data: null, error: { message: 'Rate limited', context: new Response(null, { status: 429 }) } });
  const resend = renderer.root.findAllByType('button').find((button) => button.children.includes('Resend code'))!;
  await act(async () => { await resend.props.onClick(); });
  expect(mocks.signOut).not.toHaveBeenCalled();
  mocks.invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });
  act(() => renderer.root.findByProps({ id: 'otp' }).props.onChange({ target: { value: '123456' } }));
  await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  expect(mocks.navigate).toHaveBeenCalledWith('/app/super-admin');
});

it('returns to password form when resend reports an invalid session', async () => {
  mocks.invoke.mockResolvedValueOnce({ data: null, error: { message: 'Unauthorized', context: new Response(null, { status: 401 }) } });
  const resend = renderer.root.findAllByType('button').find((button) => button.children.includes('Resend code'))!;
  await act(async () => { await resend.props.onClick(); });
  expect(mocks.signOut).toHaveBeenCalledOnce();
  expect(renderer.root.findAllByProps({ id: 'otp' })).toHaveLength(0);
  expect(renderer.root.findByProps({ id: 'email' })).toBeDefined();
});

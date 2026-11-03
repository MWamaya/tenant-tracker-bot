import { createElement } from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GetStarted from './GetStarted';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), focus: vi.fn(), scroll: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('@/components/seo/PageSeo', () => ({ PageSeo: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
let renderer: ReactTestRenderer;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('window', { scrollTo: mocks.scroll });
  mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
});
afterEach(() => { if (renderer) act(() => renderer.unmount()); vi.unstubAllGlobals(); });
async function mount(query: string) {
  await act(async () => {
    renderer = create(createElement(MemoryRouter, { initialEntries: [`/get-started?plan=Starter${query}`] }, createElement(GetStarted)), {
      createNodeMock: (element) => element.type === 'h1' ? { focus: mocks.focus } : null,
    });
  });
}
it('shows the selected annual total and retains annual intent in the request', async () => {
  await mount('&billing=annual');
  expect(JSON.stringify(renderer.toJSON())).toContain('12,000');
  act(() => {
    for (const [id, value] of [['fullName', 'Jane Wanjiru'], ['phone', '0712345678'], ['email', 'jane@example.com']]) {
      renderer.root.findByProps({ id }).props.onChange({ target: { value } });
    }
  });
  await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  expect(mocks.invoke).toHaveBeenCalledWith('onboarding-submit', {
    body: { fullName: 'Jane Wanjiru', phone: '0712345678', email: 'jane@example.com', plan: 'Starter', billingPeriod: 'annual', website: '' },
  });
});
it('starts new signup at the heading rather than inherited deep-scroll position', async () => {
  await mount('');
  expect(mocks.scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  expect(mocks.focus).toHaveBeenCalledWith({ preventScroll: true });
});
it('keeps monthly pricing for links without an annual choice', async () => {
  await mount('');
  expect(JSON.stringify(renderer.toJSON())).toContain('1,250');
});

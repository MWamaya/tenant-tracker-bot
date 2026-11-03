import { createElement } from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Landing from './Landing';
vi.mock('@/components/seo/PageSeo', () => ({ PageSeo: () => null }));
vi.mock('@/hooks/useInView', () => ({ useInView: () => ({ ref: null, inView: true }) }));
let renderer: ReactTestRenderer;
function text(element: ReactTestInstance): string {
  return element.children.map(child => typeof child === 'string' ? child : text(child)).join('');
}
beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { innerHeight: 844, scrollY: 0 }));
  vi.stubGlobal('document', { documentElement: { scrollHeight: 8000 } });
  await act(async () => { renderer = create(createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, createElement(Landing))); });
});
afterEach(() => { act(() => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('carries annual billing to the plan request link', () => {
  const annual = renderer.root.findAllByType('button').find(button => text(button).startsWith('Annual'))!;
  act(() => annual.props.onClick());
  const starter = renderer.root.findAllByType('a').find(link => text(link) === 'Choose Starter')!;
  expect(starter.props.href).toBe('/get-started?plan=Starter&billing=annual');
});
it('keeps a manually selected dashboard panel visible while visitor reads', async () => {
  const payments = renderer.root.findAllByType('button').find(button => text(button) === 'Payments')!;
  act(() => payments.props.onClick());
  await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
  expect(renderer.root.findAllByType('h3').some(heading => text(heading) === 'Payments')).toBe(true);
});

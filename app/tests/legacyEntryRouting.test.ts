import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';

const probe = vi.hoisted(() => ({
  clientInitializations: 0,
  redirects: [] as Array<{ to: string; replace?: boolean; state?: unknown }>,
  guard: null as null | { session: object | null; loading: boolean }
}));

// No real credentials or network: keep the production Supabase module and its
// import-time initialization, but replace the SDK's createClient boundary.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    probe.clientInitializations++;
    return { auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    } };
  }
}));

vi.mock('../src/auth/AuthProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/auth/AuthProvider')>();
  return { ...actual, useAuth: () => probe.guard ?? actual.useAuth() };
});

// SSR does not run Navigate's client effect. Observe the real matched route's
// Navigate request instead; browser smoke separately verifies actual redirects.
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, Navigate: (props: { to: string; replace?: boolean; state?: unknown }) => {
    probe.redirects.push(props);
    return null;
  } };
});

async function renderRoute(path: string) {
  const { App } = await import('../src/App');
  const stream = await renderToReadableStream(createElement(MemoryRouter, { initialEntries: [path] }, createElement(App)));
  await stream.allReady;
  return new Response(stream).text();
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:1');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'synthetic-public-fixture');
  probe.clientInitializations = 0;
  probe.redirects = [];
  probe.guard = null;
});

afterEach(() => { vi.unstubAllEnvs(); });

describe('root callback route matching and exact parameter preservation', () => {
  const callbacks = [
    ['query code', '/?code=fixture-code'],
    ['query error', '/?error=access_denied&error_description=fixture'],
    ['query error code', '/?error_code=fixture'],
    ['query error description', '/?error_description=fixture'],
    ['hash access token', '/#access_token=fixture&type=signup'],
    ['hash refresh token', '/#refresh_token=fixture'],
    ['hash error', '/#error=fixture'],
    ['hash error code', '/#error_code=fixture'],
    ['hash error description', '/#error_description=fixture'],
    ['hash type', '/#type=signup'],
    ['mixed encoded and duplicate parameters', '/?code=a%2Bb&extra=one+two&extra=%20#access_token=fixture&refresh_token=fixture&type=signup']
  ];
  it.each(callbacks)('%s reaches confirm with raw query/hash intact', async (_label, path) => {
    await renderRoute(path);
    expect(probe.redirects.length).toBe(1);
    // Boolean comparisons avoid printing callback material if an assertion fails.
    expect(probe.redirects[0].to === `/auth/confirm${path.slice(1)}`).toBe(true);
    expect(probe.redirects[0].replace).toBe(true);
    expect(probe.clientInitializations).toBe(0);
    probe.redirects = [];
    const markup = await renderRoute(`/auth/confirm${path.slice(1)}`);
    expect(markup).toContain('帳號確認');
    expect(markup).toContain('備份心舊版流程');
    expect(probe.redirects).toHaveLength(0);
    expect(probe.clientInitializations).toBe(1);
  });

  it.each(['/', '/?utm_source=test', '/?discount_code=fixture', '/?next=code%3Dfixture', '/not-a-route', '/not-a-route?code=fixture'])('ordinary entry %s redirects only to WinWin without loading Legacy', async (path) => {
    await renderRoute(path);
    expect(probe.redirects).toEqual([{ to: '/v2/prototype', replace: true }]);
    expect(probe.clientInitializations).toBe(0);
    probe.redirects = [];
    expect(await renderRoute('/v2/prototype')).toContain('選擇你想體驗的流程');
    expect(probe.redirects).toHaveLength(0);
    expect(probe.clientInitializations).toBe(0);
  });

  it.each(['/v2/prototype', '/v2/prototype?code=ordinary-ui-value', '/v2/prototype/register'])('renders WinWin %s even with no Legacy environment', async (path) => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    const markup = await renderRoute(path);
    expect(markup).toContain('WinWin');
    expect(markup).not.toContain('備份心舊版流程');
    expect(probe.redirects).toHaveLength(0);
    expect(probe.clientInitializations).toBe(0);
  });
});

describe('Legacy lazy layout, singleton and existing guard', () => {
  it('loads Auth on demand and shares one client with confirm', async () => {
    expect(await renderRoute('/v2/prototype')).toContain('選擇你想體驗的流程');
    expect(probe.clientInitializations).toBe(0);
    const auth = await renderRoute('/auth');
    expect(auth).toContain('登入備份心');
    expect(auth).toContain('不代表 WinWin 現行產品流程');
    expect(probe.clientInitializations).toBe(1);
    expect(await renderRoute('/auth/confirm')).toContain('帳號確認');
    expect(probe.clientInitializations).toBe(1);
    expect(probe.redirects).toHaveLength(0);
  });

  const protectedPaths = ['/app', '/scenario', '/setup/receiver', '/setup/tasks', '/setup/sources', '/setup/assignments', '/setup/backups', '/setup/handoffs', '/handoffs/print'];
  it.each(protectedPaths)('preserves the signed-out guard and Legacy boundary at %s', async (path) => {
    probe.guard = { session: null, loading: false };
    const markup = await renderRoute(path);
    expect(markup).toContain('備份心舊版流程');
    expect(probe.redirects).toEqual([{ to: '/auth', replace: true, state: { from: path } }]);
    expect(probe.clientInitializations).toBe(1);
  });

  it('retains the loading guard instead of showing protected content', async () => {
    const markup = await renderRoute('/scenario');
    expect(markup).toContain('正在確認登入狀態');
    expect(probe.redirects).toHaveLength(0);
  });

  it('allows the original guard to render its outlet for a signed-in session', async () => {
    probe.guard = { session: {}, loading: false };
    const { RequireAuth } = await import('../src/auth/RequireAuth');
    const markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/protected'] },
      createElement(Routes, null, createElement(Route, { element: createElement(RequireAuth) },
        createElement(Route, { path: '/protected', element: createElement('p', null, 'protected-fixture') })))));
    expect(markup).toContain('protected-fixture');
    expect(probe.redirects).toHaveLength(0);
  });

  it('provides accessible WinWin loading and safe import-error recovery', async () => {
    const { LegacyLoading, LegacyLoadBoundary } = await import('../src/auth/LegacyLoadBoundary');
    const loading = renderToStaticMarkup(createElement(LegacyLoading));
    expect(loading).toContain('role="status"');
    expect(loading).toContain('WinWin');
    const boundary = new LegacyLoadBoundary({ children: createElement(Outlet) as ReactNode });
    boundary.state = LegacyLoadBoundary.getDerivedStateFromError();
    const failed = renderToStaticMarkup(boundary.render());
    expect(failed).toContain('role="alert"');
    expect(failed).toContain('重新載入');
    expect(failed).toContain('href="/v2/prototype"');
    expect(failed).not.toContain('fixture');
  });
});

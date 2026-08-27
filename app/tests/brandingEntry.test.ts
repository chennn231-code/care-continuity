import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DEFAULT_PRODUCT_PATH } from '../src/App';
import { LegacyBoundary } from '../src/components/LegacyBoundary';
import { BASE_DOCUMENT_TITLE, BASE_META_DESCRIPTION, V2_DOCUMENT_TITLE } from '../src/v2/data/branding';

describe('WinWin default entry and legacy boundary', () => {
  it('uses the WinWin prototype as both the root and unknown-route destination', () => {
    expect(DEFAULT_PRODUCT_PATH).toBe('/v2/prototype');
  });

  it('keeps auth as a directly addressable legacy route with an accessible return link', () => {
    const markup = renderToStaticMarkup(createElement(
      MemoryRouter,
      { initialEntries: ['/auth'] },
      createElement(
        Routes,
        null,
        createElement(Route, { element: createElement(LegacyBoundary) },
          createElement(Route, { path: '/auth', element: createElement('p', null, '舊版登入') }))
      )
    ));

    expect(markup).toContain('備份心舊版流程');
    expect(markup).toContain('不代表 WinWin 現行產品流程');
    expect(markup).toContain('href="/v2/prototype"');
  });

  it('uses WinWin base metadata and a deterministic prototype title lifecycle', () => {
    expect(BASE_DOCUMENT_TITLE).toBe('WinWin｜高齡支持照顧系統');
    expect(BASE_META_DESCRIPTION).toBe('WinWin以長者為中心，連結家屬與專業照護團隊，支援照顧更新、交接與行動協作。');
    expect(V2_DOCUMENT_TITLE).toBe('WinWin v2 流程展示');
  });
});

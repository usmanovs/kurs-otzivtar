import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {Analytics} from '@vercel/analytics/react';
import {SpeedInsights} from '@vercel/speed-insights/react';
import { AppRoutes } from './AppRoutes.tsx';
import { PrerenderContext, readPrerenderPayload } from './lib/prerenderData.tsx';
import { langFromPath } from './lib/i18n.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const tree = (
  <StrictMode>
    <PrerenderContext.Provider value={readPrerenderPayload()}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Analytics />
      {/* Real-user LCP/FCP from actual devices. Synthetic loads from a fast
          desktop said the site was quick; this reports what visitors on mid-range
          phones in Kyrgyzstan actually wait for. */}
      <SpeedInsights />
    </PrerenderContext.Provider>
  </StrictMode>
);

const container = document.getElementById('root')!;
// Prerendered HTML carries its language (data-lang) and path. Hydrate only
// when both match this URL — the language comes from the URL prefix, so that
// is the same thing — and it wasn't a modal visit;
// otherwise a clean client render avoids a hydration mismatch.
const prerendered = container.dataset.prerendered === '1';
const modalVisit = (window.history.state?.usr as { modal?: boolean } | undefined)?.modal;
const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
if (prerendered && !modalVisit && container.dataset.path === pathname && container.dataset.lang === langFromPath(window.location.pathname)) {
  hydrateRoot(container, tree);
} else {
  container.innerHTML = '';
  createRoot(container).render(tree);
}

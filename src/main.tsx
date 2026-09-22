import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route, useLocation} from 'react-router-dom';
import {Analytics} from '@vercel/analytics/react';
import {SpeedInsights} from '@vercel/speed-insights/react';
import App from './App.tsx';
import { AboutFeaturesPage } from './components/AboutFeaturesPage.tsx';
import { AllReviewsPage } from './components/AllReviewsPage.tsx';
import { AnalyticsPage } from './components/AnalyticsPage.tsx';
import { NotFoundPage } from './components/NotFoundPage.tsx';
import { TeacherPage } from './components/TeacherPage.tsx';
import { CategoryPage } from './components/CategoryPage.tsx';
import { PrerenderContext, readPrerenderPayload } from './lib/prerenderData.tsx';
import { readStoredLang } from './lib/lang.ts';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

/**
 * A click inside the app opens the teacher as a modal over the homepage (the
 * link carries state.modal); a direct visit — Google, a shared link, a
 * category page — gets the standalone profile page.
 */
function TeacherRoute() {
  const location = useLocation();
  return (location.state as { modal?: boolean } | null)?.modal ? <App /> : <TeacherPage />;
}

const tree = (
  <StrictMode>
    <PrerenderContext.Provider value={readPrerenderPayload()}>
      <BrowserRouter>
        <Routes>
          <Route path="/teacher/:teacherId" element={<TeacherRoute />} />
          <Route path="/category/:categorySlug" element={<CategoryPage />} />
          <Route path="/about" element={<AboutFeaturesPage />} />
          <Route path="/reviews" element={<AllReviewsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/" element={<App />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
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
// Prerendered HTML is Kyrgyz unless told otherwise. Hydrate only when the
// visitor's language matches what was rendered, the HTML is for this very
// path, and it wasn't a modal visit;
// otherwise a clean client render avoids a hydration mismatch.
const prerendered = container.dataset.prerendered === '1';
const modalVisit = (window.history.state?.usr as { modal?: boolean } | undefined)?.modal;
const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
if (prerendered && !modalVisit && container.dataset.path === pathname && container.dataset.lang === readStoredLang()) {
  hydrateRoot(container, tree);
} else {
  container.innerHTML = '';
  createRoot(container).render(tree);
}

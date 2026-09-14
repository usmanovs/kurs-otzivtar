import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Analytics} from '@vercel/analytics/react';
import {SpeedInsights} from '@vercel/speed-insights/react';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/teacher/:teacherId" element={<App />} />
        <Route path="/category/:categorySlug" element={<App />} />
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
    {/* Real-user LCP/FCP from actual devices. Synthetic loads from a fast
        desktop said the site was quick; this reports what visitors on mid-range
        phones in Kyrgyzstan actually wait for. */}
    <SpeedInsights />
  </StrictMode>,
);

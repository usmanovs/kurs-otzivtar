import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Analytics} from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

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
  </StrictMode>,
);

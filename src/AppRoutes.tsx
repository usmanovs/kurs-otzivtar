import { Routes, Route, useLocation } from 'react-router-dom';
import App from './App';
import { AboutFeaturesPage } from './components/AboutFeaturesPage';
import { AllReviewsPage } from './components/AllReviewsPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { NotFoundPage } from './components/NotFoundPage';
import { TeacherPage } from './components/TeacherPage';
import { CategoryPage } from './components/CategoryPage';
import { FaqPage } from './components/FaqPage';
import { LangProvider } from './lib/i18n';

/**
 * A click inside the app opens the teacher as a modal over the homepage (the
 * link carries state.modal); a direct visit — Google, a shared link, a
 * category page — gets the standalone profile page.
 */
function TeacherRoute() {
  const location = useLocation();
  return (location.state as { modal?: boolean } | null)?.modal ? <App /> : <TeacherPage />;
}

/**
 * Every page exists twice: Kyrgyz at /…, Russian at /ru/…. The page reads its
 * language from the URL (see lib/i18n), so the same component serves both.
 * Shared by the browser entry (main.tsx) and the build-time prerender, so the
 * static HTML and the client always resolve routes identically.
 */
export function AppRoutes() {
  return (
    <LangProvider>
      <Routes>
        {['', '/ru'].flatMap((prefix) => [
          <Route key={`${prefix}/`} path={prefix || '/'} element={<App />} />,
          <Route key={`${prefix}/teacher`} path={`${prefix}/teacher/:teacherId`} element={<TeacherRoute />} />,
          <Route key={`${prefix}/category`} path={`${prefix}/category/:categorySlug`} element={<CategoryPage />} />,
          <Route key={`${prefix}/about`} path={`${prefix}/about`} element={<AboutFeaturesPage />} />,
          <Route key={`${prefix}/faq`} path={`${prefix}/faq`} element={<FaqPage />} />,
          <Route key={`${prefix}/reviews`} path={`${prefix}/reviews`} element={<AllReviewsPage />} />,
          <Route key={`${prefix}/analytics`} path={`${prefix}/analytics`} element={<AnalyticsPage />} />,
        ])}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LangProvider>
  );
}

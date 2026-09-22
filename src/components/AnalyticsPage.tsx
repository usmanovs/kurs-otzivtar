import React, { useEffect, useState } from 'react';
import { readStoredLang } from '../lib/lang';
import { Link } from 'react-router-dom';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { Teacher } from '../types';
import { fetchTeachers } from '../lib/api';
import { StatsSection } from './StatsSection';
import { usePrerenderData } from '../lib/prerenderData';
import { setPageMeta } from '../lib/pageMeta';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';


/**
 * The full analytics dashboard as its own route — previously a heavy block
 * on the homepage. Fetches its own teacher data since this page renders
 * outside the main App component, same as /about and /reviews.
 */
export const AnalyticsPage: React.FC = () => {
  const [currentLang] = useState<SupportedLang>(readStoredLang);
  const t = TRANSLATIONS[currentLang];
  const p = t.analyticsPage;

  // Seeded from the prerendered payload so the static HTML has the dashboard;
  // the fetch below still refreshes it, without flashing the spinner.
  const seed = usePrerenderData('/analytics')?.teachers;
  const [teachers, setTeachers] = useState<Teacher[]>(seed ?? []);
  const [isLoading, setIsLoading] = useState(!seed);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setPageMeta({ title: `${p.title} — Kursotzyv.org`, description: p.intro, path: '/analytics' });
  }, [p]);

  useEffect(() => {
    fetchTeachers()
      .then((data) => setTeachers(data))
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {p.backBtn}
          </Link>
          <nav aria-label="breadcrumb" className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
            <Link to="/" className="hover:text-indigo-600 transition-colors">
              {p.breadcrumbHome}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-600 font-medium">{p.breadcrumbCurrent}</span>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {p.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-3">{p.intro}</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {!isLoading && loadError && (
          <div className="text-center py-16 text-sm text-slate-500">{p.loadError}</div>
        )}

        {!isLoading && !loadError && (
          <StatsSection
            teachers={teachers}
            currentLang={currentLang}
            hideOwnHeader
            onOpenAddReview={() => {
              window.location.href = '/#write-review';
            }}
          />
        )}
      </main>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { readStoredLang } from '../lib/lang';
import { Link } from 'react-router-dom';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { AlertTriangle } from 'lucide-react';


/**
 * Catches any path that doesn't match a real route (typo'd links, dead
 * bookmarks, crawler noise). Without this, React Router renders nothing at
 * all for an unmatched path — a blank page is worse than a clear 404, and
 * gives search engines no signal not to index it.
 */
export const NotFoundPage: React.FC = () => {
  const [currentLang] = useState<SupportedLang>(readStoredLang);
  const t = TRANSLATIONS[currentLang];

  useEffect(() => {
    document.title = `${t.categoryNotFound.title} — Kursotzyv.org`;
    let tag = document.querySelector('meta[name="robots"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'robots');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', 'noindex');
    return () => {
      document.querySelector('meta[name="robots"]')?.remove();
    };
  }, [t]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-1.5">404</h1>
        <p className="text-sm text-slate-500 mb-6">{t.categoryNotFound.message}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-colors shadow-xs"
        >
          {t.categoryNotFound.backLink}
        </Link>
      </div>
    </div>
  );
};

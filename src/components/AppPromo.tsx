import React from 'react';
import { Smartphone } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useLang } from '../lib/i18n';
import { APP_NAME, PLAY_STORE_URL } from '../lib/site';

/**
 * "Download the Android app" — a block on the homepage, a compact strip on the
 * standalone teacher/category pages (which is where search visitors land).
 */
export const AppPromo: React.FC<{ variant?: 'block' | 'compact' }> = ({ variant = 'block' }) => {
  const t = TRANSLATIONS[useLang()].appPromo;

  if (variant === 'compact') {
    return (
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-slate-700 hover:border-indigo-300 transition-colors"
      >
        <Smartphone className="w-5 h-5 text-indigo-600 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="font-semibold text-slate-900">{APP_NAME}</span> — {t.button}
        </span>
      </a>
    );
  }

  return (
    <section aria-labelledby="app-promo-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 sm:p-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <Smartphone className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="app-promo-title" className="text-lg font-bold text-slate-900">
            {t.title} — {APP_NAME}
          </h2>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">{t.body}</p>
        </div>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shrink-0"
        >
          {t.button}
        </a>
      </div>
    </section>
  );
};

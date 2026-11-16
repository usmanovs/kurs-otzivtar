import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { Link, localePath, useLang } from '../lib/i18n';
import { setPageMeta } from '../lib/pageMeta';
import { breadcrumbJsonLd, faqJsonLd } from '../lib/structuredData';
import { PLAY_STORE_URL } from '../lib/site';
import { JsonLd } from './JsonLd';
import { AppPromo } from './AppPromo';

/**
 * Plain, visible question-and-answer text. Answer engines quote pages that
 * answer a question directly, and the FAQPage markup below must match what is
 * on screen, so every answer is rendered in full (no collapsed accordions).
 */
export const FaqPage: React.FC = () => {
  const lang = useLang();
  const f = TRANSLATIONS[lang].faqPage;

  useEffect(() => {
    setPageMeta({ title: f.metaTitle, description: f.metaDescription, path: localePath('/faq', lang) });
  }, [f, lang]);

  const crumbs = [
    { name: f.breadcrumbHome, path: '/' },
    { name: f.title, path: '/faq' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <JsonLd data={faqJsonLd(f.items, lang)} />
      <JsonLd data={breadcrumbJsonLd(crumbs, lang)} />
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {f.backHome}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">{f.title}</h1>
        <p className="text-sm sm:text-base text-slate-500 mt-2">{f.intro}</p>

        <div className="mt-8 space-y-4">
          {f.items.map((item) => (
            <section key={item.q} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-base font-bold text-slate-900">{item.q}</h2>
              <p className="mt-2 text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                {item.a.split(/(Google Play)/).map((part, i) =>
                  part === 'Google Play' ? (
                    <a key={i} href={PLAY_STORE_URL} target="_blank" rel="noopener" className="font-semibold text-indigo-600 hover:underline">
                      {part}
                    </a>
                  ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                  )
                )}
              </p>
            </section>
          ))}
        </div>

        <AppPromo variant="compact" />
      </main>
    </div>
  );
};

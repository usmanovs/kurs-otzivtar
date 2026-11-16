import React from 'react';
import { Check } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useLang } from '../lib/i18n';
import { APP_NAME, PLAY_STORE_URL } from '../lib/site';

/**
 * A phone frame around a real screenshot from the Google Play listing. The
 * caller positions it (it is always passed `absolute`); a base `relative` here
 * would beat that in Tailwind's CSS order and drop the phone into normal flow.
 */
const Phone: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = '' }) => (
  <div className={`rounded-[1.9rem] bg-slate-900 p-[6px] shadow-2xl shadow-indigo-900/25 ring-1 ring-slate-900/10 ${className}`}>
    <span aria-hidden="true" className="absolute left-1/2 top-[10px] z-10 h-[5px] w-12 -translate-x-1/2 rounded-full bg-slate-700" />
    <img
      src={src}
      alt={alt}
      width={360}
      height={640}
      loading="lazy"
      decoding="async"
      className="block w-full rounded-[1.55rem] bg-white object-cover object-top"
    />
  </div>
);

/** Play-style triangle, drawn inline (no external asset). */
const PlayGlyph: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
    <path d="M4 2.6v18.8c0 .5.5.8.9.5L21 12 4.9 2.1c-.4-.3-.9 0-.9.5Z" fill="currentColor" />
  </svg>
);

/**
 * "Download the Android app" — a showcase on the homepage (real app screenshots
 * in phone frames), a compact strip on the standalone teacher/category pages
 * (which is where search visitors land).
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
        <img src="/app/icon.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg shrink-0" loading="lazy" />
        <span className="min-w-0">
          <span className="font-semibold text-slate-900">{APP_NAME}</span> — {t.button}
        </span>
      </a>
    );
  }

  return (
    <section aria-labelledby="app-promo-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" />

        <div className="relative grid items-center gap-8 px-6 pt-8 sm:px-10 sm:pt-10 lg:grid-cols-[1.15fr_1fr] lg:pt-0">
          <div className="lg:py-12">
            <div className="flex items-center gap-3">
              <img
                src="/app/icon.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl shadow-md shadow-indigo-500/20 ring-1 ring-slate-900/5"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{t.kicker}</p>
                <p className="text-sm font-bold text-slate-900">{APP_NAME}</p>
              </div>
            </div>

            <h2 id="app-promo-title" className="mt-5 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">
              {t.headline}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">{t.body}</p>

            <ul className="mt-5 space-y-2">
              {t.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener"
              className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 hover:shadow-xl"
            >
              <PlayGlyph />
              <span className="text-left leading-tight">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-white/70">{t.caption}</span>
                <span className="block text-base font-bold">Google Play</span>
              </span>
            </a>
            <p className="sr-only">{t.button}</p>
          </div>

          {/* Phones are cropped by the card's bottom edge on purpose — it reads as "scroll for more". */}
          <div className="relative mx-auto h-[300px] w-full max-w-[360px] sm:h-[340px] lg:h-[420px] lg:max-w-none">
            <Phone
              src="/app/phone-list.jpg"
              alt={t.imgAlt}
              className="absolute left-[8%] top-8 w-[44%] max-w-[190px] -rotate-6 opacity-95 sm:left-[14%] lg:left-[6%] lg:top-14 lg:max-w-[210px]"
            />
            <Phone
              src="/app/phone-home.jpg"
              alt={t.imgAlt}
              className="absolute right-[8%] top-3 w-[48%] max-w-[210px] rotate-3 sm:right-[14%] lg:right-[6%] lg:top-6 lg:max-w-[240px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

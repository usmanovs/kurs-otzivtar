import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SupportedLang, TRANSLATIONS } from '../translations';
import {
  ShieldCheck,
  EyeOff,
  FileCheck,
  Calculator,
  ShieldAlert,
  Star,
  MessageSquareReply,
  Wallet,
  Mail,
  User,
  Timer,
  ArrowLeft,
  GraduationCap,
} from 'lucide-react';

const LANG_STORAGE_KEY = 'kursotzivtar_lang';

/** One tile per real, shipped feature — nothing here is aspirational copy. */
const FEATURE_ICONS = [
  ShieldCheck,
  EyeOff,
  FileCheck,
  Calculator,
  ShieldAlert,
  Star,
  MessageSquareReply,
  Wallet,
  Mail,
  User,
  Timer,
] as const;

const FEATURE_KEYS = [
  'open',
  'anon',
  'proof',
  'math',
  'watchlist',
  'topRated',
  'reply',
  'analytics',
  'email',
  'account',
  'cooldown',
] as const;

/**
 * A real page on the site, not a marketing artifact — reachable from the
 * navbar on every screen. Every tile here names something that actually
 * shipped and was verified this build, not a claim about what the site
 * someday intends to do.
 */
export const AboutFeaturesPage: React.FC = () => {
  const [currentLang] = useState<SupportedLang>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'ru' || saved === 'ky' ? saved : 'ky';
  });
  const t = TRANSLATIONS[currentLang];
  const f = t.aboutPage.features;

  useEffect(() => {
    document.title = `${t.aboutPage.title} — Kursotzyv.org`;
  }, [t]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.aboutPage.backBtn}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-14">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-3">
            {t.aboutPage.eyebrow}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {t.aboutPage.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-3">{t.aboutPage.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURE_KEYS.map((key, i) => {
            const Icon = FEATURE_ICONS[i];
            const title = f[`${key}Title` as keyof typeof f];
            const body = f[`${key}Body` as keyof typeof f];
            return (
              <div
                key={key}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col gap-2.5"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 sm:mt-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{t.aboutPage.ctaTitle}</h2>
          <Link
            to="/#teachers-section"
            className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-colors shadow-xs"
          >
            {t.aboutPage.ctaBtn}
          </Link>
        </div>
      </main>
    </div>
  );
};

import React from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { ShieldCheck, PenLine, Globe } from 'lucide-react';

interface NavbarProps {
  currentLang: SupportedLang;
  onSelectLang: (lang: SupportedLang) => void;
  onOpenAddReview: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onSelectLang,
  onOpenAddReview,
}) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 sm:py-0 sm:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold shadow-md ring-1 ring-indigo-600/20 shrink-0">
              <span>K</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-xl font-bold tracking-tight text-slate-800 uppercase whitespace-nowrap">
                  {t.siteTitle}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-2xs sm:text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shrink-0">
                  <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Ачык &amp; Чынчыл</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block truncate">
                {t.siteSubtitle}
              </p>
            </div>
          </div>

          {/* Action buttons & Language Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200 text-xs font-medium shrink-0">
              <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1 hidden sm:inline" />
              {(['ky', 'ru'] as SupportedLang[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  id={`lang-btn-${lang}`}
                  onClick={() => onSelectLang(lang)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                    currentLang === lang
                      ? 'bg-white text-indigo-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'ky' ? 'Кыргызча' : 'Рус'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Submit Review Primary Button */}
              <button
                type="button"
                id="submit-review-header-btn"
                onClick={onOpenAddReview}
                className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-full transition-colors shadow-sm whitespace-nowrap cursor-pointer"
              >
                <PenLine className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t.submitReviewBtn}</span>
                <span className="sm:hidden">Пикир</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { ShieldCheck, PlusCircle, PenLine, Globe } from 'lucide-react';

interface NavbarProps {
  currentLang: SupportedLang;
  onSelectLang: (lang: SupportedLang) => void;
  onOpenAddReview: () => void;
  onOpenAddCourse: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onSelectLang,
  onOpenAddReview,
  onOpenAddCourse,
}) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand matching Clean Minimalism */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-xs">
              <span>Б</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-800 uppercase">
                  {t.siteTitle}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ачык & Чынчыл
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                {t.siteSubtitle}
              </p>
            </div>
          </div>

          {/* Action buttons & Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200 text-xs font-medium">
              <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1 hidden sm:inline" />
              {(['ky', 'ru', 'en'] as SupportedLang[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  id={`lang-btn-${lang}`}
                  onClick={() => onSelectLang(lang)}
                  className={`px-2.5 py-1 rounded-full transition-all ${
                    currentLang === lang
                      ? 'bg-white text-indigo-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'ky' ? 'Кыргызча' : lang === 'ru' ? 'Рус' : 'Eng'}
                </button>
              ))}
            </div>

            {/* Add Course Button */}
            <button
              type="button"
              id="add-course-btn"
              onClick={onOpenAddCourse}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
            >
              <PlusCircle className="w-4 h-4 text-slate-500" />
              <span className="hidden lg:inline">{t.addCourseBtn}</span>
              <span className="lg:hidden">+ Курс</span>
            </button>

            {/* Submit Review Primary Button */}
            <button
              type="button"
              id="submit-review-header-btn"
              onClick={onOpenAddReview}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-full transition-colors shadow-sm"
            >
              <PenLine className="w-4 h-4" />
              <span>{t.submitReviewBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { plural } from '../lib/plural';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, FileText, UserX, ShieldAlert } from 'lucide-react';

interface TransparencyBannerProps {
  currentLang: SupportedLang;
  warningCoursesCount: number;
}

export const TransparencyBanner: React.FC<TransparencyBannerProps> = ({
  currentLang,
  warningCoursesCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = TRANSLATIONS[currentLang];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 my-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 mt-0.5 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">
                {t.warningBannerTitle}
              </h2>
              {warningCoursesCount > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 rounded-full border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t.banner.flaggedCount.replace('{n}', plural(warningCoursesCount, t.plurals.course, currentLang))}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {t.banner.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="toggle-transparency-tips-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-700 hover:text-indigo-600 px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors self-start md:self-auto shrink-0 cursor-pointer"
        >
          <span>{isExpanded ? t.banner.hideRules : t.banner.readRules}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-slate-600">
          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <UserX className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-900 font-semibold mb-1">{t.banner.point1Title}</strong>
              <span>{t.warningBannerPoint1}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <FileText className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-900 font-semibold mb-1">{t.banner.point2Title}</strong>
              <span>{t.warningBannerPoint2}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-900 font-semibold mb-1">{t.banner.point3Title}</strong>
              <span>{t.warningBannerPoint3}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

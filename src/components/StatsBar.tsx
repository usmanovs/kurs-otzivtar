import React from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { BookOpen, MessageSquare, AlertOctagon, CheckCircle } from 'lucide-react';

interface StatsBarProps {
  currentLang: SupportedLang;
  totalCourses: number;
  totalReviews: number;
  warningCoursesCount: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  currentLang,
  totalCourses,
  totalReviews,
  warningCoursesCount,
}) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{totalCourses}</div>
          <div className="text-xs text-slate-500 font-medium">{t.stats.coursesCount}</div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{totalReviews}</div>
          <div className="text-xs text-slate-500 font-medium">{t.stats.reviewsCount}</div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 font-bold">
          <AlertOctagon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-red-600 tracking-tight">{warningCoursesCount}</div>
          <div className="text-xs text-slate-500 font-medium">{t.stats.warningCoursesCount}</div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900 leading-tight">{t.openCommunity}</div>
          <div className="text-xs text-slate-500 font-medium">{t.stats.independentNotice}</div>
        </div>
      </div>
    </div>
  );
};

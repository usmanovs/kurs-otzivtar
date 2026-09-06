import React from 'react';
import { Course } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { ShieldAlert, Clock, Coins, ExternalLink } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  currentLang: SupportedLang;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  const getFormatLabel = (fmt: string) => {
    if (fmt === 'online') return 'Онлайн';
    if (fmt === 'offline') return 'Офлайн';
    return 'Гибрид';
  };

  // Color selection for academy icon based on course ID or name
  const getAcademyColors = (name: string) => {
    const charCode = name.charCodeAt(0) || 0;
    const variants = [
      'bg-indigo-50 text-indigo-600',
      'bg-blue-50 text-blue-600',
      'bg-purple-50 text-purple-600',
      'bg-emerald-50 text-emerald-600',
      'bg-amber-50 text-amber-700',
      'bg-rose-50 text-rose-600',
    ];
    return variants[charCode % variants.length];
  };

  const academyColorClass = getAcademyColors(course.academyName);
  const academyInitial = course.academyName.charAt(0).toUpperCase() || 'К';

  return (
    <div
      id={`course-card-${course.id}`}
      className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
        course.isWarningCourse
          ? 'border-red-300 ring-1 ring-red-200/80 hover:border-red-400'
          : 'border-slate-200 hover:border-indigo-300'
      }`}
    >
      {/* Top Warning Ribbon if flagged */}
      {course.isWarningCourse && (
        <div className="bg-red-500 text-white px-5 py-2 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{t.courseCard.warningBadge}</span>
          </div>
          <span className="text-2xs bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
            Шектүү курс
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="p-6 space-y-4">
        {/* Header: Academy Avatar & Format Badge */}
        <div className="flex justify-between items-start">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${academyColorClass}`}>
            {academyInitial}
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 shrink-0">
            {getFormatLabel(course.format)}
          </span>
        </div>

        {/* Title & Academy Subtitle */}
        <div>
          <h3 className="font-bold text-lg text-slate-900 leading-snug">
            {course.name}
          </h3>
          <p className="text-slate-500 text-xs mt-1 uppercase font-semibold tracking-wider">
            {course.academyName}
          </p>
        </div>

        {/* Price and Duration */}
        <div className="flex items-center justify-between text-xs text-slate-600 py-1 border-y border-slate-100">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">{t.courseCard.price}:</span>
            <span className={`font-bold ${typeof course.priceKGS === 'number' ? 'text-slate-900' : 'text-slate-400 italic font-medium'}`}>
              {typeof course.priceKGS === 'number'
                ? `${course.priceKGS.toLocaleString('ru-RU')} сом`
                : t.courseCard.priceNotSpecified}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{course.durationText}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
          {course.description}
        </p>
      </div>

      {/* Card Footer */}
      {course.websiteOrInstagram && (
        <div className="flex justify-end items-center border-t border-slate-100 p-4 bg-white">
          <a
            href={course.websiteOrInstagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 text-sm font-bold hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Сайты</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};

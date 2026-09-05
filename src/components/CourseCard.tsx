import React from 'react';
import { Course } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import {
  Star,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Clock,
  Coins,
  ChevronRight,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface CourseCardProps {
  course: Course;
  currentLang: SupportedLang;
  onViewDetails: (course: Course) => void;
  onAddReviewForCourse: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  currentLang,
  onViewDetails,
  onAddReviewForCourse,
}) => {
  const t = TRANSLATIONS[currentLang];
  const latestReview = course.reviews.length > 0 ? course.reviews[0] : null;

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
        {/* Header: Academy Avatar & Rating Badge */}
        <div className="flex justify-between items-start">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${academyColorClass}`}>
            {academyInitial}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 shrink-0">
              {getFormatLabel(course.format)}
            </span>

            <div
              className={`flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${
                course.averageRating >= 4.0
                  ? 'bg-green-50 text-green-700'
                  : course.averageRating >= 3.0
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 mr-1 ${
                  course.averageRating >= 4.0
                    ? 'fill-green-600 text-green-600'
                    : course.averageRating >= 3.0
                    ? 'fill-amber-500 text-amber-500'
                    : 'fill-red-500 text-red-500'
                }`}
              />
              <span>{course.averageRating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Title & Academy Subtitle */}
        <div>
          <h3
            onClick={() => onViewDetails(course)}
            className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer leading-snug"
          >
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

        {/* Sub-ratings transparency progress bars */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>{t.courseCard.teachers}</span>
              <span className="font-semibold text-slate-900">{course.teacherRatingAvg.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  course.teacherRatingAvg >= 3.5 ? 'bg-indigo-600' : 'bg-red-500'
                }`}
                style={{ width: `${(course.teacherRatingAvg / 5) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>{t.courseCard.practice}</span>
              <span className="font-semibold text-slate-900">{course.practiceRatingAvg.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  course.practiceRatingAvg >= 3.5 ? 'bg-indigo-600' : 'bg-red-500'
                }`}
                style={{ width: `${(course.practiceRatingAvg / 5) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>{t.courseCard.jobSupport}</span>
              <span className="font-semibold text-slate-900">{course.jobSupportRatingAvg.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  course.jobSupportRatingAvg >= 3.5 ? 'bg-indigo-600' : 'bg-red-500'
                }`}
                style={{ width: `${(course.jobSupportRatingAvg / 5) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>{t.courseCard.value}</span>
              <span className="font-semibold text-slate-900">{course.valueRatingAvg.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  course.valueRatingAvg >= 3.5 ? 'bg-indigo-600' : 'bg-red-500'
                }`}
                style={{ width: `${(course.valueRatingAvg / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Latest review excerpt snippet matching Design HTML */}
        {latestReview && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            {latestReview.teacherName && (
              <div className="text-2xs font-semibold text-indigo-600 mb-1.5">
                Ментор: {latestReview.teacherName}
              </div>
            )}
            <p className="text-sm italic text-slate-600 line-clamp-2">
              "{latestReview.fullReview}"
            </p>
            <div className="mt-2.5 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 mr-2 flex items-center justify-center text-xs font-bold">
                  {latestReview.authorName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  {latestReview.authorName}
                  {latestReview.isVerified && (
                    <CheckCircle className="w-3 h-3 text-emerald-600" title="Тастыкталган бүтүрүүчү" />
                  )}
                </span>
              </div>
              <span className="text-slate-400 text-2xs">{latestReview.date}</span>
            </div>

            {/* Warning tag if review reported scam/issues */}
            {latestReview.cons.length > 0 && (
              <div className="mt-2 text-2xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="truncate">{latestReview.cons[0]}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Actions Footer matching Design HTML */}
      <div className="flex justify-between items-center border-t border-slate-100 p-5 bg-white">
        <span className="text-xs text-slate-400 font-medium">
          {course.reviewCount} {t.courseCard.reviewsCount}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id={`quick-review-btn-${course.id}`}
            onClick={() => onAddReviewForCourse(course)}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full border border-slate-200 transition-all cursor-pointer"
          >
            {t.courseCard.addReview}
          </button>

          <button
            type="button"
            id={`view-reviews-btn-${course.id}`}
            onClick={() => onViewDetails(course)}
            className="text-indigo-600 text-sm font-bold hover:text-indigo-700 inline-flex items-center gap-0.5 cursor-pointer"
          >
            <span>{t.courseCard.viewDetails}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

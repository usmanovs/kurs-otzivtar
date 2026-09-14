import React from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { RecentReviewSummary } from '../lib/api';
import { Star, X, MessageSquareText } from 'lucide-react';

interface RecentReviewPopupProps {
  review: RecentReviewSummary;
  currentLang: SupportedLang;
  onDismiss: () => void;
  onClick: () => void;
}

export const RecentReviewPopup: React.FC<RecentReviewPopupProps> = ({
  review,
  currentLang,
  onDismiss,
  onClick,
}) => {
  const t = TRANSLATIONS[currentLang];
  const authorLabel = review.isAnonymous ? t.recentReviewPopup.anonymous : review.authorName;

  return (
    <>
      {/* Mobile: a slim bar along the bottom edge. Under the header it clipped
          the hero headline; the old full card covered the lower third. This is
          one line, dismissible, and auto-hides on its own. */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 animate-fade-in">
        <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 shadow-lg pl-3 pr-1 py-1.5">
          <MessageSquareText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <button
            type="button"
            onClick={onClick}
            className="flex-1 min-w-0 text-left cursor-pointer"
          >
            <span className="block truncate text-[11px] text-slate-600">
              <span className="font-bold text-indigo-600">{t.recentReviewPopup.badge}:</span>{' '}
              <span className="font-semibold text-slate-800">{review.teacherName}</span>
              {' — '}
              {review.title}
            </span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.recentReviewPopup.close}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Desktop: the corner card has room here and blocks nothing. */}
      <div className="hidden sm:block fixed bottom-5 left-5 z-40 w-80 animate-fade-in">
        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl p-4 pr-8">
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.recentReviewPopup.close}
            className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <button type="button" onClick={onClick} className="flex items-start gap-3 text-left w-full cursor-pointer">
            <div className="shrink-0">
              {review.teacherPhotoUrl ? (
                <img
                  src={review.teacherPhotoUrl}
                  alt={review.teacherName}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-sm">
                  {review.teacherName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-2xs font-semibold text-indigo-600 uppercase tracking-wide">
                <MessageSquareText className="w-3 h-3" />
                <span>{t.recentReviewPopup.badge}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {authorLabel} — <span className="font-semibold text-slate-700">{review.teacherName}</span>
              </p>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < review.overallRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-700 mt-1 line-clamp-2 leading-snug">{review.title}</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

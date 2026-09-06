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
    <div className="fixed bottom-5 left-5 z-40 max-w-xs w-[calc(100%-2.5rem)] sm:w-80 animate-fade-in">
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
  );
};

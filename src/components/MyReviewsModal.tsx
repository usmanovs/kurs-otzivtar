import React, { useEffect, useState } from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { fetchMyReviews, MyReviewSummary } from '../lib/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { X, Star, EyeOff, MessageSquareText } from 'lucide-react';

interface MyReviewsModalProps {
  currentLang: SupportedLang;
  onClose: () => void;
  onSelectReview: (teacherId: string, reviewId: string) => void;
}

/**
 * Everything the signed-in account has ever reviewed, in one place. Only
 * reachable once signed in — there was previously no way to link a review
 * back to a person at all, so this list simply didn't exist before accounts
 * did. Reviews submitted anonymously or before signing in aren't retroactively
 * claimed; only what was written while signed in shows up here.
 */
export const MyReviewsModal: React.FC<MyReviewsModalProps> = ({
  currentLang,
  onClose,
  onSelectReview,
}) => {
  const t = TRANSLATIONS[currentLang];
  useEscapeKey(onClose);
  useBodyScrollLock();

  const [reviews, setReviews] = useState<MyReviewSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchMyReviews()
      .then((rows) => {
        if (!cancelled) setReviews(rows);
      })
      .catch(() => {
        if (!cancelled) setError(t.myReviews.loadError);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-reviews-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh]"
      >
        <div className="flex items-center justify-between gap-3 p-5 sm:p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-indigo-600" />
            <h2 id="my-reviews-title" className="text-lg font-bold text-slate-900">
              {t.myReviews.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.detailModal.close}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {!error && reviews === null && (
            <p className="text-sm text-slate-400 text-center py-8">{t.myReviews.loading}</p>
          )}

          {!error && reviews !== null && reviews.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">{t.myReviews.empty}</p>
          )}

          {!error && reviews !== null && reviews.length > 0 && (
            <div className="space-y-2.5">
              {reviews.map((r) => (
                <button
                  key={r.reviewId}
                  type="button"
                  onClick={() => {
                    onSelectReview(r.teacherId, r.reviewId);
                    onClose();
                  }}
                  className="w-full text-left flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
                >
                  {r.teacherPhotoUrl ? (
                    <img
                      src={r.teacherPhotoUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                      {r.teacherName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {r.teacherName}
                      </span>
                      {r.isHidden && (
                        <span className="inline-flex items-center gap-1 shrink-0 text-2xs font-semibold text-slate-400">
                          <EyeOff className="w-3 h-3" />
                          {t.myReviews.hiddenBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate">{r.title}</p>
                    <p className="text-2xs text-slate-400 mt-0.5">{r.date}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-sm font-bold text-slate-700 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {r.overallRating.toFixed(1)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

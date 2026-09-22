import React, { useEffect, useState } from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { RecentReviewSummary } from '../lib/api';
import { hasRealTitle } from '../lib/reviewTitle';
import { X, MessageSquareText } from 'lucide-react';

/** How long the pill stays before retiring itself. */
const VISIBLE_MS = 6000;
/** Matches the leave transition below, so onDismiss fires after it plays. */
const LEAVE_MS = 250;

interface RecentReviewPopupProps {
  review: RecentReviewSummary;
  currentLang: SupportedLang;
  onDismiss: () => void;
  onClick: () => void;
}

/**
 * One floating pill, same on every screen.
 *
 * It used to be two components — a full-width bar pinned to the bottom edge on
 * phones and a corner card on desktop. The bar spanned the viewport for a
 * single line of text and cut the sentence mid-word; the card was a second
 * layout to keep in sync for no gain. A centred pill reads as a notification
 * rather than a banner, and it retires on its own.
 */
export const RecentReviewPopup: React.FC<RecentReviewPopupProps> = ({
  review,
  currentLang,
  onDismiss,
  onClick,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [leaving, setLeaving] = useState(false);
  const [entered, setEntered] = useState(false);

  // The component owns its own lifetime so the slide-out actually plays;
  // a timer outside it could only unmount the pill mid-animation.
  useEffect(() => {
    const enter = window.setTimeout(() => setEntered(true), 20);
    const hide = window.setTimeout(() => setLeaving(true), VISIBLE_MS);
    const remove = window.setTimeout(onDismiss, VISIBLE_MS + LEAVE_MS);
    return () => {
      window.clearTimeout(enter);
      window.clearTimeout(hide);
      window.clearTimeout(remove);
    };
  }, [onDismiss]);

  const dismissNow = () => {
    setLeaving(true);
    window.setTimeout(onDismiss, LEAVE_MS);
  };

  const visible = entered && !leaving;

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-[92vw] sm:max-w-md px-4 pb-[env(safe-area-inset-bottom)] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex items-center justify-between gap-3 rounded-full border border-white/10 bg-slate-900/95 py-2.5 px-4 text-white shadow-lg backdrop-blur-md transition-all duration-200 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
        >
          <MessageSquareText className="w-3.5 h-3.5 shrink-0 text-indigo-300" />
          {/* One line, one ellipsis. The old bar wrapped the badge and the
              title separately and broke the sentence in the middle. */}
          <span className="truncate text-xs font-medium">
            <span className="font-bold text-indigo-300">{t.recentReviewPopup.badge}:</span>{' '}
            <span className="font-semibold">{review.teacherName}</span>
            {hasRealTitle(review.title) ? ` — ${review.title}` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={dismissNow}
          aria-label={t.recentReviewPopup.close}
          className="shrink-0 rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import { Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { TeacherHeaderIdentity, TeacherProfileBody, TeacherSocialLinks, ShareButton } from './TeacherProfile';
import { X } from 'lucide-react';

interface TeacherDetailModalProps {
  teacher: Teacher | null;
  currentLang: SupportedLang;
  highlightReviewId?: string;
  isAdmin: boolean;
  onClose: () => void;
  onOpenAddReview: (teacher: Teacher) => void;
  onVoteReview: (teacherId: string, reviewId: string, type: 'helpful' | 'unhelpful') => void;
}

/**
 * The profile as an overlay on the homepage — what an in-app click opens. A
 * direct visit to the same URL renders TeacherPage instead; the content itself
 * is shared (see TeacherProfile), this file is only the overlay chrome.
 */
export const TeacherDetailModal: React.FC<TeacherDetailModalProps> = ({
  teacher,
  currentLang,
  highlightReviewId,
  isAdmin,
  onClose,
  onOpenAddReview,
  onVoteReview,
}) => {
  useEscapeKey(onClose);
  useBodyScrollLock();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // The modal doesn't remount between two different teachers reached without
  // closing it first (e.g. a related-profile link) — same DOM node, so the
  // scroll position from the previous teacher would otherwise carry over and
  // the sheet would visibly open mid-scroll instead of at the top. The
  // highlight effect in the body takes over the scroll position when a
  // specific review is being deep-linked to.
  useEffect(() => {
    if (!highlightReviewId && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [teacher?.id, highlightReviewId]);

  if (!teacher) return null;

  const t = TRANSLATIONS[currentLang];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
      {/* dvh where supported: on phones vh is measured against the viewport
          without browser chrome, so 92vh put the footer below the fold. */}
      <div
        className="bg-white w-full max-w-4xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] supports-[height:100dvh]:max-h-[92dvh] sm:supports-[height:100dvh]:max-h-[88dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle: says "this sheet moves" on a phone, where the dialog
            is anchored to the bottom edge. */}
        <div className="sm:hidden shrink-0 bg-slate-900 pt-2.5 pb-1.5 flex justify-center" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-white/25" />
        </div>
        {/* Modal Header — one metadata row, not four. The shadow is what
            separates it from the white sheet once the content scrolls beneath
            it — without it the dark header and the first white card touch with
            no seam. */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0 sticky top-0 z-20 shadow-md shadow-black/20">
          <TeacherHeaderIdentity teacher={teacher} currentLang={currentLang} as="h2" />

          <div className="flex items-center gap-1 shrink-0 self-start">
            <TeacherSocialLinks teacher={teacher} />
            <ShareButton teacher={teacher} currentLang={currentLang} />
            <button
              type="button"
              id="close-teacher-detail-modal-btn"
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer shrink-0"
              aria-label={t.detailModal.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The bug: a flex child defaults to min-height:auto, so this never
            shrank below its content. The body grew past the container, which
            clips — taking the reviews and the footer with it. flex-1 with
            min-h-0 is what makes it scroll instead. */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-5 pt-6 pb-0 sm:p-7 sm:pb-0 space-y-6"
        >
          <TeacherProfileBody
            teacher={teacher}
            currentLang={currentLang}
            highlightReviewId={highlightReviewId}
            isAdmin={isAdmin}
            variant="modal"
            onOpenAddReview={() => {
              onClose();
              onOpenAddReview(teacher);
            }}
            onVoteReview={onVoteReview}
          />
        </div>
      </div>
    </div>
  );
};

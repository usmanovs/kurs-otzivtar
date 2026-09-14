import React, { useState, useEffect } from 'react';
import { Review, Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { ratingTone, RATING_STAR_CLASS } from '../lib/ratingTone';
import { fetchReviewIpLog, fetchApprovedResponses, TeacherResponse } from '../lib/api';
import { VerifyReviewModal } from './VerifyReviewModal';
import { TeacherResponseModal } from './TeacherResponseModal';
import { CountryTag } from './CountryTag';
import {
  X,
  Star,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Building2,
  PlusCircle,
  AlertTriangle,
  Lightbulb,
  Check,
  Instagram,
  Youtube,
  Share2,
  ShieldAlert,
  ShieldCheck,
  MessageSquareReply,
  Info,
} from 'lucide-react';

interface TeacherDetailModalProps {
  teacher: Teacher | null;
  currentLang: SupportedLang;
  highlightReviewId?: string;
  isAdmin: boolean;
  onClose: () => void;
  onOpenAddReview: (teacher: Teacher) => void;
  onVoteReview: (teacherId: string, reviewId: string, type: 'helpful' | 'unhelpful') => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


const HEADER_RATING_CLASS: Record<'success' | 'warning' | 'danger', string> = {
  success: 'bg-emerald-400/15 text-emerald-300',
  warning: 'bg-amber-400/15 text-amber-300',
  danger: 'bg-red-400/15 text-red-300',
};

const HEADER_STAR_CLASS: Record<'success' | 'warning' | 'danger', string> = {
  success: 'fill-emerald-300 text-emerald-300',
  warning: 'fill-amber-300 text-amber-300',
  danger: 'fill-red-300 text-red-300',
};

type TrustTier = 'proof' | 'self' | 'imported';

function trustTier(review: Review): TrustTier {
  if (review.proofVerified) return 'proof';
  if (review.source === 'imported') return 'imported';
  return 'self';
}

const TRUST_CLASS: Record<TrustTier, string> = {
  proof: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  self: 'bg-slate-50 text-slate-600 border-slate-200',
  imported: 'bg-amber-50 text-amber-700 border-amber-200',
};

const ReviewTrustBadge: React.FC<{ review: Review; currentLang: SupportedLang }> = ({
  review,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang];
  const tier = trustTier(review);
  const label =
    tier === 'proof'
      ? t.reviewTrust.proofVerified
      : tier === 'imported'
        ? t.reviewTrust.imported
        : t.reviewTrust.selfDeclared;
  const hint =
    tier === 'proof'
      ? t.reviewTrust.proofVerifiedHint
      : tier === 'imported'
        ? t.reviewTrust.importedHint
        : t.reviewTrust.selfDeclaredHint;

  return (
    <span
      title={hint}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${TRUST_CLASS[tier]}`}
    >
      {tier === 'proof' ? <ShieldCheck className="w-3 h-3 shrink-0" /> : <Info className="w-3 h-3 shrink-0" />}
      {label}
    </span>
  );
};

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
  const [reviewTab, setReviewTab] = useState<'all' | 'positive' | 'negative' | 'verified'>('all');
  const [copied, setCopied] = useState(false);
  const [ipLogMap, setIpLogMap] = useState<Record<string, { ipAddress: string; createdAt: string }>>({});
  const [verifyingReviewId, setVerifyingReviewId] = useState<string | null>(null);
  const [isRespondOpen, setIsRespondOpen] = useState(false);
  const [responses, setResponses] = useState<TeacherResponse[]>([]);

  // Approved instructor responses — RLS keeps unapproved ones out of reach.
  useEffect(() => {
    if (!teacher) {
      setResponses([]);
      return;
    }
    let cancelled = false;
    fetchApprovedResponses(teacher.id)
      .then((r) => {
        if (!cancelled) setResponses(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [teacher]);

  // Scroll to and briefly highlight a specific review, e.g. when arriving here
  // from the recent-review popup on the homepage.
  useEffect(() => {
    if (!teacher || !highlightReviewId) return;
    const el = document.getElementById(highlightReviewId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-indigo-400');
    const timeout = setTimeout(() => {
      el.classList.remove('ring-2', 'ring-indigo-400');
    }, 2500);
    return () => clearTimeout(timeout);
  }, [teacher, highlightReviewId]);

  // Admin-only: pull the precise submission IP/time for this teacher's reviews.
  // RLS silently returns nothing for non-admin sessions, but we skip the call
  // entirely for regular visitors anyway.
  useEffect(() => {
    if (!isAdmin || !teacher) {
      setIpLogMap({});
      return;
    }
    let cancelled = false;
    fetchReviewIpLog(teacher.reviews.map((r) => r.id)).then((map) => {
      if (!cancelled) setIpLogMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, teacher]);

  if (!teacher) return null;

  const t = TRANSLATIONS[currentLang];

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/teacher/${teacher.id}`;
    const shareData = {
      title: `${teacher.name} — Kursotzyv.org`,
      text: t.detailModal.shareText.replace('{name}', teacher.name),
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled the native share sheet — no action needed.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — nothing more we can do here.
    }
  };

  // Muted against the dark header rather than the page's usual saturated
  // rating colours, which glare on slate-900.
  const headerTone = ratingTone(teacher.averageRating);
  const totalReviews = teacher.reviews.length;
  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  teacher.reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.overallRating)));
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
  });

  const hasProofVerified = teacher.reviews.some((r) => r.proofVerified);

  const filteredReviews = teacher.reviews.filter((r) => {
    if (reviewTab === 'positive') return r.overallRating >= 4;
    if (reviewTab === 'negative') return r.overallRating <= 2;
    if (reviewTab === 'verified') return r.proofVerified === true;
    return true;
  });

  const renderStars = (rating: number, size = 'w-4 h-4') => {
    const filledClass = RATING_STAR_CLASS[ratingTone(rating)];
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(rating);
          return (
            <Star
              key={star}
              className={`${size} ${filled ? filledClass : 'text-slate-200 fill-slate-100'}`}
            />
          );
        })}
      </div>
    );
  };

  const getStatusLabel = (status: string) => {
    if (status === 'graduate') return 'Бүтүрүүчү';
    if (status === 'current_student') return 'Окуп жатат';
    return 'Курсту таштап кеткен';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      {/* dvh where supported: on phones vh is measured against the viewport
          without browser chrome, so 92vh put the footer below the fold. */}
      <div
        className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] supports-[height:100dvh]:max-h-[88dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-3 sm:gap-4 shrink-0">
          {/* min-w-0 all the way down, or a long name refuses to shrink and
              shoves the share/close buttons off the edge on a phone. */}
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            {teacher.photoUrl ? (
              <img
                src={teacher.photoUrl}
                alt={teacher.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-2 ring-white/20 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-500/30 text-white font-bold flex items-center justify-center text-xl shrink-0">
                {teacher.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight break-words">
                {teacher.name}
              </h2>
              {teacher.academyName && (
                <div className="flex items-center gap-1 text-xs font-semibold text-indigo-300 mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{teacher.academyName}</span>
                </div>
              )}

              {/* What they teach and how they score, before any scrolling.
                  Wraps as one flow so long Kyrgyz category names cannot push
                  into the share/close buttons. */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {teacher.category && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-200 text-2xs font-medium">
                    {t.categories[teacher.category]}
                  </span>
                )}
                {(teacher.subniches ?? []).map((sn) => (
                  <span
                    key={sn}
                    className="px-2.5 py-0.5 rounded-full bg-slate-700/40 text-slate-300 text-2xs font-medium"
                  >
                    {t.subniches[sn as keyof typeof t.subniches] ?? sn}
                  </span>
                ))}

                {teacher.reviewCount > 0 && (
                  <>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold ${HEADER_RATING_CLASS[headerTone]}`}
                    >
                      <Star className={`w-3 h-3 ${HEADER_STAR_CLASS[headerTone]}`} />
                      {teacher.averageRating.toFixed(1)}
                      <span className="font-medium opacity-80">({teacher.reviewCount})</span>
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold ${HEADER_RATING_CLASS[headerTone]}`}
                    >
                      {headerTone === 'danger'
                        ? t.analytics.flaggedLabel
                        : `${teacher.recommendPercent}% ${t.courseCard.recommendRate}`}
                    </span>
                  </>
                )}
              </div>
              {(teacher.instagramUrl || teacher.youtubeUrl) && (
                <div className="flex items-center gap-2 mt-2">
                  {teacher.instagramUrl && (
                    <a
                      href={teacher.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="text-slate-300 hover:text-pink-400 transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {teacher.youtubeUrl && (
                    <a
                      href={teacher.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="YouTube"
                      className="text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="share-teacher-btn"
              onClick={handleShare}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label={t.detailModal.share}
              title={copied ? t.detailModal.linkCopied : t.detailModal.share}
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              id="close-teacher-detail-modal-btn"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
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
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] p-5 sm:p-7 space-y-6">
          {/* Approved instructor statements that aren't tied to one review */}
          {responses
            .filter((resp) => !resp.reviewId)
            .map((resp) => (
              <div key={resp.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-xs font-bold text-indigo-700">
                  <MessageSquareReply className="w-4 h-4" />
                  <span>{t.responseModal.responseBadge} — {resp.authorName}</span>
                  {resp.identityVerified && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-2xs">
                      <ShieldCheck className="w-3 h-3" />
                      {t.responseModal.verifiedBadge}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {resp.responseText}
                </p>
              </div>
            ))}

          {/* Action to write review */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
            <div>
              <h4 className="text-sm font-bold text-indigo-950">
                Бул мугалим менен окуган элеңизби?
              </h4>
              <p className="text-xs text-indigo-800/80 mt-0.5">
                Сиздин чынчыл сын-пикириңиз башка студенттерди алдануудан сактайт.
              </p>
            </div>
            <button
              type="button"
              id="detail-modal-add-review-btn"
              onClick={() => {
                onClose();
                onOpenAddReview(teacher);
              }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-full transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.courseCard.addReview}</span>
            </button>
          </div>

          {teacher.bio && (
            <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              {teacher.bio}
            </div>
          )}

          {/* Overall Ratings — one unified panel instead of separate side-by-side cards */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs p-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
              {/* Main Score */}
              <div className="md:col-span-4 flex flex-col items-center justify-center text-center md:border-r md:border-slate-100 md:pr-8">
                <div
                  className={`text-4xl sm:text-5xl font-bold mb-2 ${
                    teacher.averageRating >= 4
                      ? 'text-emerald-600'
                      : teacher.averageRating >= 3
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {teacher.averageRating.toFixed(1)}
                </div>
                {renderStars(teacher.averageRating, 'w-5 h-5')}
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  {teacher.reviewCount} {t.courseCard.reviewsCount} негизинде
                </div>

                {teacher.reviewCount > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 w-full text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        teacher.recommendPercent >= 70
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {teacher.recommendPercent >= 70 ? (
                        <ThumbsUp className="w-3.5 h-3.5" />
                      ) : (
                        <ThumbsDown className="w-3.5 h-3.5" />
                      )}
                      {teacher.recommendPercent}% {t.courseCard.recommendRate}
                    </span>
                  </div>
                )}
              </div>

              {/* Sub-scores & rating distribution */}
              <div className="md:col-span-8 flex flex-col justify-center gap-5">
                <div className="space-y-3">
                  {/* Sub-criteria are optional, so 0 means "nobody rated this"
                      rather than a score of zero — drop those rows instead of
                      drawing an empty bar labelled 0.0. */}
                  {[
                    { label: t.courseCard.teachers, value: teacher.teacherRatingAvg },
                    { label: t.courseCard.practice, value: teacher.practiceRatingAvg },
                    { label: t.courseCard.jobSupport, value: teacher.jobSupportRatingAvg },
                    { label: t.courseCard.value, value: teacher.valueRatingAvg },
                  ].filter((metric) => metric.value > 0).map((metric) => (
                    <div key={metric.label} className="flex items-center gap-3">
                      <span className="text-sm text-slate-500 w-28 sm:w-32 shrink-0 truncate">
                        {metric.label}
                      </span>
                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${(metric.value / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-900 w-7 text-right shrink-0">
                        {metric.value.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Score Distribution Bars */}
                <div className="pt-5 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 mb-2.5">
                    {t.detailModal.ratingDistribution}
                  </div>
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((score) => {
                      const count = ratingCounts[score] || 0;
                      const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                      return (
                        <div key={score} className="flex items-center gap-2 text-xs">
                          <span className="w-4 font-semibold text-slate-600">{score}★</span>
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                score >= 4
                                  ? 'bg-emerald-500'
                                  : score === 3
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-slate-500 font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews Section Header & Filter Tabs */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{t.detailModal.reviewsTab}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                  {filteredReviews.length}
                </span>
              </h3>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setReviewTab('all')}
                  className={`px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                    reviewTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.detailModal.allReviews}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('positive')}
                  className={`px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                    reviewTab === 'positive'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.detailModal.positive}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('negative')}
                  className={`px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                    reviewTab === 'negative'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.detailModal.negative}
                </button>
                {hasProofVerified && (
                  <button
                    type="button"
                    onClick={() => setReviewTab('verified')}
                    className={`px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                      reviewTab === 'verified'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t.detailModal.verifiedOnly}
                  </button>
                )}
              </div>
            </div>

            {/* List of Reviews */}
            <div className="space-y-4 mt-4">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  {t.detailModal.noReviewsYet}
                </div>
              ) : (
                filteredReviews.map((review) => {
                  const tone = ratingTone(review.overallRating);
                  const scoreTextClass = {
                    danger: 'text-red-600',
                    warning: 'text-amber-600',
                    success: 'text-emerald-600',
                  }[tone];

                  return (
                  <div
                    key={review.id}
                    id={`review-item-${review.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    {/* Reviewer Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm shrink-0">
                          {review.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {review.authorName}
                            </span>
                            <ReviewTrustBadge review={review} currentLang={currentLang} />
                          </div>
                          <div className="text-2xs text-slate-500">
                            <span>{getStatusLabel(review.authorStatus)}</span>
                            {review.cohortYear && <span> • {review.cohortYear}</span>}
                            {review.durationMonths && <span> • {review.durationMonths} ай окуган</span>}
                            {review.pricePaidKGS && (
                              <span> • {review.pricePaidKGS.toLocaleString('ru-RU')} сом төлөгөн</span>
                            )}
                            <span> • {review.createdAt ? formatDateTime(review.createdAt) : review.date}</span>
                            {review.country && (
                              <>
                                {' '}
                                <CountryTag country={review.country} city={review.city} />
                              </>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="mt-1 inline-flex items-center gap-1 text-2xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              <ShieldAlert className="w-3 h-3" />
                              <span>
                                {ipLogMap[review.id]
                                  ? `${ipLogMap[review.id].ipAddress} · ${formatDateTime(ipLogMap[review.id].createdAt)}`
                                  : 'IP белгисиз'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`flex items-center gap-1 font-bold text-sm shrink-0 ${scoreTextClass}`}>
                        <span>{review.overallRating.toFixed(1)}</span>
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 mt-3 mb-1">
                      {review.title}
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {review.fullReview}
                    </p>

                    {/* Pros & Cons Section */}
                    {(review.pros.length > 0 || review.cons.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm text-slate-700">
                        {review.pros.map((p, idx) => (
                          <div key={`pro-${idx}`} className="flex items-start gap-1.5">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </div>
                        ))}
                        {review.cons.map((c, idx) => (
                          <div key={`con-${idx}`} className="flex items-start gap-1.5">
                            <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {review.adviceForNewcomers && (
                      <p className="mt-3 text-sm text-slate-600 flex items-start gap-1.5">
                        <Lightbulb className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{review.adviceForNewcomers}</span>
                      </p>
                    )}

                    {/* Recommendation & scam flag — plain text, no colored boxes */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                      {review.wouldRecommend ? (
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {t.detailModal.recommendYes}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {t.detailModal.recommendNo}
                        </span>
                      )}

                      {review.hasJobScamReport && (
                        <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {t.detailModal.scamWarningReported}
                        </span>
                      )}
                    </div>

                    {/* Helpful votes footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>{t.detailModal.helpfulQuestion}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id={`vote-helpful-${review.id}`}
                          onClick={() => onVoteReview(teacher.id, review.id, 'helpful')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                            review.userVoted === 'helpful'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Пайдалуу ({review.helpfulCount})</span>
                        </button>

                        <button
                          type="button"
                          id={`vote-unhelpful-${review.id}`}
                          onClick={() => onVoteReview(teacher.id, review.id, 'unhelpful')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                            review.userVoted === 'unhelpful'
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>Жок ({review.unhelpfulCount})</span>
                        </button>
                      </div>
                    </div>

                    {/* Prove enrollment to earn the verified badge */}
                    {!review.proofVerified && (
                      <button
                        type="button"
                        onClick={() => setVerifyingReviewId(review.id)}
                        className="mt-3 inline-flex items-center gap-1.5 text-2xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {t.verifyModal.buttonLabel}
                      </button>
                    )}

                    {/* Instructor's approved response to this specific review */}
                    {responses
                      .filter((resp) => resp.reviewId === review.id)
                      .map((resp) => (
                        <div
                          key={resp.id}
                          className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"
                        >
                          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-2xs font-bold text-indigo-700">
                            <MessageSquareReply className="w-3.5 h-3.5" />
                            <span>{t.responseModal.responseBadge} — {resp.authorName}</span>
                            {resp.identityVerified && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3" />
                                {t.responseModal.verifiedBadge}
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {resp.responseText}
                          </p>
                        </div>
                      ))}
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {/* Secondary by design: this is the reviewed instructor's action, not
              the reader's. The primary "write a review" CTA lives in the body,
              next to the reviews it belongs to. */}
          {responses.length === 0 ? (
            <button
              type="button"
              id="detail-modal-claim-profile-btn"
              onClick={() => setIsRespondOpen(true)}
              className="inline-flex items-center gap-1.5 min-w-0 px-3 py-1.5 rounded-full border border-slate-300 bg-white text-slate-600 hover:text-indigo-700 hover:border-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <MessageSquareReply className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.responseModal.buttonLabel}</span>
            </button>
          ) : (
            <span />
          )}

          {/* The header already carries an ✕; on phones this would only eat
              vertical space next to it. */}
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex items-center px-5 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors cursor-pointer shrink-0"
          >
            {t.detailModal.close}
          </button>
        </div>
      </div>

      {verifyingReviewId && (
        <VerifyReviewModal
          reviewId={verifyingReviewId}
          teacherId={teacher.id}
          currentLang={currentLang}
          onClose={() => setVerifyingReviewId(null)}
        />
      )}

      {isRespondOpen && (
        <TeacherResponseModal
          teacher={teacher}
          reviews={teacher.reviews}
          currentLang={currentLang}
          // Only one statement per instructor ever publishes, so say so up front
          // rather than letting someone write one that can't be approved.
          hasApprovedResponse={responses.length > 0}
          onClose={() => setIsRespondOpen(false)}
        />
      )}
    </div>
  );
};

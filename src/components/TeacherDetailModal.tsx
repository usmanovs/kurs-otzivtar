import React, { useState, useEffect } from 'react';
import { Review, Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { ratingTone, RATING_STAR_CLASS } from '../lib/ratingTone';
import { fetchReviewIpLog, fetchApprovedResponses, TeacherResponse } from '../lib/api';
import { VerifyReviewModal } from './VerifyReviewModal';
import { TeacherResponseModal } from './TeacherResponseModal';
import { CountryTag } from './CountryTag';
import { TikTokIcon } from './TikTokIcon';
import { buildHeaderTags } from '../lib/headerTags';
import {
  X,
  Star,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  PlusCircle,
  AlertTriangle,
  Lightbulb,
  Check,
  Instagram,
  Youtube,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  User,
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

// Branded rather than uniformly muted: a harvested YouTube comment and a
// proof-backed student are different kinds of evidence, and the badge is the
// only thing on the card that says so.
const TRUST_CLASS: Record<TrustTier, string> = {
  proof: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  self: 'bg-sky-50 text-sky-700 border-sky-200',
  imported: 'bg-red-50 text-red-600 border-red-200',
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

  const Icon = tier === 'proof' ? CheckCircle2 : tier === 'imported' ? Youtube : User;

  return (
    <span
      title={hint}
      className={`inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full border text-[10px] font-semibold ${TRUST_CLASS[tier]}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="truncate">{label}</span>
      {/* Only the harvested tier needs explaining — the other two say what
          they are. */}
      {tier === 'imported' && <Info className="w-2.5 h-2.5 shrink-0 opacity-70" />}
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
  useBodyScrollLock();
  const [reviewTab, setReviewTab] = useState<'all' | 'positive' | 'negative' | 'verified'>('all');
  const [copied, setCopied] = useState(false);
  const [ipLogMap, setIpLogMap] = useState<Record<string, { ipAddress: string; createdAt: string }>>({});
  const [verifyingReviewId, setVerifyingReviewId] = useState<string | null>(null);
  const [isRespondOpen, setIsRespondOpen] = useState(false);
  // Collapsed by default; the sm: grid override keeps it open on wider screens
  // without needing a resize listener.
  const [metricsOpen, setMetricsOpen] = useState(false);
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
  // academy_name is free text that people have used as a tag dump
  // ("маркетинг,смм") beside a category saying the same thing — so the pills
  // are built by one deduping pass rather than rendered from three sources.
  const { tags: headerTags, overflow: headerTagOverflow } = buildHeaderTags({
    categoryLabel: teacher.category ? t.categories[teacher.category] : undefined,
    subnicheLabels: (teacher.subniches ?? []).map(
      (sn) => (t.subniches as Record<string, string>)[sn] ?? sn
    ),
    academyName: teacher.academyName,
    // Two, not three: the score and status pills sit in the same wrap row and
    // are the more valuable pair, so the tags get whatever space is left.
    max: 2,
  });
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
      {/* dvh where supported: on phones vh is measured against the viewport
          without browser chrome, so 92vh put the footer below the fold. */}
      <div
        className="bg-white w-full max-w-4xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] supports-[height:100dvh]:max-h-[92dvh] sm:supports-[height:100dvh]:max-h-[88dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle: says "this sheet moves" on a phone, where the dialog
            is anchored to the bottom edge. */}
        <div className="sm:hidden shrink-0 bg-slate-900 pt-2 flex justify-center" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-white/25" />
        </div>
        {/* Modal Header — one metadata row, not four. Name, then a single
            wrap container carrying academy, category, sub-niches, score,
            status and social links together. */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          {/* min-w-0 all the way down, or a long name refuses to shrink and
              shoves the share/close buttons off the edge on a phone. */}
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
            {teacher.photoUrl ? (
              <img
                src={teacher.photoUrl}
                alt={teacher.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-slate-700/60 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-500/30 text-white font-bold flex items-center justify-center text-lg border-2 border-slate-700/60 shrink-0">
                {teacher.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold leading-tight tracking-tight break-words">
                {teacher.name}
              </h2>

              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {headerTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-2xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
                {headerTagOverflow > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 text-2xs font-medium">
                    +{headerTagOverflow}
                  </span>
                )}

                {teacher.reviewCount > 0 && (
                  <>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold ${HEADER_RATING_CLASS[headerTone]}`}
                    >
                      <Star className={`w-3 h-3 ${HEADER_STAR_CLASS[headerTone]}`} />
                      {teacher.averageRating.toFixed(1)}
                      <span className="font-medium opacity-80">({teacher.reviewCount})</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${HEADER_RATING_CLASS[headerTone]}`}
                    >
                      {headerTone === 'danger'
                        ? t.analytics.flaggedLabel
                        : `${teacher.recommendPercent}% ${t.courseCard.recommendRate}`}
                    </span>
                  </>
                )}

                {teacher.instagramUrl && (
                  <a
                    href={teacher.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-slate-400 hover:text-pink-400 transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                  </a>
                )}
                {teacher.youtubeUrl && (
                  <a
                    href={teacher.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Youtube className="w-3.5 h-3.5" />
                  </a>
                )}
                {teacher.tiktokUrl && (
                  <a
                    href={teacher.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <TikTokIcon className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 self-start">
            <button
              type="button"
              id="share-teacher-btn"
              onClick={handleShare}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer shrink-0"
              aria-label={t.detailModal.share}
              title={copied ? t.detailModal.linkCopied : t.detailModal.share}
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
            </button>
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
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] p-5 sm:p-7 pb-0 space-y-6">
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

          {teacher.bio && (
            <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              {teacher.bio}
            </div>
          )}

          {/* Overall Ratings — one unified panel instead of separate side-by-side cards */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-3.5 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
              {/* Score and the review CTA share one row: two full-width
                  blocks stacked used most of a phone screen before the first
                  review. */}
              <div className="md:col-span-4 md:border-r md:border-slate-100 md:pr-8">
                <div className="flex items-center justify-between gap-3 md:flex-col md:text-center md:gap-3">
                  {/* Score, stars and sentiment as one tight group, so the row
                      stays two columns down to 360px. */}
                  <div className="flex items-center gap-2.5 min-w-0 md:flex-col md:gap-1.5">
                    <div
                      className={`text-3xl sm:text-4xl font-extrabold leading-none shrink-0 tabular-nums ${
                        teacher.averageRating >= 4
                          ? 'text-emerald-600'
                          : teacher.averageRating >= 3
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      {teacher.averageRating.toFixed(1)}
                    </div>
                    <div className="min-w-0 md:flex md:flex-col md:items-center">
                      {renderStars(teacher.averageRating, 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
                      <div className="text-2xs text-slate-500 mt-0.5 truncate">
                        {teacher.reviewCount} {t.courseCard.reviewsCount} негизинде
                      </div>
                      {teacher.reviewCount > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-2xs font-semibold border ${
                            teacher.recommendPercent >= 70
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                          }`}
                        >
                          {teacher.recommendPercent >= 70 ? (
                            <ThumbsUp className="w-3 h-3 shrink-0" />
                          ) : (
                            <ThumbsDown className="w-3 h-3 shrink-0" />
                          )}
                          <span className="whitespace-nowrap">
                            {teacher.recommendPercent}% {t.courseCard.recommendRate}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 md:w-full md:pt-3 md:border-t md:border-slate-100">
                    <button
                      type="button"
                      id="detail-modal-add-review-btn"
                      onClick={() => {
                        onClose();
                        onOpenAddReview(teacher);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm cursor-pointer md:w-full whitespace-nowrap"
                    >
                      <PlusCircle className="w-4 h-4 shrink-0" />
                      <span>{t.courseCard.addReview}</span>
                    </button>
                    {/* The longer pitch only earns its space once there is room. */}
                    <p className="hidden sm:block text-2xs text-slate-500 mt-1.5 text-center leading-snug">
                      {t.detailModal.reviewPrompt}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-scores & rating distribution. On a phone these two blocks
                  filled the screen and pushed the reviews — the thing people
                  came for — entirely out of view, so they collapse. The sm:
                  row override keeps them open on wider screens, where there is
                  room and no toggle is shown. */}
              <div className="md:col-span-8 flex flex-col justify-center">
                <button
                  type="button"
                  id="toggle-detailed-metrics"
                  onClick={() => setMetricsOpen((v) => !v)}
                  aria-expanded={metricsOpen}
                  aria-controls="detailed-metrics"
                  className="sm:hidden w-full flex items-center justify-between gap-2 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <span>{t.detailModal.detailedMetrics}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      metricsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  id="detailed-metrics"
                  className={`grid transition-all duration-200 ease-out sm:grid-rows-[1fr] ${
                    metricsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-4 pt-1 sm:pt-0">
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
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4"
                  >
                    {/* Two columns: everything identifying the reviewer on the
                        left, the score alone on the right. This used to be
                        four stacked rows before the headline was reached. */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                          {review.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {review.authorName}
                            </span>
                            <ReviewTrustBadge review={review} currentLang={currentLang} />
                          </div>
                          {/* Wraps as items rather than one text run, so a long
                              author name or a wide price chip cannot push the
                              date off the card at 375px. */}
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5 text-2xs text-slate-500">
                            <span>{getStatusLabel(review.authorStatus)}</span>
                            {review.cohortYear && (
                              <>
                                <span aria-hidden="true">•</span>
                                <span>{review.cohortYear}</span>
                              </>
                            )}
                            {review.durationMonths && (
                              <>
                                <span aria-hidden="true">•</span>
                                <span>{review.durationMonths} ай окуган</span>
                              </>
                            )}
                            {/* What they actually lost is the most scannable
                                fact on the card, so it gets a chip. */}
                            {review.pricePaidKGS && (
                              <span className="px-1.5 py-px rounded bg-amber-50 border border-amber-200 text-amber-800 font-semibold whitespace-nowrap">
                                {review.pricePaidKGS.toLocaleString('ru-RU')} сом төлөгөн
                              </span>
                            )}
                            <span aria-hidden="true">•</span>
                            <span className="whitespace-nowrap">
                              {review.createdAt ? formatDateTime(review.createdAt) : review.date}
                            </span>
                            {review.country && (
                              <CountryTag country={review.country} city={review.city} />
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

                    <h4 className="text-sm font-bold text-slate-900 leading-tight mt-2">
                      {review.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line mt-1">
                      {review.fullReview}
                    </p>

                    {/* One chip strip instead of four stacked blocks: the
                        recommendation line, the pros/cons grid (one row per
                        item) and the scam flag each used to claim their own
                        band of the card. */}
                    {(() => {
                      const chip =
                        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium border';
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          <span
                            className={`${chip} ${
                              review.wouldRecommend
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                : 'bg-rose-50 text-rose-700 border-rose-200/60'
                            }`}
                          >
                            {review.wouldRecommend ? (
                              <ThumbsUp className="w-3 h-3" />
                            ) : (
                              <ThumbsDown className="w-3 h-3" />
                            )}
                            {review.wouldRecommend
                              ? t.detailModal.recommendYes
                              : t.detailModal.recommendNo}
                          </span>

                          {review.hasJobScamReport && (
                            <span className={`${chip} bg-red-50 text-red-700 border-red-200 font-semibold`}>
                              <AlertTriangle className="w-3 h-3" />
                              {t.detailModal.scamWarningReported}
                            </span>
                          )}

                          {review.pros.map((pro, idx) => (
                            <span
                              key={`pro-${idx}`}
                              className={`${chip} bg-emerald-50 text-emerald-700 border-emerald-200/60`}
                            >
                              <Check className="w-3 h-3 shrink-0" />
                              {pro}
                            </span>
                          ))}
                          {review.cons.map((con, idx) => (
                            <span
                              key={`con-${idx}`}
                              className={`${chip} bg-rose-50 text-rose-700 border-rose-200/60`}
                            >
                              <X className="w-3 h-3 shrink-0" />
                              {con}
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    {review.adviceForNewcomers && (
                      <p className="mt-2 text-xs text-slate-600 flex items-start gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{review.adviceForNewcomers}</span>
                      </p>
                    )}

                    {/* Votes and the proof link share one row; the proof link
                        used to sit below the footer as a ninth block. */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-2.5 mt-2.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          id={`vote-helpful-${review.id}`}
                          onClick={() => onVoteReview(teacher.id, review.id, 'helpful')}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                            review.userVoted === 'helpful'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{review.helpfulCount}</span>
                        </button>

                        <button
                          type="button"
                          id={`vote-unhelpful-${review.id}`}
                          onClick={() => onVoteReview(teacher.id, review.id, 'unhelpful')}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                            review.userVoted === 'unhelpful'
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                          <span>{review.unhelpfulCount}</span>
                        </button>
                      </div>

                      {!review.proofVerified && (
                        <button
                          type="button"
                          onClick={() => setVerifyingReviewId(review.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer shrink-0"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {t.verifyModal.buttonLabel}
                        </button>
                      )}
                    </div>

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

          {/* Sticky inside the scroll container, not a fixed bar outside it:
              that is what lets the last reviews pass under the blur instead of
              stopping short of a solid strip. As the final child it also comes
              to rest naturally at full scroll, so no extra bottom padding is
              needed to clear it. */}
          {responses.length === 0 && (
            <div className="sticky bottom-0 left-0 right-0 z-20 -mx-5 sm:-mx-7 mt-6 flex justify-center border-t border-slate-200/80 bg-white/90 p-3 backdrop-blur-md">
              <button
                type="button"
                id="detail-modal-claim-profile-btn"
                onClick={() => setIsRespondOpen(true)}
                className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 cursor-pointer"
              >
                <MessageSquareReply className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.responseModal.buttonLabel}</span>
              </button>
            </div>
          )}
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

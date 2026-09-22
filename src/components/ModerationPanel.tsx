import React, { useEffect, useMemo, useState } from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  VerificationRequest,
  TeacherResponse,
  ContactMessage,
  AdminReviewSummary,
  fetchPendingVerifications,
  fetchPendingResponses,
  fetchContactMessages,
  fetchAllReviewsForAdmin,
  adminUpdateReviewRating,
  createProofSignedUrl,
  decideVerification,
  decideTeacherResponse,
  markContactMessageRead,
} from '../lib/api';
import { X, ShieldCheck, MessageSquareReply, ExternalLink, Check, Ban, Mail, Star, MessageSquareText } from 'lucide-react';

const REVIEWS_PAGE_SIZE = 30;

function EditableStars({
  rating,
  disabled,
  onChange,
}: {
  rating: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          aria-label={`${n}/5`}
          className="p-0.5 disabled:opacity-50 cursor-pointer"
        >
          <Star className={`w-4 h-4 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
        </button>
      ))}
    </div>
  );
}

interface ModerationPanelProps {
  currentLang: SupportedLang;
  onClose: () => void;
  onModerated: () => void;
}

export const ModerationPanel: React.FC<ModerationPanelProps> = ({
  currentLang,
  onClose,
  onModerated,
}) => {
  useEscapeKey(onClose);
  const t = TRANSLATIONS[currentLang];
  const [tab, setTab] = useState<'verifications' | 'responses' | 'messages' | 'reviews'>('verifications');
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [responses, setResponses] = useState<TeacherResponse[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [decisionError, setDecisionError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Loaded lazily on first visit to the tab — 1000 rows isn't worth fetching
  // up front for admins who never open it.
  const [allReviews, setAllReviews] = useState<AdminReviewSummary[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSearch, setReviewSearch] = useState('');
  const [visibleReviewCount, setVisibleReviewCount] = useState(REVIEWS_PAGE_SIZE);
  const [reviewRatingError, setReviewRatingError] = useState('');

  const load = async () => {
    setIsLoading(true);
    const [v, r, m] = await Promise.all([
      fetchPendingVerifications(),
      fetchPendingResponses(),
      fetchContactMessages(),
    ]);
    setVerifications(v);
    setResponses(r);
    setMessages(m);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tab !== 'reviews' || reviewsLoaded) return;
    setReviewsLoading(true);
    fetchAllReviewsForAdmin()
      .then((data) => {
        setAllReviews(data);
        setReviewsLoaded(true);
      })
      .finally(() => setReviewsLoading(false));
  }, [tab, reviewsLoaded]);

  const filteredReviews = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    if (!q) return allReviews;
    return allReviews.filter(
      (r) =>
        r.teacherName.toLowerCase().includes(q) ||
        r.authorName.toLowerCase().includes(q) ||
        r.fullReview.toLowerCase().includes(q)
    );
  }, [allReviews, reviewSearch]);

  const handleRatingChange = async (review: AdminReviewSummary, next: number) => {
    if (next === review.overallRating) return;
    const previous = review.overallRating;
    setReviewRatingError('');
    setAllReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, overallRating: next } : r)));
    setBusyId(review.id);
    try {
      await adminUpdateReviewRating(review.id, next);
    } catch {
      // Roll back — the row would otherwise show a rating that never saved.
      setAllReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, overallRating: previous } : r)));
      setReviewRatingError(t.moderation.ratingUpdateFailed);
    } finally {
      setBusyId(null);
    }
  };

  const openProof = async (proofPath: string) => {
    const url = await createProofSignedUrl(proofPath);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleVerification = async (req: VerificationRequest, approve: boolean) => {
    setBusyId(req.id);
    try {
      await decideVerification(req.id, req.reviewId, approve);
      setVerifications((prev) => prev.filter((v) => v.id !== req.id));
      onModerated();
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkRead = async (msg: ContactMessage) => {
    setBusyId(msg.id);
    try {
      await markContactMessageRead(msg.id);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)));
    } finally {
      setBusyId(null);
    }
  };

  const handleResponse = async (resp: TeacherResponse, approve: boolean) => {
    setBusyId(resp.id);
    setDecisionError('');
    try {
      await decideTeacherResponse(resp.id, approve);
      setResponses((prev) => prev.filter((r) => r.id !== resp.id));
      onModerated();
    } catch (e) {
      // Only one approved response per instructor is allowed, and the DB is
      // what enforces it — so say which failure this is rather than letting
      // the row sit there looking unclicked.
      const msg = String((e as { message?: string })?.message || '');
      setDecisionError(
        msg.includes('teacher_responses_one_approved_per_teacher')
          ? t.moderation.duplicateResponse
          : t.moderation.decisionFailed
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{t.moderation.title}</h2>
            <p className="text-sm text-slate-300 mt-1">{t.moderation.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.moderation.close}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 pt-4">
          <button
            type="button"
            onClick={() => setTab('verifications')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'verifications'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {t.moderation.tabVerifications} ({verifications.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('responses')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'responses'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <MessageSquareReply className="w-3.5 h-3.5" />
            {t.moderation.tabResponses} ({responses.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('messages')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'messages'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            {t.moderation.tabMessages} ({messages.filter((m) => !m.isRead).length})
          </button>
          <button
            type="button"
            onClick={() => setTab('reviews')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'reviews' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            {t.moderation.tabReviews}
          </button>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto">
          {isLoading && <p className="text-sm text-slate-500">{t.moderation.loading}</p>}

          {!isLoading && tab === 'verifications' && verifications.length === 0 && (
            <p className="text-sm text-slate-500">{t.moderation.emptyVerifications}</p>
          )}

          {!isLoading &&
            tab === 'verifications' &&
            verifications.map((req) => (
              <div key={req.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="text-xs text-slate-500">
                  {new Date(req.createdAt).toLocaleString('ru-RU')} · {req.teacherId}
                </div>
                <div className="text-sm font-semibold text-slate-900">{req.reviewId}</div>
                {req.note && <p className="text-sm text-slate-600">{req.note}</p>}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openProof(req.proofPath)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t.moderation.openProof}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => handleVerification(req, true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-full transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t.moderation.approve}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => handleVerification(req, false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 disabled:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    {t.moderation.reject}
                  </button>
                </div>
              </div>
            ))}

          {!isLoading && tab === 'responses' && responses.length === 0 && (
            <p className="text-sm text-slate-500">{t.moderation.emptyResponses}</p>
          )}

          {decisionError && tab === 'responses' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {decisionError}
            </div>
          )}

          {!isLoading &&
            tab === 'responses' &&
            responses.map((resp) => (
              <div key={resp.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="text-xs text-slate-500">
                  {new Date(resp.createdAt).toLocaleString('ru-RU')} · {resp.teacherId}
                  {resp.reviewId ? ` · ${resp.reviewId}` : ''}
                </div>
                <div className="text-sm font-semibold text-slate-900">{resp.authorName}</div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{resp.responseText}</p>

                {/* Approving publishes a public "identity verified" badge, so the
                    proof has to be in front of whoever clicks it. */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 space-y-1.5">
                  <div className="text-2xs font-bold text-amber-900">
                    {t.moderation.identityProof}
                  </div>
                  {resp.proofPath ? (
                    <button
                      type="button"
                      onClick={() => openProof(resp.proofPath!)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 underline hover:text-amber-700 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t.moderation.openProof}
                    </button>
                  ) : (
                    <div className="text-xs text-red-700 font-semibold">
                      {t.moderation.noProof}
                    </div>
                  )}
                  <div className="text-2xs text-amber-800/80">{t.moderation.compareHint}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busyId === resp.id}
                    onClick={() => handleResponse(resp, true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-full transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t.moderation.approve}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === resp.id}
                    onClick={() => handleResponse(resp, false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 disabled:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    {t.moderation.reject}
                  </button>
                </div>
              </div>
            ))}

          {!isLoading && tab === 'messages' && messages.length === 0 && (
            <p className="text-sm text-slate-500">{t.moderation.emptyMessages}</p>
          )}

          {!isLoading &&
            tab === 'messages' &&
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`border rounded-xl p-4 space-y-2 ${
                  msg.isRead ? 'border-slate-200' : 'border-indigo-200 bg-indigo-50/40'
                }`}
              >
                <div className="text-xs text-slate-500">
                  {new Date(msg.createdAt).toLocaleString('ru-RU')}
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {msg.name || t.moderation.noName} · <span className="font-normal">{msg.email}</span>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{msg.message}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={`mailto:${msg.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {t.moderation.replyByEmail}
                  </a>
                  {!msg.isRead && (
                    <button
                      type="button"
                      disabled={busyId === msg.id}
                      onClick={() => handleMarkRead(msg)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-full transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {t.moderation.markRead}
                    </button>
                  )}
                </div>
              </div>
            ))}

          {tab === 'reviews' && (
            <div className="space-y-3">
              <input
                type="text"
                value={reviewSearch}
                onChange={(e) => {
                  setReviewSearch(e.target.value);
                  setVisibleReviewCount(REVIEWS_PAGE_SIZE);
                }}
                placeholder={t.moderation.reviewsSearchPlaceholder}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />

              {reviewRatingError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {reviewRatingError}
                </div>
              )}

              {reviewsLoading && <p className="text-sm text-slate-500">{t.moderation.loading}</p>}

              {!reviewsLoading && filteredReviews.length === 0 && (
                <p className="text-sm text-slate-500">{t.moderation.reviewsEmpty}</p>
              )}

              {!reviewsLoading &&
                filteredReviews.slice(0, visibleReviewCount).map((r) => (
                  <div key={r.id} className="border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{r.teacherName}</div>
                        <div className="text-2xs text-slate-400 truncate">
                          {r.isAnonymous ? '—' : r.authorName} · {r.date}
                          {r.isHidden ? ` · ${t.moderation.reviewsHiddenBadge}` : ''}
                        </div>
                      </div>
                      <EditableStars
                        rating={r.overallRating}
                        disabled={busyId === r.id}
                        onChange={(next) => handleRatingChange(r, next)}
                      />
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{r.fullReview}</p>
                  </div>
                ))}

              {filteredReviews.length > visibleReviewCount && (
                <button
                  type="button"
                  onClick={() => setVisibleReviewCount((c) => c + REVIEWS_PAGE_SIZE)}
                  className="w-full text-center py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  {t.moderation.reviewsLoadMore}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

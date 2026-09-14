import React, { useState } from 'react';
import { Review, Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { submitTeacherResponse } from '../lib/api';
import { X, MessageSquareReply, Check } from 'lucide-react';

interface TeacherResponseModalProps {
  teacher: Teacher;
  reviews: Review[];
  currentLang: SupportedLang;
  /** This instructor already has a published statement; the DB allows only one. */
  hasApprovedResponse?: boolean;
  onClose: () => void;
}

export const TeacherResponseModal: React.FC<TeacherResponseModalProps> = ({
  teacher,
  reviews,
  currentLang,
  hasApprovedResponse = false,
  onClose,
}) => {
  useEscapeKey(onClose);
  const t = TRANSLATIONS[currentLang];
  const [authorName, setAuthorName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [responseText, setResponseText] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !contactEmail.trim() || !responseText.trim()) {
      setError(t.responseModal.errorRequired);
      return;
    }
    if (!proofFile) {
      setError(t.responseModal.errorProof);
      return;
    }
    if (proofFile.size > 8 * 1024 * 1024) {
      setError(t.responseModal.errorProofSize);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setError(t.responseModal.errorEmail);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await submitTeacherResponse({
        teacherId: teacher.id,
        reviewId: reviewId || undefined,
        authorName,
        contactEmail,
        responseText,
        proofFile,
      });
      setIsDone(true);
    } catch {
      setError(t.responseModal.errorGeneric);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquareReply className="w-5 h-5" />
              {t.responseModal.title}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              {t.responseModal.subtitle} — {teacher.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.responseModal.close}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isDone ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-900">{t.responseModal.successTitle}</p>
            <p className="text-sm text-slate-600">{t.responseModal.successBody}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-full transition-colors cursor-pointer"
            >
              {t.responseModal.close}
            </button>
          </div>
        ) : hasApprovedResponse ? (
          <div className="p-6 space-y-3 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {t.responseModal.alreadyRespondedTitle}
            </p>
            <p className="text-sm text-slate-600">{t.responseModal.alreadyRespondedBody}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-full transition-colors cursor-pointer"
            >
              {t.responseModal.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div className="text-xs text-slate-600 bg-indigo-50 border border-indigo-100 rounded-xl p-3 leading-relaxed">
              {t.responseModal.moderationNote}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.responseModal.nameLabel} *
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={teacher.name}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.responseModal.emailLabel} *
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-2xs text-slate-400 mt-1">{t.responseModal.emailNote}</p>
              </div>
            </div>

            {reviews.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.responseModal.reviewLabel}
                </label>
                <select
                  value={reviewId}
                  onChange={(e) => setReviewId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">{t.responseModal.reviewNone}</option>
                  {reviews.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.overallRating}★ — {r.title.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Without this the statement is an anonymous claim published under
                a named person — the impersonation risk the feature exists to
                remove. Stored in a private bucket, admin-only. */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
              <label className="block text-xs font-bold text-amber-950 mb-1">
                {t.responseModal.proofLabel} *
              </label>
              <p className="text-2xs text-amber-800/80 mb-2 leading-relaxed">
                {t.responseModal.proofHint}
              </p>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-slate-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 file:cursor-pointer cursor-pointer"
              />
              {proofFile && (
                <p className="text-2xs text-amber-900 mt-1.5 font-medium">
                  {proofFile.name} — {(proofFile.size / 1024).toFixed(0)} KB
                </p>
              )}
              <p className="text-2xs text-amber-800/70 mt-1.5">{t.responseModal.proofPrivacy}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.responseModal.textLabel} *
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={6}
                placeholder={t.responseModal.textPlaceholder}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                {t.responseModal.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-full transition-colors cursor-pointer"
              >
                <MessageSquareReply className="w-4 h-4" />
                {isSubmitting ? t.responseModal.submitting : t.responseModal.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

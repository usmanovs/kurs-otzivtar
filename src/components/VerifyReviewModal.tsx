import React, { useState } from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { submitVerificationProof } from '../lib/api';
import { X, ShieldCheck, Upload, Check } from 'lucide-react';

interface VerifyReviewModalProps {
  reviewId: string;
  teacherId: string;
  currentLang: SupportedLang;
  onClose: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const VerifyReviewModal: React.FC<VerifyReviewModalProps> = ({
  reviewId,
  teacherId,
  currentLang,
  onClose,
}) => {
  useEscapeKey(onClose);
  const t = TRANSLATIONS[currentLang];
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    setError('');
    if (!picked) return;
    if (!ACCEPTED.includes(picked.type)) {
      setError(t.verifyModal.errorType);
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError(t.verifyModal.errorSize);
      return;
    }
    setFile(picked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(t.verifyModal.errorNoFile);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await submitVerificationProof(reviewId, teacherId, file, note);
      setIsDone(true);
    } catch {
      setError(t.verifyModal.errorGeneric);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              {t.verifyModal.title}
            </h2>
            <p className="text-sm text-slate-300 mt-1">{t.verifyModal.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.verifyModal.close}
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
            <p className="text-sm font-semibold text-slate-900">{t.verifyModal.successTitle}</p>
            <p className="text-sm text-slate-600">{t.verifyModal.successBody}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-full transition-colors cursor-pointer"
            >
              {t.verifyModal.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div className="text-xs text-slate-600 bg-indigo-50 border border-indigo-100 rounded-xl p-3 leading-relaxed">
              {t.verifyModal.privacyNote}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.verifyModal.fileLabel} *
              </label>
              <label className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-sm cursor-pointer hover:border-indigo-400 transition-colors">
                <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate text-slate-600">
                  {file ? file.name : t.verifyModal.filePlaceholder}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.verifyModal.noteLabel}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={t.verifyModal.notePlaceholder}
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
                {t.verifyModal.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-full transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {isSubmitting ? t.verifyModal.submitting : t.verifyModal.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

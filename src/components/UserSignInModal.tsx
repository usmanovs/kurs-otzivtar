import React, { useState } from 'react';
import { X, User, Send, KeyRound } from 'lucide-react';
import { sendReviewEmailCode, verifySignInCode } from '../lib/auth';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { SupportedLang, TRANSLATIONS } from '../translations';

interface UserSignInModalProps {
  currentLang: SupportedLang;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * The reviewer-facing sibling of AdminLoginModal — same email-code shape,
 * but for an arbitrary address instead of the one fixed admin email, and the
 * session it produces is meant to stick around rather than being a one-time
 * checkpoint. Signing in here is what lets someone skip the per-review email
 * code on every positive review after the first one.
 */
export const UserSignInModal: React.FC<UserSignInModalProps> = ({
  currentLang,
  onClose,
  onSuccess,
}) => {
  const t = TRANSLATIONS[currentLang];
  useEscapeKey(onClose);
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t.addReviewModal.errorEmailInvalid);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendReviewEmailCode(email.trim());
      setStep('verify');
    } catch {
      setError(t.addReviewModal.errorEmailSendFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError(t.addReviewModal.errorEmailCodeRequired);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifySignInCode(email.trim(), code);
      onSuccess();
      onClose();
    } catch {
      setError(t.addReviewModal.errorEmailCodeInvalid);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div
        className="bg-white w-full max-w-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-300" />
            <h2 className="text-lg font-bold">{t.userAuth.signInTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.detailModal.close}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-2xs text-slate-500 -mt-1">{t.userAuth.signInHint}</p>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.addReviewModal.emailLabel}
                </label>
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.addReviewModal.emailPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded-full transition-colors shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? t.userAuth.sending : t.addReviewModal.sendCodeBtn}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-slate-500">
                {t.addReviewModal.codeSentTo.replace('{email}', email.trim())}
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.addReviewModal.codeLabel}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t.addReviewModal.codePlaceholder}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded-full transition-colors shadow-xs cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? t.userAuth.verifying : t.userAuth.confirmBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError('');
                }}
                className="w-full text-center text-2xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {t.addReviewModal.changeEmailBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, ShieldCheck, Send, KeyRound } from 'lucide-react';
import { ADMIN_EMAIL, sendAdminLoginCode, verifyAdminLoginCode } from '../lib/auth';

interface AdminLoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    try {
      await sendAdminLoginCode();
      setStep('verify');
    } catch (e: any) {
      setError(e.message || 'Ката кетти. Кайра аракет кылыңыз.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await verifyAdminLoginCode(code);
      if (session) {
        onSuccess();
        onClose();
      } else {
        setError('Код туура эмес же мөөнөтү бүттү.');
      }
    } catch (e: any) {
      setError(e.message || 'Код туура эмес же мөөнөтү бүттү.');
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
            <ShieldCheck className="w-5 h-5 text-indigo-300" />
            <h2 className="text-lg font-bold">Admin кирүү</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {step === 'request' ? (
            <>
              <p className="text-sm text-slate-600">
                Тастыктоо коду <span className="font-semibold text-slate-900">{ADMIN_EMAIL}</span> дарегине жөнөтүлөт.
              </p>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded-full transition-colors shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Жөнөтүлүүдө...' : 'Код жөнөтүү'}</span>
              </button>
            </>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Электрондук почтаңызга келген код
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded-full transition-colors shadow-xs cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Текшерилүүдө...' : 'Ырастоо'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

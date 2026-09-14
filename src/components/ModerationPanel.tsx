import React, { useEffect, useState } from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  VerificationRequest,
  TeacherResponse,
  fetchPendingVerifications,
  fetchPendingResponses,
  createProofSignedUrl,
  decideVerification,
  decideTeacherResponse,
} from '../lib/api';
import { X, ShieldCheck, MessageSquareReply, ExternalLink, Check, Ban } from 'lucide-react';

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
  const [tab, setTab] = useState<'verifications' | 'responses'>('verifications');
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [responses, setResponses] = useState<TeacherResponse[]>([]);
  const [decisionError, setDecisionError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const [v, r] = await Promise.all([fetchPendingVerifications(), fetchPendingResponses()]);
    setVerifications(v);
    setResponses(r);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

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
      <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
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
        </div>
      </div>
    </div>
  );
};

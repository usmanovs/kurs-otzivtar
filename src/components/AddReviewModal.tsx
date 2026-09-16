import React, { useState, useMemo } from 'react';
import { CourseCategory, Review, StudentStatus, Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import {
  teacherNameKey,
  submitVerificationProof,
  checkReviewCooldown,
  type ReviewEnrichment,
  type NewTeacherSocials,
} from '../lib/api';
import { sendReviewEmailCode, verifyReviewEmailCode } from '../lib/auth';
import { TikTokIcon } from './TikTokIcon';
import { NON_CREATABLE_CATEGORIES } from '../lib/subniches';
import {
  PRO_TAGS,
  CON_TAGS,
  tagLabel,
  PRICE_PRESETS_KGS,
  DURATION_PRESETS_MONTHS,
} from '../lib/reviewTags';
import {
  X,
  Star,
  AlertTriangle,
  Send,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Plus,
  Minus,
  ShieldCheck,
  UploadCloud,
  Mail,
  Instagram,
  Youtube,
} from 'lucide-react';

interface AddReviewModalProps {
  teachers: Teacher[];
  preSelectedTeacher: Teacher | null;
  currentLang: SupportedLang;
  /** A signed-in account is already a verified identity — skips the
   *  per-review email code entirely, admin included. */
  isUserSignedIn: boolean;
  signedInEmail?: string;
  onClose: () => void;
  /** Saves the review and resolves with its id, or null if the save failed. */
  onSubmitReview: (
    teacherName: string,
    reviewData: Omit<Review, 'id' | 'date' | 'helpfulCount' | 'unhelpfulCount'>,
    newTeacherCategory?: CourseCategory,
    newTeacherSocials?: NewTeacherSocials
  ) => Promise<{ reviewId: string; teacherId: string; editToken: string } | null>;
  /** Patches a review that is already saved. */
  onEnrichReview: (
    reviewId: string,
    patch: ReviewEnrichment,
    whatsappNumber?: string,
    editToken?: string
  ) => Promise<boolean>;
}

export const AddReviewModal: React.FC<AddReviewModalProps> = ({
  teachers,
  preSelectedTeacher,
  currentLang,
  isUserSignedIn,
  signedInEmail,
  onClose,
  onSubmitReview,
  onEnrichReview,
}) => {
  useEscapeKey(onClose);
  useBodyScrollLock();
  const t = TRANSLATIONS[currentLang];

  // Step 1 saves the review outright; step 2 only ever edits that saved row,
  // so abandoning it costs the reviewer nothing.
  const [step, setStep] = useState<1 | 2>(1);
  const [savedReviewId, setSavedReviewId] = useState<string | null>(null);
  const [savedTeacherId, setSavedTeacherId] = useState<string | null>(null);
  // Held in memory only, for this flow: proves step 2 is the author of step 1.
  const [editToken, setEditToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --- step 1 ---
  const [teacherName, setTeacherName] = useState(preSelectedTeacher?.name || '');
  const [newTeacherCategory, setNewTeacherCategory] = useState<CourseCategory | ''>('');
  const [newTeacherInstagram, setNewTeacherInstagram] = useState('');
  const [newTeacherYoutube, setNewTeacherYoutube] = useState('');
  const [newTeacherTiktok, setNewTeacherTiktok] = useState('');
  const [overallRating, setOverallRating] = useState<number>(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(true);
  const [fullReview, setFullReview] = useState('');
  const [attested, setAttested] = useState(false);
  // Proof lives here rather than on step 2: someone who came to submit a
  // verified review needs to see it while writing, not after.
  const [wantsProof, setWantsProof] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofDragging, setProofDragging] = useState(false);
  const [proofError, setProofError] = useState('');

  // A 3+ star review needs a confirmed inbox before it saves — someone
  // faking praise for themselves or a friend has to also control an email
  // account for it. Below 3 stars none of this renders or runs; a complaint
  // stays exactly as frictionless as it was before this feature existed.
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStage, setEmailStage] = useState<'collect' | 'code-sent' | 'verified'>('collect');
  // Passed once, then remembered — handleSaveReview runs again on every step
  // of the email dance, and this check shouldn't re-fire on each of those.
  const [cooldownChecked, setCooldownChecked] = useState(false);

  // --- step 2 ---
  const [proTags, setProTags] = useState<string[]>([]);
  const [conTags, setConTags] = useState<string[]>([]);
  const [pricePaidKGS, setPricePaidKGS] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [teacherRating, setTeacherRating] = useState(0);
  const [practiceRating, setPracticeRating] = useState(0);
  const [jobSupportRating, setJobSupportRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [authorStatus, setAuthorStatus] = useState<StudentStatus>('graduate');
  const [hasJobScamReport, setHasJobScamReport] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  const knownTeacherNames = useMemo(
    () => teachers.map((teacher) => teacher.name.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [teachers]
  );

  // Must mirror submitReview()'s lookup exactly, or we'd ask for a category at
  // the wrong moments.
  const willCreateTeacher = useMemo(() => {
    const normalized = teacherNameKey(teacherName);
    if (!normalized) return false;
    return !teachers.some((teacher) => teacherNameKey(teacher.name) === normalized);
  }, [teacherName, teachers]);

  // Only meaningful once the teacher already exists — nobody can have
  // reviewed a profile in the last 24 hours that doesn't exist yet.
  const matchedTeacherId = useMemo(() => {
    const normalized = teacherNameKey(teacherName);
    if (!normalized) return undefined;
    return teachers.find((teacher) => teacherNameKey(teacher.name) === normalized)?.id;
  }, [teacherName, teachers]);

  // A signed-in account is already a verified inbox — asking for a fresh
  // code on every review would just repeat a check already passed at sign-in.
  const needsEmailConfirmation = overallRating >= 3 && !isUserSignedIn;

  const getRatingDesc = (val: number) =>
    ['', 'Өтө начар / Шектүү курс', 'Начар / Көңүл калтырган', 'Орточо / Кемчиликтери бар', 'Жакшы / Сапаттуу', 'Мыкты / Толук акталды'][val] || '';

  // Functional update, so two chips tapped inside one React batch can't
  // overwrite each other via a stale closure.
  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>, value: string) =>
    set((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));

  const starRow = (label: string, value: number, setter: (v: number) => void) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setter(star === value ? 0 : star)}
            className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none cursor-pointer transition-colors"
          >
            <Star
              className={`w-5 h-5 ${
                star <= value
                  ? value < 3
                    ? 'fill-red-500 text-red-500'
                    : 'fill-amber-400 text-amber-400'
                  : 'text-slate-200 fill-slate-100'
              }`}
            />
          </button>
        ))}
        <span className="text-xs font-bold text-slate-800 w-6 text-right">{value || '–'}</span>
      </div>
    </div>
  );

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!teacherName.trim()) {
      setErrorMsg('Мугалимдин же ментордун атын жазыңыз!');
      return;
    }
    if (willCreateTeacher && !newTeacherCategory) {
      setErrorMsg(t.addReviewModal.errorNewTeacherCategory);
      return;
    }
    if (
      willCreateTeacher &&
      !newTeacherInstagram.trim() &&
      !newTeacherYoutube.trim() &&
      !newTeacherTiktok.trim()
    ) {
      setErrorMsg(t.addReviewModal.errorNewTeacherSocial);
      return;
    }
    if (overallRating === 0) {
      setErrorMsg('Жалпы бааны тандаңыз — жылдыздардын бирин басыңыз.');
      return;
    }
    if (!fullReview.trim() || fullReview.trim().length < 20) {
      setErrorMsg('Сын-пикириңизди толугураак жазыңыз (кеминде 20 белги)');
      return;
    }
    if (!attested) {
      setErrorMsg(t.addReviewModal.errorAttest);
      return;
    }
    if (wantsProof && !proofFile) {
      setErrorMsg(t.verifyModal.errorNoFile);
      return;
    }
    // Matches the 5 MB the privacy/size copy promises.
    if (proofFile && proofFile.size > 5 * 1024 * 1024) {
      setErrorMsg(t.verifyModal.errorSize);
      return;
    }

    // Checked before the email dance, not after — someone blocked by this
    // shouldn't have to verify a code first only to be told no at the end.
    // A brand-new teacher has no history to collide with, so this only
    // applies once matchedTeacherId resolves to an existing profile.
    if (matchedTeacherId && !cooldownChecked) {
      setBusy(true);
      const allowed = await checkReviewCooldown(matchedTeacherId);
      setBusy(false);
      if (!allowed) {
        setErrorMsg(t.addReviewModal.errorCooldown);
        return;
      }
      setCooldownChecked(true);
    }

    // The rest of the form is valid. For 3+ stars, this same submit button
    // now drives the email checkpoint instead of saving directly — first
    // click sends the code, second click verifies it and, on success, falls
    // straight through into the save below so confirming doesn't cost a
    // third click.
    if (needsEmailConfirmation && emailStage !== 'verified') {
      if (emailStage === 'collect') {
        if (!/^\S+@\S+\.\S+$/.test(reviewerEmail.trim())) {
          setErrorMsg(t.addReviewModal.errorEmailInvalid);
          return;
        }
        setErrorMsg('');
        setBusy(true);
        try {
          await sendReviewEmailCode(reviewerEmail.trim());
          setEmailStage('code-sent');
        } catch {
          setErrorMsg(t.addReviewModal.errorEmailSendFailed);
        }
        setBusy(false);
        return;
      }

      if (!emailCode.trim()) {
        setErrorMsg(t.addReviewModal.errorEmailCodeRequired);
        return;
      }
      setErrorMsg('');
      setBusy(true);
      try {
        await verifyReviewEmailCode(reviewerEmail.trim(), emailCode.trim());
      } catch {
        setErrorMsg(t.addReviewModal.errorEmailCodeInvalid);
        setBusy(false);
        return;
      }
      setEmailStage('verified');
      // busy stays true — the save below continues in this same click.
    }

    setErrorMsg('');
    setBusy(true);
    const saved = await onSubmitReview(
      teacherName.trim(),
      {
        authorName: 'Студент',
        isAnonymous: false,
        authorStatus: 'graduate',
        isVerified: attested,
        overallRating,
        // Unrated: the sub-criteria live on step 2, and averaging a default
        // nobody chose would invent scores. 0 is excluded from the averages.
        teacherRating: 0,
        practiceRating: 0,
        jobSupportRating: 0,
        valueRating: 0,
        wouldRecommend,
        title: wouldRecommend ? 'Жакшы тажрыйба болду' : 'Көңүл калтырган тажрыйба',
        fullReview: fullReview.trim(),
        pros: [],
        cons: [],
      },
      willCreateTeacher ? (newTeacherCategory as CourseCategory) : undefined,
      willCreateTeacher
        ? {
            instagramUrl: newTeacherInstagram.trim() || undefined,
            youtubeUrl: newTeacherYoutube.trim() || undefined,
            tiktokUrl: newTeacherTiktok.trim() || undefined,
          }
        : undefined
    );
    if (!saved) {
      setBusy(false);
      return; // App already surfaced the failure; keep their text on screen
    }
    // The proof can only be attached once the row exists, so it is uploaded
    // here rather than on submit. A failure must not cost them the review.
    if (wantsProof && proofFile) {
      try {
        await submitVerificationProof(saved.reviewId, saved.teacherId, proofFile);
      } catch {
        setProofError(t.addReviewModal.proofUploadFailed);
      }
    }
    setBusy(false);
    setSavedReviewId(saved.reviewId);
    setSavedTeacherId(saved.teacherId);
    setEditToken(saved.editToken);
    setStep(2);
  };

  const handleFinish = async () => {
    if (busy || !savedReviewId) return;
    const patch: ReviewEnrichment = {};
    if (proTags.length) patch.pros = proTags;
    if (conTags.length) patch.cons = conTags;
    if (pricePaidKGS) patch.pricePaidKGS = parseInt(pricePaidKGS, 10);
    if (durationMonths) patch.durationMonths = parseInt(durationMonths, 10);
    if (teacherRating) patch.teacherRating = teacherRating;
    if (practiceRating) patch.practiceRating = practiceRating;
    if (jobSupportRating) patch.jobSupportRating = jobSupportRating;
    if (valueRating) patch.valueRating = valueRating;
    if (isAnonymous) {
      patch.authorName = 'Анонимдүү бүтүрүүчү';
      patch.isAnonymous = true;
    } else if (authorName.trim()) {
      patch.authorName = authorName.trim();
      patch.isAnonymous = false;
    }
    if (authorStatus !== 'graduate') patch.authorStatus = authorStatus;
    if (hasJobScamReport) patch.hasJobScamReport = true;

    setBusy(true);
    await onEnrichReview(savedReviewId, patch, whatsappNumber.trim() || undefined, editToken ?? undefined);
    if (proofFile && savedTeacherId) {
      try {
        await submitVerificationProof(savedReviewId, savedTeacherId, proofFile);
      } catch {
        // The review and its details are already saved; only the badge request
        // failed, so say so rather than discarding everything else.
        setProofError(t.verifyModal.errorGeneric);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    onClose();
  };

  const chip = (active: boolean, tone: 'pro' | 'con' | 'neutral' = 'neutral') =>
    `px-3 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1 min-h-[38px] ${
      active
        ? tone === 'pro'
          ? 'bg-emerald-600 text-white border-emerald-600'
          : tone === 'con'
            ? 'bg-red-600 text-white border-red-600'
            : 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
    }`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">
              {step === 1 ? t.addReviewModal.title : t.addReviewModal.step2Title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {step === 1 ? t.addReviewModal.subtitle : t.addReviewModal.step2Subtitle}
            </p>
          </div>
          <button
            type="button"
            id="close-add-review-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.detailModal.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSaveReview} className="overflow-y-auto p-5 sm:p-7 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.addReviewModal.teacherName} *
              </label>
              <input
                type="text"
                id="teacher-name-input"
                list="known-teacher-names"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Мис: Азиретали Барпиев"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
              <datalist id="known-teacher-names">
                {knownTeacherNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            {/* This review is about to create the profile, so it is the only
                chance to file it under something. */}
            {willCreateTeacher && (
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100">
                <label className="block text-xs font-bold text-amber-950 mb-1">
                  {t.addReviewModal.newTeacherCategory} *
                </label>
                <p className="text-2xs text-amber-800/80 mb-2">
                  {t.addReviewModal.newTeacherCategoryHint}
                </p>
                <select
                  id="new-review-teacher-category"
                  value={newTeacherCategory}
                  onChange={(e) => setNewTeacherCategory(e.target.value as CourseCategory | '')}
                  className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  required
                >
                  <option value="" disabled>
                    {t.addTeacherModal.categoryNone}
                  </option>
                  {(Object.keys(t.categories) as (CourseCategory | 'all')[])
                    .filter((key) => !NON_CREATABLE_CATEGORIES.includes(key))
                    .map((key) => (
                      <option key={key} value={key}>
                        {t.categories[key as CourseCategory]}
                      </option>
                    ))}
                </select>

                {/* A name and a category alone gave no way to tell a real
                    instructor from a typo or a settled score, and no way for
                    the person named to ever find this and respond. At least
                    one real, checkable handle is required — any one of the
                    three, since not every instructor is on all of them. */}
                <label className="block text-xs font-bold text-amber-950 mt-3 mb-1">
                  {t.addReviewModal.newTeacherSocial} *
                </label>
                <p className="text-2xs text-amber-800/80 mb-2">
                  {t.addReviewModal.newTeacherSocialHint}
                </p>
                <div className="space-y-2">
                  <div className="relative">
                    <Instagram className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-700/50" />
                    <input
                      type="text"
                      id="new-review-teacher-instagram"
                      value={newTeacherInstagram}
                      onChange={(e) => setNewTeacherInstagram(e.target.value)}
                      placeholder="Instagram (instagram.com/...)"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <div className="relative">
                    <Youtube className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-700/50" />
                    <input
                      type="text"
                      id="new-review-teacher-youtube"
                      value={newTeacherYoutube}
                      onChange={(e) => setNewTeacherYoutube(e.target.value)}
                      placeholder="YouTube (youtube.com/@...)"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <div className="relative">
                    <TikTokIcon className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-700/50" />
                    <input
                      type="text"
                      id="new-review-teacher-tiktok"
                      value={newTeacherTiktok}
                      onChange={(e) => setNewTeacherTiktok(e.target.value)}
                      placeholder="TikTok (tiktok.com/@...)"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100">
              <label className="block text-xs font-bold text-indigo-950 mb-2">
                {t.addReviewModal.overallRating}
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    id={`select-overall-star-${star}`}
                    onClick={() => setOverallRating(star)}
                    className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= overallRating
                          ? overallRating < 3
                            ? 'fill-red-500 text-red-500'
                            : 'fill-amber-400 text-amber-400'
                          : 'text-slate-200 fill-slate-100'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-1 text-xs font-semibold text-indigo-900">
                  {overallRating > 0 ? `${overallRating} / 5 — ${getRatingDesc(overallRating)}` : 'Жылдызды тандаңыз'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.addReviewModal.recommendQuestion} *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="recommend-yes-btn"
                  onClick={() => setWouldRecommend(true)}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    wouldRecommend
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{t.addReviewModal.yes}</span>
                </button>
                <button
                  type="button"
                  id="recommend-no-btn"
                  onClick={() => setWouldRecommend(false)}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    !wouldRecommend
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>{t.addReviewModal.no}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.addReviewModal.fullReview} *
              </label>
              <textarea
                id="full-review-textarea"
                rows={4}
                value={fullReview}
                onChange={(e) => setFullReview(e.target.value)}
                placeholder="Мугалим тууралуу кененирээк жазыңыз: кандай сабак өттү, үй тапшырмалар текшерилдиби, убада кылынган жумушка же стажировкага жардам берилдиби..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                id="attest-checkbox"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-emerald-900 font-medium">
                {t.addReviewModal.attestLabel} *
              </span>
            </label>

            {/* Says explicitly why there's no code step, rather than the
                panel below just silently not appearing — that would read as
                a bug rather than as a benefit of being signed in. */}
            {isUserSignedIn && overallRating >= 3 && (
              <p className="text-2xs text-emerald-700 -mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                {t.userAuth.signedInAs.replace('{email}', signedInEmail || '')} —{' '}
                {t.userAuth.signedInHint}
              </p>
            )}

            {/* Only a positive rating (3+) triggers this — a complaint stays
                exactly as easy to file as before. Faking praise for yourself
                or a friend now also requires controlling a real inbox. */}
            {needsEmailConfirmation && emailStage !== 'verified' && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 animate-fade-in">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-indigo-900">
                      {t.addReviewModal.emailConfirmTitle}
                    </p>
                    <p className="text-2xs text-indigo-900/70 mt-0.5 leading-relaxed">
                      {t.addReviewModal.emailConfirmHint}
                    </p>

                    {emailStage === 'collect' ? (
                      <input
                        type="text"
                        inputMode="email"
                        autoComplete="email"
                        id="review-email-input"
                        value={reviewerEmail}
                        onChange={(e) => setReviewerEmail(e.target.value)}
                        placeholder={t.addReviewModal.emailPlaceholder}
                        aria-label={t.addReviewModal.emailLabel}
                        className="w-full mt-2.5 px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2 mt-2.5">
                          <p className="text-2xs font-medium text-indigo-900 truncate">
                            {t.addReviewModal.codeSentTo.replace('{email}', reviewerEmail.trim())}
                          </p>
                          <button
                            type="button"
                            id="review-email-change-btn"
                            onClick={() => {
                              setEmailStage('collect');
                              setEmailCode('');
                              setErrorMsg('');
                            }}
                            className="text-2xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer shrink-0"
                          >
                            {t.addReviewModal.changeEmailBtn}
                          </button>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          id="review-email-code-input"
                          value={emailCode}
                          onChange={(e) => setEmailCode(e.target.value)}
                          placeholder={t.addReviewModal.codePlaceholder}
                          aria-label={t.addReviewModal.codeLabel}
                          className="w-full mt-2 px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          id="review-email-resend-btn"
                          disabled={busy}
                          onClick={async () => {
                            setErrorMsg('');
                            setBusy(true);
                            try {
                              await sendReviewEmailCode(reviewerEmail.trim());
                            } catch {
                              setErrorMsg(t.addReviewModal.errorEmailSendFailed);
                            }
                            setBusy(false);
                          }}
                          className="mt-1.5 text-2xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-60 cursor-pointer"
                        >
                          {t.addReviewModal.resendCodeBtn}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Collapsed by default so the fast path stays fast, but visible
                to anyone who came here specifically to submit a verified
                review — which is what they were looking for and not finding. */}
            <div className="-mt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  id="want-proof-checkbox"
                  checked={wantsProof}
                  onChange={(e) => {
                    setWantsProof(e.target.checked);
                    if (!e.target.checked) setProofFile(null);
                  }}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  {t.addReviewModal.wantProofLabel}
                </span>
              </label>

              {wantsProof && (
                <div className="mt-2.5 ml-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 animate-fade-in">
                  <p className="text-2xs text-emerald-900/80 mb-2 leading-relaxed">
                    {t.addReviewModal.wantProofHint}
                  </p>
                  {/* A drop target as well as a picker: a receipt is usually
                      already sitting on the desktop or in the downloads
                      folder, and dragging it across beats a file dialog. */}
                  <label
                    htmlFor="review-proof-input"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setProofDragging(true);
                    }}
                    onDragLeave={() => setProofDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setProofDragging(false);
                      const dropped = e.dataTransfer.files?.[0];
                      if (dropped) setProofFile(dropped);
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-4 text-center transition-colors cursor-pointer ${
                      proofDragging
                        ? 'border-emerald-500 bg-emerald-100/70'
                        : 'border-emerald-300 bg-white/60 hover:border-emerald-400'
                    }`}
                  >
                    <UploadCloud className="w-5 h-5 text-emerald-600" />
                    <span className="text-2xs font-semibold text-emerald-900">
                      {t.addReviewModal.dropzoneCta}
                    </span>
                    <input
                      type="file"
                      id="review-proof-input"
                      accept="image/*,application/pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                  </label>
                  {proofFile && (
                    <p className="text-2xs text-emerald-900 mt-1.5 font-medium">
                      {proofFile.name} — {(proofFile.size / 1024).toFixed(0)} KB
                    </p>
                  )}
                  <p className="text-2xs text-emerald-900/70 mt-1.5 leading-relaxed">
                    {t.verifyModal.privacyNote}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                {t.addReviewModal.cancelBtn}
              </button>
              <button
                type="submit"
                id="submit-review-btn"
                disabled={busy}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full shadow-xs transition-colors cursor-pointer"
              >
                {needsEmailConfirmation && emailStage === 'collect' ? (
                  <>
                    <Mail className="w-4 h-4" />
                    {t.addReviewModal.sendCodeBtn}
                  </>
                ) : needsEmailConfirmation && emailStage === 'code-sent' ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    {t.addReviewModal.confirmAndPublishBtn}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t.addReviewModal.saveReviewBtn}
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="overflow-y-auto p-5 sm:p-7 space-y-5">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold">{t.addReviewModal.savedBanner}</span>
            </div>

            {/* The review saved; only the proof upload failed. Say which, so
                nobody thinks they have lost the review itself. */}
            {proofError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs">{proofError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-emerald-700 mb-2">
                {t.addReviewModal.quickProsLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {PRO_TAGS.map((tag) => {
                  const label = tagLabel(tag, currentLang);
                  const active = proTags.includes(label);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(setProTags, label)}
                      className={chip(active, 'pro')}
                    >
                      <Plus className="w-3 h-3" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-red-700 mb-2">
                {t.addReviewModal.quickConsLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {CON_TAGS.map((tag) => {
                  const label = tagLabel(tag, currentLang);
                  const active = conTags.includes(label);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(setConTags, label)}
                      className={chip(active, 'con')}
                    >
                      <Minus className="w-3 h-3" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {t.addReviewModal.pricePresetLabel}
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRICE_PRESETS_KGS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={pricePaidKGS === String(p)}
                    onClick={() => setPricePaidKGS(pricePaidKGS === String(p) ? '' : String(p))}
                    className={chip(pricePaidKGS === String(p))}
                  >
                    {p.toLocaleString('ru-RU')}
                  </button>
                ))}
                <input
                  type="number"
                  id="price-paid-input"
                  value={PRICE_PRESETS_KGS.includes(Number(pricePaidKGS)) ? '' : pricePaidKGS}
                  onChange={(e) => setPricePaidKGS(e.target.value)}
                  placeholder={t.addReviewModal.otherAmount}
                  className="w-32 px-3 py-2 min-h-[38px] bg-white border border-slate-300 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {t.addReviewModal.durationPresetLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS_MONTHS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={durationMonths === String(m)}
                    onClick={() => setDurationMonths(durationMonths === String(m) ? '' : String(m))}
                    className={chip(durationMonths === String(m))}
                  >
                    {m} {currentLang === 'ru' ? 'мес.' : 'ай'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              {starRow(t.addReviewModal.teacherRating, teacherRating, setTeacherRating)}
              {starRow(t.addReviewModal.practiceRating, practiceRating, setPracticeRating)}
              {starRow(t.addReviewModal.jobSupportRating, jobSupportRating, setJobSupportRating)}
              {starRow(t.addReviewModal.valueRating, valueRating, setValueRating)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.addReviewModal.authorName}
                </label>
                <input
                  type="text"
                  id="author-name-input"
                  disabled={isAnonymous}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Мис: Азамат же Айпери"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
                <label className="inline-flex items-center gap-2 mt-1.5 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    id="anonymous-checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Анонимдүү калтыруу</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.addReviewModal.authorStatus}
                </label>
                <select
                  id="author-status-select"
                  value={authorStatus}
                  onChange={(e) => setAuthorStatus(e.target.value as StudentStatus)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="graduate">{t.addReviewModal.statusGraduate}</option>
                  <option value="current_student">{t.addReviewModal.statusCurrent}</option>
                  <option value="dropped_out">{t.addReviewModal.statusDropped}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.addReviewModal.whatsappLabel}
              </label>
              <input
                type="tel"
                id="review-whatsapp-input"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+996 700 000 000"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-2xs text-slate-400 mt-1">{t.addReviewModal.whatsappNote}</p>
            </div>

            <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 cursor-pointer">
              <input
                type="checkbox"
                id="scam-warning-checkbox"
                checked={hasJobScamReport}
                onChange={(e) => setHasJobScamReport(e.target.checked)}
                className="mt-0.5 rounded text-red-600 focus:ring-red-500"
              />
              <span className="text-xs text-red-800 font-medium">
                {t.addReviewModal.scamWarningCheckbox}
              </span>
            </label>

            {/* A high rating and a scam report together are almost always a
                mis-tap on the big red label above — it sits right under the
                phone field. The combination can be genuine (good teaching,
                refund refused), so this confirms rather than blocks, and shows
                exactly what would be published on a named person's profile. */}
            {hasJobScamReport && overallRating >= 4 && (
              <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-900 leading-snug">
                  {t.addReviewModal.scamWarningConflict.replace('{n}', String(overallRating))}
                </p>
                <p className="mt-1.5 inline-flex items-start gap-1.5 text-2xs text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>{t.detailModal.scamWarningReported}</span>
                </p>
                <button
                  type="button"
                  id="scam-warning-undo-btn"
                  onClick={() => setHasJobScamReport(false)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-2xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  {t.addReviewModal.scamWarningUndo}
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                id="skip-enrichment-btn"
                onClick={onClose}
                className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                {t.addReviewModal.skipBtn}
              </button>
              <button
                type="button"
                id="finish-enrichment-btn"
                onClick={handleFinish}
                disabled={busy}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {t.addReviewModal.finishBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

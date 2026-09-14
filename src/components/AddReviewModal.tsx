import React, { useState, useMemo } from 'react';
import { CourseCategory, Review, StudentStatus, Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { teacherNameKey } from '../lib/api';
import {
  X,
  Star,
  AlertTriangle,
  Send,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AddReviewModalProps {
  teachers: Teacher[];
  preSelectedTeacher: Teacher | null;
  currentLang: SupportedLang;
  onClose: () => void;
  onSubmitReview: (
    teacherName: string,
    reviewData: Omit<Review, 'id' | 'date' | 'helpfulCount' | 'unhelpfulCount'>,
    // Only set when the name matches nobody in the directory and the review
    // is therefore about to mint a profile.
    newTeacherCategory?: CourseCategory
  ) => void;
}

export const AddReviewModal: React.FC<AddReviewModalProps> = ({
  teachers,
  preSelectedTeacher,
  currentLang,
  onClose,
  onSubmitReview,
}) => {
  useEscapeKey(onClose);
  const t = TRANSLATIONS[currentLang];

  const [teacherName, setTeacherName] = useState(preSelectedTeacher?.name || '');
  const [authorName, setAuthorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [authorStatus, setAuthorStatus] = useState<StudentStatus>('graduate');
  const [overallRating, setOverallRating] = useState<number>(0);
  const [teacherRating, setTeacherRating] = useState<number>(5);
  const [practiceRating, setPracticeRating] = useState<number>(4);
  const [jobSupportRating, setJobSupportRating] = useState<number>(3);
  const [valueRating, setValueRating] = useState<number>(4);
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(true);
  const [pricePaidKGS, setPricePaidKGS] = useState<string>('');
  const [durationMonths, setDurationMonths] = useState<string>('');
  const [cohortYear, setCohortYear] = useState<string>('');
  const [title, setTitle] = useState('');
  const [fullReview, setFullReview] = useState('');
  const [prosText, setProsText] = useState('');
  const [consText, setConsText] = useState('');
  const [adviceForNewcomers, setAdviceForNewcomers] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [hasJobScamReport, setHasJobScamReport] = useState(false);
  const [isVerified, setIsVerified] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [newTeacherCategory, setNewTeacherCategory] = useState<CourseCategory | ''>('');

  // Existing teacher/mentor names, for lookup-or-create autocomplete
  const knownTeacherNames = useMemo(() => {
    return teachers
      .map((teacher) => teacher.name.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [teachers]);

  // Submitting a review for a name nobody has reviewed yet silently creates the
  // profile, so this is the only moment anyone can say what it teaches. Must
  // match submitReview()'s lookup exactly, or we'd ask at the wrong times.
  const willCreateTeacher = useMemo(() => {
    const normalized = teacherNameKey(teacherName);
    if (!normalized) return false;
    return !teachers.some((teacher) => teacherNameKey(teacher.name) === normalized);
  }, [teacherName, teachers]);

  const getRatingDesc = (val: number) => {
    switch (val) {
      case 1:
        return 'Өтө начар / Шектүү курс';
      case 2:
        return 'Начар / Көңүл калтырган';
      case 3:
        return 'Орточо / Кемчиликтери бар';
      case 4:
        return 'Жакшы / Сапаттуу';
      case 5:
        return 'Мыкты / Толук акталды';
      default:
        return '';
    }
  };

  const handleStarPicker = (
    label: string,
    currentValue: number,
    setter: (v: number) => void
  ) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setter(star)}
              className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none cursor-pointer transition-colors"
            >
              <Star
                className={`w-5 h-5 ${
                  star <= currentValue
                    ? currentValue < 3
                      ? 'fill-red-500 text-red-500'
                      : 'fill-amber-400 text-amber-400'
                    : 'text-slate-200 fill-slate-100'
                }`}
              />
            </button>
          ))}
          <span className="text-xs font-bold text-slate-800 w-6 text-right">
            {currentValue}
          </span>
        </div>
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) {
      setErrorMsg('Мугалимдин же ментордун атын жазыңыз!');
      return;
    }
    if (willCreateTeacher && !newTeacherCategory) {
      setErrorMsg(t.addReviewModal.errorNewTeacherCategory);
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

    const pros = prosText
      .split('\n')
      .flatMap((p) => p.split(','))
      .map((p) => p.trim())
      .filter(Boolean);

    const cons = consText
      .split('\n')
      .flatMap((c) => c.split(','))
      .map((c) => c.trim())
      .filter(Boolean);

    const displayName = isAnonymous ? 'Анонимдүү бүтүрүүчү' : authorName.trim() || 'Студент';

    onSubmitReview(teacherName.trim(), {
      authorName: displayName,
      isAnonymous,
      authorStatus,
      isVerified,
      overallRating,
      teacherRating,
      practiceRating,
      jobSupportRating,
      valueRating,
      wouldRecommend,
      pricePaidKGS: pricePaidKGS ? parseInt(pricePaidKGS, 10) : undefined,
      durationMonths: durationMonths ? parseInt(durationMonths, 10) : undefined,
      cohortYear: cohortYear.trim() || undefined,
      title: title.trim() || (wouldRecommend ? 'Жакшы тажрыйба болду' : 'Көңүл калтырган тажрыйба'),
      fullReview: fullReview.trim(),
      pros,
      cons,
      adviceForNewcomers: adviceForNewcomers.trim() || undefined,
      whatsappNumber: whatsappNumber.trim() || undefined,
      hasJobScamReport,
    }, willCreateTeacher ? (newTeacherCategory as CourseCategory) : undefined);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">
              {t.addReviewModal.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {t.addReviewModal.subtitle}
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

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-7 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Teacher / Mentor Name */}
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
            {knownTeacherNames.length > 0 && (
              <p className="text-2xs text-slate-400 mt-1">
                Мурда кошулган мугалимдер сунушталат. Эгер мугалим тизмеде жок болсо, жөн эле атын жазыңыз — ал автоматтык түрдө кошулат.
              </p>
            )}
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
                  .filter((key) => key !== 'all')
                  .map((key) => (
                    <option key={key} value={key}>
                      {t.categories[key as CourseCategory]}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Overall Rating Selection */}
          <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100">
            <label className="block text-xs font-bold text-indigo-950 mb-2">
              {t.addReviewModal.overallRating}
            </label>
            <div className="flex items-center gap-2">
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
              <span className="ml-2 text-xs font-semibold text-indigo-900">
                {overallRating > 0 ? `${overallRating} / 5 — ${getRatingDesc(overallRating)}` : 'Жылдызды тандаңыз'}
              </span>
            </div>
          </div>

          {/* Would Recommend Radio */}
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

          {/* Full Review Text */}
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

          {/* Show more details toggle */}
          <button
            type="button"
            id="toggle-show-more-details-btn"
            onClick={() => setShowMore(!showMore)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            <span>{showMore ? t.addReviewModal.showLessDetails : t.addReviewModal.showMoreDetails}</span>
            {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMore && (
            <div className="space-y-5 pt-1 border-t border-slate-100">
              {/* Sub-criteria Ratings */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 mt-5">
                <div className="text-xs font-bold text-slate-900 mb-2">
                  Сапаттык критерийлер боюнча баалоо:
                </div>
                {handleStarPicker(t.addReviewModal.teacherRating, teacherRating, setTeacherRating)}
                {handleStarPicker(t.addReviewModal.practiceRating, practiceRating, setPracticeRating)}
                {handleStarPicker(t.addReviewModal.jobSupportRating, jobSupportRating, setJobSupportRating)}
                {handleStarPicker(t.addReviewModal.valueRating, valueRating, setValueRating)}
              </div>

              {/* Author Details */}
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

              {/* Pricing and Cohort Info */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Төлөнгөн сумма (сом)
                  </label>
                  <input
                    type="number"
                    id="price-paid-input"
                    value={pricePaidKGS}
                    onChange={(e) => setPricePaidKGS(e.target.value)}
                    placeholder="45000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Окуу мөөнөтү (ай)
                  </label>
                  <input
                    type="number"
                    id="duration-months-input"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    placeholder="6"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Окуган жылы
                  </label>
                  <input
                    type="text"
                    id="cohort-year-input"
                    value={cohortYear}
                    onChange={(e) => setCohortYear(e.target.value)}
                    placeholder="2024"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.addReviewModal.reviewTitle}
                </label>
                <input
                  type="text"
                  id="review-title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Мис: Жакшы түшүндүрөт, бирок дедлайндар өтө катуу"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Pros & Cons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">
                    {t.addReviewModal.prosLabel}
                  </label>
                  <textarea
                    id="review-pros-textarea"
                    rows={3}
                    value={prosText}
                    onChange={(e) => setProsText(e.target.value)}
                    placeholder="Мис: Түшүндүрүшү жеңил, жооптор так, ыраазымын"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-red-700 mb-1">
                    {t.addReviewModal.consLabel}
                  </label>
                  <textarea
                    id="review-cons-textarea"
                    rows={3}
                    value={consText}
                    onChange={(e) => setConsText(e.target.value)}
                    placeholder="Мис: Баасы кымбат, кеч жооп берет"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Advice for newcomers */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.addReviewModal.adviceLabel}
                </label>
                <input
                  type="text"
                  id="review-advice-input"
                  value={adviceForNewcomers}
                  onChange={(e) => setAdviceForNewcomers(e.target.value)}
                  placeholder="Мис: Курска чейин негиздерин кайра карап алыңыз"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* WhatsApp — optional, private, never shown publicly */}
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

              {/* Warning Flag Checkbox & Verification Checkbox */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
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

                <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    id="verified-student-checkbox"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-emerald-800 font-medium">
                    {t.addReviewModal.verifiedCheckbox}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
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
              id="submit-review-form-btn"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-colors shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{t.addReviewModal.submitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

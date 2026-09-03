import React, { useState } from 'react';
import { Course, Review } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import {
  X,
  Star,
  ShieldAlert,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Building2,
  Clock,
  Coins,
  ExternalLink,
  PlusCircle,
  AlertTriangle,
  Lightbulb,
  Award,
  Check,
  Filter
} from 'lucide-react';

interface CourseDetailModalProps {
  course: Course | null;
  currentLang: SupportedLang;
  onClose: () => void;
  onOpenAddReview: (course: Course) => void;
  onVoteReview: (courseId: string, reviewId: string, type: 'helpful' | 'unhelpful') => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  currentLang,
  onClose,
  onOpenAddReview,
  onVoteReview,
}) => {
  const [reviewTab, setReviewTab] = useState<'all' | 'positive' | 'negative' | 'verified'>('all');

  if (!course) return null;

  const t = TRANSLATIONS[currentLang];

  // Distribution calculation
  const totalReviews = course.reviews.length;
  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  course.reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.overallRating)));
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
  });

  // Filtered reviews
  const filteredReviews = course.reviews.filter((r) => {
    if (reviewTab === 'positive') return r.overallRating >= 4;
    if (reviewTab === 'negative') return r.overallRating <= 2;
    if (reviewTab === 'verified') return r.isVerified;
    return true;
  });

  const renderStars = (rating: number, size = 'w-4 h-4') => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(rating);
          return (
            <Star
              key={star}
              className={`${size} ${
                filled
                  ? rating < 3
                    ? 'fill-red-500 text-red-500'
                    : 'fill-amber-400 text-amber-400'
                  : 'text-slate-200 fill-slate-100'
              }`}
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>{course.academyName}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight">
              {course.name}
            </h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {course.durationText}
              </span>
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                {course.priceKGS.toLocaleString('ru-RU')} сом
              </span>
              {course.websiteOrInstagram && (
                <a
                  href={course.websiteOrInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200 underline font-medium"
                >
                  <span>Шилтеме</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <button
            type="button"
            id="close-detail-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.detailModal.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Warning banner if flagged */}
          {course.isWarningCourse && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
                  <span>{t.courseCard.warningBadge}</span>
                </h3>
                <p className="text-xs sm:text-sm text-red-800 leading-relaxed font-medium">
                  {course.warningNotice ||
                    'Бул курс боюнча студенттерден жалган убадалар, төлөмдү кайтарып бербөө же сапатсыз окутуу боюнча даттануулар келип түшкөн. Төлөм кылуудан мурун сын-пикирлерди толук окуп чыгыңыз!'}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
            {course.description}
          </div>

          {/* Overall Ratings & Sub-metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Main Score Box */}
            <div className="md:col-span-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
              <div
                className={`text-4xl sm:text-5xl font-bold mb-2 ${
                  course.averageRating >= 4
                    ? 'text-emerald-600'
                    : course.averageRating >= 3
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {course.averageRating.toFixed(1)}
              </div>
              {renderStars(course.averageRating, 'w-5 h-5')}
              <div className="text-xs text-slate-500 font-semibold mt-1">
                {course.reviewCount} {t.courseCard.reviewsCount} негизинде
              </div>

              {/* Recommendation rate */}
              <div className="mt-4 pt-3 border-t border-slate-200 w-full text-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    course.recommendPercent >= 70
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {course.recommendPercent >= 70 ? (
                    <ThumbsUp className="w-3.5 h-3.5" />
                  ) : (
                    <ThumbsDown className="w-3.5 h-3.5" />
                  )}
                  {course.recommendPercent}% {t.courseCard.recommendRate}
                </span>
              </div>
            </div>

            {/* Sub-scores breakdown */}
            <div className="md:col-span-8 grid grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium mb-1">{t.courseCard.teachers}</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">
                    {course.teacherRatingAvg.toFixed(1)} / 5
                  </span>
                  {renderStars(course.teacherRatingAvg)}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium mb-1">{t.courseCard.practice}</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">
                    {course.practiceRatingAvg.toFixed(1)} / 5
                  </span>
                  {renderStars(course.practiceRatingAvg)}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium mb-1">{t.courseCard.jobSupport}</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">
                    {course.jobSupportRatingAvg.toFixed(1)} / 5
                  </span>
                  {renderStars(course.jobSupportRatingAvg)}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium mb-1">{t.courseCard.value}</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">
                    {course.valueRatingAvg.toFixed(1)} / 5
                  </span>
                  {renderStars(course.valueRatingAvg)}
                </div>
              </div>

              {/* Score Distribution Bars */}
              <div className="col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  {t.detailModal.ratingDistribution}
                </div>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((score) => {
                    const count = ratingCounts[score] || 0;
                    const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    return (
                      <div key={score} className="flex items-center gap-2 text-xs">
                        <span className="w-4 font-semibold text-slate-600">{score}★</span>
                        <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
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

          {/* Action to write review - Clean Minimalism callout */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
            <div>
              <h4 className="text-sm font-bold text-indigo-950">
                Сиз дагы бул курста окудуңуз беле?
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
                onOpenAddReview(course);
              }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-full transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.courseCard.addReview}</span>
            </button>
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

              {/* Review Filter Tabs */}
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
              </div>
            </div>

            {/* List of Reviews */}
            <div className="space-y-4 mt-4">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  {t.detailModal.noReviewsYet}
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <div
                    key={review.id}
                    id={`review-item-${review.id}`}
                    className={`p-5 rounded-2xl border transition-all ${
                      review.overallRating <= 2
                        ? 'bg-red-50/30 border-red-200'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    {/* Reviewer Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                          {review.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900">
                              {review.authorName}
                            </span>
                            {review.isVerified && (
                              <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                {t.courseCard.verifiedGraduate}
                              </span>
                            )}
                          </div>
                          <div className="text-2xs text-slate-500 font-medium">
                            <span>{getStatusLabel(review.authorStatus)}</span>
                            {review.cohortYear && <span> • {review.cohortYear}</span>}
                            {review.durationMonths && <span> • {review.durationMonths} ай окуган</span>}
                            {review.pricePaidKGS && (
                              <span> • {review.pricePaidKGS.toLocaleString('ru-RU')} сом төлөгөн</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {renderStars(review.overallRating)}
                        <span className="text-xs text-slate-400 font-medium">{review.date}</span>
                      </div>
                    </div>

                    {/* Recommendation & Warning Badges */}
                    <div className="flex flex-wrap items-center gap-2 my-3">
                      {review.wouldRecommend ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {t.detailModal.recommendYes}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200">
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {t.detailModal.recommendNo}
                        </span>
                      )}

                      {review.hasJobScamReport && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-800 bg-red-100 px-2.5 py-0.5 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {t.detailModal.scamWarningReported}
                        </span>
                      )}
                    </div>

                    {/* Review Title & Content */}
                    <h4 className="text-base font-bold text-slate-900 mb-1">
                      {review.title}
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {review.fullReview}
                    </p>

                    {/* Pros & Cons Section */}
                    {(review.pros.length > 0 || review.cons.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                        {/* Pros */}
                        {review.pros.length > 0 && (
                          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                            <span className="font-bold text-emerald-800 block mb-1.5 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              {t.detailModal.pros}
                            </span>
                            <ul className="space-y-1 text-slate-700">
                              {review.pros.map((p, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-emerald-600 font-bold">•</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Cons */}
                        {review.cons.length > 0 && (
                          <div className="bg-red-50/70 p-3 rounded-xl border border-red-100">
                            <span className="font-bold text-red-800 block mb-1.5 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                              {t.detailModal.cons}
                            </span>
                            <ul className="space-y-1 text-slate-700">
                              {review.cons.map((c, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-red-600 font-bold">•</span>
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Advice for newcomers */}
                    {review.adviceForNewcomers && (
                      <div className="mt-3 p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs text-slate-800 flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-900 block">
                            {t.detailModal.advice}
                          </span>
                          <span>{review.adviceForNewcomers}</span>
                        </div>
                      </div>
                    )}

                    {/* Helpful votes footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>{t.detailModal.helpfulQuestion}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id={`vote-helpful-${review.id}`}
                          onClick={() => onVoteReview(course.id, review.id, 'helpful')}
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
                          onClick={() => onVoteReview(course.id, review.id, 'unhelpful')}
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
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
          >
            {t.detailModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};

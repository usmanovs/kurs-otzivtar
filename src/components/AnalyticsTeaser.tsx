import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { bayesianRating, FLAGGED_THRESHOLD } from '../lib/ratingTone';
import { ShieldAlert, ArrowRight } from 'lucide-react';

interface AnalyticsTeaserProps {
  teachers: Teacher[];
  currentLang: SupportedLang;
}

/**
 * A lightweight summary of the full /analytics dashboard, kept on the
 * homepage so the numbers stay visible without the heavy multi-card layout
 * that used to sit here.
 */
export const AnalyticsTeaser: React.FC<AnalyticsTeaserProps> = ({ teachers, currentLang }) => {
  const t = TRANSLATIONS[currentLang];
  const p = t.analyticsTeaser;

  const stats = useMemo(() => {
    const allReviews = teachers.flatMap((tch) => tch.reviews);
    const lowRated = allReviews.filter((r) => r.overallRating <= 2);
    const priced = lowRated.filter((r) => (r.pricePaidKGS ?? 0) > 0);
    const disputedSumKGS = priced.reduce((acc, r) => acc + (r.pricePaidKGS as number), 0);

    const proofVerified = allReviews.filter((r) => r.proofVerified).length;

    const recommendCount = allReviews.filter((r) => r.wouldRecommend).length;
    const recommendRate = allReviews.length > 0 ? (recommendCount / allReviews.length) * 100 : 0;

    const reviewedTeachers = teachers.filter((tch) => tch.reviewCount > 0);
    const flagged = reviewedTeachers.filter(
      (tch) => bayesianRating(tch.averageRating, tch.reviewCount) <= FLAGGED_THRESHOLD
    ).length;

    return { disputedSumKGS, proofVerified, recommendRate, flagged };
  }, [teachers]);

  if (teachers.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <ShieldAlert className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl border border-rose-200/70 bg-rose-50/60 p-3">
            <div className="text-lg font-extrabold text-rose-700 tabular-nums leading-tight">
              {stats.disputedSumKGS.toLocaleString('ru-RU')}
              <span className="text-2xs font-bold"> сом</span>
            </div>
            <div className="text-2xs text-rose-900/60 mt-0.5">{p.disputedLabel}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-lg font-extrabold text-slate-800 tabular-nums leading-tight">
              {stats.proofVerified}
            </div>
            <div className="text-2xs text-slate-500 mt-0.5">{p.verifiedLabel}</div>
          </div>
          <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3">
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-tight">
              {stats.recommendRate.toFixed(0)}%
            </div>
            <div className="text-2xs text-emerald-900/60 mt-0.5">{p.recommendLabel}</div>
          </div>
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
            <div className="text-lg font-extrabold text-amber-700 tabular-nums leading-tight">
              {stats.flagged}
            </div>
            <div className="text-2xs text-amber-900/60 mt-0.5">{p.flaggedLabel}</div>
          </div>
        </div>

        <div className="text-center mt-5">
          <Link
            to="/analytics"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {p.ctaBtn}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

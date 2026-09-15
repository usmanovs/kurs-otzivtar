import React, { useMemo } from 'react';
import { CourseCategory, Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import {
  ratingTone,
  FLAGGED_THRESHOLD,
  HEALTHY_THRESHOLD,
  bayesianRating,
} from '../lib/ratingTone';
import { BarChart3, ThumbsUp, ListChecks, ShieldAlert, Wallet, FileCheck, Upload } from 'lucide-react';
import { DonutChart } from './DonutChart';
import { countedComplaintKeys } from '../lib/complaintTags';

// Rating health is a status scale, so it keeps the reserved
// good/warning/critical palette rather than borrowing categorical hues.
const HEALTH_COLORS = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444' } as const;

// Reuses the review vocabulary from lib/complaintTags so the analytics bars
// and the cards on the directory can never name the same complaint differently.
const RISK_KEYS = [
  'fraud', 'no_result', 'no_job', 'credit_pressure', 'no_contact', 'no_refund',
] as const;

interface StatsSectionProps {
  teachers: Teacher[];
  currentLang: SupportedLang;
  /** Opens the review form, where proof is attached. */
  onOpenAddReview?: () => void;
}

const TONE_BAR_CLASS: Record<'success' | 'warning' | 'danger', string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

const TONE_TEXT_CLASS: Record<'success' | 'warning' | 'danger', string> = {
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
};

interface BarRowProps {
  label: string;
  count: number;
  percent: number;
  barClassName?: string;
}

const BarRow: React.FC<BarRowProps> = ({ label, count, percent, barClassName = 'bg-indigo-400' }) => (
  <div className="flex items-center gap-3">
    <span className="text-sm text-slate-600 w-32 sm:w-44 lg:w-56 shrink-0 leading-tight">{label}</span>
    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${percent}%` }} />
    </div>
    <span className="text-sm font-bold text-slate-900 w-16 text-right shrink-0 tabular-nums">
      {percent.toFixed(0)}%
    </span>
    <span className="text-xs text-slate-400 w-10 text-right shrink-0 tabular-nums hidden sm:inline">
      {count}
    </span>
  </div>
);

export const StatsSection: React.FC<StatsSectionProps> = ({
  teachers,
  currentLang,
  onOpenAddReview,
}) => {
  const t = TRANSLATIONS[currentLang];

  const stats = useMemo(() => {
    const total = teachers.length;

    // Category. 'unknown' is excluded from the named subjects and folded in
    // with the profiles that carry no category at all: a curated "we looked and
    // could not tell" and a blank field are the same fact to a reader, and as
    // two slices they read as two different subjects.
    const categoryKeys = Object.keys(t.categories).filter(
      (k) => k !== 'all' && k !== 'unknown'
    ) as CourseCategory[];
    const categoryCounts = categoryKeys
      .map((cat) => ({
        key: cat,
        label: t.categories[cat],
        count: teachers.filter((tch) => tch.category === cat).length,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
    const noCategoryCount = total - categoryCounts.reduce((sum, c) => sum + c.count, 0);

    // Rating health (only teachers with at least one review)
    const reviewedTeachers = teachers.filter((tch) => tch.reviewCount > 0);
    const score = (tch: Teacher) => bayesianRating(tch.averageRating, tch.reviewCount);
    const flagged = reviewedTeachers.filter((tch) => score(tch) <= FLAGGED_THRESHOLD).length;
    const healthy = reviewedTeachers.filter((tch) => score(tch) >= HEALTHY_THRESHOLD).length;
    const mixed = reviewedTeachers.length - flagged - healthy;
    const reviewedTotal = reviewedTeachers.length;

    // Overall recommend rate (weighted across every real review, not per-teacher average)
    const allReviews = teachers.flatMap((tch) => tch.reviews);
    const recommendCount = allReviews.filter((r) => r.wouldRecommend).length;
    const recommendRate = allReviews.length > 0 ? (recommendCount / allReviews.length) * 100 : 0;

    // Directory coverage
    const withPhoto = teachers.filter((tch) => tch.photoUrl).length;
    const withReviews = teachers.filter((tch) => tch.reviewCount > 0).length;
    const withSocial = teachers.filter((tch) => tch.instagramUrl || tch.youtubeUrl || tch.tiktokUrl).length;

    return {
      total,
      watchdog: (() => {
        // Only reviews that both rate badly AND name a figure. A price from a
        // happy reviewer is not money in dispute, and most reviews name no
        // figure at all — so this is "reported by dissatisfied students",
        // never a claim about total losses or money the site recovered.
        const lowRated = allReviews.filter((rev) => rev.overallRating <= 2);
        const priced = lowRated.filter((rev) => (rev.pricePaidKGS ?? 0) > 0);
        const amounts = priced.map((rev) => rev.pricePaidKGS as number).sort((x, y) => x - y);
        const sumKGS = amounts.reduce((acc, v) => acc + v, 0);
        const medianKGS = amounts.length > 0 ? amounts[Math.floor(amounts.length / 2)] : 0;

        const withCons = allReviews.filter((rev) => (rev.cons ?? []).length > 0);
        const tallied = new Map<string, number>();
        withCons.forEach((rev) => {
          countedComplaintKeys(rev.cons ?? []).forEach((key) =>
            tallied.set(key, (tallied.get(key) ?? 0) + 1)
          );
        });
        const risks = RISK_KEYS.map((key) => {
          const count = tallied.get(key) ?? 0;
          return {
            key,
            label: t.complaintTags[key],
            count,
            percent: withCons.length > 0 ? (count / withCons.length) * 100 : 0,
          };
        })
          .filter((rk) => rk.count > 0)
          .sort((x, y) => y.count - x.count);

        return {
          sumKGS,
          medianKGS,
          pricedCount: priced.length,
          consCount: withCons.length,
          risks,
          // Admin-checked proof, which is a different and much stronger claim
          // than the reviewer ticking "I really studied here".
          proofVerified: allReviews.filter((rev) => rev.proofVerified).length,
          selfDeclared: allReviews.filter((rev) => rev.isVerified).length,
        };
      })(),
      categories: [
        ...categoryCounts,
        // A null category and a curated 'unknown' both mean "we don't know",
        // so they share one slice. As two they read as two distinct subjects.
        ...(noCategoryCount > 0
          ? [{ key: 'none', label: t.categories.unknown, count: noCategoryCount }]
          : []),
      ].map((c) => ({ ...c, percent: total > 0 ? (c.count / total) * 100 : 0 })),
      ratingHealth: {
        reviewedTotal,
        healthy: { count: healthy, percent: reviewedTotal > 0 ? (healthy / reviewedTotal) * 100 : 0 },
        mixed: { count: mixed, percent: reviewedTotal > 0 ? (mixed / reviewedTotal) * 100 : 0 },
        flagged: { count: flagged, percent: reviewedTotal > 0 ? (flagged / reviewedTotal) * 100 : 0 },
      },
      recommendRate,
      totalReviews: allReviews.length,
      coverage: {
        withPhoto: { count: withPhoto, percent: total > 0 ? (withPhoto / total) * 100 : 0 },
        withReviews: { count: withReviews, percent: total > 0 ? (withReviews / total) * 100 : 0 },
        withSocial: { count: withSocial, percent: total > 0 ? (withSocial / total) * 100 : 0 },
      },
    };
  }, [teachers, t]);

  if (stats.total === 0) return null;

  const recommendTone = ratingTone((stats.recommendRate / 100) * 5);

  return (
    <section id="stats-section" className="mb-10 scroll-mt-20">
      <div className="flex flex-col items-center text-center gap-2 mb-5">
        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.analytics.title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t.analytics.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Consumer-protection panel. Replaced a gender split, which said
            nothing a reader could act on before paying for a course. */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.watchdogTitle}</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl border border-rose-200/70 bg-rose-50/60 p-3">
              <div className="flex items-center gap-1.5 text-2xs font-semibold text-rose-700">
                <Wallet className="w-3.5 h-3.5" />
                {t.analytics.disputedLabel}
              </div>
              <div className="mt-1 text-xl font-extrabold text-rose-700 tabular-nums leading-tight">
                {stats.watchdog.sumKGS.toLocaleString('ru-RU')}
                <span className="text-xs font-bold"> сом</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-rose-900/60">
                {t.analytics.disputedNote.replace('{n}', String(stats.watchdog.pricedCount))}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center gap-1.5 text-2xs font-semibold text-slate-600">
                <FileCheck className="w-3.5 h-3.5" />
                {t.analytics.provenLabel}
              </div>
              <div className="mt-1 text-xl font-extrabold text-slate-800 tabular-nums leading-tight">
                {stats.watchdog.proofVerified}
              </div>
              {/* Zero is the true figure today, and saying so is the point —
                  a self-ticked box is not proof, and merging the two would
                  advertise a verification this site has not performed. */}
              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                {stats.watchdog.proofVerified === 0
                  ? t.analytics.provenNone
                  : t.analytics.provenSelfNote.replace('{n}', String(stats.watchdog.selfDeclared))}
              </p>
              {/* A zero here is a gap the reader can close, not just a fact to
                  report — so the number comes with the way to change it. */}
              {onOpenAddReview && (
                <button
                  type="button"
                  id="stats-upload-proof-btn"
                  onClick={onOpenAddReview}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t.analytics.provenCta}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h4 className="text-xs font-bold text-slate-700">{t.analytics.risksTitle}</h4>
            <span className="text-2xs text-slate-400">
              {t.analytics.risksNote.replace('{n}', String(stats.watchdog.consCount))}
            </span>
          </div>
          <div className="space-y-2.5">
            {stats.watchdog.risks.map((risk) => (
              <BarRow
                key={risk.key}
                label={risk.label}
                count={risk.count}
                percent={risk.percent}
                barClassName="bg-rose-500"
              />
            ))}
          </div>
        </div>

        {/* Rating health */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <ListChecks className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.ratingHealthTitle}</h3>
          </div>
          <p className="text-2xs text-slate-400 mb-4">{t.analytics.ratingHealthSubtitle}</p>
          <DonutChart
            ariaLabel={t.analytics.ratingHealthTitle}
            centerValue={String(stats.ratingHealth.reviewedTotal)}
            centerLabel={t.analytics.donutReviewed}
            slices={[
              {
                label: t.analytics.healthyLabel,
                count: stats.ratingHealth.healthy.count,
                percent: stats.ratingHealth.healthy.percent,
                color: HEALTH_COLORS.success,
                chipClass: TONE_BAR_CLASS.success,
              },
              {
                label: t.analytics.mixedLabel,
                count: stats.ratingHealth.mixed.count,
                percent: stats.ratingHealth.mixed.percent,
                color: HEALTH_COLORS.warning,
                chipClass: TONE_BAR_CLASS.warning,
              },
              {
                label: t.analytics.flaggedLabel,
                count: stats.ratingHealth.flagged.count,
                percent: stats.ratingHealth.flagged.percent,
                color: HEALTH_COLORS.danger,
                chipClass: TONE_BAR_CLASS.danger,
              },
            ]}
          />
        </div>

        {/* Category breakdown — spans full width, many rows */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.categoryTitle}</h3>
          </div>
          <div className="space-y-2.5">
            {stats.categories.map((c) => (
              <BarRow key={c.key} label={c.label} count={c.count} percent={c.percent} />
            ))}
          </div>
        </div>

        {/* Recommend rate — hero number */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2.5 mb-3">
            <ThumbsUp className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.recommendRateTitle}</h3>
          </div>
          <div className={`text-5xl font-extrabold tracking-tight ${TONE_TEXT_CLASS[recommendTone]}`}>
            {stats.recommendRate.toFixed(0)}%
          </div>
          <p className="text-2xs text-slate-400 mt-2">
            {t.analytics.recommendRateSubtitle} ({stats.totalReviews})
          </p>
        </div>

        {/* Directory coverage */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <ListChecks className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.coverageTitle}</h3>
          </div>
          <div className="space-y-3">
            <BarRow
              label={t.analytics.withPhotoLabel}
              count={stats.coverage.withPhoto.count}
              percent={stats.coverage.withPhoto.percent}
            />
            <BarRow
              label={t.analytics.withReviewsLabel}
              count={stats.coverage.withReviews.count}
              percent={stats.coverage.withReviews.percent}
            />
            <BarRow
              label={t.analytics.withSocialLabel}
              count={stats.coverage.withSocial.count}
              percent={stats.coverage.withSocial.percent}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

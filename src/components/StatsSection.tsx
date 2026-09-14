import React, { useMemo } from 'react';
import { CourseCategory, Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import {
  ratingTone,
  FLAGGED_THRESHOLD,
  HEALTHY_THRESHOLD,
  bayesianRating,
} from '../lib/ratingTone';
import { Users, BarChart3, ThumbsUp, ListChecks } from 'lucide-react';

interface StatsSectionProps {
  teachers: Teacher[];
  currentLang: SupportedLang;
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

export const StatsSection: React.FC<StatsSectionProps> = ({ teachers, currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  const stats = useMemo(() => {
    const total = teachers.length;

    // Gender
    const maleCount = teachers.filter((tch) => tch.gender === 'male').length;
    const femaleCount = teachers.filter((tch) => tch.gender === 'female').length;
    const unspecifiedGenderCount = total - maleCount - femaleCount;

    // Category
    const categoryKeys = Object.keys(t.categories).filter((k) => k !== 'all') as CourseCategory[];
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
    const withSocial = teachers.filter((tch) => tch.instagramUrl || tch.youtubeUrl).length;

    return {
      total,
      gender: [
        { label: t.analytics.genderMale, count: maleCount },
        { label: t.analytics.genderFemale, count: femaleCount },
        ...(unspecifiedGenderCount > 0
          ? [{ label: t.analytics.genderUnspecified, count: unspecifiedGenderCount }]
          : []),
      ].map((g) => ({ ...g, percent: total > 0 ? (g.count / total) * 100 : 0 })),
      categories: [
        ...categoryCounts,
        ...(noCategoryCount > 0 ? [{ key: 'none', label: t.analytics.categoryUnspecified, count: noCategoryCount }] : []),
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
        {/* Gender breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.genderTitle}</h3>
          </div>
          <div className="space-y-3">
            {stats.gender.map((g) => (
              <BarRow key={g.label} label={g.label} count={g.count} percent={g.percent} />
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
          <div className="space-y-3">
            <BarRow
              label={t.analytics.healthyLabel}
              count={stats.ratingHealth.healthy.count}
              percent={stats.ratingHealth.healthy.percent}
              barClassName={TONE_BAR_CLASS.success}
            />
            <BarRow
              label={t.analytics.mixedLabel}
              count={stats.ratingHealth.mixed.count}
              percent={stats.ratingHealth.mixed.percent}
              barClassName={TONE_BAR_CLASS.warning}
            />
            <BarRow
              label={t.analytics.flaggedLabel}
              count={stats.ratingHealth.flagged.count}
              percent={stats.ratingHealth.flagged.percent}
              barClassName={TONE_BAR_CLASS.danger}
            />
          </div>
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

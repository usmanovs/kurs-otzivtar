import { Teacher } from '../types';

/**
 * Dated, quotable platform figures — the kind of original data answer engines
 * cite. Computed only from published reviews, and stamped with the date of the
 * newest review rather than "today", so the number and its date stay in step
 * and the prerendered HTML matches what the browser computes.
 */
export interface KeyFacts {
  /** YYYY-MM-DD in Kyrgyzstan time (UTC+6, no DST). */
  date: string;
  teachers: number;
  reviews: number;
  criticalPercent: number;
  recommendPercent: number;
}

function bishkekDate(iso: string): string {
  return new Date(Date.parse(iso) + 6 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Date of the newest review across the given teachers, or null if there are none. */
export function latestReviewDate(teachers: Teacher[]): string | null {
  let latest = '';
  for (const t of teachers) {
    for (const r of t.reviews) {
      const at = r.createdAt ?? '';
      if (at > latest) latest = at;
    }
  }
  return latest ? bishkekDate(latest) : null;
}

export function computeKeyFacts(teachers: Teacher[]): KeyFacts | null {
  const rated = teachers.filter((t) => t.reviews.length > 0);
  const reviews = rated.flatMap((t) => t.reviews);
  const date = latestReviewDate(rated);
  if (reviews.length === 0 || !date) return null;
  const pct = (n: number) => Math.round((n / reviews.length) * 100);
  return {
    date,
    teachers: rated.length,
    reviews: reviews.length,
    criticalPercent: pct(reviews.filter((r) => r.overallRating <= 2).length),
    recommendPercent: pct(reviews.filter((r) => r.wouldRecommend).length),
  };
}

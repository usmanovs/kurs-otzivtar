import { Teacher } from '../types';

/**
 * Profiles where a burst of 5-star reviews arrived in a short window and could
 * not be confirmed either way (the IP log showed distinct addresses, so it is
 * not provably one source). Nothing is hidden or altered — the profile shows a
 * notice with the real numbers so readers can weigh the average themselves.
 *
 * The counts in the notice are computed from the teacher's own reviews, so they
 * stay truthful as reviews are added, hidden or later verified with proof.
 * Add/remove entries as moderation finds or clears them.
 */
export interface UnusualActivityWindow {
  /** ISO instants bounding the burst (inclusive). */
  from: string;
  to: string;
}

export const UNUSUAL_ACTIVITY_WINDOWS: Record<string, UnusualActivityWindow> = {
  // 64 five-star reviews in ~25h (Oct 5-6 2026) after 7 mostly 1-2 star ones.
  'teacher-samara-keneshova': { from: '2026-10-05T13:00:00Z', to: '2026-10-06T14:00:00Z' },
};

/** Below this many, a cluster isn't unusual enough to flag. */
const MIN_REVIEWS = 5;

export interface UnusualActivity {
  /** Unproven 5-star reviews posted inside the window. */
  count: number;
  /** Their share of all the profile's reviews, 0-100. */
  percent: number;
  /** YYYY-MM-DD in Kyrgyzstan time (UTC+6, no DST) — same on server and client. */
  from: string;
  to: string;
}

function bishkekDate(iso: string): string {
  const k = new Date(Date.parse(iso) + 6 * 3600 * 1000);
  return k.toISOString().slice(0, 10);
}

export function getUnusualActivity(teacher: Teacher): UnusualActivity | null {
  const window = UNUSUAL_ACTIVITY_WINDOWS[teacher.id];
  if (!window || teacher.reviews.length === 0) return null;

  const from = Date.parse(window.from);
  const to = Date.parse(window.to);
  const count = teacher.reviews.filter((r) => {
    if (r.overallRating !== 5 || r.proofVerified || !r.createdAt) return false;
    const at = Date.parse(r.createdAt);
    return at >= from && at <= to;
  }).length;
  if (count < MIN_REVIEWS) return null;

  return {
    count,
    percent: Math.round((count / teacher.reviews.length) * 100),
    from: bishkekDate(window.from),
    to: bishkekDate(window.to),
  };
}

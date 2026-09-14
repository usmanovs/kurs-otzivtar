export type RatingTone = 'danger' | 'warning' | 'success';

export function ratingTone(rating: number): RatingTone {
  if (rating <= 2) return 'danger';
  if (rating < 4) return 'warning';
  return 'success';
}

export const RATING_BADGE_CLASS: Record<RatingTone, string> = {
  danger: 'bg-red-600',
  warning: 'bg-amber-500',
  success: 'bg-emerald-600',
};

export const RATING_STAR_CLASS: Record<RatingTone, string> = {
  danger: 'fill-red-500 text-red-500',
  warning: 'fill-amber-400 text-amber-400',
  success: 'fill-emerald-500 text-emerald-500',
};

export const RATING_TEXT_CLASS: Record<RatingTone, string> = {
  danger: 'text-red-600',
  warning: 'text-amber-600',
  success: 'text-emerald-600',
};

// A teacher is "flagged" (needs caution) at or below this average. Shared by
// the leaderboard's flagged panel, the analytics breakdown and the stats bar
// so those three can never report different numbers for the same idea.
export const FLAGGED_THRESHOLD = 2.5;
export const TOP_THRESHOLD = 4.5;
export const HEALTHY_THRESHOLD = 4;

// Bayesian smoothing for low-volume ratings.
//
// The prior is the neutral midpoint of the 1-5 scale, NOT the observed site
// mean. This site's reviews are self-selected toward complaints (the observed
// mean sits around 1.9), so shrinking toward that mean would push thinly
// reviewed teachers further toward "flagged" — the opposite of the intent. A
// neutral prior encodes "not enough evidence yet" instead.
export const BAYESIAN_PRIOR = 3;

// How many "virtual" reviews at the prior each teacher is seeded with. Higher
// = more real reviews needed before their own average dominates.
export const BAYESIAN_CONFIDENCE = 5;

// A teacher is never named on the public watchlist below this many reviews.
// One angry review should not be enough to publicly brand someone.
export const MIN_REVIEWS_FOR_WATCHLIST = 3;

export function bayesianRating(averageRating: number, reviewCount: number): number {
  if (reviewCount === 0) return BAYESIAN_PRIOR;
  return (
    (BAYESIAN_CONFIDENCE * BAYESIAN_PRIOR + averageRating * reviewCount) /
    (BAYESIAN_CONFIDENCE + reviewCount)
  );
}

export function isFlaggedRating(averageRating: number, reviewCount: number): boolean {
  return reviewCount > 0 && bayesianRating(averageRating, reviewCount) <= FLAGGED_THRESHOLD;
}

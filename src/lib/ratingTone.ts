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

export function isFlaggedRating(averageRating: number, reviewCount: number): boolean {
  return reviewCount > 0 && averageRating <= FLAGGED_THRESHOLD;
}

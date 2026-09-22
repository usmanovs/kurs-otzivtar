/**
 * Every review submitted before this file existed got one of two
 * auto-generated headlines (picked by wouldRecommend, not written by the
 * author) baked directly into its `title` column. New submissions no longer
 * write these, but old rows still carry them, so display code needs to
 * recognize and hide both the legacy strings and a plain empty title.
 */
const LEGACY_GENERIC_TITLES = new Set(['Жакшы тажрыйба болду', 'Көңүл калтырган тажрыйба']);

/** True only for a title an author actually wrote themselves. */
export function hasRealTitle(title: string | undefined | null): title is string {
  if (!title) return false;
  const trimmed = title.trim();
  return trimmed.length > 0 && !LEGACY_GENERIC_TITLES.has(trimmed);
}

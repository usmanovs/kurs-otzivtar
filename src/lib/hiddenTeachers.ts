// Teacher profiles taken off the public site. The teachers table has no hide
// flag, so this list is the source of truth: a hidden profile is dropped from
// the directory, its direct link shows the "not found" page, its reviews leave
// the sitewide feed, and it is left out of the sitemap and prerendered pages.
// Nothing is deleted — remove an id here to bring a profile back.
export const HIDDEN_TEACHER_IDS: ReadonlySet<string> = new Set([
  'teacher-yt3fix-1789330567973-3', // Динара Абдрасулова
  'teacher-yt3-1789330529575-6', // Кылым Молдокараева
  'teacher-yt3-1789330529354-3', // Бааринса Абдрахманова
  'teacher-yt2-1789329130439-6', // Лиза Айбекова
]);

/** PostgREST `not.in` list, or undefined when nothing is hidden. */
export function hiddenTeacherIdsFilter(): string | undefined {
  if (HIDDEN_TEACHER_IDS.size === 0) return undefined;
  return `(${Array.from(HIDDEN_TEACHER_IDS)
    .map((id) => `"${id}"`)
    .join(',')})`;
}

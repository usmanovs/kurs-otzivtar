import { Teacher } from '../types';
import { TranslationDict } from '../translations';

/**
 * One matcher for every search box on the site.
 *
 * There are three of them — the hero bar, the directory bar, and the list
 * filter behind both — and when they each carried their own rules the results
 * disagreed: the dropdown would offer an instructor the list underneath had
 * already filtered out. Everything here is shared so that can't happen.
 */

/**
 * Folds the letters that separate a Kyrgyz keyboard from a Russian one.
 *
 * Most people here type on a Russian layout, which has no ө, ү or ң, so they
 * substitute о, у and н — "Гулнур" for "Гүлнұр", "Кокул" for "Көкүл". Matching
 * on the raw codepoints means those searches find nothing, and the reader has
 * no way to tell that the name is spelled with a letter their keyboard lacks.
 *
 * Folding runs both ways: whichever letter is typed matches whichever is
 * stored. Every mapping is one character to one character, which keeps string
 * offsets aligned so the highlighter can index back into the original text.
 */
const FOLD: Record<string, string> = {
  ө: 'о',
  ү: 'у',
  ң: 'н',
  ё: 'е',
  ұ: 'у',
  ә: 'а',
  і: 'и',
};

export function foldSearchText(raw: string): string {
  let out = raw.normalize('NFC').toLowerCase();
  for (const [from, to] of Object.entries(FOLD)) {
    out = out.split(from).join(to);
  }
  return out;
}

/** Every string a teacher can be found by, already folded. */
function haystack(teacher: Teacher, t: TranslationDict) {
  const subniches = (teacher.subniches ?? []).map(
    (sn) => t.subniches[sn as keyof typeof t.subniches] ?? sn
  );
  return {
    name: foldSearchText(teacher.name),
    academy: foldSearchText(teacher.academyName ?? ''),
    category: teacher.category ? foldSearchText(t.categories[teacher.category]) : '',
    subniches: subniches.map(foldSearchText),
    bio: foldSearchText(teacher.bio ?? ''),
  };
}

/**
 * Lower is better; -1 means no match at all. Ordering matters more than the
 * numbers: a name match must always outrank someone whose bio merely mentions
 * the same word.
 */
function scoreTeacher(teacher: Teacher, foldedQuery: string, t: TranslationDict): number {
  const h = haystack(teacher, t);
  if (h.name.startsWith(foldedQuery)) return 0;
  // A surname is as good as a first name, but only on a word boundary —
  // otherwise "ан" would match the middle of half the directory at rank 1.
  if (h.name.split(/\s+/).some((word) => word.startsWith(foldedQuery))) return 1;
  if (h.name.includes(foldedQuery)) return 2;
  if (h.academy.includes(foldedQuery)) return 3;
  if (h.category.includes(foldedQuery)) return 4;
  if (h.subniches.some((sn) => sn.includes(foldedQuery))) return 5;
  if (h.bio.includes(foldedQuery)) return 6;
  return -1;
}

/** Does this teacher belong in the filtered list for `query`? */
export function teacherMatches(teacher: Teacher, query: string, t: TranslationDict): boolean {
  const q = foldSearchText(query.trim());
  if (!q) return true;
  return scoreTeacher(teacher, q, t) >= 0;
}

/** Best matches first, for autocomplete dropdowns. */
export function rankTeachers(
  teachers: Teacher[],
  query: string,
  t: TranslationDict,
  limit: number
): Teacher[] {
  const q = foldSearchText(query.trim());
  if (!q) return [];
  return teachers
    .map((tch) => ({ tch, score: scoreTeacher(tch, q, t) }))
    .filter((x) => x.score >= 0)
    .sort(
      (a, b) =>
        a.score - b.score ||
        // Among equally good matches, the profile with more reviews is the one
        // the reader is more likely to have meant.
        b.tch.reviewCount - a.tch.reviewCount ||
        a.tch.name.localeCompare(b.tch.name, 'ru')
    )
    .slice(0, limit)
    .map((x) => x.tch);
}

/**
 * Catches the one kind of duplicate that keeps slipping through: the same
 * person entered with their name words in a different order ("Махабат
 * Исмаилова" vs "Исмаилова Махабат"), or with only part of the name typed.
 * Exact-string matching (teacherNameKey) never catches this — it's a whole
 * different string — which is exactly how that duplicate got created and had
 * to be merged by hand.
 *
 * Deliberately narrow: an equal set of name-words in any order, or one name's
 * words fully contained in the other's (only once both sides have at least
 * two words, so a single common first name like "Айбек" doesn't false-match
 * every unrelated Айбек in the directory). Nothing fuzzier than that — a
 * confident wrong suggestion during review submission is worse than missing
 * a subtler duplicate.
 */
export function findLikelyDuplicateTeacher(rawName: string, teachers: Teacher[]): Teacher | undefined {
  const wordsOf = (name: string) => new Set(foldSearchText(name).trim().split(/\s+/).filter(Boolean));
  const inputWords = wordsOf(rawName);
  if (inputWords.size === 0) return undefined;

  const isSubset = (a: Set<string>, b: Set<string>) => a.size > 0 && [...a].every((w) => b.has(w));

  return teachers.find((teacher) => {
    const teacherWords = wordsOf(teacher.name);
    if (teacherWords.size === 0) return false;
    const sameWords = teacherWords.size === inputWords.size && isSubset(inputWords, teacherWords);
    const partialMatch =
      inputWords.size >= 2 &&
      teacherWords.size >= 2 &&
      (isSubset(inputWords, teacherWords) || isSubset(teacherWords, inputWords));
    return sameWords || partialMatch;
  });
}

export interface HighlightPart {
  text: string;
  match: boolean;
}

/**
 * Splits `text` around the query so the matched letters can be emphasised,
 * returning the ORIGINAL characters — a name written with ө still displays
 * with ө even when the reader found it by typing о.
 */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const q = foldSearchText(query.trim());
  if (!q) return [{ text, match: false }];

  const folded = foldSearchText(text);
  // Folding is defined as one-to-one, but a locale-specific lowercase rule
  // could still shift the length; without aligned offsets the slices would cut
  // the name in the wrong places, so fall back to no highlight.
  if (folded.length !== text.length) return [{ text, match: false }];

  const parts: HighlightPart[] = [];
  let cursor = 0;
  let at = folded.indexOf(q);
  while (at !== -1) {
    if (at > cursor) parts.push({ text: text.slice(cursor, at), match: false });
    parts.push({ text: text.slice(at, at + q.length), match: true });
    cursor = at + q.length;
    at = folded.indexOf(q, cursor);
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}

import { Teacher } from '../types';

/**
 * Turns the `cons` reviewers actually ticked into the handful of pills shown
 * on a watchlist card.
 *
 * Nothing here is generated or inferred: every group below is built from
 * phrases that exist in the live reviews table, and a teacher only ever shows
 * a tag their own reviewers wrote. A card with no qualifying cons shows no
 * pills rather than a plausible-looking guess — these pills sit next to a
 * named person, so an invented one is an invented accusation.
 *
 * Free text that doesn't belong to a group is ignored on purpose. The long
 * tail is mostly one-off sentiment ("Жаман тажрыйба"), typos, and the
 * occasional full paragraph, none of which reads as a pill.
 */

/**
 * The same idea for `pros`, and far thinner evidence.
 *
 * Every phrase below appears exactly once in the live data, across three
 * teachers — so a positive chip speaks for one reviewer, where a complaint
 * chip usually speaks for several. That is why these are only offered to
 * clearly well-rated teachers and never carry a count: there is nothing to
 * count.
 */
const POSITIVE_GROUPS: TagGroup[] = [
  { key: 'easy_explain', match: ['түшүндүрүшү жеңил', 'түшүндүрүү жеңил'] },
  { key: 'much_practice', match: ['практика көп'] },
  { key: 'job_help', match: ['жумушка жардам'] },
  { key: 'worth_price', match: ['баасы актал'] },
  { key: 'responsive', match: ['кайтарым байланыш'] },
];

export type ComplaintKey =
  | 'fraud' | 'no_result' | 'no_job' | 'credit_pressure' | 'psych_pressure'
  | 'no_refund' | 'overpriced' | 'weak_content' | 'no_contact' | 'unfair' | 'dubious';

export type PositiveKey =
  | 'easy_explain' | 'much_practice' | 'job_help' | 'worth_price' | 'responsive';

interface TagGroup {
  key: string;
  /** Kyrgyz phrases as reviewers actually typed them — the data is Kyrgyz
   *  regardless of which language the reader has selected. */
  match: string[];
}

export interface ComplaintTag {
  /** Stable key; the visible label comes from t.complaintTags / t.positiveTags. */
  key: string;
  /** How many of this teacher's reviews raised it. */
  count: number;
}

/**
 * canonical label -> the phrases reviewers have actually used for it.
 * Matching is case-insensitive on a normalised prefix, so "Ишенимсиз" also
 * catches "Ишенимсиз кеп" without needing every inflection listed.
 */
const GROUPS: TagGroup[] = [
  { key: 'fraud', match: ['алдамчылык', 'келишим менен алдоо', 'жалган маалымат', 'жалган күбөлүк', 'мыйзамсыз иш', 'экиюздүүлүк'] },
  { key: 'no_result', match: ['натыйжа жок', 'билим берилген жок', 'окутпайт', 'убадасын аткарган жок'] },
  { key: 'no_job', match: ['жумуш берилбейт', 'жумуш убадасы', 'ишке орношуу убадасы'] },
  { key: 'credit_pressure', match: ['кредитке мажбурлайт', 'мажбурлап каттоо'] },
  { key: 'psych_pressure', match: ['психологиялык манипуляция', 'психологиялык басым', 'ашыкча басым', 'зыяндуу таасир'] },
  { key: 'no_refund', match: ['акча кайтарылган жок'] },
  { key: 'overpriced', match: ['курс кымбат', 'баасы кымбат', 'наркы актабайт', 'баа маселеси'] },
  { key: 'weak_content', match: ['мазмуну үстүртөн', 'материал эскирген', 'практика аз', 'түшүндүрбөйт', 'записьтерди гана'] },
  { key: 'no_contact', match: ['байланышсыз калды', 'жооп бербейт', 'жоопкерчиликтен качат', 'жоопкерчиликсиз'] },
  { key: 'unfair', match: ['адилетсиз мамиле', 'орой мамиле'] },
  { key: 'dubious', match: ['күмөндүү', 'ишенимсиз', 'кылдат текшерилиши керек'] },
];

function normalise(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Which canonical complaints a single review's `cons` list raises. */
export function countedComplaintKeys(cons: string[]): Set<string> {
  const seen = new Set<string>();
  cons.forEach((raw) => {
    const value = normalise(String(raw));
    if (!value) return;
    const group = GROUPS.find((g) => g.match.some((m) => value.includes(m)));
    if (group) seen.add(group.key);
  });
  return seen;
}

/** Shared counter for both directions; `field` picks pros or cons. */
function tally(teacher: Teacher, field: 'pros' | 'cons', groups: TagGroup[]): ComplaintTag[] {
  const counts = new Map<string, number>();

  teacher.reviews.forEach((review) => {
    // One review counts once per tag, even if it lists two phrasings of the
    // same thing, so a single reviewer cannot inflate a tag.
    const seen = new Set<string>();
    (review[field] ?? []).forEach((raw) => {
      const value = normalise(String(raw));
      if (!value) return;
      const group = groups.find((g) => g.match.some((m) => value.includes(m)));
      if (group) seen.add(group.key);
    });
    seen.forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));
  });

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        groups.findIndex((g) => g.key === a.key) - groups.findIndex((g) => g.key === b.key)
    );
}

/**
 * Praise this teacher's own reviewers actually wrote. Empty for almost
 * everyone — see POSITIVE_GROUPS.
 */
export function topPositiveTags(teacher: Teacher, limit = 1): ComplaintTag[] {
  return tally(teacher, 'pros', POSITIVE_GROUPS).slice(0, limit);
}

/**
 * The most-raised complaints for one teacher, commonest first.
 * `limit` caps how many pills the card has room for.
 */
export function topComplaintTags(teacher: Teacher, limit = 3): ComplaintTag[] {
  return tally(teacher, 'cons', GROUPS).slice(0, limit);
}

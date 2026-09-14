/**
 * Builds the pill row under an instructor's name.
 *
 * The inputs overlap: academy_name is free text people have used as a tag
 * dump ("маркетинг,смм") right next to a category that already says the same
 * thing in canonical form ("Маркетинг жана SMM"). Rendering both wastes two
 * lines of a phone header to repeat one fact.
 *
 * So: the canonical category wins, anything it already covers is dropped, and
 * whatever is genuinely extra ("Продюсер", "Highlight Академиясы") survives.
 */

/** Cyrillic/Latin spellings of the same thing, plus role/field variants. */
const ALIASES: Record<string, string> = {
  смм: 'smm',
  see: 'smm',
  ютуб: 'youtube',
  ютюб: 'youtube',
  айти: 'it',
  ит: 'it',
  маркетолог: 'маркетинг',
  таргетолог: 'таргет',
  таргетинг: 'таргет',
};

/** Connectors that carry no meaning of their own in a category label. */
const STOP = new Set(['жана', 'и', 'and', '/', '-', '–', '—', '&']);

function normalise(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?]+$/g, '')
    .trim();
  return ALIASES[cleaned] ?? cleaned;
}

/** Splits a label into comparable words: "Маркетинг жана SMM" -> [маркетинг, smm] */
function wordsOf(label: string): string[] {
  return label
    .split(/[,/|]|\s+/)
    .map(normalise)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function titleCase(s: string): string {
  const t = s.trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

export interface HeaderTagsInput {
  /** Canonical label for the teacher's category, already translated. */
  categoryLabel?: string;
  /** Translated sub-niche labels. */
  subnicheLabels?: string[];
  /** Free text. May be a real academy name or a comma-separated tag dump. */
  academyName?: string;
  /** How many pills to show before collapsing the rest into "+N". */
  max?: number;
}

export interface HeaderTagsResult {
  tags: string[];
  /** How many were dropped for space — render as "+N" when above zero. */
  overflow: number;
}

export function buildHeaderTags({
  categoryLabel,
  subnicheLabels = [],
  academyName,
  max = 3,
}: HeaderTagsInput): HeaderTagsResult {
  const tags: string[] = [];
  const seen = new Set<string>();

  const claim = (label: string) => {
    const words = wordsOf(label);
    if (words.length === 0) return false;
    // Redundant only when everything it says is already on screen.
    if (words.every((w) => seen.has(w))) return false;
    words.forEach((w) => seen.add(w));
    tags.push(label.trim());
    return true;
  };

  if (categoryLabel) claim(categoryLabel);
  subnicheLabels.forEach((label) => claim(label));

  if (academyName) {
    // A comma means it was used as a tag list, so split it. Without one it is
    // a name ("Highlight Академиясы") and has to stay intact.
    const parts = academyName.includes(',')
      ? academyName.split(',').map((p) => p.trim()).filter(Boolean)
      : [academyName];
    parts.forEach((part) => claim(titleCase(part)));
  }

  // Collapsing a single leftover into "+1" costs the same row space as the tag
  // itself and says less, so only collapse when it actually saves a pill.
  const hidden = tags.length - max;
  if (hidden === 1) return { tags: tags.slice(0, max + 1), overflow: 0 };

  return {
    tags: tags.slice(0, max),
    overflow: Math.max(0, hidden),
  };
}

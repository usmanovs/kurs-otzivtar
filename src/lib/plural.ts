import { SupportedLang } from '../translations';

/**
 * Russian needs three forms after a numeral and Kyrgyz needs none, so a count
 * and its noun cannot be one baked string in the dictionary.
 *
 *   1, 21, 31 …          преподаватель   (but not 11)
 *   2-4, 22-24 …         преподавателя   (but not 12-14)
 *   0, 5-20, 25-30 …     преподавателей
 *
 * Kyrgyz takes the bare singular after any numeral — "66 мугалим", never
 * "мугалимдер" — so its three entries are simply the same word.
 */
export type PluralForms = readonly string[];

export function pluralForm(n: number, forms: PluralForms, lang: SupportedLang): string {
  if (lang !== 'ru') return forms[0];

  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  // The teens are the exception that catches naive implementations: 11-14 all
  // take the "many" form even though they end in 1-4.
  if (abs > 10 && abs < 20) return forms[2] ?? forms[0];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1] ?? forms[0];
  return forms[2] ?? forms[0];
}

/** "66 преподавателей" / "66 мугалим" */
export function plural(n: number, forms: PluralForms, lang: SupportedLang): string {
  return `${n} ${pluralForm(n, forms, lang)}`;
}

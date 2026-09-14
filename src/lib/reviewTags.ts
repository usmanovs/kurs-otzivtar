import { SupportedLang } from '../translations';

/**
 * One-tap pros/cons for the enrichment step.
 *
 * Typing a free-text pro/con is most of the work of writing the review again,
 * so almost nobody did it. These cover what reviews here actually complain
 * about and praise, drawn from the existing corpus.
 *
 * The chosen label is stored verbatim in reviews.pros / reviews.cons, matching
 * the free-text rows already in the table — no schema change, and the detail
 * modal renders them unchanged.
 */
interface ReviewTag {
  id: string;
  ky: string;
  ru: string;
}

export const PRO_TAGS: ReviewTag[] = [
  { id: 'practice', ky: 'Практика көп', ru: 'Много практики' },
  { id: 'mentoring', ky: 'Жакшы ментордук', ru: 'Хорошее менторство' },
  { id: 'clear', ky: 'Түшүндүрүшү жеңил', ru: 'Понятно объясняет' },
  { id: 'responsive', ky: 'Суроолорго жооп берет', ru: 'Отвечает на вопросы' },
  { id: 'job_help', ky: 'Жумушка жардам берди', ru: 'Помогли с работой' },
  { id: 'worth_it', ky: 'Баасы акталат', ru: 'Цена оправдана' },
];

export const CON_TAGS: ReviewTag[] = [
  { id: 'expensive', ky: 'Баасы кымбат', ru: 'Дорого' },
  { id: 'no_feedback', ky: 'Кайтарым байланыш жок', ru: 'Нет обратной связи' },
  { id: 'little_practice', ky: 'Практика аз', ru: 'Мало практики' },
  { id: 'job_promise', ky: 'Жумуш убадасы аткарылган жок', ru: 'Обещание работы не выполнено' },
  { id: 'outdated', ky: 'Материал эскирген', ru: 'Устаревший материал' },
  { id: 'rude', ky: 'Мамилеси орой', ru: 'Грубое отношение' },
];

export const tagLabel = (tag: ReviewTag, lang: SupportedLang): string =>
  lang === 'ru' ? tag.ru : tag.ky;

/** Common course prices in KGS. Exact figures, not bucket midpoints — a chip
 *  must not invent precision the reviewer didn't give. */
export const PRICE_PRESETS_KGS = [10000, 20000, 30000, 45000, 60000, 100000];

export const DURATION_PRESETS_MONTHS = [1, 2, 3, 6, 12];

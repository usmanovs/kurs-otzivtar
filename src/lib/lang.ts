import { SupportedLang } from '../translations';

export const LANG_STORAGE_KEY = 'kursotzivtar_lang';

/**
 * The visitor's saved language, defaulting to Kyrgyz. Also runs during the
 * build-time prerender, where there is no localStorage — the try/catch turns
 * that ReferenceError into the default instead of a crash.
 */
export function readStoredLang(): SupportedLang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'ru' || saved === 'ky' ? saved : 'ky';
  } catch {
    return 'ky';
  }
}

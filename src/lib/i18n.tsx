import React, { createContext, forwardRef, useCallback, useContext, useEffect } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useNavigate as useRouterNavigate,
  type LinkProps,
  type NavigateOptions,
  type To,
} from 'react-router-dom';
import { SupportedLang } from '../translations';
import { LANG_STORAGE_KEY, readStoredLang } from './lang';

/**
 * Language lives in the URL: Kyrgyz (the default) at /…, Russian at /ru/…. One
 * address per language is what lets search engines index each version and tie
 * them together with hreflang — a localStorage toggle on a single URL meant the
 * Russian text was never crawlable.
 *
 * Everything below keeps the existing call sites unchanged: the Link and
 * useNavigate exported here take the same plain '/teacher/x' paths and add the
 * /ru prefix when the visitor is reading Russian.
 */

const RU_PREFIX = '/ru';

export function langFromPath(pathname: string): SupportedLang {
  return pathname === RU_PREFIX || pathname.startsWith(`${RU_PREFIX}/`) ? 'ru' : 'ky';
}

/** '/ru/teacher/x' -> '/teacher/x'; '/ru' -> '/'. Paths without the prefix pass through. */
export function stripLang(pathname: string): string {
  if (pathname === RU_PREFIX) return '/';
  return pathname.startsWith(`${RU_PREFIX}/`) ? pathname.slice(RU_PREFIX.length) : pathname;
}

/**
 * Prefixes an app path for `lang`. Accepts '/x', '/x?a=1', '/#frag' and leaves
 * anything that isn't an absolute app path (external URLs, relative paths)
 * alone. Idempotent for an already-prefixed path.
 */
export function localePath(path: string, lang: SupportedLang): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const [, pathname, rest = ''] = /^([^?#]*)(.*)$/.exec(path) ?? [];
  const bare = stripLang(pathname || '/');
  if (lang !== 'ru') return `${bare}${rest}`;
  return `${bare === '/' ? RU_PREFIX : `${RU_PREFIX}${bare}`}${rest}`;
}

const LangContext = createContext<SupportedLang>('ky');

/** The language of the page being shown — taken from the URL, so the server render and the client agree. */
export const useLang = () => useContext(LangContext);

/**
 * Provides the URL's language, keeps <html lang> in step, and — once, on first
 * load — sends a visitor whose saved choice is Russian from the Kyrgyz URL to
 * its Russian twin, so the people who already picked Russian don't land back in
 * Kyrgyz. Crawlers have no saved choice, so they always see the URL as written.
 */
export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const routerNavigate = useRouterNavigate();
  const lang = langFromPath(location.pathname);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (langFromPath(location.pathname) === 'ky' && readStoredLang() === 'ru') {
      routerNavigate(
        { pathname: localePath(location.pathname, 'ru'), search: location.search, hash: location.hash },
        { replace: true, state: location.state }
      );
    }
    // First load only: later navigation is always explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
};

/** Drop-in for react-router's Link that keeps the visitor in their language. */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function LocaleLink({ to, ...rest }, ref) {
  const lang = useLang();
  const target: To = typeof to === 'string' ? localePath(to, lang) : { ...to, pathname: to.pathname ? localePath(to.pathname, lang) : to.pathname };
  return <RouterLink ref={ref} to={target} {...rest} />;
});

/** Drop-in for useNavigate that keeps the visitor in their language. */
export function useNavigate() {
  const navigate = useRouterNavigate();
  const lang = useLang();
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') return navigate(to);
      return navigate(
        typeof to === 'string' ? localePath(to, lang) : { ...to, pathname: to.pathname ? localePath(to.pathname, lang) : to.pathname },
        options
      );
    },
    [navigate, lang]
  );
}

/**
 * Switches the page to the other language: same page, other prefix. Saves the
 * choice so the first-load redirect above remembers it, and keeps router state
 * (so an open teacher modal stays open).
 */
export function useSwitchLang() {
  const navigate = useRouterNavigate();
  const location = useLocation();
  return useCallback(
    (lang: SupportedLang) => {
      try {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
      } catch {
        // Private mode: the switch still works for this visit.
      }
      navigate(
        { pathname: localePath(location.pathname, lang), search: location.search, hash: location.hash },
        { state: location.state }
      );
    },
    [navigate, location]
  );
}

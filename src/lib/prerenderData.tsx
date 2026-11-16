import { createContext, useContext } from 'react';
import { stripLang } from './i18n';
import type { Course, FeaturedVideo, Teacher } from '../types';
import type { FeedReviewSummary, ReviewsFeedCounts, SiteStats } from './api';

/**
 * Data the page was prerendered with. The server render and the first client
 * (hydration) render both read it, so they produce identical markup; each page
 * then refreshes from Supabase in the background.
 */
export interface PrerenderData {
  /** The route this payload was rendered for. */
  route: string;
  teachers: Teacher[];
  /** Homepage only. */
  courses?: Course[];
  featuredVideos?: FeaturedVideo[];
  /** Last-known activity numbers as of the build (onlineNow is always 0 — see prerender.tsx). */
  siteStats?: SiteStats | null;
  /** /reviews only: the first page of the feed and its filter counts. */
  feed?: { reviews: FeedReviewSummary[]; hasMore: boolean; counts: ReviewsFeedCounts | null };
  /** Teacher pages only: other instructors in the same category, for internal links (names only — no ratings that could go stale between deploys). */
  related?: { id: string; name: string }[];
  /** ISO time of the build; the "now" the prerendered relative dates were computed against. */
  builtAt?: string;
}

export const PrerenderContext = createContext<PrerenderData | null>(null);
/**
 * The payload, or null. Pass the page's own route for pages that seed their
 * whole state from it: the payload is read once at load, so after client-side
 * navigation it belongs to whichever page was landed on, not the current one.
 */
export function usePrerenderData(route?: string): PrerenderData | null {
  const data = useContext(PrerenderContext);
  // The payload's route carries the /ru prefix for Russian pages; the pages ask for the bare route.
  return route === undefined || (data && stripLang(data.route) === route) ? data : null;
}

/** Reads the payload the prerender step embedded in the HTML, if any. */
export function readPrerenderPayload(): PrerenderData | null {
  try {
    const el = document.getElementById('__PRERENDER__');
    return el?.textContent ? (JSON.parse(el.textContent) as PrerenderData) : null;
  } catch {
    return null;
  }
}

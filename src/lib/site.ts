/** Canonical origin — the same host the sitemap, canonical tags and redirects use. */
export const SITE_URL = 'https://www.kursotzyv.org';

/**
 * <lastmod> for /about in sitemap.xml. The page is static copy with no data
 * behind it, so there is nothing to derive a date from — bump this when the
 * About page's text actually changes.
 */
export const ABOUT_LASTMOD = '2026-09-20';

/** The Android app on Google Play — listing name and URL, shown in the footer and in structured data. */
export const APP_NAME = 'Кыргыз Курстар';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.kursotzyv.app';

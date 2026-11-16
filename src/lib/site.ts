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

/**
 * Link-preview image. The ?v= suffix is a cache-buster: WhatsApp, Telegram and
 * Facebook cache previews by image URL, so replacing the file in place would
 * keep showing the old one. Bump it whenever public/og-image.png changes.
 */
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png?v=2`;

/** <lastmod> for /faq in sitemap.xml — static copy, so bump it when the answers change. */
export const FAQ_LASTMOD = '2026-11-16';

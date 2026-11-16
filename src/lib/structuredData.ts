import { CourseCategory, Teacher } from '../types';
import { APP_NAME, PLAY_STORE_URL, SITE_URL } from './site';
import { localePath } from './i18n';
import type { SupportedLang } from '../translations';

// Pure schema.org builders shared by the page components (which render them
// inline, so they exist in the prerendered HTML) and the prerender script.

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[], lang: SupportedLang = 'ky') {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${localePath(c.path, lang)}`,
    })),
  };
}

/**
 * Identity only. The page shows reviews *of a teacher*, and Google's review
 * snippets don't support Person as the reviewed item — marking the reviews up
 * as a Course's would describe something the page doesn't present. The
 * reviews stay in the visible HTML, which is what gets indexed.
 */
export function teacherJsonLd(teacher: Teacher, lang: SupportedLang = 'ky') {
  const sameAs = [teacher.instagramUrl, teacher.youtubeUrl, teacher.tiktokUrl, teacher.websiteUrl].filter(
    (u): u is string => !!u
  );
  // A data: URI photo is a whole image inlined into the row — far too large
  // to repeat in every JSON-LD block, and not a URL a crawler can fetch.
  const image = teacher.photoUrl && !teacher.photoUrl.startsWith('data:')
    ? teacher.photoUrl.startsWith('http')
      ? teacher.photoUrl
      : `${SITE_URL}${teacher.photoUrl}`
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: teacher.name,
    url: `${SITE_URL}${localePath(`/teacher/${teacher.id}`, lang)}`,
    ...(image && { image }),
    ...(teacher.bio && { description: teacher.bio }),
    ...(sameAs.length > 0 && { sameAs }),
  };
}

export function categoryJsonLd(slug: CourseCategory, name: string, teachers: Teacher[], lang: SupportedLang = 'ky') {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: `${SITE_URL}${localePath(`/category/${slug}`, lang)}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: teachers.slice(0, 50).map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}${localePath(`/teacher/${t.id}`, lang)}`,
        name: t.name,
      })),
    },
  };
}

/**
 * Homepage entity graph: the publisher, the site, and the Android app — the
 * facts a search or answer engine needs to tell what this is and who runs it.
 * Every claim here is visible on the page (footer link to the app, site name).
 */
export function homeJsonLd(description: string, lang: SupportedLang) {
  const homeUrl = `${SITE_URL}${localePath('/', lang)}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Kursotzyv.org',
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/icon-512.png`,
        description,
        areaServed: { '@type': 'Country', name: 'Kyrgyzstan' },
        sameAs: [PLAY_STORE_URL],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website-${lang}`,
        name: 'Kursotzyv.org',
        url: homeUrl,
        description,
        inLanguage: lang,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'MobileApplication',
        '@id': `${SITE_URL}/#android-app`,
        name: APP_NAME,
        operatingSystem: 'ANDROID',
        applicationCategory: 'EducationApplication',
        url: PLAY_STORE_URL,
        inLanguage: lang,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };
}

/** FAQPage markup for the /faq page. The answers are the page's own visible text. */
export function faqJsonLd(items: readonly { q: string; a: string }[], lang: SupportedLang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${SITE_URL}${localePath('/faq', lang)}`,
    inLanguage: lang,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

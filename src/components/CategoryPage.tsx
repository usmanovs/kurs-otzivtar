import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CourseCategory, Teacher } from '../types';
import { ALL_CATEGORY_SLUGS } from '../lib/categories';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { readStoredLang } from '../lib/lang';
import { usePrerenderData } from '../lib/prerenderData';
import { fetchTeachers } from '../lib/api';
import { breadcrumbJsonLd, categoryJsonLd } from '../lib/structuredData';
import { setPageMeta } from '../lib/pageMeta';
import { JsonLd } from './JsonLd';
import { NotFoundPage } from './NotFoundPage';
import { ChevronRight, Star } from 'lucide-react';

function plural(n: number, lang: SupportedLang, ky: string, ru: [string, string, string]): string {
  if (lang === 'ky') return `${n} ${ky}`;
  const m10 = n % 10;
  const m100 = n % 100;
  const form = m10 === 1 && m100 !== 11 ? ru[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? ru[1] : ru[2];
  return `${n} ${form}`;
}

/** Category intro: one hand-written framing sentence plus a sentence built from this category's own numbers. */
export function buildCategoryIntro(slug: CourseCategory, teachers: Teacher[], lang: SupportedLang): { framing: string; stats: string } {
  const t = TRANSLATIONS[lang];
  const label = t.categories[slug];
  const intros = t.categoryPage.intros as Record<string, string>;
  const framing = intros[slug] ?? t.categoryPage.fallbackIntro.replace('{category}', label);

  const reviews = teachers.flatMap((tch) => tch.reviews);
  if (reviews.length === 0) return { framing, stats: '' };
  const avg = reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length;
  const negative = Math.round((reviews.filter((r) => r.overallRating <= 2).length / reviews.length) * 100);
  const best = [...teachers]
    .filter((tch) => tch.reviewCount >= 1)
    .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)[0];
  const stats = t.categoryPage.statsLine
    .replace('{teachers}', plural(teachers.length, lang, 'мугалим', ['преподаватель', 'преподавателя', 'преподавателей']))
    .replace('{reviews}', plural(reviews.length, lang, 'сын-пикир', ['отзыв', 'отзыва', 'отзывов']))
    .replace('{avg}', avg.toFixed(1))
    .replace('{negative}', String(negative))
    .replace('{best}', best.name)
    .replace('{bestRating}', best.averageRating.toFixed(1));
  return { framing, stats };
}

/** /category/:slug — a real listing page with its own heading and intro, not the homepage. */
export const CategoryPage: React.FC = () => {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>();
  const valid = ALL_CATEGORY_SLUGS.includes(categorySlug);
  const slug = categorySlug as CourseCategory;
  const [currentLang] = useState(readStoredLang);
  const t = TRANSLATIONS[currentLang];
  const initial = usePrerenderData()?.teachers.filter((tch) => tch.category === slug) ?? null;
  const [teachers, setTeachers] = useState<Teacher[] | null>(initial && initial.length > 0 ? initial : null);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    fetchTeachers()
      .then((all) => {
        if (!cancelled) setTeachers(all.filter((tch) => tch.category === slug));
      })
      .catch(() => {
        if (!cancelled) setTeachers((prev) => prev ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, valid]);

  const label = valid ? t.categories[slug] : '';
  const heading = `${label} ${t.categoryPage.headingSuffix}`;

  useEffect(() => {
    if (!valid) return;
    setPageMeta({
      title: `${heading} — Kursotzyv.org`,
      description: t.categoryPage.metaDescription.replace('{category}', label),
      path: `/category/${slug}`,
    });
  }, [valid, heading, label, slug, t]);

  if (!valid) return <NotFoundPage />;

  const list = teachers ?? [];
  const sorted = [...list].sort((a, b) => b.reviewCount - a.reviewCount || b.averageRating - a.averageRating);
  const intro = buildCategoryIntro(slug, list, currentLang);
  const crumbs = [
    { name: t.categoryPage.breadcrumbHome, path: '/' },
    { name: label, path: `/category/${slug}` },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <JsonLd data={categoryJsonLd(slug, heading, sorted)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-slate-500 mb-4">
          <Link to="/" className="hover:text-slate-900 hover:underline">{crumbs[0].name}</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
          <span className="text-slate-900 font-medium" aria-current="page">{label}</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">{heading}</h1>
        <p className="text-slate-600 leading-relaxed mb-2">{intro.framing}</p>
        {intro.stats && <p className="text-slate-600 leading-relaxed mb-6">{intro.stats}</p>}

        <h2 className="text-lg font-bold text-slate-900 mb-3">{t.categoryPage.teachersHeading}</h2>
        {teachers !== null && sorted.length === 0 ? (
          <p className="text-slate-500 mb-8">{t.categoryPage.emptyList}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 mb-8">
            {sorted.map((tch) => (
              <li key={tch.id}>
                <Link
                  to={`/teacher/${tch.id}`}
                  className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition"
                >
                  <span className="font-semibold text-slate-900">{tch.name}</span>
                  <span className="flex items-center gap-1 text-sm text-slate-600 shrink-0">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {tch.reviewCount > 0 ? `${tch.averageRating.toFixed(1)} · ${tch.reviewCount}` : '—'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <h2 className="text-lg font-bold text-slate-900 mb-3">{t.categoryPage.otherCategories}</h2>
        <ul className="flex flex-wrap gap-2 mb-8">
          {ALL_CATEGORY_SLUGS.filter((s) => s !== slug).map((s) => (
            <li key={s}>
              <Link
                to={`/category/${s}`}
                className="inline-block rounded-full bg-white border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-indigo-300"
              >
                {(t.categories as Record<string, string>)[s]}
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/" className="text-sm font-semibold text-indigo-600 hover:underline">
          {t.categoryPage.backHome}
        </Link>
      </div>
    </div>
  );
};

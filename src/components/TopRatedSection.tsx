import React, { useMemo } from 'react';
import { Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { topPositiveTags } from '../lib/complaintTags';
import { ShieldCheck, Star } from 'lucide-react';
import { plural, pluralForm } from '../lib/plural';

/**
 * Kept out of this panel at the owner's request, and it is the right call:
 * the site editorialises here — it is the one place Kursotzyv recommends
 * people rather than just listing what reviewers said — and the person who
 * runs the site topping his own recommendation list undercuts the caution
 * list, which is the part that names real people and has to be unimpeachable.
 *
 * The profile stays in the directory and keeps its reviews; only this curated
 * panel skips it. Matched by id, not name, so renaming cannot silently
 * reinstate it.
 */
const EXCLUDED_IDS = new Set([
  'teacher-1789274914326', // СЕЙИТБЕК УСМАНОВ — site owner
]);

/** Below this, a high average is one or two people's opinion, not a record. */
const MIN_RATING = 4;
const MIN_REVIEWS = 2;
const MAX_SHOWN = 6;

interface TopRatedSectionProps {
  teachers: Teacher[];
  currentLang: SupportedLang;
  onViewTeacher: (teacher: Teacher) => void;
}

const Avatar: React.FC<{ teacher: Teacher }> = ({ teacher }) =>
  teacher.photoUrl ? (
    <img
      src={teacher.photoUrl}
      alt=""
      width={44}
      height={44}
      loading="lazy"
      className="w-11 h-11 rounded-full object-cover shrink-0"
    />
  ) : (
    <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-sm flex items-center justify-center shrink-0">
      {teacher.name.trim().charAt(0).toUpperCase()}
    </div>
  );

/**
 * The counterweight to the caution list.
 *
 * A site that only ever names people to warn about them reads as a grievance
 * board, and instructors have no reason to take it seriously. This panel is
 * the same evidence standard pointed the other way — and it deliberately does
 * NOT claim verification: no review on this site has had its proof checked by
 * an admin yet, so the badge says what is true (students rated them highly)
 * instead of implying a receipt was inspected.
 */
export const TopRatedSection: React.FC<TopRatedSectionProps> = ({
  teachers,
  currentLang,
  onViewTeacher,
}) => {
  const t = TRANSLATIONS[currentLang];

  const top = useMemo(
    () =>
      teachers
        .filter(
          (tch) =>
            !EXCLUDED_IDS.has(tch.id) &&
            tch.reviewCount >= MIN_REVIEWS &&
            tch.averageRating >= MIN_RATING
        )
        .sort(
          (a, b) =>
            b.averageRating - a.averageRating ||
            b.reviewCount - a.reviewCount ||
            a.name.localeCompare(b.name, 'ru')
        )
        .slice(0, MAX_SHOWN),
    [teachers]
  );

  if (top.length === 0) return null;

  return (
    <section id="top-rated-section" className="mb-10 scroll-mt-20">
      <div className="max-w-xl mx-auto rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-4 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 ring-1 ring-emerald-200/70">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block mb-1.5 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              {t.topRated.badge}
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {t.topRated.title}
              </h3>
              <span className="inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-100 px-2 py-0.5 text-2xs font-bold text-emerald-900 tabular-nums">
                {t.topRated.count.replace('{n}', plural(top.length, t.plurals.teacher, currentLang))}
              </span>
            </div>
            <p className="text-2xs text-emerald-900/70 mt-1 leading-snug">
              {t.topRated.criterion}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {top.map((teacher) => {
            const tags = topPositiveTags(teacher, 2);
            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() => onViewTeacher(teacher)}
                aria-label={teacher.name}
                className="w-full text-left flex items-center gap-3 p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-sm transition-transform hover:shadow-md active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50"
              >
                <Avatar teacher={teacher} />

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 leading-snug break-words">
                    {teacher.name}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 min-w-0">
                    {teacher.category && (
                      <span className="truncate">{t.categories[teacher.category]}</span>
                    )}
                    {teacher.category && <span className="shrink-0 text-slate-300">•</span>}
                    {/* The count sits beside the score on purpose: a 5.0 from
                        two people and a 4.4 from five are different claims. */}
                    <span className="shrink-0 tabular-nums font-medium text-slate-600">
                      {teacher.reviewCount} {pluralForm(teacher.reviewCount, t.plurals.review, currentLang)}
                    </span>
                  </p>
                  {tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 overflow-hidden">
                      {tags.map((tag) => (
                        <span
                          key={tag.key}
                          className="inline-flex shrink-0 items-center rounded border border-emerald-200/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
                        >
                          «{t.positiveTags[tag.key as keyof typeof t.positiveTags] ?? tag.key}»
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <span className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-sm font-bold tabular-nums text-emerald-700">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {teacher.averageRating.toFixed(1)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Says exactly what this ranking rests on. Without it an emerald
            frame reads as an endorsement the site has not earned the right
            to make. */}
        <p className="flex items-start gap-1.5 mt-4 pt-3 border-t border-emerald-200/60 text-xs text-emerald-900/70">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span className="leading-snug">{t.topRated.basis}</span>
        </p>
      </div>
    </section>
  );
};

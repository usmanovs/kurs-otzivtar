import React, { useMemo, useState } from 'react';
import { Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import {
  ratingTone,
  RATING_STAR_CLASS,
  RATING_TEXT_CLASS,
  RATING_BADGE_CLASS,
  FLAGGED_THRESHOLD,
  TOP_THRESHOLD,
  MIN_REVIEWS_FOR_WATCHLIST,
  bayesianRating,
} from '../lib/ratingTone';
import { TrendingUp, ShieldAlert, Star, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { topComplaintTags } from '../lib/complaintTags';
import { plural } from '../lib/plural';

interface TeacherLeaderboardSectionProps {
  teachers: Teacher[];
  currentLang: SupportedLang;
  onViewTeacher: (teacher: Teacher) => void;
}

const MAX_ROWS = 7;
// Temporarily hidden — flip back to true to bring the top-rated panel back.
const SHOW_TOP_RATED = false;
// Always surfaced in the flagged panel regardless of where they'd naturally
// rank, since the list otherwise reshuffles as more low-rated teachers
// are added.
const PINNED_FLAGGED_NAMES = ['Самат Гыяз уулу', 'Бактыгүл Мырзабек кызы'];

const RowAvatar: React.FC<{ teacher: Teacher }> = ({ teacher }) => {
  if (teacher.photoUrl) {
    return (
      <img
        src={teacher.photoUrl}
        alt={teacher.name}
        width={36}
        height={36}
        className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0 ring-2 ring-white shadow-sm">
      {teacher.name.charAt(0).toUpperCase()}
    </div>
  );
};

/** Keeps the column header aligned with the rows below it. */
const ColumnHeader: React.FC<{ label: string; bordered?: boolean }> = ({ label, bordered = false }) => (
  <div
    className={`flex items-center pl-4 pr-5 py-1.5 text-2xs font-semibold text-slate-400 ${
      bordered ? 'border-y' : 'border-b'
    } border-slate-100`}
  >
    <span className="w-4 shrink-0 mr-3" />
    <span className="w-9 shrink-0 mr-3" />
    <span className="max-w-[220px] flex-[1000_1_0%]" />
    <span className="flex-1" />
    <span className="w-[78px] shrink-0" />
    <span className="flex-1" />
    <span className="w-6 shrink-0 whitespace-nowrap capitalize text-center overflow-visible">{label}</span>
    <span className="flex-1" />
  </div>
);

/**
 * One entry on the caution list.
 *
 * A card rather than a table row: a row can only say that someone scored 1.1,
 * which on its own reads as a verdict handed down by the site. The card has
 * room for what the reviewers actually complained about, which is the part a
 * reader can weigh for themselves.
 */
const WatchlistCard: React.FC<{
  teacher: Teacher;
  rank: number;
  currentLang: SupportedLang;
  onViewTeacher: (teacher: Teacher) => void;
}> = ({ teacher, rank, currentLang, onViewTeacher }) => {
  const t = TRANSLATIONS[currentLang];
  const tags = topComplaintTags(teacher);
  const unrated = teacher.reviewCount === 0;

  return (
    <button
      type="button"
      onClick={() => onViewTeacher(teacher)}
      aria-label={teacher.name}
      className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl shadow-sm transition-transform hover:shadow-md active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-slate-500">
          #{String(rank).padStart(2, '0')}
        </span>

        <div className="shrink-0">
          <RowAvatar teacher={teacher} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Wraps instead of truncating. "Бактыгүл Мырзабе…" beside a
              complaint is the wrong person named. */}
          <div className="text-base font-semibold leading-snug text-slate-900 break-words">
            {teacher.name}
          </div>
          {teacher.category && (
            <span className="mt-1 inline-block rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-2xs font-semibold text-slate-600">
              {t.categories[teacher.category]}
            </span>
          )}
        </div>

        <div className="shrink-0 text-right">
          {unrated ? (
            <span className="text-xs text-slate-400">{t.leaderboard.noRating}</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-sm font-bold tabular-nums text-red-600">
                <Star className="h-3.5 w-3.5 fill-current" />
                {teacher.averageRating.toFixed(1)}
              </span>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">
                {teacher.reviewCount} {t.leaderboard.reviewsSuffix}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Only rendered when this teacher's own reviewers actually raised
          these; there is no filler set. */}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200/60 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700"
            >
              «{t.complaintTags[tag.key as keyof typeof t.complaintTags] ?? tag.key}»
              {tag.count > 1 && (
                <span className="font-bold tabular-nums text-rose-500">{tag.count}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </button>
  );
};

const LeaderboardRow: React.FC<{
  teacher: Teacher;
  rank: number;
  currentLang: SupportedLang;
  onViewTeacher: (teacher: Teacher) => void;
}> = ({ teacher, rank, currentLang, onViewTeacher }) => {
  const t = TRANSLATIONS[currentLang];
  const unrated = teacher.reviewCount === 0;
  const tone = ratingTone(teacher.averageRating);
  const filled = Math.round(teacher.averageRating);

  return (
    <button
      type="button"
      onClick={() => onViewTeacher(teacher)}
      className="relative w-full flex items-center pl-4 pr-5 py-3 text-left border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100"
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${unrated ? 'bg-slate-200' : RATING_BADGE_CLASS[tone]}`}
      />
      <span className="text-xs font-bold text-slate-300 w-4 shrink-0 tabular-nums mr-3">{rank}</span>
      <div className="shrink-0 mr-3">
        <RowAvatar teacher={teacher} />
      </div>
      <div className="min-w-0 max-w-[220px] flex-[1000_1_0%]">
        <div className="text-sm font-semibold text-slate-900 truncate">{teacher.name}</div>
        {teacher.category && (
          <div className="text-2xs text-gray-400 truncate">{t.categories[teacher.category]}</div>
        )}
      </div>
      <span className="flex-1" />
      <div className="flex flex-col items-center gap-0.5 shrink-0 w-[78px]">
        {unrated ? (
          // No reviews means no rating — showing five empty stars and "0.0"
          // would read as a bad score rather than an absent one.
          <span className="text-2xs text-slate-400">{t.leaderboard.noRating}</span>
        ) : (
          <>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i < filled ? RATING_STAR_CLASS[tone] : 'text-slate-200'}`}
                />
              ))}
            </div>
            <span className={`text-2xs font-bold ${RATING_TEXT_CLASS[tone]}`}>
              {teacher.averageRating.toFixed(1)}
            </span>
          </>
        )}
      </div>
      <span className="flex-1" />
      {/* Nudged up and right: the row centres it against a two-line stars +
          score block, which left it sitting low and a touch left of the
          "Пикир" header it belongs to. */}
      <div className="relative -top-1 left-1 text-xs text-slate-400 text-center w-6 shrink-0 tabular-nums">
        {teacher.reviewCount}
      </div>
      <span className="flex-1" />
    </button>
  );
};

export const TeacherLeaderboardSection: React.FC<TeacherLeaderboardSectionProps> = ({
  teachers,
  currentLang,
  onViewTeacher,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [isExpanded, setIsExpanded] = useState(false);

  const topRated = useMemo(
    () =>
      SHOW_TOP_RATED
        ? teachers
            .filter((tch) => tch.reviewCount > 0 && tch.averageRating >= TOP_THRESHOLD)
            .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
            .slice(0, MAX_ROWS)
        : [],
    [teachers]
  );

  const { flagged, flaggedTotal } = useMemo(() => {
    const score = (tch: Teacher) => bayesianRating(tch.averageRating, tch.reviewCount);

    // Rank by the shrunk score, so a teacher with many consistent complaints
    // outranks one with a single angry review.
    const sortFlagged = (a: Teacher, b: Teacher) => score(a) - score(b) || b.reviewCount - a.reviewCount;

    const pinned = teachers.filter((tch) => PINNED_FLAGGED_NAMES.includes(tch.name) && tch.reviewCount > 0);
    const pinnedNames = new Set(pinned.map((tch) => tch.name));

    const rest = teachers
      .filter(
        (tch) =>
          tch.reviewCount >= MIN_REVIEWS_FOR_WATCHLIST &&
          score(tch) <= FLAGGED_THRESHOLD &&
          !pinnedNames.has(tch.name)
      )
      .sort(sortFlagged);

    // Collapsed still reserves room for the pinned entries, so pinning keeps
    // meaning something at either size.
    const shownRest = isExpanded ? rest : rest.slice(0, Math.max(0, MAX_ROWS - pinned.length));

    return {
      flagged: [...shownRest, ...pinned].sort(sortFlagged),
      flaggedTotal: rest.length + pinned.length,
    };
  }, [teachers, isExpanded]);

  if (topRated.length === 0 && flagged.length === 0) return null;

  // No section heading here: the dossier card below carries its own, and two
  // titles stacked read as a stutter before the list.
  return (
    <section id="leaderboard-section" className="mt-6 mb-10 scroll-mt-20">
      <div className={`grid grid-cols-1 gap-5 ${SHOW_TOP_RATED ? 'md:grid-cols-2' : 'max-w-xl mx-auto'}`}>
        {topRated.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-emerald-50/40">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">{t.leaderboard.topTitle}</h3>
            </div>
            <ColumnHeader label={t.leaderboard.reviewsSuffix} />
            <div>
              {topRated.map((tch, i) => (
                <LeaderboardRow
                  key={tch.id}
                  teacher={tch}
                  rank={i + 1}
                  currentLang={currentLang}
                  onViewTeacher={onViewTeacher}
                />
              ))}
            </div>
          </div>
        )}

        {/* Deliberately not a white card like the directory below it. This
            list names people as a consumer warning, and it has to read as one
            at a glance rather than as another ranking widget. */}
        {flagged.length > 0 && (
          <div className="bg-amber-50/40 rounded-2xl border border-amber-200/70 shadow-sm p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 ring-1 ring-amber-200/70">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                {/* Names the list's standing before it names any person: this
                    is a published warning, not the site's private opinion. */}
                <span className="inline-block mb-1.5 rounded-full bg-amber-100/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  {t.leaderboard.flaggedDossier}
                </span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {t.leaderboard.flaggedTitle}
                  </h3>
                  <span className="inline-flex items-center rounded-full border border-amber-300/70 bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-900 tabular-nums">
                    {t.leaderboard.flaggedCount.replace('{n}', plural(flaggedTotal, t.plurals.teacher, currentLang))}
                  </span>
                </div>
                {/* Says what put someone here, so the list reads as a criterion
                    rather than an opinion. */}
                <p className="text-2xs text-amber-900/75 mt-1 leading-snug">
                  {t.leaderboard.flaggedCriterion}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {flagged.map((tch, i) => (
                <WatchlistCard
                  key={tch.id}
                  teacher={tch}
                  rank={i + 1}
                  currentLang={currentLang}
                  onViewTeacher={onViewTeacher}
                />
              ))}
            </div>
            {flaggedTotal > MAX_ROWS && (
              <button
                type="button"
                id="leaderboard-expand-btn"
                onClick={() => setIsExpanded((v) => !v)}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-center gap-1.5 mt-3 px-5 py-2.5 rounded-lg border border-amber-200/70 bg-white/60 text-xs font-semibold text-amber-900 hover:bg-amber-100/60 transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    {t.leaderboard.showLess}
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    {t.leaderboard.showMore.replace('{n}', String(flaggedTotal - flagged.length))}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
            <p className="flex items-start gap-1.5 mt-4 pt-3 border-t border-amber-200/60 text-xs text-amber-800/80">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span className="leading-snug">{t.leaderboard.lowReviewNotice}</span>
            </p>
          </div>
        )}
      </div>

    </section>
  );
};

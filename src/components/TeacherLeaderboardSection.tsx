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
import { Award, TrendingUp, TrendingDown, Star, ChevronDown, ChevronUp } from 'lucide-react';

interface TeacherLeaderboardSectionProps {
  teachers: Teacher[];
  currentLang: SupportedLang;
  onViewTeacher: (teacher: Teacher) => void;
}

const MAX_ROWS = 5;
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

const LeaderboardRow: React.FC<{
  teacher: Teacher;
  rank: number;
  currentLang: SupportedLang;
  onViewTeacher: (teacher: Teacher) => void;
}> = ({ teacher, rank, currentLang, onViewTeacher }) => {
  const t = TRANSLATIONS[currentLang];
  const tone = ratingTone(teacher.averageRating);
  const filled = Math.round(teacher.averageRating);

  return (
    <button
      type="button"
      onClick={() => onViewTeacher(teacher)}
      className="relative w-full flex items-center pl-4 pr-5 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0 cursor-pointer"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${RATING_BADGE_CLASS[tone]}`} />
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
      <div className="flex flex-col items-center gap-0.5 shrink-0">
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
      </div>
      <span className="flex-1" />
      <div className="text-xs text-slate-400 text-center w-6 shrink-0 tabular-nums">
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

  return (
    <section id="leaderboard-section" className="mb-10 scroll-mt-20">
      <div className="flex flex-col items-center text-center gap-2 mb-5">
        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.leaderboard.title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t.leaderboard.subtitle}</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-5 ${SHOW_TOP_RATED ? 'md:grid-cols-2' : 'max-w-xl mx-auto'}`}>
        {topRated.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-emerald-50/40">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">{t.leaderboard.topTitle}</h3>
            </div>
            <div className="flex items-center pl-4 pr-5 py-1.5 border-b border-slate-100 text-2xs font-semibold text-slate-400">
              <span className="w-4 shrink-0 mr-3" />
              <span className="w-9 shrink-0 mr-3" />
              <span className="max-w-[220px] flex-[1000_1_0%]" />
              <span className="flex-1" />
              <span className="w-[78px] shrink-0" />
              <span className="flex-1" />
              <span className="w-6 shrink-0 whitespace-nowrap capitalize text-center overflow-visible">{t.leaderboard.reviewsSuffix}</span>
              <span className="flex-1" />
            </div>
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

        {flagged.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-red-50/40">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">{t.leaderboard.flaggedTitle}</h3>
            </div>
            <div className="flex items-center pl-4 pr-5 py-1.5 border-b border-slate-100 text-2xs font-semibold text-slate-400">
              <span className="w-4 shrink-0 mr-3" />
              <span className="w-9 shrink-0 mr-3" />
              <span className="max-w-[220px] flex-[1000_1_0%]" />
              <span className="flex-1" />
              <span className="w-[78px] shrink-0" />
              <span className="flex-1" />
              <span className="w-6 shrink-0 whitespace-nowrap capitalize text-center overflow-visible">{t.leaderboard.reviewsSuffix}</span>
              <span className="flex-1" />
            </div>
            <div>
              {flagged.map((tch, i) => (
                <LeaderboardRow
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
                className="w-full flex items-center justify-center gap-1.5 px-5 py-3 border-t border-slate-100 text-xs font-semibold text-indigo-600 hover:bg-indigo-50/60 transition-colors cursor-pointer"
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
            <p className="text-2xs text-slate-400 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              {t.leaderboard.lowReviewNotice}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

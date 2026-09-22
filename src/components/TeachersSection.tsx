import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseCategory, Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { scoreTone, RATING_BADGE_CLASS } from '../lib/ratingTone';
import { topComplaintTags, topPositiveTags } from '../lib/complaintTags';
import { GraduationCap, PlusCircle, Pencil, Instagram, Youtube, MessageSquarePlus, X, SlidersHorizontal, Globe } from 'lucide-react';
import { FilterDrawer, DirectoryFilters, DEFAULT_FILTERS, activeFilterCount } from './FilterDrawer';
import { DirectorySearch } from './DirectorySearch';
import { TikTokIcon } from './TikTokIcon';
import { plural, pluralForm } from '../lib/plural';
import { ALL_CATEGORY_SLUGS_SET } from '../lib/categories';

interface TeachersSectionProps {
  teachers: Teacher[];
  /** The whole directory, before the search filter — what autocomplete offers. */
  allTeachers: Teacher[];
  totalCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  selectedCategory: CourseCategory | 'all';
  onSelectCategory: (category: CourseCategory | 'all') => void;
  currentLang: SupportedLang;
  isAdmin: boolean;
  onAddTeacher: () => void;
  onEditTeacher: (teacher: Teacher) => void;
  onViewTeacher: (teacher: Teacher) => void;
  onOpenAddReview: (teacher: Teacher) => void;
}

/** "Айжан Ишенбек кызы" -> "АИ". One letter in a 48px circle reads as a
 *  placeholder; two reads as a person. */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const initials = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return initials.toUpperCase();
}

const TeacherAvatar: React.FC<{ teacher: Teacher }> = ({ teacher }) => {
  const [imgError, setImgError] = useState(false);

  if (teacher.photoUrl && !imgError) {
    return (
      <img
        src={teacher.photoUrl}
        alt=""
        onError={() => setImgError(true)}
        loading="lazy"
        width={48}
        height={48}
        className="w-12 h-12 rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center shrink-0">
      {monogram(teacher.name)}
    </div>
  );
};

export const TeachersSection: React.FC<TeachersSectionProps> = ({
  teachers,
  totalCount,
  allTeachers,
  searchQuery,
  onSearchChange,
  onClearSearch,
  selectedCategory,
  onSelectCategory,
  currentLang,
  isAdmin,
  onAddTeacher,
  onEditTeacher,
  onViewTeacher,
  onOpenAddReview,
}) => {
  const t = TRANSLATIONS[currentLang];

  // Gender, sort and both toggles now live together behind the filter sheet.
  const [filters, setFilters] = useState<DirectoryFilters>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showUncategorised, setShowUncategorised] = useState(false);
  const { gender: selectedGender, sortBy, onlyWithPhoto, onlyWithReviews, letter: selectedLetter } = filters;
  // Off by default: 35 of 66 profiles have no photo, so defaulting this on hid
  const [selectedSubniche, setSelectedSubniche] = useState<string>('all');

  const baseTeachers = useMemo(() => {
    return teachers.filter((tch) => {
      if (onlyWithPhoto && !tch.photoUrl) return false;
      if (onlyWithReviews && tch.reviewCount === 0) return false;
      return true;
    });
  }, [teachers, onlyWithPhoto, onlyWithReviews]);

  // Only offer sub-niches that actually exist in the current category scope,
  // so the row never shows a chip that would yield an empty result.
  const availableSubniches = useMemo(() => {
    const found = new Set<string>();
    baseTeachers.forEach((tch) => {
      if (selectedCategory !== 'all' && tch.category !== selectedCategory) return;
      (tch.subniches ?? []).forEach((sn) => found.add(sn));
    });
    return Array.from(found).sort((a, b) =>
      (t.subniches[a as keyof typeof t.subniches] ?? a).localeCompare(
        t.subniches[b as keyof typeof t.subniches] ?? b,
        'ru'
      )
    );
  }, [baseTeachers, selectedCategory, t]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    baseTeachers.forEach((tch) => {
      const first = tch.name.trim().charAt(0).toUpperCase();
      if (first) letters.add(first);
    });
    return Array.from(letters).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [baseTeachers]);

  const displayedTeachers = useMemo(() => {
    const filtered = baseTeachers.filter((tch) => {
      if (selectedLetter !== 'all' && tch.name.trim().charAt(0).toUpperCase() !== selectedLetter) return false;
      if (selectedGender !== 'all' && tch.gender !== selectedGender) return false;
      if (selectedCategory !== 'all' && tch.category !== selectedCategory) return false;
      if (selectedSubniche !== 'all' && !(tch.subniches ?? []).includes(selectedSubniche)) return false;
      if (showUncategorised && tch.category && tch.category !== 'unknown') return false;
      return true;
    });

    // Teachers with no reviews have an averageRating of 0, which would other-
    // wise park them at the top of a "highest rated" sort, so they sort last.
    const sorted = [...filtered];
    switch (sortBy) {
      case 'most_reviewed':
        sorted.sort((a, b) => b.reviewCount - a.reviewCount || b.averageRating - a.averageRating);
        break;
      case 'highest_rated':
        sorted.sort((a, b) => {
          if (a.reviewCount === 0 && b.reviewCount === 0) return 0;
          if (a.reviewCount === 0) return 1;
          if (b.reviewCount === 0) return -1;
          return b.averageRating - a.averageRating || b.reviewCount - a.reviewCount;
        });
        break;
      case 'newest':
        sorted.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        break;
      default:
        break;
    }
    return sorted;
  }, [baseTeachers, selectedLetter, selectedGender, selectedCategory, selectedSubniche, sortBy, showUncategorised]);

  useEffect(() => {
    setSelectedSubniche('all');
  }, [selectedCategory]);

  const isFiltered =
    searchQuery.trim().length > 0 ||
    selectedLetter !== 'all' ||
    selectedGender !== 'all' ||
    selectedCategory !== 'all' ||
    selectedSubniche !== 'all';

  const handleClearAll = () => {
    setFilters(DEFAULT_FILTERS);
    setShowUncategorised(false);
    setSelectedSubniche('all');
    onSelectCategory('all');
    onClearSearch();
  };

  // Built from the directory itself rather than a fixed list, so every chip
  // leads somewhere and no populated category is unreachable. "Белгисиз" is
  // real but sorts last however many profiles are in it.
  const categoryChips = useMemo(() => {
    const counts = new Map<CourseCategory, number>();
    teachers.forEach((tch) => {
      if (tch.category) counts.set(tch.category, (counts.get(tch.category) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      // "Багыты тактала элек" is the absence of a topic, not a topic — as a
      // primary chip it competes with real disciplines and invites people to
      // browse the pile nobody has sorted yet. It lives in the drawer instead.
      // The membership check is the same shared list the category page and
      // sitemap use, so a chip here can never link to a page that page
      // considers non-existent.
      .filter(([key]) => ALL_CATEGORY_SLUGS_SET.has(key))
      .sort(
        ([aKey, aCount], [bKey, bCount]) =>
          bCount - aCount || t.categories[aKey].localeCompare(t.categories[bKey], 'ru')
      )
      .map(([key]) => key);
  }, [teachers, t]);

  const hasUncategorised = useMemo(
    () => teachers.some((tch) => !tch.category || tch.category === 'unknown'),
    [teachers]
  );

  const filterCount = activeFilterCount(filters) + Number(showUncategorised);

  return (
    <section id="teachers-section" className="mt-10 scroll-mt-20">
      <div className="flex flex-row items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-lg font-bold text-slate-900">
                {selectedCategory === 'all'
                  ? t.teachersSection.title
                  : `${t.categories[selectedCategory]}: ${t.categoryPage.headingSuffix}`}
              </h2>
              {/* Says up front that this is the whole catalogue, which is the
                  question the removed accordion used to raise. */}
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-600 tabular-nums">
                {t.teachersSection.totalBadge.replace('{n}', plural(totalCount, t.plurals.teacher, currentLang))}
              </span>
            </div>
            <p className="text-xs text-slate-500">{t.teachersSection.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            id="add-teacher-btn"
            onClick={onAddTeacher}
            aria-label={t.teachersSection.addBtn}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 p-2 sm:px-3 sm:py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t.teachersSection.addBtn}</span>
          </button>
        </div>
      </div>


      {/* First control under the header, and pinned on phones where the grid
          runs many screens deep. Searches the whole directory, not the
          filtered page, so a hidden profile is still reachable by name. */}
      <DirectorySearch
        teachers={allTeachers}
        value={searchQuery}
        currentLang={currentLang}
        onChange={onSearchChange}
        onSelectTeacher={onViewTeacher}
        onAddTeacher={onAddTeacher}
        trailing={
          <button
            type="button"
            id="directory-filters-btn"
            onClick={() => setIsFilterOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isFilterOpen}
            className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              filterCount > 0
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">{t.teachersSection.filtersBtn}</span>
            {filterCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-slate-900 tabular-nums">
                {filterCount}
              </span>
            )}
          </button>
        }
      />

      {/* One scrollable row instead of a dropdown: the categories that matter
          are visible without opening anything. */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 mb-1">
        <Link
          to="/"
          aria-current={selectedCategory === 'all' ? 'page' : undefined}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          {t.categories.all}
        </Link>
        {categoryChips.map((key) => (
          <React.Fragment key={key}>
            <Link
              to={`/category/${key}`}
              aria-current={selectedCategory === key ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === key
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {t.categories[key]}
            </Link>

            {/* The sub-disciplines follow their own parent inside this same
                strip. As a permanent second row they cost a row of height on
                every screen to say nothing until a category was picked. */}
            {selectedCategory === key &&
              availableSubniches.map((sn) => (
                <button
                  key={sn}
                  type="button"
                  onClick={() => setSelectedSubniche(selectedSubniche === sn ? 'all' : sn)}
                  aria-pressed={selectedSubniche === sn}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    selectedSubniche === sn
                      ? 'bg-indigo-600 text-white'
                      : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300'
                  }`}
                >
                  {t.subniches[sn as keyof typeof t.subniches] ?? sn}
                </button>
              ))}
          </React.Fragment>
        ))}
      </div>

      {isFiltered && (
        <div className="flex items-center gap-2 mb-5 -mt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full">
            {displayedTeachers.length} / {plural(totalCount, t.plurals.teacher, currentLang)}
          </span>
          <button
            type="button"
            id="clear-teacher-search-btn"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            {t.teachersSection.clearSearch}
          </button>
        </div>
      )}

      <FilterDrawer
        open={isFilterOpen}
        filters={filters}
        letters={availableLetters}
        hasUncategorised={hasUncategorised}
        showUncategorised={showUncategorised}
        onToggleUncategorised={() => setShowUncategorised((v) => !v)}
        currentLang={currentLang}
        onChange={setFilters}
        onClose={() => setIsFilterOpen(false)}
      />

      {displayedTeachers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          {isFiltered ? t.teachersSection.noSearchResults : t.teachersSection.emptyState}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {displayedTeachers.map((teacher) => {
            // Low scores get up to two complaints; clearly good ones get a
            // single highlight. Everything in between says nothing, because
            // a mixed score has no one story to tell.
            const rated = teacher.reviewCount > 0;
            const tagTone: 'bad' | 'good' =
              rated && teacher.averageRating >= 4 ? 'good' : 'bad';
            const cardTags = !rated
              ? []
              : teacher.averageRating < 3
                ? topComplaintTags(teacher, 2)
                : teacher.averageRating >= 4
                  ? topPositiveTags(teacher, 1)
                  : [];
            return (
            // The card can't be a single <a>: it contains its own real links
            // (Instagram/TikTok/website) and buttons, and nesting anchors is
            // invalid HTML. Instead a real, crawlable <Link> is stretched to
            // cover the whole card (the "stretched link" pattern) sitting
            // beneath the decorative content, which is marked
            // pointer-events-none so clicks fall through to it; the actions
            // row (edit, socials, quick-review) is a normal sibling and stays
            // independently clickable on top.
            <div
              key={teacher.id}
              id={`teacher-card-${teacher.id}`}
              className="group relative flex items-center gap-3 p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow hover:border-indigo-200 transition-all"
            >
              <Link
                to={`/teacher/${teacher.id}`}
                state={{ modal: true }}
                aria-label={teacher.name}
                className="absolute inset-0 z-0 rounded-2xl active:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 cursor-pointer"
              />
              {/* Avatar carries the score, instead of the score claiming a row
                  of its own. */}
              <div className="relative shrink-0 pointer-events-none">
                <TeacherAvatar teacher={teacher} />
                {/* Colour carries the tier, but never alone — the number is
                    right there, and unrated says "—" rather than a 0.0 that
                    would read as a terrible score. */}
                <span
                  className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white border border-white shadow-xs tabular-nums ${
                    RATING_BADGE_CLASS[scoreTone(teacher.averageRating, teacher.reviewCount)]
                  }`}
                >
                  {teacher.reviewCount > 0 ? teacher.averageRating.toFixed(1) : '—'}
                </span>
              </div>

              <div className="relative flex-1 min-w-0 pointer-events-none">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                  {teacher.name}
                </h3>
                {/* Category and review count as one metadata line — two pills
                    and an academy row were most of the old card's height. */}
                {/* The count is fixed-width and the category takes what is
                    left: truncating the whole line cut the discipline off half
                    the cards, and the discipline is what people scan for. The
                    short "пикир" is deliberate for the same reason. */}
                <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 min-w-0">
                  {teacher.category && (
                    <span className="truncate">{t.categories[teacher.category]}</span>
                  )}
                  {teacher.category && <span className="shrink-0 text-slate-300">•</span>}
                  <span
                    className={`shrink-0 tabular-nums ${
                      teacher.reviewCount > 0 ? 'text-slate-600 font-medium' : ''
                    }`}
                  >
                    {teacher.reviewCount > 0
                      ? `${teacher.reviewCount} ${pluralForm(teacher.reviewCount, t.plurals.review, currentLang)}`
                      : t.hero.searchNoReviews}
                  </span>
                </p>

                {/* Only ever this teacher's own reviewers' words; a card with
                    nothing on record shows nothing. */}
                {cardTags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 overflow-hidden">
                    {cardTags.map((tag) => (
                      <span
                        key={tag.key}
                        className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                          tagTone === 'good'
                            ? 'border-emerald-200/60 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200/60 bg-rose-50 text-rose-700'
                        }`}
                      >
                        «{(tagTone === 'good' ? t.positiveTags[tag.key as keyof typeof t.positiveTags] : t.complaintTags[tag.key as keyof typeof t.complaintTags]) ?? tag.key}»
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative z-10 flex items-center gap-1 shrink-0">
                {isAdmin && (
                  <button
                    type="button"
                    id={`edit-teacher-btn-${teacher.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTeacher(teacher);
                    }}
                    aria-label={t.addTeacherModal.titleEdit}
                    className="p-2 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}

                {teacher.instagramUrl && (
                  <a
                    href={teacher.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {teacher.youtubeUrl && (
                  <a
                    href={teacher.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {teacher.tiktokUrl && (
                  <a
                    href={teacher.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <TikTokIcon className="w-4 h-4" />
                  </a>
                )}
                {teacher.websiteUrl && (
                  <a
                    href={teacher.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Website"
                    onClick={(e) => e.stopPropagation()}
                    className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}

                {/* Label only where there is width for it; on a phone the icon
                    keeps the name column readable and still has a 36px target. */}
                <button
                  type="button"
                  id={`quick-review-btn-${teacher.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddReview(teacher);
                  }}
                  aria-label={t.courseCard.addReview}
                  className="inline-flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shrink-0 cursor-pointer"
                >
                  <MessageSquarePlus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">{t.courseCard.addReview}</span>
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

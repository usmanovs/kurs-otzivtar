import React, { useEffect } from 'react';
import { TeacherGender } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { SortOption } from '../lib/subniches';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { ToggleSwitch } from './ToggleSwitch';
import { X, RotateCcw } from 'lucide-react';

export interface DirectoryFilters {
  sortBy: SortOption;
  onlyWithPhoto: boolean;
  onlyWithReviews: boolean;
  gender: TeacherGender | 'all';
  /** First letter of the name, or 'all'. */
  letter: string;
}

/**
 * What the section looks like untouched. The trigger's badge counts how far
 * the current state has moved from this, so a freshly loaded page shows no
 * badge at all.
 */
export const DEFAULT_FILTERS: DirectoryFilters = {
  sortBy: 'default',
  onlyWithPhoto: false,
  // On by default: a profile with no reviews yet has nothing to read.
  onlyWithReviews: true,
  gender: 'all',
  letter: 'all',
};

export function activeFilterCount(f: DirectoryFilters): number {
  return (
    Number(f.sortBy !== DEFAULT_FILTERS.sortBy) +
    Number(f.onlyWithPhoto !== DEFAULT_FILTERS.onlyWithPhoto) +
    Number(f.onlyWithReviews !== DEFAULT_FILTERS.onlyWithReviews) +
    Number(f.gender !== DEFAULT_FILTERS.gender) +
    Number(f.letter !== DEFAULT_FILTERS.letter)
  );
}

const SORT_OPTIONS: SortOption[] = ['default', 'highest_rated', 'most_reviewed', 'newest'];

interface FilterDrawerProps {
  open: boolean;
  filters: DirectoryFilters;
  /** True when any profile is still unsorted; hides the toggle otherwise. */
  hasUncategorised?: boolean;
  /** Whether the directory is currently narrowed to those profiles. */
  showUncategorised?: boolean;
  onToggleUncategorised?: () => void;
  /** Initials present in the directory — never offer a letter that matches nobody. */
  letters: string[];
  currentLang: SupportedLang;
  onChange: (next: DirectoryFilters) => void;
  onClose: () => void;
}

/**
 * The directory's secondary controls, off the page until asked for.
 *
 * Loose on the page they cost four stacked rows before a reader reached the
 * first instructor — on a phone the whole directory sat below the fold. They
 * are all still one tap away, and changes apply live so the sheet never needs
 * an "apply" round trip.
 */
export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  open,
  filters,
  letters,
  hasUncategorised,
  showUncategorised,
  onToggleUncategorised,
  currentLang,
  onChange,
  onClose,
}) => {
  const t = TRANSLATIONS[currentLang];
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = <K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const dirty = activeFilterCount(filters) > 0;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh]"
      >
        {/* Grab handle: on a phone this sheet is dragged at, not clicked. */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 shrink-0">
          <h3 id="filter-drawer-title" className="text-sm font-bold text-slate-900">
            {t.teachersSection.filtersTitle}
          </h3>
          <div className="flex items-center gap-1">
            {dirty && (
              <button
                type="button"
                id="filter-drawer-reset"
                onClick={() => onChange(DEFAULT_FILTERS)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t.teachersSection.clearSearch}
              </button>
            )}
            <button
              type="button"
              id="filter-drawer-close"
              onClick={onClose}
              aria-label={t.detailModal.close}
              className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
          <section>
            <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {t.teacherSort.label.replace(':', '')}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => set('sortBy', option)}
                  aria-pressed={filters.sortBy === option}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold text-left transition-colors cursor-pointer ${
                    filters.sortBy === option
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {t.teacherSort[option]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {t.teachersSection.quickToggles}
            </h4>
            <div className="space-y-3">
              <ToggleSwitch
                id="drawer-toggle-photo"
                checked={filters.onlyWithPhoto}
                onChange={() => set('onlyWithPhoto', !filters.onlyWithPhoto)}
                label={t.teachersSection.onlyWithPhoto}
              />
              <ToggleSwitch
                id="drawer-toggle-reviews"
                checked={filters.onlyWithReviews}
                onChange={() => set('onlyWithReviews', !filters.onlyWithReviews)}
                label={t.teachersSection.onlyWithReviews}
              />
            </div>
          </section>

          <section>
            <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {t.teachersSection.advancedFilters}
            </h4>
            <div className="flex flex-wrap gap-2">
              {(['all', 'female', 'male'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('gender', value)}
                  aria-pressed={filters.gender === value}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    filters.gender === value
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {value === 'all'
                    ? t.teachersSection.allGenders
                    : value === 'female'
                      ? t.addTeacherModal.genderFemale
                      : t.addTeacherModal.genderMale}
                </button>
              ))}
            </div>
          </section>

          {hasUncategorised && onToggleUncategorised && (
            <section>
              <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                {t.categories.unknown}
              </h4>
              <ToggleSwitch
                id="drawer-toggle-uncategorised"
                checked={!!showUncategorised}
                onChange={onToggleUncategorised}
                label={t.teachersSection.showUncategorised}
              />
            </section>
          )}

          {letters.length > 0 && (
            <section>
              <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t.teachersSection.letterFilter}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => set('letter', 'all')}
                  aria-pressed={filters.letter === 'all'}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    filters.letter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {t.teachersSection.allLetters}
                </button>
                {letters.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => set('letter', letter)}
                    aria-pressed={filters.letter === letter}
                    className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      filters.letter === letter
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <button
            type="button"
            id="filter-drawer-done"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t.teachersSection.applyFilters}
          </button>
        </div>
      </div>
    </div>
  );
};

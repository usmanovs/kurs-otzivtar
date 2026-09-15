import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { ratingTone, RATING_TEXT_CLASS } from '../lib/ratingTone';
import { rankTeachers, highlightParts } from '../lib/teacherSearch';
import { Search, X, Star, PlusCircle } from 'lucide-react';

interface DirectorySearchProps {
  /** Unfiltered directory — the dropdown searches everyone, not the current page. */
  teachers: Teacher[];
  value: string;
  currentLang: SupportedLang;
  onChange: (value: string) => void;
  onSelectTeacher: (teacher: Teacher) => void;
  onAddTeacher: () => void;
  /** Rendered beside the field, inside the sticky bar — the filter trigger. */
  trailing?: React.ReactNode;
}

const MAX_SUGGESTIONS = 5;
/** Long enough to skip the intermediate states of a fast typist, short enough
 *  that the list still feels like it is reacting to the keystroke. */
const DEBOUNCE_MS = 180;

/** Matched letters, emphasised without changing the name's own characters. */
const Highlighted: React.FC<{ text: string; query: string }> = ({ text, query }) => (
  <>
    {highlightParts(text, query).map((part, i) =>
      part.match ? (
        <mark key={i} className="bg-indigo-100 text-indigo-800 rounded-[3px] px-px">
          {part.text}
        </mark>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      )
    )}
  </>
);

export const DirectorySearch: React.FC<DirectorySearchProps> = ({
  teachers,
  value,
  currentLang,
  onChange,
  onSelectTeacher,
  onAddTeacher,
  trailing,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // The field owns what it shows so typing stays instant; the debounce only
  // delays the filtering of the grid below, which is the expensive part.
  const [draft, setDraft] = useState(value);
  const pushedRef = useRef(value);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (draft === pushedRef.current) return;
    const id = window.setTimeout(() => {
      pushedRef.current = draft;
      onChange(draft);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [draft, onChange]);

  // The hero bar and the category tag pills write to the same query, so adopt
  // the value when it is changed from outside rather than fighting over it.
  useEffect(() => {
    if (value !== pushedRef.current) {
      pushedRef.current = value;
      setDraft(value);
    }
  }, [value]);

  const suggestions = useMemo(
    () => rankTeachers(teachers, draft, t, MAX_SUGGESTIONS),
    [teachers, draft, t]
  );

  // Never let Enter open whoever happened to sit at this index for the
  // previous query.
  useEffect(() => {
    setActiveIndex(-1);
  }, [draft]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    listRef.current.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const showList = isOpen && draft.trim().length > 0;

  const commit = (next: string) => {
    pushedRef.current = next;
    setDraft(next);
    onChange(next);
  };

  const choose = (teacher: Teacher) => {
    setIsOpen(false);
    setActiveIndex(-1);
    onSelectTeacher(teacher);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!showList || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // With nothing highlighted, Enter just dismisses the dropdown and leaves
      // the reader with the filtered grid underneath.
      if (activeIndex >= 0) choose(suggestions[activeIndex]);
      else {
        commit(draft);
        setIsOpen(false);
      }
    }
  };

  return (
    // Sticky only on phones, where the list runs many screens long. The bar
    // docks under the navbar (h-14 + its 1px border) instead of at top-0, or
    // it would slide behind it. Full-bleed via -mx-4 against <main>'s padding.
    <div className="sticky top-[57px] z-20 -mx-4 mb-3 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-md sm:static sm:z-auto sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-none">
      <div className="relative flex-1 min-w-0" ref={wrapRef}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          id="directory-search-input"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t.teachersSection.searchPlaceholder}
          enterKeyHint="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls="directory-search-listbox"
          aria-autocomplete="list"
          aria-label={t.teachersSection.searchPlaceholder}
          aria-activedescendant={activeIndex >= 0 ? `directory-suggestion-${activeIndex}` : undefined}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {draft && (
          <button
            type="button"
            id="directory-search-clear-btn"
            onClick={() => {
              commit('');
              setIsOpen(false);
            }}
            aria-label={t.teachersSection.clearSearch}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {showList && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl">
            {suggestions.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-sm font-medium text-slate-600">
                  {t.teachersSection.searchEmpty}
                </p>
                <button
                  type="button"
                  id="directory-search-add-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsOpen(false);
                    onAddTeacher();
                  }}
                  className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-600 hover:text-white"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>{t.teachersSection.addBtn}</span>
                </button>
              </div>
            ) : (
              <ul
                id="directory-search-listbox"
                role="listbox"
                ref={listRef}
                className="max-h-[19rem] overflow-y-auto overscroll-contain"
              >
                {suggestions.map((tch, i) => {
                  const tone = ratingTone(tch.averageRating);
                  return (
                    <li
                      key={tch.id}
                      id={`directory-suggestion-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                    >
                      <button
                        type="button"
                        // mousedown beats the input's blur, so the row cannot
                        // vanish out from under the tap.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          choose(tch);
                        }}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                          i === activeIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        {tch.photoUrl ? (
                          <img
                            src={tch.photoUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700 ring-2 ring-white">
                            {tch.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            <Highlighted text={tch.name} query={draft} />
                          </div>
                          {tch.category && (
                            <span className="mt-0.5 inline-block max-w-full truncate rounded-full border border-indigo-100 bg-indigo-50 px-2 py-px text-2xs font-semibold text-indigo-700">
                              {t.categories[tch.category]}
                            </span>
                          )}
                        </div>

                        {tch.reviewCount > 0 ? (
                          <span
                            className={`flex shrink-0 items-center gap-1 text-2xs font-bold tabular-nums ${RATING_TEXT_CLASS[tone]}`}
                          >
                            <Star className="h-3 w-3 fill-current" />
                            {tch.averageRating.toFixed(1)}
                            <span className="font-medium text-slate-400">({tch.reviewCount})</span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-2xs text-slate-400">
                            {t.hero.searchNoReviews}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
      {trailing}
    </div>
  );
};

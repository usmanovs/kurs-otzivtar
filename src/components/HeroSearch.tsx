import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { ratingTone, RATING_STAR_CLASS, RATING_TEXT_CLASS } from '../lib/ratingTone';
import { Search, X, Star } from 'lucide-react';

interface HeroSearchProps {
  teachers: Teacher[];
  value: string;
  currentLang: SupportedLang;
  onChange: (value: string) => void;
  /** Pressing the search button / Enter with nothing highlighted. */
  onSubmit: () => void;
  onSelectTeacher: (teacher: Teacher) => void;
}

const MAX_SUGGESTIONS = 6;

export const HeroSearch: React.FC<HeroSearchProps> = ({
  teachers,
  value,
  currentLang,
  onChange,
  onSubmit,
  onSelectTeacher,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 1) return [];
    // Rank by how the name matches before falling back to other fields, so
    // typing a name doesn't surface someone whose bio happens to contain it.
    const scored = teachers
      .map((tch) => {
        const name = tch.name.toLowerCase();
        let score = -1;
        if (name.startsWith(q)) score = 0;
        else if (name.includes(q)) score = 1;
        else if (tch.academyName?.toLowerCase().includes(q)) score = 2;
        else if (tch.category && t.categories[tch.category].toLowerCase().includes(q)) score = 3;
        else if (tch.bio?.toLowerCase().includes(q)) score = 4;
        return { tch, score };
      })
      .filter((x) => x.score >= 0)
      .sort(
        (a, b) =>
          a.score - b.score ||
          b.tch.reviewCount - a.tch.reviewCount ||
          a.tch.name.localeCompare(b.tch.name)
      );
    return scored.slice(0, MAX_SUGGESTIONS).map((x) => x.tch);
  }, [teachers, value, t]);

  // Reset the highlight whenever the result set changes, so Enter can never
  // open whoever happened to sit at that index for the previous query.
  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

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

  const showList = isOpen && value.trim().length > 0;

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
      setIsOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      // Only hijack Enter when something is actually highlighted; otherwise it
      // stays a normal form submit.
      e.preventDefault();
      choose(suggestions[activeIndex]);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIsOpen(false);
        onSubmit();
      }}
      className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2 pt-2"
    >
      <div className="relative flex-1" ref={wrapRef}>
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          id="hero-search-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t.hero.searchPlaceholder}
          enterKeyHint="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList && suggestions.length > 0}
          aria-controls="hero-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `hero-suggestion-${activeIndex}` : undefined}
          className="w-full pl-11 pr-20 sm:pr-12 py-3 bg-white border border-slate-200 rounded-full text-sm shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              id="hero-search-clear-btn"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              aria-label="Тазалоо"
              className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* Phones submit from inside the field (or the keyboard's search
              key); the full-width button below cost a fold. */}
          <button
            type="submit"
            id="hero-search-inline-btn"
            aria-label={t.hero.searchBtn}
            className="sm:hidden p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {showList && (
          <div className="absolute z-40 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-left animate-fade-in">
            {suggestions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500">{t.hero.searchNoResults}</div>
            ) : (
              <ul id="hero-search-listbox" role="listbox" ref={listRef} className="max-h-80 overflow-y-auto">
                {suggestions.map((tch, i) => {
                  const tone = ratingTone(tch.averageRating);
                  const filled = Math.round(tch.averageRating);
                  return (
                    <li
                      key={tch.id}
                      id={`hero-suggestion-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                    >
                      <button
                        type="button"
                        // mousedown fires before the input's blur, so the row
                        // can't disappear out from under the click.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          choose(tch);
                        }}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                          i === activeIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        {tch.photoUrl ? (
                          <img
                            src={tch.photoUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0 ring-2 ring-white shadow-sm">
                            {tch.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {tch.name}
                          </div>
                          <div className="text-2xs text-slate-400 truncate">
                            {tch.category ? t.categories[tch.category] : t.analytics.categoryUnspecified}
                          </div>
                        </div>
                        {tch.reviewCount > 0 ? (
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${s < filled ? RATING_STAR_CLASS[tone] : 'text-slate-200'}`}
                                />
                              ))}
                            </div>
                            <span className={`text-2xs font-bold ${RATING_TEXT_CLASS[tone]}`}>
                              {tch.averageRating.toFixed(1)} · {tch.reviewCount}
                            </span>
                          </div>
                        ) : (
                          <span className="text-2xs text-slate-400 shrink-0">
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

      <button
        type="submit"
        id="hero-search-btn"
        className="hidden sm:inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-all shadow-xs cursor-pointer shrink-0"
      >
        {t.hero.searchBtn}
      </button>
    </form>
  );
};

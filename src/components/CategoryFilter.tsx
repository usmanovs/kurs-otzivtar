import React from 'react';
import { CourseCategory, CourseFormat } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import {
  Search,
  Code2,
  Palette,
  Languages,
  TrendingUp,
  Briefcase,
  BarChart3,
  GraduationCap,
  Layers,
  SlidersHorizontal,
  Brain,
  Scissors,
  Car,
  ChefHat,
  Calculator,
  Baby,
  Music,
  X
} from 'lucide-react';

interface CategoryFilterProps {
  currentLang: SupportedLang;
  selectedCategory: CourseCategory;
  onSelectCategory: (cat: CourseCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedFormat: CourseFormat | 'all';
  onSelectFormat: (format: CourseFormat | 'all') => void;
  sortBy: 'default' | 'price_asc' | 'price_desc';
  onSortChange: (sort: 'default' | 'price_asc' | 'price_desc') => void;
  categoryCounts: Record<CourseCategory, number>;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  currentLang,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  selectedFormat,
  onSelectFormat,
  sortBy,
  onSortChange,
  categoryCounts,
  onResetFilters,
  hasActiveFilters,
}) => {
  const t = TRANSLATIONS[currentLang];

  const categories: { id: CourseCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t.categories.all, icon: <Layers className="w-4 h-4" /> },
    { id: 'it_programming', label: t.categories.it_programming, icon: <Code2 className="w-4 h-4" /> },
    { id: 'design_uiux', label: t.categories.design_uiux, icon: <Palette className="w-4 h-4" /> },
    { id: 'languages', label: t.categories.languages, icon: <Languages className="w-4 h-4" /> },
    { id: 'marketing_smm', label: t.categories.marketing_smm, icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'business_trading', label: t.categories.business_trading, icon: <Briefcase className="w-4 h-4" /> },
    { id: 'data_analytics', label: t.categories.data_analytics, icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'psychology', label: t.categories.psychology, icon: <Brain className="w-4 h-4" /> },
    { id: 'beauty_cosmetology', label: t.categories.beauty_cosmetology, icon: <Scissors className="w-4 h-4" /> },
    { id: 'driving_school', label: t.categories.driving_school, icon: <Car className="w-4 h-4" /> },
    { id: 'cooking_culinary', label: t.categories.cooking_culinary, icon: <ChefHat className="w-4 h-4" /> },
    { id: 'finance_accounting', label: t.categories.finance_accounting, icon: <Calculator className="w-4 h-4" /> },
    { id: 'kids_development', label: t.categories.kids_development, icon: <Baby className="w-4 h-4" /> },
    { id: 'arts_music', label: t.categories.arts_music, icon: <Music className="w-4 h-4" /> },
    { id: 'ort_school', label: t.categories.ort_school, icon: <GraduationCap className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Search and Sort bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input - Clean Minimalism rounded-full */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            id="search-courses-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-9 py-2.5 bg-slate-100 border border-transparent rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Тазалоо"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format selector */}
          <select
            id="format-filter-select"
            value={selectedFormat}
            onChange={(e) => onSelectFormat(e.target.value as CourseFormat | 'all')}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-full text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
          >
            <option value="all">{t.format.all}</option>
            <option value="online">{t.format.online}</option>
            <option value="hybrid">{t.format.hybrid}</option>
            <option value="offline">{t.format.offline}</option>
          </select>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-2xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              aria-label={t.sorting.label}
              className="bg-transparent text-xs sm:text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="default">{t.sorting.default}</option>
              <option value="price_asc">{t.sorting.price_asc}</option>
              <option value="price_desc">{t.sorting.price_desc}</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              id="reset-filters-btn"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Тазалоо</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Slider - Clean Minimalism rounded-full pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              type="button"
              id={`cat-chip-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span
                className={`text-2xs px-2 py-0.5 rounded-full font-semibold ${
                  isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

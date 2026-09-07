import React, { useMemo, useState } from 'react';
import { CourseCategory, Teacher, TeacherGender } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { GraduationCap, Star, PlusCircle, Building2, Pencil, Instagram, Youtube, MessageSquarePlus, X } from 'lucide-react';

interface TeachersSectionProps {
  teachers: Teacher[];
  totalCount: number;
  searchQuery: string;
  onClearSearch: () => void;
  currentLang: SupportedLang;
  isAdmin: boolean;
  onAddTeacher: () => void;
  onEditTeacher: (teacher: Teacher) => void;
  onViewTeacher: (teacher: Teacher) => void;
  onOpenAddReview: (teacher: Teacher) => void;
}

const TeacherAvatar: React.FC<{ teacher: Teacher }> = ({ teacher }) => {
  const [imgError, setImgError] = useState(false);

  if (teacher.photoUrl && !imgError) {
    return (
      <img
        src={teacher.photoUrl}
        alt={teacher.name}
        onError={() => setImgError(true)}
        loading="lazy"
        width={80}
        height={80}
        className="w-20 h-20 rounded-full object-cover shrink-0 ring-4 ring-white shadow-md"
      />
    );
  }

  return (
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-2xl shrink-0 ring-4 ring-white shadow-md">
      {teacher.name.charAt(0).toUpperCase()}
    </div>
  );
};

export const TeachersSection: React.FC<TeachersSectionProps> = ({
  teachers,
  totalCount,
  searchQuery,
  onClearSearch,
  currentLang,
  isAdmin,
  onAddTeacher,
  onEditTeacher,
  onViewTeacher,
  onOpenAddReview,
}) => {
  const t = TRANSLATIONS[currentLang];

  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<TeacherGender | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | 'all'>('all');

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    teachers.forEach((tch) => {
      const first = tch.name.trim().charAt(0).toUpperCase();
      if (first) letters.add(first);
    });
    return Array.from(letters).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [teachers]);

  const displayedTeachers = useMemo(() => {
    return teachers.filter((tch) => {
      if (selectedLetter !== 'all' && tch.name.trim().charAt(0).toUpperCase() !== selectedLetter) return false;
      if (selectedGender !== 'all' && tch.gender !== selectedGender) return false;
      if (selectedCategory !== 'all' && tch.category !== selectedCategory) return false;
      return true;
    });
  }, [teachers, selectedLetter, selectedGender, selectedCategory]);

  const isFiltered =
    searchQuery.trim().length > 0 ||
    selectedLetter !== 'all' ||
    selectedGender !== 'all' ||
    selectedCategory !== 'all';

  const handleClearAll = () => {
    setSelectedLetter('all');
    setSelectedGender('all');
    setSelectedCategory('all');
    onClearSearch();
  };

  return (
    <section id="teachers-section" className="mt-10 scroll-mt-20">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">{t.teachersSection.title}</h2>
            <p className="text-xs text-slate-500">{t.teachersSection.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            id="teacher-gender-filter"
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value as TeacherGender | 'all')}
            className="px-3 py-2 bg-white border border-slate-200 rounded-full text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
          >
            <option value="all">{t.teachersSection.allGenders}</option>
            <option value="female">{t.addTeacherModal.genderFemale}</option>
            <option value="male">{t.addTeacherModal.genderMale}</option>
          </select>

          <select
            id="teacher-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as CourseCategory | 'all')}
            className="px-3 py-2 bg-white border border-slate-200 rounded-full text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
          >
            <option value="all">{t.categories.all}</option>
            {(Object.keys(t.categories) as (CourseCategory | 'all')[])
              .filter((key) => key !== 'all')
              .map((key) => (
                <option key={key} value={key}>
                  {t.categories[key as CourseCategory]}
                </option>
              ))}
          </select>

          <button
            type="button"
            id="add-teacher-btn"
            onClick={onAddTeacher}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-slate-500" />
            <span>{t.teachersSection.addBtn}</span>
          </button>
        </div>
      </div>

      {availableLetters.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-4 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedLetter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              selectedLetter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {t.teachersSection.allLetters}
          </button>
          {availableLetters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => setSelectedLetter(letter)}
              className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedLetter === letter
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {isFiltered && (
        <div className="flex items-center gap-2 mb-5 -mt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full">
            {displayedTeachers.length} / {totalCount} {t.teachersSection.filteredCount}
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

      {displayedTeachers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          {isFiltered ? t.teachersSection.noSearchResults : t.teachersSection.emptyState}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedTeachers.map((teacher) => (
            <div
              key={teacher.id}
              id={`teacher-card-${teacher.id}`}
              className="group relative bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-200 flex flex-col items-center text-center p-6 pt-8"
            >
              {isAdmin && (
                <button
                  type="button"
                  id={`edit-teacher-btn-${teacher.id}`}
                  onClick={() => onEditTeacher(teacher)}
                  aria-label="Edit"
                  className="absolute top-3 right-3 p-1.5 rounded-full text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onViewTeacher(teacher)}
                className="flex flex-col items-center text-center cursor-pointer"
              >
                <div className="relative">
                  <TeacherAvatar teacher={teacher} />
                  {teacher.reviewCount > 0 && (
                    <div className="absolute -bottom-1.5 -right-1.5 flex items-center gap-0.5 text-2xs font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-full shadow-sm border-2 border-white">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      {teacher.averageRating.toFixed(1)}
                    </div>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-3 group-hover:text-indigo-600 transition-colors">
                  {teacher.name}
                </h3>
              </button>

              {teacher.academyName && (
                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mt-1">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{teacher.academyName}</span>
                </div>
              )}

              {teacher.category && (
                <span className="inline-block text-2xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 mt-2">
                  {t.categories[teacher.category]}
                </span>
              )}

              {teacher.bio && (
                <p className="text-xs text-slate-600 leading-relaxed mt-2">{teacher.bio}</p>
              )}

              <div className="w-full flex flex-col items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onViewTeacher(teacher)}
                  className={`text-2xs font-semibold px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                    teacher.reviewCount > 0
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {teacher.reviewCount > 0
                    ? `${teacher.reviewCount} ${t.teachersSection.reviewsCount}`
                    : t.teachersSection.noReviewsYet}
                </button>

                <button
                  type="button"
                  id={`quick-review-btn-${teacher.id}`}
                  onClick={() => onOpenAddReview(teacher)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-full border border-indigo-200 transition-all cursor-pointer"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>{t.courseCard.addReview}</span>
                </button>

                {(teacher.instagramUrl || teacher.youtubeUrl) && (
                  <div className="flex items-center gap-2">
                    {teacher.instagramUrl && (
                      <a
                        href={teacher.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-pink-50 hover:text-pink-600 transition-colors"
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
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Youtube className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

import React, { useMemo } from 'react';
import { Course, Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { GraduationCap, Star, PlusCircle, Building2 } from 'lucide-react';

interface TeachersSectionProps {
  teachers: Teacher[];
  courses: Course[];
  currentLang: SupportedLang;
  onAddTeacher: () => void;
}

export const TeachersSection: React.FC<TeachersSectionProps> = ({
  teachers,
  courses,
  currentLang,
  onAddTeacher,
}) => {
  const t = TRANSLATIONS[currentLang];

  const teacherStats = useMemo(() => {
    const allReviews = courses.flatMap((c) => c.reviews);
    return teachers.map((teacher) => {
      const matchingReviews = allReviews.filter(
        (r) => r.teacherName && r.teacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase()
      );
      const avgRating =
        matchingReviews.length > 0
          ? matchingReviews.reduce((sum, r) => sum + r.overallRating, 0) / matchingReviews.length
          : 0;
      return { teacher, reviewCount: matchingReviews.length, avgRating };
    });
  }, [teachers, courses]);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            {t.teachersSection.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.teachersSection.subtitle}</p>
        </div>
        <button
          type="button"
          id="add-teacher-btn"
          onClick={onAddTeacher}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-slate-500" />
          <span>{t.teachersSection.addBtn}</span>
        </button>
      </div>

      {teacherStats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          {t.teachersSection.emptyState}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teacherStats.map(({ teacher, reviewCount, avgRating }) => (
            <div
              key={teacher.id}
              id={`teacher-card-${teacher.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {teacher.name.charAt(0).toUpperCase()}
                </div>
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {avgRating.toFixed(1)}
                  </div>
                )}
              </div>

              <h3 className="font-bold text-slate-900 text-sm">{teacher.name}</h3>

              {teacher.academyName && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{teacher.academyName}</span>
                </div>
              )}

              {teacher.bio && (
                <p className="text-xs text-slate-600 leading-relaxed">{teacher.bio}</p>
              )}

              <div className="text-2xs text-slate-400 font-medium mt-auto pt-2">
                {reviewCount > 0
                  ? `${reviewCount} ${t.teachersSection.reviewsCount}`
                  : t.teachersSection.noReviewsYet}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

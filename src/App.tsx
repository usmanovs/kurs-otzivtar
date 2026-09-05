import React, { useState, useEffect, useMemo } from 'react';
import { Course, Review, CourseCategory, CourseFormat, Teacher } from './types';
import { INITIAL_COURSES, calculateCourseMetrics } from './data/initialCourses';
import { INITIAL_TEACHERS } from './data/teachers';
import { SupportedLang, TRANSLATIONS } from './translations';
import { Navbar } from './components/Navbar';
import { TransparencyBanner } from './components/TransparencyBanner';
import { StatsBar } from './components/StatsBar';
import { CategoryFilter } from './components/CategoryFilter';
import { CourseCard } from './components/CourseCard';
import { CourseDetailModal } from './components/CourseDetailModal';
import { AddReviewModal } from './components/AddReviewModal';
import { AddCourseModal } from './components/AddCourseModal';
import { TeachersSection } from './components/TeachersSection';
import { AddTeacherModal } from './components/AddTeacherModal';
import {
  ShieldAlert,
  Search,
  Sparkles,
  CheckCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

const STORAGE_KEY = 'kursotzivtar_courses_v3';
const TEACHERS_STORAGE_KEY = 'kursotzivtar_teachers_v1';
const LANG_STORAGE_KEY = 'kursotzivtar_lang';

export default function App() {
  // Language state
  const [currentLang, setCurrentLang] = useState<SupportedLang>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return (saved === 'ru' || saved === 'ky') ? saved : 'ky';
  });

  // Courses state
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: any) => calculateCourseMetrics(c));
        }
      }
    } catch (e) {
      console.error('Error loading courses from localStorage', e);
    }
    return INITIAL_COURSES;
  });

  // Teachers state
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem(TEACHERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading teachers from localStorage', e);
    }
    return INITIAL_TEACHERS;
  });

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<CourseFormat | 'all'>('all');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'most_reviewed' | 'highest_rated' | 'lowest_rated' | 'price_asc' | 'price_desc'>('most_reviewed');

  // Modals state
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<Course | null>(null);
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [reviewPreselectedCourse, setReviewPreselectedCourse] = useState<Course | null>(null);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = TRANSLATIONS[currentLang];

  // Save courses to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [courses]);

  // Save teachers to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
    } catch (e) {
      console.error('Failed to save teachers to localStorage', e);
    }
  }, [teachers]);

  // Save lang to localStorage
  const handleSelectLang = (lang: SupportedLang) => {
    setCurrentLang(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<CourseCategory, number> = {
      all: courses.length,
      it_programming: 0,
      design_uiux: 0,
      languages: 0,
      marketing_smm: 0,
      business_trading: 0,
      data_analytics: 0,
      psychology: 0,
      beauty_cosmetology: 0,
      driving_school: 0,
      cooking_culinary: 0,
      finance_accounting: 0,
      kids_development: 0,
      arts_music: 0,
      ort_school: 0,
    };
    courses.forEach((c) => {
      if (counts[c.category] !== undefined) {
        counts[c.category] += 1;
      }
    });
    return counts;
  }, [courses]);

  const warningCoursesCount = useMemo(() => {
    return courses.filter((c) => c.isWarningCourse).length;
  }, [courses]);

  const totalReviewsCount = useMemo(() => {
    return courses.reduce((acc, c) => acc + c.reviews.length, 0);
  }, [courses]);

  // Filtered and sorted courses
  const filteredCourses = useMemo(() => {
    return courses
      .filter((course) => {
        // Category filter
        if (selectedCategory !== 'all' && course.category !== selectedCategory) {
          return false;
        }

        // Format filter
        if (selectedFormat !== 'all' && course.format !== selectedFormat) {
          return false;
        }

        // Rating filter
        if (selectedRatingFilter === 'high' && course.averageRating < 4.0) {
          return false;
        }
        if (selectedRatingFilter === 'medium' && (course.averageRating < 3.0 || course.averageRating >= 4.0)) {
          return false;
        }
        if (selectedRatingFilter === 'low' && course.averageRating >= 3.0) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = course.name.toLowerCase().includes(q);
          const matchAcademy = course.academyName.toLowerCase().includes(q);
          const matchDesc = course.description.toLowerCase().includes(q);
          const matchReviews = course.reviews.some((r) =>
            r.fullReview.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
          );
          if (!matchName && !matchAcademy && !matchDesc && !matchReviews) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'most_reviewed') {
          return b.reviewCount - a.reviewCount;
        }
        if (sortBy === 'highest_rated') {
          return b.averageRating - a.averageRating;
        }
        if (sortBy === 'lowest_rated') {
          return a.averageRating - b.averageRating;
        }
        if (sortBy === 'price_asc' || sortBy === 'price_desc') {
          const aHasPrice = typeof a.priceKGS === 'number';
          const bHasPrice = typeof b.priceKGS === 'number';
          if (aHasPrice && !bHasPrice) return -1;
          if (!aHasPrice && bHasPrice) return 1;
          if (!aHasPrice && !bHasPrice) return 0;
          return sortBy === 'price_asc' ? a.priceKGS! - b.priceKGS! : b.priceKGS! - a.priceKGS!;
        }
        return 0;
      });
  }, [courses, selectedCategory, selectedFormat, selectedRatingFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedFormat !== 'all' ||
    selectedRatingFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedFormat('all');
    setSelectedRatingFilter('all');
    setSearchQuery('');
    setSortBy('most_reviewed');
  };

  const handleFilterWarningCourses = () => {
    setSelectedCategory('all');
    setSelectedRatingFilter('low');
    setSortBy('lowest_rated');
  };

  // Voting on review
  const handleVoteReview = (courseId: string, reviewId: string, type: 'helpful' | 'unhelpful') => {
    setCourses((prevCourses) =>
      prevCourses.map((c) => {
        if (c.id !== courseId) return c;

        const updatedReviews = c.reviews.map((r) => {
          if (r.id !== reviewId) return r;

          const prevVote = r.userVoted;
          let helpfulCount = r.helpfulCount;
          let unhelpfulCount = r.unhelpfulCount;

          if (prevVote === type) {
            // Unvote
            if (type === 'helpful') helpfulCount = Math.max(0, helpfulCount - 1);
            if (type === 'unhelpful') unhelpfulCount = Math.max(0, unhelpfulCount - 1);
            return {
              ...r,
              helpfulCount,
              unhelpfulCount,
              userVoted: undefined,
            };
          } else {
            // Changing or setting vote
            if (prevVote === 'helpful') helpfulCount = Math.max(0, helpfulCount - 1);
            if (prevVote === 'unhelpful') unhelpfulCount = Math.max(0, unhelpfulCount - 1);

            if (type === 'helpful') helpfulCount += 1;
            if (type === 'unhelpful') unhelpfulCount += 1;

            return {
              ...r,
              helpfulCount,
              unhelpfulCount,
              userVoted: type,
            };
          }
        });

        const updatedCourse = calculateCourseMetrics({
          ...c,
          reviews: updatedReviews,
        });

        // If currently viewed in detail modal, update selectedCourseForDetail as well
        if (selectedCourseForDetail && selectedCourseForDetail.id === courseId) {
          setSelectedCourseForDetail(updatedCourse);
        }

        return updatedCourse;
      })
    );
  };

  // Submit new review
  const handleSubmitReview = (
    reviewData: Omit<Review, 'id' | 'date' | 'helpfulCount' | 'unhelpfulCount'>
  ) => {
    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      helpfulCount: 0,
      unhelpfulCount: 0,
    };

    setCourses((prevCourses) =>
      prevCourses.map((c) => {
        if (c.id !== reviewData.courseId) return c;

        const updatedReviews = [newReview, ...c.reviews];
        const updatedCourse = calculateCourseMetrics({
          ...c,
          reviews: updatedReviews,
        });

        if (selectedCourseForDetail && selectedCourseForDetail.id === c.id) {
          setSelectedCourseForDetail(updatedCourse);
        }

        return updatedCourse;
      })
    );

    showToast('Сын-пикириңиз ийгиликтүү кошулду! Чынчыл пикириңиз үчүн чоң рахмат.');
  };

  // Add new course
  const handleAddCourse = (
    newCourseData: Omit<
      Course,
      | 'id'
      | 'reviews'
      | 'averageRating'
      | 'reviewCount'
      | 'recommendPercent'
      | 'teacherRatingAvg'
      | 'practiceRatingAvg'
      | 'jobSupportRatingAvg'
      | 'valueRatingAvg'
    >
  ) => {
    const newCourse = calculateCourseMetrics({
      ...newCourseData,
      id: `course-${Date.now()}`,
      reviews: [],
    });

    setCourses((prev) => [newCourse, ...prev]);
    showToast(`"${newCourse.name}" курсу тизмеге кошулду! Эми ага сын-пикир калтырсаңыз болот.`);
    setSelectedCourseForDetail(newCourse);
  };

  // Add new teacher
  const handleAddTeacher = (newTeacherData: Omit<Teacher, 'id'>) => {
    const newTeacher: Teacher = {
      ...newTeacherData,
      id: `teacher-${Date.now()}`,
    };
    setTeachers((prev) => [newTeacher, ...prev]);
    showToast(`"${newTeacher.name}" мугалимдер тизмесине кошулду!`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Navbar
        currentLang={currentLang}
        onSelectLang={handleSelectLang}
        onOpenAddReview={() => {
          setReviewPreselectedCourse(null);
          setIsAddReviewOpen(true);
        }}
        onOpenAddCourse={() => setIsAddCourseOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <section className="text-center py-6 sm:py-12 max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Кыргызстандагы биринчи көз карандысыз курс порталы</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Курстардын чынчыл сын-пикирлери
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
            Сапатсыз окутууга, инфобизнес тузактарына жана бош убадаларга алданбаңыз. Студенттердин чыныгы тажрыйбасын окуп, туура билимди тандаңыз.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              id="hero-add-review-btn"
              onClick={() => {
                setReviewPreselectedCourse(null);
                setIsAddReviewOpen(true);
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-full transition-all shadow-xs cursor-pointer"
            >
              Сын-пикир калтыруу
            </button>

            <button
              type="button"
              id="hero-filter-warnings-btn"
              onClick={handleFilterWarningCourses}
              className="px-6 py-2.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 font-medium text-sm rounded-full transition-all shadow-2xs cursor-pointer flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Шектүү курстарды көрүү ({warningCoursesCount})</span>
            </button>
          </div>
        </section>

        {/* Educational Safety Banner */}
        <TransparencyBanner
          currentLang={currentLang}
          warningCoursesCount={warningCoursesCount}
          onFilterWarningCourses={handleFilterWarningCourses}
        />

        {/* Stats bar */}
        <StatsBar
          currentLang={currentLang}
          totalCourses={courses.length}
          totalReviews={totalReviewsCount}
          warningCoursesCount={warningCoursesCount}
        />

        {/* Category & Search Filter */}
        <CategoryFilter
          currentLang={currentLang}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedFormat={selectedFormat}
          onSelectFormat={setSelectedFormat}
          selectedRatingFilter={selectedRatingFilter}
          onSelectRatingFilter={setSelectedRatingFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          categoryCounts={categoryCounts}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Course Grid Results */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
              <span>{t.categories[selectedCategory]}</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {filteredCourses.length} курс табылды
              </span>
            </h2>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
              >
                Бардык фильтрлерди тазалоо
              </button>
            )}
          </div>

          {filteredCourses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Курс табылган жок
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-5">
                Сиз издеген суроо-талап боюнча эч кандай курс табылган жок. Издөө сөзүн өзгөртүп көрүңүз же жаңы курс кошуңуз.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-full transition-colors cursor-pointer"
                >
                  Фильтрлерди тазалоо
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCourseOpen(true)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  Курсту кошуу
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  currentLang={currentLang}
                  onViewDetails={(c) => setSelectedCourseForDetail(c)}
                  onAddReviewForCourse={(c) => {
                    setReviewPreselectedCourse(c);
                    setIsAddReviewOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Teachers & Mentors Directory */}
        <TeachersSection
          teachers={teachers}
          courses={courses}
          currentLang={currentLang}
          onAddTeacher={() => setIsAddTeacherOpen(true)}
        />
      </main>

      {/* Footer */}
      <footer className="mt-20 bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-lg font-bold text-slate-900 tracking-tight">Kurs-Otzivtar.com</span>
                <span className="text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  Кыргызстан
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md">
                Кыргызстандагы билим берүү рыногундагы ачыктыкты жана чынчылдыкты камсыздоо үчүн түзүлгөн эркин сын-пикир платформасы.
              </p>
            </div>

            <div className="text-xs text-slate-400 text-center md:text-right">
              <div>© {new Date().getFullYear()} Kurs-Otzivtar.com. Бардык укуктар корголгон.</div>
              <div className="mt-1">
                Эгер шектүү курска же алдамчылыкка туш болсоңуз, сын-пикир калтырып элге эскертиңиз!
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedCourseForDetail && (
        <CourseDetailModal
          course={selectedCourseForDetail}
          currentLang={currentLang}
          onClose={() => setSelectedCourseForDetail(null)}
          onOpenAddReview={(c) => {
            setReviewPreselectedCourse(c);
            setIsAddReviewOpen(true);
          }}
          onVoteReview={handleVoteReview}
        />
      )}

      {isAddReviewOpen && (
        <AddReviewModal
          courses={courses}
          teachers={teachers}
          preSelectedCourse={reviewPreselectedCourse}
          currentLang={currentLang}
          onClose={() => {
            setIsAddReviewOpen(false);
            setReviewPreselectedCourse(null);
          }}
          onSubmitReview={handleSubmitReview}
        />
      )}

      {isAddTeacherOpen && (
        <AddTeacherModal
          currentLang={currentLang}
          onClose={() => setIsAddTeacherOpen(false)}
          onAddTeacher={handleAddTeacher}
        />
      )}

      {isAddCourseOpen && (
        <AddCourseModal
          currentLang={currentLang}
          onClose={() => setIsAddCourseOpen(false)}
          onAddCourse={handleAddCourse}
        />
      )}
    </div>
  );
}

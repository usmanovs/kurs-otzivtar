import React, { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Course, Review, CourseCategory, CourseFormat, Teacher, FeaturedVideo } from './types';
import { calculateTeacherMetrics } from './data/teachers';
import { supabase } from './lib/supabaseClient';
import { ADMIN_EMAIL, signOutAdmin } from './lib/auth';
import {
  fetchCourses,
  fetchTeachers,
  fetchFeaturedVideos,
  insertTeacher,
  updateTeacher,
  submitReview,
  updateReviewVoteCounts,
} from './lib/api';
import { SupportedLang, TRANSLATIONS } from './translations';
import { Navbar } from './components/Navbar';
import { TransparencyBanner } from './components/TransparencyBanner';
import { FeaturedVideosSection } from './components/FeaturedVideosSection';
import { StatsBar } from './components/StatsBar';
import { CategoryFilter } from './components/CategoryFilter';
import { CourseCard } from './components/CourseCard';
import { AddReviewModal } from './components/AddReviewModal';
import { TeachersSection } from './components/TeachersSection';
import { AddTeacherModal } from './components/AddTeacherModal';
import { TeacherDetailModal } from './components/TeacherDetailModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import {
  ShieldAlert,
  Search,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

const LANG_STORAGE_KEY = 'kursotzivtar_lang';
const VOTED_REVIEWS_KEY = 'kursotzivtar_voted_reviews_v1';

type VoteMap = Record<string, 'helpful' | 'unhelpful'>;

function loadVotedReviews(): VoteMap {
  try {
    const saved = localStorage.getItem(VOTED_REVIEWS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function applyVoteOverlay(teachers: Teacher[], votes: VoteMap): Teacher[] {
  return teachers.map((tch) => ({
    ...tch,
    reviews: tch.reviews.map((r) => ({ ...r, userVoted: votes[r.id] })),
  }));
}

export default function App() {
  // Language state
  const [currentLang, setCurrentLang] = useState<SupportedLang>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return (saved === 'ru' || saved === 'ky') ? saved : 'ky';
  });

  // Courses & Teachers — loaded from Supabase (shared, persistent data)
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<FeaturedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Per-browser record of which reviews this visitor already voted on
  const [votedReviews, setVotedReviews] = useState<VoteMap>(() => loadVotedReviews());

  useEffect(() => {
    try {
      localStorage.setItem(VOTED_REVIEWS_KEY, JSON.stringify(votedReviews));
    } catch (e) {
      console.error('Failed to save voted reviews to localStorage', e);
    }
  }, [votedReviews]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [fetchedCourses, fetchedTeachers] = await Promise.all([fetchCourses(), fetchTeachers()]);
        if (cancelled) return;
        setCourses(fetchedCourses);
        setTeachers(applyVoteOverlay(fetchedTeachers, votedReviews));

        fetchFeaturedVideos()
          .then((videos) => {
            if (!cancelled) setFeaturedVideos(videos);
          })
          .catch((e) => console.error('Failed to load featured videos', e));
      } catch (e) {
        console.error('Failed to load data from Supabase', e);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<CourseFormat | 'all'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc'>('default');

  // Modals state
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<Teacher | null>(null);
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [reviewPreselectedTeacher, setReviewPreselectedTeacher] = useState<Teacher | null>(null);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Admin session — only ADMIN_EMAIL can edit existing teacher profiles,
  // enforced server-side by Supabase RLS. This just controls what the UI offers.
  const [session, setSession] = useState<Session | null>(null);
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const t = TRANSLATIONS[currentLang];

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
    return teachers.reduce((acc, tch) => acc + tch.reviews.length, 0);
  }, [teachers]);

  // Filtered and sorted courses
  const filteredCourses = useMemo(() => {
    return courses
      .filter((course) => {
        if (selectedCategory !== 'all' && course.category !== selectedCategory) {
          return false;
        }
        if (selectedFormat !== 'all' && course.format !== selectedFormat) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = course.name.toLowerCase().includes(q);
          const matchAcademy = course.academyName.toLowerCase().includes(q);
          const matchDesc = course.description.toLowerCase().includes(q);
          if (!matchName && !matchAcademy && !matchDesc) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
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
  }, [courses, selectedCategory, selectedFormat, searchQuery, sortBy]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedFormat !== 'all' ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedFormat('all');
    setSearchQuery('');
    setSortBy('default');
  };

  const handleFilterWarningCourses = () => {
    setSelectedCategory('all');
  };

  // Voting on a teacher review — optimistic local update, persisted to Supabase
  const handleVoteReview = async (teacherId: string, reviewId: string, type: 'helpful' | 'unhelpful') => {
    const teacher = teachers.find((tch) => tch.id === teacherId);
    const review = teacher?.reviews.find((r) => r.id === reviewId);
    if (!teacher || !review) return;

    const prevVote = review.userVoted;
    let helpfulCount = review.helpfulCount;
    let unhelpfulCount = review.unhelpfulCount;
    let newVote: 'helpful' | 'unhelpful' | undefined;

    if (prevVote === type) {
      if (type === 'helpful') helpfulCount = Math.max(0, helpfulCount - 1);
      else unhelpfulCount = Math.max(0, unhelpfulCount - 1);
      newVote = undefined;
    } else {
      if (prevVote === 'helpful') helpfulCount = Math.max(0, helpfulCount - 1);
      if (prevVote === 'unhelpful') unhelpfulCount = Math.max(0, unhelpfulCount - 1);
      if (type === 'helpful') helpfulCount += 1;
      else unhelpfulCount += 1;
      newVote = type;
    }

    setTeachers((prev) =>
      prev.map((tch) => {
        if (tch.id !== teacherId) return tch;
        const updated = calculateTeacherMetrics({
          ...tch,
          reviews: tch.reviews.map((r) =>
            r.id === reviewId ? { ...r, helpfulCount, unhelpfulCount, userVoted: newVote } : r
          ),
        });
        if (selectedTeacherForDetail && selectedTeacherForDetail.id === teacherId) {
          setSelectedTeacherForDetail(updated);
        }
        return updated;
      })
    );

    setVotedReviews((prev) => {
      const next = { ...prev };
      if (newVote) next[reviewId] = newVote;
      else delete next[reviewId];
      return next;
    });

    try {
      await updateReviewVoteCounts(reviewId, helpfulCount, unhelpfulCount);
    } catch (e) {
      console.error('Failed to persist vote', e);
    }
  };

  // Submit new review — resolves to an existing teacher by name, or creates a new one
  const handleSubmitReview = async (
    teacherName: string,
    reviewData: Omit<Review, 'id' | 'date' | 'helpfulCount' | 'unhelpfulCount'>
  ) => {
    const { whatsappNumber, ...reviewFields } = reviewData;
    try {
      const result = await submitReview(teacherName, teachers, reviewFields, whatsappNumber);

      setTeachers((prev) => {
        if (result.isNewTeacher && result.newTeacher) {
          const withReview = calculateTeacherMetrics({
            ...result.newTeacher,
            reviews: [result.review],
          });
          return [withReview, ...prev];
        }
        return prev.map((tch) => {
          if (tch.id !== result.teacherId) return tch;
          const updated = calculateTeacherMetrics({
            ...tch,
            reviews: [result.review, ...tch.reviews],
          });
          if (selectedTeacherForDetail && selectedTeacherForDetail.id === tch.id) {
            setSelectedTeacherForDetail(updated);
          }
          return updated;
        });
      });

      showToast('Сын-пикириңиз ийгиликтүү кошулду! Чынчыл пикириңиз үчүн чоң рахмат.');
    } catch (e) {
      console.error('Failed to submit review', e);
      showToast('Ката кетти. Сын-пикирди сактай алган жокпуз, интернетиңизди текшерип кайра аракет кылыңыз.');
    }
  };

  // Add or update a teacher
  const handleSubmitTeacher = async (
    teacherData: Omit<Teacher, 'id' | 'reviews' | 'averageRating' | 'reviewCount' | 'recommendPercent' | 'teacherRatingAvg' | 'practiceRatingAvg' | 'jobSupportRatingAvg' | 'valueRatingAvg'>,
    editingId?: string
  ) => {
    try {
      if (editingId) {
        await updateTeacher(editingId, teacherData);
        setTeachers((prev) =>
          prev.map((tch) => (tch.id === editingId ? { ...tch, ...teacherData } : tch))
        );
        showToast(`"${teacherData.name}" мугалимдин маалыматы жаңырды!`);
      } else {
        const newTeacher = await insertTeacher(teacherData);
        setTeachers((prev) => [newTeacher, ...prev]);
        showToast(`"${newTeacher.name}" мугалимдер тизмесине кошулду!`);
      }
    } catch (e) {
      console.error('Failed to save teacher', e);
      showToast('Ката кетти. Маалыматты сактай алган жокпуз.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">Жүктөлүүдө...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-center px-6">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <p className="text-sm font-medium text-slate-700 max-w-sm">
          Маалыматтарды жүктөө учурунда ката кетти. Интернет байланышыңызды текшерип, баракты жаңыртып көрүңүз.
        </p>
      </div>
    );
  }

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
          setReviewPreselectedTeacher(null);
          setIsAddReviewOpen(true);
        }}
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
            Мугалимдердин чынчыл сын-пикирлери
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
            Курстар тез-тез өзгөрүп турат, бирок мугалимдин сапаты калат. Сын-пикириңизди мугалимге калтырыңыз — студенттердин чыныгы тажрыйбасын окуп, туура тандоо жасаңыз.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              id="hero-add-review-btn"
              onClick={() => {
                setReviewPreselectedTeacher(null);
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

        {/* Teachers & Mentors Directory */}
        <TeachersSection
          teachers={teachers}
          currentLang={currentLang}
          isAdmin={isAdmin}
          onAddTeacher={() => {
            setEditingTeacher(null);
            setIsAddTeacherOpen(true);
          }}
          onEditTeacher={(teacher) => {
            setEditingTeacher(teacher);
            setIsAddTeacherOpen(true);
          }}
          onViewTeacher={(teacher) => setSelectedTeacherForDetail(teacher)}
          onOpenAddReview={(teacher) => {
            setReviewPreselectedTeacher(teacher);
            setIsAddReviewOpen(true);
          }}
        />

        {/* Educational Safety Banner */}
        <TransparencyBanner
          currentLang={currentLang}
          warningCoursesCount={warningCoursesCount}
          onFilterWarningCourses={handleFilterWarningCourses}
        />

        {/* Featured Videos about bad courses */}
        <FeaturedVideosSection videos={featuredVideos} currentLang={currentLang} />

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
                Сиз издеген суроо-талап боюнча эч кандай курс табылган жок. Издөө сөзүн өзгөртүп көрүңүз.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-full transition-colors cursor-pointer"
                >
                  Фильтрлерди тазалоо
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
                />
              ))}
            </div>
          )}
        </section>
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
              <div className="mt-2">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => signOutAdmin()}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Admin чыгуу</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAdminLoginOpen(true)}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin кирүү</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isAdminLoginOpen && (
        <AdminLoginModal
          onClose={() => setIsAdminLoginOpen(false)}
          onSuccess={() => showToast('Admin катары ийгиликтүү кирдиңиз.')}
        />
      )}

      {selectedTeacherForDetail && (
        <TeacherDetailModal
          teacher={selectedTeacherForDetail}
          currentLang={currentLang}
          onClose={() => setSelectedTeacherForDetail(null)}
          onOpenAddReview={(teacher) => {
            setReviewPreselectedTeacher(teacher);
            setIsAddReviewOpen(true);
          }}
          onVoteReview={handleVoteReview}
        />
      )}

      {isAddReviewOpen && (
        <AddReviewModal
          teachers={teachers}
          preSelectedTeacher={reviewPreselectedTeacher}
          currentLang={currentLang}
          onClose={() => {
            setIsAddReviewOpen(false);
            setReviewPreselectedTeacher(null);
          }}
          onSubmitReview={handleSubmitReview}
        />
      )}

      {isAddTeacherOpen && (
        <AddTeacherModal
          currentLang={currentLang}
          editingTeacher={editingTeacher}
          onClose={() => {
            setIsAddTeacherOpen(false);
            setEditingTeacher(null);
          }}
          onSubmit={handleSubmitTeacher}
        />
      )}
    </div>
  );
}

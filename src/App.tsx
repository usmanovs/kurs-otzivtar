import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Course, Review, Teacher, FeaturedVideo } from './types';
import { calculateTeacherMetrics } from './data/teachers';
import { supabase } from './lib/supabaseClient';
import { ADMIN_EMAIL, signOutAdmin } from './lib/auth';
import {
  fetchCourses,
  fetchTeachers,
  fetchFeaturedVideos,
  fetchMostRecentReview,
  RecentReviewSummary,
  insertTeacher,
  updateTeacher,
  submitReview,
  updateReviewVoteCounts,
} from './lib/api';
import { SupportedLang, TRANSLATIONS } from './translations';
import { Navbar } from './components/Navbar';
import { TransparencyBanner } from './components/TransparencyBanner';
import { FeaturedVideosSection } from './components/FeaturedVideosSection';
import { ReportScamSection } from './components/ReportScamSection';
import { StatsBar } from './components/StatsBar';
import { AddReviewModal } from './components/AddReviewModal';
import { TeachersSection } from './components/TeachersSection';
import { AddTeacherModal } from './components/AddTeacherModal';
import { TeacherDetailModal } from './components/TeacherDetailModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { RecentReviewPopup } from './components/RecentReviewPopup';
import {
  Search,
  X,
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
  const { teacherId: urlTeacherId } = useParams<{ teacherId?: string }>();
  const navigate = useNavigate();

  // Language state
  const [currentLang, setCurrentLang] = useState<SupportedLang>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return (saved === 'ru' || saved === 'ky') ? saved : 'ky';
  });

  // Courses & Teachers — loaded from Supabase (shared, persistent data)
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<FeaturedVideo[]>([]);
  const [recentReview, setRecentReview] = useState<RecentReviewSummary | null>(null);
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

        fetchMostRecentReview()
          .then((review) => {
            if (!cancelled && review) {
              setRecentReview(review);
              setTimeout(() => {
                if (!cancelled) setRecentReview(null);
              }, 8000);
            }
          })
          .catch((e) => console.error('Failed to load most recent review', e));
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

  // Teacher search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const selectedTeacherForDetail = urlTeacherId ? teachers.find((tch) => tch.id === urlTeacherId) ?? null : null;
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

  // Update the page title/description when viewing an individual teacher page
  useEffect(() => {
    if (selectedTeacherForDetail) {
      document.title = `${selectedTeacherForDetail.name} — ${t.siteTitle}`;
    } else {
      document.title = `${t.siteTitle} - ${t.siteSubtitle}`;
    }
  }, [selectedTeacherForDetail, t]);

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

  const warningCoursesCount = useMemo(() => {
    return courses.filter((c) => c.isWarningCourse).length;
  }, [courses]);

  const totalReviewsCount = useMemo(() => {
    return teachers.reduce((acc, tch) => acc + tch.reviews.length, 0);
  }, [teachers]);

  const verifiedReviewsPercent = useMemo(() => {
    let verified = 0;
    let total = 0;
    teachers.forEach((tch) => {
      tch.reviews.forEach((r) => {
        total += 1;
        if (r.isVerified) verified += 1;
      });
    });
    return total > 0 ? Math.round((verified / total) * 100) : 0;
  }, [teachers]);

  const featuredTeacherAvatars = useMemo(() => {
    return [...teachers]
      .filter((tch) => tch.photoUrl)
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 5);
  }, [teachers]);

  const scrollToTeachers = () => {
    document.getElementById('teachers-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scrollToTeachers();
  };

  const handlePopularTagClick = (tag: string) => {
    setSearchQuery(tag);
    scrollToTeachers();
  };

  // Filtered teachers — searched by name, academy, bio, or specialty category
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((tch) => {
      const matchName = tch.name.toLowerCase().includes(q);
      const matchAcademy = tch.academyName?.toLowerCase().includes(q) ?? false;
      const matchBio = tch.bio?.toLowerCase().includes(q) ?? false;
      const matchCategory = tch.category ? t.categories[tch.category].toLowerCase().includes(q) : false;
      return matchName || matchAcademy || matchBio || matchCategory;
    });
  }, [teachers, searchQuery, t]);

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

      {/* Recent Review Popup */}
      {recentReview && (
        <RecentReviewPopup
          review={recentReview}
          currentLang={currentLang}
          onDismiss={() => setRecentReview(null)}
          onClick={() => {
            setRecentReview(null);
            document.getElementById('teachers-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
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
        <section className="text-center py-10 sm:py-16 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t.hero.badge}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            {t.hero.headlineLine1}
            <br />
            {t.hero.headlineLine2}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl mx-auto">
            {t.hero.subtitle}
          </p>

          <form
            onSubmit={handleHeroSearchSubmit}
            className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2 pt-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                id="hero-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.hero.searchPlaceholder}
                className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-full text-sm shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="hero-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Тазалоо"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              id="hero-search-btn"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-all shadow-xs cursor-pointer shrink-0"
            >
              {t.hero.searchBtn}
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-400">{t.hero.popularLabel}</span>
            {t.hero.popularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handlePopularTagClick(tag)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {featuredTeacherAvatars.length > 0 && (
            <button
              type="button"
              onClick={scrollToTeachers}
              className="flex flex-col items-center gap-2 pt-4 w-full cursor-pointer group"
            >
              <div className="flex items-center">
                {featuredTeacherAvatars.map((tch, i) => (
                  <img
                    key={tch.id}
                    src={tch.photoUrl}
                    alt={tch.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm transition-transform group-hover:scale-105"
                    style={{ marginLeft: i === 0 ? 0 : -12, zIndex: featuredTeacherAvatars.length - i }}
                  />
                ))}
                {teachers.length > featuredTeacherAvatars.length && (
                  <div
                    className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 text-2xs font-bold flex items-center justify-center ring-2 ring-white shadow-sm"
                    style={{ marginLeft: -12 }}
                  >
                    +{teachers.length - featuredTeacherAvatars.length}
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-500 font-medium group-hover:text-indigo-600 transition-colors">
                {t.hero.socialProofLabel}
              </span>
            </button>
          )}

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
              {t.submitReviewBtn}
            </button>

          </div>
        </section>

        {/* Teachers & Mentors Directory */}
        <TeachersSection
          teachers={filteredTeachers}
          totalCount={teachers.length}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery('')}
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
          onViewTeacher={(teacher) => navigate(`/teacher/${teacher.id}`)}
          onOpenAddReview={(teacher) => {
            setReviewPreselectedTeacher(teacher);
            setIsAddReviewOpen(true);
          }}
        />

        {/* Educational Safety Banner */}
        <TransparencyBanner
          currentLang={currentLang}
          warningCoursesCount={warningCoursesCount}
        />

        {/* Featured Videos about bad courses */}
        <FeaturedVideosSection videos={featuredVideos} currentLang={currentLang} />

        {/* How to report a scam course to the police */}
        <ReportScamSection currentLang={currentLang} />

        {/* Stats bar */}
        <StatsBar
          currentLang={currentLang}
          totalCourses={courses.length}
          totalReviews={totalReviewsCount}
          warningCoursesCount={warningCoursesCount}
        />

      </main>

      {/* Footer */}
      <footer className="mt-20 bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-lg font-bold text-slate-900 tracking-tight">Kursotzyv.org</span>
                <span className="text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  Кыргызстан
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md">
                Кыргызстандагы билим берүү рыногундагы ачыктыкты жана чынчылдыкты камсыздоо үчүн түзүлгөн эркин сын-пикир платформасы.
              </p>
            </div>

            <div className="text-xs text-slate-400 text-center md:text-right">
              <div>© {new Date().getFullYear()} Kursotzyv.org. Бардык укуктар корголгон.</div>
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
          onClose={() => navigate('/')}
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

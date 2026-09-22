import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { LANG_STORAGE_KEY, readStoredLang } from './lib/lang';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Course, CourseCategory, Review, Teacher, FeaturedVideo } from './types';
import { calculateTeacherMetrics } from './data/teachers';
import { supabase } from './lib/supabaseClient';
import { ADMIN_EMAIL, signOutAdmin, signOutUser } from './lib/auth';
import {
  fetchCourses,
  fetchTeachers,
  fetchFeaturedVideos,
  fetchMostRecentReview,
  RecentReviewSummary,
  insertTeacher,
  updateTeacher,
  submitReview,
  updateReview,
  newEditToken,
  type ReviewEnrichment,
  updateReviewVoteCounts,
  recordSiteVisit,
  fetchSiteStats,
  SiteStats,
  type NewTeacherSocials,
} from './lib/api';
import { isFlaggedRating } from './lib/ratingTone';
import { teacherMatches } from './lib/teacherSearch';
import { plural, pluralForm } from './lib/plural';
import { SupportedLang, TRANSLATIONS } from './translations';
import { Navbar } from './components/Navbar';
import { TransparencyBanner } from './components/TransparencyBanner';
import { TopRatedSection } from './components/TopRatedSection';
import { FeaturedVideosSection } from './components/FeaturedVideosSection';
import { ReportScamSection } from './components/ReportScamSection';
import { StatsBar } from './components/StatsBar';
import { AnalyticsTeaser } from './components/AnalyticsTeaser';
import { ModerationPanel } from './components/ModerationPanel';
import { TeachersSection } from './components/TeachersSection';
import { TeacherLeaderboardSection } from './components/TeacherLeaderboardSection';
import { RecentReviewPopup } from './components/RecentReviewPopup';
import { ScrollFadeRow } from './components/ScrollFadeRow';
import { HeroSearch } from './components/HeroSearch';
import { usePrerenderData } from './lib/prerenderData';
import { VoteMap, loadVotedReviews, saveVotedReviews, computeVote } from './lib/reviewVotes';

// Lazy-loaded: only needed once a user opens one of these modals, so keeping
// them out of the initial bundle shrinks first-load JS meaningfully.
const AddReviewModal = lazy(() => import('./components/AddReviewModal').then((m) => ({ default: m.AddReviewModal })));
const AddTeacherModal = lazy(() => import('./components/AddTeacherModal').then((m) => ({ default: m.AddTeacherModal })));
const TeacherDetailModal = lazy(() => import('./components/TeacherDetailModal').then((m) => ({ default: m.TeacherDetailModal })));
const AdminLoginModal = lazy(() => import('./components/AdminLoginModal').then((m) => ({ default: m.AdminLoginModal })));
const UserSignInModal = lazy(() => import('./components/UserSignInModal').then((m) => ({ default: m.UserSignInModal })));
const MyReviewsModal = lazy(() => import('./components/MyReviewsModal').then((m) => ({ default: m.MyReviewsModal })));
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  LogOut,
  Eye,
  Users,
} from 'lucide-react';


function applyVoteOverlay(teachers: Teacher[], votes: VoteMap): Teacher[] {
  return teachers.map((tch) => ({
    ...tch,
    reviews: tch.reviews.map((r) => ({ ...r, userVoted: votes[r.id] })),
  }));
}

export default function App() {
  const { teacherId: urlTeacherId } = useParams<{ teacherId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const highlightReviewId = location.hash.startsWith('#review-item-')
    ? location.hash.slice(1)
    : undefined;

  // Language state
  const [currentLang, setCurrentLang] = useState<SupportedLang>(readStoredLang);

  // Courses & Teachers — loaded from Supabase (shared, persistent data)
  // When the page was prerendered, its data is the initial state — the static
  // HTML and the first client render match — and the effects below refresh it.
  // Live values (site stats) start from the build-time last-known numbers.
  const seed = usePrerenderData('/');
  const [courses, setCourses] = useState<Course[]>(seed?.courses ?? []);
  const [teachers, setTeachers] = useState<Teacher[]>(seed?.teachers ?? []);
  const [featuredVideos, setFeaturedVideos] = useState<FeaturedVideo[]>(seed?.featuredVideos ?? []);
  const [recentReview, setRecentReview] = useState<RecentReviewSummary | null>(null);
  const [siteStats, setSiteStats] = useState<SiteStats | null>(seed?.siteStats ?? null);
  const [isLoading, setIsLoading] = useState(!seed?.courses);
  const [loadError, setLoadError] = useState(false);

  // Per-browser record of which reviews this visitor already voted on
  const [votedReviews, setVotedReviews] = useState<VoteMap>(() => loadVotedReviews());

  useEffect(() => {
    saveVotedReviews(votedReviews);
  }, [votedReviews]);

  // Real (unfaked) activity numbers — one visit recorded per browser per day,
  // and a count of reviews actually submitted in the last week.
  useEffect(() => {
    recordSiteVisit();
    const refreshStats = () => fetchSiteStats().then(setSiteStats).catch(() => {});
    refreshStats();

    // Keep "online now" truthful while someone is reading: the presence
    // window is 5 minutes, so re-ping well inside it.
    const heartbeat = setInterval(() => {
      recordSiteVisit(true);
      refreshStats();
    }, 2 * 60 * 1000);
    return () => clearInterval(heartbeat);
  }, []);

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
            // The pill times itself out so its slide-out can play; a timer
            // here could only yank it mid-animation.
            if (!cancelled && review) setRecentReview(review);
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
  const teacherNotFound = !isLoading && !!urlTeacherId && !selectedTeacherForDetail;
  // Directory filter only — /category/:slug is its own page now, so picking a
  // chip here narrows the list in place instead of navigating away.
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | 'all'>('all');
  const handleSelectCategory = setSelectedCategory;
  // In-app teacher clicks open the profile as a modal over the homepage;
  // TeacherRoute reads this state to tell them apart from a direct visit.
  const openTeacher = (id: string, hash?: string) =>
    navigate(`/teacher/${id}${hash ? `#${hash}` : ''}`, { state: { modal: true } });
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [reviewPreselectedTeacher, setReviewPreselectedTeacher] = useState<Teacher | null>(null);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isUserSignInOpen, setIsUserSignInOpen] = useState(false);
  const [isMyReviewsOpen, setIsMyReviewsOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Admin session — only ADMIN_EMAIL can edit existing teacher profiles,
  // enforced server-side by Supabase RLS. This just controls what the UI offers.
  const [session, setSession] = useState<Session | null>(null);
  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  // Any signed-in email, admin or not — this is what lets a positive review
  // skip the per-review code, since the account itself is the verified
  // identity at that point.
  const isUserSignedIn = !!session;
  const signedInEmail = session?.user?.email;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Lets links from other routes (e.g. the /about page CTA) open this modal
  // on arrival, without App needing to know about those pages' own state.
  useEffect(() => {
    if (window.location.hash === '#write-review') {
      setIsAddReviewOpen(true);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Same idea from the standalone teacher page, which also knows who the
  // review is for. Waits for the teachers to load so the name can be resolved.
  useEffect(() => {
    const writeReviewFor = (location.state as { writeReviewFor?: string } | null)?.writeReviewFor;
    if (!writeReviewFor || isLoading) return;
    setReviewPreselectedTeacher(teachers.find((tch) => tch.id === writeReviewFor) ?? null);
    setIsAddReviewOpen(true);
    navigate(location.pathname + location.search, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, location.state]);

  const t = TRANSLATIONS[currentLang];

  // Update the page title/description when viewing an individual teacher or category page
  useEffect(() => {
    if (teacherNotFound) {
      document.title = `${t.teacherNotFound.title} — ${t.siteTitle}`;
    } else if (selectedTeacherForDetail) {
      document.title = `${selectedTeacherForDetail.name} — ${t.siteTitle}`;
    } else {
      document.title = `${t.siteTitle} - ${t.siteSubtitle}`;
    }
  }, [teacherNotFound, selectedTeacherForDetail, t]);

  // Keep the meta description and canonical link in sync so shared teacher/category
  // links and search results show content-specific text instead of the generic homepage copy.
  useEffect(() => {
    const descriptionTag = document.querySelector('meta[name="description"]');
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    const origin = window.location.origin;

    let description = `${t.siteSubtitle}.`;
    let canonicalUrl = `${origin}/`;

    if (teacherNotFound) {
      description = t.teacherNotFound.message;
      canonicalUrl = `${origin}${location.pathname}`;
    } else if (selectedTeacherForDetail) {
      description = selectedTeacherForDetail.bio || description;
      canonicalUrl = `${origin}/teacher/${selectedTeacherForDetail.id}`;
    }

    descriptionTag?.setAttribute('content', description);
    canonicalTag?.setAttribute('href', canonicalUrl);
  }, [teacherNotFound, selectedTeacherForDetail, location.pathname, t]);

  // A dead teacher/category link still renders a page (the "not found"
  // panel below), but it must never be indexed as if it were real content —
  // there is nothing here for a search result to point to. The tag is
  // created on demand and removed the moment the visitor navigates
  // somewhere real, so it can never leak onto a page that should be indexed.
  useEffect(() => {
    const shouldNoindex = teacherNotFound;
    let tag = document.querySelector('meta[name="robots"]');
    if (shouldNoindex) {
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'robots');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', 'noindex');
    } else if (tag) {
      tag.remove();
    }
  }, [teacherNotFound]);

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

  // Counts flagged *instructors*, using the same threshold as the leaderboard
  // and the analytics breakdown. It used to count rows in the courses table,
  // which read as "0 suspicious" right next to a panel full of 1.0-rated
  // instructors.
  const warningCoursesCount = useMemo(() => {
    return teachers.filter((tch) => isFlaggedRating(tch.averageRating, tch.reviewCount)).length;
  }, [teachers]);

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

  // The pill shows the head of the category name but searches the whole one:
  // "IT жана Программалоо" is 161px of a 375px row, while a bare "IT" as the
  // query would also match any academy with "digital" in its name. Categories
  // are now pulled live from the directory (see popularTags below), so this
  // has to cope with whatever label shape shows up, not just the five that
  // used to be hardcoded here — "/" catches names like "Чечендик өнөр /
  // Ораторлук" that have no "жана"/"и" to split on at all.
  const shortTag = (tag: string) => tag.split(/\s*\/\s*|\s+(?:жана|и)\s+/i)[0];

  const handlePopularTagClick = (tag: string) => {
    setSearchQuery(tag);
    scrollToTeachers();
  };

  // Built from the directory itself rather than a fixed list, so this stays
  // "most popular" as the mix of instructors actually changes instead of
  // freezing on whatever was true the day someone hardcoded five names.
  const popularTags = useMemo(() => {
    const counts = new Map<CourseCategory, number>();
    teachers.forEach((tch) => {
      if (tch.category && tch.category !== 'unknown') {
        counts.set(tch.category, (counts.get(tch.category) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => t.categories[key]);
  }, [teachers, t]);

  // Filtered teachers — searched by name, academy, bio, or specialty category
  // Shares its rules with both search boxes (see lib/teacherSearch), so the
  // dropdown can never offer someone this list has already filtered away.
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    return teachers.filter((tch) => teacherMatches(tch, searchQuery, t));
  }, [teachers, searchQuery, t]);

  // Voting on a teacher review — optimistic local update, persisted to Supabase
  const handleVoteReview = async (teacherId: string, reviewId: string, type: 'helpful' | 'unhelpful') => {
    const teacher = teachers.find((tch) => tch.id === teacherId);
    const review = teacher?.reviews.find((r) => r.id === reviewId);
    if (!teacher || !review) return;

    const { helpfulCount, unhelpfulCount, newVote } = computeVote(review, type);

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
  // Second step of the review modal: the row already exists, so this patches it
  // and mirrors the change into local state so the detail view updates without
  // a refetch.
  const handleEnrichReview = async (
    reviewId: string,
    patch: ReviewEnrichment,
    whatsappNumber?: string,
    editToken?: string
  ): Promise<boolean> => {
    try {
      await updateReview(reviewId, patch, whatsappNumber, editToken);
      setTeachers((prev) =>
        prev.map((tch) => {
          if (!tch.reviews.some((r) => r.id === reviewId)) return tch;
          return calculateTeacherMetrics({
            ...tch,
            reviews: tch.reviews.map((r) => (r.id === reviewId ? { ...r, ...patch } : r)),
          });
        })
      );
      return true;
    } catch (e) {
      console.error('Failed to enrich review', e);
      showToast('Кошумча маалыматты сактай алган жокпуз, бирок сын-пикириңиз сакталды.');
      return false;
    }
  };

  const handleSubmitReview = async (
    teacherName: string,
    reviewData: Omit<Review, 'id' | 'date' | 'helpfulCount' | 'unhelpfulCount'>,
    newTeacherCategory?: CourseCategory,
    newTeacherSocials?: NewTeacherSocials
  ): Promise<{ reviewId: string; teacherId: string; editToken: string } | null> => {
    const { whatsappNumber, ...reviewFields } = reviewData;
    try {
      // Minted here, handed back to the modal, never persisted anywhere.
      const editToken = newEditToken();
      const result = await submitReview(
        teacherName,
        teachers,
        reviewFields,
        whatsappNumber,
        newTeacherCategory,
        editToken,
        newTeacherSocials
      );

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
      // The ids let the modal's second step enrich this row, and attach an
      // enrolment proof to it, instead of re-submitting anything.
      return { reviewId: result.review.id, teacherId: result.teacherId, editToken };
    } catch (e) {
      console.error('Failed to submit review', e);
      showToast('Ката кетти. Сын-пикирди сактай алган жокпуз, интернетиңизди текшерип кайра аракет кылыңыз.');
      return null;
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
            openTeacher(recentReview.teacherId, `review-item-${recentReview.reviewId}`);
          }}
        />
      )}

      {/* Header */}
      <Navbar
        currentLang={currentLang}
        isAdmin={isAdmin}
        isUserSignedIn={isUserSignedIn}
        signedInEmail={signedInEmail}
        onSelectLang={handleSelectLang}
        onOpenModeration={() => setIsModerationOpen(true)}
        onSignOutAdmin={() => signOutAdmin()}
        onOpenUserSignIn={() => setIsUserSignInOpen(true)}
        onOpenMyReviews={() => setIsMyReviewsOpen(true)}
        onSignOutUser={() => signOutUser()}
        onOpenAddReview={() => {
          setReviewPreselectedTeacher(null);
          setIsAddReviewOpen(true);
        }}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <section className="text-center pb-1 max-w-2xl mx-auto space-y-3.5">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            {t.hero.headlineLine1}
            <br />
            {t.hero.headlineLine2}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl mx-auto">
            {t.hero.subtitle}
          </p>

          {siteStats &&
            (siteStats.onlineNow > 0 ||
              siteStats.visitsLast24h > 0 ||
              siteStats.pageViewsLast24h > 0 ||
              siteStats.reviewsLast7Days > 0) && (
              <div className="flex justify-center">
                <div className="inline-flex flex-wrap items-center justify-center gap-x-1.5 sm:gap-x-2.5 gap-y-1 px-2.5 py-1 rounded-full bg-white/70 border border-slate-200/70 text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap">
                  {siteStats.onlineNow > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="relative flex w-1.5 h-1.5">
                        <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </span>
                      <span className="font-bold text-emerald-600">{siteStats.onlineNow}</span>
                      {t.hero.tickerOnline}
                    </span>
                  )}
                  {siteStats.visitsLast24h > 0 && (
                    <>
                      {siteStats.onlineNow > 0 && (
                        <span className="text-slate-300" aria-hidden="true">|</span>
                      )}
                      <span
                        className="inline-flex items-center gap-1"
                        title={`${siteStats.visitsLast24h} ${t.hero.liveVisitors}`}
                      >
                        <Users className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="font-bold text-slate-700">{siteStats.visitsLast24h}</span>
                        <span className="sr-only">{pluralForm(siteStats.visitsLast24h, t.plurals.guest, currentLang)}</span>
                      </span>
                    </>
                  )}
                  {siteStats.pageViewsLast24h > 0 && (
                    <>
                      <span className="text-slate-300" aria-hidden="true">|</span>
                      <span
                        className="inline-flex items-center gap-1"
                        title={`${siteStats.pageViewsLast24h} ${t.hero.livePageViews}`}
                      >
                        <Eye className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="font-bold text-slate-700">{siteStats.pageViewsLast24h}</span>
                        <span className="sr-only">{pluralForm(siteStats.pageViewsLast24h, t.plurals.view, currentLang)}</span>
                        <span aria-hidden="true">{t.hero.tickerWindow24h}</span>
                      </span>
                    </>
                  )}
                  {siteStats.reviewsLast7Days > 0 && (
                    <>
                      <span className="text-slate-300" aria-hidden="true">|</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="font-bold text-slate-700">+{siteStats.reviewsLast7Days}</span>
                        {t.hero.tickerReviews}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

          <HeroSearch
            teachers={teachers}
            value={searchQuery}
            currentLang={currentLang}
            onChange={setSearchQuery}
            onSubmit={scrollToTeachers}
            onSelectTeacher={(teacher) => openTeacher(teacher.id)}
          />

          {/* One swipeable row on phones (wrapping put these on three lines);
              reverts to a centred wrap once there's width for it. */}
          <div className="text-xs">
            <span className="block sm:hidden text-slate-400 mb-1.5">{t.hero.popularLabel}</span>
            <ScrollFadeRow className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 snap-x snap-mandatory scroll-pl-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:snap-none">
              <span className="hidden sm:inline text-slate-400 shrink-0">{t.hero.popularLabel}</span>
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handlePopularTagClick(tag)}
                  className="shrink-0 snap-start whitespace-nowrap inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors cursor-pointer"
                >
                  {shortTag(tag)}
                </button>
              ))}
            </ScrollFadeRow>
          </div>

          {/* Social proof and the CTA were three stacked blocks — a trust
              pill, an avatar cluster with its own caption, and a button row —
              costing most of the fold. One unit now: faces, the two numbers
              that back them, and the action. */}
          <div className="pt-1 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              {featuredTeacherAvatars.length > 0 && (
                <button
                  type="button"
                  onClick={scrollToTeachers}
                  className="group inline-flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-700 transition-colors hover:border-indigo-200 cursor-pointer"
                >
                  {/* shrink-0 is load-bearing: without it flex compressed this
                      span while the images kept their size, so the cluster
                      spilled 30px over the label and ate the "1" of "157". */}
                  <span className="flex -space-x-2 mr-1 shrink-0">
                    {featuredTeacherAvatars.map((tch) => (
                      <img
                        key={tch.id}
                        src={tch.photoUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ))}
                  </span>
                  <span className="font-medium group-hover:text-indigo-600 transition-colors">
                    {totalReviewsCount > 0 ? (
                      <>
                        {/* Each count and its noun is one unbreakable unit, so
                            the only place this can wrap is the bullet — it was
                            leaving "мугалим" stranded on a line of its own. */}
                        <span className="whitespace-nowrap">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600">
                            {totalReviewsCount}
                          </span>{' '}
                          {pluralForm(totalReviewsCount, t.plurals.review, currentLang)}
                        </span>
                        <span className="mx-1.5 text-slate-300">•</span>
                        <span className="whitespace-nowrap">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600">
                            {teachers.length}
                          </span>{' '}
                          {pluralForm(teachers.length, t.plurals.teacher, currentLang)}
                        </span>
                      </>
                    ) : (
                      t.hero.socialProofLabel
                    )}
                  </span>
                </button>
              )}

              <button
                type="button"
                id="hero-add-review-btn"
                onClick={() => {
                  setReviewPreselectedTeacher(null);
                  setIsAddReviewOpen(true);
                }}
                className="px-5 py-2.5 bg-transparent hover:bg-indigo-600/10 border-2 border-indigo-600 text-indigo-600 font-semibold text-sm rounded-full transition-colors cursor-pointer shrink-0"
              >
                {t.submitReviewBtn}
              </button>
            </div>

          </div>
        </section>

        {/* Best & lowest rated teachers, based on real review averages */}
        <TeacherLeaderboardSection
          teachers={teachers}
          currentLang={currentLang}
          onViewTeacher={(teacher) => openTeacher(teacher.id)}
        />

        {/* Directly under the caution list, on purpose: the two panels are
            the same evidence standard pointed in opposite directions. */}
        <TopRatedSection
          teachers={teachers}
          currentLang={currentLang}
          onViewTeacher={(teacher) => openTeacher(teacher.id)}
        />

        {/* Teachers & Mentors Directory */}
        <TeachersSection
          teachers={filteredTeachers}
          allTeachers={teachers}
          totalCount={teachers.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
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
          onViewTeacher={(teacher) => openTeacher(teacher.id)}
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

        {/* Lightweight summary — the full dashboard now lives at /analytics */}
        <AnalyticsTeaser teachers={teachers} currentLang={currentLang} />

      </main>

      {/* Footer */}
      <footer className="mt-20 bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-lg font-bold text-slate-900 tracking-tight">Kursotzyv.org</span>
                <span className="text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  {t.footer.country}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md">
                {t.footer.mission}
              </p>
              <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs font-medium text-slate-500">
                <Link to="/reviews" className="hover:text-indigo-600 transition-colors">
                  {t.navAllReviews}
                </Link>
                <Link to="/analytics" className="hover:text-indigo-600 transition-colors">
                  {t.navStats}
                </Link>
                <Link to="/about" className="hover:text-indigo-600 transition-colors">
                  {t.navAbout}
                </Link>
              </nav>
            </div>

            <div className="text-xs text-slate-400 text-center md:text-right">
              <div suppressHydrationWarning>{t.footer.copyright.replace('{year}', String(new Date().getFullYear()))}</div>
              <div className="mt-1">
                {t.footer.callToAction}
              </div>
              <div className="mt-2">
                {isAdmin ? (
                  <div className="inline-flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setIsModerationOpen(true)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>{t.moderation.openButton}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => signOutAdmin()}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>{t.adminAuth.signOut}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAdminLoginOpen(true)}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>{t.adminAuth.signIn}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {isModerationOpen && isAdmin && (
        <ModerationPanel
          currentLang={currentLang}
          onClose={() => setIsModerationOpen(false)}
          onModerated={() => {
            fetchTeachers()
              .then((fetched) => setTeachers(applyVoteOverlay(fetched, votedReviews)))
              .catch(() => {});
          }}
        />
      )}

      {/* Modals */}
      <Suspense fallback={null}>
        {isAdminLoginOpen && (
          <AdminLoginModal
            currentLang={currentLang}
            onClose={() => setIsAdminLoginOpen(false)}
            onSuccess={() => showToast('Admin катары ийгиликтүү кирдиңиз.')}
          />
        )}

        {isUserSignInOpen && (
          <UserSignInModal
            currentLang={currentLang}
            onClose={() => setIsUserSignInOpen(false)}
            onSuccess={() => showToast(t.userAuth.signedInHint)}
          />
        )}

        {isMyReviewsOpen && (
          <MyReviewsModal
            currentLang={currentLang}
            onClose={() => setIsMyReviewsOpen(false)}
            onSelectReview={(teacherId, reviewId) => {
              openTeacher(teacherId, `review-item-${reviewId}`);
            }}
          />
        )}

        {selectedTeacherForDetail && (
          <TeacherDetailModal
            teacher={selectedTeacherForDetail}
            currentLang={currentLang}
            highlightReviewId={highlightReviewId}
            isAdmin={isAdmin}
            onClose={() => navigate('/')}
            onOpenAddReview={(teacher) => {
              setReviewPreselectedTeacher(teacher);
              setIsAddReviewOpen(true);
            }}
            onVoteReview={handleVoteReview}
          />
        )}

        {teacherNotFound && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-8 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1.5">{t.teacherNotFound.title}</h2>
              <p className="text-sm text-slate-500 mb-6">{t.teacherNotFound.message}</p>
              <button
                type="button"
                id="teacher-not-found-back-btn"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-colors shadow-xs cursor-pointer"
              >
                {t.teacherNotFound.backLink}
              </button>
            </div>
          </div>
        )}

        {isAddReviewOpen && (
          <AddReviewModal
            teachers={teachers}
            preSelectedTeacher={reviewPreselectedTeacher}
            currentLang={currentLang}
            isUserSignedIn={isUserSignedIn}
            signedInEmail={signedInEmail}
            onClose={() => {
              setIsAddReviewOpen(false);
              setReviewPreselectedTeacher(null);
            }}
            onSubmitReview={handleSubmitReview}
            onEnrichReview={handleEnrichReview}
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
      </Suspense>
    </div>
  );
}

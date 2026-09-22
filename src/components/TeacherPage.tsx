import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Teacher } from '../types';
import { TRANSLATIONS } from '../translations';
import { readStoredLang } from '../lib/lang';
import { usePrerenderData } from '../lib/prerenderData';
import { fetchTeacherById, updateReviewVoteCounts } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { ADMIN_EMAIL } from '../lib/auth';
import { computeVote, loadVotedReviews, saveVotedReviews } from '../lib/reviewVotes';
import { calculateTeacherMetrics } from '../data/teachers';
import { breadcrumbJsonLd, teacherJsonLd } from '../lib/structuredData';
import { setPageMeta } from '../lib/pageMeta';
import { JsonLd } from './JsonLd';
import { TeacherHeaderIdentity, TeacherProfileBody, TeacherSocialLinks, ShareButton } from './TeacherProfile';
import { AlertTriangle, ChevronRight } from 'lucide-react';

/** Applies this browser's saved votes on top of the fetched counts. */
function withVotes(teacher: Teacher): Teacher {
  const votes = loadVotedReviews();
  return calculateTeacherMetrics({
    ...teacher,
    reviews: teacher.reviews.map((r) => (votes[r.id] ? { ...r, userVoted: votes[r.id] } : r)),
  });
}

/**
 * /teacher/:id when opened directly (search result, shared link, category
 * page): only the teacher's profile — no homepage sections. Clicking a teacher
 * inside the app still opens the modal over the homepage (see TeacherRoute).
 */
export const TeacherPage: React.FC = () => {
  const { teacherId = '' } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initial = usePrerenderData()?.teachers.find((tch) => tch.id === teacherId) ?? null;
  const [currentLang] = useState(readStoredLang);
  const [teacher, setTeacher] = useState<Teacher | null>(initial);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>(initial ? 'ready' : 'loading');
  const [isAdmin, setIsAdmin] = useState(false);
  const t = TRANSLATIONS[currentLang];

  useEffect(() => {
    let cancelled = false;
    fetchTeacherById(teacherId)
      .then((tch) => {
        if (cancelled) return;
        if (tch) {
          setTeacher(withVotes(tch));
          setStatus('ready');
        } else {
          setTeacher(null);
          setStatus('missing');
        }
      })
      .catch(() => {
        // Keep whatever the prerender gave us; only give up if there was nothing.
        if (!cancelled) setStatus((s) => (s === 'loading' ? 'missing' : s));
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAdmin(data.session?.user?.email === ADMIN_EMAIL));
  }, []);

  useEffect(() => {
    if (!teacher) return;
    const description = teacher.reviewCount > 0
      ? t.teacherPage.metaDescription
          .replace('{name}', teacher.name)
          .replace('{rating}', teacher.averageRating.toFixed(1))
          .replace('{count}', String(teacher.reviewCount))
      : t.teacherPage.metaDescriptionNoReviews.replace('{name}', teacher.name);
    setPageMeta({ title: `${teacher.name} — Kursotzyv.org`, description, path: `/teacher/${teacher.id}` });
  }, [teacher, t]);

  // Reviews deep-link with #review-item-<id>.
  const highlightReviewId = location.hash.startsWith('#review-item-') ? location.hash.slice(1) : undefined;

  const handleVote = (_tid: string, reviewId: string, type: 'helpful' | 'unhelpful') => {
    const review = teacher?.reviews.find((r) => r.id === reviewId);
    if (!teacher || !review) return;
    const { helpfulCount, unhelpfulCount, newVote } = computeVote(review, type);
    setTeacher(
      calculateTeacherMetrics({
        ...teacher,
        reviews: teacher.reviews.map((r) =>
          r.id === reviewId ? { ...r, helpfulCount, unhelpfulCount, userVoted: newVote } : r
        ),
      })
    );
    const votes = loadVotedReviews();
    if (newVote) votes[reviewId] = newVote;
    else delete votes[reviewId];
    saveVotedReviews(votes);
    updateReviewVoteCounts(reviewId, helpfulCount, unhelpfulCount).catch(() => {});
  };

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        {status === 'missing' && <meta name="robots" content="noindex" />}
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1.5">
            {status === 'missing' ? t.teacherNotFound.title : t.teacherPage.loading}
          </h1>
          {status === 'missing' && (
            <>
              <p className="text-sm text-slate-500 mb-6">{t.teacherNotFound.message}</p>
              <Link to="/" className="text-sm font-semibold text-indigo-600 hover:underline">
                {t.teacherNotFound.backLink}
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const categoryLabel = teacher.category ? t.categories[teacher.category] : undefined;
  const crumbs = [
    { name: t.teacherPage.breadcrumbHome, path: '/' },
    ...(teacher.category && categoryLabel ? [{ name: categoryLabel, path: `/category/${teacher.category}` }] : []),
    { name: teacher.name, path: `/teacher/${teacher.id}` },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <JsonLd data={teacherJsonLd(teacher)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-slate-500 mb-4">
          {crumbs.map((c, i) => (
            <React.Fragment key={c.path}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />}
              {i < crumbs.length - 1 ? (
                <Link to={c.path} className="hover:text-slate-900 hover:underline">
                  {c.name}
                </Link>
              ) : (
                <span className="text-slate-900 font-medium" aria-current="page">
                  {c.name}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-900 text-white flex items-start justify-between gap-3">
            <TeacherHeaderIdentity teacher={teacher} currentLang={currentLang} as="h1" />
            <div className="flex items-center gap-1 shrink-0 self-start">
              <TeacherSocialLinks teacher={teacher} />
              <ShareButton teacher={teacher} currentLang={currentLang} />
            </div>
          </div>
          <div className="px-5 pt-6 pb-0 sm:p-7 sm:pb-0 space-y-6">
            <TeacherProfileBody
              teacher={teacher}
              currentLang={currentLang}
              highlightReviewId={highlightReviewId}
              isAdmin={isAdmin}
              variant="page"
              onOpenAddReview={() => navigate('/', { state: { writeReviewFor: teacher.id } })}
              onVoteReview={handleVote}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

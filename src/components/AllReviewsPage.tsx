import React, { useEffect, useMemo, useState } from 'react';
import { readStoredLang } from '../lib/lang';
import { Link } from 'react-router-dom';
import { SupportedLang, TRANSLATIONS } from '../translations';
import {
  fetchAllReviews,
  fetchReviewsFeedCounts,
  updateReviewVoteCounts,
  FeedReviewSummary,
  ReviewsFeedFilters,
  ReviewsFeedCounts,
} from '../lib/api';
import { pluralForm } from '../lib/plural';
import { hasRealTitle } from '../lib/reviewTitle';
import { usePrerenderData } from '../lib/prerenderData';
import { setPageMeta } from '../lib/pageMeta';
import { ArrowLeft, Star, ThumbsUp, ThumbsDown, Search, Loader2, ChevronDown } from 'lucide-react';

const VOTED_REVIEWS_KEY = 'kursotzivtar_voted_reviews_v1';
const STAR_SIZE = 12;

// A 5-point traffic-light scale: 5 stars reads unambiguously green, 1 reads
// unambiguously red, with 2-4 stepping through the hues between — rounded to
// the nearest whole star since review ratings are whole-star picks.
const STAR_TONE_CLASS: Record<number, string> = {
  1: 'fill-red-600 text-red-600',
  2: 'fill-orange-500 text-orange-500',
  3: 'fill-amber-400 text-amber-400',
  4: 'fill-lime-500 text-lime-500',
  5: 'fill-emerald-500 text-emerald-500',
};

function starToneClass(rating: number): string {
  const band = Math.min(5, Math.max(1, Math.round(rating)));
  return STAR_TONE_CLASS[band];
}

type RatingFilter = 'all' | 'recommended' | 'critical' | 'verified';
type SortMode = 'newest' | 'helpful';
type VoteMap = Record<string, 'helpful' | 'unhelpful'>;

function loadVotedReviews(): VoteMap {
  try {
    const saved = localStorage.getItem(VOTED_REVIEWS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function formatRelative(
  iso: string | undefined,
  fallback: string,
  strings: { todayAt: string; yesterdayAt: string; daysAgo: readonly string[] },
  lang: SupportedLang,
  now: number
): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;

  // Kyrgyzstan time (UTC+6, no DST) instead of the runtime's zone: the
  // prerendered HTML is built on a UTC server, and a zone-dependent result
  // would differ from the browser's on first render.
  const BISHKEK_MS = 6 * 3600 * 1000;
  const k = new Date(d.getTime() + BISHKEK_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`;
  const dayNumber = (ms: number) => Math.floor((ms + BISHKEK_MS) / 86400000);
  const diffDays = dayNumber(now) - dayNumber(d.getTime());

  if (diffDays <= 0) return strings.todayAt.replace('{time}', time);
  if (diffDays === 1) return strings.yesterdayAt.replace('{time}', time);
  if (diffDays < 30) return `${diffDays} ${pluralForm(diffDays, strings.daysAgo, lang)}`;
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`;
}

/**
 * A 5-star array with proper half-star fills, not just full/empty. Each star
 * is an empty (gray) icon with a fixed-size filled copy clipped to the owned
 * fraction of its width — clipping rather than scaling keeps the star shape
 * from squishing at partial fills. The fill color itself carries the rating's
 * sentiment (see STAR_TONE_CLASS) since there's no numeric score alongside it.
 */
function StarRow({ rating, size = STAR_SIZE }: { rating: number; size?: number }) {
  const toneClass = starToneClass(rating);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating.toFixed(1)} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i));
        return (
          <span key={i} className="relative inline-block shrink-0" style={{ width: size, height: size }}>
            <Star aria-hidden="true" className="fill-gray-200 text-gray-200" style={{ width: size, height: size }} />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: fill >= 1 ? '100%' : `${fill * 100}%` }}
              >
                <Star aria-hidden="true" className={toneClass} style={{ width: size, height: size }} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 animate-pulse">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-slate-200" />
          <div className="h-2.5 w-1/4 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-3 w-2/3 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
      </div>
    </div>
  );
}

/**
 * A sitewide feed of every published review, reachable from the navbar.
 * Filtering and sorting run server-side so "load more" keeps applying the
 * same criteria across pages instead of only ever touching what's loaded.
 */
export const AllReviewsPage: React.FC = () => {
  const [currentLang] = useState<SupportedLang>(readStoredLang);
  const t = TRANSLATIONS[currentLang];
  const p = t.allReviewsPage;

  // Seeded from the prerendered payload (first page of the feed) so the static
  // HTML has the reviews; the fetch below refreshes it without a skeleton flash.
  const seed = usePrerenderData('/reviews');
  const seededFeed = seed?.feed ?? null;
  const [reviews, setReviews] = useState<FeedReviewSummary[]>(seededFeed?.reviews ?? []);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(seededFeed?.hasMore ?? true);
  const [isLoading, setIsLoading] = useState(!seededFeed);
  // Relative dates ("2 days ago") are computed against the build time on the
  // first render — what the static HTML used — then against the real clock.
  const [now, setNow] = useState(() => (seed?.builtAt ? Date.parse(seed.builtAt) : Date.now()));
  useEffect(() => {
    setNow(Date.now());
  }, []);
  const isFirstLoad = React.useRef(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [votedReviews, setVotedReviews] = useState<VoteMap>(() => loadVotedReviews());
  const [counts, setCounts] = useState<ReviewsFeedCounts | null>(seededFeed?.counts ?? null);

  useEffect(() => {
    setPageMeta({ title: `${p.title} — Kursotzyv.org`, description: p.subtitle, path: '/reviews' });
  }, [p]);

  // Debounce free-text search so every keystroke doesn't re-query.
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    try {
      localStorage.setItem(VOTED_REVIEWS_KEY, JSON.stringify(votedReviews));
    } catch {
      // Best-effort — a vote still applies for this session even if it can't persist.
    }
  }, [votedReviews]);

  const filters: ReviewsFeedFilters = useMemo(
    () => ({
      ratingFilter: ratingFilter === 'all' ? undefined : ratingFilter,
      sort: sortMode,
      search: search || undefined,
    }),
    [ratingFilter, sortMode, search]
  );

  const loadPage = async (pageToLoad: number) => {
    try {
      const { reviews: newReviews, hasMore: more } = await fetchAllReviews(pageToLoad, filters);
      const withVotes = newReviews.map((r) => ({ ...r, userVoted: votedReviews[r.id] }));
      setReviews((prev) => (pageToLoad === 0 ? withVotes : [...prev, ...withVotes]));
      setHasMore(more);
      setPage(pageToLoad);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Re-fetch page 0 whenever a filter/sort/search criterion changes.
  useEffect(() => {
    const silent = isFirstLoad.current && !!seededFeed;
    isFirstLoad.current = false;
    if (!silent) setIsLoading(true);
    loadPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Counts behind each filter pill track the search term but not the
  // selected pill itself, so switching pills doesn't need a re-fetch.
  useEffect(() => {
    fetchReviewsFeedCounts(search)
      .then(setCounts)
      .catch(() => setCounts(null));
  }, [search]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    loadPage(page + 1);
  };

  const handleHelpful = (review: FeedReviewSummary) => {
    const prevVote = review.userVoted;
    let helpfulCount = review.helpfulCount;
    let unhelpfulCount = review.unhelpfulCount;
    let newVote: 'helpful' | 'unhelpful' | undefined;

    if (prevVote === 'helpful') {
      helpfulCount = Math.max(0, helpfulCount - 1);
      newVote = undefined;
    } else {
      if (prevVote === 'unhelpful') unhelpfulCount = Math.max(0, unhelpfulCount - 1);
      helpfulCount += 1;
      newVote = 'helpful';
    }

    setReviews((prev) =>
      prev.map((r) => (r.id === review.id ? { ...r, helpfulCount, unhelpfulCount, userVoted: newVote } : r))
    );
    setVotedReviews((prev) => {
      const next = { ...prev };
      if (newVote) next[review.id] = newVote;
      else delete next[review.id];
      return next;
    });
    updateReviewVoteCounts(review.id, helpfulCount, unhelpfulCount).catch(() => {});
  };

  const FILTER_OPTIONS: { key: RatingFilter; label: string; count?: number }[] = [
    { key: 'all', label: p.filterAll, count: counts?.all },
    { key: 'recommended', label: p.filterRecommended, count: counts?.recommended },
    { key: 'critical', label: p.filterCritical, count: counts?.critical },
    { key: 'verified', label: p.filterVerified, count: counts?.verified },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {p.backBtn}
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {p.title}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 mt-2">{p.subtitle}</p>
      </div>

      <div className="sticky top-14 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={p.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 rounded-full border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRatingFilter(opt.key)}
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    ratingFilter === opt.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                  {opt.count !== undefined && (
                    <span className={ratingFilter === opt.key ? 'text-indigo-100' : 'text-slate-400'}> ({opt.count})</span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative shrink-0 ml-auto">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-full border-0 bg-slate-100 hover:bg-slate-200/70 text-xs font-medium text-slate-600 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="newest">{p.sortNewest}</option>
                <option value="helpful">{p.sortHelpful}</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!isLoading && loadError && reviews.length === 0 && (
          <div className="text-center py-16 text-sm text-slate-500">{p.loadError}</div>
        )}

        {!isLoading && !loadError && reviews.length === 0 && (
          <div className="text-center py-16 text-sm text-slate-500">{p.empty}</div>
        )}

        {!isLoading && reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.map((review) => {
              const verdictTone = review.wouldRecommend
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700';
              const showTitle = hasRealTitle(review.title);

              return (
                <div key={review.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/teacher/${review.teacherId}#review-item-${review.id}`}
                      className="flex items-start gap-2.5 min-w-0 group"
                    >
                      {review.teacherPhotoUrl ? (
                        <img
                          src={review.teacherPhotoUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                          {review.teacherName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {review.teacherName}
                          </span>
                          <StarRow rating={review.overallRating} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-2xs text-slate-400/70">
                          <span>{review.isAnonymous ? p.anonymousAuthor : review.authorName}</span>
                          <span aria-hidden="true">•</span>
                          <span className="whitespace-nowrap">
                            {formatRelative(review.createdAt, review.date, p, currentLang, now)}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 sm:px-3.5 py-1 text-[10px] font-medium leading-snug text-right shrink-0 max-w-[45%] sm:max-w-none ${verdictTone}`}
                    >
                      {review.wouldRecommend ? (
                        <ThumbsUp className="w-3 h-3 shrink-0" />
                      ) : (
                        <ThumbsDown className="w-3 h-3 shrink-0" />
                      )}
                      {review.wouldRecommend ? t.detailModal.recommendYes : t.detailModal.recommendNo}
                    </span>
                  </div>

                  {showTitle && (
                    <h4 className="text-sm sm:text-[15px] font-extrabold text-slate-900 leading-tight mt-2.5">
                      {review.title}
                    </h4>
                  )}
                  <p
                    className={
                      showTitle
                        ? 'mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line'
                        : 'mt-2.5 text-[17px] font-normal text-slate-900 leading-snug whitespace-pre-line'
                    }
                  >
                    {review.fullReview}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {review.pros.slice(0, 2).map((pro, idx) => (
                      <span
                        key={`pro-${idx}`}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-50 text-slate-500"
                      >
                        {pro}
                      </span>
                    ))}
                    {review.cons.slice(0, 2).map((con, idx) => (
                      <span
                        key={`con-${idx}`}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-50 text-slate-500"
                      >
                        {con}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-start pt-2.5 mt-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleHelpful(review)}
                      aria-label={p.helpfulBtn}
                      title={p.helpfulBtn}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-0 text-xs font-semibold transition-colors cursor-pointer ${
                        review.userVoted === 'helpful'
                          ? 'bg-emerald-500 text-white'
                          : 'text-slate-500 hover:bg-slate-100 active:bg-slate-200'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span className="font-bold">{review.helpfulCount}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {isLoadingMore && Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={`more-${i}`} />)}
          </div>
        )}

        {hasMore && !isLoading && !isLoadingMore && reviews.length > 0 && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={handleLoadMore}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-indigo-50 text-indigo-600 font-semibold text-sm rounded-full transition-colors border border-indigo-200 cursor-pointer"
            >
              {p.loadMoreBtn}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

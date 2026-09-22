import { Review, Teacher } from '../types';
import { calculateTeacherMetrics } from '../data/teachers';

// Pure row -> model mappers. Kept free of any Supabase import so the build-time
// prerender script (which runs under tsx, where import.meta.env is undefined)
// can reuse exactly what the browser uses.

export function mapReviewRow(row: any): Review {
  return {
    id: row.id,
    authorName: row.author_name,
    isAnonymous: row.is_anonymous,
    authorStatus: row.author_status,
    isVerified: row.is_verified,
    proofVerified: row.proof_verified ?? false,
    source: row.source ?? 'submitted',
    date: row.review_date,
    createdAt: row.created_at ?? undefined,
    country: row.country ?? undefined,
    city: row.city ?? undefined,
    overallRating: Number(row.overall_rating),
    teacherRating: Number(row.teacher_rating),
    practiceRating: Number(row.practice_rating),
    jobSupportRating: Number(row.job_support_rating),
    valueRating: Number(row.value_rating),
    wouldRecommend: row.would_recommend,
    pricePaidKGS: row.price_paid_kgs ?? undefined,
    durationMonths: row.duration_months ?? undefined,
    cohortYear: row.cohort_year ?? undefined,
    title: row.title,
    fullReview: row.full_review,
    pros: row.pros ?? [],
    cons: row.cons ?? [],
    adviceForNewcomers: row.advice_for_newcomers ?? undefined,
    hasJobScamReport: row.has_job_scam_report,
    helpfulCount: row.helpful_count,
    unhelpfulCount: row.unhelpful_count,
  };
}

export function mapTeacherRow(row: any): Teacher {
  const reviews = (row.reviews ?? [])
    .filter((r: any) => !r.is_hidden)
    .map(mapReviewRow)
    .sort((a: Review, b: Review) => b.date.localeCompare(a.date));

  return calculateTeacherMetrics({
    id: row.id,
    name: row.name,
    bio: row.bio ?? undefined,
    academyName: row.academy_name ?? undefined,
    category: row.category ?? undefined,
    subniches: row.subniches ?? [],
    gender: row.gender ?? undefined,
    createdAt: row.created_at ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    youtubeUrl: row.youtube_url ?? undefined,
    tiktokUrl: row.tiktok_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    reviews,
  });
}

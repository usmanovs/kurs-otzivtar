import { supabase } from './supabaseClient';
import { Course, CourseCategory, FeaturedVideo, Review, StudentStatus, Teacher } from '../types';
import { calculateTeacherMetrics } from '../data/teachers';

function mapReviewRow(row: any): Review {
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

export interface RecentReviewSummary {
  reviewId: string;
  teacherId: string;
  teacherName: string;
  teacherPhotoUrl?: string;
  authorName: string;
  isAnonymous: boolean;
  overallRating: number;
  title: string;
}

export async function fetchMostRecentReview(): Promise<RecentReviewSummary | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, teacher_id, author_name, is_anonymous, overall_rating, title, teachers(name, photo_url)')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const teacher = Array.isArray(data.teachers) ? data.teachers[0] : data.teachers;
  return {
    reviewId: data.id,
    teacherId: data.teacher_id,
    teacherName: teacher?.name ?? '',
    teacherPhotoUrl: teacher?.photo_url ?? undefined,
    authorName: data.author_name,
    isAnonymous: data.is_anonymous,
    overallRating: Number(data.overall_rating),
    title: data.title,
  };
}

function mapTeacherRow(row: any): Teacher {
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
    reviews,
  });
}

function mapCourseRow(row: any): Course {
  return {
    id: row.id,
    name: row.name,
    academyName: row.academy_name,
    category: row.category,
    format: row.format,
    durationText: row.duration_text,
    priceKGS: row.price_kgs ?? undefined,
    websiteOrInstagram: row.website_or_instagram ?? undefined,
    description: row.description,
    isWarningCourse: row.is_warning_course,
    warningNotice: row.warning_notice ?? undefined,
  };
}

export async function fetchTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select('*, reviews(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTeacherRow);
}

export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCourseRow);
}

function mapFeaturedVideoRow(row: any): FeaturedVideo {
  return {
    id: row.id,
    title: row.title,
    channelName: row.channel_name,
    channelUrl: row.channel_url ?? undefined,
    thumbnailUrl: row.thumbnail_url,
    videoUrl: row.video_url,
  };
}

export async function fetchFeaturedVideos(): Promise<FeaturedVideo[]> {
  const { data, error } = await supabase
    .from('featured_videos')
    .select('*')
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapFeaturedVideoRow);
}

export async function insertTeacher(
  teacher: Omit<Teacher, 'id' | 'reviews' | 'averageRating' | 'reviewCount' | 'recommendPercent' | 'teacherRatingAvg' | 'practiceRatingAvg' | 'jobSupportRatingAvg' | 'valueRatingAvg'>
): Promise<Teacher> {
  const { data, error } = await supabase
    .from('teachers')
    .insert({
      id: `teacher-${Date.now()}`,
      name: teacher.name,
      bio: teacher.bio ?? null,
      academy_name: teacher.academyName ?? null,
      category: teacher.category ?? null,
      subniches: teacher.subniches ?? [],
      gender: teacher.gender ?? null,
      photo_url: teacher.photoUrl ?? null,
      instagram_url: teacher.instagramUrl ?? null,
      youtube_url: teacher.youtubeUrl ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapTeacherRow({ ...data, reviews: [] });
}

export async function updateTeacher(
  id: string,
  teacher: Omit<Teacher, 'id' | 'reviews' | 'averageRating' | 'reviewCount' | 'recommendPercent' | 'teacherRatingAvg' | 'practiceRatingAvg' | 'jobSupportRatingAvg' | 'valueRatingAvg'>
): Promise<void> {
  const { error } = await supabase
    .from('teachers')
    .update({
      name: teacher.name,
      bio: teacher.bio ?? null,
      academy_name: teacher.academyName ?? null,
      category: teacher.category ?? null,
      subniches: teacher.subniches ?? [],
      gender: teacher.gender ?? null,
      photo_url: teacher.photoUrl ?? null,
      instagram_url: teacher.instagramUrl ?? null,
      youtube_url: teacher.youtubeUrl ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Submits a review for a teacher, looking the teacher up by name (case-insensitive)
 * among already-loaded teachers, or creating a new teacher record if no match exists.
 * Returns the teacher id the review was attached to, and whether that teacher is new.
 */
/**
 * Key a teacher name for lookup. Case and stray whitespace must not mint a
 * second profile: "самара   кеңешова" and "Самара Кеңешова" are one person,
 * and the duplicate would arrive with no category attached.
 * AddReviewModal decides whether to prompt for a category with this same
 * function, so the prompt can never disagree with what the insert does.
 */
export function teacherNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Fields the enrichment step can add after the review is already saved. */
export interface ReviewEnrichment {
  pros?: string[];
  cons?: string[];
  pricePaidKGS?: number;
  durationMonths?: number;
  cohortYear?: string;
  teacherRating?: number;
  practiceRating?: number;
  jobSupportRating?: number;
  valueRating?: number;
  authorName?: string;
  isAnonymous?: boolean;
  authorStatus?: StudentStatus;
  hasJobScamReport?: boolean;
}

/**
 * Second write for a review that is already live. The first screen saves as
 * soon as it has the essentials, so everything here is an edit to an existing
 * row rather than part of the original insert.
 */
export async function updateReview(
  reviewId: string,
  patch: ReviewEnrichment,
  whatsappNumber?: string
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.pros !== undefined) row.pros = patch.pros;
  if (patch.cons !== undefined) row.cons = patch.cons;
  if (patch.pricePaidKGS !== undefined) row.price_paid_kgs = patch.pricePaidKGS;
  if (patch.durationMonths !== undefined) row.duration_months = patch.durationMonths;
  if (patch.cohortYear !== undefined) row.cohort_year = patch.cohortYear;
  if (patch.teacherRating !== undefined) row.teacher_rating = patch.teacherRating;
  if (patch.practiceRating !== undefined) row.practice_rating = patch.practiceRating;
  if (patch.jobSupportRating !== undefined) row.job_support_rating = patch.jobSupportRating;
  if (patch.valueRating !== undefined) row.value_rating = patch.valueRating;
  if (patch.authorName !== undefined) row.author_name = patch.authorName;
  if (patch.isAnonymous !== undefined) row.is_anonymous = patch.isAnonymous;
  if (patch.authorStatus !== undefined) row.author_status = patch.authorStatus;
  if (patch.hasJobScamReport !== undefined) row.has_job_scam_report = patch.hasJobScamReport;

  if (Object.keys(row).length > 0) {
    const { error } = await supabase.from('reviews').update(row).eq('id', reviewId);
    if (error) throw error;
  }

  if (whatsappNumber && whatsappNumber.trim()) {
    // Same best-effort contract as the insert path: never blocks, never read back.
    await supabase.from('review_contact_info').insert({
      review_id: reviewId,
      whatsapp_number: whatsappNumber.trim(),
    });
  }
}

export async function submitReview(
  teacherName: string,
  existingTeachers: Teacher[],
  reviewData: Omit<Review, 'id' | 'date' | 'helpfulCount' | 'unhelpfulCount'>,
  whatsappNumber?: string,
  newTeacherCategory?: CourseCategory
): Promise<{ teacherId: string; review: Review; isNewTeacher: boolean; newTeacher?: Teacher }> {
  const normalized = teacherNameKey(teacherName);
  const existing = existingTeachers.find((t) => teacherNameKey(t.name) === normalized);

  let teacherId: string;
  let newTeacher: Teacher | undefined;
  let isNewTeacher = false;

  if (existing) {
    teacherId = existing.id;
  } else {
    // The reviewer is asked for this in the modal whenever the name matches
    // nobody — creating a profile with a name and nothing else is what left
    // most of the directory uncategorised.
    const created = await insertTeacher({
      name: teacherName.trim(),
      category: newTeacherCategory,
    });
    teacherId = created.id;
    newTeacher = created;
    isNewTeacher = true;
  }

  const reviewId = `rev-${Date.now()}`;

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      id: reviewId,
      teacher_id: teacherId,
      author_name: reviewData.authorName,
      is_anonymous: reviewData.isAnonymous ?? false,
      author_status: reviewData.authorStatus,
      is_verified: reviewData.isVerified,
      review_date: new Date().toISOString().split('T')[0],
      overall_rating: reviewData.overallRating,
      teacher_rating: reviewData.teacherRating,
      practice_rating: reviewData.practiceRating,
      job_support_rating: reviewData.jobSupportRating,
      value_rating: reviewData.valueRating,
      would_recommend: reviewData.wouldRecommend,
      price_paid_kgs: reviewData.pricePaidKGS ?? null,
      duration_months: reviewData.durationMonths ?? null,
      cohort_year: reviewData.cohortYear ?? null,
      title: reviewData.title,
      full_review: reviewData.fullReview,
      pros: reviewData.pros,
      cons: reviewData.cons,
      advice_for_newcomers: reviewData.adviceForNewcomers ?? null,
      has_job_scam_report: reviewData.hasJobScamReport ?? false,
      helpful_count: 0,
      unhelpful_count: 0,
    })
    .select()
    .single();
  if (error) throw error;

  if (whatsappNumber && whatsappNumber.trim()) {
    // Best-effort — never blocks the review itself, and never readable back via anon key.
    await supabase.from('review_contact_info').insert({
      review_id: reviewId,
      whatsapp_number: whatsappNumber.trim(),
    });
  }

  // Best-effort spam/abuse signal — logs the submitter's IP server-side, where the
  // real address can actually be read from the request. Never blocks the review
  // itself and never readable back via the anon key (see api/log-review-ip.ts).
  fetch('/api/log-review-ip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewId }),
  }).catch(() => {
    // Ignore — this is a secondary signal, not something the reviewer should ever see fail.
  });

  return { teacherId, review: mapReviewRow(data), isNewTeacher, newTeacher };
}

// Admin-only: precise submission IP/time per review, for spotting abuse
// patterns. RLS on review_ip_log restricts SELECT to the admin owner, so
// this silently returns nothing for anyone else.
export async function fetchReviewIpLog(
  reviewIds: string[]
): Promise<Record<string, { ipAddress: string; createdAt: string }>> {
  if (reviewIds.length === 0) return {};
  const { data, error } = await supabase
    .from('review_ip_log')
    .select('review_id, ip_address, created_at')
    .in('review_id', reviewIds);
  if (error || !data) return {};
  const map: Record<string, { ipAddress: string; createdAt: string }> = {};
  for (const row of data) {
    map[row.review_id] = { ipAddress: row.ip_address, createdAt: row.created_at };
  }
  return map;
}

export async function updateReviewVoteCounts(
  reviewId: string,
  helpfulCount: number,
  unhelpfulCount: number
): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .update({ helpful_count: helpfulCount, unhelpful_count: unhelpfulCount })
    .eq('id', reviewId);
  if (error) throw error;
}

const VISITOR_ID_KEY = 'kursotzyv_visitor_id';

function getOrCreateVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

// Records one real visit per browser per day, plus one raw pageview, via a
// same-origin API route (avoids ad blockers dropping a direct cross-origin
// call to *.supabase.co, which was undercounting real traffic). Best-effort
// — a logged-out visitor or network hiccup should never affect the page.
export async function recordSiteVisit(isHeartbeat = false): Promise<void> {
  try {
    const visitorId = getOrCreateVisitorId();
    await fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, heartbeat: isHeartbeat }),
    });
  } catch {
    // Ignore — this is a secondary signal, not something a visitor should ever see fail.
  }
}

export interface SiteStats {
  onlineNow: number;
  visitsLast24h: number;
  pageViewsLast24h: number;
  reviewsLast7Days: number;
}

// Real, unfaked numbers: unique visitors and raw pageviews in the trailing
// 24 hours (via SECURITY DEFINER RPCs so raw rows stay unreadable to anon),
// and reviews actually submitted in the last 7 days.
export async function fetchSiteStats(): Promise<SiteStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [onlineResult, visitsResult, pageViewsResult, reviewsResult] = await Promise.all([
    supabase.rpc('get_online_now'),
    supabase.rpc('get_visits_last_24h'),
    supabase.rpc('get_pageviews_last_24h'),
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('is_hidden', false)
      .gte('created_at', sevenDaysAgo),
  ]);

  return {
    onlineNow: Number(onlineResult.data ?? 0),
    visitsLast24h: Number(visitsResult.data ?? 0),
    pageViewsLast24h: Number(pageViewsResult.data ?? 0),
    reviewsLast7Days: reviewsResult.count ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Proof-of-enrollment submissions (earns the "verified" badge)
// ─────────────────────────────────────────────────────────────

export interface VerificationRequest {
  id: string;
  reviewId: string;
  teacherId: string;
  proofPath: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// Uploads the proof to a private bucket, then files a pending request.
// The file is never publicly readable — only the admin can open it, via a
// short-lived signed URL (see createProofSignedUrl).
export async function submitVerificationProof(
  reviewId: string,
  teacherId: string,
  file: File,
  note?: string
): Promise<void> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const proofPath = `${reviewId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('verification-proofs')
    .upload(proofPath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from('review_verifications').insert({
    id: `ver-${Date.now()}`,
    review_id: reviewId,
    teacher_id: teacherId,
    proof_path: proofPath,
    note: note?.trim() || null,
  });
  if (error) throw error;
}

// Admin-only: RLS returns nothing for anyone else.
export async function fetchPendingVerifications(): Promise<VerificationRequest[]> {
  const { data, error } = await supabase
    .from('review_verifications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    reviewId: row.review_id,
    teacherId: row.teacher_id,
    proofPath: row.proof_path,
    note: row.note ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function createProofSignedUrl(proofPath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('verification-proofs')
    .createSignedUrl(proofPath, 300);
  if (error || !data) return null;
  return data.signedUrl;
}

// Approving flips the review's existing is_verified flag — the badge the
// UI already renders — so the badge always traces back to a reviewed proof.
export async function decideVerification(
  requestId: string,
  reviewId: string,
  approve: boolean
): Promise<void> {
  const { error } = await supabase
    .from('review_verifications')
    .update({ status: approve ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;

  if (approve) {
    const { error: reviewError } = await supabase
      .from('reviews')
      .update({ proof_verified: true, is_verified: true })
      .eq('id', reviewId);
    if (reviewError) throw reviewError;
  }
}

// ─────────────────────────────────────────────────────────────
// Instructor responses / profile claims
// ─────────────────────────────────────────────────────────────

export interface TeacherResponse {
  id: string;
  teacherId: string;
  reviewId?: string;
  authorName: string;
  responseText: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

function mapResponseRow(row: any): TeacherResponse {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    reviewId: row.review_id ?? undefined,
    authorName: row.author_name,
    responseText: row.response_text,
    status: row.status,
    createdAt: row.created_at,
  };
}

// Contact email goes to a separate admin-only table so approved responses
// stay publicly readable without exposing it.
export async function submitTeacherResponse(input: {
  teacherId: string;
  reviewId?: string;
  authorName: string;
  contactEmail: string;
  responseText: string;
}): Promise<void> {
  const id = `resp-${Date.now()}`;

  const { error } = await supabase.from('teacher_responses').insert({
    id,
    teacher_id: input.teacherId,
    review_id: input.reviewId || null,
    author_name: input.authorName.trim(),
    response_text: input.responseText.trim(),
    status: 'pending',
  });
  if (error) throw error;

  const { error: contactError } = await supabase
    .from('teacher_response_contacts')
    .insert({ response_id: id, contact_email: input.contactEmail.trim() });
  if (contactError) throw contactError;
}

// Public: RLS limits this to approved rows for non-admins.
export async function fetchApprovedResponses(teacherId: string): Promise<TeacherResponse[]> {
  const { data, error } = await supabase
    .from('teacher_responses')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map(mapResponseRow);
}

export async function fetchPendingResponses(): Promise<TeacherResponse[]> {
  const { data, error } = await supabase
    .from('teacher_responses')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map(mapResponseRow);
}

export async function decideTeacherResponse(responseId: string, approve: boolean): Promise<void> {
  const { error } = await supabase
    .from('teacher_responses')
    .update({ status: approve ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', responseId);
  if (error) throw error;
}

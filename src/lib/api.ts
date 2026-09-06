import { supabase } from './supabaseClient';
import { Course, Review, Teacher } from '../types';
import { calculateTeacherMetrics } from '../data/teachers';

function mapReviewRow(row: any): Review {
  return {
    id: row.id,
    authorName: row.author_name,
    isAnonymous: row.is_anonymous,
    authorStatus: row.author_status,
    isVerified: row.is_verified,
    date: row.review_date,
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

function mapTeacherRow(row: any): Teacher {
  const reviews = (row.reviews ?? [])
    .map(mapReviewRow)
    .sort((a: Review, b: Review) => b.date.localeCompare(a.date));

  return calculateTeacherMetrics({
    id: row.id,
    name: row.name,
    bio: row.bio ?? undefined,
    academyName: row.academy_name ?? undefined,
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
export async function submitReview(
  teacherName: string,
  existingTeachers: Teacher[],
  reviewData: Omit<Review, 'id' | 'date' | 'helpfulCount' | 'unhelpfulCount'>,
  whatsappNumber?: string
): Promise<{ teacherId: string; review: Review; isNewTeacher: boolean; newTeacher?: Teacher }> {
  const normalized = teacherName.trim().toLowerCase();
  const existing = existingTeachers.find((t) => t.name.trim().toLowerCase() === normalized);

  let teacherId: string;
  let newTeacher: Teacher | undefined;
  let isNewTeacher = false;

  if (existing) {
    teacherId = existing.id;
  } else {
    const created = await insertTeacher({ name: teacherName.trim() });
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

  return { teacherId, review: mapReviewRow(data), isNewTeacher, newTeacher };
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

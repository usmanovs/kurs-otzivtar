import { Teacher, Review } from '../types';

export function calculateTeacherMetrics(
  teacherWithoutMetrics: Omit<Teacher, 'averageRating' | 'reviewCount' | 'recommendPercent' | 'teacherRatingAvg' | 'practiceRatingAvg' | 'jobSupportRatingAvg' | 'valueRatingAvg'>
): Teacher {
  const reviews = teacherWithoutMetrics.reviews;
  if (reviews.length === 0) {
    return {
      ...teacherWithoutMetrics,
      averageRating: 0,
      reviewCount: 0,
      recommendPercent: 0,
      teacherRatingAvg: 0,
      practiceRatingAvg: 0,
      jobSupportRatingAvg: 0,
      valueRatingAvg: 0,
    };
  }

  const reviewCount = reviews.length;
  // Sub-criteria are optional: a reviewer who only gave an overall score leaves
  // them at 0. Averaging those zeros in would invent a low score nobody gave,
  // so unrated reviews are excluded from the sub-averages rather than counted.
  const avg = (field: keyof Review) => {
    const rated = reviews.filter((r) => typeof r[field] === 'number' && (r[field] as number) > 0);
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, r) => acc + (r[field] as number), 0);
    return Number((sum / rated.length).toFixed(1));
  };

  const recommendCount = reviews.filter((r) => r.wouldRecommend).length;
  const recommendPercent = Math.round((recommendCount / reviewCount) * 100);

  return {
    ...teacherWithoutMetrics,
    averageRating: avg('overallRating'),
    reviewCount,
    recommendPercent,
    teacherRatingAvg: avg('teacherRating'),
    practiceRatingAvg: avg('practiceRating'),
    jobSupportRatingAvg: avg('jobSupportRating'),
    valueRatingAvg: avg('valueRating'),
  };
}

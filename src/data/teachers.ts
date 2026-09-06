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
  const avg = (field: keyof Review) => {
    const sum = reviews.reduce((acc, r) => acc + (typeof r[field] === 'number' ? (r[field] as number) : 0), 0);
    return Number((sum / reviewCount).toFixed(1));
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

const INITIAL_TEACHERS_RAW: Omit<Teacher, 'averageRating' | 'reviewCount' | 'recommendPercent' | 'teacherRatingAvg' | 'practiceRatingAvg' | 'jobSupportRatingAvg' | 'valueRatingAvg'>[] = [
  {
    id: 'teacher-barpiev-aziretali',
    name: 'Азиретали Барпиев',
    // Photo pulled from his own public YouTube channel avatar (youtube.com/@barpiev)
    photoUrl:
      'https://yt3.googleusercontent.com/_6C2OAmhRe3Yk-trOOuY4Kbs2PZrdULSMiKz860cxqZh7CVyurwIIaK8U_kUpM-yLD_hp2KfOss=s900-c-k-c0x00ffffff-no-rj',
    instagramUrl: 'https://www.instagram.com/barpievaziretali1/',
    youtubeUrl: 'https://www.youtube.com/@barpiev',
    reviews: [],
  },
  {
    id: 'teacher-kymbat-akylbekova',
    name: 'Кымбат Акылбекова',
    photoUrl: '/teachers/kymbat-akylbekova.webp',
    instagramUrl: 'https://www.instagram.com/KYMBAT_AKYLBEKOVA_/',
    reviews: [],
  },
  {
    id: 'teacher-alymkan-akylbekova',
    name: 'Алымкан Акылбекова',
    photoUrl: '/teachers/alymkan-akylbekova.webp',
    instagramUrl: 'https://www.instagram.com/alymkan_producer/',
    reviews: [],
  },
  {
    id: 'teacher-dinara-alieva',
    name: 'Динара Алиева',
    photoUrl: '/teachers/dinara-alieva.png',
    instagramUrl: 'https://www.instagram.com/dinara_demanbeg/',
    reviews: [],
  },
  {
    id: 'teacher-jumagul-alaychieva',
    name: 'Жумагул Алайчиева',
    photoUrl: '/teachers/jumagul-alaychieva.png',
    youtubeUrl: 'https://www.youtube.com/@jumagul_alaichieva',
    reviews: [],
  },
  {
    id: 'teacher-samara-keneshova',
    name: 'Самара Кеңешова',
    photoUrl: '/teachers/samara-keneshova.webp',
    instagramUrl: 'https://www.instagram.com/samara_keneshova_official/',
    reviews: [],
  },
];

export const INITIAL_TEACHERS: Teacher[] = INITIAL_TEACHERS_RAW.map((t) => calculateTeacherMetrics(t));

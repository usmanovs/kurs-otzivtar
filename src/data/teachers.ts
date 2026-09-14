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
  {
    id: 'teacher-yzatkan-jusupova',
    name: 'Ызаткан Жусупова',
    photoUrl: '/teachers/yzatkan-jusupova.webp',
    instagramUrl: 'https://www.instagram.com/yzatkan_jusupova/',
    reviews: [],
  },
  {
    id: 'teacher-aijan-ishenbek',
    name: 'Айжан Ишенбек кызы',
    photoUrl: '/teachers/aijan-ishenbek.webp',
    instagramUrl: 'https://www.instagram.com/aijan_ishenbek/',
    reviews: [],
  },
  {
    id: 'teacher-milana-mirlanova',
    name: 'Милана Мирланова',
    photoUrl: '/teachers/milana-mirlanova.png',
    instagramUrl: 'https://www.instagram.com/milana_mirlanovna/',
    reviews: [],
  },
  {
    id: 'teacher-nuraa-tuleeva',
    name: 'Нураа Тулеева',
    photoUrl: '/teachers/nuraa-tuleeva.png',
    instagramUrl: 'https://www.instagram.com/nuraa.tuleeva/',
    reviews: [],
  },
  {
    id: 'teacher-anara-akylbekova',
    name: 'Анара Акылбекова',
    photoUrl: '/teachers/anara-akylbekova.webp',
    instagramUrl: 'https://www.instagram.com/anara_akylbekovna_/',
    reviews: [],
  },
  {
    id: 'teacher-kunduz-tashtanova',
    name: 'Кундуз Таштанова',
    photoUrl: '/teachers/kunduz-tashtanova.webp',
    instagramUrl: 'https://www.instagram.com/kunduz_tashtanova/',
    reviews: [],
  },
  {
    id: 'teacher-asylgul-stamova',
    name: 'Асылгул Стамова',
    photoUrl: '/teachers/asylgul-stamova.png',
    instagramUrl: 'https://www.instagram.com/asylstamova/',
    reviews: [],
  },
  {
    id: 'teacher-talant-egemberdiev',
    name: 'Талант Эгембердиев',
    photoUrl: '/teachers/talant-egemberdiev.png',
    instagramUrl: 'https://www.instagram.com/talantegemberdiev/',
    reviews: [],
  },
  {
    id: 'teacher-aidai-sakyeva',
    name: 'Айдай Сакыева',
    photoUrl: '/teachers/aidai-sakyeva.webp',
    instagramUrl: 'https://www.instagram.com/aidai_sakyeva/',
    youtubeUrl: 'https://www.youtube.com/@aidaisakyeva',
    reviews: [],
  },
];

export const INITIAL_TEACHERS: Teacher[] = INITIAL_TEACHERS_RAW.map((t) => calculateTeacherMetrics(t));

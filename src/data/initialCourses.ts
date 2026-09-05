import { Course, Review } from '../types';

export function calculateCourseMetrics(courseWithoutMetrics: Omit<Course, 'averageRating' | 'reviewCount' | 'recommendPercent' | 'teacherRatingAvg' | 'practiceRatingAvg' | 'jobSupportRatingAvg' | 'valueRatingAvg'>): Course {
  const reviews = courseWithoutMetrics.reviews;
  if (reviews.length === 0) {
    return {
      ...courseWithoutMetrics,
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

  const recommendCount = reviews.filter(r => r.wouldRecommend).length;
  const recommendPercent = Math.round((recommendCount / reviewCount) * 100);

  const averageRating = avg('overallRating');
  const teacherRatingAvg = avg('teacherRating');
  const practiceRatingAvg = avg('practiceRating');
  const jobSupportRatingAvg = avg('jobSupportRating');
  const valueRatingAvg = avg('valueRating');

  // Auto-flag as warning course if rating <= 2.5 or if scam reports exist
  const hasMultipleWarnings = averageRating <= 2.6 || reviews.some(r => r.hasJobScamReport);

  return {
    ...courseWithoutMetrics,
    isWarningCourse: courseWithoutMetrics.isWarningCourse ?? hasMultipleWarnings,
    averageRating,
    reviewCount,
    recommendPercent,
    teacherRatingAvg,
    practiceRatingAvg,
    jobSupportRatingAvg,
    valueRatingAvg,
  };
}

export const INITIAL_COURSES_RAW: Omit<Course, 'averageRating' | 'reviewCount' | 'recommendPercent' | 'teacherRatingAvg' | 'practiceRatingAvg' | 'jobSupportRatingAvg' | 'valueRatingAvg'>[] = [
  {
    id: 'geeks-fullstack',
    name: 'Fullstack JavaScript & Python Web программалоо',
    academyName: 'Geeks IT Academy (Бишкек / Онлайн)',
    category: 'it_programming',
    format: 'hybrid',
    durationText: '7-9 ай',
    priceKGS: 68000,
    websiteOrInstagram: 'https://geeks.kg',
    description: 'Нөлдөн баштап толук кандуу веб-иштеп чыгуучу (Fullstack Developer) даярдоо курсу. Frontend (React) жана Backend (Python/Django же Node.js) камтылган. Практикалык тапшырмалар жана хакатондор уюштурулат.',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'crypto-mentorship-scam',
    name: 'EasyMoney: 1 айда крипто жана трейдингден $2000 табуу',
    academyName: 'Инфо-ментор Нурлан & Partners (Telegram / Instagram)',
    category: 'business_trading',
    format: 'online',
    durationText: '1 ай',
    priceKGS: 42000,
    websiteOrInstagram: 'https://instagram.com/scam_course_example',
    description: 'Инстаграмдагы жарнамалар: "Нөлдөн баштап крипто менен айына $2000 кирешеге чыгуу, VIP сигналдар жана 100% кепилдик берилет".',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'makers-bootcamp',
    name: 'Интенсивдүү Python / JavaScript Coding Bootcamp',
    academyName: 'Makers Bootcamp (Бишкек / Онлайн)',
    category: 'it_programming',
    format: 'hybrid',
    durationText: '3-6 ай',
    priceKGS: 75000,
    websiteOrInstagram: 'https://makers.kg',
    description: 'Америкалык форматтагы өтө күчтүү жана интенсивдүү IT-буткемп. Күн сайын 8-10 сааттан программалоо, дедлайндар, код-ревью жана карьералык машыктыруу.',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'smm-millionaire-course',
    name: 'SMM-Акула: Инстаграмдан айына 150 000 сом табуу',
    academyName: 'Блогер Айзада & ИнфоКурс KG',
    category: 'marketing_smm',
    format: 'online',
    durationText: '3 жума',
    priceKGS: 18000,
    websiteOrInstagram: 'https://instagram.com/smm_pro_fake_kg',
    description: 'Жарнамасы: "Таптакыр тажрыйбасы жок эле телефон аркылуу үйдө отуруп SMM менен 1000$ табуу, кардар табуунун сырлары".',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'codify-lab',
    name: 'UI/UX Дизайн жана Продукт Дизайны',
    academyName: 'Codify Lab (Бишкек / Онлайн)',
    category: 'design_uiux',
    format: 'hybrid',
    durationText: '4-6 ай',
    priceKGS: 45000,
    websiteOrInstagram: 'https://codifylab.com',
    description: 'Figma, колдонуучулардын жүрүм-турумун изилдөө (UX Research), мобилдик тиркемелердин жана веб-сайттардын дизайнын нөлдөн баштап жасоо. Реалдуу стартап долбоорлору менен иштөө.',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'oxford-team-english',
    name: 'Интенсивдүү Сүйлөшүү Англис Тили & IELTS Даярдык',
    academyName: 'Oxford Team Kyrgyzstan (Бишкек / Онлайн)',
    category: 'languages',
    format: 'hybrid',
    durationText: '3-6 ай',
    priceKGS: 16000,
    websiteOrInstagram: 'https://oxfordteam.kg',
    description: 'Англис тилин сүйлөшүү аркылуу бат өздөштүрүү, Speaking Club, Native Speaker мугалимдери жана эл аралык IELTS сынагына сапаттуу даярдоо.',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'dropship-amazon-fraud',
    name: 'Amazon & Kaspi Дропшиппинг: 2 жумада 3000$ накталай',
    academyName: 'E-com Academy KG (Telegram / Кафе формат)',
    category: 'business_trading',
    format: 'online',
    durationText: '2 жума',
    priceKGS: 50000,
    websiteOrInstagram: 'https://instagram.com/amazon_profit_kg_fake',
    description: 'Жарнамасы: "Amazon жана Kaspi аркылуу товарсыз бизнес баштоо, товар жеткирүү сырлары жана 100% кепилденген киреше".',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'salymbekov-datacamp',
    name: 'Маалымат Талдоочусу (Data Analytics & Python / SQL)',
    academyName: 'Salymbekov University IT & Data Hub',
    category: 'data_analytics',
    format: 'hybrid',
    durationText: '6 ай',
    priceKGS: 48000,
    websiteOrInstagram: 'https://salymbekov.kg',
    description: 'Бизнес үчүн чоң көлөмдөгү маалыматтар менен иштөө, SQL суроо-талаптары, Python (Pandas, NumPy), PowerBI жана Tableau аркылуу дашборддорду куруу.',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'secom-ort-prep',
    name: 'Жалпы Республикалык Тестирлөөгө (ЖРТ / ОРТ) Онлайн Даярдык',
    academyName: 'Секом (Secom) Билим Берүү Борбору',
    category: 'ort_school',
    format: 'online',
    durationText: '9 ай',
    priceKGS: 24000,
    websiteOrInstagram: 'https://secom.kg',
    description: 'Кыргызстандын бардык аймактарындагы бүтүрүүчүлөр үчүн ЖРТнын негизги жана предметтик тесттерине толук кандуу онлайн даярдоо курсу. Алтын сертификатка жетүү стратегиялары.',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'fast-frontend-scam',
    name: 'IT Гений: 14 күндө веб-программист болуу',
    academyName: 'Онлайн Мектеп "ProCoder KG" (VK / Telegram)',
    category: 'it_programming',
    format: 'online',
    durationText: '2 жума',
    priceKGS: 25000,
    websiteOrInstagram: '',
    description: 'Жарнамасы: "14 күндүн ичинде HTML, CSS, JavaScript өздөштүрүп, айына 1000$ жумушка орношуу кепилдиги бар".',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'mental-health-hub-psychology',
    name: 'Практикалык Психология жана Консультация Негиздери',
    academyName: 'Mental Health Hub KG (Бишкек / Онлайн)',
    category: 'psychology',
    format: 'hybrid',
    durationText: '4-5 ай',
    priceKGS: 38000,
    websiteOrInstagram: 'https://instagram.com/mentalhealthhub.kg',
    description: 'Психологиянын негиздери, консультация берүү техникасы жана эмоционалдык интеллект боюнча практикалык курс. Сертификатталган психологдор сабак өтөт, топтук супервизия жана кейс-практика камтылган.',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'geekbrains-python',
    name: 'Python Developer',
    academyName: 'GeekBrains (Россия/ТМД онлайн платформасы, Кыргызстанга жеткиликтүү)',
    category: 'it_programming',
    format: 'online',
    durationText: '10 ай',
    priceKGS: 1700,
    websiteOrInstagram: 'https://geekbrains.kg/courses/',
    description: 'GeekBrains — Россиядан башталып, азыр Кыргызстанга багытталган өзүнчө баракчасы бар ири ТМД онлайн-билим берүү платформасы, жергиликтүү Бишкектеги академия эмес. Толугу менен онлайн окутат, видеоматериалдарга мөөнөтсүз мүмкүнчүлүк берет. Баасы 1700 сом/айдан башталат (расмий сайтка ылайык, толук курс баасы эмес — айлык төлөм).',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'skillbox-programming',
    name: 'Программалоо курстары (Python, JavaScript, Frontend ж.б.)',
    academyName: 'Skillbox (ТМД онлайн платформасы, Кыргызстан баракчасы)',
    category: 'it_programming',
    format: 'online',
    durationText: '2-13 ай (программага жараша)',
    priceKGS: undefined,
    websiteOrInstagram: 'https://skillbox.kg/ru/courses/programming/',
    description: 'Skillbox — Кыргызстан үчүн өзүнчө баракчасы бар ири ТМД онлайн-платформасы (жергиликтүү академия эмес). Программалар 2 айлык кыска курстардан 13 айлык кесипкөй программаларга чейин ар түрдүү. Расмий сайтта так баа көрсөтүлгөн эмес, бөлүп төлөө сунушталат — сатып алуудан мурун так суммасын администрация менен тактап алыңыз.',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'knewit-programming',
    name: 'Программалоо курстары (Front-End, Back-End, Python Django ж.б.)',
    academyName: 'KnewIT School (Казакстан — Алматы/Астана, онлайн Кыргызстандан да жеткиликтүү)',
    category: 'it_programming',
    format: 'online',
    durationText: '3-6 ай',
    priceKGS: undefined,
    websiteOrInstagram: 'https://knewit.kz/',
    description: '⚠️ Маанилүү: KnewIT негизинен Казакстандагы мектеп (офлайн сабактар Алматы жана Астанада өтөт, финансылоо казак банктары аркылуу). Кыргызстандан студенттер онлайн форматта гана кошула алат. Так баасы сайтта жарыяланган эмес.',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'beeline-it-courses',
    name: 'IT курстары (программалоонун негиздери, UI/UX, Frontend/Backend)',
    academyName: 'Beeline Кыргызстан',
    category: 'it_programming',
    format: 'online',
    durationText: 'Программага жараша ар түрдүү',
    priceKGS: undefined,
    websiteOrInstagram: 'https://beeline.kg/ru/it-courses',
    description: 'Beeline мобилдик оператору тарабынан сунушталган IT курстары: программалоонун негиздери, UI/UX дизайн, backend, frontend жана компьютердик сабаттуулук. Расмий баракчадан так мөөнөт жана баа маалыматын алуу мүмкүн болгон жок — тизмелөө учурунда жеткиликтүү болгон жалпы багыттарга негизделген.',
    isWarningCourse: false,
    reviews: []
  },
  {
    id: 'skillfactory-it-specialist',
    name: 'IT-специализация (Тест-драйв + адистик тандоо)',
    academyName: 'SkillFactory (Орусиядан онлайн платформа)',
    category: 'it_programming',
    format: 'online',
    durationText: '2 ай (тест-драйв) + адистик боюнча кошумча',
    priceKGS: undefined,
    websiteOrInstagram: 'https://skillfactory.kz/it-specialist',
    description: 'Россиялык SkillFactory платформасынын Кыргызстан/Казакстан аудиториясына багытталган курсу. 2 айлык "тест-драйв" мезгилинде 8 IT багытын (Python, frontend, QA, Data Science, кибер коопсуздук ж.б.) байкап көрүүгө болот, андан кийин тандалган адистик боюнча окуу уланат. Баасы расмий сайтта орус рублинде көрсөтүлгөн (айына 4300 рубльден башталат, 36 айлык бөлүп төлөө менен) — сомго так конвертация жок, төлөм жасаардан мурун так курсту тактап алыңыз.',
    isWarningCourse: false,
    reviews: []
  }
];

export const INITIAL_COURSES: Course[] = INITIAL_COURSES_RAW.map(c => calculateCourseMetrics(c));

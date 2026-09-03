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
    reviews: [
      {
        id: 'rev-g1',
        courseId: 'geeks-fullstack',
        authorName: 'Азамат Темиров',
        authorStatus: 'graduate',
        isVerified: true,
        date: '2024-11-12',
        overallRating: 5,
        teacherRating: 5,
        practiceRating: 5,
        jobSupportRating: 4,
        valueRating: 4,
        wouldRecommend: true,
        pricePaidKGS: 65000,
        durationMonths: 8,
        cohortYear: '2024',
        title: 'Чыныгы билим берет, бирок өзүңүздөн чоң аракет керек',
        fullReview: 'Мен IT тармагына такыр түшүнбөй келгем. Менторлор абдан чыдамкай жана теманы терең түшүндүрүшөт. Тапшырмалары оор, уйкусуз түндөр көп болду. Бирок курсту бүткөндөн кийин портфолиомдо 3 чоң коммерциялык деңгээлдеги долбоор пайда болду. Карьера борбору резюме түзүүгө жана маектешүүлөргө жакшы даярдады. 2 айдан кийин стажировка таптым.',
        pros: [
          'Тажрыйбалуу менторлор күнү-түнү суроолорго жооп берет',
          'Практикалык жана реалдуу долбоорлор',
          'Коворкингге каалаган убакта барып иштөө мүмкүнчүлүгү'
        ],
        cons: [
          'Үй тапшырмалары өтө көп, иштеп жатып окугандар жетишпей калат',
          'Төлөмү бир аз кымбатыраак'
        ],
        adviceForNewcomers: 'Эгер күнүнө 4-5 саат убакыт бөлө албасаңыз, баштабай турганыңыз оң. Сыйкыр жок, өзүң окуп мээнет кылышың керек.',
        hasJobScamReport: false,
        helpfulCount: 42,
        unhelpfulCount: 2
      },
      {
        id: 'rev-g2',
        courseId: 'geeks-fullstack',
        authorName: 'Айпери Исакова',
        authorStatus: 'graduate',
        isVerified: true,
        date: '2024-08-20',
        overallRating: 4,
        teacherRating: 4,
        practiceRating: 4,
        jobSupportRating: 3,
        valueRating: 4,
        wouldRecommend: true,
        pricePaidKGS: 68000,
        durationMonths: 9,
        cohortYear: '2024',
        title: 'Жакшы база берет, бирок жумушка 100% орноштуруп коёт деп ойлобоңуз',
        fullReview: 'Программалоонун базасын жана логикасын жакшы үйрөтүштү. Бирок кээ бир жаңы менторлордун тажрыйбасы аз экени байкалат. Жумуш табуу боюнча компанияларга сунушташат, бирок акыры баары бир өзүңүздүн билимиңизден көз каранды.',
        pros: [
          'IT чөйрөсү жана жакшы пикирлеш достор',
          'Git жана командалык иштөө көндүмдөрү'
        ],
        cons: [
          'Кээде группалардагы студент саны 18ге чейин жетип, баарына көңүл буруу кыйындайт'
        ],
        adviceForNewcomers: 'Англис тилиңизди курска чейин сөзсүз A2-B1 деңгээлге чыгарып алыңыз.',
        hasJobScamReport: false,
        helpfulCount: 19,
        unhelpfulCount: 1
      }
    ]
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
    isWarningCourse: true,
    warningNotice: '⚠️ СТУДЕНТТЕРДИН ЭСКЕРТҮҮСҮ: Жалган убадалар, төлөмдү кайтарып бербөө жана интернеттеги бекер маалыматтарды көчүрүп сатуу боюнча даттануулар катталган!',
    reviews: [
      {
        id: 'rev-cr1',
        courseId: 'crypto-mentorship-scam',
        authorName: 'Бектур Касымов',
        authorStatus: 'dropped_out',
        isVerified: true,
        date: '2025-01-14',
        overallRating: 1,
        teacherRating: 1,
        practiceRating: 1,
        jobSupportRating: 1,
        valueRating: 1,
        wouldRecommend: false,
        pricePaidKGS: 42000,
        durationMonths: 1,
        cohortYear: '2024-декабрь',
        title: 'ШЕКТҮҮ ЖАНА ПАЙДАСЫЗ КУРС! Акчаңызды коротпоңуз!',
        fullReview: 'Инстаграмдан жарнамасын көрүп, "1 айда кирешеңди 3 эсеге көбөйтөбүз" деген сөздөрүнө ишенип 42 000 сом төлөгөм. Жыйынтыгында YouTube\'дагы эски бекер видеолорду Telegram каналга шилтеме кылып таштап коюшту. Эч кандай жеке менторлук жок! Суроо берсең "өзүң изденбейсиңби" деп орой жооп беришет. Мен берген сигналдары боюнча депозтимди уттуруп жибердим. Акчамды кайтарып берүүнү сурансам, чаттан блокко салып салышты!',
        pros: ['Эч кандай артыкчылыгы жок, таза алдамчылык'],
        cons: [
          'YouTube\'дан бекер тапса боло турган 5 мүнөттүк видеолор',
          'Акчаны кайтаруудан орой түрдө баш тартышат жана кара тизмеге салышат',
          'Сигналдары туура эмес, акчамды жоготтум',
          'Убада кылынган кирешенин 1% да жок'
        ],
        adviceForNewcomers: 'Крипто боюнча 1 айда миллионер болосуң дегендердин баары жалганчылар. Курстун авторунун лицензиясы да жок.',
        hasJobScamReport: true,
        helpfulCount: 78,
        unhelpfulCount: 0
      },
      {
        id: 'rev-cr2',
        courseId: 'crypto-mentorship-scam',
        authorName: 'Чынара С.',
        authorStatus: 'dropped_out',
        isVerified: false,
        date: '2025-01-28',
        overallRating: 1,
        teacherRating: 1,
        practiceRating: 1,
        jobSupportRating: 1,
        valueRating: 1,
        wouldRecommend: false,
        pricePaidKGS: 35000,
        durationMonths: 1,
        cohortYear: '2025',
        title: 'Курстун мазмуну 0. Жөн эле маркетинг тузагы',
        fullReview: 'Бир ай бою жеке сабак болот дешкен. Бирок жумасына бир эле жолу 20 мүнөт эфирге чыгып, суроолорго жооп бербей качып кетишет. Мен катышкан 40 кишиден бирөө да акча тапкан жок. Элдерди алдап акчасын алып жүрүшөт.',
        pros: [],
        cons: [
          'Эч кандай келишим же чек беришпейт',
          'Суроолорду көз жаздымда калтырышат',
          'Жалган сын-пикирлер менен элди алдашат'
        ],
        adviceForNewcomers: 'Эч качан Instagram/Telegram аркылуу келишим түзбөй туруп карточкага акча которбогула!',
        hasJobScamReport: true,
        helpfulCount: 54,
        unhelpfulCount: 1
      }
    ]
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
    reviews: [
      {
        id: 'rev-m1',
        courseId: 'makers-bootcamp',
        authorName: 'Эркин Маматов',
        authorStatus: 'graduate',
        isVerified: true,
        date: '2024-10-05',
        overallRating: 5,
        teacherRating: 5,
        practiceRating: 5,
        jobSupportRating: 5,
        valueRating: 4,
        wouldRecommend: true,
        pricePaidKGS: 72000,
        durationMonths: 4,
        cohortYear: '2024',
        title: 'Өтө оор буткемп, бирок чындыгында программист кылып чыгарат',
        fullReview: 'Эгер жалкоо болсоңуз, Makers сизге туура келбейт. Күнүнө эртең мененки 9дан кечки 7ге чейин тынымсыз код жазасың. Менторлор каталарыңды катуу сындайт, бирок бул реалдуу өсүүгө алып келет. Буткемп бүткөндөн кийин 1 айда жергиликтүү банкка Junior Backend Developer болуп жумушка кирдим. Төлөгөн акчам 3 айда толугу менен акталды.',
        pros: [
          'Реалдуу буткемп тартиби жана темирдей дисциплина',
          'Күчтүү менторлор жана күн сайын код ревью',
          'Карьералык борбору резюмеңди жана портфолиоңду идеалдуу кылат'
        ],
        cons: [
          'Баасы базардагы орточо баадан кымбат',
          'Эс алууга убакыт калбайт, үй-бүлөлүүлөргө оор болушу мүмкүн'
        ],
        adviceForNewcomers: 'Буткемп башталганга чейин жок дегенде Python негиздерин өз алдынча окуп келиңиз.',
        hasJobScamReport: false,
        helpfulCount: 63,
        unhelpfulCount: 3
      },
      {
        id: 'rev-m2',
        courseId: 'makers-bootcamp',
        authorName: 'Нурбек Турсунов',
        authorStatus: 'graduate',
        isVerified: true,
        date: '2024-06-18',
        overallRating: 4,
        teacherRating: 4,
        practiceRating: 5,
        jobSupportRating: 4,
        valueRating: 4,
        wouldRecommend: true,
        pricePaidKGS: 70000,
        durationMonths: 4,
        cohortYear: '2024',
        title: 'Темп абдан жогору, артта калсаң кууп жетиш кыйын',
        fullReview: 'Материалдары мыкты түзүлгөн. Эгер бир жума ооруп калсаң же сабакты калтырсаң, группадан артта калып кетесиң. Ошондуктан башка иштериңизди токтотуп гана окуу керек. Жыйынтыгына абдан ыраазымын.',
        pros: ['Күчтүү программа', 'Чыныгы коммерциялык стек'],
        cons: ['Жогорку стресс деңгээли'],
        adviceForNewcomers: 'Ден-соолугуңузду жана уйкуңузду сактаңыз.',
        hasJobScamReport: false,
        helpfulCount: 22,
        unhelpfulCount: 1
      }
    ]
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
    isWarningCourse: true,
    warningNotice: '⚠️ СТУДЕНТТЕРДИН ДАТТАНУУСУ: Жалпы белгилүү маалыматтар, кураторлордун жооп бербеши жана кардар табуу убадасынын аткарылбашы.',
    reviews: [
      {
        id: 'rev-smm1',
        courseId: 'smm-millionaire-course',
        authorName: 'Асел Жаныбекова',
        authorStatus: 'graduate',
        isVerified: true,
        date: '2024-12-02',
        overallRating: 2,
        teacherRating: 2,
        practiceRating: 1,
        jobSupportRating: 1,
        valueRating: 1,
        wouldRecommend: false,
        pricePaidKGS: 18000,
        durationMonths: 1,
        cohortYear: '2024-ноябрь',
        title: 'Жарнамасы кооз, бирок ичи көңдөй суу',
        fullReview: 'Инстаграмдагы стористеринде ар бир бүтүрүүчү 50 000 сом таап жатат деп мактанышкан. Сатып алгандан кийин Canva\'да пост жасоону жана хэштег коюуну гана үйрөтүштү. Аны каалаган адам бекер эле 10 мүнөттө үйрөнүп алат. "Кардар таап беребиз" дегени жалган, жөн гана башка магазиндерге спам кат жазууну тапшырма кылып беришти. Акчама абдан өкүндүм.',
        pros: ['Чаттагы башка кыздар менен тааныштым'],
        cons: [
          'Таргетинг жана аналитика такыр жок',
          'Кураторлор аудио билдирүү менен 3 күндөн кийин араң жооп беришет',
          'Баасына такыр татыбайт'
        ],
        adviceForNewcomers: 'Блогерлердин "тез байып кетесиң" деген курстарына ишенбеңиз. YouTube\'дагы расмий Meta курстарын көрүңүз.',
        hasJobScamReport: true,
        helpfulCount: 65,
        unhelpfulCount: 2
      },
      {
        id: 'rev-smm2',
        courseId: 'smm-millionaire-course',
        authorName: 'Мадина Осмонова',
        authorStatus: 'dropped_out',
        isVerified: false,
        date: '2024-11-20',
        overallRating: 1,
        teacherRating: 1,
        practiceRating: 2,
        jobSupportRating: 1,
        valueRating: 1,
        wouldRecommend: false,
        pricePaidKGS: 15000,
        durationMonths: 1,
        cohortYear: '2024',
        title: 'Убадалардын бири да аткарылбайт',
        fullReview: 'Курстун 3-күнүндө эле акчага татыбай турганын түшүнүп, келишим боюнча акчамдын жарымын кайтарып берүүнү сурандым. Менеджерлери чалып алып коркутуп, "сен жалкоосуң" деп күнөөлөштү. Таза инфоцыгандык.',
        pros: [],
        cons: ['Орой менеджерлер', 'Пайдасыз лекциялар', 'Төлөм кайтарылбайт'],
        adviceForNewcomers: 'Эч качан алдын ала толук төлөбөгүлө.',
        hasJobScamReport: true,
        helpfulCount: 41,
        unhelpfulCount: 0
      }
    ]
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
    reviews: [
      {
        id: 'rev-c1',
        courseId: 'codify-lab',
        authorName: 'Гүлнур Бакирова',
        authorStatus: 'graduate',
        isVerified: true,
        date: '2024-11-28',
        overallRating: 5,
        teacherRating: 5,
        practiceRating: 4,
        jobSupportRating: 4,
        valueRating: 5,
        wouldRecommend: true,
        pricePaidKGS: 42000,
        durationMonths: 5,
        cohortYear: '2024',
        title: 'Дизайнга жаңы келгендер үчүн эң туура тандоо',
        fullReview: 'Codify\'дагы окутуу мага аябай жакты. Жөн гана Figma\'дагы баскычтарды эмес, дизайндын философиясын, адамдардын психологиясын, түстөрдүн гармониясын үйрөтүштү. Ментор Динара ар бир үй тапшырманы майда-чүйдөсүнө чейин талдап чыкчу. Бүткөндөн кийин Behance\'те портфолио түзүп, азыр фриланста чет өлкөлүк кардарлар менен иштеп жатам.',
        pros: [
          'Figma жана Design System терең үйрөтүлөт',
          'Көптөгөн пайдалуу воркшоптор жана мастер-класстар',
          'Жылуу жана достук мамиледеги жамаат'
        ],
        cons: [
          'UX изилдөөлөр боюнча лекциялар бир аз көбүрөөк болсо жакшы болмок'
        ],
        adviceForNewcomers: 'Күн сайын Dribbble жана Mobbin карап, визуалдык табитиңизди өстүрүңүз.',
        hasJobScamReport: false,
        helpfulCount: 38,
        unhelpfulCount: 1
      },
      {
        id: 'rev-c2',
        courseId: 'codify-lab',
        authorName: 'Таалай Ж.',
        authorStatus: 'current_student',
        isVerified: true,
        date: '2025-01-08',
        overallRating: 4,
        teacherRating: 4,
        practiceRating: 5,
        jobSupportRating: 3,
        valueRating: 4,
        wouldRecommend: true,
        pricePaidKGS: 45000,
        durationMonths: 5,
        cohortYear: '2024-2025',
        title: 'Практикасы сонун, сабактар интерактивдүү өтөт',
        fullReview: 'Азыр 4-айда окуп жатам. Теория аз, дароо практикага өтүшөт. Менторлор өз ишинин устаттары. Жалгыз кемчилиги - онлайн катышкандар үчүн интернет үзгүлтүксүз болушу шарт.',
        pros: ['Кесипкөй менторлор', 'Кызыктуу реалдуу кейстер'],
        cons: ['Катуу дедлайндар'],
        adviceForNewcomers: 'Компьютериңиз Figma программасын жакшы тарткыдай болсун.',
        hasJobScamReport: false,
        helpfulCount: 15,
        unhelpfulCount: 0
      }
    ]
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
    reviews: [
      {
        id: 'rev-o1',
        courseId: 'oxford-team-english',
        authorName: 'Канат Алымов',
        authorStatus: 'graduate',
        isVerified: true,
        date: '2024-09-15',
        overallRating: 5,
        teacherRating: 5,
        practiceRating: 5,
        jobSupportRating: 4,
        valueRating: 5,
        wouldRecommend: true,
        pricePaidKGS: 15000,
        durationMonths: 4,
        cohortYear: '2024',
        title: 'Тил тосмосун (language barrier) бузууга абдан жардам берди',
        fullReview: 'Мектептен бери грамматиканы билсем дагы сүйлөй алчу эмесмин. Oxford Team\'де сабактардын 80% сүйлөшүүгө арналган. Апта сайын өтүүчү Speaking Club абдан кызыктуу. Мугалимдер ката кетирүүдөн коркпоого үйрөтөт. Курсту бүткөндөн кийин IELTS тапшырып 7.0 балл алдым!',
        pros: [
          'Табигый сүйлөшүү чөйрөсү',
          'Америка жана Британиядан келген волонтерлор менен баарлашуу',
          'Ыңгайлуу сабак графиги'
        ],
        cons: ['Кээде онлайн платформасында техникалык мүчүлүштүктөр болот'],
        adviceForNewcomers: 'Күн сайын англисче подкаст угуп, өзүңүз менен англисче сүйлөшүңүз.',
        hasJobScamReport: false,
        helpfulCount: 47,
        unhelpfulCount: 1
      }
    ]
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
    isWarningCourse: true,
    warningNotice: '⚠️ ЭСКЕРТҮҮ: Башкалардын товардык белгилерин бузуу, аккаунттардын блокко кетиши жана төлөмдү кайтарып бербөө жөнүндө бир нече даттануулар түшкөн.',
    reviews: [
      {
        id: 'rev-dr1',
        courseId: 'dropship-amazon-fraud',
        authorName: 'Нурсултан И.',
        authorStatus: 'dropped_out',
        isVerified: true,
        date: '2025-02-03',
        overallRating: 1,
        teacherRating: 1,
        practiceRating: 1,
        jobSupportRating: 1,
        valueRating: 1,
        wouldRecommend: false,
        pricePaidKGS: 50000,
        durationMonths: 1,
        cohortYear: '2025',
        title: '50 000 сомго жөн гана блокировкага кеткен аккаунт алдым',
        fullReview: 'Amazon\'до аккаунт ачып беребиз дешкен. Төлөм алгандан кийин Казакстандан сатып алынган эски ыкмаларды көрсөтүштү. Amazon биринчи күндө эле менин аккаунтумду спам жана мыйзамсыз дропшиппинг үчүн өмүр бою блокировка кылды! Курстун уюштуруучусунан сурасам, "өзүң туура эмес баскычты басып алгансың" деп мени күнөөлөп чаттан чыгарып салды. Эч кандай келишим түзүшкөн эмес, акчам күйүп кетти.',
        pros: [],
        cons: [
          'Мыйзамсыз жана кооптуу ыкмаларды үйрөтүшөт',
          'Amazon саясатына каршы келет',
          'Акчаны кайтарбайт, жоопкерчиликтен качат'
        ],
        adviceForNewcomers: 'Amazon эч качан Кыргызстандан мыйзамсыз дропшиппингге уруксат бербейт. Аларга ишенбеңиз!',
        hasJobScamReport: true,
        helpfulCount: 71,
        unhelpfulCount: 1
      }
    ]
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
    reviews: [
      {
        id: 'rev-s1',
        courseId: 'salymbekov-datacamp',
        authorName: 'Мирлан Сатыбалдиев',
        authorStatus: 'graduate',
        isVerified: true,
        date: '2024-12-19',
        overallRating: 5,
        teacherRating: 5,
        practiceRating: 5,
        jobSupportRating: 4,
        valueRating: 5,
        wouldRecommend: true,
        pricePaidKGS: 46000,
        durationMonths: 6,
        cohortYear: '2024',
        title: 'Банкта жана финтехте иштегиси келгендерге эң туура багыт',
        fullReview: 'Математика жана логикасы бар адамдар үчүн Data Analytics азыр абдан актуалдуу. Салымбеков борборундагы программа өтө олуттуу түзүлгөн. Бизнес кейстерди, сатуу маалыматтарын талдоону үйрөндүк. Окутуучулар практикадагы аналитиктер болгондуктан көптөгөн чыныгы мисалдарды көрсөтүштү.',
        pros: [
          'Түшүнүктүү жана системалуу түшүндүрмө',
          'Power BI жана SQL боюнча сапаттуу даярдык',
          'Университеттин расмий сертификаты берилет'
        ],
        cons: ['Математикалык ой жүгүртүү талап кылынат, оңой эмес'],
        adviceForNewcomers: 'Excel программасын жакшылап өздөштүрүп алсаңыз, үйрөнүү жеңил болот.',
        hasJobScamReport: false,
        helpfulCount: 29,
        unhelpfulCount: 0
      }
    ]
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
    reviews: [
      {
        id: 'rev-sec1',
        courseId: 'secom-ort-prep',
        authorName: 'Динара Момунова',
        authorStatus: 'graduate',
        isVerified: true,
        date: '2024-07-10',
        overallRating: 5,
        teacherRating: 5,
        practiceRating: 5,
        jobSupportRating: 4,
        valueRating: 5,
        wouldRecommend: true,
        pricePaidKGS: 22000,
        durationMonths: 9,
        cohortYear: '2024',
        title: 'ЖРТдан 214 балл алуума чоң салым кошту',
        fullReview: 'Аймакта жашагандыктан Бишкекке келип окуй алган эмесмин. Секомдун онлайн курсуна жазылдым. Күн сайын тесттерди талдоо, эрежелерди жөнөкөй тил менен түшүндүрүү абдан жардам берди. Мугалимдерибиз эжелер-агайлар абдан жакшы. Бюджетке окууга өттүм!',
        pros: [
          'Тесттик көнүгүүлөрдүн базасы абдан бай',
          'Апта сайын реалдуу сыноо тесттери',
          'Аймактагы окуучулар үчүн чоң мүмкүнчүлүк'
        ],
        cons: ['Үй тапшырмалары көп, күн сайын аткаруу керек'],
        adviceForNewcomers: 'ЖРТны 10-класстан баштап даярданыңыз, 11-класста кеч болуп калышы мүмкүн.',
        hasJobScamReport: false,
        helpfulCount: 52,
        unhelpfulCount: 1
      }
    ]
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
    isWarningCourse: true,
    warningNotice: '⚠️ ЭСКЕРТҮҮ: 14 күндө веб-программист болуу мүмкүн эмес. Жалган убадалар жана интернеттен көчүрүлгөн лекциялар катталган.',
    reviews: [
      {
        id: 'rev-ff1',
        courseId: 'fast-frontend-scam',
        authorName: 'Улан Жалилов',
        authorStatus: 'dropped_out',
        isVerified: true,
        date: '2025-01-18',
        overallRating: 1,
        teacherRating: 1,
        practiceRating: 1,
        jobSupportRating: 1,
        valueRating: 1,
        wouldRecommend: false,
        pricePaidKGS: 25000,
        durationMonths: 1,
        cohortYear: '2025',
        title: '14 күндө программист болосуң дегенге кантип ишендим билбейм',
        fullReview: 'Чоң жарнамасына алданып калдым. Болгону 14 сабак беришти, анын ичинде жөнөкөй баракты жасоодон башка эч нерсе жок. 2 жумадан кийин "сиз курсту бүтүрдүңүз" деп жасалма сертификат берип коюшту. Кайдагы жумуш? Бир да IT компания мындай сертификатты кабыл албайт. Акчамды сурасам тоготпой коюшту. Башкалар алданбасын деп жазып жатам.',
        pros: [],
        cons: [
          '14 күндө эч ким программист боло албайт, ачык калп',
          'Тапшырмалар текшерилбейт',
          'Жумушка орноштуруу убадасы жалган'
        ],
        adviceForNewcomers: 'IT\'ни үйрөнүү үчүн кеминде 6-9 ай талыкпаган мээнет керек. Мындай 2 жумалык курстардан качыңыздар!',
        hasJobScamReport: true,
        helpfulCount: 89,
        unhelpfulCount: 0
      }
    ]
  }
];

export const INITIAL_COURSES: Course[] = INITIAL_COURSES_RAW.map(c => calculateCourseMetrics(c));

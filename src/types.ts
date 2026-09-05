export type CourseCategory =
  | 'all'
  | 'it_programming'
  | 'design_uiux'
  | 'languages'
  | 'marketing_smm'
  | 'business_trading'
  | 'data_analytics'
  | 'psychology'
  | 'beauty_cosmetology'
  | 'driving_school'
  | 'cooking_culinary'
  | 'finance_accounting'
  | 'kids_development'
  | 'arts_music'
  | 'ort_school';

export type CourseFormat = 'online' | 'offline' | 'hybrid';

export type StudentStatus =
  | 'graduate' // Бүтүрүүчү
  | 'current_student' // Азыр окуп жатат
  | 'dropped_out'; // Курсту таштап кеткен

export interface Review {
  id: string;
  courseId: string;
  teacherName?: string;
  authorName: string;
  isAnonymous?: boolean;
  authorStatus: StudentStatus;
  isVerified: boolean;
  date: string;
  overallRating: number; // 1 to 5
  teacherRating: number; // 1 to 5
  practiceRating: number; // 1 to 5
  jobSupportRating: number; // 1 to 5
  valueRating: number; // 1 to 5
  wouldRecommend: boolean;
  pricePaidKGS?: number;
  durationMonths?: number;
  cohortYear?: string;
  title: string;
  fullReview: string;
  pros: string[];
  cons: string[];
  adviceForNewcomers?: string;
  hasJobScamReport?: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  userVoted?: 'helpful' | 'unhelpful';
}

export interface Course {
  id: string;
  name: string;
  academyName: string;
  category: CourseCategory;
  format: CourseFormat;
  durationText: string;
  priceKGS: number;
  websiteOrInstagram?: string;
  description: string;
  isWarningCourse?: boolean;
  warningNotice?: string;
  reviews: Review[];
  // Calculated metrics
  averageRating: number;
  reviewCount: number;
  recommendPercent: number;
  teacherRatingAvg: number;
  practiceRatingAvg: number;
  jobSupportRatingAvg: number;
  valueRatingAvg: number;
}

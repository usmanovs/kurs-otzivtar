import { CourseCategory } from '../types';

// Sub-niches a teacher can be tagged with, grouped by their parent category.
// Kept as a curated list rather than free text so the same niche doesn't end
// up spelled three different ways ("Wildberries" / "вайлдберриз" / "WB").
export const SUBNICHES_BY_CATEGORY: Partial<Record<CourseCategory, string[]>> = {
  marketing_smm: ['target', 'smm_management', 'copywriting', 'reels', 'content_making', 'personal_brand'],
  business_trading: ['wildberries', 'ozon', 'dropshipping', 'marketplaces', 'trading', 'crypto', 'forex'],
  youtube: ['youtube_monetization', 'youtube_content'],
  it_programming: ['frontend', 'backend', 'mobile_dev', 'qa_testing', 'no_code'],
  design_uiux: ['ui_ux', 'graphic_design', 'motion_design', 'interior_design'],
  data_analytics: ['data_analysis', 'excel_sheets', 'power_bi'],
  languages: ['english', 'turkish', 'chinese', 'korean'],
  beauty_cosmetology: ['makeup', 'cosmetology', 'hair', 'nails', 'brows_lashes'],
  psychology: ['psychology_practice', 'coaching', 'relationships'],
  finance_accounting: ['accounting', 'one_c', 'financial_literacy'],
  cooking_culinary: ['confectionery', 'cooking_general'],
  kids_development: ['kids_english', 'kids_math', 'speech_therapy'],
  arts_music: ['vocal', 'guitar', 'drawing'],
  ort_school: ['ort_math', 'ort_kyrgyz', 'school_subjects'],
};

// Categories that exist for display and filtering but must never be offered
// when creating a profile: 'all' is a filter pseudo-category, and 'unknown' is
// a curation outcome. Putting 'unknown' in the create dropdowns would hand
// people the same skip button that left 62% of the directory uncategorised.
export const NON_CREATABLE_CATEGORIES: readonly string[] = ['all', 'unknown'];

export type SortOption = 'default' | 'most_reviewed' | 'highest_rated' | 'newest';

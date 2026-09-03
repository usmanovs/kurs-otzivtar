import React, { useState } from 'react';
import { CourseCategory, CourseFormat, Course } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { X, PlusCircle, Building2, BookOpen } from 'lucide-react';

interface AddCourseModalProps {
  currentLang: SupportedLang;
  onClose: () => void;
  onAddCourse: (newCourse: Omit<Course, 'id' | 'reviews' | 'averageRating' | 'reviewCount' | 'recommendPercent' | 'teacherRatingAvg' | 'practiceRatingAvg' | 'jobSupportRatingAvg' | 'valueRatingAvg'>) => void;
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  currentLang,
  onClose,
  onAddCourse,
}) => {
  const t = TRANSLATIONS[currentLang];

  const [name, setName] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [category, setCategory] = useState<CourseCategory>('it_programming');
  const [format, setFormat] = useState<CourseFormat>('online');
  const [durationText, setDurationText] = useState('3-6 ай');
  const [priceKGS, setPriceKGS] = useState('40000');
  const [websiteOrInstagram, setWebsiteOrInstagram] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !academyName.trim()) {
      setError('Курстун жана уюштуруучунун атын толтуруңуз');
      return;
    }

    onAddCourse({
      name: name.trim(),
      academyName: academyName.trim(),
      category,
      format,
      durationText: durationText.trim() || '3 ай',
      priceKGS: parseInt(priceKGS, 10) || 0,
      websiteOrInstagram: websiteOrInstagram.trim() || undefined,
      description: description.trim() || 'Студенттердин сын-пикирлери үчүн кошулган курс.',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div
        className="bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">
              {t.addCourseModal.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {t.addCourseModal.subtitle}
            </p>
          </div>

          <button
            type="button"
            id="close-add-course-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.detailModal.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.addCourseModal.name} *
            </label>
            <input
              type="text"
              id="new-course-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Мис: Frontend Development (React + Next.js)"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.addCourseModal.academy} *
            </label>
            <input
              type="text"
              id="new-academy-name-input"
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
              placeholder="Мис: Makers, Geeks, же жеке ментордун аты"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.addCourseModal.category}
              </label>
              <select
                id="new-course-cat-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as CourseCategory)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="it_programming">{t.categories.it_programming}</option>
                <option value="design_uiux">{t.categories.design_uiux}</option>
                <option value="languages">{t.categories.languages}</option>
                <option value="marketing_smm">{t.categories.marketing_smm}</option>
                <option value="business_trading">{t.categories.business_trading}</option>
                <option value="data_analytics">{t.categories.data_analytics}</option>
                <option value="ort_school">{t.categories.ort_school}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.addCourseModal.format}
              </label>
              <select
                id="new-course-format-select"
                value={format}
                onChange={(e) => setFormat(e.target.value as CourseFormat)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="online">{t.format.online}</option>
                <option value="hybrid">{t.format.hybrid}</option>
                <option value="offline">{t.format.offline}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.addCourseModal.duration}
              </label>
              <input
                type="text"
                id="new-course-duration-input"
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
                placeholder="Мис: 6 ай"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.addCourseModal.price}
              </label>
              <input
                type="number"
                id="new-course-price-input"
                value={priceKGS}
                onChange={(e) => setPriceKGS(e.target.value)}
                placeholder="50000"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.addCourseModal.website}
            </label>
            <input
              type="text"
              id="new-course-website-input"
              value={websiteOrInstagram}
              onChange={(e) => setWebsiteOrInstagram(e.target.value)}
              placeholder="https://instagram.com/course_kg же https://school.kg"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.addCourseModal.description}
            </label>
            <textarea
              id="new-course-desc-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Курстун программасы, үйрөтүлүүчү технологиялар же жарнамаланган убадалары..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              Жокко чыгаруу
            </button>
            <button
              type="submit"
              id="submit-new-course-btn"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-colors shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.addCourseModal.submitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

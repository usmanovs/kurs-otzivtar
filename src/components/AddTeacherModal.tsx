import React, { useState } from 'react';
import { Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { X, UserPlus } from 'lucide-react';

interface AddTeacherModalProps {
  currentLang: SupportedLang;
  onClose: () => void;
  onAddTeacher: (newTeacher: Omit<Teacher, 'id'>) => void;
}

export const AddTeacherModal: React.FC<AddTeacherModalProps> = ({
  currentLang,
  onClose,
  onAddTeacher,
}) => {
  const t = TRANSLATIONS[currentLang];

  const [name, setName] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t.addTeacherModal.errorName);
      return;
    }

    onAddTeacher({
      name: name.trim(),
      academyName: academyName.trim() || undefined,
      bio: bio.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div
        className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">
              {t.addTeacherModal.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {t.addTeacherModal.subtitle}
            </p>
          </div>

          <button
            type="button"
            id="close-add-teacher-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            aria-label={t.detailModal.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.addTeacherModal.name} *
            </label>
            <input
              type="text"
              id="new-teacher-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Мис: Барпиев Азиретали"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.addTeacherModal.academy}
            </label>
            <input
              type="text"
              id="new-teacher-academy-input"
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
              placeholder="Мис: Geeks IT Academy"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.addTeacherModal.bio}
            </label>
            <textarea
              id="new-teacher-bio-textarea"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              {t.addTeacherModal.cancelBtn}
            </button>
            <button
              type="submit"
              id="submit-new-teacher-btn"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t.addTeacherModal.submitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

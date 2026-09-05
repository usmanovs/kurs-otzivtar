import React, { useRef, useState } from 'react';
import { Teacher } from '../types';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { X, UserPlus, Upload, Trash2, Instagram, Youtube } from 'lucide-react';

interface AddTeacherModalProps {
  currentLang: SupportedLang;
  editingTeacher?: Teacher | null;
  onClose: () => void;
  onSubmit: (teacherData: Omit<Teacher, 'id'>, editingId?: string) => void;
}

export const AddTeacherModal: React.FC<AddTeacherModalProps> = ({
  currentLang,
  editingTeacher,
  onClose,
  onSubmit,
}) => {
  const t = TRANSLATIONS[currentLang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editingTeacher;

  const [name, setName] = useState(editingTeacher?.name || '');
  const [academyName, setAcademyName] = useState(editingTeacher?.academyName || '');
  const [bio, setBio] = useState(editingTeacher?.bio || '');
  const [photoUrl, setPhotoUrl] = useState(editingTeacher?.photoUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(editingTeacher?.instagramUrl || '');
  const [youtubeUrl, setYoutubeUrl] = useState(editingTeacher?.youtubeUrl || '');
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t.addTeacherModal.errorName);
      return;
    }

    onSubmit(
      {
        name: name.trim(),
        academyName: academyName.trim() || undefined,
        bio: bio.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
      },
      editingTeacher?.id
    );

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
              {isEditing ? t.addTeacherModal.titleEdit : t.addTeacherModal.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {isEditing ? t.addTeacherModal.subtitleEdit : t.addTeacherModal.subtitle}
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
              {t.addTeacherModal.photo}
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xl shrink-0 overflow-hidden border border-slate-200">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{name.trim().charAt(0).toUpperCase() || '?'}</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  id="new-teacher-photo-url-input"
                  value={photoUrl.startsWith('data:') ? '' : photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder={t.addTeacherModal.photoUrlPlaceholder}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {t.addTeacherModal.photoUploadBtn}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    id="new-teacher-photo-file-input"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t.addTeacherModal.photoRemove}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.addTeacherModal.name} *
            </label>
            <input
              type="text"
              id="new-teacher-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Мис: Азиретали Барпиев"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-slate-500" />
                {t.addTeacherModal.instagram}
              </label>
              <input
                type="url"
                id="new-teacher-instagram-input"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-slate-500" />
                {t.addTeacherModal.youtube}
              </label>
              <input
                type="url"
                id="new-teacher-youtube-input"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/@..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
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
              <span>{isEditing ? t.addTeacherModal.submitBtnEdit : t.addTeacherModal.submitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

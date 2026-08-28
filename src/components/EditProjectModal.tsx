import React, { useState, useEffect } from 'react';
import type { Project, Language } from '../types';
import { translations } from '../utils/translations';
import { X, Save, ShieldAlert } from 'lucide-react';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  projects: Project[];
  onSave: (projectId: string, updatedFields: Partial<Project>) => void;
  language: Language;
}

const PRESET_COLORS = [
  '#f43f5e', '#ec4899', '#d946ef', '#a855f7', 
  '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', 
  '#14b8a6', '#10b981', '#22c55e', '#84cc16', 
  '#eab308', '#f97316'
];

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  projects,
  onSave,
  language,
}) => {
  const [name, setName] = useState(project.name);
  const [color, setColor] = useState(project.color);
  const [parentId, setParentId] = useState(project.parentId || '');

  const t = translations[language];

  // Sync state when project prop changes
  useEffect(() => {
    setName(project.name);
    setColor(project.color);
    setParentId(project.parentId || '');
  }, [project]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(project.id, {
      name: name.trim(),
      color,
      parentId: parentId || undefined,
    });
    onClose();
  };

  // Nesting sanity checks:
  // 1. A project cannot select itself as parent.
  // 2. A project that has sub-projects cannot select a parent (must remain top-level).
  const isParent = projects.some((p) => p.parentId === project.id);
  const topLevelProjects = projects.filter((p) => !p.parentId && p.id !== project.id);

  const getProjectName = (p: Project) => {
    if (p.id === 'project-inbox') return t.inbox;
    if (p.id === 'project-personal') return t.personal;
    if (p.id === 'project-work') return t.work;
    return p.name;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl animate-scale-up text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4 mb-5">
          <h3 className="text-base font-bold tracking-tight">{t.editProject}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          
          {/* Project Name */}
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400">{t.projectNamePlaceholder}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3 py-2 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Preset Colors */}
          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-slate-400">Color</label>
            <div className="flex flex-wrap gap-1.5 justify-center py-2 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5.5 h-5.5 rounded-full transition active:scale-90 cursor-pointer ${
                    color === c 
                      ? 'ring-2 ring-slate-400 dark:ring-slate-100 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110 shadow-lg' 
                      : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Parent Project Dropdown Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-slate-400">{t.parentProject}</label>
            {isParent ? (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 rounded-2xl text-[11px] leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t.parentNotice}</span>
              </div>
            ) : (
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 text-xs px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="">{t.noParent}</option>
                {topLevelProjects.map((p) => (
                  <option key={p.id} value={p.id}>{getProjectName(p)}</option>
                ))}
              </select>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-50 flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/15 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t.saveChanges}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

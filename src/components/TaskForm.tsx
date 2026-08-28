import React, { useState } from 'react';
import type { Project, Priority, Language } from '../types';
import { translations } from '../utils/translations';
import { Plus, Calendar, Tag, ShieldAlert, FileText, Hourglass } from 'lucide-react';

interface TaskFormProps {
  projects: Project[];
  activeProjectId: string;
  language: Language;
  onAddTask: (task: {
    title: string;
    description: string;
    projectId: string;
    dueDate: string;
    priority: Priority;
    tags: string[];
    waitingOn?: string;
  }) => void;
  tasks: any[];
}

export const TaskForm: React.FC<TaskFormProps> = ({ 
  projects, 
  activeProjectId, 
  language,
  onAddTask,
  tasks
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const inputRef = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. If pressing Escape, collapse form if focused inside it
      if (e.key === 'Escape') {
        if (formRef.current && formRef.current.contains(document.activeElement)) {
          (document.activeElement as HTMLElement)?.blur();
          setIsExpanded(false);
        }
        return;
      }

      // 2. Ignore shortcut if user is typing in any text entry field
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        const isEditable =
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          activeEl.hasAttribute('contenteditable');
        if (isEditable) return;
      }

      // 3. Ignore shortcut if a modal/dialog is open
      const isModalOpen = !!document.querySelector('.fixed.inset-0.z-50');
      if (isModalOpen) return;

      // 4. Handle Q for quick-add task
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter active projects (exclude deleted and archived)
  const activeProjects = projects.filter((p) => !p.isDeleted && !p.isArchived);
  
  const [projectId, setProjectId] = useState(activeProjectId);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('low');
  const [tagsInput, setTagsInput] = useState('');
  const [waitingOn, setWaitingOn] = useState('');

  const t = translations[language];

  // Sync state if selected project changes in sidebar
  React.useEffect(() => {
    const isRealProject = projects.some((p) => p.id === activeProjectId && !p.isDeleted && !p.isArchived);
    if (isRealProject) {
      setProjectId(activeProjectId);
    } else {
      setProjectId('project-inbox');
    }
  }, [activeProjectId, projects]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    // Process comma separated tags
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    onAddTask({
      title: title.trim(),
      description: description.trim(),
      projectId: projectId || activeProjects[0]?.id || 'project-inbox',
      dueDate,
      priority,
      tags,
      waitingOn: waitingOn.trim() || undefined,
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setTagsInput('');
    setWaitingOn('');
    setDueDate('');
    setPriority('low');
    // If not in a specific project view, reset to default project
    const isRealProject = activeProjects.some((p) => p.id === activeProjectId);
    if (isRealProject) {
      setProjectId(activeProjectId);
    } else {
      setProjectId('project-inbox');
    }
    setIsExpanded(false);
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getProjectName = (proj: Project) => {
    if (proj.id === 'project-inbox') return t.inbox;
    if (proj.id === 'project-personal') return t.personal;
    if (proj.id === 'project-work') return t.work;
    return proj.name;
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm dark:shadow-none transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.addThing}
            required
            onFocus={() => setIsExpanded(true)}
            className="flex-1 bg-transparent border-none text-sm font-semibold focus:outline-none placeholder-slate-400 dark:placeholder-slate-550 text-slate-800 dark:text-slate-100"
          />
          {!isExpanded && !title && (
            <kbd className="hidden sm:inline-block absolute right-2 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-md shadow-xs pointer-events-none select-none">
              Q
            </kbd>
          )}
        </div>
        <button
          type="submit"
          className="bg-indigo-650 text-slate-50 hover:bg-indigo-600 rounded-2xl p-2 shadow-lg shadow-indigo-600/15 transition active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4 animate-fade-in">
          {/* Description input */}
          <div className="flex gap-2.5 items-start">
            <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-1.5 shrink-0" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.description}
              rows={2}
              className="flex-1 bg-slate-50 dark:bg-slate-900/40 text-xs border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-605 text-slate-800 dark:text-slate-200 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Project Select & Due Date */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="w-20 text-slate-500 dark:text-slate-400 font-medium">{t.projects}</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getProjectName(p)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-20 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-450 dark:text-slate-500" />
                  <span>{t.dueDate}</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900/60 text-slate-850 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {(() => {
                // Calculate unique waitees in the selected project
                const projectWaitees = tasks
                  .filter((t) => t.projectId === projectId && t.waitingOn)
                  .flatMap((t) => t.waitingOn.split(','))
                  .map((w) => w.trim())
                  .filter(Boolean);
                const uniqueProjectWaitees = Array.from(new Set(projectWaitees));

                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <label className="w-20 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <Hourglass className="w-3.5 h-3.5 shrink-0 text-slate-450 dark:text-slate-500" />
                        <span>{t.waiting}</span>
                      </label>
                      <input
                        type="text"
                        value={waitingOn}
                        onChange={(e) => setWaitingOn(e.target.value)}
                        placeholder={t.waitingPlaceholder}
                        className="flex-1 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-600"
                      />
                    </div>
                    {uniqueProjectWaitees.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pl-24 text-[10px]">
                        <span className="text-slate-450 dark:text-slate-500 font-semibold">{language === 'ca' ? 'Sugerits:' : 'Suggested:'}</span>
                        {uniqueProjectWaitees.map((name) => {
                          const currentList = waitingOn.split(',').map((n) => n.trim().toLowerCase());
                          const isSelected = currentList.includes(name.toLowerCase());
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  const newList = waitingOn
                                    .split(',')
                                    .map((n) => n.trim())
                                    .filter((n) => n.toLowerCase() !== name.toLowerCase());
                                  setWaitingOn(newList.join(', '));
                                } else {
                                  const trimmed = waitingOn.trim();
                                  const newList = trimmed ? `${trimmed}, ${name}` : name;
                                  setWaitingOn(newList);
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded-full border transition cursor-pointer font-bold ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300'
                                  : 'border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-500 hover:border-slate-350 dark:hover:border-slate-750 hover:bg-slate-200 dark:hover:bg-slate-800'
                              }`}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Priority & Tags */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="w-20 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span>{t.priority}</span>
                </label>
                <div className="flex-1 flex gap-1">
                  {(['low', 'medium', 'high'] as const).map((p) => {
                    const label = p === 'high' ? t.high : p === 'medium' ? t.medium : t.low;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-1 rounded-lg border text-[10px] font-semibold uppercase tracking-wider transition ${
                          priority === p
                            ? p === 'high' ? 'bg-rose-500/20 border-rose-500/70 text-rose-650 dark:text-rose-300' :
                              p === 'medium' ? 'bg-amber-500/20 border-amber-500/70 text-amber-650 dark:text-amber-300' :
                              'bg-sky-500/20 border-sky-500/70 text-sky-650 dark:text-sky-300'
                            : 'border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-20 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 shrink-0 text-slate-450 dark:text-slate-500" />
                  <span>{t.tags}</span>
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="tag1, tag2..."
                  className="flex-1 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Quick Submit Actions */}
          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-50 active:scale-95 transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addThing}</span>
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

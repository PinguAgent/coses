import React, { useState, useEffect, useRef } from 'react';
import type { Task, Project, Priority, Language } from '../types';
import { translations } from '../utils/translations';
import { TaskItem } from './TaskItem';
import { ClipboardList, Award, Trash2, RotateCcw, Search, X, CheckSquare, Archive } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  selectedProjectId: string;
  selectedTag: string | null;
  selectedPriority: Priority | null;
  language: Language;
  onToggleComplete: (id: string) => void;
  onUpdateTask: (id: string, updatedFields: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onRestoreTask: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onUnarchiveProject: (id: string) => void;
  onSelectProject: (id: string) => void;
  onReorderTasks: (draggedId: string, targetId: string) => void;
}

type LogbookPeriod = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'allTime';

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  projects,
  selectedProjectId,
  selectedTag,
  selectedPriority,
  language,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onRestoreTask,
  onRestoreProject,
  onDeleteProject,
  onUnarchiveProject,
  onSelectProject,
  onReorderTasks,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    id: string;
    type: 'task' | 'project';
  } | null>(null);

  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const handleDragOverTask = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnterTask = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverTaskId(targetId);
  };

  const handleDragLeaveTask = () => {
    setDragOverTaskId(null);
  };

  const handleDropTask = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== targetId) {
      onReorderTasks(draggedId, targetId);
    }
    setDragOverTaskId(null);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [logbookPeriod, setLogbookPeriod] = useState<LogbookPeriod>('thisWeek');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  // Close context menu on left clicks anywhere in the window
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Intercept Cmd+F / Ctrl+F keys to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'task' | 'project') => {
    if (selectedProjectId !== 'trash') return; // Capture context menu only inside the Trash folder
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      id,
      type,
    });
  };

  // Helper to check if task falls in the selected logbook period
  const isInLogbookPeriod = (completedAtStr?: string) => {
    if (!completedAtStr) return false;
    const completedDate = new Date(completedAtStr);
    const now = new Date();
    
    // Set hours to 0,0,0,0 to compare days properly
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (logbookPeriod) {
      case 'thisWeek': {
        const day = startOfToday.getDay();
        const diffToMonday = startOfToday.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(startOfToday.setDate(diffToMonday));
        startOfWeek.setHours(0, 0, 0, 0);
        return completedDate >= startOfWeek;
      }
      case 'lastWeek': {
        const day = startOfToday.getDay();
        const diffToMonday = startOfToday.getDate() - day + (day === 0 ? -6 : 1);
        const startOfThisWeek = new Date(startOfToday.setDate(diffToMonday));
        startOfThisWeek.setHours(0, 0, 0, 0);
        
        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        
        return completedDate >= startOfLastWeek && completedDate < startOfThisWeek;
      }
      case 'thisMonth': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return completedDate >= startOfMonth;
      }
      case 'lastMonth': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return completedDate >= startOfLastMonth && completedDate < startOfThisMonth;
      }
      case 'allTime':
      default:
        return true;
    }
  };

  // Filter Tasks based on active selections + search query
  const filteredTasks = tasks.filter((task) => {
    if (selectedProjectId === 'trash') {
      if (!task.isDeleted) return false;
    } else {
      if (task.isDeleted) return false;
    }

    // Exclude tasks belonging to archived projects unless we are explicitly viewing that archived project (or its parent)
    if (selectedProjectId !== 'trash' && selectedProjectId !== task.projectId) {
      const taskProj = projects.find((p) => p.id === task.projectId);
      if (taskProj && taskProj.isArchived) {
        const selectedProj = projects.find((p) => p.id === selectedProjectId);
        if (!selectedProj || !selectedProj.isArchived) {
          return false;
        }
      }
    }

    // In logbook view, show only completed tasks within the selected period
    if (selectedProjectId === 'logbook') {
      if (!task.completed) return false;
      if (!isInLogbookPeriod(task.completedAt)) return false;
    }

    // Search query matching (matches title, description, tags, waitees, and subtask titles)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = task.title.toLowerCase().includes(query);
      const descMatch = task.description.toLowerCase().includes(query);
      const tagMatch = task.tags.some((tag) => tag.toLowerCase().includes(query));
      const waiteeMatch = task.waitingOn?.toLowerCase().includes(query);
      const subtaskMatch = task.subtasks.some((st) => st.title.toLowerCase().includes(query));

      if (!titleMatch && !descMatch && !tagMatch && !waiteeMatch && !subtaskMatch) {
        return false;
      }
    }

    // Skip normal filter lists if we are in logbook
    if (selectedProjectId !== 'logbook') {
      if (selectedProjectId === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (task.dueDate !== todayStr) return false;
      } else if (selectedProjectId === 'starred') {
        const hasStarredSubtask = task.subtasks.some((st) => st.starred);
        if (!task.starred && !hasStarredSubtask) return false;
      } else if (selectedProjectId === 'waiting') {
        if (!task.waitingOn) return false;
      } else if (selectedProjectId !== 'all' && selectedProjectId !== 'trash') {
        const childIds = projects.filter((p) => p.parentId === selectedProjectId).map((p) => p.id);
        const targetProjectIds = [selectedProjectId, ...childIds];
        if (!targetProjectIds.includes(task.projectId)) return false;
      }
    }

    // Tag filter
    if (selectedTag && !task.tags.includes(selectedTag)) {
      return false;
    }

    // Priority filter
    if (selectedPriority && task.priority !== selectedPriority) {
      return false;
    }

    return true;
  });

  // Filter Deleted Projects
  const deletedProjects = projects.filter((p) => p.isDeleted);

  // Filter Archived Projects (excluding deleted ones)
  const archivedProjects = projects.filter((p) => p.isArchived && !p.isDeleted);

  // Calculate Progress Stats (exclude from Trash & Logbook views)
  const totalInView = filteredTasks.length;
  const completedInView = filteredTasks.filter((t) => t.completed).length;
  const progressPercent = totalInView > 0 ? Math.round((completedInView / totalInView) * 100) : 0;

  // Header Title
  const getHeaderTitle = () => {
    if (selectedTag) return `${t.tags}: #${selectedTag}`;
    if (selectedPriority) {
      const label = selectedPriority === 'high' ? t.high : selectedPriority === 'medium' ? t.medium : t.low;
      return `${t.priority}: ${label}`;
    }
    if (selectedProjectId === 'all') return t.allThings;
    if (selectedProjectId === 'today') return t.today;
    if (selectedProjectId === 'starred') return t.starred;
    if (selectedProjectId === 'waiting') return t.waiting;
    if (selectedProjectId === 'trash') return t.trash;
    if (selectedProjectId === 'archive') return t.archivedProjects;
    if (selectedProjectId === 'logbook') return t.completedWork;
    const proj = projects.find((p) => p.id === selectedProjectId);

    if (proj) {
      if (proj.id === 'project-inbox') return t.inbox;
      if (proj.id === 'project-personal') return t.personal;
      if (proj.id === 'project-work') return t.work;
      return proj.name;
    }
    return 'Tasks';
  };

  const getProjectName = (proj: Project) => {
    if (proj.id === 'project-inbox') return t.inbox;
    if (proj.id === 'project-personal') return t.personal;
    if (proj.id === 'project-work') return t.work;
    return proj.name;
  };

  // Group tasks chronologically for the Logbook view
  const getGroupedTasks = () => {
    const groups: Record<string, Task[]> = {};
    
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return timeB - timeA;
    });

    sortedTasks.forEach((task) => {
      if (!task.completedAt) {
        const key = language === 'ca' ? 'Anterior' : 'Earlier';
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
        return;
      }
      
      const compDate = new Date(task.completedAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey = '';
      if (compDate.toDateString() === today.toDateString()) {
        groupKey = language === 'ca' ? 'Avui' : 'Today';
      } else if (compDate.toDateString() === yesterday.toDateString()) {
        groupKey = language === 'ca' ? 'Ahir' : 'Yesterday';
      } else {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        groupKey = compDate.toLocaleDateString(language === 'ca' ? 'ca-ES' : 'en-US', options);
        groupKey = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });
    
    return groups;
  };

  const groupedTasks = getGroupedTasks();
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPad|iPhone/.test(navigator.platform);

  return (
    <div className="space-y-6 flex flex-col h-full relative">
      {/* List Header & Search / Progress Bar Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{getHeaderTitle()}</h2>
          <p className="text-xs text-slate-500 mt-1">
            {t.thingsInView(totalInView)}
          </p>
        </div>

        {/* Right side controls (Search & Progress) */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-4 w-full md:w-auto shrink-0 md:justify-end">
          {/* Global Search input */}
          <div className="relative w-full md:w-56 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-550 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ca' ? 'Cerca tasques...' : 'Search tasks...'}
              className="w-full bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/85 hover:border-slate-350 dark:hover:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none pl-9 pr-9 py-1.5 rounded-xl text-xs transition placeholder-slate-400 dark:placeholder-slate-605 text-slate-800 dark:text-slate-100"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 dark:hover:text-slate-300 p-0.5 rounded-lg transition"
                title={language === 'ca' ? 'Neteja la cerca' : 'Clear search'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] bg-slate-200/50 dark:bg-slate-800 text-slate-550 dark:text-slate-450 px-1 rounded border border-slate-200 dark:border-slate-700/85 font-mono select-none pointer-events-none">
                {isMac ? '⌘F' : 'Ctrl+F'}
              </span>
            )}
          </div>

          {/* Progress circle/bar */}
          {totalInView > 0 && selectedProjectId !== 'trash' && selectedProjectId !== 'logbook' && (
            <div className="flex items-center gap-3 w-full md:w-56 shrink-0">
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold tracking-wider uppercase mb-1">
                  <span>{t.progress}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-200/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(99,102,241,0.2)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              {progressPercent === 100 && (
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-450 animate-bounce">
                  <Award className="w-4 h-4" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Logbook Period Segmented Tabs */}
      {selectedProjectId === 'logbook' && (
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/70 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 p-1 rounded-2xl w-full sm:w-fit mb-2 animate-fade-in">
          {([
            { key: 'thisWeek', label: t.thisWeek },
            { key: 'lastWeek', label: t.lastWeek },
            { key: 'thisMonth', label: t.thisMonth },
            { key: 'lastMonth', label: t.lastMonth },
            { key: 'allTime', label: t.allTime },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setLogbookPeriod(key)}
              className={`flex-1 sm:flex-initial py-1.5 px-3.5 text-xs font-bold rounded-xl transition cursor-pointer select-none ${
                logbookPeriod === key
                  ? 'bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Deleted Projects section inside Trash */}
      {selectedProjectId === 'trash' && deletedProjects.length > 0 && (
        <div className="space-y-2 bg-rose-500/5 dark:bg-rose-500/5 border border-rose-500/10 dark:border-rose-500/20 p-4 rounded-3xl">
          <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.deletedProjects}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {deletedProjects.map((p) => (
              <div
                key={p.id}
                onContextMenu={(e) => handleContextMenu(e, p.id, 'project')}
                className="flex items-center justify-between bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm dark:shadow-none hover:border-slate-350 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-200 dark:border-slate-950"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{getProjectName(p)}</span>
                </div>
                <button
                  onClick={() => onRestoreProject(p.id)}
                  className="px-2.5 py-1 text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:bg-indigo-600/10 rounded-lg border border-indigo-600/10 dark:border-indigo-400/10 transition cursor-pointer"
                >
                  {t.restore}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archived Projects section inside Archive view */}
      {selectedProjectId === 'archive' && archivedProjects.length > 0 && (
        <div className="space-y-2 bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 dark:border-amber-500/20 p-4 rounded-3xl animate-fade-in">
          <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Archive className="w-3.5 h-3.5" />
            <span>{t.archivedProjects}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {archivedProjects.map((p) => {
              const projectTasksCount = tasks.filter((t) => t.projectId === p.id && !t.isDeleted).length;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm dark:shadow-none hover:border-slate-350 dark:hover:border-slate-700 transition"
                >
                  <button
                    onClick={() => onSelectProject(p.id)}
                    className="flex items-center gap-2 truncate flex-1 text-left cursor-pointer hover:opacity-85"
                    title={language === 'ca' ? 'Veure tasques' : 'View tasks'}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-200 dark:border-slate-950"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{getProjectName(p)}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({projectTasksCount})</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUnarchiveProject(p.id)}
                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:bg-indigo-600/10 rounded-lg border border-indigo-600/10 dark:border-indigo-400/10 transition cursor-pointer"
                    >
                      {language === 'ca' ? 'Desarxivar' : 'Unarchive'}
                    </button>
                    <button
                      onClick={() => onDeleteProject(p.id)}
                      className="px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-500/10 rounded-lg border border-rose-500/10 transition cursor-pointer"
                    >
                      {language === 'ca' ? 'Eliminar' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task List Items Container */}
      {filteredTasks.length === 0 && 
       (selectedProjectId !== 'trash' || deletedProjects.length === 0) &&
       (selectedProjectId !== 'archive' || archivedProjects.length === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-200 dark:border-slate-800/80 rounded-3xl bg-slate-100/10 dark:bg-slate-950/20 max-w-xl mx-auto w-full my-8">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-sm dark:shadow-none">
            {selectedProjectId === 'trash' ? (
              <Trash2 className="w-6 h-6 text-rose-500" />
            ) : selectedProjectId === 'archive' ? (
              <Archive className="w-6 h-6 text-amber-500" />
            ) : selectedProjectId === 'logbook' ? (
              <CheckSquare className="w-6 h-6 text-emerald-500" />
            ) : (
              <ClipboardList className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {selectedProjectId === 'trash'
              ? t.noTrashItems
              : selectedProjectId === 'archive'
              ? t.noArchivedProjects
              : selectedProjectId === 'logbook'
              ? t.noCompletedTasks
              : searchQuery
              ? language === 'ca'
                ? 'Cap coincidència'
                : 'No matches found'
              : t.noThingsToDo}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-455 max-w-xs mt-1.5 leading-relaxed">
            {selectedProjectId === 'trash' || selectedProjectId === 'archive' || selectedProjectId === 'logbook'
              ? ''
              : searchQuery
              ? language === 'ca'
                ? 'Prova de cercar una altra paraula clau.'
                : 'Try searching with another keyword.'
              : t.emptyStateDesc}
          </p>
        </div>
      ) : selectedProjectId === 'logbook' ? (
        /* Logbook view displays tasks grouped by completed day */
        <div className="space-y-6 pb-10 overflow-y-auto pr-1">
          {Object.keys(groupedTasks).map((groupKey) => (
            <div key={groupKey} className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider pl-1 pt-2 border-b border-slate-100 dark:border-slate-800/40 pb-1.5">
                {groupKey}
              </h4>
              <div className="space-y-3.5">
                {groupedTasks[groupKey].map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    projects={projects}
                    language={language}
                    onToggleComplete={onToggleComplete}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    tasks={tasks}
                    onContextMenu={(e) => handleContextMenu(e, task.id, 'task')}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Standard views display simple flat tasks listing */
        <div className="space-y-3.5 pb-10 overflow-y-auto pr-1">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onDragOver={handleDragOverTask}
              onDragEnter={(e) => handleDragEnterTask(e, task.id)}
              onDragLeave={handleDragLeaveTask}
              onDrop={(e) => handleDropTask(e, task.id)}
              className={`transition-all duration-150 ${
                dragOverTaskId === task.id ? 'border-t-2 border-indigo-500 pt-2.5' : ''
              }`}
            >
              <TaskItem
                task={task}
                projects={projects}
                language={language}
                onToggleComplete={onToggleComplete}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                tasks={tasks}
                onContextMenu={(e) => handleContextMenu(e, task.id, 'task')}
              />
            </div>
          ))}
        </div>
      )}

      {/* Context Menu Popup Overlay */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 min-w-[180px] animate-scale-up font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              if (contextMenu.type === 'task') {
                onRestoreTask(contextMenu.id);
              } else {
                onRestoreProject(contextMenu.id);
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t.restore}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (contextMenu.type === 'task') {
                onDeleteTask(contextMenu.id);
              } else {
                onDeleteProject(contextMenu.id);
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer border-t border-slate-100 dark:border-slate-800/80 mt-1 pt-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.deletePermanently}</span>
          </button>
        </div>
      )}
    </div>
  );
};

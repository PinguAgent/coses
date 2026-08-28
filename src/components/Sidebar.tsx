import React, { useState, useRef, useEffect } from 'react';
import type { Project, Priority, SyncSettings, Language } from '../types';
import { translations } from '../utils/translations';
import { 
  Inbox, Calendar, Hash, ShieldAlert, Plus, Trash2, Cloud, 
  Download, Upload, Settings, RefreshCw, FolderClosed, CheckSquare,
  Star, Hourglass, ChevronDown, ChevronRight, Edit, Archive
} from 'lucide-react';

interface SidebarProps {
  projects: Project[];
  selectedProjectId: string;
  selectedTag: string | null;
  selectedPriority: Priority | null;
  tasksCount: Record<string, number>;
  activeTags: string[];
  syncSettings: SyncSettings;
  syncStatus: 'synced' | 'syncing' | 'error' | 'local';
  language: Language;
  onSelectProject: (id: string) => void;
  onSelectTag: (tag: string | null) => void;
  onSelectPriority: (priority: Priority | null) => void;
  onAddProject: (name: string, color: string, parentId?: string) => void;
  onDeleteProject: (id: string) => void;
  onEditProject: (project: Project) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenSettings: () => void;
  onTriggerSync: () => void;
  onMoveTaskToProject: (taskId: string, projectId: string) => void;
  onEmptyTrash: () => void;
  onArchiveProject: (id: string) => void;
}

const PRESET_COLORS = [
  '#f43f5e', '#ec4899', '#d946ef', '#a855f7', 
  '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', 
  '#14b8a6', '#10b981', '#22c55e', '#84cc16', 
  '#eab308', '#f97316'
];

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  selectedProjectId,
  selectedTag,
  selectedPriority,
  tasksCount,
  activeTags,
  syncSettings,
  syncStatus,
  language,
  onSelectProject,
  onSelectTag,
  onSelectPriority,
  onAddProject,
  onDeleteProject,
  onEditProject,
  onExportData,
  onImportData,
  onOpenSettings,
  onTriggerSync,
  onMoveTaskToProject,
  onEmptyTrash,
  onArchiveProject,
}) => {
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PRESET_COLORS[4]); // Indigo by default
  const [parentProjectId, setParentProjectId] = useState<string>(''); // Default: Top level
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  
  // Collapse state map for parent folders (defaults to expanded/true)
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [trashContextMenu, setTrashContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [projectContextMenu, setProjectContextMenu] = useState<{
    x: number;
    y: number;
    project: Project;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  // Close context menu on clicks
  useEffect(() => {
    const closeMenu = () => {
      setTrashContextMenu(null);
      setProjectContextMenu(null);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleAddProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onAddProject(newProjectName.trim(), newProjectColor, parentProjectId || undefined);
    setNewProjectName('');
    setParentProjectId('');
    setShowAddProject(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const renderProjectIcon = (id: string) => {
    if (id === 'project-inbox') return <Inbox className="w-4 h-4" />;
    if (id === 'project-work') return <FolderClosed className="w-4 h-4" />;
    if (id === 'project-personal') return <CheckSquare className="w-4 h-4" />;
    return <FolderClosed className="w-4 h-4" />;
  };

  const getProjectName = (proj: Project) => {
    if (proj.id === 'project-inbox') return t.inbox;
    if (proj.id === 'project-personal') return t.personal;
    if (proj.id === 'project-work') return t.work;
    return proj.name;
  };

  // Split projects into top-level and sub-projects (excluding deleted and archived ones)
  const activeProjects = projects.filter((p) => !p.isDeleted && !p.isArchived);
  const topLevelProjects = activeProjects.filter((p) => !p.parentId);
  const subProjects = activeProjects.filter((p) => p.parentId);

  return (
    <div className="w-80 glass-panel border-r border-slate-200/50 dark:border-slate-800/80 flex flex-col h-screen overflow-hidden shrink-0 text-slate-800 dark:text-slate-100">
      {/* App Logo / Header */}
      <div className="p-6 border-b border-slate-200/60 dark:border-slate-850 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-500 flex items-center justify-center font-bold text-slate-100 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            C
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100 tracking-tight leading-none m-0">coses</h1>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">todo task manager</span>
          </div>
        </div>

        {/* Status / Sync / Settings controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {syncSettings.provider !== 'none' && (
            <button
              onClick={onTriggerSync}
              disabled={syncStatus === 'syncing'}
              className={`p-1.5 rounded-lg border transition duration-150 ${
                syncStatus === 'syncing' 
                  ? 'bg-slate-200 dark:bg-slate-900/60 border-indigo-500/20 text-indigo-500 dark:text-indigo-400' 
                  : syncStatus === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                  : 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title={t.forceSync}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </button>
          )}
          
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center gap-1"
            title={t.settings}
          >
            <Cloud className={`w-3.5 h-3.5 ${
              syncStatus === 'synced' ? 'text-emerald-650 dark:text-emerald-500' :
              syncStatus === 'syncing' ? 'text-indigo-650 dark:text-indigo-500' :
              syncStatus === 'error' ? 'text-rose-600 dark:text-rose-500' : 'text-slate-400 dark:text-slate-500'
            }`} />
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        
        {/* Core Views */}
        <div className="space-y-1">
          <button
            onClick={() => {
              onSelectProject('all');
              onSelectTag(null);
              onSelectPriority(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all ${
              selectedProjectId === 'all' && !selectedTag && !selectedPriority
                ? 'bg-indigo-600/10 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-2.5'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Inbox className="w-4 h-4" />
              <span>{t.allThings}</span>
            </div>
            <span className="text-xs text-slate-500 bg-slate-200/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800/85 font-mono">
              {tasksCount['all'] || 0}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectProject('today');
              onSelectTag(null);
              onSelectPriority(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all ${
              selectedProjectId === 'today' && !selectedTag && !selectedPriority
                ? 'bg-indigo-600/10 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-2.5'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              <span>{t.today}</span>
            </div>
            <span className="text-xs text-slate-500 bg-slate-200/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800/85 font-mono">
              {tasksCount['today'] || 0}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectProject('starred');
              onSelectTag(null);
              onSelectPriority(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all ${
              selectedProjectId === 'starred' && !selectedTag && !selectedPriority
                ? 'bg-indigo-600/10 dark:bg-indigo-600/15 text-indigo-755 dark:text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-2.5'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span>{t.starred}</span>
            </div>
            <span className="text-xs text-slate-500 bg-slate-200/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800/85 font-mono">
              {tasksCount['starred'] || 0}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectProject('waiting');
              onSelectTag(null);
              onSelectPriority(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all ${
              selectedProjectId === 'waiting' && !selectedTag && !selectedPriority
                ? 'bg-indigo-600/10 dark:bg-indigo-600/15 text-indigo-755 dark:text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-2.5'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Hourglass className="w-4 h-4 text-indigo-550 dark:text-indigo-400" />
              <span>{t.waiting}</span>
            </div>
            <span className="text-xs text-slate-500 bg-slate-200/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800/85 font-mono">
              {tasksCount['waiting'] || 0}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectProject('logbook');
              onSelectTag(null);
              onSelectPriority(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all ${
              selectedProjectId === 'logbook' && !selectedTag && !selectedPriority
                ? 'bg-emerald-600/10 dark:bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 font-semibold border-l-2 border-emerald-500 pl-2.5'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              <span>{t.logbook}</span>
            </div>
            <span className="text-xs text-slate-500 bg-slate-200/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800/85 font-mono">
              {tasksCount['logbook'] || 0}
            </span>
          </button>

          {(() => {
            const hasDeletedItems = (tasksCount['trash'] || 0) > 0 || projects.some((p) => p.isDeleted);
            if (!hasDeletedItems) return null;

            return (
              <button
                onClick={() => {
                  onSelectProject('trash');
                  onSelectTag(null);
                  onSelectPriority(null);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setTrashContextMenu({ x: e.clientX, y: e.clientY });
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all ${
                  selectedProjectId === 'trash' && !selectedTag && !selectedPriority
                    ? 'bg-rose-600/10 dark:bg-rose-600/15 text-rose-600 dark:text-rose-455 font-semibold border-l-2 border-rose-500 pl-2.5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>{t.trash}</span>
                </div>
                <span className="text-xs text-slate-500 bg-slate-200/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800/85 font-mono">
                  {(tasksCount['trash'] || 0) + projects.filter((p) => p.isDeleted).length}
                </span>
              </button>
            );
          })()}

          {(() => {
            const hasArchivedProjects = projects.some((p) => p.isArchived);
            if (!hasArchivedProjects) return null;

            const archivedCount = projects.filter((p) => p.isArchived).length;

            return (
              <button
                onClick={() => {
                  onSelectProject('archive');
                  onSelectTag(null);
                  onSelectPriority(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all ${
                  selectedProjectId === 'archive' && !selectedTag && !selectedPriority
                    ? 'bg-amber-600/10 dark:bg-amber-600/15 text-amber-600 dark:text-amber-400 font-semibold border-l-2 border-amber-500 pl-2.5 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Archive className="w-4 h-4 text-amber-500" />
                  <span>{t.archive}</span>
                </div>
                <span className="text-xs text-slate-500 bg-slate-200/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800/85 font-mono">
                  {archivedCount}
                </span>
              </button>
            );
          })()}
        </div>

        {/* Projects Listing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t.projects}</h4>
            <button
              onClick={() => setShowAddProject(!showAddProject)}
              className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showAddProject && (
            <form onSubmit={handleAddProjectSubmit} className="p-3 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 animate-fade-in">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t.projectNamePlaceholder}
                required
                autoFocus
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-605 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex flex-wrap gap-1.5 justify-center">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewProjectColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-4 h-4 rounded-full transition active:scale-90 ${
                      newProjectColor === c 
                        ? 'ring-2 ring-slate-400 dark:ring-slate-100 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110 shadow-lg' 
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              {/* Parent Project Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 dark:text-slate-455 font-semibold">{t.parentProject}</label>
                <select
                  value={parentProjectId}
                  onChange={(e) => setParentProjectId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">{t.noParent}</option>
                  {topLevelProjects.map((p) => (
                    <option key={p.id} value={p.id}>{getProjectName(p)}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddProject(false)}
                  className="px-2.5 py-1 text-[10px] font-medium border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-955"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-600 text-slate-50 hover:bg-indigo-500 shadow-md shadow-indigo-600/10"
                >
                  {t.add}
                </button>
              </div>
            </form>
          )}

          {/* Tree-grouped Projects List */}
          <div className="space-y-0.5">
            {topLevelProjects.map((proj) => {
              const isSelected = selectedProjectId === proj.id && !selectedTag && !selectedPriority;
              const isDragOver = dragOverProjectId === proj.id;
              
              // Get sub-projects under this parent folder
              const children = subProjects.filter((sp) => sp.parentId === proj.id);
              const hasChildren = children.length > 0;
              const isExpanded = expandedParents[proj.id] !== false; // Default expanded

              return (
                <div key={proj.id} className="space-y-0.5">
                  {/* Top-Level Parent Project Row */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverProjectId(proj.id);
                    }}
                    onDragLeave={() => {
                      setDragOverProjectId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const taskId = e.dataTransfer.getData('text/plain');
                      if (taskId) {
                        onMoveTaskToProject(taskId, proj.id);
                      }
                      setDragOverProjectId(null);
                    }}
                    onContextMenu={(e) => {
                      if (proj.id !== 'project-inbox') {
                        e.preventDefault();
                        e.stopPropagation();
                        setProjectContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          project: proj
                        });
                      }
                    }}
                    className={`group w-full flex items-center justify-between rounded-xl transition-all duration-200 border ${
                      isDragOver
                        ? 'bg-indigo-600/20 border-indigo-500/80 scale-[1.02] shadow-lg shadow-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold pl-2.5'
                        : isSelected
                        ? 'bg-indigo-600/10 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-2.5 border-transparent'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                    }`}
                  >
                    <div className="flex-1 flex items-center min-w-0">
                      {/* Collapse/Expand toggle arrow */}
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedParents((prev) => ({
                              ...prev,
                              [proj.id]: !isExpanded
                            }));
                          }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition ml-1 cursor-pointer shrink-0"
                          title={isExpanded ? 'Collapse sub-projects' : 'Expand sub-projects'}
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      ) : (
                        <div className="w-6 shrink-0" />
                      )}

                      <button
                        onClick={() => {
                          onSelectProject(proj.id);
                          onSelectTag(null);
                          onSelectPriority(null);
                        }}
                        className="flex-1 flex items-center gap-2.5 px-2 py-2 text-sm text-left truncate cursor-pointer"
                      >
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-200 dark:border-slate-900"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span className="truncate flex items-center gap-1.5">
                          {renderProjectIcon(proj.id)}
                          {getProjectName(proj)}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center pr-2 shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono bg-slate-200/50 dark:bg-slate-900/50 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800/85 rounded-md group-hover:hidden">
                        {tasksCount[proj.id] || 0}
                      </span>
                      {/* Disallow editing/deleting Inbox default project */}
                      {proj.id !== 'project-inbox' && (
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditProject(proj);
                            }}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-slate-200 dark:hover:bg-slate-800/40 rounded transition cursor-pointer"
                            title="Edit project"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProject(proj.id);
                            }}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800/40 rounded transition cursor-pointer"
                            title="Delete project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nested Sub-projects rendering */}
                  {hasChildren && isExpanded && (
                    <div className="space-y-0.5 pl-3 border-l border-slate-200/50 dark:border-slate-800/60 ml-4 animate-fade-in">
                      {children.map((subProj) => {
                        const isSubSelected = selectedProjectId === subProj.id && !selectedTag && !selectedPriority;
                        const isSubDragOver = dragOverProjectId === subProj.id;

                        return (
                          <div
                            key={subProj.id}
                            onDragOver={(e) => {
                              e.preventDefault();
                            }}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              setDragOverProjectId(subProj.id);
                            }}
                            onDragLeave={() => {
                              setDragOverProjectId(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const taskId = e.dataTransfer.getData('text/plain');
                              if (taskId) {
                                onMoveTaskToProject(taskId, subProj.id);
                              }
                              setDragOverProjectId(null);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProjectContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                project: subProj
                              });
                            }}
                            className={`group w-full flex items-center justify-between rounded-xl transition-all duration-200 border pl-3 ${
                              isSubDragOver
                                ? 'bg-indigo-600/20 border-indigo-500/80 scale-[1.02] shadow-lg shadow-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold pl-5.5'
                                : isSubSelected
                                ? 'bg-indigo-600/10 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-3 border-transparent'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                            }`}
                          >
                            <button
                              onClick={() => {
                                onSelectProject(subProj.id);
                                onSelectTag(null);
                                onSelectPriority(null);
                              }}
                              className="flex-1 flex items-center gap-2 px-3 py-1.5 text-xs text-left truncate cursor-pointer"
                            >
                              <span 
                                className="w-1.5 h-1.5 rounded-full shrink-0 border border-slate-200 dark:border-slate-900"
                                style={{ backgroundColor: subProj.color }}
                              />
                              <span className="truncate flex items-center gap-1.5">
                                {renderProjectIcon(subProj.id)}
                                {getProjectName(subProj)}
                              </span>
                            </button>

                            <div className="flex items-center pr-2 shrink-0">
                              <span className="text-[9px] text-slate-500 font-mono bg-slate-200/50 dark:bg-slate-900/50 px-1 py-0.25 border border-slate-200 dark:border-slate-800/85 rounded group-hover:hidden">
                                {tasksCount[subProj.id] || 0}
                              </span>
                              <div className="hidden group-hover:flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditProject(subProj);
                                  }}
                                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-slate-200 dark:hover:bg-slate-800/40 rounded transition cursor-pointer"
                                  title="Edit sub-project"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteProject(subProj.id);
                                  }}
                                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800/40 rounded transition cursor-pointer"
                                  title="Delete sub-project"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">{t.priority}</h4>
          <div className="grid grid-cols-3 gap-1">
            {(['high', 'medium', 'low'] as const).map((p) => {
              const isSelected = selectedPriority === p && !selectedTag;
              const colorClass = 
                p === 'high' ? 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10' :
                p === 'medium' ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10' :
                'border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5 hover:bg-sky-500/10';

              const priorityLabel = p === 'high' ? t.high : p === 'medium' ? t.medium : t.low;

              return (
                <button
                  key={p}
                  onClick={() => {
                    onSelectPriority(isSelected ? null : p);
                    onSelectTag(null);
                    onSelectProject('all');
                  }}
                  className={`border rounded-lg py-1.5 px-2 text-xs font-semibold capitalize text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${colorClass} ${
                    isSelected ? 'ring-2 ring-indigo-500 border-transparent shadow-lg shadow-indigo-500/10' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{priorityLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags cloud */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">{t.tags}</h4>
          {activeTags.length === 0 ? (
            <p className="text-xs text-slate-500 px-3 italic">{t.noTags}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 px-3">
              {activeTags.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      onSelectTag(isSelected ? null : tag);
                      onSelectPriority(null);
                      onSelectProject('all');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 dark:bg-indigo-650 text-white border-indigo-400 shadow-md font-medium'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-750 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <Hash className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manual Import/Export (Backup) Footer */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-2.5 text-xs font-semibold">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onImportData}
          accept=".json"
          className="hidden"
        />
        <button
          onClick={handleImportClick}
          className="flex-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-2 rounded-xl flex items-center justify-center gap-2 transition shadow-sm dark:shadow-none cursor-pointer"
          title="Import tasks from a JSON file"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{t.importJson}</span>
        </button>
        <button
          onClick={onExportData}
          className="flex-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-2 rounded-xl flex items-center justify-center gap-2 transition shadow-sm dark:shadow-none cursor-pointer"
          title="Export tasks to a JSON file"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t.exportJson}</span>
        </button>
      </div>

      {/* Trash context menu */}
      {trashContextMenu && (
        <div 
          className="fixed z-50 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 min-w-[150px] animate-scale-up font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md"
          style={{ top: `${trashContextMenu.y}px`, left: `${trashContextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onEmptyTrash();
              setTrashContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 animate-pulse" />
            <span>{t.emptyTrash}</span>
          </button>
        </div>
      )}

      {/* Project context menu */}
      {projectContextMenu && (
        <div 
          className="fixed z-50 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 min-w-[170px] animate-scale-up font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md"
          style={{ top: `${projectContextMenu.y}px`, left: `${projectContextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onEditProject(projectContextMenu.project);
              setProjectContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t.editProject}</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              onArchiveProject(projectContextMenu.project.id);
              setProjectContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer border-t border-slate-100 dark:border-slate-800/80 mt-1 pt-2"
          >
            <Archive className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.archiveProject}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDeleteProject(projectContextMenu.project.id);
              setProjectContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer border-t border-slate-100 dark:border-slate-800/80 mt-1 pt-2"
          >
            <Trash2 className="w-3.5 h-3.5 animate-pulse" />
            <span>{language === 'ca' ? 'Eliminar projecte' : 'Delete Project'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

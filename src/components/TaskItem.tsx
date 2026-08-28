import React, { useState, useEffect, useRef } from 'react';
import type { Task, Project, Priority, Language } from '../types';
import { translations } from '../utils/translations';
import { 
  Check, Trash2, Calendar, ShieldAlert, Tag, Edit, Save, 
  X, ChevronDown, ChevronUp, CornerDownRight,
  Star, Hourglass, MessageSquare
} from 'lucide-react';
import { generateUUID } from '../utils/helpers';

interface TaskItemProps {
  task: Task;
  projects: Project[];
  language: Language;
  onToggleComplete: (id: string) => void;
  onUpdateTask: (id: string, updatedFields: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  tasks: Task[];
  onAddTask: (newTask: {
    title: string;
    description: string;
    projectId: string;
    dueDate: string;
    priority: Priority;
    tags: string[];
    waitingOn?: string;
    parentTaskId?: string;
  }) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const renderTextWithLinks = (text: string): React.ReactNode => {
  if (!text) return null;
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+?(?=[.,?!;:)]*(?:\s|$)))/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    const isUrl = /^(?:https?:\/\/|www\.)/i.test(part);
    if (isUrl) {
      const href = part.toLowerCase().startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  projects,
  language,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  tasks,
  onAddTask,
  onContextMenu,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDraggable, setIsDraggable] = useState(true);

  // Edit fields state
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const [editProject, setEditProject] = useState(task.projectId);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editDate, setEditDate] = useState(task.dueDate);
  const [editTags, setEditTags] = useState(task.tags.join(', '));
  const [editWaitingOn, setEditWaitingOn] = useState(task.waitingOn || '');
  const [editParentTaskId, setEditParentTaskId] = useState(task.parentTaskId || '');

  // Subtask field state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Comment field state
  const [newCommentText, setNewCommentText] = useState('');

  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDateBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch {
        // Fallback for older browsers
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  // Sync edit state with prop updates (e.g., inline priority cycle-clicks)
  useEffect(() => {
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditProject(task.projectId);
    setEditPriority(task.priority);
    setEditDate(task.dueDate);
    setEditTags(task.tags.join(', '));
    setEditWaitingOn(task.waitingOn || '');
    setEditParentTaskId(task.parentTaskId || '');
  }, [task]);

  const t = translations[language];

  const handleSave = () => {
    const updatedTags = editTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    onUpdateTask(task.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      projectId: editProject,
      priority: editPriority,
      dueDate: editDate,
      tags: updatedTags,
      waitingOn: editWaitingOn.trim() || undefined,
      parentTaskId: editParentTaskId || undefined,
    });
    setIsEditing(false);
    setIsDraggable(true);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditProject(task.projectId);
    setEditPriority(task.priority);
    setEditDate(task.dueDate);
    setEditTags(task.tags.join(', '));
    setEditWaitingOn(task.waitingOn || '');
    setEditParentTaskId(task.parentTaskId || '');
    setIsEditing(false);
    setIsDraggable(true);
  };

  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (!next) {
        setIsDraggable(true);
      }
      return next;
    });
  };

  // Subtasks actions
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    onAddTask({
      title: newSubtaskTitle.trim(),
      description: '',
      projectId: task.projectId,
      dueDate: '',
      priority: task.priority,
      tags: [],
      parentTaskId: task.id,
    });
    setNewSubtaskTitle('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddComment();
    }
  };

  // Comments actions
  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment = {
      id: generateUUID(),
      text: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    };

    onUpdateTask(task.id, {
      comments: [...(task.comments || []), newComment],
    });
    setNewCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    const updatedComments = (task.comments || []).filter((c) => c.id !== commentId);
    onUpdateTask(task.id, { comments: updatedComments });
  };

  const handleCyclePriority = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card expand
    const priorities: Priority[] = ['low', 'medium', 'high'];
    const currentIndex = priorities.indexOf(task.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    onUpdateTask(task.id, { priority: priorities[nextIndex] });
  };

  const getProjectName = (p: Project) => {
    if (p.id === 'project-inbox') return t.inbox;
    if (p.id === 'project-personal') return t.personal;
    if (p.id === 'project-work') return t.work;
    return p.name;
  };

  // Due Date status
  const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
  const projectInfo = projects.find((p) => p.id === task.projectId);

  // Subtasks progress
  const subtasks = tasks.filter((t) => t.parentTaskId === task.id && !t.isDeleted);
  const completedSubtasks = subtasks.filter((st) => st.completed).length;
  const totalSubtasks = subtasks.length;

  return (
    <div 
      draggable={!isEditing && !task.isDeleted && isDraggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onContextMenu={onContextMenu}
      className={`glass-panel rounded-2xl p-4 glass-panel-hover transition duration-200 border ${
        task.isDeleted
          ? 'opacity-70 border-slate-205 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 cursor-default'
          : !isDraggable
            ? 'cursor-default border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none'
            : 'cursor-grab active:cursor-grabbing border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none'
      } ${
        task.completed 
          ? 'opacity-60 border-slate-200 dark:border-slate-900/60' 
          : ''
      } ${isOverdue && !task.isDeleted ? 'border-rose-500/35 bg-rose-500/5 dark:bg-rose-500/2 dark:border-rose-500/25' : ''}`}
    >
      {/* Primary Card View */}
      {isEditing ? (
        <div onKeyDown={handleEditKeyDown} className="space-y-3.5 text-slate-800 dark:text-slate-100">
          {/* Editing Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.editTask}</span>
            <div className="flex gap-1.5">
              <button 
                onClick={handleCancelEdit} 
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleSave} 
                className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-50 flex items-center gap-1 text-[11px] font-semibold px-2.5 transition shadow-md shadow-indigo-650/10"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t.save}</span>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-500 font-semibold">{t.title}</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-semibold">{t.description}</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">{t.projects}</label>
                <select
                  value={editProject}
                  onChange={(e) => setEditProject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{getProjectName(p)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">{t.priority}</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">{t.low}</option>
                  <option value="medium">{t.medium}</option>
                  <option value="high">{t.high}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">{t.dueDate}</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.25 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-semibold">{t.tags} (comma-separated)</label>
                <input
                   type="text"
                   value={editTags}
                   onChange={(e) => setEditTags(e.target.value)}
                   placeholder={t.editTagsPlaceholder}
                   className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-600"
                />
              </div>
            </div>

            {(() => {
              const projectWaitees = tasks
                .filter((t) => t.projectId === task.projectId && t.waitingOn && t.id !== task.id)
                .flatMap((t) => t.waitingOn ? t.waitingOn.split(',') : [])
                .map((w) => w.trim())
                .filter(Boolean);
              const uniqueProjectWaitees = Array.from(new Set(projectWaitees));

              return (
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">{t.waiting}</label>
                  <input
                    type="text"
                    value={editWaitingOn}
                    onChange={(e) => setEditWaitingOn(e.target.value)}
                    placeholder={t.waitingPlaceholder}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-600"
                  />
                  {uniqueProjectWaitees.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                      <span className="text-slate-450 dark:text-slate-500 font-semibold">{language === 'ca' ? 'Sugerits:' : 'Suggested:'}</span>
                      {uniqueProjectWaitees.map((name) => {
                        const currentList = editWaitingOn.split(',').map((n) => n.trim().toLowerCase());
                        const isSelected = currentList.includes(name.toLowerCase());
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                const newList = editWaitingOn
                                  .split(',')
                                  .map((n) => n.trim())
                                  .filter((n) => n.toLowerCase() !== name.toLowerCase());
                                setEditWaitingOn(newList.join(', '));
                              } else {
                                const trimmed = editWaitingOn.trim();
                                const newList = trimmed ? `${trimmed}, ${name}` : name;
                                setEditWaitingOn(newList);
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

            {(() => {
              // Find all potential parent tasks in the same project
              // Exclude this task and any of its descendants to prevent circular parenting
              const isDescendant = (parentId: string, childId: string): boolean => {
                let current = tasks.find((t) => t.id === childId);
                while (current) {
                  if (current.parentTaskId === parentId) return true;
                  current = current.parentTaskId ? tasks.find((t) => t.id === current!.parentTaskId) : undefined;
                }
                return false;
              };

              const potentialParents = tasks.filter(
                (t) => 
                  t.id !== task.id && 
                  !t.isDeleted && 
                  t.projectId === editProject &&
                  !isDescendant(task.id, t.id)
              );

              return (
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold">{t.parentTask}</label>
                  <select
                    value={editParentTaskId}
                    onChange={(e) => setEditParentTaskId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">{t.noParent}</option>
                    {potentialParents.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Primary Row */}
          <div className="flex items-center gap-3">
            {/* Custom Interactive Checkbox */}
            <button
              onClick={() => !task.isDeleted && onToggleComplete(task.id)}
              disabled={task.isDeleted}
              className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-200 ${
                task.isDeleted ? 'cursor-not-allowed opacity-50' : 'active:scale-90'
              } ${
                task.completed
                  ? 'bg-indigo-650 border-indigo-500 text-slate-50 shadow-[0_0_12px_rgba(99,102,241,0.25)] animate-check-pop'
                  : 'border-slate-350 dark:border-slate-700 hover:border-slate-450 dark:hover:border-slate-505 bg-slate-100 dark:bg-slate-900/20'
              }`}
            >
              {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            {/* Star button */}
            {!task.isDeleted && (
              <button
                type="button"
                onClick={() => onUpdateTask(task.id, { starred: !task.starred })}
                className="p-1 text-slate-400 hover:text-amber-500 transition duration-150 shrink-0 cursor-pointer"
                title={task.starred ? 'Unstar task' : 'Star task'}
              >
                <Star className={`w-4 h-4 ${task.starred ? 'text-amber-500 fill-amber-500' : 'text-slate-400 dark:text-slate-500 hover:fill-amber-500/10'}`} />
              </button>
            )}

            {/* Task Info Area */}
            <div className="flex-1 min-w-0" onClick={handleToggleExpand}>
              <span className={`block text-sm font-semibold truncate cursor-pointer transition ${
                task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}>
                {renderTextWithLinks(task.title)}
              </span>
              
              {/* Badges Metadata */}
              <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] items-center">
                {/* Project Badge */}
                {projectInfo && (
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full shrink-0 font-medium">
                    <span 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: projectInfo.color }}
                    />
                    <span>{getProjectName(projectInfo)}</span>
                  </span>
                )}

                {/* Priority Badge Button */}
                <button
                  type="button"
                  onClick={handleCyclePriority}
                  disabled={task.isDeleted}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider shrink-0 transition ${
                    task.isDeleted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105 active:scale-95'
                  } ${
                    task.priority === 'high' ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:border-rose-500/50' :
                    task.priority === 'medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:border-amber-500/50' :
                    'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:border-sky-500/50'
                  }`}
                  title={task.isDeleted ? undefined : (language === 'ca' ? 'Canvia la Prioritat' : 'Cycle Priority')}
                >
                  <ShieldAlert className="w-2.5 h-2.5" />
                  <span>{task.priority === 'high' ? t.high : task.priority === 'medium' ? t.medium : t.low}</span>
                </button>

                 {/* Due Date Badge Button */}
                 <span className="relative flex items-center shrink-0">
                   <button
                     type="button"
                     onClick={(e) => !task.isDeleted && handleDateBadgeClick(e)}
                     disabled={task.isDeleted}
                     className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition ${
                       task.isDeleted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105 active:scale-95'
                     } ${
                       task.dueDate
                         ? isOverdue && !task.isDeleted
                           ? 'bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-300 font-bold hover:border-rose-500/50'
                           : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-600'
                         : 'bg-slate-50/50 dark:bg-slate-950/20 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:text-slate-650 hover:border-solid hover:border-slate-350 dark:hover:border-slate-700'
                     }`}
                     title={task.isDeleted ? undefined : (language === 'ca' ? 'Canvia la data de venciment' : 'Change due date')}
                   >
                     <Calendar className="w-2.5 h-2.5" />
                     <span>{task.dueDate || (language === 'ca' ? '+ Data' : '+ Date')}</span>
                   </button>
                   
                   <input
                     ref={dateInputRef}
                     type="date"
                     value={task.dueDate || ''}
                     onChange={(e) => onUpdateTask(task.id, { dueDate: e.target.value })}
                     className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                   />

                   {task.dueDate && !task.isDeleted && (
                     <button
                       type="button"
                       onClick={(e) => {
                         e.stopPropagation();
                         e.preventDefault();
                         onUpdateTask(task.id, { dueDate: '' });
                       }}
                       className="absolute -top-1 -right-1 z-10 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-350 dark:hover:bg-slate-700 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-300 dark:border-slate-700 text-[8px] transition cursor-pointer font-bold"
                       title={language === 'ca' ? 'Elimina la data' : 'Remove due date'}
                     >
                       ×
                     </button>
                   )}
                 </span>

                {/* Waiting On Badge */}
                {task.waitingOn && (
                  <div className="flex items-center flex-wrap gap-1 shrink-0">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/35 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-semibold tracking-wide shrink-0">
                      <Hourglass className="w-2.5 h-2.5" />
                      <span>{t.waitingOnLabel}:</span>
                    </span>
                    {task.waitingOn.split(',').map((w) => w.trim()).filter(Boolean).map((waiteer, idx) => (
                      <span 
                        key={idx} 
                        className="bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20 dark:border-amber-500/30 text-[9px] font-bold tracking-wide uppercase shrink-0"
                      >
                        {waiteer}
                      </span>
                    ))}
                  </div>
                )}

                {/* Subtask count indicator */}
                {totalSubtasks > 0 && (
                  <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full shrink-0 font-mono text-[9px]">
                    {completedSubtasks}/{totalSubtasks} {t.subtasks.toLowerCase()}
                  </span>
                )}

                {/* Comments count indicator */}
                {task.comments && task.comments.length > 0 && (
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full shrink-0 font-mono text-[9px]">
                    <MessageSquare className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                    <span>{task.comments.length}</span>
                  </span>
                )}

                {/* Tags */}
                {task.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 px-1.5 py-0.25 rounded-md shrink-0">
                    <Tag className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Actions Menu */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleToggleExpand}
                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition"
                title="Toggle details"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
               {!task.isDeleted && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setIsDraggable(true);
                  }}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition"
                  title="Edit task"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onDeleteTask(task.id)}
                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition"
                title={task.isDeleted ? "Delete task permanently" : "Delete task"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expandable Details Pane */}
          {isExpanded && (
            <div 
              className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-4 animate-fade-in text-xs"
              onMouseEnter={() => setIsDraggable(false)}
              onMouseLeave={() => setIsDraggable(true)}
            >
              {/* Task Description */}
              {task.description && (
                <div className="space-y-1 bg-slate-100 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400 block">{t.description}</span>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{renderTextWithLinks(task.description)}</p>
                </div>
              )}

              {/* Subtasks checklist */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400 block">{t.subtasks}</span>
                
                {/* List of subtasks */}
                {subtasks.length > 0 && (
                  <div className="space-y-3.5 pl-4 border-l-2 border-slate-200/50 dark:border-slate-800 ml-2 mt-2">
                    {subtasks.map((subtask) => (
                      <TaskItem
                        key={subtask.id}
                        task={subtask}
                        projects={projects}
                        language={language}
                        onToggleComplete={onToggleComplete}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                        tasks={tasks}
                        onAddTask={onAddTask}
                        onContextMenu={onContextMenu}
                      />
                    ))}
                  </div>
                )}

                {/* Subtask Creation Form */}
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center mt-2.5 pl-0.5">
                    <CornerDownRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                  </div>
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder={t.addSubtask}
                    className="flex-1 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-slate-505 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition"
                  >
                    {t.add}
                  </button>
                </form>
              </div>

              {/* Comments Section */}
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                <span className="text-[10px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400 block">{t.comments}</span>
                
                {/* List of comments */}
                {task.comments && task.comments.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {[...task.comments]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((comment) => (
                        <div 
                          key={comment.id} 
                          className="group relative flex flex-col gap-1 py-2 px-3 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800/40 rounded-xl hover:border-slate-300 dark:hover:border-slate-750 transition duration-150"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500">
                              {new Date(comment.createdAt).toLocaleString(language === 'ca' ? 'ca' : 'en', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            {!task.isDeleted && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition"
                                title={t.deleteComment}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-slate-755 dark:text-slate-300 whitespace-pre-wrap leading-relaxed pr-6">
                            {renderTextWithLinks(comment.text)}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                {/* Comment Creation Form */}
                {!task.isDeleted && (
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <div className="w-4 h-4 shrink-0 flex items-center justify-center mt-2.5 pl-0.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                    </div>
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder={t.addComment}
                      rows={1}
                      onKeyDown={handleCommentKeyDown}
                      className="flex-1 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-slate-505 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition"
                    >
                      {t.add}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import { useState, useEffect, useRef, useTransition } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { SettingsModal } from './components/SettingsModal';
import { EditProjectModal } from './components/EditProjectModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Project, Task, Priority, SyncSettings, AppData, Language, Theme } from './types';
import { getInitialData, generateUUID, validateImportedData } from './utils/helpers';
import { fetchFromCloud, saveToCloud } from './utils/sync';

export default function App() {
  // 1. Language State
  const [language, setLanguage] = useLocalStorage<Language>('coses_language', () => {
    if (typeof navigator !== 'undefined') {
      return navigator.language.startsWith('ca') ? 'ca' : 'en';
    }
    return 'en';
  });

  // Theme State
  const [theme, setTheme] = useLocalStorage<Theme>('coses_theme', 'dark');

  // Apply theme to document element
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System Theme logic
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme();

    const listener = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // 2. App Data State (Initial data utilizes language setting on mount)
  const [appData, setAppData] = useLocalStorage<AppData>('coses_data', () => getInitialData(language));
  const [syncSettings, setSyncSettings] = useLocalStorage<SyncSettings>('coses_sync_settings', {
    provider: 'none',
    token: '',
    targetId: '',
    customUrl: '',
    projectPath: '',
  });

  const { projects, tasks } = appData;

  // UI Filters State
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Sync Control State
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>(
    syncSettings.provider === 'none' ? 'local' : 'synced'
  );
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(syncSettings.provider === 'none');

  // Debouncing reference for cloud saves
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track initial render to prevent instant empty saves
  const isFirstRender = useRef(true);

  const [, startTransition] = useTransition();

  // Load from Cloud on Mount
  useEffect(() => {
    if (syncSettings.provider === 'none') {
      setIsInitialSyncDone(true);
      setSyncStatus('local');
      return;
    }

    async function loadCloudData() {
      setSyncStatus('syncing');
      try {
        const remoteData = await fetchFromCloud(syncSettings);
        if (remoteData && (remoteData.projects || remoteData.tasks)) {
          setAppData(remoteData);
        }
        setSyncStatus('synced');
      } catch (error) {
        console.error('Failed initial sync fetch:', error);
        setSyncStatus('error');
      } finally {
        setIsInitialSyncDone(true);
      }
    }

    loadCloudData();
  }, [syncSettings.provider, syncSettings.targetId, syncSettings.token, syncSettings.customUrl, syncSettings.projectPath]);

  // Debounced Auto-Save to Cloud when local data changes
  useEffect(() => {
    // Skip if cloud sync is disabled or initial loading isn't completed
    if (syncSettings.provider === 'none' || !isInitialSyncDone) {
      return;
    }

    // Skip the absolute first render to avoid uploading default values before fetching
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Debounce the save requests
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    setSyncStatus('syncing');
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await saveToCloud(syncSettings, { projects, tasks });
        setSyncStatus('synced');
      } catch (error) {
        console.error('Failed to auto-save to cloud:', error);
        setSyncStatus('error');
      }
    }, 1500); // 1.5s debounce

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [tasks, projects, syncSettings, isInitialSyncDone]);

  // Manual Trigger Sync
  const handleTriggerSync = async () => {
    if (syncSettings.provider === 'none') return;
    setSyncStatus('syncing');
    try {
      const remoteData = await fetchFromCloud(syncSettings);
      if (remoteData) {
        setAppData(remoteData);
      }
      setSyncStatus('synced');
    } catch (error) {
      console.error('Manual fetch sync failed:', error);
      setSyncStatus('error');
    }
  };

  // Test Cloud Settings Sync Function
  // Test Cloud Settings Sync Function (fetches if Gist ID is given, saves if empty)
  const handleTestSync = async (testSettings: SyncSettings): Promise<string> => {
    if (testSettings.targetId) {
      // Connect to existing backup - test connection by pulling
      const remoteData = await fetchFromCloud(testSettings);
      validateImportedData(remoteData);
      return testSettings.targetId;
    } else {
      // Setup new backup - create Gist using local tasks
      const createdId = await saveToCloud(testSettings, { projects, tasks });
      return createdId;
    }
  };

  const handleSaveSyncSettings = (newSettings: SyncSettings) => {
    isFirstRender.current = true; // reset guard to prevent immediate auto-save uploads
    setIsInitialSyncDone(newSettings.provider === 'none');
    setSyncSettings(newSettings);
    setSyncStatus(newSettings.provider === 'none' ? 'local' : 'synced');
  };

  // Migrate old data if present on mount
  useEffect(() => {
    let needsMigration = false;
    for (const t of appData.tasks) {
      if ((t as any).subtasks && (t as any).subtasks.length > 0) {
        needsMigration = true;
        break;
      }
    }

    const hasInbox = appData.projects.some((p) => p.id === 'project-inbox');

    if (needsMigration || !hasInbox) {
      setAppData((prev) => {
        let updatedData = needsMigration ? validateImportedData(prev) : prev;
        const stillNeedsInbox = !updatedData.projects.some((p) => p.id === 'project-inbox');
        if (stillNeedsInbox) {
          const inboxProj: Project = {
            id: 'project-inbox',
            name: language === 'ca' ? 'Bústia' : 'Inbox',
            color: '#818cf8',
            icon: 'Inbox'
          };
          updatedData = {
            ...updatedData,
            projects: [inboxProj, ...updatedData.projects]
          };
        }
        return updatedData;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add Task
  const handleAddTask = (newTask: {
    title: string;
    description: string;
    projectId: string;
    dueDate: string;
    priority: Priority;
    tags: string[];
    waitingOn?: string;
    parentTaskId?: string;
  }) => {
    const taskRecord: Task = {
      id: generateUUID(),
      ...newTask,
      completed: false,
      comments: [],
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      tasks: [taskRecord, ...prev.tasks],
    }));
  };

  // Toggle Task Completion status (stamping completion date on complete)
  const handleToggleComplete = (id: string) => {
    setAppData((prev) => {
      const taskToToggle = prev.tasks.find((t) => t.id === id);
      if (!taskToToggle) return prev;

      const nextCompleted = !taskToToggle.completed;
      const completedAt = nextCompleted ? new Date().toISOString() : undefined;

      let updatedTasks = [...prev.tasks];

      if (nextCompleted) {
        // Complete this task and all its descendants
        const getDescendantIds = (parentId: string): string[] => {
          const children = updatedTasks.filter((t) => t.parentTaskId === parentId);
          return children.flatMap((c) => [c.id, ...getDescendantIds(c.id)]);
        };
        const descendantIds = getDescendantIds(id);
        const targetIds = [id, ...descendantIds];

        updatedTasks = updatedTasks.map((t) => 
          targetIds.includes(t.id)
            ? { 
                ...t, 
                completed: true,
                completedAt: t.completedAt || completedAt
              }
            : t
        );
      } else {
        // Uncomplete this task and all its ancestors
        const getAncestorIds = (taskId: string): string[] => {
          const t = updatedTasks.find((task) => task.id === taskId);
          if (t?.parentTaskId) {
            return [t.parentTaskId, ...getAncestorIds(t.parentTaskId)];
          }
          return [];
        };
        const ancestorIds = getAncestorIds(id);
        const targetIds = [id, ...ancestorIds];

        updatedTasks = updatedTasks.map((t) => 
          targetIds.includes(t.id)
            ? { 
                ...t, 
                completed: false,
                completedAt: undefined
              }
            : t
        );
      }

      return {
        ...prev,
        tasks: updatedTasks,
      };
    });
  };

  // Update Task Fields (inline editing, subtasks checklist edits, etc.)
  const handleUpdateTask = (id: string, updatedFields: Partial<Task>) => {
    setAppData((prev) => {
      let updatedTasks = prev.tasks.map((t) => 
        t.id === id ? { ...t, ...updatedFields } : t
      );

      // If projectId is changed, recursively update all descendants' projectId
      if (updatedFields.projectId) {
        const updateDescendantProjects = (parentId: string, projId: string) => {
          updatedTasks = updatedTasks.map((t) => {
            if (t.parentTaskId === parentId) {
              // Update project ID and recurse
              updateDescendantProjects(t.id, projId);
              return { ...t, projectId: projId };
            }
            return t;
          });
        };
        updateDescendantProjects(id, updatedFields.projectId);
      }

      return {
        ...prev,
        tasks: updatedTasks,
      };
    });
  };

  // Delete Task (soft-delete on first call, permanent delete on second call)
  const handleDeleteTask = (id: string) => {
    setAppData((prev) => {
      const taskToDelete = prev.tasks.find((t) => t.id === id);
      if (taskToDelete?.isDeleted) {
        // Permanent delete: filter out task and all its descendants
        const getDescendantIds = (parentId: string): string[] => {
          const children = prev.tasks.filter((t) => t.parentTaskId === parentId);
          return children.flatMap((c) => [c.id, ...getDescendantIds(c.id)]);
        };
        const deletedIds = [id, ...getDescendantIds(id)];
        return {
          ...prev,
          tasks: prev.tasks.filter((t) => !deletedIds.includes(t.id)),
        };
      } else {
        // Soft delete: mark task and all its descendants as isDeleted
        const getDescendantIds = (parentId: string): string[] => {
          const children = prev.tasks.filter((t) => t.parentTaskId === parentId);
          return children.flatMap((c) => [c.id, ...getDescendantIds(c.id)]);
        };
        const deletedIds = [id, ...getDescendantIds(id)];
        return {
          ...prev,
          tasks: prev.tasks.map((t) => 
            deletedIds.includes(t.id) 
              ? { ...t, isDeleted: true } 
              : t
          ),
        };
      }
    });
  };

  // Restore Task
  const handleRestoreTask = (id: string) => {
    setAppData((prev) => {
      const getDescendantIds = (parentId: string): string[] => {
        const children = prev.tasks.filter((t) => t.parentTaskId === parentId);
        return children.flatMap((c) => [c.id, ...getDescendantIds(c.id)]);
      };
      const descendantIds = getDescendantIds(id);
      
      const getParentIds = (taskId: string): string[] => {
        const t = prev.tasks.find((task) => task.id === taskId);
        if (t?.parentTaskId) {
          return [t.parentTaskId, ...getParentIds(t.parentTaskId)];
        }
        return [];
      };
      const parentIds = getParentIds(id);

      const targetIds = [id, ...descendantIds, ...parentIds];

      return {
        ...prev,
        tasks: prev.tasks.map((t) => 
          targetIds.includes(t.id) 
            ? { ...t, isDeleted: false, deletedWithProject: undefined } 
            : t
        ),
      };
    });
  };

  // Add Project
  const handleAddProject = (name: string, color: string, parentId?: string) => {
    const newProject: Project = {
      id: `project-${generateUUID()}`,
      name,
      color,
      parentId,
    };
    setAppData((prev) => ({
      ...prev,
      projects: [...prev.projects, newProject],
    }));
  };

  // Update Project
  const handleUpdateProject = (projectId: string, updatedFields: Partial<Project>) => {
    if (projectId === 'project-inbox') return;
    setAppData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => 
        p.id === projectId ? { ...p, ...updatedFields } : p
      ),
    }));
  };

  // Delete Project (soft-deletes project and its tasks on first call, permanent delete on second call)
  const handleDeleteProject = (projectIdToDelete: string) => {
    if (projectIdToDelete === 'project-inbox') return;
    setAppData((prev) => {
      const projectToDelete = prev.projects.find((p) => p.id === projectIdToDelete);
      if (projectToDelete?.isDeleted) {
        // Permanent delete: filter out project and its children, plus all their tasks
        const deletedProjectIds = [
          projectIdToDelete,
          ...prev.projects.filter((p) => p.parentId === projectIdToDelete).map((p) => p.id),
        ];
        return {
          projects: prev.projects.filter((p) => !deletedProjectIds.includes(p.id)),
          tasks: prev.tasks.filter((t) => !deletedProjectIds.includes(t.projectId)),
        };
      } else {
        // Soft delete
        const deletedProjectIds = [
          projectIdToDelete,
          ...prev.projects.filter((p) => p.parentId === projectIdToDelete).map((p) => p.id),
        ];
        const updatedProjects = prev.projects.map((p) => 
          deletedProjectIds.includes(p.id) ? { ...p, isDeleted: true } : p
        );
        const updatedTasks = prev.tasks.map((t) => 
          deletedProjectIds.includes(t.projectId) && !t.isDeleted
            ? { ...t, isDeleted: true, deletedWithProject: true }
            : t
        );
        return {
          projects: updatedProjects,
          tasks: updatedTasks,
        };
      }
    });
    if (selectedProjectId === projectIdToDelete) {
      setSelectedProjectId('all');
    }
  };

  // Restore Project
  const handleRestoreProject = (projectId: string) => {
    setAppData((prev) => {
      const projectToRestore = prev.projects.find((p) => p.id === projectId);
      if (!projectToRestore) return prev;

      // Find projects to restore (this, parent if deleted, and all children if deleted)
      const targetProjectIds = [projectId];
      if (projectToRestore.parentId) {
        targetProjectIds.push(projectToRestore.parentId);
      }
      const childProjectIds = prev.projects.filter((p) => p.parentId === projectId).map((p) => p.id);
      targetProjectIds.push(...childProjectIds);

      const updatedProjects = prev.projects.map((p) => 
        targetProjectIds.includes(p.id) ? { ...p, isDeleted: false } : p
      );
      const updatedTasks = prev.tasks.map((t) => 
        targetProjectIds.includes(t.projectId) && t.deletedWithProject
          ? { ...t, isDeleted: false, deletedWithProject: undefined }
          : t
      );

      return {
        projects: updatedProjects,
        tasks: updatedTasks,
      };
    });
  };

  // Archive Project
  const handleArchiveProject = (projectId: string) => {
    if (projectId === 'project-inbox') return;
    setAppData((prev) => {
      // Archive this project and all its subprojects
      const projectsToArchive = [
        projectId,
        ...prev.projects.filter((p) => p.parentId === projectId).map((p) => p.id),
      ];

      return {
        ...prev,
        projects: prev.projects.map((p) =>
          projectsToArchive.includes(p.id) ? { ...p, isArchived: true } : p
        ),
      };
    });
    if (selectedProjectId === projectId) {
      setSelectedProjectId('all');
    }
  };

  // Unarchive Project
  const handleUnarchiveProject = (projectId: string) => {
    setAppData((prev) => {
      // Unarchive this project (and parent project if it's archived)
      const projectToUnarchive = prev.projects.find((p) => p.id === projectId);
      const projectsToUnarchive = [projectId];
      if (projectToUnarchive?.parentId) {
        projectsToUnarchive.push(projectToUnarchive.parentId);
      }

      return {
        ...prev,
        projects: prev.projects.map((p) =>
          projectsToUnarchive.includes(p.id) ? { ...p, isArchived: false } : p
        ),
      };
    });
  };

  // Move Task to Project (via Drag & Drop)
  const handleMoveTaskToProject = (taskId: string, projectId: string) => {
    setAppData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => 
        t.id === taskId ? { ...t, projectId } : t
      ),
    }));
  };

  // Reorder Tasks (via Drag & Drop re-ordering inside TaskList)
  const handleReorderTasks = (draggedId: string, targetId: string) => {
    setAppData((prev) => {
      const tasksCopy = [...prev.tasks];
      const draggedIndex = tasksCopy.findIndex((t) => t.id === draggedId);
      const targetIndex = tasksCopy.findIndex((t) => t.id === targetId);
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedTask] = tasksCopy.splice(draggedIndex, 1);
        tasksCopy.splice(targetIndex, 0, draggedTask);
      }
      return {
        ...prev,
        tasks: tasksCopy,
      };
    });
  };

  // Empty Trash (permanently deletes all soft-deleted projects and tasks)
  const handleEmptyTrash = () => {
    setAppData((prev) => ({
      projects: prev.projects.filter((p) => !p.isDeleted),
      tasks: prev.tasks.filter((t) => !t.isDeleted),
    }));
  };


  // Export Data to local JSON
  const handleExportData = () => {
    const dataStr = JSON.stringify({ projects, tasks }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coses-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import Data from local JSON
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const validated = validateImportedData(parsed);
        setAppData(validated);
        alert('Data imported successfully!');
      } catch (err: any) {
        alert(`Failed to import data: ${err.message || 'Invalid file format'}`);
      }
    };
    fileReader.readAsText(file);
    // Reset file value
    e.target.value = '';
  };

  // Split tasks into active and deleted
  const activeTasks = tasks.filter((t) => {
    if (t.isDeleted) return false;
    const taskProj = projects.find((p) => p.id === t.projectId);
    if (taskProj && taskProj.isArchived) return false;
    return true;
  });
  const deletedTasks = tasks.filter((t) => t.isDeleted);

  // Calculate project counters (rolling up child sub-project counts into parents, excluding deleted tasks)
  const tasksCount = {
    all: activeTasks.length,
    today: activeTasks.filter((t) => t.dueDate === new Date().toISOString().split('T')[0]).length,
    starred: activeTasks.filter((t) => {
      if (t.starred) return true;
      const getDescendantTasks = (tId: string): Task[] => {
        const children = activeTasks.filter((child) => child.parentTaskId === tId);
        return children.concat(children.flatMap((c) => getDescendantTasks(c.id)));
      };
      return getDescendantTasks(t.id).some((st) => st.starred);
    }).length,
    waiting: activeTasks.filter((t) => t.waitingOn).length,
    trash: deletedTasks.length,
    logbook: activeTasks.filter((t) => t.completed).length,
    ...projects.reduce((acc, proj) => {
      if (proj.isDeleted) return acc;
      const childIds = projects.filter((p) => p.parentId === proj.id && !p.isDeleted).map((p) => p.id);
      const targetProjectIds = [proj.id, ...childIds];
      acc[proj.id] = activeTasks.filter((t) => targetProjectIds.includes(t.projectId)).length;
      return acc;
    }, {} as Record<string, number>),
  };

  // Extract all active tags (excluding deleted tasks)
  const activeTags = Array.from(new Set(activeTasks.flatMap((t) => t.tags)));

  return (
    <div className="flex bg-[var(--bg-app)] text-[var(--text-main)] h-screen overflow-hidden transition-colors duration-300">
      {/* Sidebar navigation */}
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedTag={selectedTag}
        selectedPriority={selectedPriority}
        tasksCount={tasksCount}
        activeTags={activeTags}
        syncSettings={syncSettings}
        syncStatus={syncStatus}
        language={language}
        onSelectProject={(id) => startTransition(() => setSelectedProjectId(id))}
        onSelectTag={(tag) => startTransition(() => setSelectedTag(tag))}
        onSelectPriority={(p) => startTransition(() => setSelectedPriority(p))}
        onAddProject={handleAddProject}
        onDeleteProject={handleDeleteProject}
        onEditProject={(proj) => setEditingProject(proj)}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onOpenSettings={() => setIsSyncModalOpen(true)}
        onTriggerSync={handleTriggerSync}
        onMoveTaskToProject={handleMoveTaskToProject}
        onEmptyTrash={handleEmptyTrash}
        onArchiveProject={handleArchiveProject}
      />

      {/* Main Panel Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-6 md:p-10 space-y-6">
        {/* Task Creation Form */}
        <TaskForm
          projects={projects}
          activeProjectId={selectedProjectId}
          language={language}
          onAddTask={handleAddTask}
          tasks={tasks}
        />

        {/* Task List container */}
        <div className="flex-1 overflow-hidden">
          <TaskList
            tasks={tasks}
            projects={projects}
            selectedProjectId={selectedProjectId}
            selectedTag={selectedTag}
            selectedPriority={selectedPriority}
            language={language}
            onToggleComplete={handleToggleComplete}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onRestoreTask={handleRestoreTask}
            onRestoreProject={handleRestoreProject}
            onDeleteProject={handleDeleteProject}
            onUnarchiveProject={handleUnarchiveProject}
            onSelectProject={(id) => startTransition(() => setSelectedProjectId(id))}
            onReorderTasks={handleReorderTasks}
            onAddTask={handleAddTask}
          />
        </div>
      </main>

      {/* Combined Settings Modal (Language, Theme, Cloud Sync) */}
      <SettingsModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncSettings={syncSettings}
        onSaveSyncSettings={handleSaveSyncSettings}
        onTestSync={handleTestSync}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onThemeChange={setTheme}
      />

      {editingProject && (
        <EditProjectModal
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          project={editingProject}
          projects={projects}
          onSave={handleUpdateProject}
          language={language}
        />
      )}
    </div>
  );
}

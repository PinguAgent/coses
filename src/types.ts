export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  starred?: boolean;
}

export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: Priority;
  tags: string[];
  subtasks: Subtask[];
  createdAt: string;
  starred?: boolean;
  waitingOn?: string;
  isDeleted?: boolean;
  deletedWithProject?: boolean;
  completedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string; // Hex color code for indicators
  parentId?: string;
  isDeleted?: boolean;
  isArchived?: boolean;
  icon?: string; // Name of Lucide icon
}

export type SyncProvider = 'none' | 'github' | 'gitlab';

export interface SyncSettings {
  provider: SyncProvider;
  token: string;
  targetId: string; // Gist ID or Snippet ID
  customUrl?: string; // e.g., self-hosted GitLab instance URL
  /**
   * GitLab only. Numeric project ID or full path (e.g. 'eduard.capell/coses').
   * When set, snippets are read/written as project snippets, which lets a token
   * be scoped to a single project instead of all personal snippets.
   * When empty, personal snippets are used.
   */
  projectPath?: string;
}

// AppData represents the core serializable data (projects and tasks)
export interface AppData {
  projects: Project[];
  tasks: Task[];
}

export interface AppState extends AppData {
  selectedProjectId: string; // 'all', 'today', or a specific project ID
  selectedTag: string | null;
  selectedPriority: Priority | null;
}

export type Language = 'en' | 'ca';
export type Theme = 'light' | 'dark' | 'system';



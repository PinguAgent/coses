import type { AppData, Project, Task, Language } from '../types';

/**
 * Robust UUID generator using the browser's crypto API.
 */
export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates the structure of imported JSON data.
 */
export function validateImportedData(data: any): AppData {
  if (!data || typeof data !== 'object') {
    throw new Error('Data must be a valid JSON object.');
  }

  const projects: Project[] = [];
  if (Array.isArray(data.projects)) {
    for (const p of data.projects) {
      if (typeof p.id === 'string' && typeof p.name === 'string' && typeof p.color === 'string') {
        projects.push({
          id: p.id,
          name: p.name,
          color: p.color,
          parentId: typeof p.parentId === 'string' ? p.parentId : undefined,
          isDeleted: typeof p.isDeleted === 'boolean' ? p.isDeleted : false,
          icon: typeof p.icon === 'string' ? p.icon : undefined,
        });
      }
    }
  }

  const tasks: Task[] = [];
  if (Array.isArray(data.tasks)) {
    for (const t of data.tasks) {
      if (
        typeof t.id === 'string' &&
        typeof t.projectId === 'string' &&
        typeof t.title === 'string' &&
        typeof t.completed === 'boolean'
      ) {
        tasks.push({
          id: t.id,
          projectId: t.projectId,
          title: t.title,
          description: typeof t.description === 'string' ? t.description : '',
          completed: t.completed,
          dueDate: typeof t.dueDate === 'string' ? t.dueDate : '',
          priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
          tags: Array.isArray(t.tags) ? t.tags.filter((tag: any) => typeof tag === 'string') : [],
          subtasks: Array.isArray(t.subtasks)
            ? t.subtasks
                .filter((st: any) => st && typeof st === 'object' && typeof st.title === 'string')
                .map((st: any) => ({
                  id: typeof st.id === 'string' ? st.id : generateUUID(),
                  title: st.title,
                  completed: typeof st.completed === 'boolean' ? st.completed : false,
                  starred: typeof st.starred === 'boolean' ? st.starred : false,
                }))
            : [],
          createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
          starred: typeof t.starred === 'boolean' ? t.starred : false,
          waitingOn: typeof t.waitingOn === 'string' ? t.waitingOn : undefined,
          isDeleted: typeof t.isDeleted === 'boolean' ? t.isDeleted : false,
          deletedWithProject: typeof t.deletedWithProject === 'boolean' ? t.deletedWithProject : false,
          completedAt: typeof t.completedAt === 'string' ? t.completedAt : undefined,
        });
      }
    }
  }

  return { projects, tasks };
}

/**
 * Generates standard initial data for the user on first launch.
 */
export function getInitialData(lang: Language = 'en'): AppData {
  const inboxId = 'project-inbox';
  const personalId = 'project-personal';
  const workId = 'project-work';

  const projects: Project[] = [
    { id: inboxId, name: lang === 'ca' ? 'Bústia' : 'Inbox', color: '#818cf8', icon: 'Inbox' },
    { id: personalId, name: lang === 'ca' ? 'Personal' : 'Personal', color: '#f43f5e', icon: 'User' },
    { id: workId, name: lang === 'ca' ? 'Feina' : 'Work', color: '#10b981', icon: 'Briefcase' },
  ];

  const tasks: Task[] = lang === 'ca' ? [
    {
      id: 'task-welcome',
      projectId: inboxId,
      title: 'Benvingut a coses! 🌟',
      description: 'Un gestor de tasques local-first preciós. Explora, organitza i enllesteix feina.',
      completed: false,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Demà
      priority: 'high',
      tags: ['coses', 'guia'],
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: 'subtask-1', title: 'Afegeix un nou projecte a la barra lateral', completed: false },
        { id: 'subtask-2', title: 'Crea una tasca amb prioritats i dates de venciment', completed: false },
        { id: 'subtask-3', title: 'Prova d\'exportar les teves dades a JSON', completed: false },
      ],
    },
    {
      id: 'task-cat-greeting',
      projectId: personalId,
      title: 'Comprar ingredients per al sopar 🥘',
      description: 'Preparar pa amb tomàquet i una bona escalivada.',
      completed: false,
      dueDate: new Date().toISOString().split('T')[0], // Avui
      priority: 'medium',
      tags: ['cuina', 'catalunya'],
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: 'subtask-cat-1', title: 'Comprar tomàquets de penjar', completed: true },
        { id: 'subtask-cat-2', title: 'Comprar oli d\'oliva verge extra', completed: false },
        { id: 'subtask-cat-3', title: 'Pa de pagès del forn', completed: false },
      ],
    },
    {
      id: 'task-sync-setup',
      projectId: workId,
      title: 'Configura la sincronització entre dispositius ☁️',
      description: 'Obtingues el teu Personal Access Token de GitHub o GitLab i enganxa\'l a la configuració.',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: ['feina', 'setup'],
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: 'subtask-s-1', title: 'Vés a la configuració de GitHub Gists o GitLab Snippets', completed: false },
        { id: 'subtask-s-2', title: 'Crea un token amb els permisos necessaris', completed: false },
        { id: 'subtask-s-3', title: 'Connecta des de la pestanya de sincronització', completed: false },
      ],
    },
  ] : [
    {
      id: 'task-welcome',
      projectId: inboxId,
      title: 'Welcome to coses! 🌟',
      description: 'A beautiful local-first task manager. Explore, organize, and get things done.',
      completed: false,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      priority: 'high',
      tags: ['coses', 'guide'],
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: 'subtask-1', title: 'Add a new project in the sidebar', completed: false },
        { id: 'subtask-2', title: 'Create a task with priorities and due dates', completed: false },
        { id: 'subtask-3', title: 'Try exporting your data as JSON', completed: false },
      ],
    },
    {
      id: 'task-cat-greeting',
      projectId: personalId,
      title: 'Buy ingredients for dinner 🥘',
      description: 'Prepare typical Catalan tomato bread (pa amb tomàquet) and escalivada.',
      completed: false,
      dueDate: new Date().toISOString().split('T')[0], // Today
      priority: 'medium',
      tags: ['cooking', 'catalonia'],
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: 'subtask-cat-1', title: 'Buy hanging tomatoes (tomàquets de penjar)', completed: true },
        { id: 'subtask-cat-2', title: 'Buy extra virgin olive oil', completed: false },
        { id: 'subtask-cat-3', title: 'Rustic country bread (pa de pagès)', completed: false },
      ],
    },
    {
      id: 'task-sync-setup',
      projectId: workId,
      title: 'Configure cross-device sync ☁️',
      description: 'Get your Personal Access Token from GitHub or GitLab and paste it into the sync settings.',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: ['work', 'setup'],
      createdAt: new Date().toISOString(),
      subtasks: [
        { id: 'subtask-s-1', title: 'Go to GitHub Gists / GitLab Snippets developer settings', completed: false },
        { id: 'subtask-s-2', title: 'Create a token with gist (GH) or api (GL) scopes', completed: false },
        { id: 'subtask-s-3', title: 'Connect inside settings modal', completed: false },
      ],
    },
  ];

  return { projects, tasks };
}


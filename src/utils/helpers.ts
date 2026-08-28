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
        const parentTaskId = typeof t.parentTaskId === 'string' ? t.parentTaskId : undefined;
        tasks.push({
          id: t.id,
          projectId: t.projectId,
          title: t.title,
          description: typeof t.description === 'string' ? t.description : '',
          completed: t.completed,
          dueDate: typeof t.dueDate === 'string' ? t.dueDate : '',
          priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
          tags: Array.isArray(t.tags) ? t.tags.filter((tag: any) => typeof tag === 'string') : [],
          createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
          starred: typeof t.starred === 'boolean' ? t.starred : false,
          waitingOn: typeof t.waitingOn === 'string' ? t.waitingOn : undefined,
          isDeleted: typeof t.isDeleted === 'boolean' ? t.isDeleted : false,
          deletedWithProject: typeof t.deletedWithProject === 'boolean' ? t.deletedWithProject : false,
          completedAt: typeof t.completedAt === 'string' ? t.completedAt : undefined,
          comments: Array.isArray(t.comments)
            ? t.comments
                .filter((c: any) => c && typeof c === 'object' && typeof c.text === 'string')
                .map((c: any) => ({
                  id: typeof c.id === 'string' ? c.id : generateUUID(),
                  text: c.text,
                  createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
                }))
            : [],
          parentTaskId,
        });

        // Migrate nested subtasks if they exist in the old format
        if (Array.isArray(t.subtasks)) {
          for (const st of t.subtasks) {
            if (st && typeof st === 'object' && typeof st.title === 'string') {
              tasks.push({
                id: typeof st.id === 'string' ? st.id : generateUUID(),
                projectId: t.projectId,
                title: st.title,
                description: '',
                completed: typeof st.completed === 'boolean' ? st.completed : false,
                dueDate: '',
                priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
                tags: [],
                createdAt: t.createdAt || new Date().toISOString(),
                starred: typeof st.starred === 'boolean' ? st.starred : false,
                parentTaskId: t.id,
              });
            }
          }
        }
      }
    }
  }

  // Ensure project-inbox exists and is active in the imported projects list
  const inboxIndex = projects.findIndex((p) => p.id === 'project-inbox');
  const lang = data.language || 'en';
  if (inboxIndex === -1) {
    projects.unshift({
      id: 'project-inbox',
      name: lang === 'ca' ? 'Bústia' : 'Inbox',
      color: '#818cf8',
      icon: 'Inbox',
    });
  } else {
    const inbox = projects[inboxIndex];
    if (inbox.isDeleted || inbox.isArchived) {
      projects[inboxIndex] = {
        ...inbox,
        isDeleted: false,
        isArchived: false,
      };
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
    },
    {
      id: 'subtask-1',
      projectId: inboxId,
      title: 'Afegeix un nou projecte a la barra lateral',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-welcome',
    },
    {
      id: 'subtask-2',
      projectId: inboxId,
      title: 'Crea una tasca amb prioritats i dates de venciment',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-welcome',
    },
    {
      id: 'subtask-3',
      projectId: inboxId,
      title: 'Prova d\'exportar les teves dades a JSON',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-welcome',
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
    },
    {
      id: 'subtask-cat-1',
      projectId: personalId,
      title: 'Comprar tomàquets de penjar',
      description: '',
      completed: true,
      dueDate: '',
      priority: 'medium',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-cat-greeting',
    },
    {
      id: 'subtask-cat-2',
      projectId: personalId,
      title: 'Comprar oli d\'oliva verge extra',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'medium',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-cat-greeting',
    },
    {
      id: 'subtask-cat-3',
      projectId: personalId,
      title: 'Pa de pagès del forn',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'medium',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-cat-greeting',
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
    },
    {
      id: 'subtask-s-1',
      projectId: workId,
      title: 'Vés a la configuració de GitHub Gists o GitLab Snippets',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-sync-setup',
    },
    {
      id: 'subtask-s-2',
      projectId: workId,
      title: 'Crea un token amb els permisos necessaris',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-sync-setup',
    },
    {
      id: 'subtask-s-3',
      projectId: workId,
      title: 'Connecta des de la pestanya de sincronització',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-sync-setup',
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
    },
    {
      id: 'subtask-1',
      projectId: inboxId,
      title: 'Add a new project in the sidebar',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-welcome',
    },
    {
      id: 'subtask-2',
      projectId: inboxId,
      title: 'Create a task with priorities and due dates',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-welcome',
    },
    {
      id: 'subtask-3',
      projectId: inboxId,
      title: 'Try exporting your data as JSON',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-welcome',
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
    },
    {
      id: 'subtask-cat-1',
      projectId: personalId,
      title: 'Buy hanging tomatoes (tomàquets de penjar)',
      description: '',
      completed: true,
      dueDate: '',
      priority: 'medium',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-cat-greeting',
    },
    {
      id: 'subtask-cat-2',
      projectId: personalId,
      title: 'Buy extra virgin olive oil',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'medium',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-cat-greeting',
    },
    {
      id: 'subtask-cat-3',
      projectId: personalId,
      title: 'Rustic country bread (pa de pagès)',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'medium',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-cat-greeting',
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
    },
    {
      id: 'subtask-s-1',
      projectId: workId,
      title: 'Go to GitHub Gists / GitLab Snippets developer settings',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-sync-setup',
    },
    {
      id: 'subtask-s-2',
      projectId: workId,
      title: 'Create a token with gist (GH) or api/snippet (GL) scopes',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-sync-setup',
    },
    {
      id: 'subtask-s-3',
      projectId: workId,
      title: 'Connect inside settings modal',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
      parentTaskId: 'task-sync-setup',
    },
  ];

  return { projects, tasks };
}


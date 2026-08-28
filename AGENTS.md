# Coses Codebase Rules & Guidelines

Welcome! This file provides the coding standards, architectural rules, and guidelines for the **Coses** task manager. All AI agents and developers must adhere to these rules when contributing to this repository.

---

## 🛠️ Technology Stack
- **Framework**: React 19 + TypeScript + Vite.
- **Styling**: Tailwind CSS v4. Use utility classes combined with custom CSS variables (e.g. `var(--bg-app)`) from [`index.css`](file:///Users/edu/Projects/coses/src/index.css) to support light/dark mode and glassmorphic designs (`glass-panel`).
- **Linting**: Oxlint (`npm run lint`). Avoid introducing lint warnings or errors.

---

## 🗃️ State Management & Data Flow
- **Persistence**: Global application state (projects, tasks, theme, language, and sync settings) is persisted in LocalStorage via the [`useLocalStorage`](file:///Users/edu/Projects/coses/src/hooks/useLocalStorage.ts) hook.
- **Task Ordering**: The manual ordering of tasks is determined directly by the index order in the `appData.tasks` array. 
  - Do not add an external `order` database field.
  - When reordering tasks, rearrange the elements directly in the array using array manipulation (`splice`). This ensures manual sorting is automatically saved and synchronized.
- **Performance**: Wrap state selections and heavy updates in React's `startTransition` to keep the UI smooth and responsive during filtering or workspace transitions.

---

## 🌐 Translations & Locales
- **Supported Locales**: English (`en`) and Catalan (`ca`).
- **No Hardcoded Strings**: Never hardcode user-facing copy in components. All user-facing strings must be defined in [`translations.ts`](file:///Users/edu/Projects/coses/src/utils/translations.ts) and translated for both locales. Access them via the translator object:
  ```typescript
  const t = translations[language];
  ```

---

## 📁 Projects & Tasks Architecture

### Projects
- **Nesting**: Projects can form a parent-child hierarchy via the `parentId` field.
- **Inbox**: The Inbox (`project-inbox`) is a default system project and cannot be edited, archived, or deleted.
- **Archiving**:
  - Projects can be archived via the context menu (`isArchived: true`).
  - Active tasks of archived projects must be excluded from global lists (Inbox, Today, Starred, Waiting, Logbook).
  - Archived projects and their tasks are only accessible when selecting the project directly, or under the **Archive** view.
- **Deletion (Trash)**:
  - Deleting a project soft-deletes it (`isDeleted: true`) and its child projects/tasks.
  - Soft-deleted items go to the **Trash** view.
  - Permanent deletion is only triggered by subsequent actions within the Trash view.

### Tasks
- **Creation**: New tasks are prepend-inserted into the active tasks list.
- **Subtasks**: Tasks can have a list of collapsible checklist items ([`Subtask`](file:///Users/edu/Projects/coses/src/types.ts#L1)).
- **Wait State**: The `waitingOn` field specifies a person or blocking resource, categorizing the task under the "Waiting" view.

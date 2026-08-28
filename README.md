# Coses — Local-First Task Manager 🌟

**Coses** is a beautiful, lightweight, local-first task manager built with React 19, TypeScript, and Tailwind CSS v4. It features a responsive glassmorphic UI, support for subtasks, hierarchical projects, and cross-device cloud synchronization.

---

## ✨ Features

- **Local-First Architecture**: Your data is stored locally in your browser (`LocalStorage`) for instant load times and offline accessibility.
- **Hierarchical Projects**: Group tasks into folders/projects, with support for parent-child project hierarchies.
- **Smart Views**: Focus on what matters with built-in views:
  - **Inbox**: Quick entry for incoming ideas and tasks.
  - **Today / Starred**: Daily focus list and high-priority flags.
  - **Waiting**: Track tasks blocked by a specific person or resource.
  - **Logbook**: Archive of completed tasks grouped by date.
- **Rich Task Actions**: Set priority levels (Low, Medium, High), due dates, tags, and collapsible checklists (subtasks).
- **Archive & Trash**: Safely archive completed projects or soft-delete items to the Trash bin.
- **Bilingual Support**: Fully localized in English (`en`) and Catalan (`ca`).
- **Cloud Sync**: Synchronize your state seamlessly across devices without complex databases.

---

## ☁️ Cross-Device Cloud Synchronization

Coses utilizes lightweight cloud gists and snippets to backup and sync your tasks. You can configure synchronization using either GitHub or GitLab.

### How it Works
1. When sync is active, Coses fetches your data from the cloud on launch.
2. Changes you make locally are debounced and saved automatically to the cloud.
3. Your data is stored securely in a private Gist (GitHub) or private Snippet (GitLab).

### 🛠️ Configuration Guide

#### Option A: GitHub Gists
1. Go to your **GitHub Settings** > **Developer Settings** > **Personal Access Tokens** > **Tokens (classic)**.
2. Generate a new token with the `gist` scope enabled.
3. Open Coses **Settings** (gear icon in the sidebar) > **Sync Settings**.
4. Select **GitHub** as your provider.
5. Paste your Personal Access Token.
6. Click **Generate Token** / **Connect** to create a private Gist automatically.

#### Option B: GitLab Snippets
1. Go to your **GitLab Profile Settings** > **Access Tokens**.
2. Generate a new token with the `api` scope enabled.
3. Open Coses **Settings** > **Sync Settings**.
4. Select **GitLab** as your provider (if self-hosting, enter your custom GitLab URL).
5. Paste your Personal Access Token.
6. Click **Connect** to automatically configure a private Snippet.

---

## 🛠️ Development Setup

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 3. Build for Production
To generate a production-ready build:
```bash
npm run build
```
This generates optimized assets in the `dist` directory.

### 4. Linting
This project uses **Oxlint** for ultra-fast, high-performance linting:
```bash
npm run lint
```

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).

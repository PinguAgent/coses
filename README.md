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

Coses can store its data in either a **project snippet** or a **personal snippet**. The
choice is made by the **GitLab Project** field in Sync Settings: fill it in for project
snippets, leave it empty for personal ones.

##### Method 1: Project Snippet (Recommended)

Scopes the token to a single project rather than to every snippet you own.

1. Pick or create a private GitLab project to hold the data (e.g. `your.name/coses`).
2. In that project, create a **private snippet** with the filename exactly
   `coses-data.json` and the content `{"projects":[],"tasks":[]}`. Copy the numeric ID
   from its URL (`/-/snippets/12345` → `12345`).
3. Go to **User Settings** > **Access Tokens** and generate a **fine-grained token**.
   Under **Group and project access**, select that project, then under
   **Project Features** grant **Snippet: Read, Update**.
4. Open Coses **Settings** > **Sync Settings** and select **GitLab**. Fill in:
   - **GitLab Instance URL** — only if self-hosting (e.g. `https://gitlab.example.com`)
   - **GitLab Project** — the full path, e.g. `your.name/coses`
   - **Personal Access Token** — the token from step 3
   - **Snippet ID** — the ID from step 2
5. Click **Connect**.

##### Method 2: Personal Snippet

1. Create a private snippet at `<your-gitlab>/-/snippets/new` with the filename
   `coses-data.json`, and copy its numeric ID.
2. Generate a **fine-grained token** with **User** access, granting
   **Snippet: Read** and **Snippet: Update**.
3. In Coses **Settings** > **Sync Settings**, select **GitLab**, leave **GitLab Project**
   empty, and enter the token and Snippet ID.

> **Note on auto-creation:** leaving **Snippet ID** empty makes Coses create the snippet
> for you. That needs a third permission, **Snippet: Create** — `Read` and `Update` alone
> are not enough, since `Update` only covers snippets that already exist. Without it,
> instances enforcing granular scopes return:
>
> ```
> 403 {"error":"insufficient_granular_scope","error_description":"... requires a
> fine-grained personal access token with the following project permissions:
> [Snippet: Create]."}
> ```
>
> Fine-grained tokens cannot be given new permissions after creation, so add
> **Snippet: Create** when generating the token if you want auto-creation. Otherwise
> create the snippet by hand and supply its ID, as described above.

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

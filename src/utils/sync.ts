import type { AppData, SyncSettings } from '../types';

/**
 * Extract the provider's own error text from a failed response.
 * GitHub and GitLab both explain the real cause in the body (missing scope,
 * disabled feature, blocked account); without it a bare 403 is undebuggable.
 */
async function describeError(res: Response): Promise<string> {
  let detail = '';
  try {
    const body = await res.text();
    if (body) {
      try {
        const parsed = JSON.parse(body);
        detail = parsed.error_description || parsed.message || parsed.error || body;
      } catch {
        detail = body;
      }
      if (typeof detail !== 'string') detail = JSON.stringify(detail);
    }
  } catch {
    // Body already consumed or unreadable; fall back to the status line.
  }
  const summary = `${res.statusText || 'Request failed'} (${res.status})`;
  return detail ? `${summary}: ${detail.slice(0, 300)}` : summary;
}

/**
 * Build the GitLab snippets collection URL for the configured settings.
 *
 * With a projectPath set we target project snippets, so a fine-grained token
 * only needs Snippet permissions on that one project. Without it we fall back
 * to personal snippets, which require user-level Snippet permissions.
 */
function gitlabSnippetsUrl(settings: SyncSettings): string {
  const baseUrl = settings.customUrl?.trim() || 'https://gitlab.com';
  // Remove trailing slash if present
  const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const project = settings.projectPath?.trim();
  if (project) {
    // A path like 'group/project' must be URL-encoded into a single path segment.
    return `${cleanUrl}/api/v4/projects/${encodeURIComponent(project)}/snippets`;
  }
  return `${cleanUrl}/api/v4/snippets`;
}

/**
 * Fetch task data from GitHub Gist or GitLab Snippet.
 */
export async function fetchFromCloud(settings: SyncSettings): Promise<AppData> {
  const { provider, token, targetId } = settings;
  if (!token || !targetId) {
    throw new Error('Missing authentication token or target identifier.');
  }

  if (provider === 'github') {
    const res = await fetch(`https://api.github.com/gists/${targetId}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error('GitHub Gist not found. It might have been deleted.');
      throw new Error(`GitHub Gist fetch failed: ${await describeError(res)}`);
    }
    const gist = await res.json();
    const file = gist.files['coses-data.json'];
    if (!file || !file.content) {
      throw new Error("Target Gist does not contain 'coses-data.json'.");
    }
    return JSON.parse(file.content);
  } 
  
  if (provider === 'gitlab') {
    const res = await fetch(`${gitlabSnippetsUrl(settings)}/${targetId}/raw`, {
      headers: { 'Private-Token': token },
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error('GitLab Snippet not found. It might have been deleted.');
      throw new Error(`GitLab Snippet fetch failed: ${await describeError(res)}`);
    }
    const contentText = await res.text();
    return JSON.parse(contentText);
  }

  throw new Error('Unsupported sync provider');
}

/**
 * Save task data to GitHub Gist or GitLab Snippet.
 * If targetId is missing, it creates a new private gist/snippet and returns its ID.
 */
export async function saveToCloud(settings: SyncSettings, data: AppData): Promise<string> {
  const { provider, token, targetId } = settings;
  if (!token) {
    throw new Error('Authentication token is required to save.');
  }

  const content = JSON.stringify(data, null, 2);

  if (provider === 'github') {
    const isUpdating = !!targetId;
    const url = isUpdating ? `https://api.github.com/gists/${targetId}` : 'https://api.github.com/gists';
    const method = isUpdating ? 'PATCH' : 'POST';
    
    const body = {
      description: 'Coses Task Manager Synchronization Data',
      public: false,
      files: {
        'coses-data.json': { content }
      }
    };

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`GitHub save failed: ${await describeError(res)}`);
    }

    const gist = await res.json();
    return gist.id;
  } 
  
  if (provider === 'gitlab') {
    const snippetsUrl = gitlabSnippetsUrl(settings);

    const isUpdating = !!targetId;
    const url = isUpdating ? `${snippetsUrl}/${targetId}` : snippetsUrl;
    const method = isUpdating ? 'PUT' : 'POST';

    // GitLab Snippets payload format
    const body = isUpdating
      ? {
          title: 'coses-data.json',
          files: [{ action: 'update', file_path: 'coses-data.json', content }]
        }
      : {
          title: 'coses-data.json',
          visibility: 'private',
          files: [{ file_path: 'coses-data.json', content }]
        };

    const res = await fetch(url, {
      method,
      headers: {
        'Private-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`GitLab save failed: ${await describeError(res)}`);
    }

    const snippet = await res.json();
    return snippet.id.toString();
  }

  throw new Error('Unsupported sync provider');
}

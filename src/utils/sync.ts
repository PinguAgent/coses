import type { AppData, SyncSettings } from '../types';

/**
 * Fetch task data from GitHub Gist or GitLab Snippet.
 */
export async function fetchFromCloud(settings: SyncSettings): Promise<AppData> {
  const { provider, token, targetId, customUrl } = settings;
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
      throw new Error(`GitHub Gist fetch failed: ${res.statusText}`);
    }
    const gist = await res.json();
    const file = gist.files['coses-data.json'];
    if (!file || !file.content) {
      throw new Error("Target Gist does not contain 'coses-data.json'.");
    }
    return JSON.parse(file.content);
  } 
  
  if (provider === 'gitlab') {
    const baseUrl = customUrl?.trim() || 'https://gitlab.com';
    // Remove trailing slash if present
    const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const res = await fetch(`${cleanUrl}/api/v4/snippets/${targetId}/raw`, {
      headers: { 'Private-Token': token },
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error('GitLab Snippet not found. It might have been deleted.');
      throw new Error(`GitLab Snippet fetch failed: ${res.statusText}`);
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
  const { provider, token, targetId, customUrl } = settings;
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
      throw new Error(`GitHub save failed: ${res.statusText} (${res.status})`);
    }

    const gist = await res.json();
    return gist.id;
  } 
  
  if (provider === 'gitlab') {
    const baseUrl = customUrl?.trim() || 'https://gitlab.com';
    const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    const isUpdating = !!targetId;
    const url = isUpdating ? `${cleanUrl}/api/v4/snippets/${targetId}` : `${cleanUrl}/api/v4/snippets`;
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
      throw new Error(`GitLab save failed: ${res.statusText} (${res.status})`);
    }

    const snippet = await res.json();
    return snippet.id.toString();
  }

  throw new Error('Unsupported sync provider');
}

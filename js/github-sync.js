/* =========================================================
   GITHUB SYNC — Commits JSON data files back to the repo.
   One atomic commit per save via the Git Data API:
     ref → commit → tree → blobs (new) → tree (new) →
     commit (new) → update ref.
   Config + PAT are kept in localStorage ('vh.github').
   ========================================================= */

const GitHubSync = (() => {
  const STORAGE_KEY = 'vh.github';
  const DEFAULTS = { owner: 'aranyelme', repo: 'vilagok-harca', branch: 'main' };

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const cfg = raw ? JSON.parse(raw) : {};
      return { ...DEFAULTS, ...(cfg || {}) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  function forgetToken() {
    const cfg = loadConfig();
    delete cfg.token;
    saveConfig(cfg);
  }

  async function _api(token, method, path, body) {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        if (data && data.message) msg = `${res.status} — ${data.message}`;
      } catch { /* ignore */ }
      throw new Error(`GitHub ${method} ${path}: ${msg}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  // files: [{ path: 'data/cards.json', content: '…stringified JSON…' }, …]
  async function commitFiles({ owner, repo, branch, token }, files, message) {
    if (!token)  throw new Error('Hiányzik a GitHub PAT.');
    if (!owner || !repo || !branch) throw new Error('Hiányzó repo-konfiguráció.');
    if (!files || !files.length) throw new Error('Nincs mit commitolni.');

    const base = `/repos/${owner}/${repo}`;

    const ref = await _api(token, 'GET', `${base}/git/ref/heads/${branch}`);
    const latestSha = ref.object.sha;

    const latestCommit = await _api(token, 'GET', `${base}/git/commits/${latestSha}`);
    const baseTreeSha = latestCommit.tree.sha;

    const blobs = await Promise.all(files.map(f =>
      _api(token, 'POST', `${base}/git/blobs`, { content: f.content, encoding: 'utf-8' })
    ));

    const tree = await _api(token, 'POST', `${base}/git/trees`, {
      base_tree: baseTreeSha,
      tree: files.map((f, i) => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        sha: blobs[i].sha,
      })),
    });

    const commit = await _api(token, 'POST', `${base}/git/commits`, {
      message,
      tree: tree.sha,
      parents: [latestSha],
    });

    await _api(token, 'PATCH', `${base}/git/refs/heads/${branch}`, { sha: commit.sha });
    return { sha: commit.sha, branch };
  }

  return { loadConfig, saveConfig, forgetToken, commitFiles };
})();

if (typeof window !== 'undefined') window.GitHubSync = GitHubSync;

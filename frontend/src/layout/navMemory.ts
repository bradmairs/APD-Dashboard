// Small per-browser memories for the app shell: whether the left menu is
// collapsed, the projects you opened most recently, and which section of each
// project you were last on. These are conveniences for one person on one
// browser (like saved views), so they live in localStorage, keyed by user —
// never in the database, and nothing here touches project data.

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode etc.): just not remembered.
  }
}

// ---- Left menu collapsed -------------------------------------------------------

const COLLAPSED_KEY = "apd.sidebarCollapsed";

export function loadSidebarCollapsed(): boolean {
  return read(COLLAPSED_KEY, false);
}

export function saveSidebarCollapsed(collapsed: boolean) {
  write(COLLAPSED_KEY, collapsed);
}

// ---- Recently viewed projects ------------------------------------------------

export interface RecentProject {
  id: string;
  name: string;
}

const MAX_RECENT = 5;
const RECENT_EVENT = "apd:recent-projects";

function recentKey(userId: string) {
  return `apd.recentProjects.${userId}`;
}

export function loadRecentProjects(userId: string): RecentProject[] {
  const list = read<RecentProject[]>(recentKey(userId), []);
  return Array.isArray(list) ? list.filter((p) => p && p.id && p.name).slice(0, MAX_RECENT) : [];
}

// Puts a project at the top of the list (and tells the menu to refresh).
export function rememberRecentProject(userId: string, project: RecentProject) {
  const next = [
    { id: project.id, name: project.name },
    ...loadRecentProjects(userId).filter((p) => p.id !== project.id),
  ].slice(0, MAX_RECENT);
  write(recentKey(userId), next);
  window.dispatchEvent(new Event(RECENT_EVENT));
}

export function forgetRecentProject(userId: string, projectId: string) {
  write(
    recentKey(userId),
    loadRecentProjects(userId).filter((p) => p.id !== projectId)
  );
  window.dispatchEvent(new Event(RECENT_EVENT));
}

export function onRecentProjectsChange(listener: () => void): () => void {
  window.addEventListener(RECENT_EVENT, listener);
  return () => window.removeEventListener(RECENT_EVENT, listener);
}

// ---- Last section open on each project -----------------------------------------

function lastTabKey(userId: string) {
  return `apd.projectTabs.${userId}`;
}

export function loadLastProjectTab(userId: string, projectId: string): string | null {
  const map = read<Record<string, string>>(lastTabKey(userId), {});
  return typeof map[projectId] === "string" ? map[projectId] : null;
}

export function saveLastProjectTab(userId: string, projectId: string, tab: string) {
  const map = read<Record<string, string>>(lastTabKey(userId), {});
  if (map[projectId] === tab) return;
  // Keep the newest 50 projects' choices so this never grows without bound.
  const entries = Object.entries({ ...map, [projectId]: tab }).slice(-50);
  write(lastTabKey(userId), Object.fromEntries(entries));
}

import { ProjectStatus, RagStatus } from "./types";

// A saved combination of the Dashboard's Projects-tab filters — status,
// health, project manager, and free-text search — so a PM managing many
// projects can jump back to e.g. "my overdue projects" instead of
// re-applying the same filters every visit. Stored per-browser in
// localStorage (see the Artifacts skill's guidance this project otherwise
// follows: this is a per-viewer convenience, not shared/synced state, so
// there's no backend model for it).
export interface DashboardView {
  id: string;
  name: string;
  statusFilter: ProjectStatus | "ALL";
  healthFilter: RagStatus | "ALL";
  projectManager: string; // "" means any manager
  search: string;
}

const STORAGE_KEY = "apd.dashboardViews.v1";

export function loadSavedViews(): DashboardView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(views: DashboardView[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // Best-effort only (private browsing, full/blocked storage) — losing
    // the ability to persist views shouldn't break the dashboard itself.
  }
}

export function addSavedView(view: Omit<DashboardView, "id">): DashboardView[] {
  const views = loadSavedViews();
  const newView: DashboardView = { ...view, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
  const updated = [...views, newView];
  persist(updated);
  return updated;
}

export function removeSavedView(id: string): DashboardView[] {
  const updated = loadSavedViews().filter((v) => v.id !== id);
  persist(updated);
  return updated;
}

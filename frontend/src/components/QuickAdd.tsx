import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createActionItem,
  createDefect,
  createRisk,
  createSiteVisit,
  createTask,
  getProjects,
} from "../api";
import { batched } from "../batch";
import { useAuth } from "../auth/AuthContext";
import { Project, RiskConsequence, RiskLikelihood } from "../types";
import { ALL_CONSEQUENCES, ALL_LIKELIHOODS, CONSEQUENCE_LABELS, LIKELIHOOD_LABELS } from "../riskScoring";
import { loadRecentProjects } from "../layout/navMemory";
import { useMenuKeys } from "../useMenuKeys";
import DateInput from "./DateInput";

export type QuickAddKind = "task" | "action" | "risk" | "defect" | "site-visit";

const KINDS: { kind: QuickAddKind; label: string; tab: string }[] = [
  { kind: "task", label: "Task", tab: "schedule" },
  { kind: "action", label: "Action", tab: "overview" },
  { kind: "risk", label: "Risk", tab: "quality" },
  { kind: "defect", label: "Defect", tab: "quality" },
  { kind: "site-visit", label: "Site visit", tab: "site" },
];

// Tells whichever page is open that a record was added, so it refreshes.
export const DATA_CHANGED_EVENT = "apd:data-changed";

export function notifyDataChanged(projectId?: string) {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { projectId } }));
}

export function onDataChanged(listener: (projectId?: string) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<{ projectId?: string }>).detail?.projectId);
  window.addEventListener(DATA_CHANGED_EVENT, handler);
  return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
}

// Opens a quick-add form from anywhere (e.g. the command menu).
export const OPEN_QUICK_ADD_EVENT = "apd:quick-add";
export function openQuickAdd(kind: QuickAddKind) {
  window.dispatchEvent(new CustomEvent(OPEN_QUICK_ADD_EVENT, { detail: { kind } }));
}

const INPUT =
  "w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm";

// The top bar's "+ New" menu: add a project, or a task, action, risk,
// defect or site visit to any project, from any page — without first
// opening the project and finding its section.
export default function QuickAddMenu() {
  const { isViewer } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<QuickAddKind | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useMenuKeys(menuRef, open);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    const handler = (e: Event) => setKind((e as CustomEvent<{ kind: QuickAddKind }>).detail.kind);
    window.addEventListener(OPEN_QUICK_ADD_EVENT, handler);
    return () => window.removeEventListener(OPEN_QUICK_ADD_EVENT, handler);
  }, []);

  if (isViewer) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        title="Add something new"
      >
        + New ▾
      </button>
      {open && (
        <div role="menu" ref={menuRef} className="menu-panel absolute right-0 mt-1 w-48 z-40">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/?tab=projects&new=project");
            }}
            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Project
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
          {KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setKind(k.kind);
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {k.label}…
            </button>
          ))}
        </div>
      )}
      {kind && createPortal(<QuickAddModal kind={kind} onClose={() => setKind(null)} />, document.body)}
    </div>
  );
}

function QuickAddModal({ kind, onClose }: { kind: QuickAddKind; onClose: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const meta = KINDS.find((k) => k.kind === kind)!;
  const [projects, setProjects] = useState<Project[]>([]);
  const currentProjectId = /^\/projects\/([^/]+)$/.exec(location.pathname)?.[1] ?? "";
  const [projectId, setProjectId] = useState(currentProjectId);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [ownerName, setOwnerName] = useState(user?.name ?? "");
  const [likelihood, setLikelihood] = useState<RiskLikelihood>("POSSIBLE");
  const [consequence, setConsequence] = useState<RiskConsequence>("MODERATE");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().substring(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    batched(() => getProjects(), { preferCache: true })
      .then((list) => {
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
        setProjects(sorted);
        if (!currentProjectId) {
          const recent = user ? loadRecentProjects(user.id)[0]?.id : undefined;
          const mine = sorted.find((p) => p.projectManagerId === user?.id)?.id;
          setProjectId(recent && sorted.some((p) => p.id === recent) ? recent : mine ?? sorted[0]?.id ?? "");
        }
      })
      .catch(() => setProjects([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !title.trim()) return;
    setSaving(true);
    setError(null);
    const due = dueDate ? new Date(dueDate).toISOString() : null;
    const today = new Date().toISOString();
    try {
      if (kind === "task") await createTask(projectId, { title: title.trim(), dueDate: due });
      else if (kind === "action")
        await createActionItem(projectId, {
          title: title.trim(),
          type: "ACTION",
          ownerName: ownerName.trim() || null,
          dueDate: due,
          dateRaised: today,
        });
      else if (kind === "risk")
        await createRisk(projectId, {
          title: title.trim(),
          type: "RISK",
          inherentLikelihood: likelihood,
          inherentConsequence: consequence,
        });
      else if (kind === "defect") await createDefect(projectId, { title: title.trim(), dateRaised: today });
      else
        await createSiteVisit(projectId, {
          location: title.trim(),
          visitDate: new Date(visitDate).toISOString(),
        });
      notifyDataChanged(projectId);
      onClose();
      // Show it where it lives, unless that's already the page you're on.
      if (projectId !== currentProjectId) navigate(`/projects/${projectId}?tab=${meta.tab}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const titleLabel = kind === "site-visit" ? "Location" : "Title";

  return (
    <div className="fixed inset-0 bg-navy-800/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 animate-fade-in" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-label={`New ${meta.label.toLowerCase()}`}
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New {meta.label.toLowerCase()}</h2>
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        <label className="block text-sm">
          <span className="text-slate-700 dark:text-slate-300">Project</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${INPUT} mt-1`} required>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-700 dark:text-slate-300">{titleLabel}</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={`${INPUT} mt-1`} required />
        </label>
        {(kind === "task" || kind === "action") && (
          <label className="block text-sm">
            <span className="text-slate-700 dark:text-slate-300">Due date</span>
            <DateInput value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${INPUT} mt-1`} />
          </label>
        )}
        {kind === "action" && (
          <label className="block text-sm">
            <span className="text-slate-700 dark:text-slate-300">Owner</span>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={`${INPUT} mt-1`} />
          </label>
        )}
        {kind === "risk" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-700 dark:text-slate-300">Likelihood</span>
              <select value={likelihood} onChange={(e) => setLikelihood(e.target.value as RiskLikelihood)} className={`${INPUT} mt-1`}>
                {ALL_LIKELIHOODS.map((l) => (
                  <option key={l} value={l}>
                    {LIKELIHOOD_LABELS[l]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-700 dark:text-slate-300">Consequence</span>
              <select value={consequence} onChange={(e) => setConsequence(e.target.value as RiskConsequence)} className={`${INPUT} mt-1`}>
                {ALL_CONSEQUENCES.map((c) => (
                  <option key={c} value={c}>
                    {CONSEQUENCE_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {kind === "site-visit" && (
          <label className="block text-sm">
            <span className="text-slate-700 dark:text-slate-300">Visit date</span>
            <DateInput value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={`${INPUT} mt-1`} required />
          </label>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">Add the rest of the details on the project afterwards.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
            Cancel
          </button>
          <button type="submit" disabled={saving || !projectId || !title.trim()} className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createTrimLink, deleteTrimLink, getTrimLinks, updateTrimLink } from "../api";
import { Project, TrimLink, TrimLinkInput } from "../types";
import { trimHref } from "../trim";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../confirm/ConfirmContext";

const INPUT_CLASS =
  "w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm";

interface Props {
  projects: Project[];
}

// The dashboard's TRIM Links tab: shared links into TRIM (common folders,
// templates, procedures) that anyone but a Viewer can add, plus every
// project's own TRIM Folder in one list. Self-contained — loads its own links.
export default function TrimLinksPanel({ projects }: Props) {
  const { user, isViewer } = useAuth();
  const confirm = useConfirm();
  const [links, setLinks] = useState<TrimLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TrimLink | "new" | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getTrimLinks()
      .then(setLinks)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load TRIM links"))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();

  const grouped = useMemo(() => {
    const groups = new Map<string, TrimLink[]>();
    for (const link of links) {
      const haystack = `${link.title} ${link.location} ${link.category ?? ""} ${
        link.description ?? ""
      }`.toLowerCase();
      if (q && !haystack.includes(q)) continue;
      const key = link.category || "General";
      groups.set(key, [...(groups.get(key) ?? []), link]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [links, q]);

  const projectFolders = useMemo(
    () =>
      projects
        .filter((p) => p.trimFolder)
        .filter((p) =>
          q ? `${p.name} ${p.projectNumber ?? ""} ${p.trimFolder}`.toLowerCase().includes(q) : true
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projects, q]
  );

  const categories = useMemo(
    () => Array.from(new Set(links.map((l) => l.category).filter((c): c is string => !!c))).sort(),
    [links]
  );

  async function handleSave(data: TrimLinkInput) {
    if (editing === "new") {
      const created = await createTrimLink(data);
      setLinks((prev) => [...prev, created]);
    } else if (editing) {
      const updated = await updateTrimLink(editing.id, data);
      setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    }
    setEditing(null);
  }

  async function handleDelete(link: TrimLink) {
    if (!(await confirm(`Delete the TRIM link "${link.title}"?`))) return;
    try {
      await deleteTrimLink(link.id);
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete link");
    }
  }

  function canEdit(link: TrimLink) {
    if (!user || isViewer) return false;
    return !link.createdById || link.createdById === user.id || user.role === "ADMIN";
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-3">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search TRIM links and project folders…"
          className="w-full sm:w-80 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
        />
        {!isViewer && (
          <button
            onClick={() => setEditing("new")}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 self-start sm:self-auto"
          >
            + Add TRIM Link
          </button>
        )}
      </div>

      {editing && (
        <TrimLinkForm
          link={editing === "new" ? null : editing}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          TRIM Links
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {links.length === 0
              ? "No TRIM links yet. Add common folders, templates and procedures for everyone to use."
              : "No links match your search."}
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([category, items]) => (
              <div key={category}>
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                  {category}
                </h3>
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {items.map((link) => (
                    <li key={link.id} className="py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <TrimLocation title={link.title} location={link.location} />
                        {link.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {link.description}
                          </p>
                        )}
                      </div>
                      {canEdit(link) && (
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={() => setEditing(link)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(link)}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Project TRIM Folders
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Set on each project's Edit form.
        </p>
        {projectFolders.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {q ? "No project folders match your search." : "No projects have a TRIM folder yet."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {projectFolders.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <Link
                  to={`/projects/${p.id}`}
                  className="text-slate-900 dark:text-slate-100 hover:underline min-w-0 truncate"
                >
                  {p.projectNumber ? `${p.projectNumber} · ` : ""}
                  {p.name}
                </Link>
                <TrimLocation location={p.trimFolder!} compact />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TrimLocation({
  title,
  location,
  compact,
}: {
  title?: string;
  location: string;
  compact?: boolean;
}) {
  const href = trimHref(location);
  const label = title ?? location;
  return (
    <div className={compact ? "shrink-0 text-right max-w-[50%]" : ""}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
        >
          {compact ? "Open in TRIM" : label}
        </a>
      ) : (
        <span className="text-sm text-slate-900 dark:text-slate-100 break-all">{label}</span>
      )}
      {title && !href && (
        <span className="ml-2 text-xs font-mono text-slate-500 dark:text-slate-400">
          {location}
        </span>
      )}
    </div>
  );
}

function TrimLinkForm({
  link,
  categories,
  onCancel,
  onSave,
}: {
  link: TrimLink | null;
  categories: string[];
  onCancel: () => void;
  onSave: (data: TrimLinkInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(link?.title ?? "");
  const [location, setLocation] = useState(link?.location ?? "");
  const [category, setCategory] = useState(link?.category ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title,
        location,
        category: category.trim() || null,
        description: description.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {link ? "Edit TRIM Link" : "New TRIM Link"}
      </h2>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title, e.g. Capital Works Templates"
          aria-label="Title"
          className={INPUT_CLASS}
        />
        <input
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="TRIM link (https://…) or record number"
          aria-label="TRIM link or record number"
          className={INPUT_CLASS}
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          list="trim-link-categories"
          placeholder="Category (optional), e.g. Templates"
          aria-label="Category"
          className={INPUT_CLASS}
        />
        <datalist id="trim-link-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          aria-label="Description"
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Link"}
        </button>
      </div>
    </form>
  );
}

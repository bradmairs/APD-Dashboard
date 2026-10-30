import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createTrimLink, deleteTrimLink, getTrimLinks, updateTrimLink } from "../api";
import { Project, TrimLink, TrimLinkInput, TrimLinkKind } from "../types";
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
  const [editing, setEditing] = useState<{ kind: TrimLinkKind; link: TrimLink | null } | null>(
    null
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    getTrimLinks()
      .then(setLinks)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load links"))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();

  function groupedFor(kind: TrimLinkKind) {
    const groups = new Map<string, TrimLink[]>();
    for (const link of links) {
      if (link.kind !== kind) continue;
      const haystack = `${link.title} ${link.location} ${link.category ?? ""} ${
        link.description ?? ""
      }`.toLowerCase();
      if (q && !haystack.includes(q)) continue;
      const key = link.category || "General";
      groups.set(key, [...(groups.get(key) ?? []), link]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }

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

  function categoriesFor(kind: TrimLinkKind) {
    return Array.from(
      new Set(
        links
          .filter((l) => l.kind === kind)
          .map((l) => l.category)
          .filter((c): c is string => !!c)
      )
    ).sort();
  }

  async function handleSave(data: TrimLinkInput) {
    if (!editing) return;
    if (editing.link) {
      const updated = await updateTrimLink(editing.link.id, data);
      setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } else {
      const created = await createTrimLink(data);
      setLinks((prev) => [...prev, created]);
    }
    setEditing(null);
  }

  async function handleDelete(link: TrimLink) {
    if (!(await confirm(`Delete the link "${link.title}"?`))) return;
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

  function renderLinkSection(kind: TrimLinkKind) {
    const meta = KIND_META[kind];
    const grouped = groupedFor(kind);
    const total = links.filter((l) => l.kind === kind).length;
    return (
      <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {meta.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{meta.subtitle}</p>
          </div>
          {!isViewer && (
            <button
              onClick={() => setEditing({ kind, link: null })}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 shrink-0"
            >
              + Add Link
            </button>
          )}
        </div>
        {editing && editing.kind === kind && (
          <div className="mb-4">
            <TrimLinkForm
              kind={kind}
              link={editing.link}
              categories={categoriesFor(kind)}
              onCancel={() => setEditing(null)}
              onSave={handleSave}
            />
          </div>
        )}
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {total === 0 ? meta.empty : "No links match your search."}
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
                            onClick={() => setEditing({ kind, link })}
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
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-3">
          {error}
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search links and project folders…"
        className="w-full sm:w-80 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
      />

      {renderLinkSection("TRIM")}
      {renderLinkSection("GENERAL")}

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

const KIND_META: Record<TrimLinkKind, { title: string; subtitle: string; empty: string }> = {
  TRIM: {
    title: "TRIM Links",
    subtitle: "Common TRIM folders, templates and procedures",
    empty: "No TRIM links yet. Add common folders, templates and procedures for everyone to use.",
  },
  GENERAL: {
    title: "General GVW Links",
    subtitle: "GVW website pages and other resources, e.g. design guidelines",
    empty: "No general links yet. Add things like GVW's design guidelines and standards.",
  },
};

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
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(location);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the number is still visible to copy by hand.
    }
  }

  // A web link: the whole title opens it, in a new tab.
  if (href) {
    return (
      <div className={compact ? "shrink-0 text-right max-w-[50%]" : ""}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={location}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline break-words"
        >
          {compact ? "Open in TRIM" : label} <span aria-hidden="true">↗</span>
        </a>
      </div>
    );
  }

  // A record/container number has no web address to open, so offer to copy
  // it for pasting into TRIM's search.
  return (
    <div className={compact ? "shrink-0 text-right max-w-[50%]" : ""}>
      <span className="text-sm text-slate-900 dark:text-slate-100 break-words">{label}</span>
      {title && (
        <span className="ml-2 text-xs font-mono text-slate-500 dark:text-slate-400">{location}</span>
      )}
      <button
        type="button"
        onClick={copy}
        className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        title="Copy the record number to search for it in TRIM"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function TrimLinkForm({
  kind,
  link,
  categories,
  onCancel,
  onSave,
}: {
  kind: TrimLinkKind;
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
        kind,
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
      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {link ? "Edit Link" : kind === "TRIM" ? "New TRIM Link" : "New General GVW Link"}
      </h3>
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
          placeholder={
            kind === "TRIM" ? "Title, e.g. Capital Works Templates" : "Title, e.g. GVW Design Guidelines"
          }
          aria-label="Title"
          className={INPUT_CLASS}
        />
        <input
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={
            kind === "TRIM" ? "TRIM web link, or a record number" : "Web address, e.g. www.gvw.com.au/…"
          }
          aria-label="Link or record number"
          className={INPUT_CLASS}
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          list={`link-categories-${kind}`}
          placeholder="Category (optional), e.g. Templates"
          aria-label="Category"
          className={INPUT_CLASS}
        />
        <datalist id={`link-categories-${kind}`}>
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
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Paste the full web link to make the title open it directly; a record number shows with a
        Copy button instead.
      </p>
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

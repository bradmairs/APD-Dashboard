import { FormEvent, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NoteColor, ProjectNote, ProjectNoteInput } from "../types";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../confirm/ConfirmContext";
import { previewText } from "../richText";
import RichTextArea from "../components/RichTextArea";
import EmptyState from "../components/EmptyState";
import { Icon } from "../components/icons";
import { markdownToNote, noteToMarkdown, safeFileName, wikiLinks } from "./obsidian";
import { makeZip } from "./zip";

const COLORS: { id: NoteColor; label: string; card: string; swatch: string }[] = [
  { id: "yellow", label: "Yellow", card: "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30", swatch: "bg-amber-300" },
  { id: "blue", label: "Blue", card: "bg-sky-50 border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/30", swatch: "bg-sky-300" },
  { id: "green", label: "Green", card: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30", swatch: "bg-emerald-300" },
  { id: "pink", label: "Pink", card: "bg-pink-50 border-pink-200 dark:bg-pink-500/10 dark:border-pink-500/30", swatch: "bg-pink-300" },
  { id: "purple", label: "Purple", card: "bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/30", swatch: "bg-violet-300" },
  { id: "orange", label: "Orange", card: "bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30", swatch: "bg-orange-300" },
  { id: "slate", label: "Grey", card: "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700", swatch: "bg-slate-300" },
];
const cardColor = (c: NoteColor | null) => (COLORS.find((x) => x.id === c) ?? COLORS[0]).card;

interface Props {
  projectName: string;
  notes: ProjectNote[];
  onCreate: (data: Partial<ProjectNoteInput>) => Promise<ProjectNote | void>;
  onUpdate: (note: ProjectNote, data: Partial<ProjectNoteInput>) => Promise<void>;
  onDelete: (note: ProjectNote) => Promise<void>;
  onImport: (notes: Partial<ProjectNoteInput>[]) => Promise<void>;
}

// Ideas & Notes: a project's brainstorming board. Coloured note cards with
// tags and pins; notes link to each other with [[Note title]] like
// Obsidian (with backlinks), and the whole board exports as an Obsidian
// vault (a zip of Markdown files) or takes Markdown files in.
export default function NotesPanel({ projectName, notes, onCreate, onUpdate, onDelete, onImport }: Props) {
  const { isViewer } = useAuth();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProjectNote | "new" | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(), [notes]);
  const q = query.trim().toLowerCase();
  const shown = notes
    .filter((n) => !tag || n.tags.includes(tag))
    .filter((n) => !q || `${n.title} ${n.body} ${n.tags.join(" ")}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

  function exportVault() {
    const folder = safeFileName(projectName);
    const used = new Set<string>();
    const files = notes.map((n) => {
      let name = safeFileName(n.title);
      while (used.has(name.toLowerCase())) name += " (2)";
      used.add(name.toLowerCase());
      return { name: `${folder}/${name}.md`, content: noteToMarkdown(n, projectName) };
    });
    files.push({
      name: `${folder}/${folder} – Index.md`,
      content: `# ${projectName} – Ideas & Notes\n\nExported from the APD Project Management Dashboard on ${new Date().toLocaleDateString("en-AU")}.\n\n${notes
        .map((n) => `- [[${safeFileName(n.title)}]]${n.tags.length ? ` ${n.tags.map((t) => `#${t}`).join(" ")}` : ""}`)
        .join("\n")}\n`,
    });
    const blob = new Blob([makeZip(files) as Uint8Array<ArrayBuffer>], { type: "application/zip" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${folder} - Notes (Obsidian).zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importFiles(files: FileList) {
    const list = await Promise.all(
      Array.from(files)
        .filter((f) => /\.(md|markdown|txt)$/i.test(f.name))
        .map(async (f) => markdownToNote(f.name, await f.text()))
    );
    if (list.length === 0) {
      setMessage("Choose Markdown (.md) files, e.g. from an Obsidian vault.");
      return;
    }
    await onImport(list);
    setMessage(`Imported ${list.length} note${list.length === 1 ? "" : "s"}.`);
  }

  async function quickAdd(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await onCreate({ title: newTitle.trim(), body: "", tags: tag ? [tag] : [], color: "yellow" });
    setNewTitle("");
  }

  function openByTitle(title: string) {
    const target = notes.find((n) => n.title.trim().toLowerCase() === title.trim().toLowerCase());
    if (target) setEditing(target);
    else if (!isViewer) {
      onCreate({ title, body: "", tags: [], color: "yellow" }).then((n) => n && setEditing(n));
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ideas &amp; Notes</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            aria-label="Search notes"
            spellCheck={false}
            className="w-40 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-sm"
          />
          {notes.length > 0 && (
            <button
              type="button"
              onClick={exportVault}
              className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Download every note as Markdown files (a folder you can drop into an Obsidian vault)"
            >
              Export to Obsidian
            </button>
          )}
          {!isViewer && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept=".md,.markdown,.txt"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) importFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                title="Add notes from Markdown files, e.g. from Obsidian"
              >
                Import .md
              </button>
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                + New Note
              </button>
            </>
          )}
        </div>
      </div>

      {message && <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{message}</p>}

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filter by tag">
          <button
            type="button"
            aria-pressed={tag === null}
            onClick={() => setTag(null)}
            className={`text-xs rounded-full px-2.5 py-0.5 border ${
              tag === null ? "bg-navy-700 text-white border-navy-700 dark:bg-blue-500 dark:border-blue-500" : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
            }`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tag === t}
              onClick={() => setTag(tag === t ? null : t)}
              className={`text-xs rounded-full px-2.5 py-0.5 border ${
                tag === t ? "bg-navy-700 text-white border-navy-700 dark:bg-blue-500 dark:border-blue-500" : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState
          icon="idea"
          text="Brainstorm ideas, options and loose notes here. Link notes with [[Note title]], tag them, and export the lot to Obsidian."
          addLabel={isViewer ? undefined : "New Note"}
          onAdd={isViewer ? undefined : () => setEditing("new")}
        />
      ) : (
        <>
          {!isViewer && (
            <form onSubmit={quickAdd} className="mb-3 flex gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Jot an idea and press Enter…"
                aria-label="Quick note title"
                className="flex-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm"
              />
            </form>
          )}
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {shown.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setEditing(n)}
                  className={`w-full h-full text-left rounded-xl border p-3 transition-shadow hover:shadow ${cardColor(n.color)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex-1">{n.title}</span>
                    {n.pinned && <Icon name="pin" className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
                  </div>
                  {n.body && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 line-clamp-4 whitespace-pre-line">
                      {previewText(n.body).replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, t, l) => l || t)}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="flex flex-wrap gap-1">
                      {n.tags.map((t) => (
                        <span key={t} className="text-[11px] text-slate-600 dark:text-slate-300">
                          #{t}
                        </span>
                      ))}
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(n.updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {shown.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No notes match.</p>}
        </>
      )}

      {editing &&
        createPortal(
          <NoteEditor
            note={editing === "new" ? null : editing}
            notes={notes}
            readOnly={isViewer}
            onClose={() => setEditing(null)}
            onOpenTitle={openByTitle}
            onSave={async (data) => {
              if (editing === "new") await onCreate(data);
              else await onUpdate(editing, data);
              setEditing(null);
            }}
            onDelete={editing === "new" ? undefined : async () => {
              await onDelete(editing);
              setEditing(null);
            }}
          />,
          document.body
        )}
    </div>
  );
}

function NoteEditor({
  note,
  notes,
  readOnly,
  onClose,
  onSave,
  onDelete,
  onOpenTitle,
}: {
  note: ProjectNote | null;
  notes: ProjectNote[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (data: Partial<ProjectNoteInput>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onOpenTitle: (title: string) => void;
}) {
  const confirm = useConfirm();
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tags, setTags] = useState((note?.tags ?? []).join(", "));
  const [color, setColor] = useState<NoteColor>(note?.color ?? "yellow");
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const links = wikiLinks(body);
  const backlinks = note
    ? notes.filter((n) => n.id !== note.id && wikiLinks(n.body).some((t) => t.toLowerCase() === note.title.trim().toLowerCase()))
    : [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        body,
        tags: tags.split(/[,\s]+/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean),
        color,
        pinned,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-navy-800/40 backdrop-blur-[2px] flex justify-end z-50 animate-fade-in">
      <div role="dialog" aria-modal="true" aria-label={note ? note.title : "New note"} className="bg-white dark:bg-slate-900 shadow-xl w-full max-w-xl h-full overflow-y-auto animate-slide-in-right border-l border-slate-200 dark:border-slate-800">
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{note ? "Note" : "New note"}</h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <Icon name="x" className="w-4 h-4" />
            </button>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            aria-label="Title"
            required
            disabled={readOnly}
            className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-base font-medium"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Colour" className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={color === c.id}
                  aria-label={c.label}
                  disabled={readOnly}
                  onClick={() => setColor(c.id)}
                  className={`w-6 h-6 rounded-full ${c.swatch} ${color === c.id ? "ring-2 ring-offset-2 ring-blue-600 dark:ring-offset-slate-900" : ""}`}
                />
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} disabled={readOnly} />
              Pin to top
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-slate-700 dark:text-slate-300">Tags</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. design, options, risk"
              disabled={readOnly}
              className="mt-1 w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </label>
          <div>
            <span className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
              Note <span className="text-xs text-slate-500 dark:text-slate-400">— link another note with [[Note title]]</span>
            </span>
            <RichTextArea value={body} onChange={(e) => setBody(e.target.value)} rows={10} disabled={readOnly} aria-label="Note text" className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm" />
          </div>

          {(links.length > 0 || backlinks.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {links.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Links to</div>
                  <ul className="space-y-0.5">
                    {links.map((t) => {
                      const exists = notes.some((n) => n.title.trim().toLowerCase() === t.toLowerCase());
                      return (
                        <li key={t}>
                          <button type="button" onClick={() => onOpenTitle(t)} className="text-blue-700 dark:text-blue-300 hover:underline">
                            {t}
                          </button>
                          {!exists && <span className="text-xs text-slate-500"> (new)</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {backlinks.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Linked from</div>
                  <ul className="space-y-0.5">
                    {backlinks.map((n) => (
                      <li key={n.id}>
                        <button type="button" onClick={() => onOpenTitle(n.title)} className="text-blue-700 dark:text-blue-300 hover:underline">
                          {n.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {note && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Added by {note.createdByName} on {new Date(note.createdAt).toLocaleDateString("en-AU")}
              {note.updatedByName ? ` · last edited by ${note.updatedByName}` : ""}
            </p>
          )}

          {!readOnly && (
            <div className="flex items-center justify-between gap-2 pt-2">
              {onDelete ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (await confirm(`Delete the note "${note?.title}"? This cannot be undone.`)) await onDelete();
                  }}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Delete note
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !title.trim()} className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addComment, deleteComment, getCommentCounts, getComments, getUserOptions } from "../api";
import { RecordComment, UserOption } from "../types";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "../components/icons";

// ---- Comment counts, fetched once per list (all rows that ask in the same
// moment share one request) -------------------------------------------------
const counts = new Map<string, number>();
const pending = new Map<string, Set<string>>();
const listeners = new Set<() => void>();
let timer: number | null = null;

function requestCount(entityType: string, id: string) {
  const set = pending.get(entityType) ?? new Set<string>();
  set.add(id);
  pending.set(entityType, set);
  if (timer !== null) return;
  timer = window.setTimeout(async () => {
    timer = null;
    const batch = Array.from(pending.entries());
    pending.clear();
    for (const [type, ids] of batch) {
      try {
        const result = await getCommentCounts(type, Array.from(ids));
        for (const id of ids) counts.set(`${type}:${id}`, result[id] ?? 0);
      } catch {
        // counts are a nicety
      }
    }
    listeners.forEach((l) => l());
  }, 0);
}

function useCount(entityType: string, id: string) {
  const key = `${entityType}:${id}`;
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    if (!counts.has(key)) requestCount(entityType, id);
    return () => {
      listeners.delete(l);
    };
  }, [key, entityType, id]);
  return counts.get(key) ?? 0;
}

let usersPromise: Promise<UserOption[]> | null = null;
function loadUsers() {
  usersPromise ??= getUserOptions().catch(() => []);
  return usersPromise;
}

interface Props {
  projectId: string;
  entityType: string;
  entityId: string;
  label: string;
}

// The speech-bubble button on a record's row (with its comment count), and
// the comments panel it opens: read the thread, write a comment, and
// @mention someone to notify them.
export default function CommentsButton({ projectId, entityType, entityId, label }: Props) {
  const count = useCount(entityType, entityId);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="icon-btn relative"
        title={count ? `${count} comment${count === 1 ? "" : "s"}` : "Comments"}
        aria-label={`Comments on ${label}${count ? ` (${count})` : ""}`}
      >
        <Icon name="message" className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-blue-600 text-white text-[10px] font-semibold leading-4 px-1 text-center">
            {count}
          </span>
        )}
      </button>
      {open &&
        createPortal(
          <CommentsDrawer
            projectId={projectId}
            entityType={entityType}
            entityId={entityId}
            label={label}
            onClose={() => setOpen(false)}
          />,
          document.body
        )}
    </>
  );
}

function renderBody(body: string) {
  // Show @Name mentions highlighted.
  return body.split(/(@[A-Z][\w.'-]*(?:\s[A-Z][\w.'-]*)?)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-blue-700 dark:text-blue-300 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function CommentsDrawer({ projectId, entityType, entityId, label, onClose }: Props & { onClose: () => void }) {
  const { user, isViewer } = useAuth();
  const [comments, setComments] = useState<RecordComment[] | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<UserOption[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getComments(entityType, entityId).then(setComments).catch(() => setComments([]));
    loadUsers().then(setUsers);
    inputRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entityType, entityId, onClose]);

  const suggestions =
    query !== null ? users.filter((u) => u.id !== user?.id && u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];

  function onChange(value: string) {
    setBody(value);
    const el = inputRef.current;
    const upto = value.slice(0, el?.selectionStart ?? value.length);
    const m = /@([\w.'-]*(?:\s[\w.'-]*)?)$/.exec(upto);
    setQuery(m ? m[1] : null);
    setActive(0);
    // Forget mentions whose name was deleted from the text.
    setMentions((ms) => ms.filter((u) => value.includes(`@${u.name}`)));
  }

  function pick(u: UserOption) {
    const el = inputRef.current;
    const pos = el?.selectionStart ?? body.length;
    const before = body.slice(0, pos).replace(/@[\w.'-]*(?:\s[\w.'-]*)?$/, `@${u.name} `);
    const next = before + body.slice(pos);
    setBody(next);
    setMentions((ms) => (ms.some((m) => m.id === u.id) ? ms : [...ms, u]));
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(suggestions[active]);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    try {
      const saved = await addComment({ projectId, entityType, entityId, entityLabel: label, body, mentionIds: mentions.map((m) => m.id) });
      setComments((c) => [...(c ?? []), saved]);
      counts.set(`${entityType}:${entityId}`, (counts.get(`${entityType}:${entityId}`) ?? 0) + 1);
      listeners.forEach((l) => l());
      setBody("");
      setMentions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post it");
    }
  }

  async function remove(c: RecordComment) {
    await deleteComment(c.id);
    setComments((list) => (list ?? []).filter((x) => x.id !== c.id));
    counts.set(`${entityType}:${entityId}`, Math.max(0, (counts.get(`${entityType}:${entityId}`) ?? 1) - 1));
    listeners.forEach((l) => l());
  }

  return (
    <div className="fixed inset-0 bg-navy-800/40 backdrop-blur-[2px] flex justify-end z-50 animate-fade-in" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Comments on ${label}`}
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 shadow-xl w-full max-w-md h-full flex flex-col animate-slide-in-right border-l border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400">Comments</div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{label}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {comments === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No comments yet. Start the conversation below; type @ to mention someone.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200 text-xs font-semibold flex items-center justify-center shrink-0">
                  {c.authorName
                    .split(/\s+/)
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.authorName}</span> ·{" "}
                    {new Date(c.createdAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                    {(c.authorId === user?.id || user?.role === "ADMIN") && (
                      <button type="button" onClick={() => remove(c)} className="ml-2 text-slate-500 hover:text-red-600">
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words mt-0.5">{renderBody(c.body)}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {!isViewer && (
          <form onSubmit={submit} className="p-4 border-t border-slate-100 dark:border-slate-800 relative">
            {suggestions.length > 0 && (
              <ul role="listbox" aria-label="Mention someone" className="menu-panel absolute bottom-full left-4 right-4 mb-1">
                {suggestions.map((u, i) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pick(u);
                      }}
                      className={`menu-item ${i === active ? "bg-slate-100 dark:bg-slate-700/60" : ""}`}
                    >
                      @{u.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="text-xs text-red-600 dark:text-red-400 mb-1">{error}</p>}
            <textarea
              ref={inputRef}
              value={body}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              rows={3}
              placeholder="Write a comment… type @ to mention someone"
              aria-label="New comment"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {mentions.length > 0 ? `Notifies ${mentions.map((m) => m.name).join(", ")}` : ""}
              </span>
              <button type="submit" disabled={!body.trim()} className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                Post
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

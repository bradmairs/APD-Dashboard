import { FormEvent, useEffect, useMemo, useState } from "react";
import FormattedText from "../components/FormattedText";
import RichTextArea from "../components/RichTextArea";
import { Link } from "react-router-dom";
import {
  createToolSuggestion,
  deleteToolSuggestion,
  getToolSuggestions,
  updateToolSuggestion,
} from "../api";
import {
  ToolSuggestion,
  ToolSuggestionCategory,
  ToolSuggestionStatus,
} from "../types";
import {
  ALL_TOOL_SUGGESTION_CATEGORIES,
  ALL_TOOL_SUGGESTION_STATUSES,
  TOOL_SUGGESTION_CATEGORY_COLORS,
  TOOL_SUGGESTION_CATEGORY_LABELS,
  TOOL_SUGGESTION_STATUS_COLORS,
  TOOL_SUGGESTION_STATUS_LABELS,
} from "../toolSuggestionMeta";
import { formatDate } from "../format";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../confirm/ConfirmContext";
import UserMenu from "../components/UserMenu";
import GvwLogo from "../components/GvwLogo";

const INPUT_CLASS =
  "w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm";

// The dashboard's suggestion box: anyone signed in can suggest a new feature
// or an improvement to the tool. The author or an admin can edit or delete a
// suggestion; only an admin can set its status and reply to it.
export default function ToolSuggestionsPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const isAdmin = user?.role === "ADMIN";

  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ToolSuggestionStatus | "ACTIVE" | "ALL">(
    "ACTIVE"
  );
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    getToolSuggestions()
      .then(setSuggestions)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load suggestions")
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suggestions.filter((s) => {
      if (statusFilter === "ACTIVE" && (s.status === "DONE" || s.status === "DECLINED")) {
        return false;
      }
      if (statusFilter !== "ACTIVE" && statusFilter !== "ALL" && s.status !== statusFilter) {
        return false;
      }
      if (q) {
        const haystack = `${s.title} ${s.description ?? ""} ${s.response ?? ""} ${
          s.createdByName
        }`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [suggestions, statusFilter, search]);

  function replace(updated: ToolSuggestion) {
    setSuggestions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function handleCreate(data: {
    title: string;
    description: string;
    category: ToolSuggestionCategory;
  }) {
    const created = await createToolSuggestion(data);
    setSuggestions((prev) => [created, ...prev]);
  }

  async function handleStatusChange(suggestion: ToolSuggestion, status: ToolSuggestionStatus) {
    try {
      replace(await updateToolSuggestion(suggestion.id, { status }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleDelete(suggestion: ToolSuggestion) {
    if (!(await confirm(`Delete the suggestion "${suggestion.title}"? This cannot be undone.`))) {
      return;
    }
    try {
      await deleteToolSuggestion(suggestion.id);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete suggestion");
    }
  }

  const filterButtons: { value: ToolSuggestionStatus | "ACTIVE" | "ALL"; label: string }[] = [
    { value: "ACTIVE", label: "Active" },
    ...ALL_TOOL_SUGGESTION_STATUSES.map((s) => ({
      value: s,
      label: TOOL_SUGGESTION_STATUS_LABELS[s],
    })),
    { value: "ALL", label: "All" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to dashboard
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-y-3 mt-2">
            <div className="flex items-center gap-4">
              <Link to="/" className="hover:opacity-90">
                <GvwLogo className="h-14" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Tool Suggestions
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ideas for new features and improvements to this dashboard
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-3">
            {error}
          </div>
        )}

        <NewSuggestionForm onCreate={handleCreate} />

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {filterButtons.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 text-sm rounded-full border ${
                  statusFilter === f.value
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suggestions…"
            className="w-full sm:w-72 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </div>

        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            {suggestions.length === 0
              ? "No suggestions yet — be the first to add one above."
              : "No suggestions match the current filters."}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((suggestion) => {
              const isAuthor = !!user && suggestion.createdById === user.id;
              const canEdit = isAdmin || isAuthor;
              return (
                <li
                  key={suggestion.id}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4"
                >
                  {editingId === suggestion.id ? (
                    <EditSuggestionForm
                      suggestion={suggestion}
                      isAdmin={isAdmin}
                      onCancel={() => setEditingId(null)}
                      onSave={async (data) => {
                        replace(await updateToolSuggestion(suggestion.id, data));
                        setEditingId(null);
                      }}
                    />
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              TOOL_SUGGESTION_STATUS_COLORS[suggestion.status]
                            }`}
                          >
                            {TOOL_SUGGESTION_STATUS_LABELS[suggestion.status]}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              TOOL_SUGGESTION_CATEGORY_COLORS[suggestion.category]
                            }`}
                          >
                            {TOOL_SUGGESTION_CATEGORY_LABELS[suggestion.category]}
                          </span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {suggestion.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {isAdmin && (
                            <select
                              value={suggestion.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  suggestion,
                                  e.target.value as ToolSuggestionStatus
                                )
                              }
                              aria-label="Status"
                              className="rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-xs"
                            >
                              {ALL_TOOL_SUGGESTION_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {TOOL_SUGGESTION_STATUS_LABELS[s]}
                                </option>
                              ))}
                            </select>
                          )}
                          {canEdit && (
                            <>
                              <button
                                onClick={() => setEditingId(suggestion.id)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(suggestion)}
                                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Suggested by {suggestion.createdByName} on{" "}
                        {formatDate(suggestion.createdAt)}
                      </p>
                      {suggestion.description && (
                        <FormattedText className="text-sm text-slate-700 dark:text-slate-300 mt-2" text={suggestion.description} />
                      )}
                      {suggestion.response && (
                        <div className="mt-2 text-sm bg-slate-50 dark:bg-slate-700/50 rounded p-2">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Response:{" "}
                          </span>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={suggestion.response} />
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function NewSuggestionForm({
  onCreate,
}: {
  onCreate: (data: {
    title: string;
    description: string;
    category: ToolSuggestionCategory;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ToolSuggestionCategory>("IMPROVEMENT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onCreate({ title, description, category });
      setTitle("");
      setDescription("");
      setCategory("IMPROVEMENT");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add suggestion");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Suggest something
      </h2>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_12rem] gap-3">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="What would you like added or improved?"
          className={INPUT_CLASS}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ToolSuggestionCategory)}
          aria-label="Category"
          className={INPUT_CLASS}
        >
          {ALL_TOOL_SUGGESTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {TOOL_SUGGESTION_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <RichTextArea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="More detail (optional) — what it should do, where in the tool, why it would help"
        className={INPUT_CLASS}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add Suggestion"}
        </button>
      </div>
    </form>
  );
}

function EditSuggestionForm({
  suggestion,
  isAdmin,
  onCancel,
  onSave,
}: {
  suggestion: ToolSuggestion;
  isAdmin: boolean;
  onCancel: () => void;
  onSave: (data: {
    title: string;
    description: string;
    category: ToolSuggestionCategory;
    response?: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(suggestion.title);
  const [description, setDescription] = useState(suggestion.description ?? "");
  const [category, setCategory] = useState<ToolSuggestionCategory>(suggestion.category);
  const [response, setResponse] = useState(suggestion.response ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ title, description, category, ...(isAdmin ? { response } : {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save suggestion");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_12rem] gap-3">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          aria-label="Title"
          className={INPUT_CLASS}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ToolSuggestionCategory)}
          aria-label="Category"
          className={INPUT_CLASS}
        >
          {ALL_TOOL_SUGGESTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {TOOL_SUGGESTION_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <RichTextArea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        aria-label="Description"
        className={INPUT_CLASS}
      />
      {isAdmin && (
        <RichTextArea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={2}
          placeholder="Response (admin) — e.g. what was done, or why it was declined"
          className={INPUT_CLASS}
        />
      )}
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
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

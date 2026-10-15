import { FormEvent, useState } from "react";
import { TaskTemplate, TaskTemplateInput, TaskTemplateItemInput } from "../types";

interface Props {
  template: TaskTemplate | null;
  onClose: () => void;
  onSave: (data: TaskTemplateInput) => Promise<void>;
}

type DraftItem = TaskTemplateItemInput & { key: string };

let nextKey = 0;
function newDraftItem(): DraftItem {
  nextKey += 1;
  return { key: `new-${nextKey}`, title: "", description: "", dueOffsetDays: null };
}

export default function TaskTemplateFormModal({ template, onClose, onSave }: Props) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [items, setItems] = useState<DraftItem[]>(
    template && template.items.length > 0
      ? template.items.map((item) => ({
          key: item.id,
          title: item.title,
          description: item.description ?? "",
          dueOffsetDays: item.dueOffsetDays,
        }))
      : [newDraftItem()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(key: string, changes: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanItems = items
      .filter((item) => item.title.trim())
      .map((item) => ({
        title: item.title.trim(),
        description: item.description || null,
        dueOffsetDays:
          item.dueOffsetDays === null || item.dueOffsetDays === undefined
            ? null
            : Number(item.dueOffsetDays),
      }));
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (cleanItems.length === 0) {
      setError("At least one task item is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description || null, items: cleanItems });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {template ? "Edit Task Template" : "New Task Template"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Commissioning checklist"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Description
            </label>
            <textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Task items
              </label>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, newDraftItem()])}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add item
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
              "Due (days after start)" is optional — left blank, the resulting task gets no due date.
            </p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.key} className="flex items-start gap-2">
                  <input
                    value={item.title}
                    onChange={(e) => updateItem(item.key, { title: e.target.value })}
                    placeholder="Task title"
                    className="flex-1 min-w-0 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    value={item.dueOffsetDays ?? ""}
                    onChange={(e) =>
                      updateItem(item.key, {
                        dueOffsetDays: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="Due (days)"
                    className="w-28 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline pt-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
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
      </div>
    </div>
  );
}

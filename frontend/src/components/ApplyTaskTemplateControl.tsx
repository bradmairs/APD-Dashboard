import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTaskTemplates } from "../api";
import { TaskTemplate } from "../types";

interface Props {
  onApply: (templateId: string) => Promise<void>;
}

// A small "apply a saved task set" control dropped above a project's
// TaskList — see Task Templates (UserMenu → Task Templates) for where
// templates themselves are created and edited. Kept separate from
// TaskList itself since applying a template is a one-off action, not part
// of that panel's own add/edit/delete flow.
export default function ApplyTaskTemplateControl({ onApply }: Props) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selected, setSelected] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getTaskTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  if (templates.length === 0) {
    return (
      <div className="text-xs text-slate-400 dark:text-slate-500">
        No task templates yet —{" "}
        <Link to="/task-templates" className="text-blue-600 dark:text-blue-400 hover:underline">
          create one
        </Link>{" "}
        to apply a standard set of tasks here.
      </div>
    );
  }

  async function handleApply() {
    if (!selected) return;
    setApplying(true);
    try {
      await onApply(selected);
      setSelected("");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1.5"
      >
        <option value="">Apply a task template…</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.items.length})
          </option>
        ))}
      </select>
      <button
        onClick={handleApply}
        disabled={!selected || applying}
        className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
      >
        {applying ? "Applying…" : "Apply"}
      </button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createTaskTemplate,
  deleteTaskTemplate,
  getTaskTemplates,
  updateTaskTemplate,
} from "../api";
import { TaskTemplate, TaskTemplateInput } from "../types";
import TaskTemplateFormModal from "../components/TaskTemplateFormModal";
import UserMenu from "../components/UserMenu";
import GvwLogo from "../components/GvwLogo";
import { useConfirm } from "../confirm/ConfirmContext";

export default function TaskTemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await getTaskTemplates());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(template: TaskTemplate) {
    setEditing(template);
    setShowModal(true);
  }

  async function handleSave(data: TaskTemplateInput) {
    if (editing) {
      await updateTaskTemplate(editing.id, data);
    } else {
      await createTaskTemplate(data);
    }
    setShowModal(false);
    setEditing(null);
    await load();
  }

  const confirm = useConfirm();

  async function handleDelete(template: TaskTemplate) {
    if (!await confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    await deleteTaskTemplate(template.id);
    await load();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
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
                  Task Templates
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Reusable task sets you can apply to any project's Schedule tab
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openCreate}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                + New Template
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            No task templates yet. Create one to reuse a standard set of tasks across projects.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {template.name}
                    </div>
                    {template.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {template.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                      {template.items.length} task{template.items.length === 1 ? "" : "s"}:{" "}
                      {template.items.map((i) => i.title).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => openEdit(template)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <TaskTemplateFormModal
          template={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

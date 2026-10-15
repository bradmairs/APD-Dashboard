import { useState } from "react";
import { ChecklistItem, ChecklistItemInput, ChecklistItemStatus, ChecklistPhase } from "../types";
import { formatDate } from "../format";
import {
  ALL_CHECKLIST_STATUSES,
  CHECKLIST_PHASE_COLORS,
  CHECKLIST_PHASE_LABELS,
  CHECKLIST_STATUS_COLORS,
  CHECKLIST_STATUS_LABELS,
} from "../checklistMeta";
import ChecklistItemFormModal from "./ChecklistItemFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  items: ChecklistItem[];
  onCreate: (data: Partial<ChecklistItemInput>) => Promise<void>;
  onUpdate: (item: ChecklistItem, data: Partial<ChecklistItemInput>) => Promise<void>;
  onDelete: (item: ChecklistItem) => Promise<void>;
}

function phaseSummary(items: ChecklistItem[], phase: ChecklistPhase): string | null {
  const inPhase = items.filter((i) => i.phase === phase && i.status !== "NOT_APPLICABLE");
  if (inPhase.length === 0) return null;
  const complete = inPhase.filter((i) => i.status === "COMPLETE").length;
  return `${CHECKLIST_PHASE_LABELS[phase]} ${complete}/${inPhase.length} complete`;
}

export default function ChecklistPanel({ items, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ChecklistItem | null>(null);
  const [defaultPhase, setDefaultPhase] = useState<ChecklistPhase>("COMMISSIONING");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const summaries = [
    phaseSummary(items, "COMMISSIONING"),
    phaseSummary(items, "HANDOVER"),
  ].filter((s): s is string => s !== null);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(item: ChecklistItem) {
    setEditing(item);
    setDefaultPhase(item.phase);
    setShowModal(true);
  }

  async function handleSave(data: Partial<ChecklistItemInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(item: ChecklistItem) {
    if (!await confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    await onDelete(item);
  }

  async function handleStatusChange(item: ChecklistItem, status: ChecklistItemStatus) {
    await onUpdate(item, { status });
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Commissioning &amp; Handover
          </h2>
          {summaries.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {summaries.join(" · ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="commissioning-checklist" rows={items} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No commissioning or handover items logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <li key={item.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${CHECKLIST_PHASE_COLORS[item.phase]}`}
                      >
                        {CHECKLIST_PHASE_LABELS[item.phase]}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${CHECKLIST_STATUS_COLORS[item.status]}`}
                      >
                        {CHECKLIST_STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {item.responsible && <span>{item.responsible}</span>}
                      {item.dueDate && <span>Due {formatDate(item.dueDate)}</span>}
                      {item.completedDate && (
                        <span>Completed {formatDate(item.completedDate)}</span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleStatusChange(item, e.target.value as ChecklistItemStatus)
                      }
                      className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                    >
                      {ALL_CHECKLIST_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {CHECKLIST_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (item.description || item.notes) && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {item.description && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Description
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {item.description}
                        </p>
                      </div>
                    )}
                    {item.notes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Notes
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {item.notes}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Added by {item.createdByName}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <ChecklistItemFormModal
          item={editing}
          defaultPhase={defaultPhase}
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

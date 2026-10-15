import { useState } from "react";
import { Correspondence, CorrespondenceInput, CorrespondenceStatus } from "../types";
import { formatDate } from "../format";
import {
  ALL_CORRESPONDENCE_STATUSES,
  CORRESPONDENCE_DIRECTION_LABELS,
  CORRESPONDENCE_STATUS_COLORS,
  CORRESPONDENCE_STATUS_LABELS,
  correspondenceStatusRank,
  isCorrespondenceOverdue,
} from "../correspondenceMeta";
import CorrespondenceFormModal from "./CorrespondenceFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  items: Correspondence[];
  onCreate: (data: Partial<CorrespondenceInput>) => Promise<void>;
  onUpdate: (item: Correspondence, data: Partial<CorrespondenceInput>) => Promise<void>;
  onDelete: (item: Correspondence) => Promise<void>;
}

export default function CorrespondencePanel({ items, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Correspondence | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCount = items.filter((i) => i.status !== "CLOSED").length;

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(item: Correspondence) {
    setEditing(item);
    setShowModal(true);
  }

  async function handleSave(data: Partial<CorrespondenceInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(item: Correspondence) {
    if (!await confirm(`Delete "${item.subject}"? This cannot be undone.`)) return;
    await onDelete(item);
  }

  async function handleStatusChange(item: Correspondence, status: CorrespondenceStatus) {
    await onUpdate(item, { status });
  }

  const sorted = [...items].sort(
    (a, b) => correspondenceStatusRank(a.status) - correspondenceStatusRank(b.status)
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Correspondence
          </h2>
          {items.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {openCount} open of {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="correspondence" rows={items} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Correspondence
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No correspondence logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map((item) => {
            const isExpanded = expandedId === item.id;
            const overdue = isCorrespondenceOverdue(item);
            return (
              <li key={item.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.reference ? `${item.reference}: ` : ""}
                        {item.subject}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        {CORRESPONDENCE_DIRECTION_LABELS[item.direction]}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${CORRESPONDENCE_STATUS_COLORS[item.status]}`}
                      >
                        {CORRESPONDENCE_STATUS_LABELS[item.status]}
                      </span>
                      {overdue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>{item.correspondent}</span>
                      <span>Sent {formatDate(item.dateSent)}</span>
                      {item.responseDueDate && (
                        <span className={overdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                          Due {formatDate(item.responseDueDate)}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleStatusChange(item, e.target.value as CorrespondenceStatus)
                      }
                      className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                    >
                      {ALL_CORRESPONDENCE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {CORRESPONDENCE_STATUS_LABELS[s]}
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

                {isExpanded && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {item.summary && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Summary
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {item.summary}
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
                      Logged by {item.loggedByName}
                      {item.dateClosed && ` · Closed ${formatDate(item.dateClosed)}`}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <CorrespondenceFormModal
          item={editing}
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

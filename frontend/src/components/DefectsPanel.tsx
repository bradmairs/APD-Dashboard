import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { DefectItem, DefectItemInput, DefectStatus } from "../types";
import { formatCurrency, formatDate } from "../format";
import {
  ALL_DEFECT_STATUSES,
  DEFECT_STATUS_COLORS,
  DEFECT_STATUS_LABELS,
  defectStatusRank,
} from "../defectMeta";
import DefectFormModal from "./DefectFormModal";
import ExportCsvButton from "./ExportCsvButton";
import BulkActionsBar from "./BulkActionsBar";
import { useSelection } from "../useSelection";
import { useConfirm } from "../confirm/ConfirmContext";

interface Props {
  defects: DefectItem[];
  onCreate: (data: Partial<DefectItemInput>) => Promise<void>;
  onUpdate: (defect: DefectItem, data: Partial<DefectItemInput>) => Promise<void>;
  onDelete: (defect: DefectItem) => Promise<void>;
}

export default function DefectsPanel({ defects, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DefectItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selection = useSelection();

  const openCount = defects.filter((d) => d.status !== "VERIFIED").length;

  async function handleBulkStatus(status: DefectStatus) {
    for (const defect of defects.filter((d) => selection.isSelected(d.id))) {
      await onUpdate(defect, { status });
    }
    selection.clear();
  }

  async function handleBulkDelete() {
    for (const defect of defects.filter((d) => selection.isSelected(d.id))) {
      await onDelete(defect);
    }
    selection.clear();
  }

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(defect: DefectItem) {
    setEditing(defect);
    setShowModal(true);
  }

  async function handleSave(data: Partial<DefectItemInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(defect: DefectItem) {
    if (!await confirm(`Delete "${defect.title}"? This cannot be undone.`)) return;
    await onDelete(defect);
  }

  async function handleStatusChange(defect: DefectItem, status: DefectStatus) {
    await onUpdate(defect, { status });
  }

  const sorted = [...defects].sort(
    (a, b) => defectStatusRank(b.status) - defectStatusRank(a.status)
  );

  const shown = useShowMore(sorted);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Defects &amp; Punch List
          </h2>
          {defects.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {openCount} outstanding of {defects.length}
            </span>
          )}
          {defects.length > 0 && (
            <button
              onClick={() => selection.toggleAll(sorted.map((d) => d.id))}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {selection.count === defects.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            filename="defects-and-punch-list"
            columns={[
              { header: "Title", key: "title" },
              { header: "Location", key: "location" },
              { header: "Category", key: "category" },
              { header: "Status", key: "status" },
              { header: "Assigned To", key: "assignedTo" },
              { header: "Due Date", key: "dueDate" },
              { header: "Date Raised", key: "dateRaised" },
              { header: "Date Closed", key: "dateClosed" },
              { header: "Retention Held", key: "retentionHeld" },
              { header: "Raised By", key: "raisedBy" },
              { header: "Description", key: "description" },
              { header: "Notes", key: "notes" },
            ]}
            rows={sorted.map((defect) => ({
              title: defect.title,
              location: defect.location ?? "",
              category: defect.category ?? "",
              status: DEFECT_STATUS_LABELS[defect.status],
              assignedTo: defect.assignedTo ?? "",
              dueDate: defect.dueDate ? formatDate(defect.dueDate) : "",
              dateRaised: formatDate(defect.dateRaised),
              dateClosed: defect.dateClosed ? formatDate(defect.dateClosed) : "",
              retentionHeld: defect.retentionHeld != null ? formatCurrency(defect.retentionHeld) : "",
              raisedBy: defect.raisedByName,
              description: defect.description ?? "",
              notes: defect.notes ?? "",
            }))}
          />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Defect
          </button>
        </div>
      </div>

      {selection.count > 0 && (
        <BulkActionsBar
          count={selection.count}
          entityLabel="defect"
          statusOptions={ALL_DEFECT_STATUSES.map((s) => ({ value: s, label: DEFECT_STATUS_LABELS[s] }))}
          onApplyStatus={handleBulkStatus}
          onDelete={handleBulkDelete}
          onClear={selection.clear}
        />
      )}

      {defects.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No defects logged yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((defect) => {
              const isExpanded = expandedId === defect.id;
              return (
                <li key={defect.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <input
                      type="checkbox"
                      checked={selection.isSelected(defect.id)}
                      onChange={() => selection.toggle(defect.id)}
                      className="mt-1.5 h-4 w-4 shrink-0"
                    />
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : defect.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {defect.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${DEFECT_STATUS_COLORS[defect.status]}`}
                        >
                          {DEFECT_STATUS_LABELS[defect.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        {defect.location && <span>{defect.location}</span>}
                        {defect.category && <span>{defect.category}</span>}
                        {defect.assignedTo && <span>Assigned to {defect.assignedTo}</span>}
                        {defect.dueDate && <span>Due {formatDate(defect.dueDate)}</span>}
                        {defect.retentionHeld != null && (
                          <span>Retention {formatCurrency(defect.retentionHeld)}</span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <select
                        value={defect.status}
                        onChange={(e) =>
                          handleStatusChange(defect, e.target.value as DefectStatus)
                        }
                        className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                      >
                        {ALL_DEFECT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {DEFECT_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => openEdit(defect)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(defect)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (defect.description || defect.notes) && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      {defect.description && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Description
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={defect.description} />
                        </div>
                      )}
                      {defect.notes && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Notes
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={defect.notes} />
                        </div>
                      )}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Raised by {defect.raisedByName} on {formatDate(defect.dateRaised)}
                        {defect.dateClosed && ` · Verified ${formatDate(defect.dateClosed)}`}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <ShowMoreButton state={shown} noun="defects" />
        </>
      )}

      {showModal && (
        <DefectFormModal
          defect={editing}
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

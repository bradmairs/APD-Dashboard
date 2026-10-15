import { useState } from "react";
import { ActionItem, ActionItemInput, ActionItemStatus } from "../types";
import { formatDate } from "../format";
import {
  ALL_ACTION_STATUSES,
  ACTION_STATUS_COLORS,
  ACTION_STATUS_LABELS,
  ACTION_TYPE_COLORS,
  ACTION_TYPE_LABELS,
} from "../actionItemMeta";
import ActionItemFormModal from "./ActionItemFormModal";
import ExportCsvButton from "./ExportCsvButton";
import BulkActionsBar from "./BulkActionsBar";
import { useSelection } from "../useSelection";
import { useConfirm } from "../confirm/ConfirmContext";

interface Props {
  actionItems: ActionItem[];
  onCreate: (data: Partial<ActionItemInput>) => Promise<void>;
  onUpdate: (actionItem: ActionItem, data: Partial<ActionItemInput>) => Promise<void>;
  onDelete: (actionItem: ActionItem) => Promise<void>;
}

export default function ActionsPanel({
  actionItems,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ActionItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selection = useSelection();

  const openCount = actionItems.filter((a) => a.status !== "DONE").length;

  async function handleBulkStatus(status: ActionItemStatus) {
    for (const item of actionItems.filter((a) => selection.isSelected(a.id))) {
      await onUpdate(item, { status });
    }
    selection.clear();
  }

  async function handleBulkDelete() {
    for (const item of actionItems.filter((a) => selection.isSelected(a.id))) {
      await onDelete(item);
    }
    selection.clear();
  }

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(actionItem: ActionItem) {
    setEditing(actionItem);
    setShowModal(true);
  }

  async function handleSave(data: Partial<ActionItemInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(actionItem: ActionItem) {
    if (!await confirm(`Delete "${actionItem.title}"? This cannot be undone.`)) return;
    await onDelete(actionItem);
  }

  async function handleStatusChange(actionItem: ActionItem, status: ActionItemStatus) {
    await onUpdate(actionItem, { status });
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Actions &amp; Decisions
          </h2>
          {actionItems.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {openCount} open of {actionItems.length}
            </span>
          )}
          {actionItems.length > 0 && (
            <button
              onClick={() => selection.toggleAll(actionItems.map((a) => a.id))}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {selection.count === actionItems.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            filename="actions-and-decisions"
            columns={[
              { header: "Type", key: "type" },
              { header: "Title", key: "title" },
              { header: "Category", key: "category" },
              { header: "Status", key: "status" },
              { header: "Owner", key: "owner" },
              { header: "Due Date", key: "dueDate" },
              { header: "Date Raised", key: "dateRaised" },
              { header: "Date Closed", key: "dateClosed" },
              { header: "Raised By", key: "raisedBy" },
              { header: "Description", key: "description" },
              { header: "Notes", key: "notes" },
            ]}
            rows={actionItems.map((actionItem) => ({
              type: ACTION_TYPE_LABELS[actionItem.type],
              title: actionItem.title,
              category: actionItem.category ?? "",
              status: ACTION_STATUS_LABELS[actionItem.status],
              owner: actionItem.ownerName ?? "",
              dueDate: actionItem.dueDate ? formatDate(actionItem.dueDate) : "",
              dateRaised: formatDate(actionItem.dateRaised),
              dateClosed: actionItem.dateClosed ? formatDate(actionItem.dateClosed) : "",
              raisedBy: actionItem.raisedByName,
              description: actionItem.description ?? "",
              notes: actionItem.notes ?? "",
            }))}
          />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Action
          </button>
        </div>
      </div>

      {selection.count > 0 && (
        <BulkActionsBar
          count={selection.count}
          entityLabel="action"
          statusOptions={ALL_ACTION_STATUSES.map((s) => ({ value: s, label: ACTION_STATUS_LABELS[s] }))}
          onApplyStatus={handleBulkStatus}
          onDelete={handleBulkDelete}
          onClear={selection.clear}
        />
      )}

      {actionItems.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No actions or decisions logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {actionItems.map((actionItem) => {
            const isExpanded = expandedId === actionItem.id;
            return (
              <li key={actionItem.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(actionItem.id)}
                    onChange={() => selection.toggle(actionItem.id)}
                    className="mt-1.5 h-4 w-4 shrink-0"
                  />
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : actionItem.id)
                    }
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${ACTION_TYPE_COLORS[actionItem.type]}`}
                      >
                        {ACTION_TYPE_LABELS[actionItem.type]}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {actionItem.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${ACTION_STATUS_COLORS[actionItem.status]}`}
                      >
                        {ACTION_STATUS_LABELS[actionItem.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {actionItem.ownerName && <span>Owner: {actionItem.ownerName}</span>}
                      {actionItem.dueDate && <span>Due {formatDate(actionItem.dueDate)}</span>}
                      <span>Raised {formatDate(actionItem.dateRaised)}</span>
                      {actionItem.category && <span>{actionItem.category}</span>}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <select
                      value={actionItem.status}
                      onChange={(e) =>
                        handleStatusChange(actionItem, e.target.value as ActionItemStatus)
                      }
                      className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                    >
                      {ALL_ACTION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {ACTION_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(actionItem)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(actionItem)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (actionItem.description || actionItem.notes) && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {actionItem.description && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Description
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {actionItem.description}
                        </p>
                      </div>
                    )}
                    {actionItem.notes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Notes
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {actionItem.notes}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Raised by {actionItem.raisedByName}
                      {actionItem.dateClosed &&
                        ` · Closed ${formatDate(actionItem.dateClosed)}`}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <ActionItemFormModal
          actionItem={editing}
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

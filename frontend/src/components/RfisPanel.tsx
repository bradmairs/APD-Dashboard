import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { Rfi, RfiInput, RfiStatus } from "../types";
import { formatDate } from "../format";
import {
  ALL_RFI_STATUSES,
  RFI_STATUS_COLORS,
  RFI_STATUS_LABELS,
  isRfiOverdue,
  rfiStatusRank,
} from "../rfiMeta";
import RfiFormModal from "./RfiFormModal";
import ExportCsvButton from "./ExportCsvButton";
import BulkActionsBar from "./BulkActionsBar";
import { useSelection } from "../useSelection";
import { useConfirm } from "../confirm/ConfirmContext";

interface Props {
  rfis: Rfi[];
  onCreate: (data: Partial<RfiInput>) => Promise<void>;
  onUpdate: (rfi: Rfi, data: Partial<RfiInput>) => Promise<void>;
  onDelete: (rfi: Rfi) => Promise<void>;
}

export default function RfisPanel({ rfis, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Rfi | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selection = useSelection();

  const openCount = rfis.filter((r) => r.status !== "CLOSED").length;

  async function handleBulkStatus(status: RfiStatus) {
    for (const rfi of rfis.filter((r) => selection.isSelected(r.id))) {
      await onUpdate(rfi, { status });
    }
    selection.clear();
  }

  async function handleBulkDelete() {
    for (const rfi of rfis.filter((r) => selection.isSelected(r.id))) {
      await onDelete(rfi);
    }
    selection.clear();
  }

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(rfi: Rfi) {
    setEditing(rfi);
    setShowModal(true);
  }

  async function handleSave(data: Partial<RfiInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(rfi: Rfi) {
    if (!await confirm(`Delete "${rfi.rfiNumber}"? This cannot be undone.`)) return;
    await onDelete(rfi);
  }

  async function handleStatusChange(rfi: Rfi, status: RfiStatus) {
    await onUpdate(rfi, { status });
  }

  const sorted = [...rfis].sort((a, b) => rfiStatusRank(a.status) - rfiStatusRank(b.status));

  const shown = useShowMore(sorted);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Requests for Information
          </h2>
          {rfis.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {openCount} open of {rfis.length}
            </span>
          )}
          {rfis.length > 0 && (
            <button
              onClick={() => selection.toggleAll(sorted.map((r) => r.id))}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {selection.count === rfis.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            filename="rfis"
            columns={[
              { header: "RFI Number", key: "rfiNumber" },
              { header: "Subject", key: "subject" },
              { header: "Status", key: "status" },
              { header: "Raised To", key: "raisedTo" },
              { header: "Date Raised", key: "dateRaised" },
              { header: "Date Required", key: "dateRequired" },
              { header: "Date Answered", key: "dateAnswered" },
              { header: "Raised By", key: "raisedBy" },
              { header: "Question", key: "question" },
              { header: "Response", key: "response" },
            ]}
            rows={sorted.map((rfi) => ({
              rfiNumber: rfi.rfiNumber,
              subject: rfi.subject,
              status: RFI_STATUS_LABELS[rfi.status],
              raisedTo: rfi.raisedTo ?? "",
              dateRaised: formatDate(rfi.dateRaised),
              dateRequired: rfi.dateRequired ? formatDate(rfi.dateRequired) : "",
              dateAnswered: rfi.dateAnswered ? formatDate(rfi.dateAnswered) : "",
              raisedBy: rfi.raisedByName,
              question: rfi.question,
              response: rfi.response ?? "",
            }))}
          />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New RFI
          </button>
        </div>
      </div>

      {selection.count > 0 && (
        <BulkActionsBar
          count={selection.count}
          entityLabel="RFI"
          statusOptions={ALL_RFI_STATUSES.map((s) => ({ value: s, label: RFI_STATUS_LABELS[s] }))}
          onApplyStatus={handleBulkStatus}
          onDelete={handleBulkDelete}
          onClear={selection.clear}
        />
      )}

      {rfis.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No RFIs raised yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((rfi) => {
              const isExpanded = expandedId === rfi.id;
              const overdue = isRfiOverdue(rfi);
              return (
                <li key={rfi.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <input
                      type="checkbox"
                      checked={selection.isSelected(rfi.id)}
                      onChange={() => selection.toggle(rfi.id)}
                      className="mt-1.5 h-4 w-4 shrink-0"
                    />
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : rfi.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {rfi.rfiNumber}: {rfi.subject}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${RFI_STATUS_COLORS[rfi.status]}`}
                        >
                          {RFI_STATUS_LABELS[rfi.status]}
                        </span>
                        {overdue && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        {rfi.raisedTo && <span>To {rfi.raisedTo}</span>}
                        <span>Raised {formatDate(rfi.dateRaised)}</span>
                        {rfi.dateRequired && (
                          <span className={overdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                            Due {formatDate(rfi.dateRequired)}
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <select
                        value={rfi.status}
                        onChange={(e) => handleStatusChange(rfi, e.target.value as RfiStatus)}
                        className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                      >
                        {ALL_RFI_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {RFI_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => openEdit(rfi)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rfi)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Question
                        </div>
                        <FormattedText className="text-slate-700 dark:text-slate-300" text={rfi.question} />
                      </div>
                      {rfi.response && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Response
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={rfi.response} />
                        </div>
                      )}
                      {rfi.notes && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Notes
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={rfi.notes} />
                        </div>
                      )}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Raised by {rfi.raisedByName}
                        {rfi.dateAnswered && ` · Answered ${formatDate(rfi.dateAnswered)}`}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <ShowMoreButton state={shown} noun="RFIs" />
        </>
      )}

      {showModal && (
        <RfiFormModal
          rfi={editing}
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

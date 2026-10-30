import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { SqeRecord, SqeRecordInput, SqeStatus } from "../types";
import { formatDate } from "../format";
import {
  ALL_SQE_STATUSES,
  SQE_CATEGORY_COLORS,
  SQE_CATEGORY_LABELS,
  SQE_SEVERITY_COLORS,
  SQE_SEVERITY_LABELS,
  SQE_STATUS_COLORS,
  SQE_STATUS_LABELS,
  sqeSeverityRank,
} from "../sqeMeta";
import SqeFormModal from "./SqeFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  records: SqeRecord[];
  onCreate: (data: Partial<SqeRecordInput>) => Promise<void>;
  onUpdate: (record: SqeRecord, data: Partial<SqeRecordInput>) => Promise<void>;
  onDelete: (record: SqeRecord) => Promise<void>;
}

export default function SqePanel({ records, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SqeRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCount = records.filter((r) => r.status !== "CLOSED").length;

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(record: SqeRecord) {
    setEditing(record);
    setShowModal(true);
  }

  async function handleSave(data: Partial<SqeRecordInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(record: SqeRecord) {
    if (!await confirm(`Delete "${record.title}"? This cannot be undone.`)) return;
    await onDelete(record);
  }

  async function handleStatusChange(record: SqeRecord, status: SqeStatus) {
    await onUpdate(record, { status });
  }

  const sorted = [...records].sort(
    (a, b) => sqeSeverityRank(b.severity) - sqeSeverityRank(a.severity)
  );

  const shown = useShowMore(sorted);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Safety, Quality &amp; Environment
          </h2>
          {records.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {openCount} open of {records.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="sqe-issues" rows={records} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Issue
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No safety, quality, or environmental issues logged yet.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((record) => {
              const isExpanded = expandedId === record.id;
              return (
                <li key={record.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${SQE_CATEGORY_COLORS[record.category]}`}
                        >
                          {SQE_CATEGORY_LABELS[record.category]}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${SQE_SEVERITY_COLORS[record.severity]}`}
                        >
                          {SQE_SEVERITY_LABELS[record.severity]}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {record.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${SQE_STATUS_COLORS[record.status]}`}
                        >
                          {SQE_STATUS_LABELS[record.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>Occurred {formatDate(record.dateOccurred)}</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <select
                        value={record.status}
                        onChange={(e) =>
                          handleStatusChange(record, e.target.value as SqeStatus)
                        }
                        className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                      >
                        {ALL_SQE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {SQE_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => openEdit(record)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (record.description || record.correctiveAction) && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      {record.description && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Description
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={record.description} />
                        </div>
                      )}
                      {record.correctiveAction && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Corrective Action
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={record.correctiveAction} />
                        </div>
                      )}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Reported by {record.reportedByName}
                        {record.dateClosed && ` · Closed ${formatDate(record.dateClosed)}`}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <ShowMoreButton state={shown} noun="records" />
        </>
      )}

      {showModal && (
        <SqeFormModal
          record={editing}
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

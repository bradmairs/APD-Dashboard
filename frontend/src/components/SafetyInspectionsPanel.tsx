import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { SafetyInspection, SafetyInspectionInput, SafetyInspectionStatus } from "../types";
import { formatDate } from "../format";
import {
  ALL_SAFETY_INSPECTION_STATUSES,
  SAFETY_INSPECTION_STATUS_COLORS,
  SAFETY_INSPECTION_STATUS_LABELS,
  safetyInspectionRank,
} from "../safetyInspectionMeta";
import SafetyInspectionFormModal from "./SafetyInspectionFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  inspections: SafetyInspection[];
  onCreate: (data: Partial<SafetyInspectionInput>) => Promise<void>;
  onUpdate: (
    inspection: SafetyInspection,
    data: Partial<SafetyInspectionInput>
  ) => Promise<void>;
  onDelete: (inspection: SafetyInspection) => Promise<void>;
}

export default function SafetyInspectionsPanel({
  inspections,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SafetyInspection | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCount = inspections.filter((i) => i.status !== "CLOSED").length;

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(inspection: SafetyInspection) {
    setEditing(inspection);
    setShowModal(true);
  }

  async function handleSave(data: Partial<SafetyInspectionInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(inspection: SafetyInspection) {
    if (!await confirm(`Delete "${inspection.inspectionType}"? This cannot be undone.`)) return;
    await onDelete(inspection);
  }

  async function handleStatusChange(inspection: SafetyInspection, status: SafetyInspectionStatus) {
    await onUpdate(inspection, { status });
  }

  const sorted = [...inspections].sort((a, b) => {
    const rankDiff = safetyInspectionRank(a) - safetyInspectionRank(b);
    if (rankDiff !== 0) return rankDiff;
    const aScore = a.score ?? 100;
    const bScore = b.score ?? 100;
    return aScore - bScore;
  });

  const shown = useShowMore(sorted);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Site Safety Inspections
          </h2>
          {inspections.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {openCount} open of {inspections.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="safety-inspections" rows={inspections} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Inspection
          </button>
        </div>
      </div>

      {inspections.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No safety inspections logged yet.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((inspection) => {
              const isExpanded = expandedId === inspection.id;
              return (
                <li key={inspection.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : inspection.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {inspection.inspectionType}
                        </span>
                        {inspection.score !== null && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            Score {inspection.score}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${SAFETY_INSPECTION_STATUS_COLORS[inspection.status]}`}
                        >
                          {SAFETY_INSPECTION_STATUS_LABELS[inspection.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>{formatDate(inspection.inspectionDate)}</span>
                        <span>Conducted by {inspection.conductedBy}</span>
                        {inspection.location && <span>{inspection.location}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <select
                        value={inspection.status}
                        onChange={(e) =>
                          handleStatusChange(inspection, e.target.value as SafetyInspectionStatus)
                        }
                        className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                      >
                        {ALL_SAFETY_INSPECTION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {SAFETY_INSPECTION_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => openEdit(inspection)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(inspection)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (inspection.findings || inspection.correctiveAction) && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      {inspection.findings && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Findings
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={inspection.findings} />
                        </div>
                      )}
                      {inspection.correctiveAction && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Corrective Action
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={inspection.correctiveAction} />
                        </div>
                      )}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Recorded by {inspection.recordedByName}
                        {inspection.dateClosed &&
                          ` · Closed ${formatDate(inspection.dateClosed)}`}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <ShowMoreButton state={shown} noun="inspections" />
        </>
      )}

      {showModal && (
        <SafetyInspectionFormModal
          inspection={editing}
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

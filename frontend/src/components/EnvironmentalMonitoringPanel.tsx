import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { EnvironmentalMonitoringRecord, EnvironmentalMonitoringRecordInput } from "../types";
import { formatDate } from "../format";
import { environmentalMonitoringRank, isExceedance } from "../environmentalMeta";
import EnvironmentalMonitoringFormModal from "./EnvironmentalMonitoringFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  records: EnvironmentalMonitoringRecord[];
  onCreate: (data: Partial<EnvironmentalMonitoringRecordInput>) => Promise<void>;
  onUpdate: (
    record: EnvironmentalMonitoringRecord,
    data: Partial<EnvironmentalMonitoringRecordInput>
  ) => Promise<void>;
  onDelete: (record: EnvironmentalMonitoringRecord) => Promise<void>;
}

export default function EnvironmentalMonitoringPanel({
  records,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EnvironmentalMonitoringRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const exceedanceCount = records.filter(isExceedance).length;

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(record: EnvironmentalMonitoringRecord) {
    setEditing(record);
    setShowModal(true);
  }

  async function handleSave(data: Partial<EnvironmentalMonitoringRecordInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(record: EnvironmentalMonitoringRecord) {
    if (!await confirm(`Delete this ${record.parameter} reading? This cannot be undone.`)) return;
    await onDelete(record);
  }

  const sorted = [...records].sort((a, b) => {
    const rankDiff = environmentalMonitoringRank(a) - environmentalMonitoringRank(b);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.monitoringDate).getTime() - new Date(a.monitoringDate).getTime();
  });

  const shown = useShowMore(sorted);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Environmental Monitoring
          </h2>
          {records.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {exceedanceCount} exceedance{exceedanceCount === 1 ? "" : "s"} of {records.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="environmental-monitoring" rows={records} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Reading
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No environmental monitoring readings logged yet.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((record) => {
              const isExpanded = expandedId === record.id;
              const exceeded = isExceedance(record);
              return (
                <li key={record.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {record.parameter}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {record.readingValue} {record.unit}
                          {record.limitValue !== null &&
                            ` (limit ${record.limitType === "MAX" ? "≤" : "≥"} ${record.limitValue} ${record.unit})`}
                        </span>
                        {exceeded && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                            Exceedance
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>{formatDate(record.monitoringDate)}</span>
                        {record.location && <span>{record.location}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
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

                  {isExpanded && (record.correctiveAction || record.notes) && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      {record.correctiveAction && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Corrective Action
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={record.correctiveAction} />
                        </div>
                      )}
                      {record.notes && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Notes
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={record.notes} />
                        </div>
                      )}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Monitored by {record.monitoredByName}
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
        <EnvironmentalMonitoringFormModal
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

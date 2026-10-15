import { useState } from "react";
import { Milestone, MilestoneInput } from "../types";
import { formatDate } from "../format";
import MilestoneFormModal from "./MilestoneFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  milestones: Milestone[];
  onCreate: (data: Partial<MilestoneInput>) => Promise<void>;
  onUpdate: (
    milestone: Milestone,
    data: Partial<MilestoneInput>
  ) => Promise<void>;
  onDelete: (milestone: Milestone) => Promise<void>;
  onReorder: (milestone: Milestone, direction: "up" | "down") => Promise<void>;
}

export default function MilestonesPanel({
  milestones,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);

  const overallPercent =
    milestones.length === 0
      ? null
      : Math.round(
          milestones.reduce((sum, m) => sum + m.percentComplete, 0) /
            milestones.length
        );

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(milestone: Milestone) {
    setEditing(milestone);
    setShowModal(true);
  }

  async function handleSave(data: Partial<MilestoneInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(milestone: Milestone) {
    if (!await confirm(`Delete milestone "${milestone.taskActivity}"? This cannot be undone.`))
      return;
    await onDelete(milestone);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Milestones
          </h2>
          {overallPercent !== null && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {overallPercent}% complete overall
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="milestones" rows={milestones} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Milestone
          </button>
        </div>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No milestones yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <ul className="divide-y divide-slate-100 dark:divide-slate-700 min-w-[640px]">
            {milestones.map((milestone, index) => (
              <li key={milestone.id} className="py-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col shrink-0 pt-0.5">
                    <button
                      onClick={() => onReorder(milestone, "up")}
                      disabled={index === 0}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed leading-none text-xs"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => onReorder(milestone, "down")}
                      disabled={index === milestones.length - 1}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed leading-none text-xs"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {milestone.wbsItem && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {milestone.wbsItem}
                        </span>
                      )}
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {milestone.taskActivity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-32 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500"
                          style={{ width: `${milestone.percentComplete}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {milestone.percentComplete}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <div>
                        Start:{" "}
                        {milestone.startDate
                          ? formatDate(milestone.startDate)
                          : "After previous"}
                      </div>
                      <div>
                        Original: {formatDate(milestone.originalCompletion)}
                      </div>
                      <div>
                        Forecast: {formatDate(milestone.forecastedCompletion)}
                      </div>
                      <div>
                        Actual: {formatDate(milestone.actualCompletion)}
                      </div>
                    </div>

                    {milestone.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                        {milestone.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pt-0.5">
                    <button
                      onClick={() => openEdit(milestone)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(milestone)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showModal && (
        <MilestoneFormModal
          milestone={editing}
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

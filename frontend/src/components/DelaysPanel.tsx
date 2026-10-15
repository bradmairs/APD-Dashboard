import { useState } from "react";
import { Delay, DelayInput, DelayStatus } from "../types";
import { formatDate } from "../format";
import {
  ALL_DELAY_STATUSES,
  DELAY_STATUS_COLORS,
  DELAY_STATUS_LABELS,
  criticalPathDelayDays,
  delayDays,
  totalDelayDays,
} from "../delayMeta";
import DelayFormModal from "./DelayFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  delays: Delay[];
  onCreate: (data: Partial<DelayInput>) => Promise<void>;
  onUpdate: (delay: Delay, data: Partial<DelayInput>) => Promise<void>;
  onDelete: (delay: Delay) => Promise<void>;
}

export default function DelaysPanel({ delays, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Delay | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const confirm = useConfirm();

  const totalDays = totalDelayDays(delays);
  const criticalDays = criticalPathDelayDays(delays);
  const ongoingCount = delays.filter((d) => d.status === "ONGOING").length;

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(delay: Delay) {
    setEditing(delay);
    setShowModal(true);
  }

  async function handleSave(data: Partial<DelayInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  async function handleDelete(delay: Delay) {
    if (!(await confirm(`Delete delay "${delay.title}"? This cannot be undone.`))) return;
    await onDelete(delay);
  }

  async function handleStatusChange(delay: Delay, status: DelayStatus) {
    await onUpdate(delay, { status });
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Delays</h2>
          {delays.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {totalDays} day{totalDays === 1 ? "" : "s"} lost
              {criticalDays > 0 && ` · ${criticalDays} on the critical path`}
              {ongoingCount > 0 && ` · ${ongoingCount} ongoing`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="delays" rows={delays} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + Log Delay
          </button>
        </div>
      </div>

      {delays.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No delays logged yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {delays.map((delay) => {
            const isExpanded = expandedId === delay.id;
            const days = delayDays(delay);
            const hasDetail = delay.description || delay.mitigation || delay.notes;
            return (
              <li key={delay.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : delay.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {delay.title}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${DELAY_STATUS_COLORS[delay.status]}`}>
                        {DELAY_STATUS_LABELS[delay.status]}
                      </span>
                      {delay.criticalPath && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          Critical path
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>
                        {days} day{days === 1 ? "" : "s"}
                        {delay.daysImpact === null && " (from dates)"}
                      </span>
                      <span>
                        {formatDate(delay.dateStarted)}
                        {delay.dateEnded ? ` – ${formatDate(delay.dateEnded)}` : " – ongoing"}
                      </span>
                      {delay.category && <span>{delay.category}</span>}
                      {delay.responsibleParty && <span>Responsible: {delay.responsibleParty}</span>}
                      {delay.eotReference && <span>{delay.eotReference}</span>}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <select
                      value={delay.status}
                      onChange={(e) => handleStatusChange(delay, e.target.value as DelayStatus)}
                      className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                    >
                      {ALL_DELAY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {DELAY_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(delay)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(delay)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {[
                      ["Description", delay.description],
                      ["Mitigation / recovery action", delay.mitigation],
                      ["Notes", delay.notes],
                    ].map(
                      ([label, value]) =>
                        value && (
                          <div key={label}>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</div>
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{value}</p>
                          </div>
                        )
                    )}
                    {!hasDetail && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">No further detail recorded.</p>
                    )}
                    <div className="text-xs text-slate-400 dark:text-slate-500">Logged by {delay.raisedByName}</div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <DelayFormModal
          delay={editing}
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

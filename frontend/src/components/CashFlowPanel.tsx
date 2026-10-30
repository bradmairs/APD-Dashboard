import { useState } from "react";
import {
  CashFlowEntry,
  CashFlowEntryInput,
  CashFlowType,
  Project,
  Variation,
} from "../types";
import { formatCurrency, formatReportMonth } from "../format";
import { approvedVariationsTotal, revisedBudget } from "../variations";
import { entriesNearestNow, expenditureToDate, forecastAtCompletion } from "../cashflow";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import CashFlowChart from "../charts/CashFlowChart";
import CumulativeSpendChart from "../charts/CumulativeSpendChart";
import CashFlowEntryFormModal from "./CashFlowEntryFormModal";
import { useConfirm } from "../confirm/ConfirmContext";

interface Props {
  project: Project;
  entries: CashFlowEntry[];
  variations: Variation[];
  onUpsert: (data: Partial<CashFlowEntryInput>) => Promise<void>;
  onUpdate: (entry: CashFlowEntry, data: Partial<CashFlowEntryInput>) => Promise<void>;
  onDelete: (entry: CashFlowEntry) => Promise<void>;
}

export default function CashFlowPanel({
  project,
  entries,
  variations,
  onUpsert,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CashFlowEntry | null>(null);

  const expenditure = expenditureToDate(entries);
  const forecastTotal = forecastAtCompletion(entries);
  const approvedVariations = approvedVariationsTotal(variations);
  const currentBudget = revisedBudget(project, variations);
  const variance = currentBudget === null ? null : currentBudget - forecastTotal;

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  // Switches an entry between forecast and actual in place — same entry, same
  // amount — so a month's forecast becomes its actual without re-entering
  // it. Edit is still there for changing the amount at the same time.
  async function handleToggleType(entry: CashFlowEntry) {
    const targetType: CashFlowType = entry.type === "ACTUAL" ? "FORECAST" : "ACTUAL";
    const existing = entries.find(
      (other) =>
        other.id !== entry.id &&
        other.type === targetType &&
        other.month.substring(0, 7) === entry.month.substring(0, 7)
    );
    if (
      existing &&
      !(await confirm(
        `${formatReportMonth(entry.month)} already has a ${targetType.toLowerCase()} entry (${formatCurrency(
          existing.amount
        )}). Replace it with this ${formatCurrency(entry.amount)} entry?`,
        { confirmLabel: "Replace" }
      ))
    )
      return;
    await onUpdate(entry, { type: targetType });
  }

  function openEdit(entry: CashFlowEntry) {
    setEditing(entry);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
  }

  async function handleSave(data: Partial<CashFlowEntryInput>) {
    if (editing) {
      await onUpdate(editing, { type: data.type, amount: data.amount });
    } else {
      await onUpsert(data);
    }
    closeModal();
  }

  const confirm = useConfirm();

  async function handleDelete(entry: CashFlowEntry) {
    if (
      !await confirm(
        `Delete the ${formatReportMonth(entry.month)} ${entry.type.toLowerCase()} entry? This cannot be undone.`
      )
    )
      return;
    await onDelete(entry);
  }

  // Collapsed, the list shows the months nearest today (latest actuals and
  // next forecasts); the charts above always cover every month.
  const shown = useShowMore(entries, (items, limit) => entriesNearestNow(items, limit));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Cash Flow
        </h2>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          + Add Entry
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <Stat label="Original Budget" value={formatCurrency(project.budget)} />
        {project.latestApprovedBudget !== null && (
          <Stat
            label="Latest Approved Budget"
            value={formatCurrency(project.latestApprovedBudget)}
          />
        )}
        {approvedVariations !== 0 && (
          <>
            <Stat label="Approved Variations" value={formatCurrency(approvedVariations)} />
            <Stat label="Revised Budget" value={formatCurrency(currentBudget)} />
          </>
        )}
        {project.contractValue !== null && (
          <Stat label="Contract Value" value={formatCurrency(project.contractValue)} />
        )}
        <Stat label="Expenditure to Date" value={formatCurrency(expenditure)} />
        <Stat label="Forecast Total" value={formatCurrency(forecastTotal)} />
        <Stat
          label="Variance"
          value={variance === null ? "—" : formatCurrency(variance)}
          negative={variance !== null && variance < 0}
        />
      </div>

      <div className="mb-4">
        <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
          Spend vs Budget Over Time
        </h3>
        <CumulativeSpendChart project={project} entries={entries} variations={variations} />
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No cash flow entries yet.
        </p>
      ) : (
        <>
          <div className="mb-4">
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Monthly Spend
            </h3>
            <CashFlowChart entries={entries} />
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((entry) => (
              <li
                key={entry.id}
                className="py-2 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-slate-100">
                    {formatReportMonth(entry.month)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      entry.type === "ACTUAL"
                        ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        : "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                    }`}
                  >
                    {entry.type === "ACTUAL" ? "Actual" : "Forecast"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-900 dark:text-slate-100">
                    {formatCurrency(entry.amount)}
                  </span>
                  <button
                    onClick={() => handleToggleType(entry)}
                    className={`text-xs hover:underline ${
                      entry.type === "FORECAST"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-sky-700 dark:text-sky-400"
                    }`}
                    title={
                      entry.type === "FORECAST"
                        ? "Change this entry to an actual, keeping its amount"
                        : "Change this entry back to a forecast, keeping its amount"
                    }
                  >
                    {entry.type === "FORECAST" ? "Mark as actual" : "Mark as forecast"}
                  </button>
                  <button
                    onClick={() => openEdit(entry)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <ShowMoreButton state={shown} noun="entries" />
        </>
      )}

      {showModal && (
        <CashFlowEntryFormModal
          entry={editing}
          entries={entries}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div
        className={`text-sm font-medium mt-0.5 ${
          negative ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

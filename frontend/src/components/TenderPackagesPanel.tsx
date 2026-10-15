import { useState } from "react";
import { TenderPackage, TenderPackageInput, TenderStatus } from "../types";
import { formatCurrency, formatDate } from "../format";
import {
  ALL_TENDER_STATUSES,
  TENDER_METHOD_LABELS,
  TENDER_STATUS_COLORS,
  TENDER_STATUS_LABELS,
  tenderPackageRank,
} from "../tenderMeta";
import TenderPackageFormModal from "./TenderPackageFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  tenderPackages: TenderPackage[];
  onCreate: (data: Partial<TenderPackageInput>) => Promise<void>;
  onUpdate: (
    tenderPackage: TenderPackage,
    data: Partial<TenderPackageInput>
  ) => Promise<void>;
  onDelete: (tenderPackage: TenderPackage) => Promise<void>;
}

export default function TenderPackagesPanel({
  tenderPackages,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TenderPackage | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeCount = tenderPackages.filter(
    (t) => t.status !== "AWARDED" && t.status !== "CANCELLED"
  ).length;

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(tenderPackage: TenderPackage) {
    setEditing(tenderPackage);
    setShowModal(true);
  }

  async function handleSave(data: Partial<TenderPackageInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(tenderPackage: TenderPackage) {
    if (!await confirm(`Delete "${tenderPackage.title}"? This cannot be undone.`)) return;
    await onDelete(tenderPackage);
  }

  async function handleStatusChange(tenderPackage: TenderPackage, status: TenderStatus) {
    await onUpdate(tenderPackage, { status });
  }

  const sorted = [...tenderPackages].sort((a, b) => {
    const rankDiff = tenderPackageRank(a) - tenderPackageRank(b);
    if (rankDiff !== 0) return rankDiff;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Procurement &amp; Tenders
          </h2>
          {tenderPackages.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {activeCount} active of {tenderPackages.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="tender-packages" rows={tenderPackages} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Package
          </button>
        </div>
      </div>

      {tenderPackages.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No tender packages raised yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map((tenderPackage) => {
            const isExpanded = expandedId === tenderPackage.id;
            return (
              <li key={tenderPackage.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : tenderPackage.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {tenderPackage.packageNumber && (
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {tenderPackage.packageNumber}
                        </span>
                      )}
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {tenderPackage.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${TENDER_STATUS_COLORS[tenderPackage.status]}`}
                      >
                        {TENDER_STATUS_LABELS[tenderPackage.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>{TENDER_METHOD_LABELS[tenderPackage.method]}</span>
                      {tenderPackage.closingDate && (
                        <span>Closes {formatDate(tenderPackage.closingDate)}</span>
                      )}
                      {tenderPackage.estimatedValue !== null && (
                        <span>Est. {formatCurrency(tenderPackage.estimatedValue)}</span>
                      )}
                      {tenderPackage.status === "AWARDED" && tenderPackage.awardedTo && (
                        <span>
                          Awarded to {tenderPackage.awardedTo}
                          {tenderPackage.awardedValue !== null &&
                            ` (${formatCurrency(tenderPackage.awardedValue)})`}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <select
                      value={tenderPackage.status}
                      onChange={(e) =>
                        handleStatusChange(tenderPackage, e.target.value as TenderStatus)
                      }
                      className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                    >
                      {ALL_TENDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {TENDER_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(tenderPackage)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tenderPackage)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (tenderPackage.description || tenderPackage.notes) && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {tenderPackage.description && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Description
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {tenderPackage.description}
                        </p>
                      </div>
                    )}
                    {tenderPackage.notes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Notes
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {tenderPackage.notes}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Managed by {tenderPackage.managedByName}
                      {tenderPackage.submissionsReceived !== null &&
                        ` · ${tenderPackage.submissionsReceived} submission${tenderPackage.submissionsReceived === 1 ? "" : "s"} received`}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <TenderPackageFormModal
          tenderPackage={editing}
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

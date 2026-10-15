import { useState } from "react";
import { Subcontractor, SubcontractorInput, SubcontractorStatus } from "../types";
import { formatCurrency, formatDate } from "../format";
import {
  ALL_SUBCONTRACTOR_STATUSES,
  SUBCONTRACTOR_STATUS_COLORS,
  SUBCONTRACTOR_STATUS_LABELS,
  isSubcontractorInsuranceExpired,
  isSubcontractorInsuranceExpiringSoon,
  subcontractorStatusRank,
} from "../subcontractorMeta";
import SubcontractorFormModal from "./SubcontractorFormModal";
import ExportCsvButton from "./ExportCsvButton";
import ImportCsvButton from "./ImportCsvButton";
import { parseImportCurrency, parseImportDate, parseOptionalEnum, requireCell } from "../csvImport";
import BulkActionsBar from "./BulkActionsBar";
import { useSelection } from "../useSelection";
import { useConfirm } from "../confirm/ConfirmContext";

const SUBCONTRACTOR_IMPORT_HEADERS = [
  "Company",
  "Trade",
  "Contact Name",
  "Contact Details",
  "Contract Value",
  "Status",
  "Start Date",
  "End Date",
  "Insurance Expiry",
  "Notes",
];

function parseSubcontractorImportRow(row: Record<string, string>): Partial<SubcontractorInput> {
  return {
    companyName: requireCell(row, "Company"),
    trade: row["Trade"] || null,
    contactName: row["Contact Name"] || null,
    contactDetails: row["Contact Details"] || null,
    contractValue: row["Contract Value"] ? parseImportCurrency(row["Contract Value"]) : null,
    status: parseOptionalEnum(SUBCONTRACTOR_STATUS_LABELS, row["Status"], "Status") ?? "ENGAGED",
    startDate: parseImportDate(row["Start Date"] ?? ""),
    endDate: parseImportDate(row["End Date"] ?? ""),
    insuranceExpiry: parseImportDate(row["Insurance Expiry"] ?? ""),
    notes: row["Notes"] || null,
  };
}

interface Props {
  subcontractors: Subcontractor[];
  onCreate: (data: Partial<SubcontractorInput>) => Promise<void>;
  onUpdate: (subcontractor: Subcontractor, data: Partial<SubcontractorInput>) => Promise<void>;
  onDelete: (subcontractor: Subcontractor) => Promise<void>;
}

export default function SubcontractorsPanel({
  subcontractors,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Subcontractor | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selection = useSelection();

  async function handleBulkStatus(status: SubcontractorStatus) {
    for (const subcontractor of subcontractors.filter((s) => selection.isSelected(s.id))) {
      await onUpdate(subcontractor, { status });
    }
    selection.clear();
  }

  async function handleBulkDelete() {
    for (const subcontractor of subcontractors.filter((s) => selection.isSelected(s.id))) {
      await onDelete(subcontractor);
    }
    selection.clear();
  }

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(subcontractor: Subcontractor) {
    setEditing(subcontractor);
    setShowModal(true);
  }

  async function handleSave(data: Partial<SubcontractorInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(subcontractor: Subcontractor) {
    if (!await confirm(`Delete "${subcontractor.companyName}"? This cannot be undone.`)) return;
    await onDelete(subcontractor);
  }

  async function handleStatusChange(subcontractor: Subcontractor, status: SubcontractorStatus) {
    await onUpdate(subcontractor, { status });
  }

  const sorted = [...subcontractors].sort(
    (a, b) => subcontractorStatusRank(a.status) - subcontractorStatusRank(b.status)
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Subcontractors
          </h2>
          {subcontractors.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {subcontractors.length} on record
            </span>
          )}
          {subcontractors.length > 0 && (
            <button
              onClick={() => selection.toggleAll(sorted.map((s) => s.id))}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {selection.count === subcontractors.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            filename="subcontractors"
            columns={[
              { header: "Company", key: "companyName" },
              { header: "Trade", key: "trade" },
              { header: "Contact Name", key: "contactName" },
              { header: "Contact Details", key: "contactDetails" },
              { header: "Contract Value", key: "contractValue" },
              { header: "Status", key: "status" },
              { header: "Start Date", key: "startDate" },
              { header: "End Date", key: "endDate" },
              { header: "Insurance Expiry", key: "insuranceExpiry" },
              { header: "Notes", key: "notes" },
            ]}
            rows={subcontractors.map((subcontractor) => ({
              companyName: subcontractor.companyName,
              trade: subcontractor.trade ?? "",
              contactName: subcontractor.contactName ?? "",
              contactDetails: subcontractor.contactDetails ?? "",
              contractValue:
                subcontractor.contractValue != null ? formatCurrency(subcontractor.contractValue) : "",
              status: SUBCONTRACTOR_STATUS_LABELS[subcontractor.status],
              startDate: subcontractor.startDate ? formatDate(subcontractor.startDate) : "",
              endDate: subcontractor.endDate ? formatDate(subcontractor.endDate) : "",
              insuranceExpiry: subcontractor.insuranceExpiry
                ? formatDate(subcontractor.insuranceExpiry)
                : "",
              notes: subcontractor.notes ?? "",
            }))}
          />
          <ImportCsvButton
            entityLabel="subcontractor"
            expectedHeaders={SUBCONTRACTOR_IMPORT_HEADERS}
            parseRow={parseSubcontractorImportRow}
            onImportRow={onCreate}
            onImported={async () => {}}
          />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Subcontractor
          </button>
        </div>
      </div>

      {selection.count > 0 && (
        <BulkActionsBar
          count={selection.count}
          entityLabel="subcontractor"
          statusOptions={ALL_SUBCONTRACTOR_STATUSES.map((s) => ({ value: s, label: SUBCONTRACTOR_STATUS_LABELS[s] }))}
          onApplyStatus={handleBulkStatus}
          onDelete={handleBulkDelete}
          onClear={selection.clear}
        />
      )}

      {subcontractors.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No subcontractors logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map((subcontractor) => {
            const isExpanded = expandedId === subcontractor.id;
            const expired = isSubcontractorInsuranceExpired(subcontractor);
            const expiringSoon = isSubcontractorInsuranceExpiringSoon(subcontractor);
            return (
              <li key={subcontractor.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(subcontractor.id)}
                    onChange={() => selection.toggle(subcontractor.id)}
                    className="mt-1.5 h-4 w-4 shrink-0"
                  />
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : subcontractor.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {subcontractor.companyName}
                      </span>
                      {subcontractor.trade && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          {subcontractor.trade}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${SUBCONTRACTOR_STATUS_COLORS[subcontractor.status]}`}
                      >
                        {SUBCONTRACTOR_STATUS_LABELS[subcontractor.status]}
                      </span>
                      {expired && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          Insurance Expired
                        </span>
                      )}
                      {!expired && expiringSoon && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Insurance Expiring Soon
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {subcontractor.contractValue && (
                        <span>{formatCurrency(subcontractor.contractValue)}</span>
                      )}
                      {subcontractor.startDate && (
                        <span>Started {formatDate(subcontractor.startDate)}</span>
                      )}
                      {subcontractor.insuranceExpiry && (
                        <span
                          className={
                            expired
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : expiringSoon
                              ? "text-amber-600 dark:text-amber-400 font-medium"
                              : ""
                          }
                        >
                          Insurance expires {formatDate(subcontractor.insuranceExpiry)}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <select
                      value={subcontractor.status}
                      onChange={(e) =>
                        handleStatusChange(subcontractor, e.target.value as SubcontractorStatus)
                      }
                      className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                    >
                      {ALL_SUBCONTRACTOR_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {SUBCONTRACTOR_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(subcontractor)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(subcontractor)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {(subcontractor.contactName || subcontractor.contactDetails) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {subcontractor.contactName}
                        {subcontractor.contactName && subcontractor.contactDetails ? " · " : ""}
                        {subcontractor.contactDetails}
                      </div>
                    )}
                    {subcontractor.endDate && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        End date {formatDate(subcontractor.endDate)}
                      </div>
                    )}
                    {subcontractor.notes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Notes
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {subcontractor.notes}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Added by {subcontractor.addedByName}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <SubcontractorFormModal
          subcontractor={editing}
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

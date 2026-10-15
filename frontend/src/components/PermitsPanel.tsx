import { useState } from "react";
import { Permit, PermitInput, PermitStatus } from "../types";
import { formatDate } from "../format";
import {
  ALL_PERMIT_STATUSES,
  PERMIT_STATUS_COLORS,
  PERMIT_STATUS_LABELS,
  isPermitExpired,
  isPermitExpiringSoon,
} from "../permitMeta";
import PermitFormModal from "./PermitFormModal";
import ExportCsvButton from "./ExportCsvButton";
import ImportCsvButton from "./ImportCsvButton";
import { parseImportDate, parseOptionalEnum, requireCell } from "../csvImport";
import BulkActionsBar from "./BulkActionsBar";
import { useSelection } from "../useSelection";
import { useConfirm } from "../confirm/ConfirmContext";

const PERMIT_IMPORT_HEADERS = [
  "Title",
  "Category",
  "Reference Number",
  "Issuing Authority",
  "Status",
  "Date Applied",
  "Date Approved",
  "Expiry Date",
  "Notes",
];

function parsePermitImportRow(row: Record<string, string>): Partial<PermitInput> {
  return {
    title: requireCell(row, "Title"),
    category: row["Category"] || null,
    referenceNumber: row["Reference Number"] || null,
    issuingAuthority: row["Issuing Authority"] || null,
    status: parseOptionalEnum(PERMIT_STATUS_LABELS, row["Status"], "Status") ?? "PENDING",
    dateApplied: parseImportDate(row["Date Applied"] ?? ""),
    dateApproved: parseImportDate(row["Date Approved"] ?? ""),
    expiryDate: parseImportDate(row["Expiry Date"] ?? ""),
    notes: row["Notes"] || null,
  };
}

interface Props {
  permits: Permit[];
  onCreate: (data: Partial<PermitInput>) => Promise<void>;
  onUpdate: (permit: Permit, data: Partial<PermitInput>) => Promise<void>;
  onDelete: (permit: Permit) => Promise<void>;
}

export default function PermitsPanel({ permits, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Permit | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selection = useSelection();

  async function handleBulkStatus(status: PermitStatus) {
    for (const permit of permits.filter((p) => selection.isSelected(p.id))) {
      await onUpdate(permit, { status });
    }
    selection.clear();
  }

  async function handleBulkDelete() {
    for (const permit of permits.filter((p) => selection.isSelected(p.id))) {
      await onDelete(permit);
    }
    selection.clear();
  }

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(permit: Permit) {
    setEditing(permit);
    setShowModal(true);
  }

  async function handleSave(data: Partial<PermitInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(permit: Permit) {
    if (!await confirm(`Delete permit "${permit.title}"? This cannot be undone.`)) return;
    await onDelete(permit);
  }

  async function handleStatusChange(permit: Permit, status: PermitStatus) {
    await onUpdate(permit, { status });
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Permits &amp; Approvals
          </h2>
          {permits.length > 0 && (
            <button
              onClick={() => selection.toggleAll(permits.map((p) => p.id))}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {selection.count === permits.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            filename="permits-and-approvals"
            columns={[
              { header: "Title", key: "title" },
              { header: "Category", key: "category" },
              { header: "Reference Number", key: "referenceNumber" },
              { header: "Issuing Authority", key: "issuingAuthority" },
              { header: "Status", key: "status" },
              { header: "Date Applied", key: "dateApplied" },
              { header: "Date Approved", key: "dateApproved" },
              { header: "Expiry Date", key: "expiryDate" },
              { header: "Notes", key: "notes" },
            ]}
            rows={permits.map((permit) => ({
              title: permit.title,
              category: permit.category ?? "",
              referenceNumber: permit.referenceNumber ?? "",
              issuingAuthority: permit.issuingAuthority ?? "",
              status: PERMIT_STATUS_LABELS[permit.status],
              dateApplied: permit.dateApplied ? formatDate(permit.dateApplied) : "",
              dateApproved: permit.dateApproved ? formatDate(permit.dateApproved) : "",
              expiryDate: permit.expiryDate ? formatDate(permit.expiryDate) : "",
              notes: permit.notes ?? "",
            }))}
          />
          <ImportCsvButton
            entityLabel="permit"
            expectedHeaders={PERMIT_IMPORT_HEADERS}
            parseRow={parsePermitImportRow}
            onImportRow={onCreate}
            onImported={async () => {}}
          />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Permit
          </button>
        </div>
      </div>

      {selection.count > 0 && (
        <BulkActionsBar
          count={selection.count}
          entityLabel="permit"
          statusOptions={ALL_PERMIT_STATUSES.map((s) => ({ value: s, label: PERMIT_STATUS_LABELS[s] }))}
          onApplyStatus={handleBulkStatus}
          onDelete={handleBulkDelete}
          onClear={selection.clear}
        />
      )}

      {permits.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No permits or approvals logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {permits.map((permit) => {
            const isExpanded = expandedId === permit.id;
            const expired = isPermitExpired(permit);
            const expiringSoon = isPermitExpiringSoon(permit);
            return (
              <li key={permit.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(permit.id)}
                    onChange={() => selection.toggle(permit.id)}
                    className="mt-1.5 h-4 w-4 shrink-0"
                  />
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : permit.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {permit.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${PERMIT_STATUS_COLORS[permit.status]}`}
                      >
                        {PERMIT_STATUS_LABELS[permit.status]}
                      </span>
                      {expired && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          Expired
                        </span>
                      )}
                      {!expired && expiringSoon && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {permit.category && <span>{permit.category}</span>}
                      {permit.referenceNumber && <span>{permit.referenceNumber}</span>}
                      {permit.issuingAuthority && <span>{permit.issuingAuthority}</span>}
                      {permit.expiryDate && (
                        <span
                          className={
                            expired
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : expiringSoon
                              ? "text-amber-600 dark:text-amber-400 font-medium"
                              : ""
                          }
                        >
                          Expires {formatDate(permit.expiryDate)}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <select
                      value={permit.status}
                      onChange={(e) =>
                        handleStatusChange(permit, e.target.value as PermitStatus)
                      }
                      className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                    >
                      {ALL_PERMIT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {PERMIT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(permit)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(permit)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && permit.notes && (
                  <div className="mt-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Notes
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                      {permit.notes}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <PermitFormModal
          permit={editing}
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

import { useState } from "react";
import { InsuranceWarranty, InsuranceWarrantyInput } from "../types";
import { formatDate } from "../format";
import {
  INSURANCE_WARRANTY_TYPE_COLORS,
  INSURANCE_WARRANTY_TYPE_LABELS,
  isInsuranceWarrantyExpired,
  isInsuranceWarrantyExpiringSoon,
} from "../insuranceWarrantyMeta";
import InsuranceWarrantyFormModal from "./InsuranceWarrantyFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  items: InsuranceWarranty[];
  onCreate: (data: Partial<InsuranceWarrantyInput>) => Promise<void>;
  onUpdate: (item: InsuranceWarranty, data: Partial<InsuranceWarrantyInput>) => Promise<void>;
  onDelete: (item: InsuranceWarranty) => Promise<void>;
}

export default function InsuranceWarrantiesPanel({
  items,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<InsuranceWarranty | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(item: InsuranceWarranty) {
    setEditing(item);
    setShowModal(true);
  }

  async function handleSave(data: Partial<InsuranceWarrantyInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(item: InsuranceWarranty) {
    if (!await confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    await onDelete(item);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Insurance &amp; Warranties
        </h2>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="insurance-and-warranties" rows={items} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No insurance policies or warranties logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            const expired = isInsuranceWarrantyExpired(item);
            const expiringSoon = isInsuranceWarrantyExpiringSoon(item);
            return (
              <li key={item.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${INSURANCE_WARRANTY_TYPE_COLORS[item.type]}`}
                      >
                        {INSURANCE_WARRANTY_TYPE_LABELS[item.type]}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.title}
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
                      {item.provider && <span>{item.provider}</span>}
                      {item.referenceNumber && <span>{item.referenceNumber}</span>}
                      {item.expiryDate && (
                        <span
                          className={
                            expired
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : expiringSoon
                              ? "text-amber-600 dark:text-amber-400 font-medium"
                              : ""
                          }
                        >
                          Expires {formatDate(item.expiryDate)}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (item.coverageDetails || item.notes) && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {item.coverageDetails && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Coverage Details
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {item.coverageDetails}
                        </p>
                      </div>
                    )}
                    {item.notes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Notes
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {item.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <InsuranceWarrantyFormModal
          item={editing}
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

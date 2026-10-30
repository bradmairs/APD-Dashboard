import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { EotClaim, EotClaimInput, EotStatus } from "../types";
import { formatDate } from "../format";
import { approvedEotDaysTotal } from "../eot";
import { ALL_EOT_STATUSES, EOT_STATUS_COLORS, EOT_STATUS_LABELS } from "../eotMeta";
import EotClaimFormModal from "./EotClaimFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  claims: EotClaim[];
  onCreate: (data: Partial<EotClaimInput>) => Promise<void>;
  onUpdate: (claim: EotClaim, data: Partial<EotClaimInput>) => Promise<void>;
  onDelete: (claim: EotClaim) => Promise<void>;
}

export default function EotPanel({ claims, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EotClaim | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const approvedDays = approvedEotDaysTotal(claims);
  const submittedCount = claims.filter((c) => c.status === "SUBMITTED").length;

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(claim: EotClaim) {
    setEditing(claim);
    setShowModal(true);
  }

  async function handleSave(data: Partial<EotClaimInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(claim: EotClaim) {
    if (!await confirm(`Delete EOT claim "${claim.title}"? This cannot be undone.`)) return;
    await onDelete(claim);
  }

  async function handleStatusChange(claim: EotClaim, status: EotStatus) {
    await onUpdate(claim, { status });
  }

  const shown = useShowMore(claims);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Extension of Time Claims
          </h2>
          {claims.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {approvedDays} day{approvedDays === 1 ? "" : "s"} approved
              {submittedCount > 0 && ` · ${submittedCount} awaiting decision`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="eot-claims" rows={claims} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New EOT Claim
          </button>
        </div>
      </div>

      {claims.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No EOT claims raised yet.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((claim) => {
              const isExpanded = expandedId === claim.id;
              return (
                <li key={claim.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : claim.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {claim.reference && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {claim.reference}
                          </span>
                        )}
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {claim.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${EOT_STATUS_COLORS[claim.status]}`}
                        >
                          {EOT_STATUS_LABELS[claim.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>
                          {claim.daysClaimed} day{claim.daysClaimed === 1 ? "" : "s"} claimed
                        </span>
                        {claim.daysGranted !== null && (
                          <span>
                            {claim.daysGranted} day{claim.daysGranted === 1 ? "" : "s"} granted
                          </span>
                        )}
                        <span>Submitted {formatDate(claim.dateSubmitted)}</span>
                        {claim.cause && <span>{claim.cause}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <select
                        value={claim.status}
                        onChange={(e) =>
                          handleStatusChange(claim, e.target.value as EotStatus)
                        }
                        className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                      >
                        {ALL_EOT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {EOT_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => openEdit(claim)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(claim)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (claim.description || claim.notes) && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      {claim.description && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Description
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={claim.description} />
                        </div>
                      )}
                      {claim.notes && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Notes
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={claim.notes} />
                        </div>
                      )}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Raised by {claim.raisedByName}
                        {claim.dateDecided && ` · Decided ${formatDate(claim.dateDecided)}`}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <ShowMoreButton state={shown} noun="claims" />
        </>
      )}

      {showModal && (
        <EotClaimFormModal
          claim={editing}
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

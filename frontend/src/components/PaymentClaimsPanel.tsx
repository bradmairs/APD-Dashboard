import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { trimHref } from "../trim";
import { ContractRecord, PaymentClaim, PaymentClaimInput, PaymentClaimStatus } from "../types";
import { formatCurrency, formatDate } from "../format";
import {
  ALL_PAYMENT_CLAIM_STATUSES,
  PAYMENT_CLAIM_STATUS_COLORS,
  PAYMENT_CLAIM_STATUS_LABELS,
  paymentClaimStatusRank,
} from "../paymentClaimMeta";
import PaymentClaimFormModal from "./PaymentClaimFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  claims: PaymentClaim[];
  contracts: ContractRecord[];
  onCreate: (data: Partial<PaymentClaimInput>) => Promise<void>;
  onUpdate: (claim: PaymentClaim, data: Partial<PaymentClaimInput>) => Promise<void>;
  onDelete: (claim: PaymentClaim) => Promise<void>;
}

export default function PaymentClaimsPanel({
  claims,
  contracts,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PaymentClaim | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const outstandingCount = claims.filter((c) => c.status !== "PAID").length;
  const certifiedToDate = claims
    .filter((c) => c.status === "CERTIFIED" || c.status === "PAID")
    .reduce((sum, c) => sum + (c.certifiedAmount ?? 0), 0);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(claim: PaymentClaim) {
    setEditing(claim);
    setShowModal(true);
  }

  async function handleSave(data: Partial<PaymentClaimInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(claim: PaymentClaim) {
    if (!await confirm(`Delete claim "${claim.claimNumber}"? This cannot be undone.`)) return;
    await onDelete(claim);
  }

  async function handleStatusChange(claim: PaymentClaim, status: PaymentClaimStatus) {
    await onUpdate(claim, { status });
  }

  const sorted = [...claims].sort(
    (a, b) => paymentClaimStatusRank(a.status) - paymentClaimStatusRank(b.status)
  );

  function contractName(claim: PaymentClaim): string | null {
    if (!claim.contractId) return null;
    return contracts.find((c) => c.id === claim.contractId)?.partyName ?? null;
  }

  const shown = useShowMore(sorted);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Payment Claims
          </h2>
          {claims.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatCurrency(certifiedToDate)} certified to date · {outstandingCount}{" "}
              outstanding
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="payment-claims" rows={claims} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Claim
          </button>
        </div>
      </div>

      {claims.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No payment claims logged yet.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((claim) => {
              const isExpanded = expandedId === claim.id;
              const against = contractName(claim);
              return (
                <li key={claim.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : claim.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {claim.claimNumber}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_CLAIM_STATUS_COLORS[claim.status]}`}
                        >
                          {PAYMENT_CLAIM_STATUS_LABELS[claim.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>Claimed {formatCurrency(claim.claimedAmount)}</span>
                        {claim.certifiedAmount != null && (
                          <span>Certified {formatCurrency(claim.certifiedAmount)}</span>
                        )}
                        {claim.periodEnding && (
                          <span>Period ending {formatDate(claim.periodEnding)}</span>
                        )}
                        {against && <span>Against {against}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      {claim.trimLink &&
                        (trimHref(claim.trimLink) ? (
                          <a
                            href={trimHref(claim.trimLink)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={claim.trimLink}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            TRIM ↗
                          </a>
                        ) : (
                          <span
                            className="text-xs font-mono text-slate-500 dark:text-slate-400"
                            title="TRIM record number"
                          >
                            TRIM {claim.trimLink}
                          </span>
                        ))}
                      <select
                        value={claim.status}
                        onChange={(e) =>
                          handleStatusChange(claim, e.target.value as PaymentClaimStatus)
                        }
                        className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                      >
                        {ALL_PAYMENT_CLAIM_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {PAYMENT_CLAIM_STATUS_LABELS[s]}
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

                  {isExpanded && claim.notes && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Notes
                        </div>
                        <FormattedText className="text-slate-700 dark:text-slate-300" text={claim.notes} />
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Raised by {claim.raisedByName} on {formatDate(claim.dateSubmitted)}
                        {claim.dateCertified && ` · Certified ${formatDate(claim.dateCertified)}`}
                        {claim.datePaid && ` · Paid ${formatDate(claim.datePaid)}`}
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
        <PaymentClaimFormModal
          claim={editing}
          contracts={contracts}
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

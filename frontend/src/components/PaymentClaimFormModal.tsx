import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { ContractRecord, PaymentClaim, PaymentClaimInput, PaymentClaimStatus } from "../types";
import { ALL_PAYMENT_CLAIM_STATUSES, PAYMENT_CLAIM_STATUS_LABELS } from "../paymentClaimMeta";

interface Props {
  claim: PaymentClaim | null;
  contracts: ContractRecord[];
  onClose: () => void;
  onSave: (data: Partial<PaymentClaimInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.substring(0, 10);
}

export default function PaymentClaimFormModal({ claim, contracts, onClose, onSave }: Props) {
  const [claimNumber, setClaimNumber] = useState(claim?.claimNumber ?? "");
  const [contractId, setContractId] = useState(claim?.contractId ?? "");
  const [periodEnding, setPeriodEnding] = useState(
    toDateInputValue(claim?.periodEnding ?? null)
  );
  const [claimedAmount, setClaimedAmount] = useState(
    claim?.claimedAmount != null ? String(claim.claimedAmount) : ""
  );
  const [certifiedAmount, setCertifiedAmount] = useState(
    claim?.certifiedAmount != null ? String(claim.certifiedAmount) : ""
  );
  const [status, setStatus] = useState<PaymentClaimStatus>(claim?.status ?? "SUBMITTED");
  const [dateSubmitted, setDateSubmitted] = useState(
    toDateInputValue(claim?.dateSubmitted ?? null) || new Date().toISOString().substring(0, 10)
  );
  const [notes, setNotes] = useState(claim?.notes ?? "");
  const [trimLink, setTrimLink] = useState(claim?.trimLink ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        claimNumber: claimNumber.trim(),
        periodEnding: periodEnding ? new Date(periodEnding).toISOString() : null,
        claimedAmount: Number(claimedAmount),
        certifiedAmount: certifiedAmount ? Number(certifiedAmount) : null,
        status,
        dateSubmitted: new Date(dateSubmitted).toISOString(),
        notes: notes || null,
        trimLink: trimLink.trim() || null,
        contractId: contractId || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save payment claim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {claim ? "Edit Payment Claim" : "New Payment Claim"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Claim Number
              </label>
              <input
                required
                value={claimNumber}
                onChange={(e) => setClaimNumber(e.target.value)}
                placeholder="e.g. PC-07"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Period Ending
              </label>
              <input
                type="date"
                value={periodEnding}
                onChange={(e) => setPeriodEnding(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Contract
            </label>
            <select
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.partyName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Claimed Amount ($, Excl. GST)
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={claimedAmount}
                onChange={(e) => setClaimedAmount(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Certified Amount ($, Excl. GST)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={certifiedAmount}
                onChange={(e) => setCertifiedAmount(e.target.value)}
                placeholder="Once certified"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date Submitted
              </label>
              <input
                type="date"
                required
                value={dateSubmitted}
                onChange={(e) => setDateSubmitted(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentClaimStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_PAYMENT_CLAIM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PAYMENT_CLAIM_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              TRIM Link
            </label>
            <input
              value={trimLink}
              onChange={(e) => setTrimLink(e.target.value)}
              placeholder="TRIM web link or record number for this claim (optional)"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <RichTextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

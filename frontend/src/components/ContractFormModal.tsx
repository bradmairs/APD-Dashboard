import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { ContractPartyType, ContractRecord, ContractRecordInput, ContractStatus } from "../types";
import {
  ALL_CONTRACT_PARTY_TYPES,
  ALL_CONTRACT_STATUSES,
  CONTRACT_FORM_SUGGESTIONS,
  CONTRACT_PARTY_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
} from "../contractMeta";

interface Props {
  contract: ContractRecord | null;
  onClose: () => void;
  onSave: (data: Partial<ContractRecordInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

export default function ContractFormModal({ contract, onClose, onSave }: Props) {
  const [partyType, setPartyType] = useState<ContractPartyType>(
    contract?.partyType ?? "CONSULTANT"
  );
  const [partyName, setPartyName] = useState(contract?.partyName ?? "");
  const [discipline, setDiscipline] = useState(contract?.discipline ?? "");
  const [contractNumber, setContractNumber] = useState(contract?.contractNumber ?? "");
  const [contractForm, setContractForm] = useState(contract?.contractForm ?? "");
  const [contractValue, setContractValue] = useState(contract?.contractValue ?? "");
  const [contingency, setContingency] = useState(contract?.contingency ?? "");
  const [poNumber, setPoNumber] = useState(contract?.poNumber ?? "");
  const [provisionalItemsValue, setProvisionalItemsValue] = useState(
    contract?.provisionalItemsValue ?? ""
  );
  const [retentionPercent, setRetentionPercent] = useState(contract?.retentionPercent ?? "");
  const [defectsLiabilityMonths, setDefectsLiabilityMonths] = useState(
    contract?.defectsLiabilityMonths ?? ""
  );
  const [executionDate, setExecutionDate] = useState(
    toDateInputValue(contract?.executionDate ?? null)
  );
  const [startDate, setStartDate] = useState(toDateInputValue(contract?.startDate ?? null));
  const [completionDate, setCompletionDate] = useState(
    toDateInputValue(contract?.completionDate ?? null)
  );
  const [status, setStatus] = useState<ContractStatus>(contract?.status ?? "ACTIVE");
  const [notes, setNotes] = useState(contract?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        partyType,
        partyName: partyName.trim(),
        discipline: discipline || null,
        contractNumber: contractNumber || null,
        contractForm: contractForm || null,
        contractValue: contractValue || null,
        contingency: contingency || null,
        poNumber: poNumber.trim() || null,
        provisionalItemsValue: provisionalItemsValue || null,
        retentionPercent: retentionPercent || null,
        defectsLiabilityMonths:
          defectsLiabilityMonths === "" ? null : Number(defectsLiabilityMonths),
        executionDate: executionDate ? new Date(executionDate).toISOString() : null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        completionDate: completionDate ? new Date(completionDate).toISOString() : null,
        status,
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contract");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {contract ? "Edit Contract" : "New Contract"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Party Type
              </label>
              <select
                value={partyType}
                onChange={(e) => setPartyType(e.target.value as ContractPartyType)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_CONTRACT_PARTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CONTRACT_PARTY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Party Name
              </label>
              <input
                required
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g. GHD Pty Ltd"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Discipline / Scope
              </label>
              <input
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                placeholder="e.g. Structural Design"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contract Number
              </label>
              <input
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contract Form
              </label>
              <input
                list="contract-form-suggestions"
                value={contractForm}
                onChange={(e) => setContractForm(e.target.value)}
                placeholder="e.g. AS4000-1997"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
              <datalist id="contract-form-suggestions">
                {CONTRACT_FORM_SUGGESTIONS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_CONTRACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CONTRACT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contract Value ($, Excl. GST)
              </label>
              <input
                type="number"
                step="0.01"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contingency ($, Excl. GST)
              </label>
              <input
                type="number"
                step="0.01"
                value={contingency}
                onChange={(e) => setContingency(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Retention (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={retentionPercent}
                onChange={(e) => setRetentionPercent(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                PO Number
              </label>
              <input
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Purchase order reference (optional)"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Provisional Items ($, Excl. GST)
              </label>
              <input
                type="number"
                step="0.01"
                value={provisionalItemsValue}
                onChange={(e) => setProvisionalItemsValue(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Execution Date
              </label>
              <input
                type="date"
                value={executionDate}
                onChange={(e) => setExecutionDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Completion Date
              </label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Defects Liability Period (months)
            </label>
            <input
              type="number"
              value={defectsLiabilityMonths}
              onChange={(e) => setDefectsLiabilityMonths(e.target.value)}
              placeholder="Optional — contractors only, typically"
              className="w-full sm:w-1/2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
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

import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { ContractRecord, ContractRecordInput, ContractStatus, PaymentClaim } from "../types";
import { formatCurrency, formatDate } from "../format";
import {
  ALL_CONTRACT_STATUSES,
  CONTRACT_PARTY_TYPE_COLORS,
  CONTRACT_PARTY_TYPE_LABELS,
  CONTRACT_STATUS_COLORS,
  CONTRACT_STATUS_LABELS,
  contractStatusRank,
  remainingContractValue,
} from "../contractMeta";
import ContractFormModal from "./ContractFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  contracts: ContractRecord[];
  paymentClaims: PaymentClaim[];
  onCreate: (data: Partial<ContractRecordInput>) => Promise<void>;
  onUpdate: (contract: ContractRecord, data: Partial<ContractRecordInput>) => Promise<void>;
  onDelete: (contract: ContractRecord) => Promise<void>;
}

export default function ContractsPanel({
  contracts,
  paymentClaims,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ContractRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(contract: ContractRecord) {
    setEditing(contract);
    setShowModal(true);
  }

  async function handleSave(data: Partial<ContractRecordInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(contract: ContractRecord) {
    if (!await confirm(`Delete the contract with "${contract.partyName}"? This cannot be undone.`))
      return;
    await onDelete(contract);
  }

  async function handleStatusChange(contract: ContractRecord, status: ContractStatus) {
    await onUpdate(contract, { status });
  }

  const sorted = [...contracts].sort(
    (a, b) => contractStatusRank(a.status) - contractStatusRank(b.status)
  );

  const shown = useShowMore(sorted);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Contracts</h2>
          {contracts.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {contracts.length} on record
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="contracts" rows={contracts} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Contract
          </button>
        </div>
      </div>

      {contracts.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No contracts logged yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((contract) => {
              const isExpanded = expandedId === contract.id;
              const remaining = remainingContractValue(contract, paymentClaims);
              return (
                <li key={contract.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : contract.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {contract.partyName}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${CONTRACT_PARTY_TYPE_COLORS[contract.partyType]}`}
                        >
                          {CONTRACT_PARTY_TYPE_LABELS[contract.partyType]}
                        </span>
                        {contract.discipline && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                            {contract.discipline}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${CONTRACT_STATUS_COLORS[contract.status]}`}
                        >
                          {CONTRACT_STATUS_LABELS[contract.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        {contract.contractValue && (
                          <span>{formatCurrency(contract.contractValue)}</span>
                        )}
                        {contract.contingency && (
                          <span>Contingency: {formatCurrency(contract.contingency)}</span>
                        )}
                        {contract.poNumber && <span>PO No. {contract.poNumber}</span>}
                        {contract.provisionalItemsValue && (
                          <span>
                            Provisional Items: {formatCurrency(contract.provisionalItemsValue)}
                          </span>
                        )}
                        {remaining !== null && (
                          <span
                            className={
                              remaining < 0
                                ? "text-red-600 dark:text-red-400 font-medium"
                                : "text-slate-500 dark:text-slate-400"
                            }
                          >
                            Remaining: {formatCurrency(remaining)}
                          </span>
                        )}
                        {contract.contractNumber && <span>{contract.contractNumber}</span>}
                        {contract.startDate && <span>Started {formatDate(contract.startDate)}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <select
                        value={contract.status}
                        onChange={(e) =>
                          handleStatusChange(contract, e.target.value as ContractStatus)
                        }
                        className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                      >
                        {ALL_CONTRACT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {CONTRACT_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => openEdit(contract)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(contract)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <div>Contract Form: {contract.contractForm || "—"}</div>
                        <div>
                          Retention:{" "}
                          {contract.retentionPercent ? `${contract.retentionPercent}%` : "—"}
                        </div>
                        <div>Execution: {formatDate(contract.executionDate)}</div>
                        <div>Completion: {formatDate(contract.completionDate)}</div>
                        {contract.defectsLiabilityMonths !== null && (
                          <div>Defects Liability: {contract.defectsLiabilityMonths} months</div>
                        )}
                      </div>
                      {contract.notes && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Notes
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={contract.notes} />
                        </div>
                      )}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Added by {contract.addedByName}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <ShowMoreButton state={shown} noun="contracts" />
        </>
      )}

      {showModal && (
        <ContractFormModal
          contract={editing}
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

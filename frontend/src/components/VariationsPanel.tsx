import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { Variation, VariationInput, VariationStatus } from "../types";
import { formatCurrency, formatDate } from "../format";
import { approvedVariationsTotal } from "../variations";
import {
  ALL_VARIATION_STATUSES,
  VARIATION_STATUS_COLORS,
  VARIATION_STATUS_LABELS,
} from "../variationMeta";
import VariationFormModal from "./VariationFormModal";
import ExportCsvButton from "./ExportCsvButton";
import BulkActionsBar from "./BulkActionsBar";
import { useSelection } from "../useSelection";
import { useConfirm } from "../confirm/ConfirmContext";

interface Props {
  variations: Variation[];
  onCreate: (data: Partial<VariationInput>) => Promise<void>;
  onUpdate: (variation: Variation, data: Partial<VariationInput>) => Promise<void>;
  onDelete: (variation: Variation) => Promise<void>;
}

function formatCostImpact(value: string): string {
  const amount = Number(value);
  const formatted = formatCurrency(Math.abs(amount));
  return amount < 0 ? `-${formatted}` : `+${formatted}`;
}

export default function VariationsPanel({
  variations,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Variation | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selection = useSelection();

  const approvedTotal = approvedVariationsTotal(variations);
  const proposedCount = variations.filter((v) => v.status === "PROPOSED").length;

  async function handleBulkStatus(status: VariationStatus) {
    for (const variation of variations.filter((v) => selection.isSelected(v.id))) {
      await onUpdate(variation, { status });
    }
    selection.clear();
  }

  async function handleBulkDelete() {
    for (const variation of variations.filter((v) => selection.isSelected(v.id))) {
      await onDelete(variation);
    }
    selection.clear();
  }

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(variation: Variation) {
    setEditing(variation);
    setShowModal(true);
  }

  async function handleSave(data: Partial<VariationInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(variation: Variation) {
    if (!await confirm(`Delete variation "${variation.title}"? This cannot be undone.`)) return;
    await onDelete(variation);
  }

  async function handleStatusChange(variation: Variation, status: VariationStatus) {
    await onUpdate(variation, { status });
  }

  const shown = useShowMore(variations);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Variations
          </h2>
          {variations.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatCurrency(approvedTotal)} approved
              {proposedCount > 0 &&
                ` · ${proposedCount} proposed awaiting decision`}
            </span>
          )}
          {variations.length > 0 && (
            <button
              onClick={() => selection.toggleAll(variations.map((v) => v.id))}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {selection.count === variations.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            filename="variations"
            columns={[
              { header: "Reference", key: "reference" },
              { header: "Title", key: "title" },
              { header: "Category", key: "category" },
              { header: "Status", key: "status" },
              { header: "Cost Impact", key: "costImpact" },
              { header: "Time Impact (days)", key: "timeImpactDays" },
              { header: "Date Raised", key: "dateRaised" },
              { header: "Date Decided", key: "dateDecided" },
              { header: "Raised By", key: "raisedBy" },
              { header: "Description", key: "description" },
              { header: "Notes", key: "notes" },
            ]}
            rows={variations.map((variation) => ({
              reference: variation.reference ?? "",
              title: variation.title,
              category: variation.category ?? "",
              status: VARIATION_STATUS_LABELS[variation.status],
              costImpact: formatCostImpact(variation.costImpact),
              timeImpactDays: variation.timeImpactDays ?? "",
              dateRaised: formatDate(variation.dateRaised),
              dateDecided: variation.dateDecided ? formatDate(variation.dateDecided) : "",
              raisedBy: variation.raisedByName,
              description: variation.description ?? "",
              notes: variation.notes ?? "",
            }))}
          />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Variation
          </button>
        </div>
      </div>

      {selection.count > 0 && (
        <BulkActionsBar
          count={selection.count}
          entityLabel="variation"
          statusOptions={ALL_VARIATION_STATUSES.map((s) => ({ value: s, label: VARIATION_STATUS_LABELS[s] }))}
          onApplyStatus={handleBulkStatus}
          onDelete={handleBulkDelete}
          onClear={selection.clear}
        />
      )}

      {variations.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No variations raised yet.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((variation) => {
              const isExpanded = expandedId === variation.id;
              const costPositive = Number(variation.costImpact) >= 0;
              return (
                <li key={variation.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <input
                      type="checkbox"
                      checked={selection.isSelected(variation.id)}
                      onChange={() => selection.toggle(variation.id)}
                      className="mt-1.5 h-4 w-4 shrink-0"
                    />
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : variation.id)
                      }
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {variation.reference && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {variation.reference}
                          </span>
                        )}
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {variation.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${VARIATION_STATUS_COLORS[variation.status]}`}
                        >
                          {VARIATION_STATUS_LABELS[variation.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span
                          className={
                            costPositive
                              ? "text-slate-700 dark:text-slate-300"
                              : "text-green-700 dark:text-green-400"
                          }
                        >
                          {formatCostImpact(variation.costImpact)}
                        </span>
                        {variation.timeImpactDays !== null && (
                          <span>
                            {variation.timeImpactDays >= 0 ? "+" : ""}
                            {variation.timeImpactDays} day
                            {Math.abs(variation.timeImpactDays) === 1 ? "" : "s"}
                          </span>
                        )}
                        <span>Raised {formatDate(variation.dateRaised)}</span>
                        {variation.category && <span>{variation.category}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <select
                        value={variation.status}
                        onChange={(e) =>
                          handleStatusChange(variation, e.target.value as VariationStatus)
                        }
                        className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-1.5 py-1"
                      >
                        {ALL_VARIATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {VARIATION_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => openEdit(variation)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(variation)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (variation.description || variation.notes) && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      {variation.description && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Description
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={variation.description} />
                        </div>
                      )}
                      {variation.notes && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Notes
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={variation.notes} />
                        </div>
                      )}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Raised by {variation.raisedByName}
                        {variation.dateDecided &&
                          ` · Decided ${formatDate(variation.dateDecided)}`}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <ShowMoreButton state={shown} noun="variations" />
        </>
      )}

      {showModal && (
        <VariationFormModal
          variation={editing}
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

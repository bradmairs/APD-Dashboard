import { useState } from "react";
import { Stakeholder, StakeholderInput } from "../types";
import StakeholderFormModal from "./StakeholderFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  stakeholders: Stakeholder[];
  onCreate: (data: Partial<StakeholderInput>) => Promise<void>;
  onUpdate: (stakeholder: Stakeholder, data: Partial<StakeholderInput>) => Promise<void>;
  onDelete: (stakeholder: Stakeholder) => Promise<void>;
}

export default function StakeholdersPanel({
  stakeholders,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(stakeholder: Stakeholder) {
    setEditing(stakeholder);
    setShowModal(true);
  }

  async function handleSave(data: Partial<StakeholderInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(stakeholder: Stakeholder) {
    if (!await confirm(`Remove "${stakeholder.name}" from the stakeholder register?`, { confirmLabel: "Remove" })) return;
    await onDelete(stakeholder);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Stakeholders
        </h2>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="stakeholders" rows={stakeholders} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Stakeholder
          </button>
        </div>
      </div>

      {stakeholders.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No stakeholders logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {stakeholders.map((stakeholder) => {
            const isExpanded = expandedId === stakeholder.id;
            const contactParts = [stakeholder.email, stakeholder.phone].filter(Boolean);
            return (
              <li key={stakeholder.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : stakeholder.id)
                    }
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {stakeholder.name}
                      </span>
                      {stakeholder.role && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {stakeholder.role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {stakeholder.organization && <span>{stakeholder.organization}</span>}
                      {contactParts.length > 0 && <span>{contactParts.join(" · ")}</span>}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <button
                      onClick={() => openEdit(stakeholder)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(stakeholder)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && stakeholder.notes && (
                  <div className="mt-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Notes
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                      {stakeholder.notes}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <StakeholderFormModal
          stakeholder={editing}
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

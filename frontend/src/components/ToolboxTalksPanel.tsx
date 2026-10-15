import { useState } from "react";
import { ToolboxTalk, ToolboxTalkInput } from "../types";
import { formatDate } from "../format";
import ToolboxTalkFormModal from "./ToolboxTalkFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  talks: ToolboxTalk[];
  onCreate: (data: Partial<ToolboxTalkInput>) => Promise<void>;
  onUpdate: (talk: ToolboxTalk, data: Partial<ToolboxTalkInput>) => Promise<void>;
  onDelete: (talk: ToolboxTalk) => Promise<void>;
}

export default function ToolboxTalksPanel({ talks, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ToolboxTalk | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(talk: ToolboxTalk) {
    setEditing(talk);
    setShowModal(true);
  }

  async function handleSave(data: Partial<ToolboxTalkInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(talk: ToolboxTalk) {
    if (!await confirm("Delete this toolbox talk? This cannot be undone.")) return;
    await onDelete(talk);
  }

  const sorted = [...talks].sort(
    (a, b) => new Date(b.talkDate).getTime() - new Date(a.talkDate).getTime()
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Toolbox Talks
          </h2>
          {talks.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {talks.length} recorded
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="toolbox-talks" rows={talks} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Talk
          </button>
        </div>
      </div>

      {talks.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No toolbox talks recorded yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map((talk) => {
            const isExpanded = expandedId === talk.id;
            return (
              <li key={talk.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : talk.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatDate(talk.talkDate)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        {talk.topic}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                      Conducted by {talk.conductedBy}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <button
                      onClick={() => openEdit(talk)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(talk)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {talk.attendees && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Attendees
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{talk.attendees}</p>
                      </div>
                    )}
                    {talk.keyPoints && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Key Points
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {talk.keyPoints}
                        </p>
                      </div>
                    )}
                    {talk.notes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Notes
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {talk.notes}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Recorded by {talk.recordedByName}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <ToolboxTalkFormModal
          talk={editing}
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

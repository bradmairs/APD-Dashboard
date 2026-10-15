import { FormEvent, useRef, useState } from "react";
import {
  ActionItem,
  ActionItemInput,
  Attachment,
  MeetingMinutes,
  MeetingMinutesDraft,
  MeetingMinutesInput,
  SuggestedAction,
  Task,
  TaskInput,
} from "../types";
import { formatDate, formatFileSize } from "../format";
import { attachmentDownloadUrl } from "../api";
import { ACTION_STATUS_COLORS, ACTION_STATUS_LABELS } from "../actionItemMeta";
import { useAuth } from "../auth/AuthContext";
import {
  SuggestionDestination,
  defaultDestinations,
  meetingLabel,
  suggestionToAction,
  suggestionToTask,
} from "../meetingActionRouting";
import MeetingMinutesFormModal from "./MeetingMinutesFormModal";
import SuggestedActionList from "./SuggestedActionList";
import { useConfirm } from "../confirm/ConfirmContext";

interface Props {
  projectName: string;
  meetings: MeetingMinutes[];
  attachments: Attachment[];
  actionItems: ActionItem[];
  tasks: Task[];
  onCreateTask: (data: Partial<TaskInput>) => Promise<void>;
  onCreate: (data: Partial<MeetingMinutesInput>) => Promise<MeetingMinutes>;
  onUpdate: (
    meeting: MeetingMinutes,
    data: Partial<MeetingMinutesInput>
  ) => Promise<MeetingMinutes>;
  onDelete: (meeting: MeetingMinutes) => Promise<void>;
  onUploadAttachment: (meetingId: string, file: File) => Promise<void>;
  onDeleteAttachment: (attachment: Attachment) => Promise<void>;
  onCreateAction: (data: Partial<ActionItemInput>) => Promise<void>;
  onExtractActions: (meetingId: string) => Promise<SuggestedAction[]>;
  onGenerateDraft: (input: {
    text?: string;
    file?: File;
    onProgress?: (message: string) => void;
  }) => Promise<MeetingMinutesDraft>;
}

// The attachments/actions sub-sections below are the "attach the record,
// track what it produced" half of this panel — filtered client-side from
// the project's full attachments/actionItems lists (already loaded for
// AttachmentsPanel/ActionsPanel) rather than fetched separately per
// meeting, since the project only ever has a handful of each.
function MeetingAttachments({
  meetingId,
  attachments,
  onUpload,
  onDelete,
}: {
  meetingId: string;
  attachments: Attachment[];
  onUpload: (meetingId: string, file: File) => Promise<void>;
  onDelete: (attachment: Attachment) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linked = attachments.filter((a) => a.meetingMinutesId === meetingId);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(meetingId, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Attachments
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "+ Attach file"}
        </button>
        <input ref={fileInputRef} type="file" onChange={handleFileSelected} className="hidden" />
      </div>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded p-2 mb-1">
          {error}
        </div>
      )}
      {linked.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">No files attached.</p>
      ) : (
        <ul className="space-y-1">
          {linked.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-xs">
              <a
                href={attachmentDownloadUrl(a.id)}
                className="text-blue-600 dark:text-blue-400 hover:underline truncate"
              >
                {a.originalName}
              </a>
              <span className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-slate-400 dark:text-slate-500">
                  {formatFileSize(a.size)}
                </span>
                <button
                  onClick={() => onDelete(a)}
                  className="text-red-600 dark:text-red-400 hover:underline"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MeetingActions({
  meeting,
  actionItems,
  tasks,
  onCreateAction,
  onCreateTask,
  onExtractActions,
}: {
  meeting: MeetingMinutes;
  actionItems: ActionItem[];
  tasks: Task[];
  onCreateAction: (data: Partial<ActionItemInput>) => Promise<void>;
  onCreateTask: (data: Partial<TaskInput>) => Promise<void>;
  onExtractActions: (meetingId: string) => Promise<SuggestedAction[]>;
}) {
  const { user } = useAuth();
  const [quickTitle, setQuickTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedAction[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [destinations, setDestinations] = useState<SuggestionDestination[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [addingSelected, setAddingSelected] = useState(false);

  const linked = actionItems.filter((a) => a.meetingMinutesId === meeting.id);
  const linkedTasks = tasks.filter((t) => t.meetingMinutesId === meeting.id);

  async function handleQuickAdd(e: FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setAdding(true);
    try {
      await onCreateAction({
        title: quickTitle.trim(),
        type: "ACTION",
        status: "OPEN",
        dateRaised: meeting.meetingDate,
        meetingMinutesId: meeting.id,
      });
      setQuickTitle("");
    } finally {
      setAdding(false);
    }
  }

  async function handleSuggest() {
    setSuggesting(true);
    setAiError(null);
    setSuggestions(null);
    try {
      const result = await onExtractActions(meeting.id);
      setSuggestions(result);
      setSelected(new Set(result.map((_, i) => i)));
      setDestinations(defaultDestinations(result, user?.name));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to extract actions");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleAddSelected() {
    if (!suggestions) return;
    setAddingSelected(true);
    try {
      for (let i = 0; i < suggestions.length; i++) {
        if (!selected.has(i)) continue;
        const s = suggestions[i];
        if (destinations[i] === "TASK") {
          await onCreateTask(suggestionToTask(s, meeting.id, meetingLabel(meeting)));
        } else {
          await onCreateAction(suggestionToAction(s, meeting.id, meeting.meetingDate));
        }
      }
      setSuggestions(null);
    } finally {
      setAddingSelected(false);
    }
  }

  function toggleSelected(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Actions from this meeting
        </div>
        <button
          onClick={handleSuggest}
          disabled={suggesting}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
        >
          {suggesting ? "Thinking…" : "AI: Suggest Actions from Notes"}
        </button>
      </div>

      {aiError && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded p-2 mb-2">
          {aiError}
        </div>
      )}

      {suggestions && (
        <div className="border border-slate-200 dark:border-slate-600 rounded p-2 mb-2 space-y-1.5">
          {suggestions.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No follow-up items found in this meeting's notes.
            </p>
          ) : (
            <>
              <SuggestedActionList
                suggestions={suggestions}
                selected={selected}
                destinations={destinations}
                onToggleSelected={toggleSelected}
                onChangeDestination={(i, d) =>
                  setDestinations((prev) => prev.map((v, j) => (j === i ? d : v)))
                }
              />
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleAddSelected}
                  disabled={addingSelected || selected.size === 0}
                  className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingSelected ? "Adding…" : `Add ${selected.size} selected`}
                </button>
                <button
                  onClick={() => setSuggestions(null)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {linked.length === 0 && linkedTasks.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
          No actions recorded from this meeting yet.
        </p>
      ) : (
        <ul className="space-y-1 mb-2">
          {linkedTasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-xs">
              <span className="px-1.5 py-0.5 rounded-full shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                My task
              </span>
              <span
                className={`truncate ${
                  t.status === "DONE"
                    ? "line-through text-slate-400 dark:text-slate-500"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {t.title}
              </span>
            </li>
          ))}
          {linked.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-xs">
              <span
                className={`px-1.5 py-0.5 rounded-full shrink-0 ${ACTION_STATUS_COLORS[a.status]}`}
              >
                {ACTION_STATUS_LABELS[a.status]}
              </span>
              <span className="text-slate-700 dark:text-slate-300 truncate">{a.title}</span>
              {a.ownerName && (
                <span className="text-slate-400 dark:text-slate-500 shrink-0">
                  · {a.ownerName}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Quick-add an action…"
          className="flex-1 min-w-0 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-xs"
        />
        <button
          type="submit"
          disabled={adding || !quickTitle.trim()}
          className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          + Add
        </button>
      </form>
    </div>
  );
}

export default function MeetingMinutesPanel({
  projectName,
  meetings,
  attachments,
  actionItems,
  tasks,
  onCreateTask,
  onCreate,
  onUpdate,
  onDelete,
  onUploadAttachment,
  onDeleteAttachment,
  onCreateAction,
  onExtractActions,
  onGenerateDraft,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MeetingMinutes | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(meeting: MeetingMinutes) {
    setEditing(meeting);
    setShowModal(true);
  }

  async function handleSave(data: Partial<MeetingMinutesInput>): Promise<MeetingMinutes> {
    const saved = editing ? await onUpdate(editing, data) : await onCreate(data);
    setShowModal(false);
    setEditing(null);
    return saved;
  }

  const confirm = useConfirm();

  async function handleDelete(meeting: MeetingMinutes) {
    if (
      !await confirm(
        "Delete these meeting minutes? Any attached files will be deleted too (linked actions are kept). This cannot be undone."
      )
    )
      return;
    await onDelete(meeting);
  }

  const sorted = [...meetings].sort(
    (a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Meeting Minutes
          </h2>
          {meetings.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {meetings.length} recorded
            </span>
          )}
        </div>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          + New Meeting
        </button>
      </div>

      {meetings.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No meeting minutes recorded yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {sorted.map((meeting) => {
            const isExpanded = expandedId === meeting.id;
            return (
              <li key={meeting.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {meeting.title && (
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {meeting.title}
                        </span>
                      )}
                      <span
                        className={
                          meeting.title
                            ? "text-xs text-slate-500 dark:text-slate-400"
                            : "text-sm font-medium text-slate-900 dark:text-slate-100"
                        }
                      >
                        {formatDate(meeting.meetingDate)}
                      </span>
                      {meeting.meetingType && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          {meeting.meetingType}
                        </span>
                      )}
                      {meeting.location && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {meeting.location}
                        </span>
                      )}
                    </div>
                    {meeting.summary && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {meeting.summary}
                      </p>
                    )}
                  </button>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <button
                      onClick={() => openEdit(meeting)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(meeting)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                    {meeting.attendees && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Attendees
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{meeting.attendees}</p>
                      </div>
                    )}
                    {meeting.summary && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Summary
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {meeting.summary}
                        </p>
                      </div>
                    )}
                    {meeting.notes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Notes
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {meeting.notes}
                        </p>
                      </div>
                    )}

                    <MeetingAttachments
                      meetingId={meeting.id}
                      attachments={attachments}
                      onUpload={onUploadAttachment}
                      onDelete={onDeleteAttachment}
                    />

                    <MeetingActions
                      meeting={meeting}
                      actionItems={actionItems}
                      tasks={tasks}
                      onCreateAction={onCreateAction}
                      onCreateTask={onCreateTask}
                      onExtractActions={onExtractActions}
                    />

                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Recorded by {meeting.recordedByName}
                      {meeting.nextMeetingDate &&
                        ` · Next meeting ${formatDate(meeting.nextMeetingDate)}`}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <MeetingMinutesFormModal
          projectName={projectName}
          meeting={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={handleSave}
          onGenerateDraft={onGenerateDraft}
          onCreateAction={onCreateAction}
          onCreateTask={onCreateTask}
          onUploadAttachment={onUploadAttachment}
        />
      )}
    </div>
  );
}

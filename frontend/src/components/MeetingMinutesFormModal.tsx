import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import {
  ActionItemInput,
  MeetingMinutes,
  MeetingMinutesDraft,
  MeetingMinutesInput,
  SuggestedAction,
  TaskInput,
} from "../types";
import { buildMeetingMinutesPdf } from "../meetingMinutesPdf";
import { useAuth } from "../auth/AuthContext";
import {
  SuggestionDestination,
  defaultDestinations,
  meetingLabel,
  suggestionToAction,
  suggestionToTask,
} from "../meetingActionRouting";
import SuggestedActionList from "./SuggestedActionList";

interface Props {
  projectName: string;
  meeting: MeetingMinutes | null;
  onClose: () => void;
  onSave: (data: Partial<MeetingMinutesInput>) => Promise<MeetingMinutes>;
  onGenerateDraft: (input: {
    text?: string;
    file?: File;
    onProgress?: (message: string) => void;
  }) => Promise<MeetingMinutesDraft>;
  onCreateAction: (data: Partial<ActionItemInput>) => Promise<void>;
  onCreateTask: (data: Partial<TaskInput>) => Promise<void>;
  onUploadAttachment: (meetingId: string, file: File) => Promise<void>;
}

// The Type dropdown's options. Anything else can still be typed in via
// "Other", and a meeting saved with a type not in this list (typed in, or
// suggested by the AI draft) shows as that custom type.
const MEETING_TYPES = [
  "General Meeting",
  "Progress Meeting",
  "Project Kick-off / Start-up Meeting",
  "Project Control Group (PCG)",
  "Steering Committee",
  "Workshop",
  "Design Workshop",
  "Risk Workshop",
  "Safety in Design Workshop",
  "Value Engineering Workshop",
  "Design Review",
  "Site Meeting",
  "Pre-start Meeting",
  "Client Meeting",
  "Contractor Meeting",
  "Stakeholder Meeting",
  "Community Meeting",
  "Internal Team Meeting",
  "Commissioning Meeting",
  "Handover Meeting",
  "Close-out / Lessons Learned Meeting",
];

const OTHER_MEETING_TYPE = "__other__";

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

export default function MeetingMinutesFormModal({
  projectName,
  meeting,
  onClose,
  onSave,
  onGenerateDraft,
  onCreateAction,
  onCreateTask,
  onUploadAttachment,
}: Props) {
  const { user } = useAuth();
  const [meetingDate, setMeetingDate] = useState(
    toDateInputValue(meeting?.meetingDate ?? null) || new Date().toISOString().substring(0, 10)
  );
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [meetingType, setMeetingType] = useState(meeting?.meetingType ?? "");
  // True when the type isn't one of MEETING_TYPES, so it's typed in instead.
  const [customMeetingType, setCustomMeetingType] = useState(
    !!meeting?.meetingType && !MEETING_TYPES.includes(meeting.meetingType)
  );
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [attendees, setAttendees] = useState(meeting?.attendees ?? "");
  const [summary, setSummary] = useState(meeting?.summary ?? "");
  const [nextMeetingDate, setNextMeetingDate] = useState(
    toDateInputValue(meeting?.nextMeetingDate ?? null)
  );
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minutesFile, setMinutesFile] = useState<File | null>(null);

  // Generate-from-transcript state — kept separate from the form fields
  // above so a generated draft is a proposal the PM reviews (and the
  // fields above stay editable afterwards), not something applied blindly.
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateProgress, setGenerateProgress] = useState<string | null>(null);
  const [draftActions, setDraftActions] = useState<SuggestedAction[] | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const [actionDestinations, setActionDestinations] = useState<SuggestionDestination[]>([]);
  const [wasGenerated, setWasGenerated] = useState(false);

  async function handleGenerate() {
    if (!transcriptText.trim() && !transcriptFile) {
      setGenerateError("Paste a transcript or choose a file/photo first");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const draft = await onGenerateDraft({
        text: transcriptText.trim() || undefined,
        file: transcriptFile ?? undefined,
        onProgress: setGenerateProgress,
      });
      if (draft.title && !title.trim()) setTitle(draft.title);
      if (draft.meetingType) {
        setMeetingType(draft.meetingType);
        setCustomMeetingType(!MEETING_TYPES.includes(draft.meetingType));
      }
      if (draft.attendees) setAttendees(draft.attendees);
      if (draft.summary) setSummary(draft.summary);
      if (draft.notes) setNotes(draft.notes);
      setDraftActions(draft.actions);
      setSelectedActions(new Set(draft.actions.map((_, i) => i)));
      setActionDestinations(defaultDestinations(draft.actions, user?.name));
      setWasGenerated(true);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate from transcript");
    } finally {
      setGenerating(false);
      setGenerateProgress(null);
    }
  }

  function toggleSelectedAction(i: number) {
    setSelectedActions((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await onSave({
        title: title.trim() || null,
        meetingDate: new Date(meetingDate).toISOString(),
        meetingType: meetingType || null,
        location: location || null,
        attendees: attendees || null,
        summary: summary || null,
        nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate).toISOString() : null,
        notes: notes || null,
      });

      if (minutesFile) {
        await onUploadAttachment(saved.id, minutesFile);
      }

      const chosenIndexes = (draftActions ?? [])
        .map((_, i) => i)
        .filter((i) => selectedActions.has(i));
      const chosenActions = chosenIndexes.map((i) => draftActions![i]);

      for (const i of chosenIndexes) {
        const action = draftActions![i];
        if (actionDestinations[i] === "TASK") {
          await onCreateTask(suggestionToTask(action, saved.id, meetingLabel(saved)));
        } else {
          await onCreateAction(suggestionToAction(action, saved.id, saved.meetingDate));
        }
      }

      // The one-click "transcript in, saved minutes out" flow: when this
      // record came from a generated draft, also build a PDF summary of
      // the (possibly hand-edited) final content and attach it to the
      // meeting, so there's a shareable document alongside the structured
      // fields without a separate export step.
      if (wasGenerated) {
        const pdfBlob = buildMeetingMinutesPdf(projectName, {
          title: title.trim() || null,
          meetingDate: saved.meetingDate,
          meetingType: meetingType || null,
          location: location || null,
          attendees: attendees || null,
          summary: summary || null,
          notes: notes || null,
          actions: chosenActions,
        });
        const pdfFile = new File(
          [pdfBlob],
          `meeting-minutes-${saved.meetingDate.slice(0, 10)}.pdf`,
          { type: "application/pdf" }
        );
        await onUploadAttachment(saved.id, pdfFile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save meeting minutes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {meeting ? "Edit Meeting Minutes" : "New Meeting Minutes"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Attach Minutes Document (PDF or Word)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setMinutesFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-700 dark:text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-300"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Optional — attach an existing signed minutes document. You can also attach files
              (or more than one) after saving, from the meeting's Attachments section.
            </p>
          </div>

          {!meeting && (
            <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded p-3">
              <button
                type="button"
                onClick={() => setShowTranscript((s) => !s)}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showTranscript ? "− Hide" : "+ Generate from Transcript (AI)"}
              </button>

              {showTranscript && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Paste a transcript, or upload a .txt/.docx/.pdf file or a photo of handwritten
                    notes — the fields below and a suggested action list will be filled in for
                    you to review before saving. Saving will also attach a PDF summary to this
                    meeting.
                  </p>
                  <textarea
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                    rows={4}
                    placeholder="Paste transcript text here…"
                    className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="file"
                      accept=".txt,.docx,.pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setTranscriptFile(e.target.files?.[0] ?? null)}
                      className="text-xs text-slate-700 dark:text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shrink-0 ml-auto"
                    >
                      {generating ? "Generating…" : "Generate"}
                    </button>
                  </div>

                  {generating && generateProgress && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{generateProgress}</p>
                  )}

                  {generateError && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded p-2">
                      {generateError}
                    </div>
                  )}

                  {draftActions && draftActions.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-600 rounded p-2 space-y-1.5">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Suggested actions (added when you save)
                      </div>
                      <SuggestedActionList
                        suggestions={draftActions}
                        selected={selectedActions}
                        destinations={actionDestinations}
                        onToggleSelected={toggleSelectedAction}
                        onChangeDestination={(i, d) =>
                          setActionDestinations((prev) => prev.map((v, j) => (j === i ? d : v)))
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Meeting Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional — e.g. Stage 2 handover planning"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Meeting Date
              </label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={customMeetingType ? OTHER_MEETING_TYPE : meetingType}
                onChange={(e) => {
                  if (e.target.value === OTHER_MEETING_TYPE) {
                    setCustomMeetingType(true);
                    setMeetingType("");
                  } else {
                    setCustomMeetingType(false);
                    setMeetingType(e.target.value);
                  }
                }}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                <option value="">Select type…</option>
                {MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value={OTHER_MEETING_TYPE}>Other…</option>
              </select>
              {customMeetingType && (
                <input
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                  placeholder="Type of meeting"
                  autoFocus
                  className="mt-2 w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                />
              )}
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Attendees
            </label>
            <input
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="Comma-separated names"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Summary
            </label>
            <RichTextArea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Next Meeting Date
            </label>
            <input
              type="date"
              value={nextMeetingDate}
              onChange={(e) => setNextMeetingDate(e.target.value)}
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
              rows={14}
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

import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { ToolboxTalk, ToolboxTalkInput } from "../types";

interface Props {
  talk: ToolboxTalk | null;
  onClose: () => void;
  onSave: (data: Partial<ToolboxTalkInput>) => Promise<void>;
}

const TOPIC_SUGGESTIONS = [
  "Manual Handling",
  "Working at Heights",
  "Traffic Management",
  "Excavation Safety",
  "Confined Spaces",
  "Underground Services",
];

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

export default function ToolboxTalkFormModal({ talk, onClose, onSave }: Props) {
  const [talkDate, setTalkDate] = useState(
    toDateInputValue(talk?.talkDate ?? null) || new Date().toISOString().substring(0, 10)
  );
  const [topic, setTopic] = useState(talk?.topic ?? "");
  const [conductedBy, setConductedBy] = useState(talk?.conductedBy ?? "");
  const [attendees, setAttendees] = useState(talk?.attendees ?? "");
  const [keyPoints, setKeyPoints] = useState(talk?.keyPoints ?? "");
  const [notes, setNotes] = useState(talk?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        talkDate: new Date(talkDate).toISOString(),
        topic: topic.trim(),
        conductedBy: conductedBy.trim(),
        attendees: attendees || null,
        keyPoints: keyPoints || null,
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save toolbox talk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {talk ? "Edit Toolbox Talk" : "New Toolbox Talk"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={talkDate}
                onChange={(e) => setTalkDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Conducted By
              </label>
              <input
                required
                value={conductedBy}
                onChange={(e) => setConductedBy(e.target.value)}
                placeholder="e.g. Site Supervisor"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Topic
            </label>
            <input
              list="toolbox-talk-topic-suggestions"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Working at Heights"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
            <datalist id="toolbox-talk-topic-suggestions">
              {TOPIC_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
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
              Key Points
            </label>
            <RichTextArea
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              rows={3}
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

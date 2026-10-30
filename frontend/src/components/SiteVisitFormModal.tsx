import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import RichTextArea from "./RichTextArea";
import { SiteVisit, SiteVisitInput } from "../types";

interface Props {
  siteVisit: SiteVisit | null;
  // How many photos the visit already has, shown when editing.
  existingPhotoCount?: number;
  onClose: () => void;
  // photos are uploaded to the visit once it's saved.
  onSave: (data: Partial<SiteVisitInput>, photos: File[]) => Promise<void>;
}

function toDateInputValue(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInputValue(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

function combineDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

export default function SiteVisitFormModal({
  siteVisit,
  existingPhotoCount = 0,
  onClose,
  onSave,
}: Props) {
  const [date, setDate] = useState(toDateInputValue(siteVisit?.visitDate ?? null));
  const [time, setTime] = useState(toTimeInputValue(siteVisit?.visitDate ?? null));
  const [location, setLocation] = useState(siteVisit?.location ?? "");
  const [notes, setNotes] = useState(siteVisit?.notes ?? "");
  const [discussionNotes, setDiscussionNotes] = useState(
    siteVisit?.discussionNotes ?? ""
  );
  const [outcomesAndActions, setOutcomesAndActions] = useState(
    siteVisit?.outcomesAndActions ?? ""
  );
  const [photos, setPhotos] = useState<File[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Thumbnails for the photos picked so far, released when they change.
  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function handlePhotoFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) setPhotos((prev) => [...prev, ...files]);
    e.target.value = "";
  }
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocateError("Geolocation isn't available on this device");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setLocating(false);
      },
      (err) => {
        setLocateError(err.message || "Couldn't get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        visitDate: combineDateTime(date, time),
        location: location.trim(),
        notes: notes || null,
        discussionNotes: discussionNotes || null,
        outcomesAndActions: outcomesAndActions || null,
      }, photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save site visit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {siteVisit ? "Edit Site Visit" : "Log Site Visit"}
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Time
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Location
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Pump Station 3, north valve pit"
                className="flex-1 min-w-0 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="shrink-0 px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                title="Use current location"
              >
                {locating ? "Locating…" : "📍 Use current"}
              </button>
            </div>
            {locateError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {locateError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Site Visit Purpose
            </label>
            <RichTextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Why the visit was made, e.g. progress inspection, hold point, meeting on site"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Site Visit Notes
            </label>
            <RichTextArea
              value={discussionNotes}
              onChange={(e) => setDiscussionNotes(e.target.value)}
              rows={3}
              placeholder="What was observed, and points raised with the contractor/site team"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Site Visit Outcomes and Actions
            </label>
            <RichTextArea
              value={outcomesAndActions}
              onChange={(e) => setOutcomesAndActions(e.target.value)}
              rows={3}
              placeholder="What was agreed or decided, and who is doing what by when"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Site Photos
                {existingPhotoCount > 0 && (
                  <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({existingPhotoCount} already attached)
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  📷 Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  🖼 Add Photos
                </button>
              </div>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoFiles}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoFiles}
            />
            {photos.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Photos added here upload when you save the visit.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {photos.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="relative">
                    <img
                      src={previews[i]}
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded border border-slate-200 dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={`Remove ${file.name}`}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white text-xs leading-5 text-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              {saving ? (photos.length > 0 ? "Saving and uploading…" : "Saving…") : "Save Visit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { ChangeEvent, useRef, useState } from "react";
import { SiteVisitPhoto } from "../types";
import { siteVisitPhotoFileUrl } from "../api";
import { useConfirm } from "../confirm/ConfirmContext";

interface Props {
  photos: SiteVisitPhoto[];
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (photo: SiteVisitPhoto) => Promise<void>;
  onSyncToArchive: (photoId: string) => Promise<void>;
}

export default function SiteVisitPhotoGrid({ photos, onUpload, onDelete, onSyncToArchive }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function handleRetrySync(photo: SiteVisitPhoto) {
    setSyncingId(photo.id);
    try {
      await onSyncToArchive(photo.id);
    } finally {
      setSyncingId(null);
    }
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  const confirm = useConfirm();

  async function handleDelete(photo: SiteVisitPhoto) {
    if (!await confirm("Delete this photo? This cannot be undone.")) return;
    await onDelete(photo);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Photos
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            📷 Take Photo
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            🖼 Add from Gallery
          </button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFiles}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>
      )}
      {uploading && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Uploading…</p>
      )}

      {photos.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">No photos yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <a
                href={siteVisitPhotoFileUrl(photo.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={siteVisitPhotoFileUrl(photo.id)}
                  alt={photo.originalName}
                  loading="lazy"
                  className="w-16 h-16 object-cover rounded border border-slate-200 dark:border-slate-700"
                />
              </a>
              {photo.latitude === null && (
                <span
                  className="absolute bottom-0.5 left-0.5 text-[9px] leading-none bg-slate-900/60 text-white rounded px-1 py-0.5"
                  title="No location data"
                >
                  no GPS
                </span>
              )}
              {photo.archiveSyncedAt && (
                <span
                  className="absolute top-0.5 left-0.5 w-4 h-4 flex items-center justify-center text-[9px] leading-none bg-emerald-600/90 text-white rounded-full"
                  title="Synced to the Engineering Archive"
                >
                  ✓
                </span>
              )}
              {photo.archiveSyncError && (
                <button
                  type="button"
                  onClick={() => handleRetrySync(photo)}
                  disabled={syncingId === photo.id}
                  className="absolute top-0.5 left-0.5 w-4 h-4 flex items-center justify-center text-[9px] leading-none bg-red-600/90 text-white rounded-full disabled:opacity-50"
                  title={`Failed to export to the Engineering Archive: ${photo.archiveSyncError}. Click to retry.`}
                >
                  {syncingId === photo.id ? "…" : "!"}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(photo)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Delete photo"
                title="Delete photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

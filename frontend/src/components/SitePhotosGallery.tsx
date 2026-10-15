import { useEffect, useState } from "react";
import { SiteVisitPhoto } from "../types";
import { siteVisitPhotoFileUrl } from "../api";
import { formatDateTime, formatFileSize } from "../format";
import { useConfirm } from "../confirm/ConfirmContext";

interface Props {
  photos: SiteVisitPhoto[];
  onDelete: (photo: SiteVisitPhoto) => Promise<void>;
}

export default function SitePhotosGallery({ photos, onDelete }: Props) {
  const sorted = [...photos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-3">
        No site photos logged yet.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {sorted.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="relative aspect-square group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
          >
            <img
              src={siteVisitPhotoFileUrl(photo.id)}
              alt={photo.originalName}
              loading="lazy"
              className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
            />
            {photo.latitude !== null && (
              <span
                className="absolute top-1 right-1 text-[10px] leading-none bg-slate-900/60 text-white rounded-full w-4 h-4 flex items-center justify-center"
                title="Has location data"
              >
                📍
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-1.5 py-1 text-left truncate opacity-0 group-hover:opacity-100 transition-opacity">
              {photo.siteVisit?.location ?? formatDateTime(photo.createdAt)}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
        {sorted.length} photo{sorted.length === 1 ? "" : "s"} across all site visits.
      </p>

      {openIndex !== null && (
        <Lightbox
          photos={sorted}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

interface LightboxProps {
  photos: SiteVisitPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDelete: (photo: SiteVisitPhoto) => Promise<void>;
}

function Lightbox({ photos, index, onClose, onNavigate, onDelete }: LightboxProps) {
  const photo = photos[index];
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onNavigate((index + 1) % photos.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, photos.length, onClose, onNavigate]);

  const confirm = useConfirm();

  async function handleDelete() {
    if (!await confirm("Delete this photo? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await onDelete(photo);
      if (photos.length <= 1) {
        onClose();
      } else {
        onNavigate(index % (photos.length - 1));
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none"
        aria-label="Close"
      >
        ×
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((index - 1 + photos.length) % photos.length);
            }}
            className="absolute left-2 sm:left-4 text-white/80 hover:text-white text-3xl leading-none px-2"
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((index + 1) % photos.length);
            }}
            className="absolute right-2 sm:right-4 text-white/80 hover:text-white text-3xl leading-none px-2"
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}

      <div
        className="max-w-3xl w-full max-h-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={siteVisitPhotoFileUrl(photo.id)}
          alt={photo.originalName}
          className="max-w-full max-h-[70vh] object-contain rounded-lg"
        />
        <div className="w-full mt-3 bg-slate-900/80 text-slate-100 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              {photo.siteVisit && (
                <div className="font-medium truncate">{photo.siteVisit.location}</div>
              )}
              <div className="text-slate-300 text-xs mt-0.5">
                {photo.siteVisit
                  ? formatDateTime(photo.siteVisit.visitDate)
                  : formatDateTime(photo.createdAt)}
                {" · "}
                {formatFileSize(photo.size)}
                {" · "}
                Uploaded by {photo.uploadedByName}
              </div>
              {photo.latitude !== null && photo.longitude !== null && (
                <div className="text-slate-400 text-xs mt-0.5">
                  📍 {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-slate-400 text-xs">
                {index + 1} of {photos.length}
              </span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
